import * as vision from '@mediapipe/tasks-vision';
import { getGestureRecognizer } from '../util/mediapipe/gesture-landmark/index';
import { showDebugView as showDebugViewForGesture } from '../util/mediapipe/gesture-landmark/debug';
import { getFaceLandmarker } from '../util/mediapipe/face-landmark/index';
import { showDebugView as showDebugViewForFace } from '../util/mediapipe/face-landmark/debug';
import { getPoseLandmarker } from '../util/mediapipe/pose-landmark/index';
import { showDebugView as showDebugViewForPose } from '../util/mediapipe/pose-landmark/debug';
import { initCamera, requestAnimationFrameWithVideoPlay } from '../util/camera-steam';

const btnImage = document.getElementById('J_btn_image') as HTMLInputElement;
const btnVideo = document.getElementById('J_btn_video') as HTMLButtonElement;
const btnStop = document.getElementById('J_btn_stop') as HTMLButtonElement;
const statusPill = document.getElementById('J_status') as HTMLSpanElement;
const viewImage = document.getElementById('J_view_image') as HTMLDivElement;
const viewVideo = document.getElementById('J_view_video') as HTMLDivElement;
const infoEle = document.getElementById('J_info') as HTMLDivElement;
const delegateSel = document.getElementById('J_delegate') as HTMLSelectElement;
const sensSel = document.getElementById('J_sens') as HTMLSelectElement;
const numFacesSel = document.getElementById('J_num_faces') as HTMLSelectElement;
const numHandsSel = document.getElementById('J_num_hands') as HTMLSelectElement;

const VIDEO_PLACEHOLDER = '<div class="placeholder">开启摄像头后<br>实时绘制三类识别结果</div>';

type Delegate = 'GPU' | 'CPU';
const sens = () => +sensSel.value;

function faceOpts(runningMode: 'IMAGE' | 'VIDEO'): vision.FaceLandmarkerOptions {
  return {
    runningMode,
    numFaces: +numFacesSel.value,
    minFaceDetectionConfidence: sens(),
    minFacePresenceConfidence: sens(),
    baseOptions: { delegate: delegateSel.value as Delegate },
  };
}

function poseOpts(runningMode: 'IMAGE' | 'VIDEO'): vision.PoseLandmarkerOptions {
  return {
    runningMode,
    minPoseDetectionConfidence: sens(),
    minPosePresenceConfidence: sens(),
    baseOptions: { delegate: delegateSel.value as Delegate },
  };
}

function gestureOpts(runningMode: 'IMAGE' | 'VIDEO'): vision.GestureRecognizerOptions {
  return {
    runningMode,
    numHands: +numHandsSel.value,
    minHandDetectionConfidence: sens(),
    minHandPresenceConfidence: sens(),
    baseOptions: { delegate: delegateSel.value as Delegate },
  };
}

function setStatus(text: string, cls: '' | 'is-loading' | 'is-ok' | 'is-error' = '') {
  statusPill.textContent = text;
  statusPill.className = 'status-pill' + (cls ? ' ' + cls : '');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/**
 * 结果面板：身体 / 面部 / 手势 各一块，避免单一 info 元素互相覆盖
 */
const infoPanels = (() => {
  infoEle.innerHTML = '';
  const make = (title: string) => {
    const titleEle = document.createElement('div');
    titleEle.className = 'panel-title';
    titleEle.textContent = title;
    const bodyEle = document.createElement('div');
    bodyEle.innerHTML = '<div class="empty-hint">未检出</div>';
    infoEle.append(titleEle, bodyEle);
    return bodyEle;
  };
  return {
    pose: make('身体 · 33 关键点'),
    face: make('面部 · ARKit52 表情'),
    gesture: make('手势 · 分类'),
  };
})();

function clearInfoPanels() {
  Object.values(infoPanels).forEach((ele) => {
    ele.innerHTML = '<div class="empty-hint">未检出</div>';
  });
}

/**
 * 图片识别
 */
btnImage.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files[0];
  if (!file) return;

  try {
    setStatus('加载模型中…', 'is-loading');
    // 串行创建：并行的 GPU 图初始化会互相竞争导致卡死
    const poseLandmarker = await getPoseLandmarker(poseOpts('IMAGE'));
    const faceLandmarker = await getFaceLandmarker(faceOpts('IMAGE'));
    const gestureRecognizer = await getGestureRecognizer(gestureOpts('IMAGE'));

    const img = new Image();
    // 注意：img.decode() 对 blob URL 在部分环境下会永久挂起，用 onload 兜底
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });

    // 重建视口：.media-wrap 由媒体撑开，canvas 绝对定位铺满 —— 对齐交给 CSS
    viewImage.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'media-wrap';
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    wrap.append(img, canvas);
    viewImage.appendChild(wrap);

    setStatus('识别中…', 'is-loading');
    const t0 = performance.now();
    const poseResult = poseLandmarker.detect(img);
    const faceResult = faceLandmarker.detect(img);
    const gestureResult = gestureRecognizer.recognize(img);
    const ms = Math.round(performance.now() - t0);

    clearInfoPanels();
    showDebugViewForPose(poseResult, { canvas, infoElement: infoPanels.pose });
    showDebugViewForFace(faceResult, { canvas, infoElement: infoPanels.face });
    showDebugViewForGesture(gestureResult, { canvas, infoElement: infoPanels.gesture });

    setStatus(`完成 · ${ms}ms`, 'is-ok');
  } catch (err) {
    setStatus('识别失败', 'is-error');
    infoEle.innerHTML = `<div class="error-text">${escapeHtml(String((err as Error).message || err))}</div>`;
  }
});

