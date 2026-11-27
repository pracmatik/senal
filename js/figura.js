// Muñeco 3D de Christian para cada ejercicio. Un solo motor WebGL compartido que pinta en el
// lienzo de cada ficha visible. Los movimientos viven en movimientos.js.
import * as THREE from 'three';
import { MOVES, BASES } from './movimientos.js?v=17';

const D = Math.PI / 180;
const SIZE = 1024;
const COL = { skin: 0xd9a27a, shirt: 0x3a4047, shorts: 0x26292e, sock: 0xeeece6, sole: 0x45484d, hair: 0x241c1a, eye: 0x221a1c, lip: 0xa8584f, glow: 0xf08a4b };
const LEN = { th: 0.42, sh: 0.4, ua: 0.28, fa: 0.25 };
const REG = ['armL', 'armR', 'handL', 'handR', 'legL', 'legR', 'footL', 'footR', 'torso', 'neck'];
const GROUPS = { arms: ['armL', 'armR', 'handL', 'handR'], legs: ['legL', 'legR', 'footL', 'footR'], feet: ['footL', 'footR'], hands: ['handL', 'handR'],
  armL: ['armL', 'handL'], armR: ['armR', 'handR'], legL: ['legL', 'footL'], legR: ['legR', 'footR'], all: REG };

