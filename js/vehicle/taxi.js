// السيارة + اللاعب: تاكسي واقعي، سائق بيدين وقدمين (IK)، دواسات، مرايات حقيقية، عدادات، أبواب وزجاج
// الكاميرا = رأس السائق. محاور السيارة: الأمام = -Z ، اليمين = +X ، السائق على اليسار (x = -0.45)
import * as THREE from 'three';
import { Settings } from '../core/settings.js';
import { Audio } from '../core/audio.js';

const PI = Math.PI;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);
const _c = V3(), _e1 = V3(), _e2 = V3(), _w = V3(), _s = V3(), _el = V3(), _p = V3(), _d = V3();
const WHEEL_K = 4.5; // دوران الستيرنغ لكل راديان توجيه

/* ---------------------------------------------------------------- مواد */
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...o });
const M = {
  paint: new THREE.MeshPhysicalMaterial({ color: 0xf6b800, roughness: 0.3, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
  black: std(0x101012, { roughness: 0.6 }),
  rubber: std(0x141414, { roughness: 0.95 }),
  chrome: std(0xe2e4e8, { roughness: 0.22, metalness: 0.85 }),
  dash: std(0x1b1b1e, { roughness: 0.85 }),
  trim: std(0x34343a, { roughness: 0.9 }),
  carpet: std(0x242428, { roughness: 1 }),
  liner: std(0xcfc7b4, { roughness: 1 }),
  seat: std(0x55524c, { roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xaecbd6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  tint: new THREE.MeshBasicMaterial({ color: 0x0a1a33, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  skin: std(0xd2996f, { roughness: 0.65 }),
  shirt: std(0xdfe6ee, { roughness: 0.95 }),
  pants: std(0x23262e, { roughness: 0.95 }),
  shoe: std(0x0d0d0e, { roughness: 0.5 }),
  wheel: std(0x121214, { roughness: 0.55 }),
  headlight: new THREE.MeshStandardMaterial({ color: 0xfffbe8, emissive: 0xfff0b8, emissiveIntensity: 0.9, roughness: 0.2 }),
  tail: new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.4, roughness: 0.3 }),
  rev: new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.3 }),
  lcd: new THREE.MeshBasicMaterial({ color: 0xffa640 }),
  dome: new THREE.MeshBasicMaterial({ color: 0xfff6dd }),
};

/* ---------------------------------------------------------------- أدوات هندسية */
// صندوق بحواف مستديرة: العرض x ، الارتفاع y ، العمق z
function rbox(w, h, d, r, mat) {
  const b = Math.min(0.012, d / 3), W = w - 2 * b, H = h - 2 * b;
  r = Math.max(0.002, Math.min(r, W / 2 - 1e-3, H / 2 - 1e-3));
  const x = -W / 2, y = -H / 2, s = new THREE.Shape();
  s.moveTo(x + r, y); s.lineTo(x + W - r, y); s.quadraticCurveTo(x + W, y, x + W, y + r);
  s.lineTo(x + W, y + H - r); s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
  s.lineTo(x + r, y + H); s.quadraticCurveTo(x, y + H, x, y + H - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 5 });
  geo.translate(0, 0, -(d - 2 * b) / 2);
  return new THREE.Mesh(geo, mat);
}
function ell(rx, ry, rz, mat, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(8, (seg * 0.75) | 0)), mat);
  m.scale.set(rx, ry, rz); return m;
}
function box(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m;
}
function limbMesh(rTop, rBot, mat, seg = 12) { return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, 1, seg), mat); }
function placeLimb(m, a, b) {            // يمدّ اسطوانة طولها 1 بين النقطتين a و b
  _c.subVectors(b, a); const len = _c.length() || 1e-4;
  m.position.copy(a).addScaledVector(_c, 0.5);
  m.quaternion.setFromUnitVectors(UP, _c.multiplyScalar(1 / len));
  m.scale.y = len;
}
function strut(parent, a, b, w, t, mat) {
  const d = b.clone().sub(a), len = d.length();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, t, len), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V3(0, 0, 1), d.normalize());
  parent.add(m); return m;
}
function quad(parent, p, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p.flatMap(v => [v.x, v.y, v.z]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); parent.add(m); return m;
}
function sidePoly(parent, x, pts, mat) {  // مضلع في المستوى (z,y) عند x ثابت
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))));
  geo.rotateY(-PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.x = x; parent.add(m); return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// IK بعظمتين (كتف-كوع-يد / ورك-ركبة-كاحل)
function ik(S, W, l1, l2, pole, out) {
  _e1.subVectors(W, S); let dist = _e1.length();
  const maxR = (l1 + l2) * 0.998, minR = Math.abs(l1 - l2) + 0.01;
  let a1 = l1, a2 = l2;
  if (dist > maxR) { const k = dist / maxR; a1 *= k; a2 *= k; }
  if (dist < minR) dist = minR;
  _e1.normalize();
  const x = (a1 * a1 - a2 * a2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, a1 * a1 - x * x));
  _e2.copy(pole).addScaledVector(_e1, -pole.dot(_e1)).normalize();
  out.copy(S).addScaledVector(_e1, x).addScaledVector(_e2, h);
}

