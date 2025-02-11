
export type CameraFrameCallback = (data: { videoTime: number, timestamp: number, changed: boolean }) => void;

/**
 * 初始化摄像头
 */
export function initCamera(
  video: HTMLVideoElement,
  onInit?: (data: any) => void, // video 初始化完成
  onFrame?: CameraFrameCallback, // raf 回调
) {
  if (!navigator.mediaDevices) {
    console.error('No media devices');
    return () => {};
  }

  // 适配 video 宽高，宽度撑满 [临时]
  const videoWidth = document.body.clientWidth;
  const radio = video.videoHeight / video.videoWidth;
  video.style.width = videoWidth + "px";
  video.style.height = videoWidth * radio + "px";

  // 开启摄像头
  let cancelFn = () => {};
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => {
      //
      onInit && onInit(video);
      //
      cancelFn = requestAnimationFrameWithVideoPlay(video, onFrame);
    });
  });

  return cancelFn;
}

/**
 * requestAnimationFrame with video play
 */
export function requestAnimationFrameWithVideoPlay(video: HTMLVideoElement, onFrame: CameraFrameCallback) {
  let rafIndex;

  let lastVideoTime = -1;
  let timestamp = performance.now();
  const raf = () => {
    const videoTime = video.currentTime;
    let changed = false;
    if (videoTime !== lastVideoTime) {
      lastVideoTime = videoTime;
      timestamp = performance.now();
      changed = true;
    }
    onFrame && onFrame({ videoTime, timestamp, changed });

    rafIndex = requestAnimationFrame(raf);
  }
  raf();

  return () => {
    cancelAnimationFrame(rafIndex);
  };
}
