import * as vision from '@mediapipe/tasks-vision';

// vrm 的表情控制
// type VrmExpressionName = 'neutral' | 'aa' | 'ee' | 'ih' | 'oh' | 'ou' | 'blink' | 'happy' | 'angry' | 'sad' | 'relaxed' | 'lookUp' | 'lookDown' | 'lookLeft' | 'lookRight' | 'blinkLeft' | 'blinkRight';

// arkit52 表情
// type Arkit52ExpressionName = 'browDownLeft' | 'browDownRight' | 'browInnerUp' | 'browOuterUpLeft' | 'browOuterUpRight' | 'cheekPuff' | 'cheekSquintLeft' | 'cheekSquintRight' | 'eyeBlinkLeft' | 'eyeBlinkRight' | 'eyeLookDownLeft' | 'eyeLookDownRight' | 'eyeLookInLeft' | 'eyeLookInRight' | 'eyeLookOutLeft' | 'eyeLookOutRight' | 'eyeLookUpLeft' | 'eyeLookUpRight' | 'eyeSquintLeft' | 'eyeSquintRight' | 'eyeWideLeft' | 'eyeWideRight' | 'jawForward' | 'jawLeft' | 'jawOpen' | 'jawRight' | 'mouthClose' | 'mouthDimpleLeft' | 'mouthDimpleRight' | 'mouthFrownLeft' | 'mouthFrownRight' | 'mouthFunnel' | 'mouthLeft' | 'mouthLowerDownLeft' | 'mouthLowerDownRight' | 'mouthPressLeft' | 'mouthPressRight' | 'mouthPucker' | 'mouthRight' | 'mouthRollLower' | 'mouthRollUpper' | 'mouthShrugLower' | 'mouthShrugUpper' | 'mouthSmileLeft' | 'mouthSmileRight' | 'mouthStretchLeft' | 'mouthStretchRight' | 'mouthUpperUpLeft' | 'mouthUpperUpRight' | 'noseSneerLeft' | 'noseSneerRight';

enum ExpressionType {
  BONE = 'bone',
  EXPRESSION = 'expression',
}

// arkit52 表情映射到 vrm 表情或者骨骼
const ExpressionMap = [
  {
    arkit52: 'eyeBlinkLeft',
    vrm: 'blinkLeft',
    type: ExpressionType.EXPRESSION,
  },
  {
    arkit52: 'eyeBlinkRight',
    vrm: 'blinkRight',
    type: ExpressionType.EXPRESSION,
  },
  // 眼睛是 bone 控制，直接用 expression 控制不行
  // {
  //   arkit52: ['eyeLookInLeft', 'eyeLookOutRight'],
  //   vrm: 'lookRight',
  //   for: 'bone',
  // },
  // {
  //   arkit52: ['eyeLookOutLeft', 'eyeLookInRight'],
  //   vrm: 'lookLeft',
  //   for: 'bone',
  // },
  // {
  //   arkit52: ['eyeLookDownLeft', 'eyeLookDownRight'],
  //   vrm: 'lookDown',
  //   for: 'bone',
  // },
  // {
  //   arkit52: ['eyeLookUpLeft', 'eyeLookUpRight'],
  //   vrm: 'lookUp',
  //   for: 'bone',
  // },
  // 眼球的控制
  {
    arkit52: [
      'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight',
      'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookInLeft', 'eyeLookOutRight'
    ],
    vrm: ['leftEye', 'rightEye'],
    type: ExpressionType.BONE,
    resolveFn: (v1, v2, v3, v4, v5, v6, v7, v8) => {
      return {
        x: 0.3 * ((v1 + v2) / 2 - (v3 + v4) / 2),
        y: 0.35 * ((v5 + v6) / 2 - (v7 + v8) / 2),
      };
    }
  },
  {
    arkit52: 'browInnerUp',
    vrm: 'angry',
    type: ExpressionType.EXPRESSION,
    resolveFn: (value) => {
      return value > 0.08 ? 0 : (0.08 - value) * 10;
    },
  },
  {
    arkit52: ['mouthSmileLeft', 'mouthSmileRight'],
    vrm: 'happy',
    type: ExpressionType.EXPRESSION,
  },
  {
    arkit52: ['mouthFrownLeft', 'mouthFrownRight'], // 解释：左嘴角向下
    vrm: 'sad',
    type: ExpressionType.EXPRESSION,
  },
  {
    arkit52: 'jawOpen', // 解释：嘴巴张开
    vrm: 'aa',
    type: ExpressionType.EXPRESSION,
  },
];

