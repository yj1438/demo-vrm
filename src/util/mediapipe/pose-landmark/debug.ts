import * as vision from '@mediapipe/tasks-vision';
import { OPENPOSE_18_KEYPOINTS_COCO_COLOR_CODES_V13, mediapipePoseLandmarksToOpenpose18 } from './to-openpose18';

const DrawingUtilsPool = new Map<HTMLCanvasElement, { drawingUtils: vision.DrawingUtils, ctx: CanvasRenderingContext2D }>();

/**
 * 显示坐标网格点和数据
 */
export function showDebugView(
  poseLandmarkerResult: vision.PoseLandmarkerResult,
  options: { canvas?: HTMLCanvasElement, infoElement?: HTMLElement, clearCanvas?: boolean, mode?: 'openpose' | 'mediapipe' } = {}
) {

  if (!poseLandmarkerResult) {
    return;
  }

  const {
    landmarks, // normalized landmarks
    worldLandmarks, // landmarks
    segmentationMasks, //
  } = poseLandmarkerResult;

  const { canvas, infoElement, clearCanvas = true, mode = 'mediapipe' } = options;

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
    for (let i = 0; i < landmarks.length; i++) {
      const _landmarks = landmarks[i];

      if (mode === 'mediapipe') {
        /*
         * mediapipe 33 points
         */
        // Line
        drawingUtils.drawConnectors(_landmarks, vision.PoseLandmarker.POSE_CONNECTIONS, { color: "#FFFF00" });
        // Point
        drawingUtils.drawLandmarks(_landmarks, {
          radius: (data) => vision.DrawingUtils.lerp(data.from!.z, -0.2, 0.2, 3, 1),
          color: "#FF0000",
          fillColor: "#FF0000",
        });
      } else if (mode === 'openpose') {
        /*
        * openpose 18 points
        */
        const openpose18Landmarks = mediapipePoseLandmarksToOpenpose18(_landmarks);
        drawingUtils.drawConnectors(openpose18Landmarks, OPENPOSE_18_KEYPOINTS_COCO_COLOR_CODES_V13.LINES, {
          color: (data) => {
            return OPENPOSE_18_KEYPOINTS_COCO_COLOR_CODES_V13.LINES[data.index].color;
          },
          lineWidth: 6,
        });
        drawingUtils.drawLandmarks(openpose18Landmarks, {
          radius: (data) => vision.DrawingUtils.lerp(data.from!.z, -0.2, 0.2, 5, 3),
          color: (data) => {
            return OPENPOSE_18_KEYPOINTS_COCO_COLOR_CODES_V13.POINTS[data.index].color;
          },
        });
      }
    }
  }
  
  if (infoElement) {
    if (!landmarks.length) {
      return;
    }
  
    let htmlMaker = "<ul>";
    landmarks[0].map((mark, index) => {
      htmlMaker += `
        <li class="blend-shapes-item">
          <span class="blend-shapes-label">${index
        }</span>
          <span class="blend-shapes-value">x:${(+mark.x).toFixed(4)},y:${(+mark.y).toFixed(4)},z:${(+mark.z).toFixed(4)}</span>
        </li>
      `;
    });
    htmlMaker += "</ul>";
  
    infoElement.innerHTML = htmlMaker;
  }
}