import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { subclip } from './subclip';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;
let mixer: THREE.AnimationMixer;
let actions: THREE.AnimationAction[];

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00aaff);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 2);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 3);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1.5);
  light.position.set(0, 1, 10);
  scene.add(light);

  renderer = new THREE.WebGLRenderer();
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.7, 0);
  controls.update();

  const buttons = document.getElementById('action-buttons')?.getElementsByTagName('button');
  Array.from(buttons ?? []).forEach((button, index) => {
    button.addEventListener('click',
      () => {
        playAction(index);
      }
    );
  });


  // Zombie Commoner Animation List
  //
  // frame: 0030-0059 backpedal (loop)
  // frame: 0090-0129 bite
  // frame: 0164-0193 crawl (loop)
  // frame: 0225-0251 die
  // frame: 0255-0294 get hit frm behind
  // frame: 0300-0344 get hit from front
  // frame: 0350-0384 get hit from left
  // frame: 0390-0424 get hit from right
  // frame: 0489-0548 idle (loop)
  // frame: 0610-0659 jump
  // frame: 0665-0739 roar
  // frame: 0768-0791 run (loop)
  // frame: 0839-0858 shuffle left (loop)
  // frame: 0899-0918 shuffle right (loop)
  // frame: 0940-0979 spawn
  // frame: 1014-1043 strafe left (loop)
  // frame: 1104-1133 strafe right (loop)
  // frame: 1165-1229 swipe
  // frame: 1264-1293 walk

  const anims = [
    { start: 489, end: 548, name: "idle", loop: true },
    { start: 300, end: 344, name: "hit", loop: false, next: 0 },
    { start: 610, end: 659, name: "jump", loop: false, next: 0 },
    { start: 225, end: 251, name: "die", loop: false },
    { start: 665, end: 739, name: 'roar', loop: false, next: 0 },
    { start: 1165, end: 1229, name: 'swipe', loop: false, next: 0 },
    { start: 940, end: 979, name: 'spawn', loop: false, next: 0 },
    { start: 1014, end: 1043, name: 'strafe left', loop: true },
    { start: 839, end: 858, name: 'shuffle', loop: true },
    { start: 1264, end: 1293, name: 'walk', loop: true },
  ];

  const loader = new GLTFLoader();
  loader.setPath('public/');

  loader.load('fred.glb', object => {
    // Little fix because the character is rotated in the export
    object.scene.children[0].rotation.x = 0;

    mixer = new THREE.AnimationMixer(object.scene);
    actions = [];
    const rootAnimation = object.animations[0];

    anims.forEach(({ name, start, end, loop, next }) => {
      const clip = subclip(rootAnimation, name, start, end);
      const action = mixer.clipAction(clip);
      if (!loop) {
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
      }
      actions.push(action);
    });

    mixer.addEventListener('finished', ({ action }) => {
      const actionFinished = action.getClip().name;
      const nextActionIndex = anims.find(({ name }) => name == actionFinished)?.next;
      if (nextActionIndex !== undefined) {
        playAction(nextActionIndex);
      }
    });

    actions[0].play();

    scene.add(object.scene);
    update();
  });

  window.addEventListener('resize', resize, false);

}

function playAction(index: number) {
  mixer.stopAllAction();
  const action = actions[index];
  action.reset().play();
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
