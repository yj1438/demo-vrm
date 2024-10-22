import * as THREE from 'three';
import { loadVrm } from './load-vrm';
import { loadPmx } from './load-pmx';
import { drawTest } from './draw-test';

// init
const canvasEle = document.getElementById('J_canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
	// antialias: true,
	alpha: true,
	canvas: canvasEle
});
// document.body.appendChild( renderer.domElement );

const width = window.innerWidth;
const height = window.innerHeight;

// camera
const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
camera.position.set(0.0, 0.5, 5.0)

// scene
const scene = new THREE.Scene();

// light
const light = new THREE.DirectionalLight( 0xffffff, Math.PI );
light.position.set( 1.0, 1.0, 1.0 ).normalize();
scene.add( light );

// grid
const gridHelper = new THREE.PolarGridHelper(
	8,
	10,
	8,
	64,
	undefined,
	undefined,
)
scene.add(gridHelper)

// frame render ticker
const clock = new THREE.Clock();
const tickerRenderEvent = new THREE.EventDispatcher<any>();
const tickerRenderFn = (drawFn) => {
  tickerRenderEvent.addEventListener('render', (event) => {
    drawFn(event.clock);
  });
};

// animation
function animate(_time) {
	//
  tickerRenderEvent.dispatchEvent({ type: 'render', clock: clock });
	// main
	renderer.render(scene, camera);
}

renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setAnimationLoop(animate);

// vrm
loadVrm(scene, tickerRenderFn);

// pmx
// loadPmx(scene, tickerRenderFn);

// test
drawTest(scene, tickerRenderFn);