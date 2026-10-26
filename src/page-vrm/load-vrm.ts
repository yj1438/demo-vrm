import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as vision from "@mediapipe/tasks-vision";
import { initCamera } from '../util/camera-steam';
import { getFaceLandmarker } from '../util/mediapipe/face-landmark';
import { arkit52ToVrmExpression } from '../util/mediapipe/face-landmark/to-vrm';
import { getPoseLandmarker, getPoseLandmarkerArmsRotation } from '../util/mediapipe/pose-landmark';

/**
 * 加载 VRM 模型
 */
export function loadVrm(scene: THREE.Scene, tickerRenderFn: (fn: (clock: THREE.Clock) => void) => void) {

  let currentVrm: any = null;

  // vrm
  const gltfLoader = new GLTFLoader();
  gltfLoader.crossOrigin = 'anonymous';

  // Install a GLTFLoader plugin that enables VRM support
  gltfLoader.register((parser) => {
    return new VRMLoaderPlugin(parser);
  });

  gltfLoader.load(
    '/models/vrm/alicia-solid.vrm',
    // 'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
    function (gltf) {
      console.log('[vrm] Loaded gltf', gltf);

      // 如果没有 VRMLoaderPlugin
      // const vrm = gltf.scene;
      // scene.add(vrm);

      // retrieve a VRM instance from gltf
      const vrm = gltf.userData.vrm;

      // https://github.com/pixiv/three-vrm/blob/dev/docs/migration-guide-1.0.md#vrmutilsrotatevrm0
      if (vrm.meta.metaVersion === '0') {
        VRMUtils.rotateVRM0(vrm);
      }

      // calling these functions greatly improves the performance
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.removeUnnecessaryJoints(gltf.scene);

      // Disable frustum culling
      vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });

      // add the loaded vrm to the scene
      scene.add(vrm.scene);
      // scene.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI);

      // deal with vrm features
      currentVrm = vrm;
      // window.vrm = vrm;
      console.log(vrm);

      // 初始化摄像头
      // const video = document.getElementById('J_camera_video') as HTMLVideoElement;
      // initCamera(video, () => {
      //   startFaceLandmark(video, {runningMode: 'VIDEO'}, (result) => {
      //     const { type, data } = result;
      //     /**
      //      * 控制面部
      //      */
      //     if (type === 'face' && data) {

      //       // 取第一个面部变换
      //       const matrix = data.facialTransformationMatrixes[0];
      //       const newMatrix = new THREE.Matrix4().fromArray(matrix.data);
      //       // 把矩阵转换成欧拉角
      //       const euler = new THREE.Euler();
      //       euler.setFromRotationMatrix(newMatrix);

      //       const neck = currentVrm.humanoid.getNormalizedBoneNode('neck');
      //       if (euler) {
      //         neck.rotation.x = -euler.x;
      //         neck.rotation.y = euler.y;
      //         neck.rotation.z = euler.z;
      //       }

      //       // 取第一个表情
      //       const expression = arkit52ToVrmExpression(data.faceBlendshapes[0]);

      //       if (expression) {
      //         const expressionObj: any = {};
      //         expression.forEach((item) => {
      //           const { name, score, type } = item;
      //           if (type === 'bone') {
      //             (name as string[]).forEach((boneName) => {
      //               const node = currentVrm.humanoid.getNormalizedBoneNode(boneName as HumanBoneName);
      //               if (node) {
      //                 const { x, y, z } = score as { x: number, y: number, z: number };
      //                 node.rotation.x = x;
      //                 node.rotation.y = y;
      //                 // node.rotation.z = z;
      //               }
      //             })
      //           } else {
      //             currentVrm.expressionManager.setValue(name as ExpressionName, score as number);
      //             expressionObj[name as string] = score;
      //           }
      //         });
      //         //
      //         const infoEle = document.getElementById('J_info');
      //         let info = `
      //           <div>happy：${expressionObj.happy}</div>
      //           <div>angry：${expressionObj.angry}</div>
      //           <div>sad：${expressionObj.sad}</div>
      //         `
      //         infoEle.innerHTML = info;

      //       }
      //     }
      //   });

      //   startPoseLandmark(video, {}, (result) => {
      //     const { type, data } = result;
      //     /**
      //      * 控制骨骼
      //      */
      //     if (type === 'pose' && data) {
      //       const { poseTransformationData, poseTransformations } = data;

      //       //
      //       Object.keys(poseTransformationData).forEach((boneName) => {
      //         const node = currentVrm.humanoid.getNormalizedBoneNode(boneName as HumanBoneName);
      //         if (node) {
      //           const { x, y, z } = poseTransformationData[boneName];
      //           node.rotation.x = x;
      //           node.rotation.y = y;
      //           node.rotation.z = z;
      //         }
      //       });
      //     }
      //   });
        
      // });

      startMediaPipeControlVrm(scene, currentVrm);
    },
    function (progress) {
      console.log('[vrm] Loading model...', 100.0 * (progress.loaded / progress.total), '%')
    },
    function (error) {
      console.error('[vrm] Error', error);
    }
  );

  // for test
  // control expression
  // https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/examples/expressions.html

  // control bones
  // https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/examples/bones.html

  // vrm ticker update
  tickerRenderFn((clock) => {
    if (currentVrm) {
      const deltaTime = clock.getDelta();

      currentVrm.update(deltaTime);
    }
  });
}

