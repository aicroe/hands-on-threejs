import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let object: THREE.Object3D
let light: THREE.DirectionalLight;
let composer: EffectComposer;

init();

function init() {

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 400;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 1, 1000);

  object = new THREE.Object3D();
  scene.add(object);

  var geometry = new THREE.SphereBufferGeometry(1, 4, 4);

  for (var i = 0; i < 100; i++) {
    var material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random(), flatShading: true });

    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    mesh.position.multiplyScalar(Math.random() * 400);
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 50;
    object.add(mesh);
  }

  scene.add(new THREE.AmbientLight(0x222222));

  light = new THREE.DirectionalLight(0xffffff);
  light.position.set(1, 1, 1);
  scene.add(light);

  // Post-Processing
  composer = new EffectComposer(renderer);

  /**
   * We could have several passes that built up the final image
   * On previous versions it was mandatory to set `renderToScreen = true;`
   * in the last Pass added to the composer
   */
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  /**
   * GlitchPass(amount)
   * - Gives the appearance of a glitch in transmission
   * - Control the effect using the amount value as the first parameter
   */
  // const glitchPass = new GlitchPass();
  // composer.addPass(glitchPass);

  /**
   * FilmPass(noiseIntensity, scanlinesIntensity, scanlinesCount, grayscale)
  */
  const filmPass = new FilmPass(1, 0.5, 512, 1); // Moon transmission effect
  composer.addPass(filmPass);

  /**
   * DotScreenPass(center, angle, scale)
  */
  //  const dotScreenPass = new DotScreenPass();
  //  composer.addPass(dotScreenPass);

  update();

  window.addEventListener('resize', onWindowResize, false);
  onWindowResize();

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

}

function update() {

  requestAnimationFrame(update);

  object.rotation.x += 0.005;
  object.rotation.y += 0.01;

  // renderer.render(scene, camera);
  composer.render();
}
