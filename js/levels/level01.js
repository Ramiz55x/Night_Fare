// المرحلة 1: اختبار القيادة والنظر (بدون وحش).
// عقد المرحلة: { id, name, spawn, build(scene, game) -> { obstacles, update(dt, game), dispose() } }
// الوحش الجديد: ضع منطقه في update واستدعِ game.fail('سبب') عند مخالفة القانون.
import * as THREE from 'three';
import { box, mat } from '../core/utils.js';

export default {
  id: 'level01', name: 'اختبار القيادة',
  spawn: { x: 0, z: 0, heading: 0 },
  build(scene) {
    const root = new THREE.Group(); scene.add(root);
    const obstacles = [];
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.Fog(0x070b14, 15, 140);
    root.add(new THREE.HemisphereLight(0x6677aa, 0x151520, 0.7));
    const moon = new THREE.DirectionalLight(0x8899cc, 0.35); moon.position.set(-40, 80, 30); root.add(moon);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), mat(0x1a2418));
    ground.rotation.x = -Math.PI / 2; root.add(ground);
    box(root, 12, 0.05, 6000, 0, 0.03, 0, 0x2b2b30);
    box(root, 6000, 0.05, 12, 0, 0.04, 0, 0x2b2b30);
    const n = 300, dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.02, 3), new THREE.MeshBasicMaterial({ color: 0xcfcf9a }), n * 2);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    for (let k = 0; k < n; k++) {
      m.compose(new THREE.Vector3(0, 0.07, (k - n / 2) * 10), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); dash.setMatrixAt(k, m);
      m.compose(new THREE.Vector3((k - n / 2) * 10, 0.07, 0), q, new THREE.Vector3(1, 1, 1)); dash.setMatrixAt(n + k, m);
    }
    root.add(dash);
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 160; k++) {
      const x = (rnd() - 0.5) * 900, z = (rnd() - 0.5) * 900;
      if (Math.abs(x) < 14 || Math.abs(z) < 14) continue;
      if (rnd() < 0.6) {
        const w = 6 + rnd() * 10, h = 5 + rnd() * 18, d = 6 + rnd() * 10;
        box(root, w, h, d, x, h / 2, z, [0x3a3a46, 0x4a4036, 0x33403f][k % 3]);
        obstacles.push({ x, z, r: Math.max(w, d) * 0.55 });
      } else {
        box(root, 0.5, 3, 0.5, x, 1.5, z, 0x3b2a1a); box(root, 2.6, 3, 2.6, x, 4.2, z, 0x1f3a24);
        obstacles.push({ x, z, r: 0.8 });
      }
    }
    return { obstacles, update() {}, dispose() { scene.remove(root); scene.fog = null; } };
  }
};