/**
 * bootstrap mediapipe control vrm
 */
function startMediaPipeControlVrm(scene: THREE.Scene, vrm: any) {
  const video = document.getElementById('J_camera_video') as HTMLVideoElement;
  //
  let faceLandmarker: vision.FaceLandmarker;
  let poseLandmarker: vision.PoseLandmarker;

  //
  let faceLandmarkerResult: vision.FaceLandmarkerResult = undefined;
  let poseLandmarkerResult: vision.PoseLandmarkerResult = undefined;

  // 创建一个新的容器
  const container = new THREE.Object3D();
  scene.add(container);

  const infoEle = document.getElementById('J_info');

  initCamera(
    video,
    async () => {
      faceLandmarker = await getFaceLandmarker({ runningMode: 'VIDEO' });
      poseLandmarker = await getPoseLandmarker({ runningMode: 'VIDEO' });
    },
    ({ changed, timestamp, videoTime }) => {
      if (!faceLandmarker || !poseLandmarker) {
        return;
      }
      
      if (changed) {
        faceLandmarkerResult = faceLandmarker.detectForVideo(video, timestamp);
        poseLandmarkerResult = poseLandmarker.detectForVideo(video, timestamp);
      }

      /**
       * 头/面部控制
       */
      if (faceLandmarkerResult) {
        const { facialTransformationMatrixes, faceBlendshapes } = faceLandmarkerResult;
        
        // 头部变换
        const matrix = facialTransformationMatrixes[0];
        if (matrix) {
          const newMatrix = new THREE.Matrix4().fromArray(matrix.data);
          // 把矩阵转换成欧拉角
          const euler = new THREE.Euler();
          euler.setFromRotationMatrix(newMatrix);
          const neck = vrm.humanoid.getNormalizedBoneNode('neck');
          neck.rotation.x = -euler.x;
          neck.rotation.y = euler.y;
          neck.rotation.z = euler.z;
        }

        // 表情
        const expression = arkit52ToVrmExpression(faceBlendshapes[0]);
        if (expression) {
          const expressionObj: Record<string, number> = {};
          expression.forEach((item) => {
            const { name, score, type } = item;
            if (type === 'bone') {
              (name as string[]).forEach((boneName) => {
                const node = vrm.humanoid.getNormalizedBoneNode(boneName as HumanBoneName);
                if (node) {
                  const { x, y, z } = score as { x: number, y: number, z: number };
                  node.rotation.x = x;
                  node.rotation.y = y;
                  // node.rotation.z = z; // 眼球只用 x 和 y 轴 rotation
                }
              })
            } else {
              vrm.expressionManager.setValue(name as ExpressionName, score as number);
              expressionObj[name as string] = score as number;
            }
          });

          //
          if (infoEle) {
            let info = `
              <div>happy：${expressionObj.happy}</div>
              <div>angry：${expressionObj.angry}</div>
              <div>sad：${expressionObj.sad}</div>
            `
            infoEle.innerHTML = info;
          }
        }
      }

      /**
       * 身体部分控制
       */
      if (poseLandmarkerResult) {
        const armsRotations = getPoseLandmarkerArmsRotation(poseLandmarkerResult);
        if (armsRotations && armsRotations[0]) {
          const rotations = armsRotations[0];

          let info = '';
          Object.keys(rotations).forEach((boneName) => {
            const node = vrm.humanoid.getNormalizedBoneNode(boneName as HumanBoneName);
            if (node) {
              const { x, y, z } = rotations[boneName];
              node.rotation.x = x;
              node.rotation.y = y;
              node.rotation.z = z;
            }
            info += `<div>${boneName}：${JSON.stringify(rotations[boneName])}</div>`;
          });
          infoEle.innerHTML = info;
        }

        /**
         * 按 landmarks 里的点位，绘制点线图
         */
        // container.clear();

        // landmarks.forEach((landmark) => {
        //   landmark.forEach((p) => {
        //     const point = new THREE.Vector3(p.x, -p.y + 3, p.z);
        //     const pointGeometry = new THREE.SphereGeometry(0.01);
        //     const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        //     const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
        //     pointMesh.position.copy(point);
        //     container.add(pointMesh);
        //   });

        //   vision.PoseLandmarker.POSE_CONNECTIONS.forEach((connection) => {
        //     const p1 = landmark[connection.start];
        //     const p2 = landmark[connection.end];

        //     const p1Point = new THREE.Vector3(p1.x, -p1.y + 3, p1.z);
        //     const p2Point = new THREE.Vector3(p2.x, -p2.y + 3, p2.z);
        //     // 创建线条的几何体，通过两个点的坐标来定义
        //     const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1Point, p2Point]);
        //     // 创建线条的材质
        //     const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 }); // 绿色
        //     // 创建线条的网格对象（线条类型的网格对象）
        //     const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
        //     // 将线条添加到场景中
        //     container.add(lineMesh);

        //     // const lineGeometry = new THREE.Geometry();
        //     // lineGeometry.vertices.push(new THREE.Vector3(p1.x, -p1.y + 3, p1.z));
        //     // lineGeometry.vertices.push(new THREE.Vector3(p2.x, -p2.y + 3, p2.z));
        //     // const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        //     // const line = new THREE.Line(lineGeometry, lineMaterial);
        //     // scene.add(line);
        //   });
        // });
      }
    }
  );
}

