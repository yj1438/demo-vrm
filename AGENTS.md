# AGENTS.md

MediaPipe 人体识别调试台：无框架 TypeScript + Vite 多页面应用，验证浏览器端人体动捕技术栈。

## 常用命令

```bash
pnpm install          # 安装依赖（仓库用 pnpm，用 corepack enable pnpm 启用）
pnpm dev              # 开发服务器（默认 5173，无 --open）
npx vite build        # 构建全部 8 个页面入口（vite.config.ts 显式列出）
```

- pnpm 12：构建脚本白名单在 `pnpm-workspace.yaml` 的 `allowBuilds`（esbuild），不在 package.json
- 无 tsconfig、无测试；验证手段 = `vite build` 全绿 + 浏览器实测（构建只转译不做类型检查）

## 架构

多入口页面：根目录每个 `page-*.html` 一个功能页，`vite.config.ts` 列出全部入口，**新增页面必须同步加进 rollupOptions.input**。

```
src/
  common/style.css        # 全部调试页共用的设计系统（暗色主题），页面结构：.app > header/toolbar/stage
  page-uni-1/             # 综合识别（face+pose+gesture 三识别器联合）
  page-holistic/          # Holistic 全身体识别（单模型 553 点，含混合 GPU 方案）
  page-face-1/ page-gesture-1/ page-pose-1/   # 单任务调试页（结构同 uni）
  page-vrm/               # three-vrm 动捕（表情映射 + 骨骼驱动）
  page-tween/             # 补间动画实验
  util/
    camera-steam.ts       # 摄像头 initCamera + rAF 循环（时间戳/changed 判定）——拼写是 stream 的历史笔误
    mediapipe/common.ts   # FilesetResolver 单例；wasm CDN 锁定与 package.json 同版本
    mediapipe/{face-landmark,pose-landmark,gesture-landmark}/
      index.ts            # 引擎封装：单例 + baseOptions 深合并 + delegate 变更自动重建
      debug.ts            # DrawingUtils 绘制 + info 面板输出
    mediapipe/calc-arms.ts / vector.ts / filter-algorithm.ts / to-*.ts   # 解算与映射（纯函数）
docs/feature/             # 方案文档（human-detector-component.md：组件化 CR + Holistic 调研）
```

页面 ↔ util 的契约：页面传 DOM（video/canvas/信息元素），util 返回 MediaPipe 原始 Result，debug.ts 只做绘制。

## 关键约定

- 元素 id 用 `J_` 前缀（`J_btn_image`、`J_view_video`、`J_status`）
- 配置参数（delegate/阈值/数量）做成页面工具栏的 `<select>`，配置变更时若视频流运行中 → 停止并重启整条流水线应用新配置
- 阈值等参数**显式配置，不依赖 MediaPipe 默认值**（官方模型文件存在原地静默更新，行为会漂移）
- wasm CDN（`common.ts`）与 package.json 中 `@mediapipe/tasks-vision` 版本必须同步锁定，禁止 `@latest`
- Canvas 覆盖层对齐：`.media-wrap`（relative）包媒体 + `canvas { position:absolute; inset:0; width/height:100% }`，JS 只设 canvas 原始分辨率，显示尺寸纯 CSS。不要用 JS 计算 clientWidth
- 提交与推送必须由用户明确要求，不要自行 commit/push

## 已知坑（踩过的，别再踩）

1. **`img.decode()` 对 blob URL 图片会永久挂起**（部分环境稳定复现）→ 一律用 `onload` Promise 兜底
2. **多个识别器并行创建（Promise.all）会互相竞争 GPU 图初始化导致卡死** → 必须 `await` 串行创建
3. **Holistic 的 blendshapes 子图在 WebGL(GPU) 下 UNIMPLEMENTED** → GPU 模式关表情 + 独立 FaceLandmarker(GPU) 补充（混合方案，已实测）；CPU 模式全内置
4. **delegate 切换不能靠 setOptions** → util 层已实现：delegate 变更时 close 旧实例重建
5. **esm 模块单例 + `start*` 回调式 API 已废弃** → 新代码用 `get*Landmarker(opts)` 直驱 + `requestAnimationFrameWithVideoPlay`
6. three r172 移除 MMD 模块 → PMX 加载用 `three-stdlib`（见 `src/page-vrm/load-pmx.ts`）
7. DrawingUtilsPool 以 canvas 为 key 从不清理（图片页每传一张图泄漏一条）→ 组件化时处理，暂不新增使用
8. 严格 tsc 下历史代码有大量 implicit any / null 噪音，是存量问题，不要为了消警告大改业务代码

## 版本对应关系

- `@mediapipe/tasks-vision` 1.1.1：Face/Pose/Gesture/Holistic Landmarker API 与 0.10.x 完全兼容
- 模型 URL：`storage.googleapis.com/mediapipe-models/<task>/<task>/float16/latest|1/<task>.task`
- HolisticLandmarker 单模型输出 553 点：脸 478+blendshape、身体 33+world+分割、双手各 21（含手指）

## 进行中

`docs/feature/human-detector-component.md`：计划把 util 层整理为 `HumanDetector`（引擎层）+ `DebugDrawer`（呈现层）组件，含完整 CR 清单（P0-P2）与五步整理顺序。
