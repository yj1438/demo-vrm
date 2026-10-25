import { bindImageInput, loadImage } from '../common/example-images';
import * as vision from '@mediapipe/tasks-vision';
import { getFilesetResolver } from '../util/mediapipe/common';
import { getFaceLandmarker } from '../util/mediapipe/face-landmark/index';
import { initCamera, requestAnimationFrameWithVideoPlay } from '../util/camera-steam';

/**
 * Holistic 全身体识别测试页：单模型同时输出 脸(478+blendshape) / 身体(33) / 双手(21x2)
 * 用途：验证 HolisticLandmarker 在 tasks-vision 1.1.1 下的实际效果
 */

const infoEle = document.getElementById('J_info') as HTMLDivElement;
const viewImage = document.getElementById('J_view_image') as HTMLDivElement;
const viewVideo = document.getElementById('J_view_video') as HTMLDivElement;
const delegateSel = document.getElementById('J_delegate') as HTMLSelectElement;
const sensSel = document.getElementById('J_sens') as HTMLSelectElement;
const btnStop = document.getElementById('J_btn_stop') as HTMLButtonElement;
const statusPill = document.getElementById('J_status') as HTMLSpanElement;

const VIDEO_PLACEHOLDER = '<div class="placeholder">开启摄像头后<br>实时绘制全身体识别结果</div>';

let holistic: vision.HolisticLandmarker | undefined;
let stopLoop: (() => void) | undefined;
let videoStream: MediaStream | undefined;

type Delegate = 'GPU' | 'CPU';
const sens = () => +sensSel.value;
const isGpu = () => delegateSel.value === 'GPU';

