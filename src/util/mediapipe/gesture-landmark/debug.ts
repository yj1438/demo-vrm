import * as vision from '@mediapipe/tasks-vision';

const DrawingUtilsPool = new Map<HTMLCanvasElement, { drawingUtils: vision.DrawingUtils, ctx: CanvasRenderingContext2D }>();

/**
 * 显示坐标网格点和数据
 */
export function showDebugView(
  gestureRecognizerResult: vision.GestureRecognizerResult,
  data: { canvas?: HTMLCanvasElement, infoElement?: HTMLElement, clearCanvas?: boolean } = {}
) {

  if (!gestureRecognizerResult) {
    return;
  }

  const {
    landmarks, // normalized landmarks
    worldLandmarks,
    gestures,
    handedness,
  } = gestureRecognizerResult;

  const { canvas, infoElement, clearCanvas = true } = data;

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
    const colors = ["#FF0000", "#00FF00"];
    for (let i = 0; i < landmarks.length; i++) {
      const _landmarks = landmarks[i];
      const color = handedness[i][0].categoryName === "Right" ? colors : colors.reverse();
      drawingUtils.drawConnectors(
        _landmarks,
        vision.GestureRecognizer.HAND_CONNECTIONS,
        {
          color: color[0],
          lineWidth: 5
        }
      );
      drawingUtils.drawLandmarks(_landmarks, {
        color: color[1],
        lineWidth: 2
      });
    }
  }
  
  if (infoElement) {
    if (!gestures.length) {
      return;
    }
  
    let htmlMaker = "<ul>";
    gestures.map((data, index) => {
      const g = data[0];
      htmlMaker += `
        <li class="blend-shapes-item">
          <span class="blend-shapes-label">${handedness[index][0].categoryName}: ${g.displayName || g.categoryName
        }</span>
          <span class="blend-shapes-value" style="width: calc(${+g.score * 100
        }% - 120px)">${(+g.score).toFixed(4)}</span>
        </li>
      `;
    });
    htmlMaker += "</ul>";
  
    infoElement.innerHTML = htmlMaker;
  }
}