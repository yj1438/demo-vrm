import * as vision from '@mediapipe/tasks-vision';
import { getFilesetResolver } from "../common";
import { calcArms } from './calc-arms';
import { RestingDefault } from './default';

/**
 * ==============
 * POSE 
 * https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker#configurations_options
 */
let poseLandmarker: vision.PoseLandmarker = undefined;

export async function getPoseLandmarker(options: vision.PoseLandmarkerOptions) {
  const optionsDefault: vision.PoseLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU"
    },
    runningMode: 'IMAGE',
    numPoses: 1,
    outputSegmentationMasks: false,
  };

  const _options: vision.PoseLandmarkerOptions = { ...optionsDefault, ...options };

  if (!poseLandmarker) {
    const filesetResolver = await getFilesetResolver();
    poseLandmarker = await vision.PoseLandmarker.createFromOptions(filesetResolver, _options);
  } else {
    await poseLandmarker.setOptions(_options);
  }
  return poseLandmarker;
}

export async function startPoseLandmark(video: HTMLVideoElement, options: vision.PoseLandmarkerOptions, callback: (data: any) => void) {
  const poseLandmarker = await getPoseLandmarker(options);

  let rafIndex;
  let lastVideoTime = -1;
  function detectFrame() {
    const videoTime = video.currentTime;
    if (videoTime !== lastVideoTime) {
      const startTimeMs = performance.now();
      poseLandmarker.detectForVideo(video, startTimeMs, (poseLandmarkerResult) => {

        if (poseLandmarkerResult) {
          const poseLandmarkerResultData = poseLandmarkerResultDataMaker(poseLandmarkerResult);
          callback({ type: 'pose', data: poseLandmarkerResultData  });
        }

      });

      lastVideoTime = videoTime;
    }

    rafIndex = requestAnimationFrame(detectFrame);
  }
  detectFrame();

  function cancelDetectFrame() {
    poseLandmarker.close();
    cancelAnimationFrame(rafIndex);
  }

  return cancelDetectFrame;
}

export function getPoseLandmarkerArmsRotation(poseLandmarkerResult: vision.PoseLandmarkerResult) {
  if (!poseLandmarkerResult) {
    return null;
  }
  const { landmarks, worldLandmarks } = poseLandmarkerResult;

  return worldLandmarks.map((worldLandmark, index) => {
    const landmark = landmarks[index];

    if (worldLandmark && worldLandmark.length) {
      const arms = calcArms(worldLandmark);

      /*
       * 校验
       */
      // todo

      return {
        leftUpperArm: arms.UpperArm.l,
        // leftLowerArm: arms.LowerArm.l,
        rightUpperArm: arms.UpperArm.r,
        // rightLowerArm: arms.LowerArm.r,
      }
    }    
  });

}

/**
 * 
 */
function poseLandmarkerResultDataMaker(poseLandmarkerResult: vision.PoseLandmarkerResult) {
  const poseTransformationData = {};
  /**
   * poseLandmarker points 转换成各个骨骼的旋转角度
   */
  const landmarks = poseLandmarkerResult.landmarks[0];
  const worldLandmarks = poseLandmarkerResult.worldLandmarks[0];
  //
  const lm3d = worldLandmarks;
  const lm2d = worldLandmarks;

  if (lm3d && lm3d.length) {

    const Arms = calcArms(lm3d);

    const rightHandOffscreen = lm3d[15].y > 0.1 || (lm3d[15].visibility ?? 0) < 0.23 || 0.995 < lm2d[15].y;
    const leftHandOffscreen = lm3d[16].y > 0.1 || (lm3d[16].visibility ?? 0) < 0.23 || 0.995 < lm2d[16].y;

    // const leftFootOffscreen = lm3d[23].y > 0.1 || (lm3d[23].visibility ?? 0) < 0.63 || Hips.Hips.position.z > -0.4;
    // const rightFootOffscreen = lm3d[24].y > 0.1 || (lm3d[24].visibility ?? 0) < 0.63 || Hips.Hips.position.z > -0.4;

    Arms.UpperArm.l = Arms.UpperArm.l.multiply(leftHandOffscreen ? 0 : 1);
    Arms.UpperArm.l.z = leftHandOffscreen ? RestingDefault.Pose.LeftUpperArm.z : Arms.UpperArm.l.z;
    Arms.UpperArm.r = Arms.UpperArm.r.multiply(rightHandOffscreen ? 0 : 1);
    Arms.UpperArm.r.z = rightHandOffscreen ? RestingDefault.Pose.RightUpperArm.z : Arms.UpperArm.r.z;

    Arms.LowerArm.l = Arms.LowerArm.l.multiply(leftHandOffscreen ? 0 : 1);
    Arms.LowerArm.r = Arms.LowerArm.r.multiply(rightHandOffscreen ? 0 : 1);

    //
    poseTransformationData['leftUpperArm'] = Arms.Unscaled.UpperArm.l;
    poseTransformationData['rightUpperArm'] = Arms.Unscaled.UpperArm.r;
    poseTransformationData['leftLowerArm'] = Arms.Unscaled.LowerArm.l;
    poseTransformationData['rightLowerArm'] = Arms.Unscaled.LowerArm.r;

    // console.log(poseTransformationData);
  }

  return { landmarks, worldLandmarks, poseTransformationData};
}