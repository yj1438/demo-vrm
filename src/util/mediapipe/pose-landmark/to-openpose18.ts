import * as vision from '@mediapipe/tasks-vision';

/**
  * https://viso.ai/deep-learning/openpose/#elementor-toc__heading-anchor-1
  * https://github.com/lllyasviel/ControlNet/files/10964930/Openpose-18-keypoints_coco_color_codes_v13.pdf
0 nose 255 0 0 FF0000 1,2 Right Shoulderblade 153 0 0 990000
1 neck 255 85 0 FF5500 1,5 Left Shoulderblade 153 51 0 993300
2 Right Shoulder 255 170 0 FFAA00 2,3 Right Arm 153 102 0 996600
3 Right Elbow 255 255 0 FFFF00 3,4 Right Forearm 153 153 0 999900
4 Right Wrist 170 255 0 AAFF00 5,6 Left Arm 102 153 0 669900
5 Left Shoulder 85 255 0 55FF00 6,7 Left Forearm 51 153 0 339900
6 Left Elbow 0 255 0 00FF00 1,8 Right Torso 0 153 0 009900
7 Left Wrist 0 255 85 00FF55 8,9 Right Upper Leg 0 153 51 009933
8 Right Hip 0 255 170 00FFAA 9,10 Right Lower Leg 0 153 102 009966
9 Right Knee 0 255 255 00FFFF 1,11 Left Torso 0 153 153 009999
10 Right Ankle 0 170 255 00AAFF 11,12 Left Upper Leg 0 102 153 006699
11 Left Hip 0 85 255 0055FF 12,13 Left Lower Leg 0 51 153 003399
12 Left Knee 0 0 255 0000FF 1,0 Head 0 0 153 000099
13 Left Ankle 85 0 255 5500FF 0,14 Right Eyebrow 51 0 153 330099
14 Right Eye 170 0 255 AA00FF 14,16 Right Ear 102 0 153 660099
15 Left Eye 255 0 255 FF00FF 0,15 Left Eyebrow 153 0 153 990099
16 Right Ear 255 0 170 FF00AA 15,17 Left Ear 153 0 102 990066
17 Left Ear 255 0 85 FF0055
  */
export const OPENPOSE_18_KEYPOINTS_COCO_COLOR_CODES_V13 = {
  POINTS: [
    { name: "nose", color: "#FF0000", mediapipe: [0] }, // 0
    { name: "neck", color: "#FF5500", mediapipe: [11, 12] }, // 1
    { name: "right shoulder", color: "#FFAA00", mediapipe: [12] }, // 2
    { name: "right elbow", color: "#FFFF00", mediapipe: [14] }, // 3
    { name: "right wrist", color: "#AAFF00", mediapipe: [16] }, // 4
    { name: "left shoulder", color: "#55FF00", mediapipe: [11] }, // 5
    { name: "left elbow", color: "#00FF00", mediapipe: [13] }, // 6
    { name: "left wrist", color: "#00FF55", mediapipe: [15] }, // 7
    { name: "right hip", color: "#00FFAA", mediapipe: [24] }, // 8
    { name: "right knee", color: "#00FFFF", mediapipe: [26] }, // 9
    { name: "right ankle", color: "#00AAFF", mediapipe: [28] }, // 10
    { name: "left hip", color: "#0055FF", mediapipe: [23] }, // 11
    { name: "left knee", color: "#0000FF", mediapipe: [25] }, // 12
    { name: "left ankle", color: "#5500FF", mediapipe: [27] }, // 13
    { name: "right eye", color: "#AA00FF", mediapipe: [5] }, // 14
    { name: "left eye", color: "#FF00FF", mediapipe: [2] }, // 15
    { name: "right ear", color: "#FF00AA", mediapipe: [8] }, // 16
    { name: "left ear", color: "#FF0055", mediapipe: [7] }, // 17
  ],
  LINES: [
    { start: 1, end: 2, name: "Right Shoulderblade", color: "#990000" },
    { start: 1, end: 5, name: "Left Shoulderblade", color: "#993300" },
    { start: 2, end: 3, name: "Right Arm", color: "#996600" },
    { start: 3, end: 4, name: "Right Forearm", color: "#999900" },
    { start: 5, end: 6, name: "Left Arm", color: "#669900" },
    { start: 6, end: 7, name: "Left Forearm", color: "#339900" },
    { start: 1, end: 8, name: "Right Torso", color: "#009900" },
    { start: 8, end: 9, name: "Right Upper Leg", color: "#009933" },
    { start: 9, end: 10, name: "Right Lower Leg", color: "#009966" },
    { start: 1, end: 11, name: "Left Torso", color: "#009999" },
    { start: 11, end: 12, name: "Left Upper Leg", color: "#006699" },
    { start: 12, end: 13, name: "Left Lower Leg", color: "#003399" },
    { start: 1, end: 0, name: "Head", color: "#000099" },
    { start: 0, end: 14, name: "Right Eyebrow", color: "#330099" },
    { start: 14, end: 16, name: "Right Ear", color: "#660099" },
    { start: 0, end: 15, name: "Left Eyebrow", color: "#990099" },
    { start: 15, end: 17, name: "Left Ear", color: "#990066" },
  ],
}

/**
 * https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
 * https://arxiv.org/pdf/2006.10204
 * mediapipe pose landmark point
0 - nose
1 - left eye (inner)
2 - left eye
3 - left eye (outer)
4 - right eye (inner)
5 - right eye
6 - right eye (outer)
7 - left ear
8 - right ear
9 - mouth (left)
10 - mouth (right)
11 - left shoulder
12 - right shoulder
13 - left elbow
14 - right elbow
15 - left wrist
16 - right wrist
17 - left pinky
18 - right pinky
19 - left index
20 - right index
21 - left thumb
22 - right thumb
23 - left hip
24 - right hip
25 - left knee
26 - right knee
27 - left ankle
28 - right ankle
29 - left heel
30 - right heel
31 - left foot index
32 - right foot index
 */
// const POSE_LANDMARK_POINTS = {
  
// };

/**
 * mediapipe pose landmark to openpose 18 points
 */
export function mediapipePoseLandmarksToOpenpose18(landmarks: Array<vision.NormalizedLandmark>): Array<vision.NormalizedLandmark> {
  const _landmarks: vision.NormalizedLandmark[] = OPENPOSE_18_KEYPOINTS_COCO_COLOR_CODES_V13.POINTS.map((point) => {
    const values = point.mediapipe.map((index) => {
      return landmarks[index];
    });
    // 取平均值
    const x = values.reduce((prev, curr) => prev + curr.x, 0) / values.length;
    const y = values.reduce((prev, curr) => prev + curr.y, 0) / values.length;
    const z = values.reduce((prev, curr) => prev + curr.z, 0) / values.length;
    const visibility = values.reduce((prev, curr) => prev + curr.visibility, 0) / values.length;
    return { x, y, z, visibility };
  });

  return _landmarks;
}
