import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

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
      window.vrm = vrm;
      console.log(vrm);
    },
    function (progress) {
      console.log('[vrm] Loading model...', 100.0 * (progress.loaded / progress.total), '%')
    },
    function (error) {
      console.error('[vrm] Error', error);
    }
  );

  // control expression
  // https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/examples/expressions.html
  function controlExpression(clock) {
    if (!currentVrm) return;

    currentVrm.expressionManager.setValue('happy', 1.0); // 😄
  }

  // control bones
  // https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/examples/bones.html
  function controlBones(clock) {
    if (!currentVrm) return;

    // tweak bones
    const s = 0.25 * Math.PI * Math.sin(Math.PI * clock.elapsedTime);
    currentVrm.humanoid.getNormalizedBoneNode('neck').rotation.y = s;
    currentVrm.humanoid.getNormalizedBoneNode('leftUpperArm').rotation.z = s;
    currentVrm.humanoid.getNormalizedBoneNode('rightUpperArm').rotation.x = s;
  }

  tickerRenderFn((clock) => {
    if (currentVrm) {
      const deltaTime = clock.getDelta();

      controlExpression(clock);

      controlBones(clock);

      // update
      currentVrm.update(deltaTime);
    }
  });

}

type ExpressionName = 'neutral' | 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | 'blink' | 'happy' | 'angry' | 'sad' | 'relaxed' | 'lookUp' | 'lookDown' | 'lookLeft' | 'lookRight' | 'blinkLeft' | 'blinkRight';

// type bones
// ['hips', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot', 'spine', 'chest', 'neck', 'head', 'leftShoulder', 'rightShoulder', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand', 'leftToes', 'rightToes', 'leftEye', 'rightEye', 'jaw', 'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal', 'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal', 'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal', 'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal', 'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal', 'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal', 'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal', 'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal', 'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal', 'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal', 'upperChest']

type HumanBoneName = 'hips' | 'leftUpperLeg' | 'rightUpperLeg' | 'leftLowerLeg' | 'rightLowerLeg' | 'leftFoot' | 'rightFoot' | 'spine' | 'chest' | 'neck' | 'head' | 'leftShoulder' | 'rightShoulder' | 'leftUpperArm' | 'rightUpperArm' | 'leftLowerArm' | 'rightLowerArm' | 'leftHand' | 'rightHand' | 'leftToes' | 'rightToes' | 'leftEye' | 'rightEye' | 'jaw' | 'leftThumbMetacarpal' | 'leftThumbProximal' | 'leftThumbDistal' | 'leftIndexProximal' | 'leftIndexIntermediate' | 'leftIndexDistal' | 'leftMiddleProximal' | 'leftMiddleIntermediate' | 'leftMiddleDistal' | 'leftRingProximal' | 'leftRingIntermediate' | 'leftRingDistal' | 'leftLittleProximal' | 'leftLittleIntermediate' | 'leftLittleDistal' | 'rightThumbMetacarpal' | 'rightThumbProximal' | 'rightThumbDistal' | 'rightIndexProximal' | 'rightIndexIntermediate' | 'rightIndexDistal' | 'rightMiddleProximal' | 'rightMiddleIntermediate' | 'rightMiddleDistal' | 'rightRingProximal' | 'rightRingIntermediate' | 'rightRingDistal' | 'rightLittleProximal' | 'rightLittleIntermediate' | 'rightLittleDistal' | 'upperChest';