type ExpressionName = 'neutral' | 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | 'blink' | 'happy' | 'angry' | 'sad' | 'relaxed' | 'lookUp' | 'lookDown' | 'lookLeft' | 'lookRight' | 'blinkLeft' | 'blinkRight';

type HumanBoneName = 'hips' | 'leftUpperLeg' | 'rightUpperLeg' | 'leftLowerLeg' | 'rightLowerLeg' | 'leftFoot' | 'rightFoot' | 'spine' | 'chest' | 'neck' | 'head' | 'leftShoulder' | 'rightShoulder' | 'leftUpperArm' | 'rightUpperArm' | 'leftLowerArm' | 'rightLowerArm' | 'leftHand' | 'rightHand' | 'leftToes' | 'rightToes' | 'leftEye' | 'rightEye' | 'jaw' | 'leftThumbMetacarpal' | 'leftThumbProximal' | 'leftThumbDistal' | 'leftIndexProximal' | 'leftIndexIntermediate' | 'leftIndexDistal' | 'leftMiddleProximal' | 'leftMiddleIntermediate' | 'leftMiddleDistal' | 'leftRingProximal' | 'leftRingIntermediate' | 'leftRingDistal' | 'leftLittleProximal' | 'leftLittleIntermediate' | 'leftLittleDistal' | 'rightThumbMetacarpal' | 'rightThumbProximal' | 'rightThumbDistal' | 'rightIndexProximal' | 'rightIndexIntermediate' | 'rightIndexDistal' | 'rightMiddleProximal' | 'rightMiddleIntermediate' | 'rightMiddleDistal' | 'rightRingProximal' | 'rightRingIntermediate' | 'rightRingDistal' | 'rightLittleProximal' | 'rightLittleIntermediate' | 'rightLittleDistal' | 'upperChest';