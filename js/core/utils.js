import * as THREE from 'three';
const cache = {};
export const mat = c => cache[c] || (cache[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
export function box(parent, w, h, d, x, y, z, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z); parent.add(m); return m;
}
