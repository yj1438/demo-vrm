import * as vision from '@mediapipe/tasks-vision';

// 定义Mediapipe和Dlib地标索引对应关系
const DLIB_68_KEYPOINTS = [
  // 面部轮廓
  { mediapipe: [127] },
  { mediapipe: [234] },
  { mediapipe: [93] },
  { mediapipe: [132, 58] },
  { mediapipe: [58, 172] },
  { mediapipe: [136] },
  { mediapipe: [150] },
  { mediapipe: [176] },
  { mediapipe: [152] },
  { mediapipe: [400] },
  { mediapipe: [379] },
  { mediapipe: [365] },
  { mediapipe: [397, 288] },
  { mediapipe: [361] },
  { mediapipe: [323] },
  { mediapipe: [454] },
  { mediapipe: [356] },

  // 右眉
  { mediapipe: [70] },
  { mediapipe: [63] },
  { mediapipe: [105] },
  { mediapipe: [66] },
  { mediapipe: [107] },
  
  // 左眉
  { mediapipe: [336] },
  { mediapipe: [296] },
  { mediapipe: [334] },
  { mediapipe: [293] },
  { mediapipe: [300] },

  // 鼻子
  { mediapipe: [168, 6] },
  { mediapipe: [197, 195] },
  { mediapipe: [5] },
  { mediapipe: [4] },
  { mediapipe: [75] },
  { mediapipe: [97] },
  { mediapipe: [2] },
  { mediapipe: [326] },
  { mediapipe: [305] },

  // 右眼
  { mediapipe: [33] },
  { mediapipe: [160] },
  { mediapipe: [158] },
  { mediapipe: [133] },
  { mediapipe: [153] },
  { mediapipe: [144] },

  // 左眼
  { mediapipe: [362] },
  { mediapipe: [385] },
  { mediapipe: [387] },
  { mediapipe: [263] },
  { mediapipe: [373] },
  { mediapipe: [380] },

  // 上唇轮廓顶部
  { mediapipe: [61] },
  { mediapipe: [39] },
  { mediapipe: [37] },
  { mediapipe: [0] },
  { mediapipe: [267] },
  { mediapipe: [269] },
  { mediapipe: [291] },

  // 下唇轮廓底部
  { mediapipe: [321] },
  { mediapipe: [314] },
  { mediapipe: [17] },
  { mediapipe: [84] },
  { mediapipe: [91] },

  // 上唇轮廓底部
  { mediapipe: [78] },
  { mediapipe: [82] },
  { mediapipe: [13] },
  { mediapipe: [312] },
  { mediapipe: [308] },

  // 下唇轮廓顶部
  { mediapipe: [317] },
  { mediapipe: [14] },
  { mediapipe: [87] },
];

/**
 * 把 Mediapipe 的 468 个关键点转换成 Dlib 的 68 个关键点
 */
export function mediapipeFaceLandmarksToDlib(faceLandmarks: vision.NormalizedLandmark[]) {
  // 转换地标
  const _faceLandmarks: vision.NormalizedLandmark[] = DLIB_68_KEYPOINTS.map((point) => {
    const values = point.mediapipe.map((index) => {
      return faceLandmarks[index];
    });

    // 计算平均值
    const x = values.reduce((prev, curr) => prev + curr.x, 0) / values.length;
    const y = values.reduce((prev, curr) => prev + curr.y, 0) / values.length;
    const z = values.reduce((prev, curr) => prev + curr.z, 0) / values.length;
    const visibility = values.reduce((prev, curr) => prev + curr.visibility, 0) / values.length;
    return { x, y, z, visibility };
  });

  return _faceLandmarks;
}