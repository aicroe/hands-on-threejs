import * as THREE from 'three';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let cameras: THREE.Object3D[];
let cameraIndex: number;
let renderer: THREE.Renderer;
let clock: THREE.Clock;
let player: THREE.Group;

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  let col = 0x605050;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(col);
  /**
   * Fog(color, near, far)
   * - color - Hexadecimal number or string color
   * - near - Near in world units, if closer to the camera than this value, no fog
   * - far - Far in world units, if further away from the camera, solid fog
   */
  scene.fog = new THREE.Fog(col, 10, 100);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 7);
  camera.lookAt(0, 1.5, 0);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(1, 10, 6);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  /**
   * PlaneGeometry(width, height)
   * - The geometry is created in the xy plane
   */
  const planeGeometry = new THREE.PlaneGeometry(200, 200);
  const planeMaterial = new THREE.MeshStandardMaterial();
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  /**
   * GridHelper(size, numberOfDivisions)
   */
  const grid = new THREE.GridHelper(200, 80);
  scene.add(grid);

  player = new THREE.Group();
  scene.add(player);

  const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
  const bodyGeometry = new THREE.CylinderBufferGeometry(0.5, 0.3, 1.6, 20);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.position.y = 0.8;
  body.scale.z = 0.5;

  const headGeometry = new THREE.SphereBufferGeometry(0.3);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.y = 2;

  player.add(body);
  player.add(head);

  addKeyboardControl();

  cameras = [];
  cameraIndex = 0;
  const followCam = new THREE.Object3D();
  followCam.position.copy(camera.position);

  const frontCam = new THREE.Object3D();
  frontCam.position.set(0, 3, -8);

  const overheadCam = new THREE.Object3D();
  overheadCam.position.set(0, 20, 8);

  /**
   * When an object is child of another object
   * - The child moves along with the parent
   * - The child rotates along with the parent
   */
  player.add(followCam);
  cameras.push(followCam);
  player.add(frontCam);
  cameras.push(frontCam);
  cameras.push(overheadCam);


  const btn = document.createElement('button')!;
  btn.style.cssText = `
    position: absolute;
    cursor: pointer;
    right: 20px;
    bottom: 20px;
    background: transparent;
    font-size: 30px;
    border-radius: 50%;
  `
  btn.innerHTML = '📸';
  btn.addEventListener('click', changeCamera);
  document.body.appendChild(btn);

  window.addEventListener('resize', resize, false);

  update();
}

function changeCamera() {
  cameraIndex++;
  if (cameraIndex >= cameras.length) cameraIndex = 0;
}

function addKeyboardControl() {
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
}

function keyDown(evt: KeyboardEvent) {
  let forward = (player.userData !== undefined && player.userData.move !== undefined) ? player.userData.move.forward : 0;
  let turn = (player.userData != undefined && player.userData.move !== undefined) ? player.userData.move.turn : 0;

  switch (evt.keyCode) {
    case 87://W
      forward = -1;
      break;
    case 83://S
      forward = 1;
      break;
    case 65://A
      turn = 1;
      break;
    case 68://D
      turn = -1;
      break;
  }

  playerControl(forward, turn);
}

function keyUp(evt: KeyboardEvent) {
  let forward = (player.userData !== undefined && player.userData.move !== undefined) ? player.userData.move.forward : 0;
  let turn = (player.userData !== undefined && player.userData.move !== undefined) ? player.userData.move.turn : 0;

  switch (evt.keyCode) {
    case 87://W
      forward = 0;
      break;
    case 83://S
      forward = 0;
      break;
    case 65://A
      turn = 0;
      break;
    case 68://D
      turn = 0;
      break;
  }

  playerControl(forward, turn);
}

function playerControl(forward: number, turn: number) {
  if (forward == 0 && turn == 0) {
    delete player.userData.move;
  } else {
    if (player.userData === undefined) player.userData = {};
    player.userData.move = { forward, turn };
  }
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);

  const dt = clock.getDelta();

  if (player.userData !== undefined && player.userData.move !== undefined) {
    player.translateZ(player.userData.move.forward * dt * 5);
    player.rotateY(player.userData.move.turn * dt);
  }

  /**
   * lerp(v: Vector3, alpha: number)
   * Linearly interpolates between this vector and `v`, where alpha is the distance
   * along the line: alpha == 0 => will be this vector, alpha == 1 will be `v`
   * - v - vector to interpolate towards
   * - alpha - float interpolation factor [0-1]
   */
  camera.position.lerp(
    cameras[cameraIndex].getWorldPosition(new THREE.Vector3()),
    0.05,
  );

  const pos = player.position.clone();
  pos.y += 3; // In order to point the camera to the player head instead of their feet
  camera.lookAt(pos);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
