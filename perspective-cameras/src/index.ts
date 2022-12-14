import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene: THREE.Scene;
let renderer: THREE.Renderer;
let camera: THREE.PerspectiveCamera;
let cameras: THREE.PerspectiveCamera[];
let helper: THREE.CameraHelper;

init();

function init() {
  scene = new THREE.Scene();

  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;
  cameras = [];

  for (let x = 0; x < 2; x++) {
    /**
     * PerspectiveCamera(fov, aspect, near, far)
     * - fov - Field of view in degrees. high fov => wide-angle lens. low fov => telephoto lens
     * - aspect - Aspect ratio of the rendered view, i.e. width/height
     * - near - Near plane, anything closer than this will be hidden
     * - far - Far plane, anything further away than this will be hidden
     *
     * Tip: Try to always set near to the maximum (first object edge) and the far value
     *  to the minimum (last object edge) for the current scene
     */
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 150);
    if (x == 0) {
      camera.position.set(0, 0, 15);
      /**
       * A CameraHelper shows the frustum of the camera. Useful for configuring the parameters
       * - Viewing Frustum. It's the field of view of a perspective camera
       * - Viewing frustum. It's the region of space in the modeled world that may appear on the screen
       */
      helper = new THREE.CameraHelper(camera);
      scene.add(helper);
      helper.visible = false;
    } else {
      camera.position.set(-48, 0, 8);
      camera.lookAt(-25, 0, -25);
    }

    cameras.push(camera);
  }

  camera = cameras[0];

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(1, 10, 6);
  scene.add(light);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls0 = new OrbitControls(cameras[0], renderer.domElement);

  const controls1 = new OrbitControls(cameras[1], renderer.domElement);
  controls1.target.set(0, 0, 5);
  controls1.update();
  controls1.enabled = false;

  const gui = new dat.GUI();
  const params = {
    camera: 'main camera',
    fov: 75,
    near: 0.1,
    far: 100
  }
  gui.add(params, 'camera', ['main camera', 'helper view'])
    .onChange(value => {
      if (value === 'main camera') {
        camera = cameras[0];
        controls0.enabled = true;
        controls1.enabled = false;
        helper.visible = false;
        controls0.update();
      } else {
        camera = cameras[1];
        controls0.enabled = false;
        controls1.enabled = true;
        helper.visible = true;
        controls1.update();
      }
    });
  gui.add(params, 'fov')
    .min(20)
    .max(80)
    .step(1)
    .onChange(value => {
      cameras[0].fov = value;
      cameras[0].updateProjectionMatrix();
      helper.update();
    });
  gui.add(params, 'near')
    .min(0.1)
    .max(20)
    .step(0.1)
    .onChange(value => {
      cameras[0].near = value;
      cameras[0].updateProjectionMatrix();
      helper.update();
    });
  gui.add(params, 'far')
    .min(5)
    .max(100)
    .step(1)
    .onChange(value => {
      cameras[0].far = value;
      cameras[0].updateProjectionMatrix();
      helper.update();
    });
  //Add meshes here
  const geometry = new THREE.BoxBufferGeometry();
  const material = new THREE.MeshPhongMaterial();
  const block = new THREE.Mesh(geometry, material);

  for (let x = -5; x < 5; x += 1.5) {
    for (let y = -5; y < 5; y += 1.5) {
      for (let z = -5; z < 5; z += 1.5) {
        const mesh = block.clone();
        mesh.position.set(x, y, z);
        scene.add(mesh);
      }
    }
  }

  window.addEventListener('resize', resize, false);

  update();
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  cameras.forEach(subcamera => subcamera.rotation.copy(camera.rotation));
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
