// Muñeco 3D de Christian para cada ejercicio. Un solo motor WebGL compartido que pinta en el
// lienzo de cada ficha visible. Los movimientos viven en movimientos.js.
import * as THREE from 'three';
import { MOVES, BASES } from './movimientos.js?v=14';

const D = Math.PI / 180;
const SIZE = 560;
const COL = { skin: 0xd9a27a, shirt: 0x6b3f86, shorts: 0x2b2540, sock: 0xf1edf6, hair: 0x1a171d, glow: 0xf08a4b };
const LEN = { th: 0.42, sh: 0.4, ua: 0.28, fa: 0.25 };
const REG = ['armL', 'armR', 'handL', 'handR', 'legL', 'legR', 'footL', 'footR', 'torso', 'neck'];
const GROUPS = { arms: ['armL', 'armR', 'handL', 'handR'], legs: ['legL', 'legR', 'footL', 'footR'], feet: ['footL', 'footR'], hands: ['handL', 'handR'],
  armL: ['armL', 'handL'], armR: ['armR', 'handR'], legL: ['legL', 'footL'], legR: ['legR', 'footR'], all: REG };

let R3, scene, cam, rig, ghost, props, faceTex, shadow, io, raf = 0;
const entries = new Set();
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- cara ---------- */
const curls = [[70, 70, 34], [105, 48, 34], [148, 46, 34], [186, 68, 34], [205, 105, 30], [210, 145, 28], [200, 185, 26], [52, 105, 30], [46, 145, 28], [56, 185, 26], [128, 40, 30], [85, 200, 18], [175, 200, 18]];
const FACE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="126" fill="#fff"/>
<g fill="#1b181f">${curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
<g fill="none" stroke="#4a4550" stroke-width="3">${[[78, 66], [118, 46], [160, 52], [192, 96], [60, 128], [200, 150], [64, 176]].map(([x, y]) => `<path d="M${x - 10} ${y + 6}q10-16 20 0"/>`).join('')}</g>
<ellipse cx="80" cy="142" rx="11" ry="17" fill="#d49a72"/><ellipse cx="176" cy="142" rx="11" ry="17" fill="#d49a72"/>
<path d="M82 112q0-46 46-46t46 46v40q0 52-46 58t-46-58z" fill="#e3ab82"/>
<path d="M84 150q4 58 44 60t44-60q-8 20-20 22-12-10-24-8-12-2-24 8-12-2-20-22z" fill="#5b5258" opacity=".9"/>
<path d="M90 104q14-12 30-4" stroke="#1b181f" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M138 100q16-8 30 4" stroke="#1b181f" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M94 126q12 8 24 0" stroke="#2a2328" stroke-width="5" fill="none" stroke-linecap="round"/>
<ellipse cx="154" cy="124" rx="12" ry="9" fill="#fff"/><circle cx="152" cy="125" r="6.5" fill="#5a3a22"/><circle cx="150" cy="123" r="2" fill="#fff"/>
<path d="M126 128q-6 18 2 22" stroke="#b97f5b" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M104 164q24 22 50-2q-24 10-50 2z" fill="#fff" stroke="#7a3b3b" stroke-width="3" stroke-linejoin="round"/></svg>`;

let svgImg;
function clearBackground(ctx) {
  // Quita el fondo claro de la foto pintando transparente lo que toca el borde (la cara queda intacta).
  const im = ctx.getImageData(0, 0, 256, 256), d = im.data, seen = new Uint8Array(256 * 256), stack = [];
  const light = (i) => d[i * 4 + 3] > 0 && d[i * 4] > 225 && d[i * 4 + 1] > 225 && d[i * 4 + 2] > 225;
  for (let i = 0; i < 256; i++) stack.push(i, 255 * 256 + i, i * 256, i * 256 + 255);
  for (let a = 0; a < 256 * 256; a++) if (d[a * 4 + 3] === 0) { seen[a] = 1; [a - 1, a + 1, a - 256, a + 256].forEach((n) => n >= 0 && n < 65536 && stack.push(n)); }
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !light(i)) continue;
    seen[i] = 1; d[i * 4 + 3] = 0;
    const x = i % 256;
    if (x > 0) stack.push(i - 1); if (x < 255) stack.push(i + 1); if (i >= 256) stack.push(i - 256); if (i < 65280) stack.push(i + 256);
  }
  ctx.putImageData(im, 0, 0);
}
function loadFace() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  faceTex = new THREE.CanvasTexture(cv);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const draw = (img) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.save(); ctx.beginPath(); ctx.arc(128, 128, 127, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 256);
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);
    ctx.restore();
    if (img !== svgImg) clearBackground(ctx);
    faceTex.needsUpdate = true; kick();
  };
  let real = false;
  const svg = new Image();
  svgImg = svg;
  svg.onload = () => { if (!real) draw(svg); };
  svg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(FACE_SVG);
  const img = new Image();
  img.onload = () => { real = true; draw(img); };
  img.src = 'img/cara.png';
}