let R3, scene, cam, rig, ghost, props, shadow, io, raf = 0;
const entries = new Set();
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  J['wr' + side] = joint(J['el' + side], 0, -LEN.fa, 0, ball(0.042, M(h, 'skin'), 0, -0.045, 0, 0.9, 1.1, 0.42), ball(0.017, M(h, 'skin'), 0.036 * -s, -0.038, 0.016, 1, 1.9, 1));
  J['fi' + side] = joint(J['wr' + side], 0, -0.088, 0, ball(0.036, M(h, 'skin'), 0, -0.032, 0, 0.95, 1.15, 0.38));
}
function buildLeg(J, side, M) {
  const s = side === 'L' ? 1 : -1, l = 'leg' + side, f = 'foot' + side;
  J['hip' + side] = joint(J.pelvis, 0.09 * s, -0.04, 0, ball(0.08, M(l, 'shorts')), limb(0.083, 0.07, 0.2, M(l, 'shorts')), limb(0.072, 0.052, LEN.th, M(l, 'skin')));
  J['kn' + side] = joint(J['hip' + side], 0, -LEN.th, 0, ball(0.054, M(l, 'skin')), limb(0.052, 0.036, LEN.sh, M(l, 'skin')));
  J['an' + side] = joint(J['kn' + side], 0, -LEN.sh, 0, ball(0.038, M(f, 'sock')), ball(0.055, M(f, 'sock'), 0, -0.028, 0.035, 0.8, 0.62, 1.45), box(0.082, 0.014, 0.15, M(f, 'sole'), 0, -0.058, 0.035));
  J['to' + side] = joint(J['an' + side], 0, -0.04, 0.11, ball(0.042, M(f, 'sock'), 0, 0.004, 0.03, 1, 0.55, 1.1), box(0.08, 0.014, 0.07, M(f, 'sole'), 0, -0.018, 0.03));
}
function buildFace(head, M) {
  const k = (kind) => M('neck', kind);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.104, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), k('hair'));
  cap.position.set(0, 0.112, -0.008); cap.rotation.x = -0.38; cap.scale.set(0.98, 1.04, 1.04);
  head.add(cap, ball(0.085, k('hair'), 0, 0.09, -0.045, 1.08, 1.05, 0.9));
  for (const s of [1, -1]) {
    head.add(ball(0.0115, k('eye'), 0.032 * s, 0.112, 0.091));
    const brow = box(0.03, 0.007, 0.01, k('hair'), 0.033 * s, 0.135, 0.092); brow.rotation.z = 0.12 * s; head.add(brow);
    head.add(ball(0.02, k('skin'), 0.088 * s, 0.1, 0.005, 0.5, 1, 0.8));
  }
  head.add(ball(0.014, k('skin'), 0, 0.093, 0.104, 1, 1.2, 1));
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0045, 8, 20, Math.PI), k('lip'));
  mouth.position.set(0, 0.068, 0.094); mouth.rotation.set(-0.25, 0, Math.PI); head.add(mouth);
}
/* ---------- zonas del mapa de dolor ---------- */
// Cada zona es un volumen transparente pegado a una articulación del muñeco: sirve para tocar y, si se pinta, para brillar.
// [articulación, centro x y z, radios x y z]. La x se espeja en el lado derecho. Las zonas con lado llevan -i o -d.
const ZS = {
  cuello: ['neck', 0, 0.04, 0.004, 0.062, 0.07, 0.062],
  'espalda-alta': ['chest', 0, 0.12, -0.085, 0.15, 0.12, 0.075],
  lumbar: ['spine', 0, 0.1, -0.1, 0.125, 0.1, 0.075],
  hombro: ['sh', 0.012, 0, 0, 0.082, 0.082, 0.082],
  codo: ['el', 0, 0, 0, 0.062, 0.062, 0.062],
  muneca: ['wr', 0, 0, 0, 0.052, 0.052, 0.052],
  mano: ['wr', 0, -0.1, 0, 0.05, 0.075, 0.036],
  cadera: ['hip', 0.02, 0.01, 0, 0.1, 0.1, 0.17],
  rodilla: ['kn', 0, 0, 0.012, 0.092, 0.085, 0.09],
  tobillo: ['an', 0, 0, 0, 0.055, 0.055, 0.055],
  pie: ['an', 0, -0.045, 0.035, 0.068, 0.05, 0.1],
  'dedos-pie': ['to', 0, 0, 0.045, 0.05, 0.036, 0.05],
};
const SIDED = new Set(['hombro', 'codo', 'muneca', 'mano', 'cadera', 'rodilla', 'tobillo', 'pie', 'dedos-pie']);
export const ZONE_IDS = Object.keys(ZS).flatMap((k) => (SIDED.has(k) ? [`${k}-i`, `${k}-d`] : [k]));
const ZGEO = new THREE.SphereGeometry(1, 18, 12);
function buildZones(J) {
  const out = [];
  for (const id of ZONE_IDS) {
    const side = id.endsWith('-i') ? 'L' : id.endsWith('-d') ? 'R' : '', k = side ? id.slice(0, -2) : id;
    const [jn, x, y, z, rx, ry, rz] = ZS[k], s = side === 'R' ? -1 : 1;
    const m = new THREE.Mesh(ZGEO, new THREE.MeshBasicMaterial({ color: 0xd8232a, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }));
    m.position.set(x * s, y, z); m.scale.set(rx, ry, rz);
    m.visible = false; m.renderOrder = 3; m.userData.zone = id;
    J[jn + side].add(m); out.push(m);
  }
  return out;
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
  if (!ghostMode) buildFace(J.head, M);
  for (const s of ['L', 'R']) { buildArm(J, s, M); buildLeg(J, s, M); }
  return { root: J.root, J, zones: ghostMode ? [] : buildZones(J) };
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
  const pale = new THREE.MeshStandardMaterial({ color: 0xe8e5de, roughness: 0.9 });
  const P = { chair: chair(wood), chairFront: chair(wood), chairSide: chair(wood) };
  P.chairFront.rotation.y = Math.PI; P.chairFront.position.set(0, 0, 0.28);
  P.chairSide.rotation.y = -Math.PI / 2; P.chairSide.position.set(0.5, 0, 0.05);
  P.wall = box(1.6, 2.1, 0.06, pale, 0, 1.05, 0.95);
  P.mat = box(2.0, 0.025, 0.7, new THREE.MeshStandardMaterial({ color: 0x8d949c, roughness: 0.95 }), 0.1, 0.012, 0);
  P.pillow = ball(0.16, pale, 0.62, 0.2, 0, 1.4, 0.6, 1.6);
  P.ball = ball(0.045, new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5 }));
  P.bottleL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.17, 16), new THREE.MeshStandardMaterial({ color: 0x7fc7e8, roughness: 0.2, transparent: true, opacity: 0.85 }));
  P.bottleR = P.bottleL.clone();
  P.table = new THREE.Group();
  P.table.add(box(1.0, 0.04, 0.6, wood, 0, 0.74, 0), box(0.05, 0.72, 0.05, wood, -0.44, 0.36, 0.24), box(0.05, 0.72, 0.05, wood, 0.44, 0.36, 0.24), box(0.05, 0.72, 0.05, wood, -0.44, 0.36, -0.24), box(0.05, 0.72, 0.05, wood, 0.44, 0.36, -0.24));
  P.table.position.set(0, 0, 0.5);
  P.towel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), new THREE.MeshStandardMaterial({ color: 0x5d6670, roughness: 0.9 }));
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

// Zonas del mapa de dolor: solo se ven las que esta ficha pide. paint = { zona: { c: color, o: opacidad, p: late } }
function paintZones(paint, t) {
  for (const m of rig.zones) {
    const z = paint?.[m.userData.zone];
    m.visible = !!z;
    if (z) { m.material.color.setHex(z.c); m.material.opacity = z.o * (z.p && !still ? 0.85 + 0.15 * Math.sin(t / 230) : 1); }
  }
}

