// La persona 3D (hecha con MPFB, recursos CC0). El esqueleto invisible J de figura.js manda:
// aquí cada hueso de la persona copia su giro y su sitio.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const SCALE = 0.93; // para que piernas y tronco midan lo mismo que el esqueleto
const REG = ['armL', 'armR', 'handL', 'handR', 'legL', 'legR', 'footL', 'footR', 'torso', 'neck'];
const glow = { value: new Array(REG.length).fill(0) };
const glowColor = { value: new THREE.Color(0xf08a4b) };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Zonas de dolor pintadas sobre la propia piel: cada una es un óvalo (matriz que lo convierte en bola de radio 1)
const MAXZ = 21;
const zoneM = { value: Array.from({ length: MAXZ }, () => new THREE.Matrix4()) };
const zoneC = { value: Array.from({ length: MAXZ }, () => new THREE.Vector4()) };
const zoneN = { value: 0 }, TINT = new THREE.Color();
// list = [{ mesh, color, opacity }] con las matrices al día
export function setBodyZones(list) {
  zoneN.value = Math.min(list.length, MAXZ);
  list.slice(0, MAXZ).forEach(({ mesh, color, opacity }, i) => {
    zoneM.value[i].copy(mesh.matrixWorld).invert();
    TINT.setHex(color);
    zoneC.value[i].set(TINT.r, TINT.g, TINT.b, opacity);
  });
}

const url = new URL('../media/persona.glb', import.meta.url).href + '?v=3';
export const loadBody = () => new GLTFLoader().loadAsync(url).then((g) => g.scene);

/* ---------- cómo encaja cada hueso con el esqueleto ---------- */
// Giro que lleva el eje (d, s) de la persona al eje (d, s) del esqueleto en reposo.
function align(d0, s0, d1, s1) {
  const basis = (d, s) => {
    const y = d.clone().normalize(), z = s.clone().addScaledVector(y, -s.dot(y)).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(y.clone().cross(z), y, z));
  };
  return basis(d1, s1).multiply(basis(d0, s0).invert());
}
function calibrate(pos, side) {
  const x = side === 'L' ? 1 : -1, l = side.toLowerCase(), at = (n) => pos[`${n}_${l}`];
  const dir = (a, b) => at(b).clone().sub(at(a));
  const down = V(0, -1, 0), front = V(0, 0, 1), inward = V(-x, 0, 0);
  const width = dir('pinky_01', 'index_01'), foot = dir('foot', 'ball');
  return {
    upperarm: align(dir('upperarm', 'lowerarm'), dir('lowerarm', 'hand'), down, front),
    lowerarm: align(dir('lowerarm', 'hand'), width, down, inward),
    hand: align(dir('hand', 'middle_01'), width, down, inward),
    thigh: align(dir('thigh', 'calf'), front, down, front),
    calf: align(dir('calf', 'foot'), front, down, front),
    foot: align(foot, V(0, 1, 0), V(0, -0.04, 0.11), V(0, 1, 0)),
  };
}
// hueso: [articulación del esqueleto, giro de encaje, ¿copia también el sitio?]
function mapping(pos) {
  const I = new THREE.Quaternion();
  const map = { pelvis: ['pelvis', I], spine_01: ['spine', I], spine_02: ['spine', I, false, 'chest'], spine_03: ['chest', I], neck_01: ['neck', I], head: ['head', I] };
  for (const S of ['L', 'R']) {
    const q = calibrate(pos, S), l = S.toLowerCase();
    const set = (bone, j, c, move = false) => { map[`${bone}_${l}`] = [j + S, c, move]; };
    map[`clavicle_${l}`] = ['chest', I];
    set('upperarm', 'sh', q.upperarm, true); set('lowerarm', 'el', q.lowerarm, true); set('hand', 'wr', q.hand, true);
    set('thigh', 'hip', q.thigh, true); set('calf', 'kn', q.calf, true); set('foot', 'an', q.foot, true); set('ball', 'to', q.foot);
    for (const f of ['index', 'middle', 'ring', 'pinky']) [0.55, 1.2, 1.6].forEach((k, i) => {
      map[`${f}_0${i + 1}_${l}`] = ['wr' + S, q.hand, false, null, { side: S, k }];
    });
  }
  return map;
}

