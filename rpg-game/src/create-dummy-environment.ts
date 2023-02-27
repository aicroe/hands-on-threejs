import * as THREE from 'three';

export function createDummyEnvironment(): THREE.Group {
  const env = new THREE.Group();
  env.name = "Environment";

  const geometry = new THREE.BoxGeometry(150, 150, 150);
  const material = new THREE.MeshBasicMaterial({ color: 0xff9d5c });

  for (let x = -1000; x < 1000; x += 300) {
    for (let z = -1000; z < 1000; z += 300) {
      const block = new THREE.Mesh(geometry, material);
      block.position.set(x, 75, z);
      env.add(block);
    }
  }

  return env;
}
