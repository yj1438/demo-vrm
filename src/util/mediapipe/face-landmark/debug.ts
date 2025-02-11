import * as vision from '@mediapipe/tasks-vision';
import { mediapipeFaceLandmarksToDlib } from './to-dlib';

const DrawingUtilsPool = new Map<HTMLCanvasElement, { drawingUtils: vision.DrawingUtils, ctx: CanvasRenderingContext2D }>();

/**
 * 显示坐标网格点和数据
 */
export function showDebugView(
  faceLandmarkerResult: vision.FaceLandmarkerResult,
  data: { canvas?: HTMLCanvasElement, infoElement?: HTMLElement, clearCanvas?: boolean, mode?: 'dlib68' | 'mediapipe' } = {}
) {

  if (!faceLandmarkerResult) {
    return;
  }

  const {
    faceLandmarks, // normalized landmarks
    faceBlendshapes,
  } = faceLandmarkerResult;

  const { canvas, infoElement, clearCanvas = true, mode = 'mediapipe' } = data;

  if (canvas) {
    if (!DrawingUtilsPool.has(canvas)) {
      const ctx = canvas.getContext("2d");
      const drawingUtils = new vision.DrawingUtils(ctx);
      DrawingUtilsPool.set(canvas, { drawingUtils: drawingUtils, ctx });
    }
    const { drawingUtils, ctx } = DrawingUtilsPool.get(canvas);
    // 清理画布
    if (clearCanvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // 
    for (const _landmarks of faceLandmarks) {

      if (mode === 'mediapipe') {
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          { color: "#C0C0C070", lineWidth: Math.ceil(canvas.width / 500) }
        );
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
          { color: "#FF3030" }
        );
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
          { color: "#FF3030" }
        );
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
          { color: "#30FF30" }
        );
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
          { color: "#30FF30" }
        );
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
          { color: "#E0E0E0" }
        );
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_LIPS,
          { color: "#E0E030" }
        );
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
          { color: "#FF3030" }
        );
        drawingUtils.drawConnectors(
          _landmarks,
          vision.FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
          { color: "#30FF30" }
        );
      } else if (mode === 'dlib68') {
        const dlibLandmarks = mediapipeFaceLandmarksToDlib(_landmarks);
        // Points
        drawingUtils.drawLandmarks(dlibLandmarks, {
          radius: 4,
          color: "#FF0000",
          fillColor: "#FF0000",
        });
      }
    }
  }
  
  if (infoElement) {
    if (!faceBlendshapes.length) {
      return;
    }
  
    let htmlMaker = "<ul>";
    faceBlendshapes[0].categories.map((shape) => {
      htmlMaker += `
        <li class="blend-shapes-item">
          <span class="blend-shapes-label">${shape.displayName || shape.categoryName
        }</span>
          <span class="blend-shapes-value" style="width: calc(${+shape.score * 100
        }% - 120px)">${(+shape.score).toFixed(4)}</span>
        </li>
      `;
    });
    htmlMaker += "</ul>";
  
    infoElement.innerHTML = htmlMaker;
  }
}