function init() {
  if (R3) return true;
  try {
    R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  } catch { return false; }
  R3.setPixelRatio(1); R3.setSize(SIZE, SIZE, false); R3.setClearColor(0, 0);
  R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = 1.15;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6ee, 0x6b6f76, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(2, 4, 3); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xdfe4f2, 0.9); rim.position.set(-3, 2, -2); scene.add(rim);
  cam = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  rig = buildRig(false); ghost = buildRig(true);
  scene.add(rig.root, ghost.root);
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const g = sc.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(20,23,26,.32)'); gr.addColorStop(1, 'rgba(20,23,26,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);
  props = buildProps();
  return true;
}

/* ---------- pintar ---------- */
// Colocar el muñeco y la cámara como los pide esta ficha (sirve para pintar y para saber qué se toca)
function prepare(e, t) {
  const { m, base, f, pk } = frames(e.id);
  const p = still ? f[pk] : poseAt(e.id, t);
  applyPose(rig.J, p);
  rig.root.updateMatrixWorld(true);
  ghost.root.visible = f.length > 1 && m.ghost !== false;
  if (ghost.root.visible) applyPose(ghost.J, f[pk]);
  setGlow(p.hi ?? m.hi, t);
  paintZones(e.paint, t);
  placeProps(m, rig.J);
  const c = { ...base.cam, ...(m.cam || {}) }, az = (c.az + e.yaw) * D, el = c.el * D;
  cam.position.set(c.t[0] + c.d * Math.sin(az) * Math.cos(el), c.t[1] + c.d * Math.sin(el), c.t[2] + c.d * Math.cos(az) * Math.cos(el));
  cam.lookAt(c.t[0], c.t[1], c.t[2]);
  shadow.position.set(base.lie ? 0.1 : c.t[0], 0.003, base.lie ? 0 : 0.1);
  shadow.scale.set(base.lie ? 1.6 : 1, base.lie ? 0.7 : 1, 1);
  e.t = t;
}
function render(e, t) {
  prepare(e, t);
  const w = e.cv.width;
  R3.setViewport(0, 0, w, w); R3.setScissor(0, 0, w, w); R3.setScissorTest(true);
  R3.render(scene, cam);
  e.ctx.clearRect(0, 0, w, w);
  e.ctx.drawImage(R3.domElement, 0, SIZE - w, w, w, 0, 0, w, w);
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
    const big = !!n.closest('dialog') || 'big' in n.dataset;
    const cv = document.createElement('canvas');
    const px = Math.round((n.clientWidth || (big ? 420 : 160)) * Math.min(devicePixelRatio || 1, 2.5));
    cv.width = cv.height = Math.max(240, Math.min(SIZE, px));
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

/* ---------- mapa de dolor: pintar, tocar, girar ---------- */
export function paintFigure(node, paint) {
  const e = node._fig; if (!e) return;
  e.paint = paint; e.dirty = true; kick();
}
export function turnFigure(node, yaw) {
  const e = node._fig; if (!e) return;
  e.yaw = yaw; e.dirty = true; kick();
}
export const figureYaw = (node) => node._fig?.yaw ?? 0;

const RAY = new THREE.Raycaster(), NDC = new THREE.Vector2(), PT = new THREE.Vector3();
// Qué zona hay en este punto de la pantalla. Primero se lanza un rayo contra el muñeco (el cuerpo tapa lo que tiene detrás);
// si el dedo cae un poco al lado, se coge la zona visible más cercana dentro de 24 píxeles.
export function pickZone(node, clientX, clientY) {
  const e = node._fig;
  if (!e || !R3) return null;
  prepare(e, e.t || 0);
  cam.updateMatrixWorld();
  const r = e.cv.getBoundingClientRect(), px = clientX - r.left, py = clientY - r.top;
  const meshes = [];
  rig.root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const first = (x, y) => { NDC.set(x, y); RAY.setFromCamera(NDC, cam); return RAY.intersectObjects(meshes, false)[0]; };
  const hit = first((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
  if (hit?.object.userData.zone) return hit.object.userData.zone;
  let best = null, bd = 24;
  for (const m of rig.zones) {
    m.getWorldPosition(PT).project(cam);
    const d = Math.hypot((PT.x + 1) / 2 * r.width - px, (1 - PT.y) / 2 * r.height - py);
    if (d >= bd) continue;
    const h = first(PT.x, PT.y);          // ¿se ve esa zona, o la tapa el cuerpo?
    if (h?.object === m) { best = m.userData.zone; bd = d; }
  }
  return best;
}

// Foto del muñeco tal como está ahora, para el resumen que se imprime
export function snapshotFigure(node) {
  const e = node._fig;
  if (!e || !R3) return '';
  render(e, e.t || 0);
  try { return e.cv.toDataURL('image/png'); } catch { return ''; }
}

export { MOVES };
