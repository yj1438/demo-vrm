import * as THREE from 'three';
import { loadVrm } from './load-vrm';
import { loadPmx } from './load-pmx';
import { drawTest } from './draw-test';

// init
const canvasEle = document.getElementById('J_canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
	antialias: true,
	alpha: true,
	canvas: canvasEle
});

// document.body.appendChild( renderer.domElement );
const clock = new THREE.Clock();

const tickerRenderEvent = new THREE.EventDispatcher<any>();
const tickerRenderFn = (drawFn) => {
  tickerRenderEvent.addEventListener('render', (event) => {
    drawFn(event.clock);
  });
};

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
camera.position.set(0.0, 5.5, 80.0)

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
loadPmx(scene, tickerRenderFn);

// test
drawTest(scene, tickerRenderFn);