/* ---------- cuerpo ---------- */
function materials(ghostMode) {
  if (ghostMode) {
    const g = new THREE.MeshBasicMaterial({ color: COL.glow, transparent: true, opacity: 0.16, depthWrite: false });
    return () => g;
  }
  const made = {};
  return (reg, kind) => {
    const key = reg + kind;
    if (!made[key]) {
      made[key] = new THREE.MeshStandardMaterial({ color: COL[kind], roughness: kind === 'shirt' ? 0.85 : 0.6 });
      made[key].userData.reg = reg;
    }
    return made[key];
  };
}
function limb(r1, r2, len, m, up = false) {
  const g = new THREE.CylinderGeometry(r2, r1, len, 18, 1, true);
  g.translate(0, up ? len / 2 : -len / 2, 0);
  return new THREE.Mesh(g, m);
}
function ball(r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o;
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); return o;
}
function joint(parent, x, y, z, ...kids) {
  const j = new THREE.Group();
  j.position.set(x, y, z);
  kids.forEach((k) => j.add(k));
  parent.add(j);
  return j;
}

function buildArm(J, side, M) {
  const s = side === 'L' ? 1 : -1, a = 'arm' + side, h = 'hand' + side;
  J['sh' + side] = joint(J.chest, 0.19 * s, 0.2, 0, ball(0.058, M(a, 'shirt')), limb(0.056, 0.05, 0.11, M(a, 'shirt')), limb(0.047, 0.04, LEN.ua, M(a, 'skin')));
  J['el' + side] = joint(J['sh' + side], 0, -LEN.ua, 0, ball(0.041, M(a, 'skin')), limb(0.04, 0.031, LEN.fa, M(a, 'skin')));
  J['wr' + side] = joint(J['el' + side], 0, -LEN.fa, 0, box(0.07, 0.085, 0.032, M(h, 'skin'), 0, -0.045, 0), ball(0.022, M(h, 'skin'), 0.038 * -s, -0.04, 0.02, 1, 1.6, 1));
  J['fi' + side] = joint(J['wr' + side], 0, -0.088, 0, box(0.066, 0.07, 0.026, M(h, 'skin'), 0, -0.035, 0));
}
function buildLeg(J, side, M) {
  const s = side === 'L' ? 1 : -1, l = 'leg' + side, f = 'foot' + side;
  J['hip' + side] = joint(J.pelvis, 0.09 * s, -0.04, 0, ball(0.08, M(l, 'shorts')), limb(0.083, 0.07, 0.2, M(l, 'shorts')), limb(0.072, 0.052, LEN.th, M(l, 'skin')));
  J['kn' + side] = joint(J['hip' + side], 0, -LEN.th, 0, ball(0.054, M(l, 'skin')), limb(0.052, 0.036, LEN.sh, M(l, 'skin')));
  J['an' + side] = joint(J['kn' + side], 0, -LEN.sh, 0, ball(0.038, M(f, 'sock')), box(0.085, 0.06, 0.15, M(f, 'sock'), 0, -0.032, 0.035));
  J['to' + side] = joint(J['an' + side], 0, -0.04, 0.11, box(0.085, 0.036, 0.075, M(f, 'sock'), 0, 0.002, 0.035));
}
function buildRig(ghostMode) {
  const M = materials(ghostMode);
  const J = { root: new THREE.Group() };
  J.root.rotation.order = 'YXZ';
  J.pelvis = joint(J.root, 0, 0, 0, ball(0.17, M('torso', 'shorts'), 0, 0, 0, 1, 0.7, 0.75));
  J.spine = joint(J.pelvis, 0, 0.07, 0, limb(0.15, 0.145, 0.24, M('torso', 'shirt'), true));
  J.chest = joint(J.spine, 0, 0.22, 0, ball(0.19, M('torso', 'shirt'), 0, 0.1, 0, 1, 0.95, 0.68));
  J.neck = joint(J.chest, 0, 0.25, 0, limb(0.045, 0.045, 0.09, M('neck', 'skin'), true));
  J.head = joint(J.neck, 0, 0.08, 0, ball(0.1, M('neck', 'skin'), 0, 0.1, 0, 0.9, 1.05, 1));
  if (!ghostMode) {
    J.head.add(ball(0.13, M('neck', 'hair'), 0, 0.13, -0.035, 1.05, 1, 0.95));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.155, 40), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true }));
    face.position.set(0, 0.11, 0.115);
    J.head.add(face);
  }
  for (const s of ['L', 'R']) { buildArm(J, s, M); buildLeg(J, s, M); }
  return { root: J.root, J };
}

