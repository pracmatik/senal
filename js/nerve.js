// Fondo 3D de toda la página: una fibra gruesa con vaina (el impulso salta entre huecos)
// y fibras finas sin vaina, las que se dañan en la polineuropatía de fibra pequeña.
// Al bajar por la página la escena cuenta una historia: se acerca a las fibras dañadas,
// se aviva en los ensayos, las fibras cortadas vuelven a crecer en células iPS y se abre
// a toda la red en sistema nervioso. La velocidad del scroll acelera los impulsos.
import * as THREE from 'three';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const lerp = (a, b, t) => a + (b - a) * t;

// Un fotograma clave por sección: cámara, giro, opacidad, regeneración y velocidad
const KEYS = [
  { z: 15, y: 0, ry: 0, rx: 0, x: 3.2, op: 1, grow: 0, speed: 1, thin: 0.85 },    // portada
  { z: 11.5, y: -2.6, ry: -0.28, rx: 0.12, x: 6, op: 0.24, grow: 0, speed: 0.8, thin: 1 }, // fibra pequeña
  { z: 12, y: -1, ry: 0.22, rx: -0.05, x: 6, op: 0.22, grow: 0.2, speed: 1.8, thin: 0.9 }, // ensayos
  { z: 10, y: -1.8, ry: 0.4, rx: 0.08, x: -4.5, op: 0.3, grow: 1, speed: 1.2, thin: 1 },   // células iPS
  { z: 22, y: 0.5, ry: -0.15, rx: 0, x: 4, op: 0.22, grow: 1, speed: 1.4, thin: 0.8 },      // sistema nervioso
  { z: 14, y: -0.5, ry: 0.1, rx: 0, x: 5, op: 0.2, grow: 1, speed: 1, thin: 0.8 },        // entender
];
const SECTIONS = ['.hero', '#hoy', '#ensayos', '#ips', '#neuro', '#entender'];

