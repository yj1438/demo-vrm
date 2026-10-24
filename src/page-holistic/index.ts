import * as vision from '@mediapipe/tasks-vision';
import { getFilesetResolver } from '../util/mediapipe/common';
import { initCamera, requestAnimationFrameWithVideoPlay } from '../util/camera-steam';

/**
 * Holistic 全身体识别测试页：单模型同时输出 脸(478+blendshape) / 身体(33) / 双手(21x2)
 * 用途：验证 HolisticLandmarker 在 tasks-vision 1.1.1 下的实际效果
 */

const infoEle = document.getElementById('J_info') as HTMLDivElement;
const viewEle = document.getElementById('J_view') as HTMLDivElement;
const modelVersionSel = document.getElementById('J_model_version') as HTMLSelectElement;
const delegateSel = document.getElementById('J_delegate') as HTMLSelectElement;

let holistic: vision.HolisticLandmarker | undefined;
let cancelLoop: (() => void) | undefined;

function setInfo(html: string) {
  infoEle.innerHTML = html;
}

async function getHolistic(runningMode: 'IMAGE' | 'VIDEO') {
  const version = modelVersionSel.value;
  const options: vision.HolisticLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/${version}/holistic_landmarker.task`,
      delegate: delegateSel.value as 'GPU' | 'CPU',
    },
    runningMode,
    outputFaceBlendshapes: true,
    minFaceDetectionConfidence: 0.3,
    minPoseDetectionConfidence: 0.3,
    minHandLandmarksConfidence: 0.3,
  };

  if (!holistic) {
    const fileset = await getFilesetResolver();
    holistic = await vision.HolisticLandmarker.createFromOptions(fileset, options);
  } else {
    await holistic.setOptions(options);
  }
  return holistic;
}

/**
 * 创建画布 + 视频容器，返回绘制上下文
 */
function createView(video?: HTMLVideoElement) {
  viewEle.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  if (video) {
    viewEle.appendChild(video);
  }
  viewEle.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const drawingUtils = new vision.DrawingUtils(ctx);
  return { canvas, ctx, drawingUtils };
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

function resultSummary(r: vision.HolisticLandmarkerResult, ms: number) {
  const gestureOrEmpty = '';
  const blendshapeTop = r.faceBlendshapes?.[0]?.categories
    ?.filter((c) => c.score > 0.3)
    .map((c) => `${c.categoryName}:${c.score.toFixed(2)}`)
    .join(', ');
  return `
    <div>耗时 ${ms}ms | 脸 ${r.faceLandmarks.length} | 身体 ${r.poseLandmarks.length} | 左手 ${r.leftHandLandmarks.length} | 右手 ${r.rightHandLandmarks.length} ${gestureOrEmpty}</div>
    ${blendshapeTop ? `<div>显著表情：${blendshapeTop}</div>` : ''}
  `;
}

// ============ 图片识别 ============
document.getElementById('J_btn_image')!.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files[0];
  if (!file) return;
  try {
    const img = new Image();
    img.style.maxWidth = '100%';
    img.src = URL.createObjectURL(file);
    await img.decode();
    setInfo('模型加载中...');
    const hl = await getHolistic('IMAGE');

    const { canvas, ctx, drawingUtils } = createView();
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.width = `${img.width}px`;
    canvas.style.height = `${img.height}px`;
    viewEle.appendChild(img);

    const t0 = performance.now();
    const r = hl.detect(img);
    const ms = Math.round(performance.now() - t0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawResult(r, drawingUtils);
    setInfo(resultSummary(r, ms));
  } catch (err) {
    setInfo(`<div style="color:red">出错了：${String((err as Error).message || err)}</div>`);
  }
});

// ============ 摄像头识别 ============
document.getElementById('J_btn_video')!.addEventListener('click', async () => {
  try {
    const video = document.createElement('video');
    video.playsInline = true;
    video.autoplay = true;
    video.muted = true;
    setInfo('等待摄像头权限...');
    await getHolistic('VIDEO');

    initCamera(video, () => {
      const { canvas, ctx, drawingUtils } = createView(video);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      cancelLoop = requestAnimationFrameWithVideoPlay(video, ({ changed, timestamp }) => {
        if (!holistic || !changed) return;
        const r = holistic.detectForVideo(video, timestamp);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawResult(r, drawingUtils);
        setInfo(resultSummary(r, 0));
      });
    });
  } catch (err) {
    setInfo(`<div style="color:red">出错了：${String((err as Error).message || err)}（摄像头被拒绝或不可用？）</div>`);
  }
});

// ============ 停止 ============
document.getElementById('J_btn_stop')!.addEventListener('click', () => {
  cancelLoop?.();
  cancelLoop = undefined;
  viewEle.innerHTML = '';
  setInfo('已停止');
});
