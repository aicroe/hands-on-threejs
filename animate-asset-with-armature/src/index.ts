import * as dat from 'dat.gui';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;
let actions: THREE.AnimationAction[];
let mixer: THREE.AnimationMixer;
let params: { play: boolean, weight: number }[];

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00aaff);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(-6, 0, 6);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 2);
  light.position.set(0, 1, 10);
  scene.add(light);

  renderer = new THREE.WebGLRenderer();
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  const loader = new GLTFLoader();
  const assetPath = 'public/zombie.glb';
  loader.load(assetPath, object => {
    actions = [];

    mixer = new THREE.AnimationMixer(object.scene);

    object.animations.forEach(anim => {
      const action = mixer.clipAction(anim);
      actions.push(action);
    });

    actions[2].play();

    scene.add(object.scene);
    update();
  });

  addGUI();

  window.addEventListener('resize', resize, false);

}

function addGUI() {
  const params1 = {
    play: false,
    weight: 0
  }

  const params2 = {
    play: false,
    weight: 0
  }

  params = [];
  params.push(params1);
  params.push(params2);

  const gui = new dat.GUI();
  const arms1 = gui.addFolder('Raised Arms');
  const arms2 = gui.addFolder('Walking Arms');
  arms1.open();
  arms2.open();
  arms1.add(params1, 'play').onChange(value => playAction(0, value));
  arms2.add(params2, 'play').onChange(value => playAction(1, value));
  arms1.add(params1, 'weight').min(0).max(1).step(0.01).listen();
  arms2.add(params2, 'weight').min(0).max(1).step(0.01).listen();

}

function updateGUI() {
  params[0].weight = actions[0].getEffectiveWeight();
  params[1].weight = actions[1].getEffectiveWeight();
}

function playAction(index: number, play: boolean) {
  const action = actions[index];

  if (play) {
    action.reset();
    action.fadeIn(0.5);
    action.play();
  } else {
    action.fadeOut(0.5);
  }
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  const dt = clock.getDelta();
  mixer.update(dt);
  updateGUI();
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
