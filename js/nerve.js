// Escena 3D del encabezado: una fibra gruesa con vaina (el impulso salta entre huecos)
// y varias fibras finas sin vaina (las que se dañan en la polineuropatía de fibra pequeña).
import * as THREE from 'three';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function mountNerve(canvas) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const group = new THREE.Group();
  scene.add(group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 6, 8);
  scene.add(key);

  const colors = () => ({
    myelin: new THREE.Color(css('--myelin') || '#d9d2bf'),
    axon: new THREE.Color(css('--axon') || '#1f6f78'),
    pulse: new THREE.Color(css('--pulse') || '#e3a33b'),
    thin: new THREE.Color(css('--thin') || '#7d9a9c'),
  });
  let c = colors();

  // Fibra gruesa: curva suave que cruza la escena
  const main = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-9, -2.6, -1), new THREE.Vector3(-4, -0.6, 0.6),
    new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(4, 0.8, -0.8), new THREE.Vector3(9, 2.4, 0.4),
  ]);
  const axonMat = new THREE.MeshStandardMaterial({ color: c.axon, roughness: 0.5 });
  group.add(new THREE.Mesh(new THREE.TubeGeometry(main, 300, 0.07, 10), axonMat));

  // Vaina de mielina en tramos, con huecos (nódulos) entre ellos
  const myelinMat = new THREE.MeshStandardMaterial({ color: c.myelin, roughness: 0.35, metalness: 0.05 });
  const segs = 22, nodes = [];
  for (let i = 0; i < segs; i++) {
    const a = i / segs + 0.006, b = (i + 1) / segs - 0.006;
    const pts = [];
    for (let k = 0; k <= 8; k++) pts.push(main.getPointAt(a + (b - a) * k / 8));
    const sub = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(sub, 24, 0.2, 18);
    // Estrechar los extremos para que cada tramo parezca una cápsula
    const pos = geo.attributes.position, n = 25, r = 19;
    for (let s = 0; s < n; s++) {
      const t = s / (n - 1), taper = Math.sin(Math.PI * t) ** 0.35;
      const center = sub.getPointAt(t);
      for (let j = 0; j < r; j++) {
        const idx = s * r + j;
        const v = new THREE.Vector3().fromBufferAttribute(pos, idx).sub(center).multiplyScalar(taper).add(center);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
    group.add(new THREE.Mesh(geo, myelinMat));
    nodes.push((i + 1) / segs);
  }

  // Fibras finas, sin vaina, más lentas; dos de ellas se interrumpen (daño)
  const thinMat = new THREE.MeshStandardMaterial({ color: c.thin, roughness: 0.6, transparent: true, opacity: 0.85 });
  const thin = [];
  const rand = mulberry(7);
  for (let f = 0; f < 7; f++) {
    const y0 = -4 + f * 1.25, pts = [];
    for (let k = 0; k <= 6; k++) {
      pts.push(new THREE.Vector3(-10 + k * 3.4, y0 + Math.sin(k * 0.9 + f) * 0.9 + (rand() - 0.5), -3 - rand() * 3));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const broken = f === 2 || f === 5;
    const end = broken ? 0.55 + rand() * 0.15 : 1;
    const piece = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, k) => curve.getPointAt(end * k / 39)));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(piece, 120, 0.028, 6), thinMat));
    thin.push({ curve, end, speed: 0.05 + rand() * 0.03, t: rand() });
  }

  // Impulsos: luces que viajan
  const glowTex = makeGlow();
  const sprite = (scale) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c.pulse, transparent: true, depthWrite: false, blending: THREE.NormalBlending }));
    s.scale.setScalar(scale);
    group.add(s);
    return s;
  };
  const mainPulse = sprite(1.3);
  const thinPulses = thin.map(() => sprite(0.55));

  let baseX = 0, w = 0, h = 0, mx = 0, my = 0, t0 = performance.now(), visible = true;
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.position.z = camera.aspect < 0.9 ? 24 : 15;
    baseX = camera.aspect > 1.2 ? 3.2 : 0;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
  document.addEventListener('themechange', recolor);
  function recolor() {
    c = colors();
    axonMat.color.copy(c.axon); myelinMat.color.copy(c.myelin); thinMat.color.copy(c.thin);
    [mainPulse, ...thinPulses].forEach((s) => s.material.color.copy(c.pulse));
  }

  function frame(now) {
    const t = Math.max(0, now - t0) / 1000;
    // Conducción saltatoria: el impulso salta de hueco en hueco
    const hop = 0.16, idx = Math.floor(t / hop) % nodes.length, frac = (t % hop) / hop;
    const a = idx === 0 ? 0 : nodes[idx - 1], b = nodes[idx];
    const ease = frac < 0.7 ? 0 : (frac - 0.7) / 0.3;
    mainPulse.position.copy(main.getPointAt(Math.min(a + (b - a) * ease, 1)));
    mainPulse.material.opacity = 0.55 + 0.45 * Math.sin(frac * Math.PI);
    thin.forEach((f, i) => {
      f.t = (f.t + f.speed / 60) % 1;
      const p = thinPulses[i];
      p.visible = f.t < f.end;
      p.position.copy(f.curve.getPointAt(Math.min(f.t, 1)));
    });
    group.rotation.y += ((mx * 0.35) - group.rotation.y) * 0.04;
    group.rotation.x += ((my * 0.2) - group.rotation.x) * 0.04;
    group.position.set(baseX, 1.2 - scrollY * 0.002, 0);
    renderer.render(scene, camera);
  }
  if (reduce) { frame(t0 + 2000); return; }
  renderer.setAnimationLoop((now) => { if (visible) frame(now); });
}

function makeGlow() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
