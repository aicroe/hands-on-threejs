import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';

type SpotLightParams = {
  enable: boolean,
  color: number,
  distance: number,
  angle: number,
  penumbra: number,
  helper: boolean,
  moving: boolean,
}

type AreaLightParams = {
  enable: boolean,
  color: number,
  width: number,
  height: number,
  helper: boolean,
  moving: boolean,
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.Renderer;
let clock: THREE.Clock;
let lights: {
  spot: THREE.SpotLight,
  spotHelper: THREE.SpotLightHelper,
  area: THREE.RectAreaLight,
  areaHelper: RectAreaLightHelper,
  areaParent: THREE.Object3D,
};
let params: { spot: SpotLightParams, area: AreaLightParams };

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
  camera.position.set(0, 1, 15);//wide position
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);

  const geometry = new THREE.SphereGeometry(1, 20, 15);
  const material = new THREE.MeshStandardMaterial({ envMap: envMap });
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

  lights = {} as typeof lights;

  /**
   * SpotLight(color, intensity, distance, angle, penumbra, decay)
   * This light gets emitted from a single point in one direction, along a cone that increases in size the further from the light it gets.
   * Note: Besides it's versatility it's not very computational expensive
   * - angle - Maximum angle of light dispersion from its direction, maximum is Math.PI / 2
   * - penumbra - Softness of the spot edge. Percept of the spotlight cone that is attenuated due to penumbra. [0..1]
   * - decay - The amount the light dims along the distance
   */
  lights.spot = new THREE.SpotLight();
  lights.spot.visible = false;
  lights.spot.position.set(1, 10, 1);
  lights.spotHelper = new THREE.SpotLightHelper(lights.spot);
  lights.spotHelper.visible = false;
  scene.add(lights.spotHelper);
  scene.add(lights.spot);

  /**
   * Important Notes:
   * - There is no shadow support.
   * - Only MeshStandardMaterial and MeshPhysicalMaterial are supported.
   * - You have to include RectAreaLightUniformsLib into your scene and call init().
   */
  RectAreaLightUniformsLib.init();
  lights.areaParent = new THREE.Object3D();
  lights.area = new THREE.RectAreaLight(); // Rectangular area light, takes width and height as parameters (default 10)
  lights.area.visible = false;
  lights.area.position.set(0, 8, 0);
  lights.area.lookAt(0, 0, 0);
  lights.areaHelper = new RectAreaLightHelper(lights.area);
  lights.areaHelper.visible = false;
  lights.area.add(lights.areaHelper); // Notice the RectAreaLightHelper is added to the light not the scene
  scene.add(lights.areaParent);
  lights.areaParent.add(lights.area);

  params = {
    spot: {
      enable: false,
      color: 0xffffff,
      distance: 0,
      angle: Math.PI / 2,
      penumbra: 0,
      helper: false,
      moving: false
    },
    area: {
      enable: false,
      color: 0xffffff,
      width: 10,
      height: 10,
      helper: false,
      moving: false
    }
  }

  const gui = new dat.GUI();
  const spot = gui.addFolder('Spot');
  spot.open();
  spot.add(params.spot, 'enable').onChange(value => { lights.spot.visible = value });
  spot.addColor(params.spot, 'color').onChange(value => lights.spot.color = new THREE.Color(value));
  spot.add(params.spot, 'distance').min(0).max(20).onChange(value => lights.spot.distance = value);
  spot.add(params.spot, 'angle').min(0.1).max(6.28).onChange(value => lights.spot.angle = value);
  spot.add(params.spot, 'penumbra').min(0).max(1).onChange(value => lights.spot.penumbra = value);
  spot.add(params.spot, 'helper').onChange(value => lights.spotHelper.visible = value);
  spot.add(params.spot, 'moving');

  const area = gui.addFolder('RectArea');
  area.add(params.area, 'enable').onChange(value => { lights.area.visible = value });
  area.addColor(params.area, 'color').onChange(value => lights.area.color = new THREE.Color(value));
  area.add(params.area, 'width').min(1).max(15).onChange(value => {
    lights.area.width = value;
    lights.areaHelper.updateMatrixWorld();
  });
  area.add(params.area, 'height').min(1).max(15).onChange(value => {
    lights.area.height = value;
    lights.areaHelper.updateMatrixWorld();
  });
  area.add(params.area, 'helper').onChange(value => lights.areaHelper.visible = value);
  area.add(params.area, 'moving');

  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  const time = clock.getElapsedTime();
  const delta = Math.sin(time) * 5;
  if (params.area.moving) {
    lights.areaParent.rotation.z = time;
    lights.areaHelper.updateMatrixWorld();
  }
  if (params.spot.moving) {
    lights.spot.position.x = delta;
    lights.spotHelper.update();
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
