import { bindImageInput, loadImage } from '../common/example-images';
import * as vision from "@mediapipe/tasks-vision";
import { getGestureRecognizer } from '../util/mediapipe/gesture-landmark/index';
import { showDebugView } from '../util/mediapipe/gesture-landmark/debug';
import { initCamera, requestAnimationFrameWithVideoPlay } from "../util/camera-steam";

const btnImage = document.getElementById("J_btn_image") as HTMLInputElement;
const btnVideo = document.getElementById("J_btn_video") as HTMLButtonElement;
const statusPill = document.getElementById("J_status") as HTMLSpanElement;
const viewImage = document.getElementById("J_view_image") as HTMLDivElement;
const viewVideo = document.getElementById("J_view_video") as HTMLDivElement;
const infoEle = document.getElementById("J_info") as HTMLDivElement;
const delegateSel = document.getElementById("J_delegate") as HTMLSelectElement;
const sensSel = document.getElementById("J_sens") as HTMLSelectElement;
const numHandsSel = document.getElementById("J_num_hands") as HTMLSelectElement;

type Delegate = 'GPU' | 'CPU';
const sens = () => +sensSel.value;

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
 * 图片识别
 */
async function detectImage(source: File | string) {
  if (stopLoop) stopVideo();

  try {
    setStatus('加载模型中…', 'is-loading');
    const gestureRecognizer = await getGestureRecognizer(gestureOpts("IMAGE"));

    const img = await loadImage(source);

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
    const gestureRecognizerResult: vision.GestureRecognizerResult = gestureRecognizer.recognize(img);
    const ms = Math.round(performance.now() - t0);

    infoEle.innerHTML = '<div class="empty-hint">未检出手部</div>';
    showDebugView(gestureRecognizerResult, { canvas, infoElement: infoEle });
    setStatus(gestureRecognizerResult.landmarks.length ? `完成 · ${ms}ms` : '未检出手部', gestureRecognizerResult.landmarks.length ? 'is-ok' : '');
  } catch (err) {
    setStatus('识别失败', 'is-error');
    infoEle.innerHTML = `<div class="error-text">${escapeHtml(String((err as Error).message || err))}</div>`;
  }
}

bindImageInput(btnImage, viewImage, detectImage);

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
      const gestureRecognizer = await getGestureRecognizer(gestureOpts("VIDEO"));

      viewVideo.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'media-wrap';
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      wrap.append(video, canvas);
      viewVideo.appendChild(wrap);

      setStatus('实时识别中', 'is-ok');

      let gestureRecognizerResult: vision.GestureRecognizerResult | undefined = undefined;
      let lastInfoAt = 0;

      stopLoop = requestAnimationFrameWithVideoPlay(video, ({ changed, timestamp }) => {
        if (changed) {
          gestureRecognizerResult = gestureRecognizer.recognizeForVideo(video, timestamp);
          showDebugView(gestureRecognizerResult, { canvas });
        }

        const now = performance.now();
        if (now - lastInfoAt > 200) {
          lastInfoAt = now;
          showDebugView(gestureRecognizerResult, { infoElement: infoEle });
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
[delegateSel, sensSel, numHandsSel].forEach((sel) => {
  sel.addEventListener('change', () => {
    if (stopLoop) {
      stopVideo();
      startVideo();
    } else {
      setStatus('配置已更新', 'is-ok');
    }
  });
});
