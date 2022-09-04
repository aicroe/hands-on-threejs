import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

type LightParam = {
  enable: boolean,
  color: number,
  distance?: number,
  helper: boolean,
  moving: boolean,
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.Renderer;
let clock: THREE.Clock;
let params: { directional: LightParam, point: LightParam };
let lights: {
  directional: THREE.DirectionalLight,
  directionalHelper: THREE.DirectionalLightHelper,
  point: THREE.PointLight,
  pointHelper: THREE.PointLightHelper,
};

init();

function init() {
  const assetPath = "https://s3-us-west-2.amazonaws.com/s.cdpn.io/2666677/";

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  const envMap = new THREE.CubeTextureLoader()
    .setPath(`${assetPath}skybox3_`)
    .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
  scene.background = envMap;

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1, 15); // wide position
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);

  const geometry = new THREE.SphereGeometry(1, 20, 15);
  const material = new THREE.MeshStandardMaterial();
  const sphere = new THREE.Mesh(geometry, material);

  let ball: THREE.Mesh;

  for (let x = -3; x <= 3; x += 2) {
    for (let y = -3; y <= 3; y += 2) {
      for (let z = -3; z <= 3; z += 2) {
        ball = sphere.clone();
        ball.position.set(x, y, z);
        scene.add(ball);
      }
    }
  }

  const ambient = new THREE.HemisphereLight(0xffffff, 0xaaaa66, 0.35);
  scene.add(ambient);

  // Add lights here
  lights = {} as typeof lights;

  lights.directional = new THREE.DirectionalLight();
  lights.directional.visible = false;
  lights.directional.position.set(1, 5, 1);
  lights.directional.target = ball!; // Notice the target is an object3d (not the object's position)
  lights.directionalHelper = new THREE.DirectionalLightHelper(lights.directional);
  lights.directionalHelper.visible = false;
  scene.add(lights.directionalHelper);
  scene.add(lights.directional);

  lights.point = new THREE.PointLight(0xffff00, 1);
  lights.point.visible = false;
  lights.point.position.set(-2, 2, 2);
  lights.pointHelper = new THREE.PointLightHelper(lights.point);
  lights.pointHelper.visible = false;
  scene.add(lights.pointHelper);
  scene.add(lights.point);

  params = {
    directional: {
      enable: false,
      color: 0xffffff,
      helper: false,
      moving: false
    },
    point: {
      enable: false,
      color: 0xffff00,
      distance: 0,
      helper: false,
      moving: false
    }
  }

  const gui = new dat.GUI();
  const directional = gui.addFolder('Directional');
  directional.open();
  directional.add(params.directional, 'enable').onChange(value => { lights.directional.visible = value });
  directional.addColor(params.directional, 'color').onChange(value => lights.directional.color = new THREE.Color(value));
  directional.add(params.directional, 'helper').onChange(value => lights.directionalHelper.visible = value);
  directional.add(params.directional, 'moving');

  const point = gui.addFolder('Point');
  point.open();
  point.add(params.point, 'enable').onChange(value => { lights.point.visible = value });
  point.addColor(params.point, 'color').onChange(value => lights.point.color = new THREE.Color(value));
  point.add(params.point, 'distance').min(0).max(10).onChange(value => lights.point.distance = value);
  point.add(params.point, 'helper').onChange(value => lights.pointHelper.visible = value);
  point.add(params.point, 'moving');

  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  /**
   * Math.sin return in the range [-1..1]
   * - Math.sin(0)                => 0
   * - Math.sin(Math.PI / 2)      => 1
   * - Math.sin(Math.PI)          => 0
   * - Math.sin(3 * Math.PI / 2)  => -1
   * - Math.sin(2 * Math.PI)      => 0
   * ...Then the cycle repeats
   */
  const delta = Math.sin(clock.getElapsedTime()) * 5;
  if (params.point.moving) lights.point.position.z = delta;
  if (params.directional.moving) {
    lights.directional.position.x = delta;
    lights.directionalHelper.update();
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
