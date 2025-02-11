import * as vision from '@mediapipe/tasks-vision';

let filesetResolver: any = null;
export function getFilesetResolver() {
  if (!filesetResolver) {
    filesetResolver = vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      // "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
  }
  return filesetResolver;
}
