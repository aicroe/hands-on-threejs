import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.Renderer;
let mesh: THREE.Mesh | undefined;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('grey');

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1, 28);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(1, 10, 6);
  scene.add(light);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  const assetPath = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/2666677/';

  const alpha = new THREE.TextureLoader().load(`${assetPath}dots.jpg`);
  const tex = new THREE.TextureLoader().load(`${assetPath}bricks-diffuse3.png`);

  const cubemap = new THREE.CubeTextureLoader()
    .setPath(`${assetPath}skybox1_`)
    .load([
      'px.jpg',
      'nx.jpg',
      'py.jpg',
      'ny.jpg',
      'pz.jpg',
      'nz.jpg'
    ]);

  scene.background = cubemap;

  const material = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    metalness: 0.95,
    roughness: 0.01,
    envMap: cubemap,
  });

  const cylinderGeometry = new THREE.CylinderGeometry(0, 3, 7, 32);
  const cylinder = new THREE.Mesh(cylinderGeometry, material);
  scene.add(cylinder);

  /**
   * TorusGeometry(radius, tube, radialSegments, tubularSegments, arc)
   * - tube - radius of the tube
   * - arc - central angle. Default is Math.PI * 2
   */
  const torusGeometry = new THREE.TorusGeometry(3, 1, 16, 100);
  const torus = new THREE.Mesh(torusGeometry, material);
  torus.position.x = 8;
  scene.add(torus);

  /**
   * TorusKnotGeometry(radius, tube, tubularSegments, radialSegments, p, q)
   * - tube - radius of the tube
   * - p - Times the geometry winds around its axis of rotational symmetry. Default is 2
   * - q - Times the geometry winds around a circle in the interior of the torus. Default is 3
   */
  const torusKnotGeometry = new THREE.TorusKnotGeometry(3, 1, 100, 16, 2, 3);
  const torusKnot = new THREE.Mesh(torusKnotGeometry, material);
  torusKnot.position.x = -8;
  scene.add(torusKnot);

  mesh = torusKnot;

  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  if (mesh !== undefined) {
    mesh.rotation.x += 0.01;
    mesh.rotation.z -= 0.01;
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
