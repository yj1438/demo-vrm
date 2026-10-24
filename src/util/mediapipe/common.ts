import * as vision from '@mediapipe/tasks-vision';

let filesetResolver: any = null;
export function getFilesetResolver() {
  if (!filesetResolver) {
    filesetResolver = vision.FilesetResolver.forVisionTasks(
      // 与 package.json 中 @mediapipe/tasks-vision 版本保持一致，避免 JS 与 wasm 版本错配
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm"
    );
  }
  return filesetResolver;
}
