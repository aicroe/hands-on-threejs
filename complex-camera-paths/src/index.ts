import * as THREE from 'three';
import { GrannyKnot } from 'three/examples/jsm/curves/CurveExtras';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.Renderer;
let clock: THREE.Clock;
let tube: THREE.Mesh;

init();

function init() {
  const assetPath = "https://s3-us-west-2.amazonaws.com/s.cdpn.io/2666677/";

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  const envMap = new THREE.CubeTextureLoader()
    .setPath(`${assetPath}skybox1_`)
    .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
  scene.background = envMap;

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 80); // wide position
  camera.lookAt(0, 1.5, 0);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(1, 10, 6);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const tubePath = new GrannyKnot();
  /**
   * TubeGeometry(path, tubularSegments, radius, radialSegments, closed)
   * - path: Curve - A 3D path that inherits from the Curve base class. Default is QuadraticBezierCurve
   * - tubularSegments - The number of segments that make up the tube. Default is 64
   * - radius - The tube radius. Default is 1
   * - radialSegments - The number of segments that make up the cross-section. Default is 8
   * - closed - Whether the tube is open or closed. Default false
   */
  const tubeGeometry = new THREE.TubeBufferGeometry(tubePath, 100, 2, 8, true);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    wireframe: true,
  });
  tube = new THREE.Mesh(tubeGeometry, material);

  scene.add(tube);


  window.addEventListener('resize', resize, false);

  update();
}

function updateCamera() {
  const time = clock.getElapsedTime();
  const looptime = 20;
  /**
   * `t1` is a value between [0, 1]
   * - 0 if it's the start of the tube
   * - 1 if it's the end of the tube
   * since the tube is closed, the positions start/end are the same
   */
  const t1 = (time % looptime) / looptime;
  /**
   * We need a value a little bit further along `t1`
   * `t2` is a tenth of a second later than `t1`
   */
  const t2 = ((time + 0.1) % looptime) / looptime;
  const tubeGeometry = (tube.geometry as THREE.TubeBufferGeometry);
  /**
   * Curve.getPointAt(t)
   * - Returns a vector for a point at relative position in the curve according to arc length
   * - t - A position on the curve. Must be in the range [0, 1]
   */
  const pos1 = tubeGeometry.parameters.path.getPointAt(t1);
  const pos2 = tubeGeometry.parameters.path.getPointAt(t2);

  camera.position.copy(pos1);
  camera.lookAt(pos2);
}

function update() {
  requestAnimationFrame(update);
  updateCamera();
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