/* ---------------------------------------------------------------- اليد (يسار؛ اليمين تُعكس بالمقياس) */
// مركز الإطار = مركز أنبوب الستيرنغ. الكف خارج الحافة، الأصابع تلتف حول الحافة من الخلف، الإبهام على وجه السائق
const WRIST = V3(-0.034, 0, 0.12);
function buildHand(withWatch) {
  const h = new THREE.Group(), R0 = 0.0175;
  const palm = ell(0.017, 0.043, 0.050, M.skin); palm.position.set(-0.033, 0, 0.046); h.add(palm);
  const chain = (nodes, radii) => {
    nodes.forEach((n, i) => {
      const s = ell(radii[i], radii[i], radii[i], M.skin, 10); s.position.copy(n); h.add(s);
      if (i) { const c = limbMesh(radii[i], radii[i - 1], M.skin, 10); placeLimb(c, nodes[i - 1], n); h.add(c); }
    });
  };
  // [موضع y ، نصف قطر الإصبع ، معامل الطول]  سبابة، وسطى، بنصر، خنصر
  for (const [y, r, k] of [[0.031, 0.0100, 1.0], [0.0105, 0.0105, 1.04], [-0.0105, 0.0100, 0.98], [-0.030, 0.0088, 0.86]]) {
    const Rc = R0 + r, total = 3.3 * k, nodes = [], radii = [];
    for (let i = 0; i < 4; i++) {
      const a = total * i / 3;
      nodes.push(V3(-Rc * Math.cos(a), y, -Rc * Math.sin(a)));
      radii.push(r * (1 - i * 0.06));
    }
    chain(nodes, radii);
  }
  chain([V3(-0.030, 0.034, 0.064), V3(-0.017, 0.058, 0.040), V3(-0.004, 0.080, 0.030)], [0.0125, 0.0112, 0.0102]); // الإبهام
  const w = limbMesh(0.027, 0.029, M.skin, 12); placeLimb(w, V3(-0.034, 0, 0.085), WRIST); h.add(w);
  if (withWatch) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0305, 0.0305, 0.022, 18), M.black);
    band.geometry.rotateX(PI / 2); band.position.set(-0.034, 0, 0.108); h.add(band);
    box(h, 0.008, 0.028, 0.028, -0.066, 0, 0.108, M.chrome);
    box(h, 0.002, 0.022, 0.022, -0.071, 0, 0.108, M.black);
  }
  return h;
}
function buildShoe() {                       // المرجع = أسفل الكعب ، يمتد نحو -z
  const f = new THREE.Group();
  const sole = rbox(0.10, 0.032, 0.29, 0.012, M.rubber); sole.position.set(0, 0.016, -0.125); f.add(sole);
  const toe = ell(0.048, 0.034, 0.09, M.shoe); toe.position.set(0, 0.05, -0.19); f.add(toe);
  const mid = ell(0.047, 0.045, 0.09, M.shoe); mid.position.set(0, 0.06, -0.09); f.add(mid);
  const heel = ell(0.045, 0.062, 0.065, M.shoe); heel.position.set(0, 0.075, -0.045); f.add(heel);
  return f;
}
const ANKLE = V3(0, 0.09, -0.045);

/* ================================================================ السيارة */
export class Taxi {
  constructor(scene, camera) {
    this.input = { gas: 0, brake: 0, steer: 0 };
    this.speed = 0; this.steer = 0; this.heading = 0; this.yaw = 0; this.pitch = 0;
    this.MAX = 32; this.ACC = 12; this.L = 2.6; this.wheels = [];
    // حالة جديدة (متاحة للـ HUD): kmh ، fuel (0..1) ، odometer (متر)
    this.fuel = 1; this.odometer = 0; this.kmh = 0; this.mirrorsEnabled = true;
    this.frontPivots = []; this.mirrors = []; this.doors = {};
    this._frame = 0; this._t = 0; this._pedG = 0; this._pedB = 0; this._brk = 0; this._inMirror = false;
    const g = this.group = new THREE.Group(); scene.add(g);
    this.scene = scene; this.camera = camera;

    this._buildBody(g); this._buildWheels(g); this._buildGlass(g); this._buildDoors(g);
    this._buildInterior(g); this._buildDriver(g); this._buildMirrors(g); this._buildLights(g);

    camera.rotation.order = 'YXZ'; camera.position.set(-0.45, 1.25, 0.08); g.add(camera);
  }

