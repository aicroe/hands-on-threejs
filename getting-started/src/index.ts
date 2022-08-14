import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

function setup(width: number, height: number) {
  const scene = new Scene();
  scene.background = new Color(0xaaaaaa);

  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ color: new Color('skyblue') });

  const box1 = new Mesh(geometry, material);
  scene.add(box1);

  const box2 = new Mesh(geometry, material);
  box2.position.x = -1.5;
  scene.add(box2);

  const box3 = new Mesh(geometry, material);
  box3.position.x = 1.5;
  scene.add(box3);

  const light = new DirectionalLight();
  light.position.set(0, 1, 2);
  scene.add(light);

  const aspectRatio = width / height;
  const camera = new PerspectiveCamera(75, aspectRatio, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new WebGLRenderer();
  renderer.setSize(width, height);

  return { scene, camera, renderer, box1, box2, box3 };
}

const { scene, camera, renderer, box1, box2, box3 } = setup(window.innerWidth, window.innerHeight);

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}, false);

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  box1.rotation.y += 0.01;
  box2.rotation.y -= 0.01;
  box3.rotation.y -= 0.01;
}

document.body.appendChild(renderer.domElement);

animate();
