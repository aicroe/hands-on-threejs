import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.Renderer;

init();

function init() {
  const assetPath = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/2666677/';
  const envMap = new THREE.CubeTextureLoader()
    .setPath(`${assetPath}skybox3_`)
    .load(['px.jpg', 'nx.jpg',
      'py.jpg', 'ny.jpg',
      'pz.jpg', 'nz.jpg']);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 50);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.2);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(5, 5, 6);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  const points = [];
  /**
   * Create a set of 10 points where:
   * - x are a section of a `sin` wave
   * - y ranges from -10 to 10
   */
  for (let index = 0; index < 10; index++) {
    const vector = new THREE.Vector2(
      // The expression (index * 0.2) ranges between [0 - 1.8], so the `sin` of that value is never negative
      Math.sin(index * 0.2) * 10 + 5,
      (index - 5) * 2,
    );
    points.push(vector);
  }
  // For LatheGeometry, the x value of the points need to be positive an non 0
  const vaseGeometry = new THREE.LatheBufferGeometry(points);
  const vaseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const vase = new THREE.Mesh(vaseGeometry, vaseMaterial);
  vase.position.y = 10;
  scene.add(vase);

  const options = { teeth: 16, depth: 2, radius: 8 };
  const shape = new THREE.Shape(); // 2D Shape

  const toothAngle = (Math.PI * 2) / options.teeth; // Total angle divided by the total number of teeths
  const outerRadius = options.radius;
  const innerRadius = options.radius - options.depth;

  // Move to tooth path starting point
  shape.moveTo(innerRadius, 0);
  /**
   * Creating an Individual Tooth
   * 1. Get the center angle
   * 2. Create a line from the current position to just around the inner radius from this point
   * 3. Create a line from the current position to just around the outer radius from this point (Edge from the inner radius to the outer one)
   * 4. Create a line from the current position to just around the outer radius from this point
   * 4. Create a line from the current position to just around the inner radius from this point (Edge from the outer radius to the inner one)
   */

  for (let index = 0; index < options.teeth; index++) {
    // Step 1
    const centerAngle = toothAngle * (index + 0.5); // Setting the angle half-way to the next tooth

    // Step 2
    let gap = 0.05;
    let theta = centerAngle - (toothAngle / 2) + gap;
    let xCoordinate = Math.cos(theta) * innerRadius;
    let yCoordinate = Math.sin(theta) * innerRadius;
    shape.lineTo(xCoordinate, yCoordinate); // Draw gap

    // Step 3
    gap = 0.15;
    theta = centerAngle - (toothAngle / 2) + gap;
    xCoordinate = Math.cos(theta) * outerRadius;
    yCoordinate = Math.sin(theta) * outerRadius;
    shape.lineTo(xCoordinate, yCoordinate); // Draw edge from inner radius to outer radius

    // Step 4
    gap = 0.15;
    theta = centerAngle + (toothAngle / 2) - gap;
    xCoordinate = Math.cos(theta) * outerRadius;
    yCoordinate = Math.sin(theta) * outerRadius;
    shape.lineTo(xCoordinate, yCoordinate); // Draw gap. Complete drawing tooth

    // Step 5
    gap = 0.05;
    theta = centerAngle + (toothAngle / 2) - gap;
    xCoordinate = Math.cos(theta) * innerRadius;
    yCoordinate = Math.sin(theta) * innerRadius;
    shape.lineTo(xCoordinate, yCoordinate); // Draw edge from outer radius to inner radius
  }

  const cogGeometrySettings = {
    steps: 1, // Set of triangles along the extrusion length
    depth: 3, // How far the shape is extruded down the z axis
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.3,
    bevelOffset: 0,
    bevelSegments: 1,
  };
  const cogGeometry = new THREE.ExtrudeBufferGeometry(shape, cogGeometrySettings);
  const cogMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    envMap,
    roughness: 0.2,
    metalness: 0.8,
  });
  const cog = new THREE.Mesh(cogGeometry, cogMaterial);
  cog.position.y = -10;
  scene.add(cog);


  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
