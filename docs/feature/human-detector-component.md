# 综合人体识别组件（HumanDetector）方案

> 状态：方案评审中（CR 已完成，待开发）
> 日期：2026-10-24
> 背景：`@mediapipe/tasks-vision` 升级到 1.1.1 后，以 page-uni 为基础整理出可复用的综合人体识别组件

## 一、背景与现状结论

### 1.1 依赖现状

- `@mediapipe/tasks-vision` 已从 0.10.21 升级到 **1.1.1**（npm latest，2026-10-14 发布）
- 升级对项目用到的 FaceLandmarker / PoseLandmarker / GestureRecognizer **API 零变化**，可放心重构
- wasm CDN 已从 `@latest` 锁定为 `@1.1.1`（`src/util/mediapipe/common.ts`），消除了 JS 与 wasm 版本错配

### 1.2 uni 页实测结论（2026-10-24，browser-harness 真实浏览器验证）

- **uni 页检测与绘制均正常**：清晰人脸图上 blendshape 输出与 page-face 完全一致；混合图（脸+身体+手）能同时画出姿势骨架和多人脸关键点
- 之前观察到的"只识别出身体"是**图片难度问题**：FaceLandmarker 默认 `minFaceDetectionConfidence: 0.5`，小/模糊脸达不到阈值；PoseLandmarker 基于全身轮廓则鲁棒得多
- **阈值实验数据**（难图）：默认 0.5 → 0 张脸；0.25 → 0 张；**0.1 → 1 张** ✓，降低阈值可显著提升小脸召回
- 信息栏存在"后写覆盖"：共享 info 元素被三个 debug 依次覆盖，优先级 gesture > face > pose，未检出者不写

### 1.3 page-vrm 与 uni 的关系（供参考，本方案不涉及）

底层同一套 util，但 page-vrm 是"识别结果驱动 VRM 模型"（表情映射 + 骨骼旋转），uni 是"识别结果可视化调试"。组件化后 page-vrm 应成为组件的消费端（接映射层），本次不动。

## 二、现状架构

```
页面层（4 页，90% 代码重复）
  page-face-1 / page-gesture-1 / page-pose-1 / page-uni-1
  职责：DOM 装配 + 摄像头/图片入口 + 画布创建 + 调用 debug
    ↓
引擎层（×3 份同构代码）
  face-landmark/index.ts / pose-landmark/index.ts / gesture-landmark/index.ts
  职责：模块级单例 + 默认配置 + setOptions 热切换
  另有 start*() 回调式检测循环（page-vrm 迁走后已无人使用）
    ↓
基础层
  common.ts（FilesetResolver 单例 + wasm CDN）
  camera-steam.ts（initCamera + rAF 循环 + 时间戳/changed 判定）
    ↓
算法层（组件最有价值的资产，质量合格）
  calc-arms.ts（手臂解算 + rigging + clamp + 滤波接入）
  vector.ts（数学库，kalidokit 移植）、filter-algorithm.ts（加权滑动平均）
  to-openpose18.ts / to-dlib.ts / to-vrm.ts（格式/表情映射，纯函数 ✓）
  default.ts（RestingDefault 兜底姿势）
    ↓
展示层（×3 份同构 debug.ts）
  DrawingUtils 池（按 canvas 缓存）+ 绘制 + info 元素写入（互相覆盖）
```

**已有优点**（重构需保留）：分层意识（识别/解算/绘制分离）；`to-vrm.ts` 声明式映射表（arkit52 → vrm + resolveFn）；`to-openpose18.ts` 带官方色彩规范；`calc-arms` 的 rigging + clamp + 滤波三层处理。

## 三、问题清单（CR 结论）

### P0：直接阻碍组件化

