import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let dennis: THREE.Object3D | undefined;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00aaff);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3.5, 5);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.2);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(5, 5, 6);
  scene.add(light);

  renderer = new THREE.WebGLRenderer();
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.5, 0);
  controls.update();

  const assetPath = 'public/dennis.fbx';
  const loader = new FBXLoader();
  loader.load(
    assetPath,
    (object) => {
      object.traverse(each => {
        if (each instanceof THREE.Mesh) {
          each.material.shininess = 0.1;
        }
      });
      dennis = object;
      scene.add(object);
    },
    ({ loaded, total }) => {
      const progress = Math.floor(loaded / total) * 100;
      console.log(`Loader ${progress}%`);
    },
    (error) => {
      console.error('An error happened', error);
    }
  );

  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  dennis?.rotateY(-0.02);
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
