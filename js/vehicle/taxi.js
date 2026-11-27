// السيارة + اللاعب: المجسم، الفيزياء، ونظر الرأس الحر (الكاميرا = رأس السائق)
import * as THREE from 'three';
import { box, mat } from '../core/utils.js';
import { Settings } from '../core/settings.js';
import { Audio } from '../core/audio.js';

export class Taxi {
  constructor(scene, camera) {
    this.input = { gas: 0, brake: 0, steer: 0 };
    this.speed = 0; this.steer = 0; this.heading = 0; this.yaw = 0; this.pitch = 0;
    this.MAX = 32; this.ACC = 12; this.L = 2.6; this.wheels = [];
    const g = this.group = new THREE.Group(); scene.add(g);
    const Y = 0xe8b923, D = 0x1d1d22, G = 0x2a2a30;
    box(g, 1.8, 0.5, 4.4, 0, 0.6, 0, Y);
    box(g, 1.8, 0.1, 4.4, 0, 0.32, 0, D);
    box(g, 1.8, 0.08, 2.1, 0, 1.62, 0.2, Y);
    box(g, 0.5, 0.2, 0.3, 0, 1.76, 0.2, 0xfff3a0);
    [[-0.88, -0.95], [0.88, -0.95], [-0.88, 1.25], [0.88, 1.25]].forEach(([x, z]) => box(g, 0.08, 0.75, 0.1, x, 1.25, z, Y));
    box(g, 1.8, 0.5, 0.9, 0, 1.15, -1.7, Y);
    box(g, 1.8, 0.2, 0.1, 0, 1.4, 1.3, D);
    box(g, 1.6, 0.35, 0.5, 0, 0.95, -1.0, G);
    box(g, 0.55, 0.9, 0.18, -0.45, 1.0, 0.5, G); box(g, 0.55, 0.12, 0.6, -0.45, 0.62, 0.2, G);
    box(g, 1.5, 0.9, 0.18, 0, 1.0, 1.1, G); box(g, 1.5, 0.12, 0.6, 0, 0.62, 0.8, G);
    this.wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 10), mat(0x111111));
    this.wheel.position.set(-0.45, 1.05, -0.7); this.wheel.rotation.x = -0.9; g.add(this.wheel);
    [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]].forEach(([x, z]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 8), mat(0x0c0c0c));
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); this.wheels.push(w);
    });
    [-0.6, 0.6].forEach(x => {
      box(g, 0.25, 0.15, 0.05, x, 0.75, -2.2, 0xffffcc);
      const s = new THREE.SpotLight(0xfff2cc, 1.2, 60, 0.5, 0.5, 1.2);
      s.position.set(x, 0.8, -2.1); s.target.position.set(x, 0, -20); g.add(s, s.target);
    });
    camera.rotation.order = 'YXZ'; camera.position.set(-0.45, 1.28, 0.1); g.add(camera);
    this.camera = camera;
  }
  reset(sp) {
    this.speed = 0; this.steer = 0; this.heading = sp.heading || 0; this.yaw = 0; this.pitch = 0;
    this.group.position.set(sp.x, 0, sp.z); this.group.rotation.y = this.heading;
  }
  look(dx, dy) {
    const k = 0.0024 * Settings.data.sens;
    this.yaw = Math.max(-Math.PI * 0.97, Math.min(Math.PI * 0.97, this.yaw - dx * k));
    this.pitch = Math.max(-1.2, Math.min(1.3, this.pitch - dy * k));
  }
  update(dt, obstacles) {
    const i = this.input;
    if (i.gas > 0) this.speed += this.ACC * dt;
    else if (i.brake > 0) this.speed -= (this.speed > 0.5 ? 26 : 8) * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 4 * dt);
    this.speed = Math.max(-8, Math.min(this.MAX, this.speed));
    if (i.brake > 0 && Math.abs(this.speed) < 0.5) this.speed = 0;
    this.steer += (i.steer * 0.55 - this.steer) * Math.min(1, dt * 6);
    this.heading -= (this.speed / this.L) * Math.tan(this.steer) * dt;
    const g = this.group;
    g.position.x -= Math.sin(this.heading) * this.speed * dt;
    g.position.z -= Math.cos(this.heading) * this.speed * dt;
    g.rotation.y = this.heading;
    for (const o of obstacles) {
      const dx = g.position.x - o.x, dz = g.position.z - o.z, d = Math.hypot(dx, dz), m = o.r + 1.3;
      if (d < m) { g.position.x = o.x + dx / d * m; g.position.z = o.z + dz / d * m; this.speed *= 0.4; }
    }
    this.wheel.rotation.z = -this.steer * 3;
    this.wheels.forEach(w => w.rotation.x += this.speed * dt * 2.5);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    Audio.engine(this.speed);
  }
}