/* ---------- aspecto ---------- */
function regionOf(bone) {
  const s = bone.endsWith('_r') ? 'R' : 'L';
  if (/^(upperarm|lowerarm|clavicle)/.test(bone)) return 'arm' + s;
  if (/^(hand|thumb|index|middle|ring|pinky)/.test(bone)) return 'hand' + s;
  if (/^(thigh|calf)/.test(bone)) return 'leg' + s;
  if (/^(foot|ball)/.test(bone)) return 'foot' + s;
  return /^(neck|head)/.test(bone) ? 'neck' : 'torso';
}
// Cada vértice recuerda a qué parte del cuerpo pertenece, para poder iluminar la que trabaja
function tagRegions(mesh) {
  const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
  const ids = mesh.skeleton.bones.map((b) => REG.indexOf(regionOf(b.name)));
  const out = new Float32Array(si.count);
  for (let i = 0; i < si.count; i++) {
    let best = 0;
    for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
    out[i] = ids[si.getComponent(i, best)];
  }
  mesh.geometry.setAttribute('aReg', new THREE.BufferAttribute(out, 1));
}
function addGlow(shader) {
  Object.assign(shader.uniforms, { uGlow: glow, uGlowColor: glowColor, uZone: zoneM, uZoneColor: zoneC, uZones: zoneN });
  shader.vertexShader = `attribute float aReg; uniform float uGlow[${REG.length}]; varying float vGlow; varying vec3 vWorld;\n` +
    shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = uGlow[int(aReg + 0.5)];')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = `uniform vec3 uGlowColor; varying float vGlow; varying vec3 vWorld;
uniform mat4 uZone[${MAXZ}]; uniform vec4 uZoneColor[${MAXZ}]; uniform int uZones;\n` +
    shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, uGlowColor * (0.6 + diffuseColor.g * 0.8), vGlow);`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
for (int i = 0; i < ${MAXZ}; i++) {
  if (i >= uZones) break;
  float d = length((uZone[i] * vec4(vWorld, 1.0)).xyz);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, pow(uZoneColor[i].rgb, vec3(0.4545)), uZoneColor[i].a * (1.0 - smoothstep(0.85, 1.35, d)));
}`);
}
function dress(mesh) {
  const m = mesh.material, name = m.name.toLowerCase();
  const cut = /eyebrow|eyelash/.test(name) ? 0.2 : /short02|low-poly|eye/.test(name) ? 0.45 : 0;
  m.transparent = false; m.depthWrite = true; m.alphaTest = cut; m.metalness = 0;
  m.roughness = /body/.test(name) ? 0.62 : /low-poly/.test(name) ? 0.25 : 0.85;
  if (m.map) m.map.anisotropy = 8;
  m.onBeforeCompile = addGlow;
}

export function setBodyGlow(want, k) {
  REG.forEach((r, i) => { glow.value[i] = want.has(r) ? 0.4 + k * 0.6 : 0; });
}

/* ---------- construir y mover ---------- */
export function makeBody(source, ghostMaterial) {
  const root = clone(source);
  root.scale.setScalar(SCALE);
  root.updateMatrixWorld(true);
  const bones = [], meshes = [], pos = {}, rest = {};
  root.traverse((o) => {
    if (o.isSkinnedMesh) meshes.push(o);
    if (!o.isBone) return;
    bones.push(o); // traverse va de padre a hijo
    pos[o.name] = o.getWorldPosition(V(0, 0, 0));
    rest[o.name] = o.getWorldQuaternion(new THREE.Quaternion());
  });
  const missing = ['pelvis', 'hand_l', 'foot_r', 'head'].filter((n) => !pos[n]);
  if (missing.length) throw new Error('persona.glb sin huesos: ' + missing.join(', '));
  for (const m of meshes) {
    m.frustumCulled = false;
    if (ghostMaterial) m.material = ghostMaterial; else { tagRegions(m); dress(m); }
  }
  // La pelvis se coloca respecto al punto medio de las caderas
  const hips = pos.thigh_l.clone().add(pos.thigh_r).multiplyScalar(0.5);
  return { root, bones, meshes, map: mapping(pos), rest, pelvisOff: pos.pelvis.clone().sub(hips) };
}

const QJ = new THREE.Quaternion(), QB = new THREE.Quaternion(), QC = new THREE.Quaternion(), QP = new THREE.Quaternion();
const P = new THREE.Vector3(), P2 = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
function worldPosition(body, bone, J, joint) {
  if (bone.name !== 'pelvis') return J[joint].getWorldPosition(P);
  J.hipL.getWorldPosition(P).add(J.hipR.getWorldPosition(P2)).multiplyScalar(0.5);
  J.pelvis.getWorldQuaternion(QC);
  return P.add(P2.copy(body.pelvisOff).applyQuaternion(QC));
}
// J ya debe tener la postura puesta y las matrices al día
export function poseBody(body, J, p) {
  for (const b of body.bones) {
    const m = body.map[b.name];
    if (!m) continue;
    const [joint, fit, move, half, finger] = m;
    J[joint].getWorldQuaternion(QJ);
    if (half) QJ.slerp(J[half].getWorldQuaternion(QC), 0.5);
    if (finger) QJ.multiply(QC.setFromAxisAngle(X, (Math.max(p['f' + finger.side] || 0, 12) * finger.k * Math.PI) / 180));
    QB.copy(QJ).multiply(fit).multiply(body.rest[b.name]);
    b.parent.updateWorldMatrix(true, false);
    b.quaternion.copy(b.parent.getWorldQuaternion(QP).invert().multiply(QB));
    if (move || b.name === 'pelvis') b.position.copy(b.parent.worldToLocal(worldPosition(body, b, J, joint)));
    if (b.name === 'spine_03') b.scale.setScalar(1 + (p.br || 0) * 0.05);
    b.updateWorldMatrix(false, false);
  }
}
