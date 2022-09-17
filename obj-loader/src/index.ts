import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.Renderer;
let dennis: THREE.Object3D | undefined;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2d2d2d);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 10);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(1, 10, 6);
  scene.add(light);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 4, 0);
  controls.update();

  const loader = new OBJLoader();

  const assetPath = 'public/dennis.obj';
  loader.load(
    assetPath,
    (object) => {
      object.scale.set(0.05, 0.05, 0.05);
      scene.add(object);
      dennis = object;
    },
    undefined,
    (error) => {
      console.error('An error ocurred', error);
    }
  );

  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  dennis?.rotateY(0.02);
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