/* ---------- postura ---------- */
const num = (v, i = 0) => (Array.isArray(v) ? v[i] ?? 0 : i === 0 ? v ?? 0 : 0);
function solveLeg(P, pl, side, tgt) {
  // Dos huesos: ángulos de cadera y rodilla que dejan el tobillo en tgt (el pie no se mueve).
  const s = side === 'L' ? 1 : -1;
  const v = new THREE.Vector3(tgt[0] - P[0], tgt[1] - P[1], tgt[2] - P[2]).applyEuler(new THREE.Euler(-pl[0] * D, 0, 0));
  v.sub(new THREE.Vector3(0.09 * s, -0.04, 0));
  const a = LEN.th, b = LEN.sh, d = Math.min(Math.max(v.length(), 0.25), a + b - 0.001);
  const k = Math.PI - Math.acos((a * a + b * b - d * d) / (2 * a * b));
  const wy = -(a + b * Math.cos(k)), wz = -b * Math.sin(k);
  const z = Math.asin(Math.max(-1, Math.min(1, v.x / Math.abs(wy))));
  const x = Math.atan2(v.z, v.y) - Math.atan2(wz, Math.cos(z) * wy);
  return { x, z, k };
}
function applyTrunk(J, p) {
  const P = p.P || [0, 0, 0], pl = p.pl || [0, 0, 0], Rr = p.R || [0, 0, 0], W = p.W || [0, 0, 0];
  J.root.position.set(W[0], W[1], W[2]);
  J.root.rotation.set(num(Rr, 0) * D, num(Rr, 1) * D, num(Rr, 2) * D);
  J.pelvis.position.set(P[0], P[1], P[2]);
  J.pelvis.rotation.set(num(pl, 0) * D, num(pl, 2) * D, -num(pl, 1) * D);
  for (const [k, j] of [['sp', J.spine], ['ch', J.chest], ['nk', J.neck]]) j.rotation.set(num(p[k], 0) * D, num(p[k], 2) * D, -num(p[k], 1) * D);
  const br = p.br || 0;
  J.chest.scale.setScalar(1 + br * 0.05);
  J.pelvis.children[0].scale.set(1 + br * 0.06, 0.7, 0.75 + br * 0.12);
}
const EU = new THREE.Euler(), QE = new THREE.Quaternion(), UPV = new THREE.Vector3(0, 1, 0);
function applyLimbs(J, p, S) {
  const sg = S === 'L' ? 1 : -1, sh = p['s' + S], hp = p['h' + S], an = p['a' + S], pl = p.pl || [0, 0, 0];
  J['sh' + S].rotation.set(-num(sh, 0) * D, -sg * num(sh, 2) * D, sg * num(sh, 1) * D);
  EU.set(-num(p['e' + S], 0) * D, num(p['e' + S], 1) * D, 0);
  J['el' + S].quaternion.setFromAxisAngle(UPV, -sg * num(sh, 3) * D).multiply(QE.setFromEuler(EU));
  J['wr' + S].rotation.set(num(p['w' + S]) * D, 0, 0);
  J['fi' + S].rotation.set(num(p['f' + S]) * D, 0, 0);
  J['to' + S].rotation.set(num(p['t' + S]) * D, 0, 0);
  let hx = -num(hp, 0) * D, hz = sg * num(hp, 1) * D, kx = num(p['k' + S]) * D;
  const ik = p['ik' + S];
  if (ik) ({ x: hx, z: hz, k: kx } = solveLeg(p.P || [0, 0, 0], pl, S, ik));
  J['hip' + S].rotation.set(hx, sg * num(hp, 2) * D, hz);
  J['kn' + S].rotation.set(kx, 0, 0);
  const ft = p['ft' + S];
  const ax = ft !== undefined ? ft * D - (num(pl, 0) * D + hx + kx) : num(an, 0) * D;
  J['an' + S].rotation.set(ax, 0, ik ? -hz : sg * num(an, 1) * D);
}
function applyPose(J, p) {
  applyTrunk(J, p);
  applyLimbs(J, p, 'L');
  applyLimbs(J, p, 'R');
}

