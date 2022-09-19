import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let clock: THREE.Clock;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let mixers: THREE.AnimationMixer[];
let actions: THREE.AnimationAction[];
let gatesMode: 'open' | 'close';

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00aaff);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(-1, 1, 6);

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
  controls.target.set(1, 2, 0);
  controls.update();

  const gatesModeButton = document.createElement('button');
  gatesModeButton.innerText = `Open Gates`;
  gatesModeButton.style.cssText = `
    position: absolute;
    right: 10px;
    bottom: 10px;
    background: #fea;
    padding: 15px;
    cursor: pointer;
  `;
  document.body.appendChild(gatesModeButton);
  gatesMode = 'open';

  mixers = [];
  actions = [];

  const loader = new GLTFLoader();
  const assetPath = 'public/gate.glb';
  loader.load(
    assetPath,
    ({ scene: loadedScene, animations }) => {
      const gate = loadedScene.children[0];

      const leftGateMixer = new THREE.AnimationMixer(gate.children[0]);
      const leftGateAnimationClip = animations[0];
      const leftGateAction = leftGateMixer.clipAction(leftGateAnimationClip);
      leftGateAction.loop = THREE.LoopOnce;
      leftGateAction.clampWhenFinished = true; // Pause on the last frame

      const rightGateMixer = new THREE.AnimationMixer(gate.children[1]);
      const rightGateAnimationClip = animations[1];
      const rightGateAction = rightGateMixer.clipAction(rightGateAnimationClip);
      rightGateAction.loop = THREE.LoopOnce;
      rightGateAction.clampWhenFinished = true; // Pause on the last frame

      mixers.push(leftGateMixer, rightGateMixer);
      actions.push(leftGateAction, rightGateAction);
      scene.add(loadedScene);
    },
    undefined,
    (error) => {
      console.error('An Error Happened', error);
    },
  );

  gatesModeButton.addEventListener('click', () => {
    if (gatesMode === 'open') {
      actions.forEach((action) => {
        const time = action.time; // Save current action frame position, if it was already running
        action.reset();
        action.time = time;
        action.timeScale = 1;
        action.play();
      });
      gatesModeButton.innerText = 'Close Gates';
      gatesMode = 'close';
    } else {
      actions.forEach((action) => {
        const time = action.time; // Save current action frame position, if it was already running
        action.reset();
        action.time = time;
        action.timeScale = -1;
        action.play();
      });
      gatesModeButton.innerText = 'Open Gates';
      gatesMode = 'open';
    }
  });


  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  const dt = clock.getDelta();
  mixers.forEach(mixer => mixer.update(dt));
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
