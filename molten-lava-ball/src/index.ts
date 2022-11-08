import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './shader-noise-chunk';

const vertexShader = `
  #include <noise>

  uniform float uTime;

  varying float vNoise;

  void main() {
    float speed = 0.5;
    // turbulence -- receives a vec3 and returns a float
    vNoise = turbulence(normal + uTime * speed);

    float factor = 10.0;
    // The normal of a sphere is a line extending from the surface outward
    // Imaging a line from the center of the ball to the center, the normal is the continuation of this line
    // By moving the vertex up/down this line, we can achieve a bubbling effect
    vec3 noisedPosition = position + normal * vNoise * factor;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(noisedPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;

  varying float vNoise;

  void main() {
    // Using vNoise to get a pixel from the texture
    // Need a vec2 value to do it, this vector is usually called "uv"
    // u - is 0.0, this is due to the nature of the texture, each pixel on the u axis of the texture is actually the same
    // v - is a value that varies smoothly from 0.0 to 1.0

    float factor = 1.5; // Value got from experimentation
    // fract -- returns the fractional part of "x". This is calculated as "x - floor(x)".
    float noiseFractionalPart = fract(-vNoise * factor);

    vec2 uv = vec2(0.0, abs(noiseFractionalPart));

    // texture2D(sampler2D sampler, vec2 coord): vec4 -- retrieves texels from a texture
    // returns a texel (i.e) the color value of the texture at the given coordinates
    // with coordinate components in the range 0.0 to 1.0, proportionally scaled under the texture dimensions
    vec4 texel = texture2D(uTexture, uv);

    vec3 color = texel.rgb;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
);
camera.position.z = 100;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const geometry = new THREE.IcosahedronGeometry(20, 12);
const uniforms = {
  uTime: { value: 0.0 },
  uTexture: { value: new THREE.TextureLoader().load('public/explosion.png') }
}

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  wireframe: false,
});

const ball = new THREE.Mesh(geometry, material);
scene.add(ball);

const controls = new OrbitControls(camera, renderer.domElement);

onWindowResize();
window.addEventListener('resize', onWindowResize, false);
update();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function update() {
  requestAnimationFrame(update);
  uniforms.uTime.value += clock.getDelta();
  renderer.render(scene, camera);
}