function blend(a, b, t) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (k === 'hi') { out[k] = t < 0.5 ? x ?? y : y ?? x; continue; }
    if (Array.isArray(x) || Array.isArray(y)) {
      const n = Math.max(Array.isArray(x) ? x.length : 1, Array.isArray(y) ? y.length : 1);
      out[k] = Array.from({ length: Math.max(n, 1) }, (_, i) => num(x, i) + (num(y, i) - num(x, i)) * t);
    } else out[k] = (x ?? 0) + ((y ?? 0) - (x ?? 0)) * t;
  }
  return out;
}

const cache = new Map();
function frames(id) {
  if (!cache.has(id)) {
    const m = MOVES[id] || MOVES._, base = BASES[m.b];
    const f = (m.f?.length ? m.f : [{}]).map((o) => ({ ...base.pose, ...(m.all || {}), ...o }));
    cache.set(id, { m, base, f, pk: m.pk ?? (f.length > 1 ? 1 : 0) });
  }
  return cache.get(id);
}
function poseAt(id, t) {
  const { m, f } = frames(id);
  if (f.length === 1) return f[0];
  const d = (m.d || 4) * 1000, n = f.length, x = ((t % d) / d) * n, i = Math.floor(x) % n;
  const e = 0.5 - Math.cos(Math.PI * (x - Math.floor(x))) / 2;
  return blend(f[i], f[(i + 1) % n], e);
}

