import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * GLSL Vertex Shader
 * - position: The local position (vec3)
 * - modelViewMatrix: Moves the vertex to the view position
 * - projectionMatrix: Moves the vertex from the view position to clip coordinates
 * ^ position, modelViewMatrix and projectionMatrix are provided and passed to the shader by THREE.js
 *
 * Output variable is gl_Position (vertex position), and must be set.
 */
const vertexShader = `
  uniform float time;
  uniform float radius;

  void main() {
    // The sin function returns values between -1 and 1
    // by adding 1 it now ranges between 0 and 2
    float delta = (sin(time) + 1.0) / 2.0;

    // normalize -- returns a vector with the same direction as its parameter, but with length 1.
    // The length of a vector is the square-root of the sum of the power 2 of its components.
    vec3 normalized = normalize(position) * radius;

    // mix -- linearly interpolate between "x" and "y" using "a" to weight between them.
    // The return value is computed as "x . (1 - a) + y . a".
    vec3 mixedPosition = mix(position, normalized, delta);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(mixedPosition, 1.0);
  }
`;

/**
 * GLSL Fragment Shader.
 * Executed for each pixel in the render that needs to display a color.
 *
 * Output variable is `gl_FragColor` (pixel color).
 */
const fragmentShader = `
  void main() {
    vec3 color = vec3(0.0, 0.0, 1.0);
    gl_FragColor = vec4(color, 0.5);
  }
`;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.z = 100;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const geometry = new THREE.BoxGeometry(30, 30, 30, 10, 10, 10);

// Each entry in the uniforms object is another object with a single property `value`.
// The entry names in the uniforms object is the name used in the shaders to access them.
// The data-type the uniforms are defined with in the shaders mush match with the provided value here.
const uniforms = {
  time: { value:  0.0 },
  radius: { value: 20.0 },
};

const material = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  wireframe: true,
  transparent: true,
});

const box = new THREE.Mesh(geometry, material);
scene.add(box);

const controls = new OrbitControls(camera, renderer.domElement);

update();
onWindowResize();
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function update() {
  requestAnimationFrame(update);
  renderer.render(scene, camera);
  if (uniforms.time !== undefined) {
    uniforms.time.value += clock.getDelta();
  }
}