function holisticOpts(runningMode: 'IMAGE' | 'VIDEO'): vision.HolisticLandmarkerOptions {
  return {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task`,
      delegate: delegateSel.value as Delegate,
    },
    runningMode,
    // MediaPipe 限制：Holistic 的表情子图在 WebGL(GPU) 下 UNIMPLEMENTED，
    // GPU 模式关闭表情，由独立 FaceLandmarker 补充（混合方案）
    outputFaceBlendshapes: !isGpu(),
    minFaceDetectionConfidence: sens(),
    minPoseDetectionConfidence: sens(),
    minHandLandmarksConfidence: sens(),
  };
}

// GPU 模式下补充表情的独立 FaceLandmarker
async function getSupplementFaceLandmarker(runningMode: 'IMAGE' | 'VIDEO') {
  return getFaceLandmarker({
    runningMode,
    numFaces: 1,
    outputFacialTransformationMatrixes: false,
    baseOptions: { delegate: 'GPU' },
  });
}

function setStatus(text: string, cls: '' | 'is-loading' | 'is-ok' | 'is-error' = '') {
  statusPill.textContent = text;
  statusPill.className = 'status-pill' + (cls ? ' ' + cls : '');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function setInfo(html: string) {
  infoEle.innerHTML = html;
}

async function getHolistic(runningMode: 'IMAGE' | 'VIDEO') {
  const options = holisticOpts(runningMode);
  if (!holistic) {
    setStatus('下载模型中…', 'is-loading');
    const fileset = await getFilesetResolver();
    holistic = await vision.HolisticLandmarker.createFromOptions(fileset, options);
  } else {
    await holistic.setOptions(options);
  }
  return holistic;
}

function drawResult(r: vision.HolisticLandmarkerResult, d: vision.DrawingUtils) {
  for (const lm of r.faceLandmarks) {
    d.drawConnectors(lm, vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
  }
  for (const lm of r.poseLandmarks) {
    d.drawConnectors(lm, vision.PoseLandmarker.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
    d.drawLandmarks(lm, { color: '#FF0000', fillColor: '#FF0000', radius: 2 });
  }
  for (const lm of r.leftHandLandmarks) {
    d.drawConnectors(lm, vision.GestureRecognizer.HAND_CONNECTIONS, { color: '#FF3030', lineWidth: 2 });
    d.drawLandmarks(lm, { color: '#FFFF00', fillColor: '#FFFF00', radius: 2 });
  }
  for (const lm of r.rightHandLandmarks) {
    d.drawConnectors(lm, vision.GestureRecognizer.HAND_CONNECTIONS, { color: '#3030FF', lineWidth: 2 });
    d.drawLandmarks(lm, { color: '#00FFFF', fillColor: '#00FFFF', radius: 2 });
  }
}

function resultSummary(r: vision.HolisticLandmarkerResult, ms: number, blendshapeOverride?: vision.Classifications[]) {
  const blendshapeTop = (blendshapeOverride ?? r.faceBlendshapes)?.[0]?.categories
    ?.filter((c) => c.score > 0.3)
    .sort((a, b) => b.score - a.score);

  return `
    <div class="result-summary">
      ${ms ? `<span class="stat-chip">耗时 <b>${ms}ms</b></span>` : ''}
      <span class="stat-chip ${r.faceLandmarks.length ? 'hot' : ''}">脸 <b>${r.faceLandmarks.length}</b></span>
      <span class="stat-chip ${r.poseLandmarks.length ? 'hot' : ''}">身体 <b>${r.poseLandmarks.length}</b></span>
      <span class="stat-chip ${r.leftHandLandmarks.length ? 'hot' : ''}">左手 <b>${r.leftHandLandmarks.length}</b></span>
      <span class="stat-chip ${r.rightHandLandmarks.length ? 'hot' : ''}">右手 <b>${r.rightHandLandmarks.length}</b></span>
    </div>
    ${blendshapeTop?.length
      ? `<div class="panel-title">显著表情（&gt; 0.3）</div>
         <div class="result-summary">${blendshapeTop
           .map((c) => `<span class="stat-chip">${c.categoryName} <b>${c.score.toFixed(2)}</b></span>`)
           .join('')}</div>`
      : ''
    }
  `;
}

// ============ 图片识别 ============
async function detectImage(source: File | string) {
  if (stopLoop) stopVideo();

  try {
    const img = await loadImage(source);

    viewImage.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'media-wrap';
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    wrap.append(img, canvas);
    viewImage.appendChild(wrap);

    const hl = await getHolistic('IMAGE');

    // GPU 模式下表情由独立 FaceLandmarker 补充（Holistic 表情子图不支持 WebGL）
    let blendshapes: vision.Classifications[] | undefined;
    if (isGpu()) {
      const fl = await getSupplementFaceLandmarker('IMAGE');
      blendshapes = fl.detect(img).faceBlendshapes;
    }

    setStatus('识别中…', 'is-loading');
    const t0 = performance.now();
    const r = hl.detect(img);
    const ms = Math.round(performance.now() - t0);

    const drawingUtils = new vision.DrawingUtils(canvas.getContext('2d')!);
    drawResult(r, drawingUtils);
    setInfo(resultSummary(r, ms, blendshapes));
    setStatus(`完成 · ${ms}ms`, 'is-ok');
  } catch (err) {
    setStatus('识别失败', 'is-error');
    setInfo(`<div class="error-text">${escapeHtml(String((err as Error).message || err))}</div>`);
  }
}

bindImageInput(document.getElementById('J_btn_image') as HTMLInputElement, viewImage, detectImage);

// ============ 摄像头识别：可启动 / 停止 / 配置变更时自动重启 ============
async function startVideo() {
  if (stopLoop) return; // 已在运行

  const video = document.createElement('video');
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;

  initCamera(video, async () => {
    video.style.width = '';
    video.style.height = '';
    videoStream = video.srcObject as MediaStream;

    try {
      const hl = await getHolistic('VIDEO');
      // GPU 模式下表情由独立 FaceLandmarker 补充
      const supplementFace = isGpu() ? await getSupplementFaceLandmarker('VIDEO') : undefined;

      viewVideo.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'media-wrap';
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      wrap.append(video, canvas);
      viewVideo.appendChild(wrap);

      const drawingUtils = new vision.DrawingUtils(canvas.getContext('2d')!);
      setStatus('实时识别中', 'is-ok');
      btnStop.hidden = false;

      let lastInfoAt = 0;
      stopLoop = requestAnimationFrameWithVideoPlay(video, ({ changed, timestamp }) => {
        if (!changed || !holistic) return;
        const r = holistic.detectForVideo(video, timestamp);
        const bs = supplementFace ? supplementFace.detectForVideo(video, timestamp).faceBlendshapes : undefined;
        drawResult(r, drawingUtils);

        // 结果面板节流刷新（约 5fps）
        const now = performance.now();
        if (now - lastInfoAt > 200) {
          lastInfoAt = now;
          setInfo(resultSummary(r, 0, bs));
        }
      });
    } catch (err) {
      setStatus('识别失败', 'is-error');
      setInfo(`<div class="error-text">${escapeHtml(String((err as Error).message || err))}（摄像头被拒绝或不可用？）</div>`);
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
  setInfo('<div class="empty-hint">等待识别输入</div>');
}

document.getElementById('J_btn_video')!.addEventListener('click', startVideo);
btnStop.addEventListener('click', stopVideo);

// 配置变更：视频运行中则自动重启以应用新配置；图片模式在下次上传时生效
[delegateSel, sensSel].forEach((sel) => {
  sel.addEventListener('change', () => {
    if (stopLoop) {
      stopVideo();
      startVideo();
    } else {
      setStatus('配置已更新', 'is-ok');
    }
  });
});