/* ---------- escena y objetos ---------- */
function chair(wood) {
  const c = new THREE.Group();
  c.add(box(0.46, 0.04, 0.44, wood, 0, 0.38, 0.1));
  for (const [x, z] of [[-0.2, -0.1], [0.2, -0.1], [-0.2, 0.3], [0.2, 0.3]]) c.add(box(0.035, 0.38, 0.035, wood, x, 0.19, z));
  for (const x of [-0.2, 0.2]) c.add(box(0.035, 0.62, 0.035, wood, x, 0.69, -0.11));
  c.add(box(0.44, 0.16, 0.025, wood, 0, 0.9, -0.11));
  return c;
}
function buildProps() {
  const wood = new THREE.MeshStandardMaterial({ color: 0xb98d63, roughness: 0.7 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xe9e4f1, roughness: 0.9 });
  const P = { chair: chair(wood), chairFront: chair(wood), chairSide: chair(wood) };
  P.chairFront.rotation.y = Math.PI; P.chairFront.position.set(0, 0, 0.28);
  P.chairSide.rotation.y = -Math.PI / 2; P.chairSide.position.set(0.5, 0, 0.05);
  P.wall = box(1.6, 2.1, 0.06, pale, 0, 1.05, 0.95);
  P.mat = box(2.0, 0.025, 0.7, new THREE.MeshStandardMaterial({ color: 0x9a7cbc, roughness: 0.95 }), 0.1, 0.012, 0);
  P.pillow = ball(0.16, pale, 0.62, 0.2, 0, 1.4, 0.6, 1.6);
  P.ball = ball(0.045, new THREE.MeshStandardMaterial({ color: 0xf08a4b, roughness: 0.5 }));
  P.bottleL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.17, 16), new THREE.MeshStandardMaterial({ color: 0x7fc7e8, roughness: 0.2, transparent: true, opacity: 0.85 }));
  P.bottleR = P.bottleL.clone();
  P.table = new THREE.Group();
  P.table.add(box(1.0, 0.04, 0.6, wood, 0, 0.74, 0), box(0.05, 0.72, 0.05, wood, -0.44, 0.36, 0.24), box(0.05, 0.72, 0.05, wood, 0.44, 0.36, 0.24), box(0.05, 0.72, 0.05, wood, -0.44, 0.36, -0.24), box(0.05, 0.72, 0.05, wood, 0.44, 0.36, -0.24));
  P.table.position.set(0, 0, 0.5);
  P.towel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), new THREE.MeshStandardMaterial({ color: 0x1f9d7a, roughness: 0.9 }));
  for (const o of Object.values(P)) { o.visible = false; o.userData.home = o.position.clone(); o.userData.rotY = o.rotation.y; scene.add(o); }
  return P;
}

const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function placeProps(m, J) {
  const on = new Set(m.pr || []);
  for (const [k, o] of Object.entries(props)) {
    o.visible = on.has(k) || (k.startsWith('bottle') && on.has('bottle'));
    const at = m.po?.[k];
    if (at) o.position.set(at[0], at[1], at[2]); else o.position.copy(o.userData.home);
    o.rotation.y = at?.[3] !== undefined ? at[3] * D : o.userData.rotY;
  }
  if (on.has('ball')) J.fiR.getWorldPosition(props.ball.position);
  if (on.has('bottle')) for (const S of ['L', 'R']) {
    const b = props['bottle' + S];
    J['fi' + S].getWorldPosition(b.position); J['wr' + S].getWorldQuaternion(b.quaternion); b.rotateX(Math.PI / 2);
  }
  if (on.has('towel')) {
    J.toL.getWorldPosition(A); J.fiL.getWorldPosition(B); J.fiR.getWorldPosition(C); B.add(C).multiplyScalar(0.5);
    const t = props.towel;
    t.position.copy(A).add(B).multiplyScalar(0.5); t.scale.set(1, A.distanceTo(B), 1);
    t.quaternion.setFromUnitVectors(UP, C.copy(B).sub(A).normalize());
  }
}
function setGlow(hi, t) {
  const want = new Set((hi || []).flatMap((h) => GROUPS[h] || [h]));
  const k = 0.3 + 0.25 * Math.sin(t / 260);
  rig.root.traverse((o) => {
    const reg = o.material?.userData?.reg;
    if (!reg) return;
    const on = want.has(reg);
    o.material.emissive.setHex(on ? COL.glow : 0); o.material.emissiveIntensity = on ? k : 0;
  });
}

