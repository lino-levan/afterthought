import * as THREE from "three";

export const UP_AXIS = new THREE.Vector3(0, 1, 0)

export function mod(n, m) {
  return ((n % m) + m) % m;
}