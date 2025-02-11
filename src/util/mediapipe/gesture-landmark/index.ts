import * as vision from '@mediapipe/tasks-vision';
import { getFilesetResolver } from "../common";

/**
 * 
 */
let gestureRecognizer: vision.GestureRecognizer = undefined;

/**
 * 
 */
export async function getGestureRecognizer(options: vision.GestureRecognizerOptions) {
  const optionsDefault: vision.GestureRecognizerOptions = {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`,
      delegate: "GPU"
    },
    numHands: 2,
    // customGesturesClassifierOptions: {},
    // cannedGesturesClassifierOptions: {},
    runningMode: 'IMAGE', // "IMAGE" | "VIDEO"
  };

  const _options: vision.GestureRecognizerOptions = { ...optionsDefault, ...options };

  if (!gestureRecognizer) {
    const filesetResolver = await getFilesetResolver();
    gestureRecognizer = await vision.GestureRecognizer.createFromOptions(filesetResolver, _options);
  } else {
    await gestureRecognizer.setOptions(_options);
  }
  return gestureRecognizer;
}

export async function startGestureRecognizer(video: HTMLVideoElement, options: vision.GestureRecognizerOptions, callback: (data: any) => void) {
  const gestureRecognizer = await getGestureRecognizer(options);

  let rafIndex;
  let lastVideoTime = -1;
  function detectFrame() {
    const videoTime = video.currentTime;
    if (videoTime !== lastVideoTime) {
      const startTimeMs = performance.now();
      const gestureRecognizerResult: vision.GestureRecognizerResult = gestureRecognizer.recognizeForVideo(video, startTimeMs);

      if (gestureRecognizerResult) {
        callback({ type: 'gesture', data: gestureRecognizerResult });
      }

      lastVideoTime = videoTime;
    }

    rafIndex = requestAnimationFrame(detectFrame);
  }
  detectFrame();

  function cancelDetectFrame() {
    gestureRecognizer.close();
    cancelAnimationFrame(rafIndex);
  }

  return cancelDetectFrame;
}