export type VrmExpressionData = { name: string | string[], score: number | { x: number, y: number, z?: number }, type: ExpressionType};
/**
 * 把 mediapipe 获取的 arkit52 表情映射到 vrm 表情
 */
export function arkit52ToVrmExpression(faceBlendshape: vision.Classifications) {
  const faceBlendshapeObj = {};
  //
  const expression: Array<VrmExpressionData> = [];

  if (!faceBlendshape) {
    return expression;
  }
  
  // 把 arkit52 的数据转换成 kv 对象
  faceBlendshape.categories.forEach((item) => {
    faceBlendshapeObj[item.categoryName] = item.score;
  });
  
  ExpressionMap.forEach((item) => {
    const { arkit52, vrm, type, resolveFn } = item;
    let values: Array<number> = [];
    let score = 0;
    if (typeof arkit52 === 'string') {
      values = [faceBlendshapeObj[arkit52]];
    } else if (Array.isArray(arkit52)) {
      values = arkit52.map((v) => faceBlendshapeObj[v]);
    }

    if (resolveFn) {
      score = (resolveFn as any)(...values);
    } else {
      score = values.reduce((acc, val) => acc + val, 0) / values.length;
    }

    expression.push({
      name: vrm,
      score,
      type,
    });
  });

  return expression;
}

