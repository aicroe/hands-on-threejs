import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.Renderer;
let parts: THREE.Mesh[];
let clock: THREE.Clock;

init();

function init() {
  scene = new THREE.Scene();
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

  /**
   * Useful class for getting:
   * - getElapsedTime() - elapsed time since the start of the app
   * - getDelta() - elapsed time since the last time getDelta() was called
   * These methods get in handy for things like animations
   */
  clock = new THREE.Clock();

  const height = 3;
  const boxGeometry = new THREE.BoxGeometry(1, height, 1);
  /**
   * Meshes rotate about the point <0, 0, 0> in their geometry
   * By default, a box is centered in the x, y and z axes
   * So in order to make the box rotate on top of the <0, 0, 0> point,
   * we need to move the vertices up by 1.5
   */
  const position = boxGeometry.attributes.position;
  for (let index = 0; index < position.count; index++) {
    position.setY(index, position.getY(index) + 1.5);
  }
  const material = new THREE.MeshPhongMaterial();
  const boxPrototype = new THREE.Mesh(boxGeometry, material);

  parts = [];
  for (let index = 0; index < 4; index++) {
    const box = boxPrototype.clone();
    if (index === 0) {
      scene.add(box);
    } else {
      box.position.y = height;
      parts[index - 1].add(box);
    }
    parts.push(box);
  }

  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);

  /**
   * The Math.sin function returns a value between -1 and 1
   * - It can be used in order to generate a value that swings smoothly from -1 to 1, back and forth
   * - A full cycle will take a little over 6 seconds
   *
   * We are using this value to update the rotation.z property of the rod parts
   */
  const theta = Math.sin(clock.getElapsedTime());
  parts.forEach((part) => {
    part.rotation.z = theta;
  });
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