| # | 问题 | 位置 |
|---|------|------|
| 1 | 三份同构引擎代码（face/pose/gesture 的 index.ts 逐行同构，约 200 行重复） | `util/mediapipe/*/index.ts` |
| 2 | 模块级单例 + 无生命周期：无法多实例、无 dispose；`cancelDetectFrame` 会把单例本身 close 掉，cancel 后单例指向已关闭实例 | `face-landmark/index.ts:59` 等 |
| 3 | 零错误处理：getUserMedia 被拒 → unhandled rejection 页面静默；模型下载失败、detect 异常均无兜底 | 全链路 |
| 4 | 重复点击"开始摄像头"无限叠加视频/流/循环，旧流不关 | `page-uni-1/index.ts:78` 等 |

### P1：正确性问题

| # | 问题 | 位置 |
|---|------|------|
| 5 | `colors.reverse()` 原地反转循环外共享数组，左手污染后续右手配色 | `gesture-landmark/debug.ts:41` |
| 6 | `faceBlendshapes.length` 在 `outputFaceBlendshapes: false` 时字段为 undefined → TypeError | `face-landmark/debug.ts:98` |
| 7 | DrawingUtilsPool 以 canvas 为 key 永不清理，图片页每传一图新增条目，Map 无限增长 | 三份 debug.ts:4 |
| 8 | 滤波器首帧输出恒为 0（首帧只乘 weight[0]=0）；尖刺阈值 1（弧度）过大不起作用；全局实例池无 reset | `filter-algorithm.ts:44-49` |
| 9 | 两套手臂解算不一致：`getPoseLandmarkerArmsRotation` 只输出上臂（LowerArm/Hand 注释掉、无出画面兜底），闲置的 `poseLandmarkerResultDataMaker` 反而更完整 | `pose-landmark/index.ts:85-138` |
| 10 | `initCamera` 在 loadeddata 前用 `video.videoHeight` 算高度（为 0）；宽度写死 `body.clientWidth` | `camera-steam.ts:19-21` |
| 11 | `img.decode()` 对 blob URL 图片在部分环境会永久挂起（2026-10-24 实测复现，改用 `onload` 兜底） | 已在 uni/holistic 页修复 |

### P2：工程可维护性

- 无 tsconfig，strict 模式全是噪音（`let x = undefined`、`any` 泛滥）
- 命名：`camera-steam`（应为 stream）、`page-*-1` 目录、三个同名 `showDebugView` 签名不同
- `to-vrm.ts` 450 行里约 320 行是注释掉的数据样本，应进测试 fixtures
- 魔法数散落（visibility 0.23、弧度 -2.14、0.995 等），应收敛为具名配置
- 信息栏"后写覆盖"（见 1.2），根因是检测结果与 DOM 呈现未分层

## 四、目标设计

```
┌─ HumanDetector（引擎层，纯数据，不碰 DOM）──────────────┐
│  createHumanDetector({                                 │
│    tasks: { face?: FaceOpts, pose?: PoseOpts, gesture?: GestureOpts }, │
│    runningMode: 'VIDEO' | 'IMAGE',                     │
│    delegate: 'GPU' | 'CPU',                           │
│    wasmSource / models,   ← 模型与 wasm 版本集中一处     │
│    thresholds: {...},     ← 面部 0.1 阈值等实测结论放这里 │
│    maxFps?: number        ← 检测节流（常跑不满相机帧率）  │
│  })                                                    │
│  attach(video) / detectImage(img) / update() / dispose() │
│  onResults({ face, pose, gesture, timestamp })         │
│  onError / onStatus('loading-model' | 'ready' | ...)   │
└────────────────────────────────────────────────────────┘
┌─ DebugDrawer（呈现层，可选独立，由 onResults 驱动）──────┐
│  createDebugDrawer({ canvas, layers: {face,pose,gesture} }) │
│  draw(results)  ← 统一 clear 策略，修掉 P1-5/6/7        │
│  信息展示不进 Drawer —— 调用方拿 results 自行渲染        │
└────────────────────────────────────────────────────────┘
  算法层保持纯函数：toVrm / toOpenpose18 / toDlib / calcArms
```