/*
// https://www.bilibili.com/read/cv18895034/
{
  "categories": [
      {
          "index": 0,
          "score": 3.785953310853074e-7,
          "categoryName": "_neutral",
          "displayName": ""
      },
      {
          "index": 1,
          "score": 0.008767500519752502,
          "categoryName": "browDownLeft",
          "displayName": ""
      },
      {
          "index": 2,
          "score": 0.02906862273812294,
          "categoryName": "browDownRight",
          "displayName": ""
      },
      {
          "index": 3,
          "score": 0.037377338856458664,
          "categoryName": "browInnerUp",
          "displayName": ""
      },
      {
          "index": 4,
          "score": 0.11082107573747635,
          "categoryName": "browOuterUpLeft",
          "displayName": ""
      },
      {
          "index": 5,
          "score": 0.030750475823879242,
          "categoryName": "browOuterUpRight",
          "displayName": ""
      },
      {
          "index": 6,
          "score": 0.000006742505775036989,
          "categoryName": "cheekPuff",
          "displayName": ""
      },
      {
          "index": 7,
          "score": 9.659039790221868e-8,
          "categoryName": "cheekSquintLeft",
          "displayName": ""
      },
      {
          "index": 8,
          "score": 1.3684096700217196e-7,
          "categoryName": "cheekSquintRight",
          "displayName": ""
      },
      {
          "index": 9,
          "score": 0.1851179450750351,
          "categoryName": "eyeBlinkLeft",
          "displayName": ""
      },
      {
          "index": 10,
          "score": 0.24029891192913055,
          "categoryName": "eyeBlinkRight",
          "displayName": ""
      },
      {
          "index": 11,
          "score": 0.10603734850883484,
          "categoryName": "eyeLookDownLeft",
          "displayName": ""
      },
      {
          "index": 12,
          "score": 0.14908558130264282,
          "categoryName": "eyeLookDownRight",
          "displayName": ""
      },
      {
          "index": 13,
          "score": 0.07654061168432236,
          "categoryName": "eyeLookInLeft",
          "displayName": ""
      },
      {
          "index": 14,
          "score": 0.17646251618862152,
          "categoryName": "eyeLookInRight",
          "displayName": ""
      },
      {
          "index": 15,
          "score": 0.08695510029792786,
          "categoryName": "eyeLookOutLeft",
          "displayName": ""
      },
      {
          "index": 16,
          "score": 0.01411629281938076,
          "categoryName": "eyeLookOutRight",
          "displayName": ""
      },
      {
          "index": 17,
          "score": 0.10255708545446396,
          "categoryName": "eyeLookUpLeft",
          "displayName": ""
      },
      {
          "index": 18,
          "score": 0.06980860233306885,
          "categoryName": "eyeLookUpRight",
          "displayName": ""
      },
      {
          "index": 19,
          "score": 0.5850335955619812,
          "categoryName": "eyeSquintLeft",
          "displayName": ""
      },
      {
          "index": 20,
          "score": 0.510432243347168,
          "categoryName": "eyeSquintRight",
          "displayName": ""
      },
      {
          "index": 21,
          "score": 0.002980276243761182,
          "categoryName": "eyeWideLeft",
          "displayName": ""
      },
      {
          "index": 22,
          "score": 0.0016607033321633935,
          "categoryName": "eyeWideRight",
          "displayName": ""
      },
      {
          "index": 23,
          "score": 0.000034092146961484104,
          "categoryName": "jawForward",
          "displayName": ""
      },
      {
          "index": 24,
          "score": 0.00031207920983433723,
          "categoryName": "jawLeft",
          "displayName": ""
      },
      {
          "index": 25,
          "score": 0.008623097091913223,
          "categoryName": "jawOpen",
          "displayName": ""
      },
      {
          "index": 26,
          "score": 0.00016046350356191397,
          "categoryName": "jawRight",
          "displayName": ""
      },
      {
          "index": 27,
          "score": 0.0012788999592885375,
          "categoryName": "mouthClose",
          "displayName": ""
      },
      {
          "index": 28,
          "score": 0.0022650393657386303,
          "categoryName": "mouthDimpleLeft",
          "displayName": ""
      },
      {
          "index": 29,
          "score": 0.025599906221032143,
          "categoryName": "mouthDimpleRight",
          "displayName": ""
      },
      {
          "index": 30,
          "score": 0.0004647658206522465,
          "categoryName": "mouthFrownLeft",
          "displayName": ""
      },
      {
          "index": 31,
          "score": 0.0005128885968588293,
          "categoryName": "mouthFrownRight",
          "displayName": ""
      },
      {
          "index": 32,
          "score": 0.0002738004841376096,
          "categoryName": "mouthFunnel",
          "displayName": ""
      },
      {
          "index": 33,
          "score": 0.00009279221558244899,
          "categoryName": "mouthLeft",
          "displayName": ""
      },
      {
          "index": 34,
          "score": 0.0009938740404322743,
          "categoryName": "mouthLowerDownLeft",
          "displayName": ""
      },
      {
          "index": 35,
          "score": 0.0007352445391006768,
          "categoryName": "mouthLowerDownRight",
          "displayName": ""
      },
      {
          "index": 36,
          "score": 0.024751050397753716,
          "categoryName": "mouthPressLeft",
          "displayName": ""
      },
      {
          "index": 37,
          "score": 0.11172208189964294,
          "categoryName": "mouthPressRight",
          "displayName": ""
      },
      {
          "index": 38,
          "score": 0.014333398081362247,
          "categoryName": "mouthPucker",
          "displayName": ""
      },
      {
          "index": 39,
          "score": 0.009618187323212624,
          "categoryName": "mouthRight",
          "displayName": ""
      },
      {
          "index": 40,
          "score": 0.03941737860441208,
          "categoryName": "mouthRollLower",
          "displayName": ""
      },
      {
          "index": 41,
          "score": 0.025665123015642166,
          "categoryName": "mouthRollUpper",
          "displayName": ""
      },
      {
          "index": 42,
          "score": 0.01585918292403221,
          "categoryName": "mouthShrugLower",
          "displayName": ""
      },
      {
          "index": 43,
          "score": 0.0010534337488934398,
          "categoryName": "mouthShrugUpper",
          "displayName": ""
      },
      {
          "index": 44,
          "score": 0.00006925431080162525,
          "categoryName": "mouthSmileLeft",
          "displayName": ""
      },
      {
          "index": 45,
          "score": 0.00013454158033709973,
          "categoryName": "mouthSmileRight",
          "displayName": ""
      },
      {
          "index": 46,
          "score": 0.0002457056543789804,
          "categoryName": "mouthStretchLeft",
          "displayName": ""
      },
      {
          "index": 47,
          "score": 0.0022067406680434942,
          "categoryName": "mouthStretchRight",
          "displayName": ""
      },
      {
          "index": 48,
          "score": 0.000009800488442124333,
          "categoryName": "mouthUpperUpLeft",
          "displayName": ""
      },
      {
          "index": 49,
          "score": 0.000021336323698051274,
          "categoryName": "mouthUpperUpRight",
          "displayName": ""
      },
      {
          "index": 50,
          "score": 9.276797641177836e-7,
          "categoryName": "noseSneerLeft",
          "displayName": ""
      },
      {
          "index": 51,
          "score": 2.689247935450112e-7,
          "categoryName": "noseSneerRight",
          "displayName": ""
      }
  ],
  "headIndex": -1,
  "headName": ""
}
*/