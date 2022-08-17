import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.Renderer;
let capsule: THREE.Group;

init();

function init() {
  const assetPath = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/2666677/';

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 8);

  const envMap = new THREE
    .CubeTextureLoader()
    .setPath(`${assetPath}skybox2_`)
    .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
  scene.background = envMap;

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 3);
  light.position.set(0, 2, 1);
  scene.add(light);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);

  capsule = new THREE.Group();
  const radius = 2;
  const cylinderHeight = 5;

  /**
   * SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
   * - phiStart - horizontal starting angle (Y axis). Default is 0
   * - phiLength - horizontal sweep angle size. Default is Math.PI * 2
   * - thetaStart - vertical (Z axis) starting angle. Default is 0
   * - thetaLength - vertical sweep angle size. Default is Math.PI
   */
  const sphereGeometry = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const material = new THREE.MeshLambertMaterial({
    wireframe: false,
    envMap, // By using the same background envMap on the material we are able to create a reflective object
  });
  const topSphere = new THREE.Mesh(sphereGeometry, material);
  const bottomSphere = topSphere.clone();
  topSphere.position.y = cylinderHeight / 2;
  bottomSphere.position.y = -(cylinderHeight / 2);
  bottomSphere.rotation.x = Math.PI;
  capsule.add(topSphere, bottomSphere);

  /**
   * CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
   * - openEnded - Indicates whether the ends of the cylinder are open or capped. Default is false
   * - thetaStart - Start angle for the first segment, default is 0 (three o'clock position)
   * - thetaLength - Then central angle of the circular sector. Default is Math.PI * 2 (which makes a complete cylinder)
   */
  const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, cylinderHeight, 32, 1, true);
  const cylinder = new THREE.Mesh(cylinderGeometry, material);
  capsule.add(cylinder);

  scene.add(capsule);

  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  capsule.rotation.z += 0.01;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