### 关键决策

1. **引擎层返回完整原始结果**（三个 Result + timestamp），不做裁剪——映射层（VRM 等）和 UI 各取所需
2. **可销毁是硬要求**：`dispose()` 关识别器、停循环、关摄像头流，彻底替换单例模式
3. **引擎层不碰 DOM**（video/canvas 由调用方传入）→ 可测试、可复用
4. 三个单独页退化为同一组件的三种配置；uni 页 = 组件 + 全开 + Drawer；将来 page-vrm 也是消费端
5. 模型 URL / wasm 版本集中到一份配置，与 package.json 版本联动
6. **引擎模式作为配置项**：`engine: 'holistic' | 'separate'`（见第六节调研结论）

## 六、补充调研：HolisticLandmarker（2026-10-24 实测）

Tasks API 存在"老版 Holistic"的等价任务 `HolisticLandmarker`，且 **0.10.21 起就在 JS 包里**（此前未使用）。单模型输出 553 点：脸 478 + blendshape、身体 33 + world 坐标 + 分割 mask、左右手各 21 点（含手指）。官方有 Web/JS 指南，模型 `holistic_landmarker/float16/{1,latest}`。

### 实测结论（tasks-vision 1.1.1，真实浏览器验证页 `page-holistic.html`）

| 组合 | 结果 |
|------|------|
| CPU + float16/1 + blendshapes | ✓ 可用 |
| CPU + latest + blendshapes | ✓ 可用 |
| GPU + blendshapes | ✗ `UNIMPLEMENTED: ...faceblendshapesgraph...InferenceCalculator failed: No support of const`（WebGL ml_drift/gl30 上下文） |

### 对组件设计的影响

- **Holistic 的 blendshapes 分支在 WebGL GPU 下不可用**，两个选择：
  - `holistic` 模式 + `delegate: 'CPU'`：单模型全出、自带手指，代价是 CPU 推理开销
  - 混合方案：`HolisticLandmarker`（GPU，关 blendshapes）+ 独立 `FaceLandmarker`（GPU，开 blendshapes）——两次推理换 GPU 性能，组件内部封装
- **混合方案已实测验证可行**（2026-10-25，`page-holistic.html` 已实现）：Holistic GPU 387ms 正常输出身体/手，独立 FaceLandmarker GPU 表情正常；页面 GPU 模式 = Holistic(无表情) + FaceLandmarker(补表情)，CPU 模式 = Holistic 全内置
- 手指驱动成为可能（21 点/手），补齐 page-vrm 现状"手指无驱动"的缺口
- 组件默认值建议：`engine: 'holistic'`、`delegate: 'CPU'`；性能敏感场景用混合方案（已验证）

### 模型行为漂移存疑（2026-10-24 二次观察）

同一张标注覆盖的多人脸合影图，前一天默认阈值（0.5）可检出 2 张脸，次日 0.3 阈值也检不出（跨 1.1.1 / 0.10.21 两套 wasm、GPU/CPU 一致）；干净大脸（face3）三套栈全部正常检出。怀疑 Google 对 `/float16/1/` 等"版本化"模型 URL 存在原地静默更新。**组件应把阈值全部做成显式配置并默认收紧（如 0.3），不依赖官方默认值。**

## 五、整理顺序（每步可独立验证）

1. **抽 `HumanDetector`**：工厂参数化三引擎 + 生命周期 + 错误事件。新文件，旧路径先不动，风险为零
2. **抽 `DebugDrawer`**：顺手修 P1-5/6/7 三个 bug + 信息分块展示
3. **四个页面迁移**到组件调用（face/gesture/pose/uni，预计砍 70% 页面代码），删除 `start*` 三兄弟
4. **合并两套手臂解算**（P1-9），魔法数收敛为具名配置
5. 加 tsconfig + strict，清 `any`；`to-vrm.ts` 死数据进 fixtures

1、2、3 完成即可交付干净组件；4、5 可后置。
