import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let car: THREE.Object3D;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00aaff);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1, 3);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 0.7);
  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 100;
  const shadowSize = 5;
  light.shadow.camera.left = -shadowSize;
  light.shadow.camera.right = shadowSize;
  light.shadow.camera.top = shadowSize;
  light.shadow.camera.bottom = -shadowSize;
  light.position.set(-1, 10, 6);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  const sceneAssetPath = 'public/red-car.glb';
  const loader = new GLTFLoader();
  loader.load(
    sceneAssetPath,
    (object) => {
      object.scene.traverse((each) => {
        if (!(each as THREE.Mesh).isMesh) {
          return;
        }
        if (each.name === 'platform') {
          each.receiveShadow = true;
        } else {
          each.castShadow = true;
          each.receiveShadow = true;
        }
      });

      car = new THREE.Object3D();
      car.add(object.scene.children[0]); // First child is the car

      scene.add(object.scene);
      scene.add(car);
    },
  );


  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  if (car !== undefined) {
    car.rotation.y += 0.01;
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
