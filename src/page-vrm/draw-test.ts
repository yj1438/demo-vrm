import * as THREE from 'three';

export function drawTest(scene: THREE.Scene, tickerRenderFn: (fn: (clock: THREE.Clock) => void) => void) {
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const material = new THREE.MeshNormalMaterial();

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // for test
  tickerRenderFn((clock: THREE.Clock) => {
    mesh.rotation.x = clock.getElapsedTime();
    mesh.rotation.y = clock.getElapsedTime();
  });
}