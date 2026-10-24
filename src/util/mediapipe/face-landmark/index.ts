import * as vision from '@mediapipe/tasks-vision';
// import { Matrix4, Euler } from 'three';
import { getFilesetResolver } from "../common";

/**
 * 
 */
let faceLandmarker: vision.FaceLandmarker = undefined;
let lastDelegate = '';

/**
 *
 */
export async function getFaceLandmarker(options: vision.FaceLandmarkerOptions) {
  const optionsDefault: vision.FaceLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      delegate: "GPU"
    },
    outputFaceBlendshapes: true, // 输出面部 arkit52 标准数据
    outputFacialTransformationMatrixes: true, // 输出面部变换矩阵
    runningMode: 'IMAGE', // "IMAGE" | "VIDEO"
    numFaces: 1,
  };

  // baseOptions 深合并：调用方只需传 { baseOptions: { delegate: 'CPU' } } 即可覆盖 delegate
  const _options: vision.FaceLandmarkerOptions = {
    ...optionsDefault,
    ...options,
    baseOptions: { ...optionsDefault.baseOptions, ...options.baseOptions },
  };

  // delegate 变更时重建实例（setOptions 热切换 delegate 不可靠）
  const delegate = _options.baseOptions.delegate;
  if (faceLandmarker && delegate !== lastDelegate) {
    faceLandmarker.close();
    faceLandmarker = undefined;
  }
  lastDelegate = delegate;

  if (!faceLandmarker) {
    const filesetResolver = await getFilesetResolver();
    faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, _options);
  } else {
    await faceLandmarker.setOptions(_options);
  }
  return faceLandmarker;
}

export async function startFaceLandmark(video: HTMLVideoElement, options: vision.FaceLandmarkerOptions, callback: (data: any) => void) {
  const faceLandmarker = await getFaceLandmarker(options);

  let rafIndex;
  let lastVideoTime = -1;
  function detectFrame() {
    const videoTime = video.currentTime;
    if (videoTime !== lastVideoTime) {
      const startTimeMs = performance.now();
      const faceLandmarkerResult: vision.FaceLandmarkerResult = faceLandmarker.detectForVideo(video, startTimeMs);

      if (faceLandmarkerResult) {
        // const faceLandmarkerResultData = faceLandmarkerResultDataMaker(faceLandmarkerResult);
        callback({ type: 'face', data: faceLandmarkerResult });
      }

      lastVideoTime = videoTime;
    }

    rafIndex = requestAnimationFrame(detectFrame);
  }
  detectFrame();

  function cancelDetectFrame() {
    faceLandmarker.close();
    cancelAnimationFrame(rafIndex);
  }

  return cancelDetectFrame;
}

/*
function faceLandmarkerResultDataMaker(faceLandmarkerResult: vision.FaceLandmarkerResult) {
  const {
    faceBlendshapes, // ARKit52 面部表情
    faceLandmarks, // mediapipe 输出的 478 个面部关键点
    facialTransformationMatrixes, // (头)面部变换矩阵 4x4
  } = faceLandmarkerResult;

  //
  // let vrmExpression: Array<VrmExpressionData> = []; // vrm 控制的表情
  // let facialTransformationEulers: Euler[] = []; // 面部变换欧拉角

  // faceBlendshapes 面部关键点转换成 vrm 表情
  // if (faceBlendshapes) {
  //   vrmExpression = arkit52ToVrmExpression(faceBlendshapes[0]);
  // }

  // facialTransformationMatrixes 面部变换矩阵
  // if (facialTransformationMatrixes) {
  //   facialTransformationEulers = facialTransformationMatrixes.map((matrix) => {
  //     const newMatrix = new Matrix4().fromArray(matrix.data);
  //     // 把矩阵转换成欧拉角
  //     const euler = new Euler();
  //     euler.setFromRotationMatrix(newMatrix);
  //     return euler;
  //   });
  // }

  return {
    faceBlendshapes,
    faceLandmarks,
    facialTransformationMatrixes,
    // facialTransformationEulers, // 面部变换欧拉角
    //
    // vrmExpression,
  };
}
*/