function init() {
  if (R3) return true;
  try {
    R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  } catch { return false; }
  R3.setPixelRatio(1); R3.setSize(SIZE, SIZE, false); R3.setClearColor(0, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6ee, 0x6d5f86, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(2, 4, 3); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xe39bd8, 0.9); rim.position.set(-3, 2, -2); scene.add(rim);
  cam = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  loadFace();
  rig = buildRig(false); ghost = buildRig(true);
  scene.add(rig.root, ghost.root);
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const g = sc.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(40,20,60,.35)'); gr.addColorStop(1, 'rgba(40,20,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);
  props = buildProps();
  return true;
}

/* ---------- pintar ---------- */
function render(e, t) {
  const { m, base, f, pk } = frames(e.id);
  const p = still ? f[pk] : poseAt(e.id, t);
  applyPose(rig.J, p);
  rig.root.updateMatrixWorld(true);
  ghost.root.visible = f.length > 1 && m.ghost !== false;
  if (ghost.root.visible) applyPose(ghost.J, f[pk]);
  setGlow(p.hi ?? m.hi, t);
  placeProps(m, rig.J);
  const c = { ...base.cam, ...(m.cam || {}) }, az = (c.az + e.yaw) * D, el = c.el * D;
  cam.position.set(c.t[0] + c.d * Math.sin(az) * Math.cos(el), c.t[1] + c.d * Math.sin(el), c.t[2] + c.d * Math.cos(az) * Math.cos(el));
  cam.lookAt(c.t[0], c.t[1], c.t[2]);
  shadow.position.set(base.lie ? 0.1 : c.t[0], 0.003, base.lie ? 0 : 0.1);
  shadow.scale.set(base.lie ? 1.6 : 1, base.lie ? 0.7 : 1, 1);
  R3.render(scene, cam);
  e.ctx.clearRect(0, 0, e.cv.width, e.cv.height);
  e.ctx.drawImage(R3.domElement, 0, 0, e.cv.width, e.cv.height);
}
function loop(now) {
  raf = 0;
  let any = false;
  for (const e of entries) {
    if (!e.cv.isConnected) { entries.delete(e); io.unobserve(e.box); continue; }
    if (!e.vis || (still && !e.dirty)) continue;
    any = true;
    if (now - e.last < (e.big ? 16 : 33)) continue;
    e.last = now; e.dirty = false;
    render(e, now);
  }
  if (any && !still) raf = requestAnimationFrame(loop);
}
function kick() { for (const e of entries) e.dirty = true; if (!raf) raf = requestAnimationFrame(loop); }

function draggable(e) {
  let x0 = null;
  e.cv.addEventListener('pointerdown', (ev) => { x0 = ev.clientX; });
  e.cv.addEventListener('pointermove', (ev) => {
    if (x0 === null) return;
    e.yaw -= (ev.clientX - x0) * 0.6; x0 = ev.clientX; e.dirty = true; kick();
  });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) e.cv.addEventListener(t, () => { x0 = null; });
}

export function animateFigures(root = document) {
  const nodes = root.querySelectorAll('[data-fig]');
  if (!nodes.length) return;
  if (!init()) { nodes.forEach((n) => n.classList.add('fig-off')); return; }
  io ??= new IntersectionObserver((list) => {
    for (const it of list) if (it.target._fig) it.target._fig.vis = it.isIntersecting;
    kick();
  }, { rootMargin: '80px' });
  for (const n of nodes) {
    if (n._fig?.id === n.dataset.fig && n._fig.cv.isConnected) continue;
    const big = !!n.closest('dialog');
    const cv = document.createElement('canvas');
    cv.width = cv.height = big ? SIZE : 320;
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'Muñeco que enseña el movimiento. Arrastra para girarlo.');
    n.replaceChildren(cv);
    const e = { id: n.dataset.fig, box: n, cv, ctx: cv.getContext('2d'), yaw: 0, last: 0, vis: false, big, dirty: true };
    n._fig = e;
    entries.add(e);
    draggable(e);
    io.observe(n);
  }
  kick();
}

export { MOVES };
