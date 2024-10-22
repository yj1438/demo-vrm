import * as THREE from 'three';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'three/addons/animation/MMDAnimationHelper.js';

// mmd
// https://threejs.org/docs/#examples/en/loaders/MMDLoader
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_loader_mmd.html

export function loadPmx (scene: THREE.Scene, tickerRenderFn: (fn: (clock: THREE.Clock) => void) => void) {

  const mmdHelper = new MMDAnimationHelper({
    afterglow: 2.0,
    sync: true,
    resetPhysicsOnLoop: true,
  });

  // Instantiate a loader
  const mmdLoader = new MMDLoader();

  tickerRenderFn((clock: THREE.Clock) => {
    mmdHelper.update(clock.getDelta());
  });;

  mmdLoader.loadWithAnimation(
    // path to PMD/PMX file
    '/models/kizunaai/kizunaai.pmx',
    ['/models/mmd/vmds/wavefile_v2.vmd'],
    // /models/mmd/vmds/wavefile_v2.vmd
    // called when the resource is loaded
    function (mmd) {
      const mesh = mmd.mesh;
      const animation = mmd.animation;

      scene.add(mesh);

      mmdHelper.add(mesh, {
        animation: animation,
        physics: true,
        warmup: 60,
        unitStep:  1/ 65,
        maxStepNum: 3,
        delayTime: 0.0,
      });

      const ikHelper = mmdHelper.objects.get(mesh).ikSolver.createHelper();
      ikHelper.visible = false;
      scene.add(ikHelper);

      const physicsHelper = mmdHelper.objects.get(mesh).physics.createHelper();
      physicsHelper.visible = false;
      scene.add(physicsHelper);

    },
    // called when loading is in progresses
    function (xhr) {

      console.log((xhr.loaded / xhr.total * 100) + '% loaded');

    },
    // called when loading has errors
    function (error) {

      console.log('An error happened', error);

    }
  );

}