/**
 * 摄像头识别：可启动 / 停止 / 配置变更时自动重启
 */
let stopLoop: (() => void) | undefined;
let videoStream: MediaStream | undefined;

async function startVideo() {
  if (stopLoop) return; // 已在运行，防止叠加多路视频

  const video = document.createElement('video');
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;

  initCamera(video, async () => {
    // initCamera 写的内联宽高交给 CSS 接管
    video.style.width = '';
    video.style.height = '';
    videoStream = video.srcObject as MediaStream;

    try {
      setStatus('加载模型中…', 'is-loading');
      // 串行创建：并行的 GPU 图初始化会互相竞争导致卡死
      const poseLandmarker = await getPoseLandmarker(poseOpts('VIDEO'));
      const faceLandmarker = await getFaceLandmarker(faceOpts('VIDEO'));
      const gestureRecognizer = await getGestureRecognizer(gestureOpts('VIDEO'));

      viewVideo.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'media-wrap';
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      wrap.append(video, canvas);
      viewVideo.appendChild(wrap);

      setStatus('实时识别中', 'is-ok');
      btnStop.hidden = false;

      let lastInfoAt = 0;
      stopLoop = requestAnimationFrameWithVideoPlay(video, ({ changed, timestamp }) => {
        if (!changed) return;

        const poseResult = poseLandmarker.detectForVideo(video, timestamp);
        const faceResult = faceLandmarker.detectForVideo(video, timestamp);
        const gestureResult = gestureRecognizer.recognizeForVideo(video, timestamp);

        showDebugViewForPose(poseResult, { canvas, clearCanvas: false });
        showDebugViewForFace(faceResult, { canvas, clearCanvas: false });
        showDebugViewForGesture(gestureResult, { canvas, clearCanvas: false });

        // 结果面板节流刷新（约 5fps），避免高频 DOM 写入
        const now = performance.now();
        if (now - lastInfoAt > 200) {
          lastInfoAt = now;
          showDebugViewForPose(poseResult, { infoElement: infoPanels.pose });
          showDebugViewForFace(faceResult, { infoElement: infoPanels.face });
          showDebugViewForGesture(gestureResult, { infoElement: infoPanels.gesture });
        }
      });
    } catch (err) {
      setStatus('识别失败', 'is-error');
      infoEle.innerHTML = `<div class="error-text">${escapeHtml(String((err as Error).message || err))}</div>`;
    }
  });
}

function stopVideo() {
  stopLoop?.();
  stopLoop = undefined;

  videoStream?.getTracks().forEach((track) => track.stop());
  videoStream = undefined;

  viewVideo.innerHTML = VIDEO_PLACEHOLDER;
  btnStop.hidden = true;
  setStatus('已停止');
}

btnVideo.addEventListener('click', startVideo);
btnStop.addEventListener('click', stopVideo);

// 配置变更：视频运行中则自动重启以应用新配置；图片模式在下次上传时生效
[delegateSel, sensSel, numFacesSel, numHandsSel].forEach((sel) => {
  sel.addEventListener('change', () => {
    if (stopLoop) {
      stopVideo();
      startVideo();
    } else {
      setStatus('配置已更新', 'is-ok');
    }
  });
});
