import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadVrm (scene: THREE.Scene, tickerRenderFn: (fn: (clock: THREE.Clock) => void) => void) {

  // vrm
  const gltfLoader = new GLTFLoader();

  gltfLoader.load(
    '/models/vrm/alicia-solid.vrm',
    function (gltf) {
      const vrm = gltf.scene;
      scene.add(vrm);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );

}