export function mountNerve(canvas) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 15);
  const group = new THREE.Group();
  scene.add(group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 6, 8);
  scene.add(key);

  const colors = () => ({
    myelin: new THREE.Color(css('--myelin') || '#d9d2bf'), axon: new THREE.Color(css('--axon') || '#1f6f78'),
    pulse: new THREE.Color(css('--pulse') || '#e3a33b'), thin: new THREE.Color(css('--thin') || '#7d9a9c'),
  });
  let c = colors();

  const main = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-9, -2.6, -1), new THREE.Vector3(-4, -0.6, 0.6),
    new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(4, 0.8, -0.8), new THREE.Vector3(9, 2.4, 0.4),
  ]);
  const axonMat = new THREE.MeshStandardMaterial({ color: c.axon, roughness: 0.5 });
  group.add(new THREE.Mesh(new THREE.TubeGeometry(main, 300, 0.07, 10), axonMat));
  const myelinMat = new THREE.MeshStandardMaterial({ color: c.myelin, roughness: 0.35, metalness: 0.05 });
  const nodes = buildMyelin(main, myelinMat, group);

  // Fibras finas a todo lo largo; las dañadas se dibujan solo hasta su corte (drawRange)
  const thinMat = new THREE.MeshStandardMaterial({ color: c.thin, roughness: 0.6, transparent: true, opacity: 0.85 });
  const growMat = new THREE.MeshStandardMaterial({ color: c.pulse, roughness: 0.4, emissive: c.pulse, emissiveIntensity: 0.25 });
  const rand = mulberry(7), thin = [];
  for (let f = 0; f < 9; f++) {
    const y0 = -5 + f * 1.25, pts = [];
    for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(-11 + k * 3.7, y0 + Math.sin(k * 0.9 + f) * 0.9 + (rand() - 0.5), -3 - rand() * 3));
    const curve = new THREE.CatmullRomCurve3(pts);
    const broken = f === 2 || f === 5 || f === 7;
    const geo = new THREE.TubeGeometry(curve, 160, 0.03, 6);
    const mesh = new THREE.Mesh(geo, thinMat);
    group.add(mesh);
    const fiber = { curve, mesh, total: geo.index.count, end: broken ? 0.45 + rand() * 0.2 : 1, speed: 0.05 + rand() * 0.03, t: rand() };
    if (broken) { // tramo que vuelve a crecer, en otro color
      fiber.regrow = new THREE.Mesh(geo.clone(), growMat);
      group.add(fiber.regrow);
    }
    thin.push(fiber);
  }

  // Polvo en suspensión para dar profundidad; se mueve con el scroll
  const dust = makeDust(c.thin);
  scene.add(dust);

  const glowTex = makeGlow();
  const sprite = (scale) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c.pulse, transparent: true, depthWrite: false }));
    s.scale.setScalar(scale); group.add(s); return s;
  };
  const mainPulse = sprite(1.3);
  const thinPulses = thin.map(() => sprite(0.55));

  let w = 0, h = 0, mx = 0, my = 0, t0 = performance.now(), wide = true, vel = 0, dir = 1, lastY = scrollY;
  const cur = { ...KEYS[0] };
  const resize = () => {
    w = innerWidth; h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    wide = camera.aspect > 1.2;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
  document.addEventListener('themechange', recolor);
  function recolor() {
    c = colors();
    axonMat.color.copy(c.axon); myelinMat.color.copy(c.myelin); thinMat.color.copy(c.thin);
    growMat.color.copy(c.pulse); growMat.emissive.copy(c.pulse); dust.material.color.copy(c.thin);
    [mainPulse, ...thinPulses].forEach((s) => s.material.color.copy(c.pulse));
  }

  // Posición continua en la historia: 0 = portada, 1 = fibra pequeña, ... según la sección visible
  function storyPos() {
    const mid = innerHeight * 0.55;
    const tops = SECTIONS.map((s) => document.querySelector(s)?.getBoundingClientRect().top ?? Infinity);
    for (let i = tops.length - 1; i >= 0; i--) {
      if (tops[i] <= mid) {
        const next = tops[i + 1] ?? tops[i] + innerHeight;
        return Math.min(i + Math.max(0, (mid - tops[i]) / Math.max(next - tops[i], 1)), KEYS.length - 1);
      }
    }
    return 0;
  }
  function target() {
    const p = storyPos(), i = Math.floor(p), f = p - i, a = KEYS[i], b = KEYS[Math.min(i + 1, KEYS.length - 1)];
    const e = f * f * (3 - 2 * f); // suavizado
    const out = {};
    for (const k in a) out[k] = lerp(a[k], b[k], e);
    if (!wide) { out.x = 0; out.z += 8; out.op = p < 0.5 ? lerp(1, 0.16, p * 2) : Math.min(out.op, 0.16); }
    return out;
  }

  function frame(now, still) {
    const t = Math.max(0, now - t0) / 1000;
    const goal = target(), k = still ? 1 : 0.06;
    for (const p in cur) cur[p] = lerp(cur[p], goal[p], k);
    const dy = scrollY - lastY; lastY = scrollY;
    vel = lerp(vel, Math.min(Math.abs(dy) / 40, 3), 0.15);
    if (dy) dir = Math.sign(dy);
    const boost = cur.speed * (1 + vel);

    const hop = 0.16 / boost, idx = Math.floor(t / hop) % nodes.length, frac = (t % hop) / hop;
    const a = idx === 0 ? 0 : nodes[idx - 1], b = nodes[idx];
    const ease = frac < 0.7 ? 0 : (frac - 0.7) / 0.3;
    mainPulse.position.copy(main.getPointAt(Math.min(a + (b - a) * ease, 1)));
    mainPulse.material.opacity = 0.55 + 0.45 * Math.sin(frac * Math.PI);

    thinMat.opacity = cur.thin;
    thin.forEach((f, i) => {
      const reach = f.end + (1 - f.end) * cur.grow;
      f.mesh.geometry.setDrawRange(0, snap(f.total * f.end));
      if (f.regrow) { f.regrow.visible = reach > f.end + 0.005; setRange(f, reach); }
      if (!still) f.t = (f.t + (f.speed * boost) / 60) % 1;
      const p = thinPulses[i];
      p.visible = f.t < reach;
      p.position.copy(f.curve.getPointAt(Math.min(f.t, 1)));
    });

    group.rotation.y = lerp(group.rotation.y, cur.ry + mx * 0.35, 0.05);
    group.rotation.x = lerp(group.rotation.x, cur.rx + my * 0.2, 0.05);
    group.rotation.z = lerp(group.rotation.z, vel * 0.04 * dir, 0.05);
    group.position.set(wide ? cur.x : 0, 1.2 - cur.y, 0);
    camera.position.set(0, 0, cur.z);
    dust.position.y = (scrollY / Math.max(document.body.scrollHeight, 1)) * 6;
    dust.rotation.y = t * 0.01;
    canvas.style.opacity = cur.op.toFixed(3);
    renderer.render(scene, camera);
  }

  if (reduce) {
    let q = false;
    const draw = () => { q = false; frame(t0 + 2000, true); };
    addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(draw); } }, { passive: true });
    addEventListener('resize', draw);
    draw();
    return;
  }
  let hidden = false;
  document.addEventListener('visibilitychange', () => (hidden = document.hidden));
  renderer.setAnimationLoop((now) => { if (!hidden) frame(now, false); });
}

// El tramo regenerado es la misma malla dibujada desde el corte hasta donde ha crecido
function setRange(f, reach) {
  const geo = f.regrow.geometry;
  const start = snap(f.total * f.end);
  geo.setDrawRange(start, Math.max(0, snap(f.total * reach) - start));
}
const snap = (n) => Math.floor(n / 6) * 6;

function buildMyelin(main, mat, group) {
  const segs = 22, nodes = [];
  for (let i = 0; i < segs; i++) {
    const a = i / segs + 0.006, b = (i + 1) / segs - 0.006, pts = [];
    for (let k = 0; k <= 8; k++) pts.push(main.getPointAt(a + (b - a) * k / 8));
    const sub = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(sub, 24, 0.2, 18);
    const pos = geo.attributes.position, n = 25, r = 19, v = new THREE.Vector3();
    for (let s = 0; s < n; s++) { // estrechar los extremos: cada tramo parece una cápsula
      const t = s / (n - 1), taper = Math.sin(Math.PI * t) ** 0.35, center = sub.getPointAt(t);
      for (let j = 0; j < r; j++) {
        v.fromBufferAttribute(pos, s * r + j).sub(center).multiplyScalar(taper).add(center);
        pos.setXYZ(s * r + j, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
    group.add(new THREE.Mesh(geo, mat));
    nodes.push((i + 1) / segs);
  }
  return nodes;
}

function makeDust(color) {
  const rand = mulberry(11), n = 260, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (rand() - 0.5) * 34; pos[i * 3 + 1] = (rand() - 0.5) * 30; pos[i * 3 + 2] = -2 - rand() * 14; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false }));
}

function makeGlow() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
