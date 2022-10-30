import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;
let mixer: THREE.AnimationMixer;
let anims: string[];
let actions: THREE.AnimationAction[];

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00aaff);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(-1, 50, 250);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(0, 1, 10);
  scene.add(light);

  renderer = new THREE.WebGLRenderer();
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(1, 70, 0);
  controls.update();

  const buttons = document.getElementById('action-buttons')?.getElementsByTagName('button');
  Array.from(buttons ?? []).forEach((button, index) => {
    button.addEventListener('click', () => {
      playAction(index);
    });
  })

  const assetPath = 'public/'
  const loader = new FBXLoader();
  loader.setPath(assetPath);

  loader.load('Knight-idle.fbx', (object) => {
    mixer = new THREE.AnimationMixer(object);
    actions = [];
    const action = mixer.clipAction(object.animations[0]);
    action.play();
    actions.push(action);
    scene.add(object);

    const texture = new THREE.TextureLoader().setPath(assetPath).load('Knight-orange.png');
    object.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material.map = texture;
      }
    });

    anims = ['look', 'jump', 'die', 'walk', 'run'];

    loadAnimation(loader);
  }, undefined, (error) => {
    console.error('Error loading the asset', error);
  })



  window.addEventListener('resize', resize, false);

}

function playAction(index: number) {
  const action = actions[index];
  actions.forEach(action => {
    if (action.isRunning()) {
      action.fadeOut(0.5);
    }
  });
  action.reset().fadeIn(0.5).play();
}

function loadAnimation(loader: FBXLoader) {
  const anim = anims.shift();

  loader.load(`Knight-anim-${anim}.fbx`, object => {
    const action = mixer.clipAction(object.animations[0]);
    if (anim == 'die') {
      action.loop = THREE.LoopOnce;
      action.clampWhenFinished = true;
    }
    actions.push(action);
    if (anims.length > 0) {
      loadAnimation(loader);
    } else {
      update();
    }
  })
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  const dt = clock.getDelta();
  mixer.update(dt);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
