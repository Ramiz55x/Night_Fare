// مدير المراحل: تحميل، فوز/خسارة، إعادة المرحلة من البداية
import * as THREE from 'three';
import { Taxi } from '../vehicle/taxi.js';

export class Game {
  constructor() {
    this.levels = {}; this.current = null; this.instance = null; this.running = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 400);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.canvas = this.renderer.domElement; document.body.appendChild(this.canvas);
    this.taxi = new Taxi(this.scene, this.camera);
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }
  register(level) { this.levels[level.id] = level; }
  load(id) {
    this.instance?.dispose();
    this.current = this.levels[id];
    this.instance = this.current.build(this.scene, this);
    this.taxi.reset(this.current.spawn);
  }
  restart() { this.load(this.current.id); }
  fail(reason) { console.log('fail:', reason); this.restart(); } // الوحوش تستدعي هذه الدالة
  win() { console.log('win'); }
  start() {
    let last = performance.now();
    const loop = t => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (this.running) { this.taxi.update(dt, this.instance.obstacles); this.instance.update(dt, this); }
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
  }
}
