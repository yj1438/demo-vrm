import * as vision from "@mediapipe/tasks-vision";
import { getFaceLandmarker } from '../util/mediapipe/face-landmark/index';
import { showDebugView } from '../util/mediapipe/face-landmark/debug';
import { initCamera, requestAnimationFrameWithVideoPlay } from "../util/camera-steam";

const btnImage = document.getElementById("J_btn_image") as HTMLInputElement;
const btnVideo = document.getElementById("J_btn_video") as HTMLButtonElement;
const statusPill = document.getElementById("J_status") as HTMLSpanElement;
const viewImage = document.getElementById("J_view_image") as HTMLDivElement;
const viewVideo = document.getElementById("J_view_video") as HTMLDivElement;
const infoEle = document.getElementById("J_info") as HTMLDivElement;
const delegateSel = document.getElementById("J_delegate") as HTMLSelectElement;
const sensSel = document.getElementById("J_sens") as HTMLSelectElement;
const numFacesSel = document.getElementById("J_num_faces") as HTMLSelectElement;

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

function setStatus(text: string, cls: '' | 'is-loading' | 'is-ok' | 'is-error' = '') {
  statusPill.textContent = text;
  statusPill.className = 'status-pill' + (cls ? ' ' + cls : '');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/**
 * 图片识别
 */
btnImage.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files[0];
  if (!file) return;

  try {
    setStatus('加载模型中…', 'is-loading');
    const faceLandmarker = await getFaceLandmarker(faceOpts("IMAGE"));

    const img = new Image();
    // 注意：img.decode() 对 blob URL 在部分环境下会永久挂起，用 onload 兜底
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });

    // .media-wrap 由媒体撑开，canvas 绝对定位铺满 —— 对齐交给 CSS
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
    const faceLandmarkerResult: vision.FaceLandmarkerResult = faceLandmarker.detect(img);
    const ms = Math.round(performance.now() - t0);

    showDebugView(faceLandmarkerResult, { canvas, infoElement: infoEle });
    setStatus(faceLandmarkerResult.faceLandmarks.length ? `完成 · ${ms}ms` : '未检出人脸', faceLandmarkerResult.faceLandmarks.length ? 'is-ok' : '');
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

  const video = document.createElement("video");
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;

  initCamera(video, async () => {
    video.style.width = '';
    video.style.height = '';
    videoStream = video.srcObject as MediaStream;

    try {
      setStatus('加载模型中…', 'is-loading');
      const faceLandmarker = await getFaceLandmarker(faceOpts("VIDEO"));

      viewVideo.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'media-wrap';
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      wrap.append(video, canvas);
      viewVideo.appendChild(wrap);

      setStatus('实时识别中', 'is-ok');

      let faceLandmarkerResult: vision.FaceLandmarkerResult | undefined = undefined;
      let lastInfoAt = 0;

      stopLoop = requestAnimationFrameWithVideoPlay(video, ({ changed, timestamp }) => {
        if (changed) {
          faceLandmarkerResult = faceLandmarker.detectForVideo(video, timestamp);
          showDebugView(faceLandmarkerResult, { canvas });
        }

        const now = performance.now();
        if (now - lastInfoAt > 200) {
          lastInfoAt = now;
          showDebugView(faceLandmarkerResult, { infoElement: infoEle });
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

  viewVideo.innerHTML = '';
  setStatus('已停止');
}

btnVideo.addEventListener("click", startVideo);

// 配置变更：视频运行中则自动重启以应用新配置；图片模式在下次上传时生效
[delegateSel, sensSel, numFacesSel].forEach((sel) => {
  sel.addEventListener('change', () => {
    if (stopLoop) {
      stopVideo();
      startVideo();
    } else {
      setStatus('配置已更新', 'is-ok');
    }
  });
});
