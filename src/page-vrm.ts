import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'three/addons/animation/MMDAnimationHelper.js';

// init
const canvasEle = document.getElementById('J_canvas');
const renderer = new THREE.WebGLRenderer({
	antialias: true,
	alpha: true,
	canvas: canvasEle
});

// document.body.appendChild( renderer.domElement );
const clock = new THREE.Clock();

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
// camera.position.z = 1;
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
function animate(time) {
	// for test
	// mesh.rotation.x = time / 2000;
	// mesh.rotation.y = time / 1000;
	//
	mmdHelper.update(clock.getDelta());
	// main
	renderer.render(scene, camera);
}

renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setAnimationLoop(animate);

// ====================

// // for test
// const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
// const material = new THREE.MeshNormalMaterial();

// const mesh = new THREE.Mesh(geometry, material);
// scene.add(mesh);

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

// mmd
// https://threejs.org/docs/#examples/en/loaders/MMDLoader
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_loader_mmd.html

const mmdHelper = new MMDAnimationHelper({
	afterglow: 2.0,
	sync: true,
	resetPhysicsOnLoop: true,
});

// Instantiate a loader
const mmdLoader = new MMDLoader();

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
			gravity: new THREE.Vector3(0, - 9.8 * 10, 0),
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