  /* ---------- الهيكل ---------- */
  _buildBody(g) {
    const W = 1.84, B = 0.06;
    const extrude = (shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: W - 2 * B, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelOffset: -B, bevelSegments: 4, curveSegments: 18 });
      geo.translate(0, 0, -(W - 2 * B) / 2); geo.rotateY(PI / 2);   // x الشكل (أمام +) -> -z
      return new THREE.Mesh(geo, M.paint);
    };
    // مقطع الأمام (غطاء المحرك + الجناحين مع فتحة العجلة)
    const f = new THREE.Shape();
    f.moveTo(1.0, 0.30); f.lineTo(1.102, 0.30);
    f.absarc(1.5, 0.34, 0.40, PI + 0.1, -0.1, true);
    f.lineTo(2.40, 0.30); f.quadraticCurveTo(2.50, 0.30, 2.50, 0.40); f.lineTo(2.50, 0.72);
    f.quadraticCurveTo(2.50, 0.90, 2.42, 0.95); f.quadraticCurveTo(2.34, 1.0, 2.2, 1.01);
    f.lineTo(1.0, 1.05); f.closePath();
    g.add(extrude(f));
    // مقطع الخلف (الصندوق)
    const r = new THREE.Shape();
    r.moveTo(-1.15, 0.30); r.lineTo(-1.182, 0.30);
    r.absarc(-1.58, 0.34, 0.40, -0.1, PI + 0.1, false);
    r.lineTo(-2.40, 0.30); r.quadraticCurveTo(-2.50, 0.30, -2.50, 0.40); r.lineTo(-2.50, 0.72);
    r.quadraticCurveTo(-2.50, 1.04, -2.36, 1.08); r.lineTo(-1.45, 1.07); r.lineTo(-1.15, 1.04); r.closePath();
    g.add(extrude(r));

    // أرضية الكابينة + النفق + العتبات
    box(g, 1.74, 0.04, 2.15, 0, 0.36, 0.075, M.carpet);
    box(g, 0.24, 0.10, 1.7, 0, 0.43, -0.05, M.carpet);
    for (const sx of [-1, 1]) box(g, 0.06, 0.12, 2.15, sx * 0.90, 0.34, 0.075, M.paint);

    // مصدّات أمامية وخلفية
    for (const z of [-2.50, 2.50]) {
      const b = rbox(1.94, 0.16, 0.14, 0.05, M.chrome); b.position.set(0, 0.46, z); g.add(b);
      box(g, 1.7, 0.05, 0.05, 0, 0.36, z * 1.012, M.rubber);
    }
    // شبك أمامي
    const grille = rbox(1.1, 0.20, 0.04, 0.03, M.black); grille.position.set(0, 0.69, -2.51); g.add(grille);
    for (let y = 0.62; y <= 0.78; y += 0.04) box(g, 1.0, 0.012, 0.02, 0, y, -2.535, M.chrome);
    box(g, 1.15, 0.03, 0.04, 0, 0.82, -2.52, M.chrome);
    // أضواء أمامية
    for (const sx of [-1, 1]) {
      const hl = rbox(0.36, 0.17, 0.06, 0.05, M.headlight); hl.position.set(sx * 0.64, 0.84, -2.46); g.add(hl);
      box(g, 0.40, 0.02, 0.06, sx * 0.64, 0.93, -2.45, M.chrome);
    }
    // أضواء خلفية + ضوء رجوع
    for (const sx of [-1, 1]) {
      const tl = rbox(0.40, 0.14, 0.05, 0.04, M.tail); tl.position.set(sx * 0.62, 0.90, 2.455); g.add(tl);
      const rv = rbox(0.12, 0.08, 0.05, 0.03, M.rev); rv.position.set(sx * 0.30, 0.90, 2.46); g.add(rv);
    }
    // لوحات الأرقام (صفراء إسرائيلية)
    const plate = canvasTex(256, 128, (x, w, h) => {
      x.fillStyle = '#f2c500'; x.fillRect(0, 0, w, h); x.strokeStyle = '#111'; x.lineWidth = 6; x.strokeRect(4, 4, w - 8, h - 8);
      x.fillStyle = '#111'; x.font = 'bold 62px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('123-45-678', w / 2, h / 2 + 4);
    });
    const pm = new THREE.MeshBasicMaterial({ map: plate });
    const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), pm); pr.position.set(0, 0.66, 2.575); g.add(pr);
    const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), pm); pf.position.set(0, 0.50, -2.575); pf.rotation.y = PI; g.add(pf);
    // مقبض صندوق + شعار
    box(g, 0.2, 0.03, 0.03, 0, 0.98, 2.40, M.chrome);
  }

  /* ---------- العجلات ---------- */
  _buildWheels(g) {
    const spots = [[-1, -1.5, true], [1, -1.5, true], [-1, 1.58, false], [1, 1.58, false]];
    for (const [sx, z, front] of spots) {
      const piv = new THREE.Group(); piv.position.set(sx * 0.82, 0.34, z); g.add(piv);
      const spin = new THREE.Group(); piv.add(spin);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 32), M.rubber); tire.rotation.z = PI / 2; spin.add(tire);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.02, 28), M.chrome); face.rotation.z = PI / 2; face.position.x = sx * 0.123; spin.add(face);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 18), M.chrome); cap.rotation.z = PI / 2; cap.position.x = sx * 0.138; spin.add(cap);
      for (let i = 0; i < 6; i++) {
        const a = i * PI / 3, sl = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.075, 0.04), M.black);
        sl.position.set(sx * 0.134, Math.cos(a) * 0.15, Math.sin(a) * 0.15); sl.rotation.x = a; spin.add(sl);
      }
      this.wheels.push(spin);
      if (front) this.frontPivots.push(piv);
    }
    for (const z of [-1.5, 1.58]) {       // بطانة قوس العجلة
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.385, 1.40, 24), M.black);
      core.rotation.z = PI / 2; core.position.set(0, 0.34, z); g.add(core);
    }
  }

  /* ---------- الزجاج والأعمدة والسقف ---------- */
  _buildGlass(g) {
    quad(g, [V3(-0.85, 1.04, -1.0), V3(0.85, 1.04, -1.0), V3(0.85, 1.40, -0.55), V3(-0.85, 1.40, -0.55)], M.glass);
    quad(g, [V3(-0.85, 1.34, -0.625), V3(0.85, 1.34, -0.625), V3(0.85, 1.40, -0.55), V3(-0.85, 1.40, -0.55)], M.tint); // شريط الشمس
    quad(g, [V3(-0.82, 1.06, 1.45), V3(0.82, 1.06, 1.45), V3(0.82, 1.40, 1.20), V3(-0.82, 1.40, 1.20)], M.glass);
    for (const sx of [-1, 1]) {
      sidePoly(g, sx * 0.85, [[1.12, 1.045], [1.45, 1.06], [1.20, 1.40], [1.12, 1.40]], M.glass); // نافذة الربع الخلفي
      strut(g, V3(sx * 0.855, 1.04, -1.0), V3(sx * 0.855, 1.40, -0.55), 0.07, 0.05, M.paint);      // عمود A
      box(g, 0.07, 0.38, 0.07, sx * 0.855, 1.23, 0.28, M.black);                                    // عمود B
      strut(g, V3(sx * 0.84, 1.06, 1.45), V3(sx * 0.84, 1.40, 1.20), 0.08, 0.06, M.paint);         // عمود C
      box(g, 0.05, 0.36, 0.05, sx * 0.85, 1.22, 1.115, M.black);
    }
    const roof = rbox(1.76, 0.07, 1.78, 0.035, M.paint); roof.position.set(0, 1.425, 0.325); g.add(roof);
    box(g, 1.66, 0.02, 1.70, 0, 1.388, 0.33, M.liner);                         // سقف داخلي
    box(g, 0.18, 0.02, 0.10, 0, 1.376, 0.62, M.dome);                          // إضاءة سقف
    for (const x of [-0.45, 0.45]) box(g, 0.30, 0.012, 0.17, x, 1.372, -0.38, M.trim); // شمسيات
    box(g, 1.7, 0.03, 0.06, 0, 1.045, -1.0, M.black);                          // إطار قاعدة الزجاج الأمامي
    strut(g, V3(-0.75, 1.045, -0.99), V3(-0.12, 1.12, -0.89), 0.012, 0.01, M.black);   // مساحات
    strut(g, V3(-0.05, 1.045, -0.99), V3(0.62, 1.12, -0.89), 0.012, 0.01, M.black);
  }

  /* ---------- الأبواب (تفتح فعلاً) ---------- */
  _buildDoors(g) {
    const checker = canvasTex(32, 32, (x) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#111'; x.fillRect(0, 0, 16, 16); x.fillRect(16, 16, 16, 16);
    });
    checker.wrapS = checker.wrapT = THREE.RepeatWrapping; checker.magFilter = THREE.NearestFilter;
    const defs = [['driver', -1, -0.97, 1.23, true], ['passenger', 1, -0.97, 1.23, true], ['rearLeft', -1, 0.30, 0.82, false], ['rearRight', 1, 0.30, 0.82, false]];
    for (const [name, sx, z0, len, front] of defs) {
      const piv = new THREE.Group(); piv.position.set(sx * 0.90, 0, z0); g.add(piv);
      const skin = rbox(len - 0.01, 0.66, 0.055, 0.05, M.paint); skin.geometry.rotateY(PI / 2); skin.position.set(-sx * 0.0125, 0.71, len / 2); piv.add(skin);
      const card = rbox(len - 0.05, 0.62, 0.03, 0.02, M.trim); card.geometry.rotateY(PI / 2); card.position.set(-sx * 0.06, 0.70, len / 2); piv.add(card);
      box(piv, 0.05, 0.05, 0.4, -sx * 0.09, 0.92, len * 0.6, M.dash);                 // مسند ذراع
      box(piv, 0.02, 0.018, len - 0.03, sx * 0.02, 1.04, len / 2, M.chrome);           // خط الحزام
      box(piv, 0.025, 0.028, 0.15, sx * 0.03, 0.96, len - 0.22, M.chrome);             // مقبض
      box(piv, 0.02, 0.03, 0.08, -sx * 0.09, 0.97, len - 0.18, M.black);              // مقبض داخلي
      const tex = checker.clone(); tex.needsUpdate = true; tex.repeat.set(Math.round(len / 0.07), 1);
      const st = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.08, 0.07), new THREE.MeshBasicMaterial({ map: tex }));
      st.position.set(sx * 0.0165, 0.62, len / 2); st.rotation.y = sx * PI / 2; piv.add(st);
      // الزجاج والإطار
      const pts = front ? [[0.06, 1.06], [1.19, 1.06], [1.19, 1.39], [0.44, 1.39]] : [[0.03, 1.06], [0.79, 1.06], [0.79, 1.39], [0.03, 1.39]];
      sidePoly(piv, -sx * 0.045, pts, M.glass);
      const zs = front ? 0.44 : 0.03;
      box(piv, 0.03, 0.025, len - 0.04 - zs, -sx * 0.045, 1.395, (zs + len - 0.04) / 2, M.black);
      if (front) strut(piv, V3(-sx * 0.045, 1.06, 0.06), V3(-sx * 0.045, 1.39, 0.44), 0.03, 0.025, M.black);
      // مرآة جانبية حقيقية على الأبواب الأمامية
      if (front) {
        box(piv, 0.14, 0.03, 0.04, sx * 0.07, 1.07, 0.12, M.black);
        this._addMirror(piv, sx * 0.14, 1.12, 0.12, sx > 0 ? -0.5 : 0.3, 0.17, 0.10, 32, 256, 160, sx * 0.12);
      }
      this.doors[name] = { piv, sx, open: 0, target: 0 };
    }
  }
  toggleDoor(name) { const d = this.doors[name]; if (d) d.target = d.target ? 0 : 1; }
  setDoor(name, open) { const d = this.doors[name]; if (d) d.target = open ? 1 : 0; }
  refuel(amount = 1) { this.fuel = Math.min(1, this.fuel + amount); }

  /* ---------- مرايا فعلية (Render-to-texture) ---------- */
  _addMirror(parent, x, y, z, yaw, w, h, fov, rw, rh, backX) {
    const rt = new THREE.WebGLRenderTarget(rw, rh, { generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    rt.texture.wrapS = THREE.RepeatWrapping; rt.texture.repeat.x = -1; rt.texture.offset.x = 1;   // انعكاس أفقي
    const mg = new THREE.Group(); mg.position.set(x, y, z); mg.rotation.y = yaw; parent.add(mg);
    const hs = rbox(w + 0.03, h + 0.03, 0.06, 0.03, M.black); mg.add(hs);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: rt.texture }));
    glass.position.z = 0.0315; mg.add(glass);
    const m = { glass, cam: new THREE.PerspectiveCamera(fov, w / h, 0.35, 220), rt, backX, idx: this.mirrors.length };
    glass.onBeforeRender = (renderer, scene) => this._renderMirror(m, renderer, scene);
    this.mirrors.push(m);
  }
  _renderMirror(m, renderer, scene) {
    if (!this.mirrorsEnabled || this._inMirror || (this._frame + m.idx) % 2) return;
    this._inMirror = true;
    m.glass.getWorldPosition(_p);
    m.cam.position.copy(_p);
    _d.set(m.backX, -0.02, 1).transformDirection(this.group.matrixWorld);
    m.cam.lookAt(_p.clone().add(_d));
    const prevRT = renderer.getRenderTarget(), xr = renderer.xr.enabled, sh = renderer.shadowMap.autoUpdate;
    renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false;
    for (const o of this.mirrors) o.glass.visible = false;
    renderer.setRenderTarget(m.rt);
    renderer.render(scene, m.cam);
    for (const o of this.mirrors) o.glass.visible = true;
    renderer.setRenderTarget(prevRT); renderer.xr.enabled = xr; renderer.shadowMap.autoUpdate = sh;
    this._inMirror = false;
  }
  _buildMirrors(g) {   // مرآة الراكب الداخلية (وسط الزجاج الأمامي)
    box(g, 0.02, 0.07, 0.02, -0.02, 1.365, -0.57, M.black);
    this._addMirror(g, -0.02, 1.31, -0.60, -0.28, 0.24, 0.062, 22, 512, 160, 0);
  }

  /* ---------- المقصورة ---------- */
  _buildInterior(g) {
    // طبلون
    const dash = rbox(1.74, 0.40, 0.44, 0.07, M.dash); dash.position.set(0, 0.78, -0.78); g.add(dash);
    const bin = rbox(0.50, 0.18, 0.24, 0.05, M.dash); bin.position.set(-0.45, 1.02, -0.70); g.add(bin);
    for (const x of [-0.12, 0.12]) box(g, 0.15, 0.045, 0.02, x, 0.92, -0.565, M.black);   // فتحات تكييف
    box(g, 0.15, 0.045, 0.02, 0.8, 0.92, -0.565, M.black); box(g, 0.15, 0.045, 0.02, -0.82, 0.92, -0.565, M.black);
    box(g, 0.55, 0.012, 0.01, 0.45, 0.70, -0.562, M.black);                                 // خط الدرج
    const radio = rbox(0.30, 0.26, 0.05, 0.03, M.black); radio.position.set(0, 0.70, -0.545); g.add(radio);
    box(g, 0.20, 0.04, 0.006, 0, 0.78, -0.518, M.lcd);
    for (const x of [-0.09, 0.09]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 14), M.chrome); k.rotation.x = PI / 2; k.position.set(x, 0.65, -0.52); g.add(k); }
    const con = rbox(0.26, 0.20, 0.70, 0.06, M.trim); con.position.set(0, 0.46, 0.05); g.add(con);

    // لوحة العدادات (سرعة + بنزين شغالين)
    const c = document.createElement('canvas'); c.width = 800; c.height = 300;
    const tex = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    this._cl = { c, ctx: c.getContext('2d'), tex, acc: 1 };
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.158), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    cl.position.set(-0.45, 1.035, -0.575); cl.rotation.x = -0.28; g.add(cl);
    this._drawCluster();

    // كراسي
    const seat = (x, z) => {
      const cu = rbox(0.52, 0.14, 0.52, 0.05, M.seat); cu.position.set(x, 0.52, z); g.add(cu);
      const bk = rbox(0.50, 0.62, 0.13, 0.06, M.seat); bk.position.set(x, 0.86, z + 0.35); bk.rotation.x = 0.22; g.add(bk);
      const hr = rbox(0.26, 0.18, 0.10, 0.05, M.seat); hr.position.set(x, 1.22, z + 0.43); hr.rotation.x = 0.22; g.add(hr);
    };
    seat(-0.45, 0.12); seat(0.45, 0.12);
    const bc = rbox(1.62, 0.14, 0.55, 0.05, M.seat); bc.position.set(0, 0.50, 0.82); g.add(bc);
    const bb = rbox(1.62, 0.60, 0.13, 0.06, M.seat); bb.position.set(0, 0.84, 1.10); bb.rotation.x = 0.18; g.add(bb);
    for (const x of [-0.45, 0.45]) { const hr = rbox(0.26, 0.17, 0.09, 0.05, M.seat); hr.position.set(x, 1.19, 1.12); g.add(hr); }

    // الستيرنغ (يميل 26° نحو السائق)
    const base = this._wheelBase = new THREE.Group();
    base.position.set(-0.45, 1.0, -0.44); base.rotation.x = -0.45; base.updateMatrix(); g.add(base);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.30, 14), M.trim); col.rotation.x = PI / 2; col.position.z = -0.15; base.add(col);
    const piv = this.wheelPivot = new THREE.Group(); base.add(piv);
    piv.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.0175, 14, 48), M.wheel));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.045, 20), M.wheel); hub.rotation.x = PI / 2; piv.add(hub);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.02, 20), M.black); pad.rotation.x = PI / 2; pad.position.z = 0.03; piv.add(pad);
    box(piv, 0.17, 0.022, 0.012, 0.105, 0, 0, M.wheel); box(piv, 0.17, 0.022, 0.012, -0.105, 0, 0, M.wheel);
    box(piv, 0.022, 0.12, 0.012, 0, -0.095, 0, M.wheel);

    // الدواسات: بنزين (عضوية، مفصلتها عند الكعب) + فرامل (معلّقة)
    const gas = this._pedGas = new THREE.Group(); gas.position.set(-0.31, 0.40, -0.54); g.add(gas);
    box(gas, 0.08, 0.012, 0.22, 0, 0.005, -0.12, M.rubber); box(gas, 0.07, 0.01, 0.02, 0, 0.012, -0.05, M.chrome);
    const brk = this._pedBrake = new THREE.Group(); brk.position.set(-0.49, 0.74, -0.84); g.add(brk);
    const arm = box(brk, 0.03, 0.346, 0.015, 0, -0.148, 0.09, M.chrome); arm.rotation.x = -0.547;
    const bp = box(brk, 0.12, 0.012, 0.09, 0, -0.296, 0.18, M.rubber); bp.rotation.x = -0.45;
    const fr = box(g, 0.14, 0.02, 0.18, -0.66, 0.39, -0.46, M.trim); fr.rotation.x = 0.3;   // مسند القدم اليسرى
  }

  /* ---------- السائق: جذع، يدان، رجلان ---------- */
  _buildDriver(g) {
    const torso = rbox(0.44, 0.54, 0.26, 0.10, M.shirt); torso.position.set(-0.45, 0.86, 0.25); torso.rotation.x = 0.22; g.add(torso);
    const pelvis = ell(0.20, 0.10, 0.15, M.pants); pelvis.position.set(-0.45, 0.64, 0.17); g.add(pelvis);

    // الذراعان
    this._arms = [];
    for (const left of [true, false]) {
      const S = left ? V3(-0.65, 1.06, 0.22) : V3(-0.25, 1.06, 0.22);
      const upper = limbMesh(0.042, 0.050, M.shirt, 14), fore = limbMesh(0.027, 0.040, M.skin, 14);
      const elbow = ell(0.042, 0.042, 0.042, M.skin), shoulder = ell(0.065, 0.065, 0.065, M.shirt);
      g.add(upper, fore, elbow, shoulder);
      const hand = buildHand(left);
      if (!left) hand.scale.x = -1;           // اليد اليمنى = انعكاس
      this._wheelBase.children[1].add(hand);  // داخل piv (يدور مع الستيرنغ)
      this._arms.push({ left, S, upper, fore, elbow, shoulder, hand, pole: left ? V3(-0.4, -1, 0.3) : V3(0.4, -1, 0.3) });
    }

    // الرجلان
    this._legs = [];
    for (const right of [true, false]) {
      const hip = right ? V3(-0.35, 0.64, 0.10) : V3(-0.55, 0.64, 0.10);
      const thigh = limbMesh(0.062, 0.082, M.pants, 14), shin = limbMesh(0.040, 0.058, M.pants, 14), knee = ell(0.066, 0.066, 0.066, M.pants);
      const foot = buildShoe(); g.add(thigh, shin, knee, foot);
      this._legs.push({ right, hip, thigh, shin, knee, foot, pole: right ? V3(0.15, 1, 0) : V3(-0.15, 1, 0) });
    }
  }

  /* ---------- الإضاءة + إشارة التاكسي ---------- */
  _buildLights(g) {
    for (const x of [-0.6, 0.6]) {
      const s = new THREE.SpotLight(0xfff2cc, 1.2, 60, 0.5, 0.5, 1.2);
      s.position.set(x, 0.8, -2.1); s.target.position.set(x, 0, -20); g.add(s, s.target);
    }
    const tex = canvasTex(512, 128, (x, w, h) => {
      x.fillStyle = '#fff3b8'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; x.font = 'bold 100px sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('TAXI', w / 2, h / 2 + 6);
    });
    const face = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.7, roughness: 0.4 });
    const sign = new THREE.Group(); sign.position.set(0, 1.55, 0.0); g.add(sign);
    const body = rbox(0.80, 0.17, 0.27, 0.05, std(0xfff3b8, { emissive: 0xffe9a0, emissiveIntensity: 0.5 })); sign.add(body);
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.15), face); f1.position.z = 0.1365; sign.add(f1);
    const f2 = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.15), face); f2.position.z = -0.1365; f2.rotation.y = PI; sign.add(f2);
    box(g, 0.5, 0.04, 0.2, 0, 1.485, 0.0, M.black);
    // هوائي
    const an = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 6), M.black); an.position.set(0.7, 1.7, 1.1); an.rotation.z = -0.12; g.add(an);
  }

  /* ---------- لوحة العدادات ---------- */
  _drawCluster() {
    const k = this._cl, x = k.ctx, W = k.c.width, H = k.c.height;
    const white = '#e9f1ff', amber = '#ffb347', kmh = Math.min(140, this.kmh);
    const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#10141a'); gr.addColorStop(1, '#040506');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    // --- عداد السرعة
    const cx = 250, cy = 152, R = 128, a0 = PI * 0.75, sweep = PI * 1.5;
    x.strokeStyle = '#2a3340'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, R, 0, PI * 2); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let v = 0; v <= 140; v += 10) {
      const a = a0 + sweep * v / 140, major = v % 20 === 0, r1 = R - (major ? 22 : 12), r2 = R - 4;
      x.strokeStyle = v > 100 ? '#ff5a4a' : white; x.lineWidth = major ? 3.5 : 1.8;
      x.beginPath(); x.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); x.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); x.stroke();
      if (major) { x.fillStyle = white; x.font = 'bold 22px sans-serif'; x.fillText(String(v), cx + Math.cos(a) * (R - 42), cy + Math.sin(a) * (R - 42)); }
    }
    x.save(); x.translate(cx, cy); x.rotate(a0 + sweep * kmh / 140);
    x.fillStyle = '#ff3b2f'; x.beginPath(); x.moveTo(-18, -3); x.lineTo(R - 18, -1.5); x.lineTo(R - 18, 1.5); x.lineTo(-18, 3); x.closePath(); x.fill(); x.restore();
    x.fillStyle = '#1b2028'; x.beginPath(); x.arc(cx, cy, 14, 0, PI * 2); x.fill(); x.strokeStyle = '#666'; x.lineWidth = 2; x.stroke();
    x.fillStyle = amber; x.font = 'bold 44px monospace'; x.fillText(String(Math.round(this.kmh)), cx, cy + 62);
    x.fillStyle = '#9fb0c6'; x.font = 'bold 16px sans-serif'; x.fillText('km/h', cx, cy + 90);
    // --- مؤشر الناقل
    const gear = this.speed < -0.3 ? 'R' : (Math.abs(this.speed) < 0.3 && this.input.gas <= 0 ? 'N' : 'D');
    ['P', 'R', 'N', 'D'].forEach((c, i) => {
      x.font = 'bold 30px sans-serif'; x.fillStyle = c === gear ? amber : '#3a4350'; x.fillText(c, 392 + i * 40, 40);
    });
    // --- مؤشر البنزين
    const fx = 610, fy = 195, fr = 105;
    x.strokeStyle = '#2a3340'; x.lineWidth = 3; x.beginPath(); x.arc(fx, fy, fr, PI, PI * 2); x.moveTo(fx - fr, fy); x.lineTo(fx + fr, fy); x.stroke();
    for (let i = 0; i <= 8; i++) {
      const a = PI + PI * i / 8, major = i % 4 === 0, r1 = fr - (major ? 20 : 12), r2 = fr - 4;
      x.strokeStyle = i <= 1 ? '#ff5a4a' : white; x.lineWidth = major ? 3.5 : 1.8;
      x.beginPath(); x.moveTo(fx + Math.cos(a) * r1, fy + Math.sin(a) * r1); x.lineTo(fx + Math.cos(a) * r2, fy + Math.sin(a) * r2); x.stroke();
    }
    x.fillStyle = '#ff5a4a'; x.font = 'bold 24px sans-serif'; x.fillText('E', fx - fr + 38, fy - 28);
    x.fillStyle = white; x.fillText('F', fx + fr - 38, fy - 28); x.font = 'bold 20px sans-serif'; x.fillText('1/2', fx, fy - fr + 40);
    x.save(); x.translate(fx, fy); x.rotate(PI + PI * Math.max(0, Math.min(1, this.fuel)));
    x.fillStyle = '#ff3b2f'; x.beginPath(); x.moveTo(-12, -3); x.lineTo(fr - 16, -1.5); x.lineTo(fr - 16, 1.5); x.lineTo(-12, 3); x.closePath(); x.fill(); x.restore();
    x.fillStyle = '#1b2028'; x.beginPath(); x.arc(fx, fy, 11, 0, PI * 2); x.fill();
    // أيقونة المضخة + تحذير
    const low = this.fuel < 0.12, blink = Math.floor(this._t * 2.5) % 2 === 0;
    x.fillStyle = low && blink ? '#ff3b2f' : '#8392a6'; x.fillRect(fx - 10, fy + 14, 14, 22); x.fillRect(fx - 12, fy + 34, 18, 4);
    x.strokeStyle = x.fillStyle; x.lineWidth = 3; x.beginPath(); x.moveTo(fx + 4, fy + 20); x.lineTo(fx + 14, fy + 24); x.lineTo(fx + 14, fy + 36); x.stroke();
    if (low && blink) { x.fillStyle = '#ff3b2f'; x.font = 'bold 22px sans-serif'; x.fillText('LOW FUEL', fx, fy + 62); }
    x.fillStyle = '#9fb0c6'; x.font = 'bold 18px monospace'; x.fillText('ODO ' + (this.odometer / 1000).toFixed(1).padStart(7, '0') + ' km', fx, 285);
    k.tex.needsUpdate = true;
  }

  /* ---------- التحكم ---------- */
  reset(sp) {
    this.speed = 0; this.steer = 0; this.heading = sp.heading || 0; this.yaw = 0; this.pitch = 0; this.fuel = 1;
    this.group.position.set(sp.x, 0, sp.z); this.group.rotation.y = this.heading;
    for (const n in this.doors) { this.doors[n].open = this.doors[n].target = 0; }
  }
  look(dx, dy) {
    const k = 0.0024 * Settings.data.sens;
    this.yaw = Math.max(-PI * 0.97, Math.min(PI * 0.97, this.yaw - dx * k));
    this.pitch = Math.max(-1.2, Math.min(1.3, this.pitch - dy * k));
  }

  update(dt, obstacles) {
    const i = this.input, g = this.group;
    this._frame++; this._t += dt;
    const fuelOk = this.fuel > 0, gas = fuelOk ? i.gas : 0;

    // ---- الفيزياء (كما كانت) ----
    if (gas > 0) this.speed += this.ACC * dt;
    else if (i.brake > 0) this.speed -= (this.speed > 0.5 ? 26 : 8) * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 4 * dt);
    this.speed = Math.max(-8, Math.min(this.MAX, this.speed));
    if (i.brake > 0 && Math.abs(this.speed) < 0.5) this.speed = 0;
    this.steer += (i.steer * 0.55 - this.steer) * Math.min(1, dt * 6);
    this.heading -= (this.speed / this.L) * Math.tan(this.steer) * dt;
    g.position.x -= Math.sin(this.heading) * this.speed * dt;
    g.position.z -= Math.cos(this.heading) * this.speed * dt;
    g.rotation.y = this.heading;
    for (const o of obstacles) {
      const dx = g.position.x - o.x, dz = g.position.z - o.z, d = Math.hypot(dx, dz) || 1e-4, m = o.r + 1.3;
      if (d < m) { g.position.x = o.x + dx / d * m; g.position.z = o.z + dz / d * m; this.speed *= 0.4; }
    }

    // ---- بنزين وعدّاد ----
    if (fuelOk) this.fuel = Math.max(0, this.fuel - (0.00008 + 0.00035 * (gas > 0 ? 1 : 0) + 0.000004 * Math.abs(this.speed)) * dt);
    this.odometer += Math.abs(this.speed) * dt;
    this.kmh = Math.abs(this.speed) * 3.6;

    // ---- العجلات ----
    for (const p of this.frontPivots) p.rotation.y = -this.steer;
    for (const w of this.wheels) w.rotation.x -= this.speed * dt / 0.34;

    // ---- الأبواب ----
    const dk = Math.min(1, dt * 4);
    for (const n in this.doors) { const d = this.doors[n]; d.open += (d.target - d.open) * dk; d.piv.rotation.y = d.sx * d.open * 1.1; }

    // ---- أضواء الفرامل والرجوع ----
    M.tail.emissiveIntensity = i.brake > 0 ? 2.2 : 0.35;
    M.rev.emissiveIntensity = this.speed < -0.3 ? 1.5 : 0.05;

    this._updateDriver(dt, gas);

    // ---- العدادات (~20 مرة بالثانية) ----
    this._cl.acc += dt; if (this._cl.acc > 0.05) { this._cl.acc = 0; this._drawCluster(); }

    this.camera.rotation.set(this.pitch, this.yaw, 0);
    Audio.engine(fuelOk ? this.speed : 0);
  }

  _updateDriver(dt, gas) {
    const st = this.steer, K = WHEEL_K, i = this.input;
    // الستيرنغ
    this.wheelPivot.rotation.z = -st * K; this.wheelPivot.updateMatrix();
    // الأيدي: تنزلق على الحافة (تتحرك 28% من دوران الستيرنغ) والذراع تتبعها بـ IK
    const lean = Math.abs(st) / 0.55 * 0.025;
    for (const A of this._arms) {
      const aw = (A.left ? PI - 0.06 : 0.06) - st * K * 0.28, al = aw + st * K;
      A.hand.position.set(0.19 * Math.cos(al), 0.19 * Math.sin(al), 0);
      A.hand.rotation.z = A.left ? al - PI : al;
      A.hand.updateMatrix();
      _w.copy(WRIST).applyMatrix4(A.hand.matrix).applyMatrix4(this.wheelPivot.matrix).applyMatrix4(this._wheelBase.matrix);
      _s.copy(A.S); _s.z -= lean;
      ik(_s, _w, 0.30, 0.28, A.pole, _el);
      placeLimb(A.upper, _s, _el); placeLimb(A.fore, _el, _w);
      A.elbow.position.copy(_el); A.shoulder.position.copy(_s);
    }
    // الدواسات
    const k = Math.min(1, dt * 12);
    this._pedG += ((gas > 0 ? 1 : 0) - this._pedG) * k;
    this._pedB += ((i.brake > 0 ? 1 : 0) - this._pedB) * k;
    this._brk += ((i.brake > 0 ? 1 : 0) - this._brk) * Math.min(1, dt * 9);
    const gd = 0.12 + 0.30 * this._pedG;
    this._pedGas.rotation.x = -gd;
    this._pedBrake.rotation.x = 0.28 * this._pedB;
    // القدم اليمنى: بين البنزين والفرامل ، مع رفع الكعب أثناء الانتقال
    const b = this._brk, bd = 0.45 + 0.25 * this._pedB;
    for (const L of this._legs) {
      if (L.right) {
        L.foot.position.set(-0.31 + (-0.18) * b, 0.385 + 4 * b * (1 - b) * 0.05, -0.50);
        L.foot.rotation.x = -(gd * (1 - b) + bd * b);
      } else {
        L.foot.position.set(-0.66, 0.385, -0.46); L.foot.rotation.x = 0.3;
      }
      L.foot.updateMatrix();
      _w.copy(ANKLE).applyMatrix4(L.foot.matrix);
      ik(L.hip, _w, 0.44, 0.42, L.pole, _el);
      placeLimb(L.thigh, L.hip, _el); placeLimb(L.shin, _el, _w); L.knee.position.copy(_el);
    }
  }
}
