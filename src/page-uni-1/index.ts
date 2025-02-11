import * as vision from "@mediapipe/tasks-vision";
import { getGestureRecognizer } from '../util/mediapipe/gesture-landmark/index';
import { showDebugView as showDebugViewForGesture } from '../util/mediapipe/gesture-landmark/debug';
import { getFaceLandmarker } from '../util/mediapipe/face-landmark/index';
import { showDebugView as showDebugViewForFace } from '../util/mediapipe/face-landmark/debug';
import { getPoseLandmarker } from '../util/mediapipe/pose-landmark/index';
import { showDebugView as showDebugViewForPose } from '../util/mediapipe/pose-landmark/debug';
import { initCamera, requestAnimationFrameWithVideoPlay } from "../util/camera-steam";

// 图片按钮
const btnImage = document.getElementById("J_btn_image"); // image input
const viewImage = document.getElementById("J_view_image");

/**
 * 加载本地图片
 */
btnImage.addEventListener("change", (e) => {
  // 把本地加载的图片显示在 viewImage 中
  const file = (e.target as HTMLInputElement).files[0];
  const url = URL.createObjectURL(file);
  //
  const img = new Image();
  img.style.maxWidth = "100%";
  img.src = url;
  viewImage.appendChild(img);

  //
  detectImage(img);
});

/**
 * 识别图片
 */
async function detectImage(image: HTMLImageElement) {
  const poseLandmarker = await getPoseLandmarker({ runningMode: "IMAGE" });
  const poseLandmarkerResult: vision.PoseLandmarkerResult = poseLandmarker.detect(image);

  const faceLandmarker = await getFaceLandmarker({ runningMode: "IMAGE" });
  const faceLandmarkerResult: vision.FaceLandmarkerResult = faceLandmarker.detect(image);

  const gestureRecognizer = await getGestureRecognizer({ runningMode: "IMAGE" });
  const gestureRecognizerResult: vision.GestureRecognizerResult = gestureRecognizer.recognize(image);

  // debug view
  const canvas = document.createElement("canvas") as HTMLCanvasElement;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.style.position = "absolute";
  canvas.style.left = "0px";
  canvas.style.top = "0px";
  canvas.style.width = `${image.clientWidth}px`;
  canvas.style.height = `${image.clientHeight}px`;
  viewImage.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  //
  const infoEle = document.createElement("div");
  infoEle.style.position = "absolute";
  infoEle.style.left = "0px";
  infoEle.style.top = "0px";
  viewImage.appendChild(infoEle);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  showDebugViewForPose(poseLandmarkerResult, { canvas, infoElement: infoEle, clearCanvas: false });
  showDebugViewForFace(faceLandmarkerResult, { canvas, infoElement: infoEle, clearCanvas: false });
  showDebugViewForGesture(gestureRecognizerResult, { canvas, infoElement: infoEle, clearCanvas: false });
}

// 视频按钮
const btnVideo = document.getElementById("J_btn_video"); // video input
const viewVideo = document.getElementById("J_view_video");

/**
 * 打开本地摄像头，加载视频流
 */
btnVideo.addEventListener("click", (e) => {
  const video = document.createElement("video");
  // video.style.maxWidth = "100%";
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;
  viewVideo.appendChild(video);
  
  initCamera(video, () => {
    detectVideo(video);
  });
});

async function detectVideo(video: HTMLVideoElement) {
  const poseLandmarker = await getPoseLandmarker({ runningMode: "VIDEO" });
  const faceLandmarker = await getFaceLandmarker({ runningMode: "VIDEO" });
  const gestureRecognizer = await getGestureRecognizer({ runningMode: "VIDEO" });

  // debug view
  const canvas = document.createElement("canvas") as HTMLCanvasElement;
  canvas.style.position = "absolute";
  canvas.style.left = "0px";
  canvas.style.top = "0px";
  // 和 video size 一致
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.style.width = `${video.clientWidth}px`;
  canvas.style.height = `${video.clientHeight}px`;
  
  viewVideo.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  //
  const infoEle = document.createElement("div");
  infoEle.style.position = "absolute";
  infoEle.style.left = "0px";
  infoEle.style.top = "0px";
  viewVideo.appendChild(infoEle);

  // raf
  let poseLandmarkerResult = undefined;
  let faceLandmarkerResult = undefined;
  let gestureRecognizerResult = undefined;

  const _cancelAnimationFrame = requestAnimationFrameWithVideoPlay(video, (data) => {
    const { changed, timestamp } = data;
    if (changed) {
      poseLandmarkerResult = poseLandmarker.detectForVideo(video, timestamp);
      faceLandmarkerResult = faceLandmarker.detectForVideo(video, timestamp);
      gestureRecognizerResult = gestureRecognizer.recognizeForVideo(video, timestamp);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showDebugViewForPose(poseLandmarkerResult, { canvas, infoElement: infoEle, clearCanvas: false });
    showDebugViewForFace(faceLandmarkerResult, { canvas, infoElement: infoEle, clearCanvas: false });
    showDebugViewForGesture(gestureRecognizerResult, { canvas, infoElement: infoEle, clearCanvas: false });
  });

  return () => {
    // poseLandmarker.close();
    // faceLandmarker.close();
    // gestureRecognizer.close();
    _cancelAnimationFrame();
  };
}
