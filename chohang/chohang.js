// Working for oneself (lifehome): moving people's things (chở hàng thuê, dọn nhà) on a motorised three-wheeler, a
// xe ba gác: a motorbike's front, a flatbed on two wheels behind. Bought on the board (J) and kept at home; got on and
// off with E like any vehicle. With the trade on, the board offers a move: a household on one street has its
// things out on the sidewalk (boxes, a television, a small fridge, a fan, a rolled mattress, a stack of stools, a
// mirror); ride there, carry each piece to the bed (F) and set it in its place; ride to the new house and carry them
// to its door (F). The pay is the app's (life.py › move_done): by the pieces and the distance. What can go wrong:
// knock into something with a load on and the glass and china break; take a corner fast and a piece slides off the
// bed onto the road (and breaks if it can): stop, pick it up and load it again. Every piece broken is paid for.
//
// createMover(host) → a trade for the hub: { fillBoard, update, hint, key, set }

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { t } from '/i18n.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (n) => Number(n).toLocaleString('vi-VN');
const pickOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------- the xe ba gác (+z ahead, x to the rider's left)
const SPEC = { name: () => t('Xe ba gác'), speed: 8.6, accel: 2.6, turn: 1.15, wheel: 0.28, battery: false, range: 0, lean: 0 };
const FLOOR = 0.64;                         // the bed's boards, from the ground
const ROWS = [-0.95, -1.38, -1.81, -2.24, -2.67];   // the bed's rows (z), front to back; two places in each (x = ±0.3)
const REAR = -3.0;                          // the back of the bed (for the walls)

function tube(a, b, r, seg = 8) {
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function mesh(geos, mat) { const m = new THREE.Mesh(mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g))), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function wheel(r) {
  const g = new THREE.Group();
  g.add(mesh([new THREE.TorusGeometry(r - 0.05, 0.05, 10, 30).rotateY(Math.PI / 2)], std(0x171717, { roughness: 0.85 })));
  g.add(mesh([new THREE.CylinderGeometry(r - 0.1, r - 0.1, 0.07, 18).rotateZ(Math.PI / 2), new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10).rotateZ(Math.PI / 2)], std(0x9da3a8, { metalness: 0.7, roughness: 0.35 })));
  return g;
}
// planks: a wood texture drawn once
function woodTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  for (let k = 0; k < 8; k++) {
    g.fillStyle = `hsl(${28 + Math.random() * 6}, ${32 + Math.random() * 10}%, ${34 + Math.random() * 10}%)`; g.fillRect(0, k * 32, 256, 32);
    g.strokeStyle = 'rgba(30,18,8,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, k * 32 + 1); g.lineTo(256, k * 32 + 1); g.stroke();
    g.strokeStyle = 'rgba(60,35,15,0.25)'; g.lineWidth = 1;
    for (let l = 0; l < 4; l++) { g.beginPath(); const y = k * 32 + 6 + Math.random() * 22; g.moveTo(0, y); g.bezierCurveTo(80, y + 3, 170, y - 3, 256, y + 1); g.stroke(); }
  }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function makeVan() {
  const g = new THREE.Group(), paint = std(0x2a6fb0, { roughness: 0.45, metalness: 0.25 }), dark = std(0x26282b, { roughness: 0.6 });
  const steel = std(0x3c6e9e, { roughness: 0.5, metalness: 0.35 }), chrome = std(0xc9cdd2, { metalness: 0.9, roughness: 0.25 });
  const W = SPEC.wheel, FA = V(0, W, 0.92), RA = -2.05;
  // the front: fork, mudguard, headlight, bars; the tank and seat over the engine; the floor where the feet go
  g.add(mesh([tube(FA.clone().setX(0.07), V(0.07, 0.98, 0.72), 0.022), tube(FA.clone().setX(-0.07), V(-0.07, 0.98, 0.72), 0.022), tube(V(0, 0.98, 0.72), V(0, 1.08, 0.66), 0.03)], chrome));
  g.add(mesh([new THREE.CylinderGeometry(W + 0.06, W + 0.06, 0.13, 20, 1, true, -0.4, Math.PI * 0.95).rotateZ(Math.PI / 2).translate(0, W, 0.92)], paint));
  g.add(mesh([tube(V(-0.36, 1.1, 0.62), V(0.36, 1.1, 0.62), 0.013), tube(V(0, 1.08, 0.66), V(0, 1.1, 0.63), 0.02)], chrome));
  g.add(mesh([tube(V(-0.38, 1.1, 0.62), V(-0.28, 1.1, 0.62), 0.02), tube(V(0.28, 1.1, 0.62), V(0.38, 1.1, 0.62), 0.02)], dark));
  const lampM = std(0xfff6d8, { emissive: 0x665d40, roughness: 0.2 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.07, 16).rotateX(Math.PI / 2), lampM); lamp.position.set(0, 0.98, 0.79); g.add(lamp);
  g.add(mesh([new THREE.CylinderGeometry(0.095, 0.095, 0.06, 16, 1, true).rotateX(Math.PI / 2).translate(0, 0.98, 0.77)], paint));
  // the frame: a spine from the head down and back under the seat to the bed's cross-member
  g.add(mesh([tube(V(0, 1.0, 0.66), V(0, 0.45, 0.25), 0.04), tube(V(0, 0.45, 0.25), V(0, 0.42, -0.6), 0.045),
    tube(V(0.2, 0.42, -0.55), V(0.2, 0.5, -3.0), 0.04), tube(V(-0.2, 0.42, -0.55), V(-0.2, 0.5, -3.0), 0.04), tube(V(-0.25, 0.42, -0.6), V(0.25, 0.42, -0.6), 0.04)], dark));
  // the engine under the seat, the tank, the seat
  g.add(mesh([box(0.26, 0.26, 0.36, 0, 0.42, -0.02), new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12).rotateZ(Math.PI / 2).translate(0, 0.36, 0.06)], std(0x4a4d52, { metalness: 0.5, roughness: 0.45 })));
  g.add(mesh([tube(V(-0.12, 0.3, -0.05), V(-0.12, 0.34, -0.55), 0.035)], chrome));   // the exhaust
  const tank = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), paint); tank.scale.set(0.95, 0.6, 1.4); tank.position.set(0, 0.8, 0.32); tank.castShadow = true; g.add(tank);
  const seat = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 8), std(0x1e1a17, { roughness: 0.8 })); seat.scale.set(0.95, 0.35, 1.6); seat.position.set(0, 0.82, -0.12); seat.castShadow = true; g.add(seat);
  g.add(mesh([box(0.5, 0.04, 0.3, 0, 0.36, 0.22)], dark));   // the footboard
  // the bed: steel frame, boards, low side rails, a high headboard behind the rider (a rack for long things)
  const boards = std(0xffffff, { map: woodTex(), roughness: 0.85 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.05, 2.45), boards); bed.position.set(0, FLOOR - 0.025, -1.78); bed.castShadow = true; bed.receiveShadow = true; g.add(bed);
  const rails = [box(1.38, 0.08, 0.06, 0, FLOOR - 0.04, -0.55), box(1.38, 0.08, 0.06, 0, FLOOR - 0.04, REAR),
    box(0.06, 0.08, 2.5, 0.69, FLOOR - 0.04, -1.78), box(0.06, 0.08, 2.5, -0.69, FLOOR - 0.04, -1.78)];
  for (const x of [-0.69, 0.69]) {   // the side rails: a top bar on short posts
    rails.push(box(0.04, 0.04, 2.48, x, FLOOR + 0.24, -1.78));
    for (const z of [-0.57, -1.2, -1.78, -2.36, -2.98]) rails.push(box(0.04, 0.26, 0.04, x, FLOOR + 0.12, z));
  }
  rails.push(box(1.38, 0.04, 0.04, 0, FLOOR + 0.24, REAR), box(0.04, 0.26, 0.04, 0, FLOOR + 0.12, REAR));
  for (const x of [-0.69, 0.69]) rails.push(box(0.05, 0.9, 0.05, x, FLOOR + 0.45, -0.57));   // the headboard
  rails.push(box(1.38, 0.05, 0.05, 0, FLOOR + 0.88, -0.57), box(1.38, 0.05, 0.05, 0, FLOOR + 0.5, -0.57));
  for (const x of [-0.45, -0.15, 0.15, 0.45]) rails.push(box(0.03, 0.4, 0.03, x, FLOOR + 0.69, -0.57));
  g.add(mesh(rails, steel));
  // the rear wheels on their axle under the bed, mudguards over them; a number plate and tail lights at the back
  g.add(mesh([tube(V(-0.6, W, RA), V(0.6, W, RA), 0.03), box(0.3, 0.12, 0.2, 0, W + 0.02, RA)], dark));
  g.add(mesh([0.5, -0.5].map((x) => new THREE.CylinderGeometry(W + 0.05, W + 0.05, 0.16, 18, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).translate(x, W, RA)), dark));
  const plateC = document.createElement('canvas'); plateC.width = 128; plateC.height = 64;
  const pg = plateC.getContext('2d'); pg.fillStyle = '#f2f2ee'; pg.fillRect(0, 0, 128, 64); pg.strokeStyle = '#111'; pg.lineWidth = 4; pg.strokeRect(2, 2, 124, 60);
  pg.fillStyle = '#111'; pg.font = 'bold 22px sans-serif'; pg.textAlign = 'center'; pg.fillText(`${50 + Math.floor(Math.random() * 30)}-B${Math.floor(Math.random() * 9) + 1}`, 64, 28); pg.fillText(String(10000 + Math.floor(Math.random() * 89999)).replace(/(\d{3})(\d{2})$/, '$1.$2'), 64, 54);
  const ptex = new THREE.CanvasTexture(plateC); ptex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), std(0xffffff, { map: ptex, roughness: 0.5 })); plate.position.set(0, FLOOR - 0.16, REAR - 0.04); plate.rotation.y = Math.PI; g.add(plate);
  const tailM = std(0xc0261d, { emissive: 0x400808, roughness: 0.3 });
  for (const x of [-0.55, 0.55]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.03), tailM); tl.position.set(x, FLOOR - 0.05, REAR - 0.04); g.add(tl); }
  const fw = wheel(W), rl = wheel(W), rr = wheel(W);
  fw.position.copy(FA); rl.position.set(0.5, W, RA); rr.position.set(-0.5, W, RA); g.add(fw, rl, rr);
  return { group: g, wheels: [fw, rl, rr], seat: V(0, 0.86, -0.14), grips: [V(-0.33, 1.1, 0.62), V(0.33, 1.1, 0.62)], rack: V(0, FLOOR, -1.0),
    feet: () => [V(-0.17, 0.38, 0.24), V(0.17, 0.38, 0.24)] };
}

// ---------------------------------------------------------------- a household's things
// each: its name, how it's held, its half sizes (x across the arms, y, z), whether it breaks (fragile), whether it
// takes a whole row of the bed (wide)
const THINGS = {
  carton: { name: () => t('Thùng đồ'), hw: 0.24, hh: 0.2, hd: 0.2 },
  dishes: { name: () => t('Thùng chén bát'), hw: 0.2, hh: 0.16, hd: 0.17, fragile: true },
  tv: { name: () => t('Tivi'), hw: 0.42, hh: 0.3, hd: 0.06, fragile: true, wide: true },
  fridge: { name: () => t('Tủ lạnh nhỏ'), hw: 0.25, hh: 0.43, hd: 0.25 },
  fan: { name: () => t('Quạt đứng'), hw: 0.2, hh: 0.55, hd: 0.2 },
  mattress: { name: () => t('Nệm cuộn'), hw: 0.46, hh: 0.2, hd: 0.2, wide: true },
  stools: { name: () => t('Chồng ghế nhựa'), hw: 0.17, hh: 0.27, hd: 0.17 },
  mirror: { name: () => t('Gương đứng'), hw: 0.26, hh: 0.5, hd: 0.03, fragile: true, wide: true },
  clothes: { name: () => t('Bao quần áo'), hw: 0.22, hh: 0.22, hd: 0.17 },
};
const crackTex = (() => {
  let tx = null;
  return () => {
    if (tx) return tx;
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = '#0d0f12'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(225,232,240,0.85)'; g.lineWidth = 1.6;
    const cx = 100 + Math.random() * 60, cy = 90 + Math.random() * 60;
    for (let k = 0; k < 14; k++) {
      let x = cx, y = cy; const a = (k / 14) * Math.PI * 2 + Math.random() * 0.3;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 6; s++) { x += Math.cos(a + (Math.random() - 0.5) * 0.7) * 30; y += Math.sin(a + (Math.random() - 0.5) * 0.7) * 30; g.lineTo(x, y); }
      g.stroke();
    }
    for (const r of [18, 42]) { g.beginPath(); for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2, rr = r * (0.8 + Math.random() * 0.4); g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.stroke(); }
    tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  };
})();
function label(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
  let px = 46; do g.font = `900 ${px}px sans-serif`; while (g.measureText(text).width > 236 && --px > 16);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 50);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
// the piece itself, centred on its middle; `glass`: what shows it broken
function makeThing(kind) {
  const g = new THREE.Group(), spec = THINGS[kind];
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const card = std(0xb48a57, { roughness: 1 }), tape = std(0xd8c49a, { roughness: 0.4 });
  let glass = null;
  if (kind === 'carton' || kind === 'dishes') {
    const { hw, hh, hd } = spec;
    add(new THREE.BoxGeometry(hw * 2, hh * 2, hd * 2), card);
    add(new THREE.BoxGeometry(hw * 2 + 0.005, 0.004, 0.07), tape, 0, hh, 0);
    add(new THREE.BoxGeometry(0.004, hh * 2 * 0.5, 0.07), tape, hw, hh * 0.5, 0);
    if (kind === 'dishes') {   // DỄ VỠ in red on two sides, and a glass-and-arrow sign
      const lm = std(0xffffff, { map: label('DỄ VỠ', '#b48a57', '#c0261d'), roughness: 1 });
      for (const s of [-1, 1]) { const p = add(new THREE.PlaneGeometry(hw * 1.6, hh * 0.9), lm, 0, 0, s * (hd + 0.003)); if (s < 0) p.rotation.y = Math.PI; }
      glass = { mesh: g.children[0], kind: 'box' };
    } else {
      const lm = std(0xffffff, { map: label(pickOf(['ĐỒ BẾP', 'SÁCH VỞ', 'GIÀY DÉP', 'ĐỒ LINH TINH', 'NỒI NIÊU']), '#b48a57', '#2a2a2a'), roughness: 1 });
      add(new THREE.PlaneGeometry(hw * 1.5, hh * 0.7), lm, 0, 0, hd + 0.003);
    }
  } else if (kind === 'tv') {   // a flat television, its stand's feet taped to the back
    add(new THREE.BoxGeometry(0.84, 0.52, 0.05), std(0x16171a, { roughness: 0.35 }), 0, 0.04, 0);
    const screen = add(new THREE.PlaneGeometry(0.8, 0.46), std(0x0b0c0f, { roughness: 0.08, metalness: 0.3 }), 0, 0.04, 0.026);
    add(new THREE.BoxGeometry(0.3, 0.025, 0.12), std(0x2a2b2e), 0, -0.25, 0);
    glass = { mesh: screen, kind: 'screen' };
  } else if (kind === 'fridge') {   // a bar fridge: white, a door line, a handle, little feet
    const white = std(0xeeeeea, { roughness: 0.35, metalness: 0.1 });
    add(new THREE.BoxGeometry(0.5, 0.82, 0.48), white, 0, 0.02, 0);
    add(new THREE.BoxGeometry(0.5, 0.006, 0.006), std(0x9a9a9a), 0, 0.2, 0.243);
    add(new THREE.BoxGeometry(0.02, 0.2, 0.03), std(0xb0b4b8, { metalness: 0.7, roughness: 0.3 }), 0.2, 0.06, 0.255);
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) add(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), std(0x333333), x, -0.41, z);
  } else if (kind === 'fan') {   // a standing fan: round base, pole, motor, the cage and blades
    const blue = std(0x3f86c9, { roughness: 0.4 }), white = std(0xf1f1ee, { roughness: 0.5 });
    add(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 20), white, 0, -0.52, 0);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.75, 10), std(0xc9cdd2, { metalness: 0.8, roughness: 0.3 }), 0, -0.13, 0);
    add(new THREE.SphereGeometry(0.07, 12, 8), white, 0, 0.27, -0.06).scale.set(1, 1, 1.3);
    const head = new THREE.Group(); head.position.set(0, 0.33, 0.04); g.add(head);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.008, 6, 32), white); head.add(cage);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, sp = new THREE.Mesh(tube(V(0, 0, 0.04), V(Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0), 0.003, 4), white); head.add(sp); }
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), blue); b.scale.set(1, 0.45, 0.12); const a = (k / 3) * Math.PI * 2; b.position.set(Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0.01); b.rotation.z = a; head.add(b); }
  } else if (kind === 'mattress') {   // a foam mattress rolled up and tied with two straps, across the arms
    const roll = add(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 20), std(pickOf([0xe9e3d4, 0xd9e6ef, 0xefd9d9]), { roughness: 0.95 }));
    roll.rotation.z = Math.PI / 2;
    for (const x of [-0.24, 0.24]) { const s = add(new THREE.TorusGeometry(0.205, 0.012, 6, 24), std(0x2c2c2c), x, 0, 0); s.rotation.y = Math.PI / 2; }
    add(new THREE.CircleGeometry(0.2, 20), std(0xd4cdbd, { roughness: 1 }), 0.451, 0, 0).rotation.y = Math.PI / 2;
  } else if (kind === 'stools') {   // red plastic stools, one stacked in another
    const red = std(pickOf([0xc62828, 0x1e63b5, 0x2e8b57]), { roughness: 0.45 });
    for (let k = 0; k < 4; k++) {
      const y = -0.17 + k * 0.08;
      add(new THREE.CylinderGeometry(0.15, 0.17, 0.035, 20), red, 0, y + 0.1, 0);
      add(new THREE.CylinderGeometry(0.16, 0.19, 0.2, 20, 1, true), red, 0, y, 0).material.side = THREE.DoubleSide;
    }
  } else if (kind === 'mirror') {   // a tall mirror in a wooden frame
    const wood = std(0x6b4423, { roughness: 0.7 });
    add(new THREE.BoxGeometry(0.52, 1.0, 0.04), wood);
    glass = { mesh: add(new THREE.PlaneGeometry(0.44, 0.92), std(0xd8e2ea, { roughness: 0.04, metalness: 0.95 }), 0, 0, 0.021), kind: 'mirror' };
  } else {   // clothes: a striped woven bag, zipped, bulging
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x2 = c.getContext('2d'); for (let k = 0; k < 8; k++) { x2.fillStyle = k % 2 ? '#f4f4f0' : (k % 4 ? '#c0392b' : '#1f5fa8'); x2.fillRect(0, k * 8, 64, 8); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1, 2);
    const bag = add(new THREE.BoxGeometry(0.44, 0.42, 0.34, 4, 4, 4), std(0xffffff, { map: tx, roughness: 0.8 }));
    const pos = bag.geometry.attributes.position;   // bulging
    for (let i = 0; i < pos.count; i++) { const v = V(pos.getX(i), pos.getY(i), pos.getZ(i)); const k = 1 + 0.12 * (1 - Math.abs(v.y) / 0.21); pos.setXYZ(i, v.x * k, v.y, v.z * k); }
    bag.geometry.computeVertexNormals();
    for (const x of [-0.08, 0.08]) { const h = add(new THREE.TorusGeometry(0.06, 0.01, 6, 14, Math.PI), std(0x2c2c2c), x, 0.21, 0); h.rotation.y = Math.PI / 2; }
  }
  g.userData.moving = kind;
  return { kind, obj: g, glass, ...spec };
}
// a piece broken: the screen or the glass crazed with cracks; a box of china knocked crooked and dented
function breakThing(th) {
  th.broken = true;
  const gl = th.glass;
  if (!gl) return;
  if (gl.kind === 'box') { gl.mesh.scale.set(0.97, 0.9, 1.0); gl.mesh.rotation.z = 0.06; gl.mesh.position.y -= 0.01; return; }
  gl.mesh.material = std(0xffffff, { map: crackTex(), roughness: gl.kind === 'mirror' ? 0.15 : 0.1, metalness: gl.kind === 'mirror' ? 0.6 : 0.2 });
}

// what the households say
const LINES = {   // {me}: how they call themselves (cô, chú, chị, anh)
  hello: ['Đồ để hết ngoài này rồi đó, chất lên giùm {me} nha.', 'Mấy món này qua nhà mới giùm {me}, cẩn thận đồ dễ vỡ.', 'Đồ đạc ở đây hết, nhẹ tay giùm {me} nha.'],
  go: ['Rồi, chạy chậm chậm thôi nha, {me} đi taxi qua trước.', 'Đủ rồi đó, qua bên kia {me} đợi.', 'Xong rồi, gặp ở nhà mới nha.'],
  there: ['Tới rồi hả, khiêng vô đây giùm {me}.', 'Để trước cửa giùm {me} là được.', 'Đây nè, để đồ ở đây.'],
  thanks: ['Cảm ơn nha, {me} gửi tiền nè.', 'Lẹ ghê, cảm ơn nha.', 'Cảm ơn nha, có gì {me} gọi tiếp.'],
  broke: ['Trời ơi, bể rồi! Cái này phải đền cho {me} đó.', 'Ui, sao chở ẩu vậy, bể đồ của {me} rồi.'],
};

export function createMover(host) {
  const { scene, player, city } = host, jobs = host.jobs, call = host.callPy, audio = host.audio;
  let data = null, on = false, waiting = false, van = null, move = null, sway = 0, bumpSeen = 0, warned = false, lastGood = null;
  // move = { from: house, to: house, things: [{ ...thing, where: 'ground' | 'bed' | 'arms' | 'road' | 'done', slot }], phase: 'load' | 'go' | 'paid', owner, t0, n }
  const toast = (h, ms) => jobs.toast(h, ms);
  const me = () => player.root.position;
  const dist = (p) => Math.hypot(p.x - me().x, p.z - me().z);
  const houses = () => city.houses || [];
  const mine = () => !!van && player.ride?.v === van;
  const people = () => {
    const all = host.library().filter((m) => m.family === 'biped' && m.animations?.length).map((m) => m.file);
    const pick = all.filter((f) => /^(Male|Female)_Adult_/i.test(f) && f !== player.modelFile);
    return pick.length ? pick : all;
  };
  const say = (k) => toast(t('Chủ nhà: “{line}”', { line: esc(t(pickOf(LINES[k]), { me: move?.me || '' })) }), 4200);

  // ---- the van: spawned at home when it's owned, parked along the sidewalk where it's clear
  const walls = () => [...(city.walls || []), ...(host.homePlace()?.walls || [])];
  const fwdOf = (h) => V(Math.sin(h), 0, Math.cos(h));
  // the van's footprint at p heading h: points down its middle and along its sides, front to back
  const footprint = (p, h) => { const f = fwdOf(h), r = V(Math.cos(h), 0, -Math.sin(h)), out = []; for (const z of [0.9, 0, -0.9, -1.8, -2.7, REAR]) for (const x of [-0.6, 0, 0.6]) out.push(p.clone().addScaledVector(f, z).addScaledVector(r, x)); return out; };
  const hits = (q, list) => list.some((b) => !b.y && q.x > b.minX - 0.1 && q.x < b.maxX + 0.1 && q.z > b.minZ - 0.1 && q.z < b.maxZ + 0.1);
  const clear = (p, h) => { const list = walls(); return !footprint(p, h).some((q) => hits(q, list)); };
  function spawnVan() {
    const home = host.homePlace(), base = home?.parking ? home.parking.clone() : me().clone();
    const m = makeVan();
    let at = base.clone().add(V(-4.5, 0, 0)), h = -Math.PI / 2;
    search: for (const hh of [-Math.PI / 2, Math.PI / 2, 0, Math.PI]) for (let k = 0; k < 30; k++) {
      const p = base.clone().add(V((k % 2 ? 1 : -1) * (3 + Math.ceil(k / 2) * 0.8), 0, Math.floor(k / 10) * 1.4));
      if (clear(p, hh)) { at = p; h = hh; break search; }
    }
    m.group.position.copy(at); m.group.rotation.y = h; m.group.userData.vehicle = 'van'; scene.add(m.group);
    van = { kind: 'van', m, spec: SPEC, heading: h, battery: 100, load: null, spin: 0 };
  }

  // ---- the bed: its places, row by row; a wide piece takes a whole row
  const onBed = () => move ? move.things.filter((x) => x.where === 'bed') : [];
  function freeSlot(th) {
    const used = onBed();
    for (let r = 0; r < ROWS.length; r++) {
      const inRow = used.filter((x) => x.slot.r === r);
      if (th.wide) { if (!inRow.length) return { r, c: 0 }; continue; }
      if (inRow.some((x) => x.wide)) continue;
      for (const c of [-1, 1]) if (!inRow.some((x) => x.slot.c === c)) return { r, c };
    }
    return null;
  }
  function putOnBed(th, slot) {
    th.where = 'bed'; th.slot = slot; van.m.group.add(th.obj);
    th.obj.position.set(slot.c * 0.3, FLOOR + th.hh + 0.005, ROWS[slot.r]); th.obj.rotation.set(0, 0, 0);
    if (th.kind === 'fan' && !th.wide) th.obj.rotation.y = Math.PI / 2;
  }
  // set down on the ground (the sidewalk at either house, or the road where it fell): upright, or lying if it fell
  function putDown(th, p, yaw, fallen) {
    scene.attach(th.obj); th.obj.position.set(p.x, th.hh, p.z); th.obj.rotation.set(0, yaw, 0);
    if (fallen) { const lie = th.kind === 'fan' || th.kind === 'mirror' || th.kind === 'fridge'; th.obj.rotation.set(lie ? Math.PI / 2 : 0, yaw + (Math.random() - 0.5), lie ? 0 : (Math.random() - 0.5) * 0.3); th.obj.position.y = lie ? th.hd + 0.01 : th.hh; }
  }
  // the row of places in front of a house: along its front, a little out on the sidewalk
  const spots = (h, n) => { const along = V(-h.n[1], 0, h.n[0]), out = V(h.n[0], 0, h.n[1]), w = Math.min(0.85, (Math.max(3, h.width + 1.6)) / n);
    return Array.from({ length: n }, (_, k) => V(h.x, 0, h.z).addScaledVector(along, (k - (n - 1) / 2) * w).addScaledVector(out, k % 2 ? 0.35 : -0.25)); };

  // ---- a move: offered on the board
  function offer() {
    const all = houses(), p = me();
    const from = pickOf(all.filter((h) => { const d = Math.hypot(h.x - p.x, h.z - p.z); return d > 40 && d < 260; })) || pickOf(all);
    if (!from) { toast(t('Chưa có ai cần dọn nhà, thử lại sau.'), 2600); return; }
    const far = all.filter((h) => { const d = Math.hypot(h.x - from.x, h.z - from.z); return d > 180 && d < 650; });
    const to = pickOf(far.length ? far : all.filter((h) => h !== from));
    // what they have: some boxes always, a few big things, likely something that breaks
    const n = 4 + Math.floor(Math.random() * 4), kinds = ['carton', 'carton'];
    const big = ['tv', 'fridge', 'fan', 'mattress', 'stools', 'mirror', 'clothes', 'dishes', 'carton', 'clothes', 'stools'];
    let wide = 0;
    while (kinds.length < n) { const k = pickOf(big); if ((THINGS[k].wide && wide >= 2) || (kinds.includes(k) && k !== 'carton' && k !== 'clothes')) continue; if (THINGS[k].wide) wide++; kinds.push(k); }
    const things = kinds.map((k) => ({ ...makeThing(k), where: 'ground', slot: null }));
    const at = spots(from, things.length), face = Math.atan2(from.n[0], from.n[1]);
    things.forEach((th, k) => { scene.add(th.obj); putDown(th, at[k], face); });
    const her = Math.random() < 0.5, self = pickOf(her ? ['cô', 'chị'] : ['chú', 'anh']), who = t('Nhà {me} {n}', { me: self, n: pickOf(her ? ['Lan', 'Mai', 'Hoa', 'Thu', 'Hạnh', 'Ngọc'] : ['Hùng', 'Tuấn', 'Dũng', 'Phúc', 'Sơn', 'Bình']) });
    const files = people(), same = files.filter((f) => (her ? /^Female/i : /^Male/i).test(f)), model = pickOf(same.length ? same : files) || null;
    const owner = new host.Character({ name: t('Chủ nhà'), model, pick: null });
    owner.human = true; owner.ring.visible = false; owner.lamp.visible = false; owner.tag.visible = false;
    const op = V(from.x, 0, from.z).add(V(from.n[0], 0, from.n[1]).multiplyScalar(-0.6)).add(V(-from.n[1], 0, from.n[0]).multiplyScalar((things.length / 2) * 0.8 + 0.6));
    owner.placeAt(op, op.clone().add(V(from.n[0], 0, from.n[1]))); scene.add(owner.root);
    move = { from, to, things, phase: 'load', owner, t0: performance.now(), n: things.length, hello: false, who, me: self, model };
    jobs.guide({ to: { x: from.x, z: from.z, name: who }, label: t('NHÀ CẦN DỌN') });
    toast(t('<b>{who}</b> cần dọn nhà: {n} món đồ, cách {m} m. Tới đó chất đồ lên xe.', { who: esc(who), n: things.length, m: Math.round(dist(from)) }), 4200);
    audio?.sfx?.('message'); jobs.refresh();
  }
  function clearMove() {
    if (!move) return;
    for (const th of move.things) { if (player.carry === th) player.carry = null; th.obj.removeFromParent(); }
    move.owner?.dispose(); move = null; jobs.guide(null); jobs.refresh();
  }
  const estimate = (mv) => { const v = data?.van || {}, m = jobs.routeLength({ x: mv.from.x, z: mv.from.z }, { x: mv.to.x, z: mv.to.z });
    return Math.min(v.max || 260, Math.round((v.base || 50) + mv.n * (v.per_item || 15) + (m / 100) * (v.per_100m || 8))); };

  // ---- what's near: a piece to pick up, the bed to load or unload, the new house's door
  const carrying = () => (move && move.things.find((x) => x.where === 'arms')) || null;
  const bedPoint = () => van.m.group.localToWorld(V(0, 0, REAR - 0.5)).setY(0);   // standing behind the bed
  const atBed = () => !!van && !player.ride && dist(bedPoint()) < 1.6;
  const nearThing = () => {
    if (!move || player.ride || carrying()) return null;
    let best = null, bd = 1.4;
    for (const th of move.things) {
      if (th.where !== 'road' && !(th.where === 'ground' && move.phase === 'load')) continue;
      const d = dist(th.obj.position); if (d < bd) { bd = d; best = th; }
    }
    return best;
  };
  const atNewHome = () => move?.phase === 'go' && !player.ride && dist(move.to) < 3.2;
  const nearVan = () => !!van && !player.ride && dist(van.m.group.position) < 1.8;

  function pickUp(th) {
    th.where = 'arms'; scene.attach(th.obj);
    player.carry = { obj: th.obj, hold: th.kind === 'clothes' ? 'side' : 'front', w: th.hw, h: th.hh * 2, d: th.hd };
    audio?.sfx?.('pickup');
  }
  function load(th) {
    const slot = freeSlot(th);
    if (!slot) { toast(t('Thùng xe hết chỗ.'), 2200); return; }
    player.carry = null; putOnBed(th, slot); audio?.sfx?.('drop');
    if (move.phase === 'load' && move.things.every((x) => x.where === 'bed')) {   // all on: off to the new house
      move.phase = 'go'; move.goT0 = performance.now();
      say('go'); jobs.guide({ to: { x: move.to.x, z: move.to.z, name: move.who }, label: t('NHÀ MỚI') });
      move.owner.walkTo(V(move.from.x, 0, move.from.z).add(V(move.from.n[0], 0, move.from.n[1]).multiplyScalar(-1.2)));
      setTimeout(() => { if (move?.phase === 'go' && move.owner) { move.owner.dispose(); move.owner = null; } }, 5000);
    }
  }
  function unload() {
    const th = onBed().sort((a, b) => b.slot.r - a.slot.r)[0];   // from the back
    if (th) pickUp(th);
  }
  function deliver(th) {
    player.carry = null; th.where = 'done';
    const done = move.things.filter((x) => x.where === 'done').length - 1, at = spots(move.to, move.n)[done];
    putDown(th, at, Math.atan2(move.to.n[0], move.to.n[1]));
    if (th.broken) { const p = th.obj.position; th.obj.rotation.z = 0.08; p.y = th.hh; }
    audio?.sfx?.('drop');
    if (move.things.every((x) => x.where === 'done')) {
      const broken = move.things.filter((x) => x.broken).length;
      const m = jobs.routeLength({ x: move.from.x, z: move.from.z }, { x: move.to.x, z: move.to.z }), s = (performance.now() - move.t0) / 1000;
      move.phase = 'paid'; jobs.guide(null); waiting = true;
      call('lifeAct', 'move', JSON.stringify({ n: move.n, broken, m: Math.round(m), s: Math.round(s) }));
    }
  }
  // the owner of the new house, waiting at the door as the van comes up
  function greet() {
    const c = new host.Character({ name: t('Chủ nhà'), model: move.model, pick: null });
    c.human = true; c.ring.visible = false; c.lamp.visible = false; c.tag.visible = false;
    const to = move.to, op = V(to.x, 0, to.z).add(V(to.n[0], 0, to.n[1]).multiplyScalar(-0.7)).add(V(-to.n[1], 0, to.n[0]).multiplyScalar(-(move.n / 2) * 0.8 - 0.7));
    c.placeAt(op, op.clone().add(V(to.n[0], 0, to.n[1]))); scene.add(c.root); move.owner = c;
    say('there');
  }

  // ---- on the road with a load: knocks break things, fast corners throw them off
  function jolt(dt) {
    const r = player.ride, load = onBed();
    const bump = (player.bumpT || 0) > bumpSeen + 600;
    if (bump) bumpSeen = player.bumpT;
    if (!load.length) { sway = 0; return; }
    if (bump) {
      const glass = load.filter((x) => x.fragile && !x.broken);
      if (glass.length) { const th = pickOf(glass); breakThing(th); audio?.sfx?.('shatter'); toast(t('Xe va chạm, <b>{x}</b> bị bể rồi! Phải đền {n} xu.', { x: th.name(), n: data?.van?.break ?? 45 }), 3800); }
      else if (Math.random() < 0.5) throwOff();
    }
    const steer = (player.keys.has('KeyA') ? 1 : 0) - (player.keys.has('KeyD') ? 1 : 0);
    const hard = steer && Math.abs(r.speed) > 6.2;
    sway = hard ? sway + dt * (Math.abs(r.speed) - 5.5) / 2.4 : Math.max(0, sway - dt * 0.8);
    if (sway > 0.55 && !warned) { warned = true; toast(t('Cua gắt quá, đồ trên xe lắc lư! Chạy chậm lại.'), 2600); }
    if (sway > 1.2) { sway = 0.3; throwOff(); }
    // the load rocks a little with it
    for (const th of load) if (th.where === 'bed') { th.obj.rotation.z = Math.sin(performance.now() / 90 + th.slot.r) * Math.min(0.12, sway * 0.08); }
  }
  function throwOff() {
    const load = onBed().filter((x) => !x.wide || Math.random() < 0.3);
    const th = load.sort((a, b) => b.slot.r - a.slot.r)[0];   // the back ones go first
    if (!th) return;
    const side = Math.random() < 0.5 ? -1 : 1, p = van.m.group.localToWorld(V(side * 1.1, 0, ROWS[th.slot.r] - 0.6));
    th.where = 'road'; th.slot = null; putDown(th, p, van.heading, true);
    let note = '';
    if (th.fragile && !th.broken) { breakThing(th); note = ` ${t('Bể luôn rồi.')}`; audio?.sfx?.('shatter'); } else audio?.sfx?.('drop');
    toast(t('<b>{x}</b> rơi khỏi xe!{note} Dừng lại nhặt lên.', { x: th.name(), note }), 3800);
  }

  const api = {
    get on() { return on; },
    fillBoard(el) {
      const own = !!data?.van?.own, price = data?.van?.price ?? 25000, coins = data?.coins ?? 0;
      const row = document.createElement('div');
      let info, act;
      if (!own) { info = t('Xe ba gác {n} xu. Chở đồ cho nhà dọn đi, công theo số món và quãng đường.', { n: fmt(price) }); act = `<button data-mv="buy" ${coins < price ? 'disabled' : ''}>${t('Mua xe · {n} xu', { n: fmt(price) })}</button>`; }
      else if (!on) { info = t('Xe ba gác đậu ở nhà. Nhận chuyến trên bảng việc, công theo số món và quãng đường.'); act = `<button data-mv="on">${t('Bắt đầu')}</button>`; }
      else if (!move) { info = t('Đang làm: nhận một chuyến dọn nhà'); act = `<button data-mv="offer">${t('Nhận chuyến')}</button> <button data-mv="off">${t('Nghỉ')}</button>`; }
      else {
        const left = move.things.filter((x) => x.where !== 'done').length;
        info = move.phase === 'load' ? t('Chất đồ lên xe: còn {n} món ở nhà cũ · khoảng {p} xu', { n: move.things.filter((x) => x.where !== 'bed').length, p: estimate(move) })
          : t('Chở tới nhà mới: còn {n} món · khoảng {p} xu', { n: left, p: estimate(move) });
        const broken = move.things.filter((x) => x.broken).length;
        if (broken) info += ` · <span class="jm-bad">${t('bể {n} món', { n: broken })}</span>`;
        act = `<button data-mv="drop">${t('Bỏ chuyến')}</button>`;
      }
      row.innerHTML = `<div class="jb-card${on ? ' taken' : ''}"><div class="jb-main"><b>${t('Chở hàng thuê, dọn nhà')}<i class="jb-risk fragile" title="${t('Va chạm làm bể đồ dễ vỡ, cua gắt làm đồ rơi khỏi xe: món nào bể phải đền')}">${t('Dễ vỡ')}</i></b>
        <small>${info}</small></div><div class="jb-act">${act}</div></div>`;
      el.append(row);
      row.querySelectorAll('[data-mv]').forEach((b) => (b.onclick = () => {
        const a = b.dataset.mv;
        if (a === 'offer') { offer(); return; }
        if (a === 'drop') { clearMove(); toast(t('Đã bỏ chuyến.'), 2200); return; }
        if (waiting) return;
        waiting = true;
        if (a === 'buy') call('lifeAct', 'van', '{}');
        else call('lifeAct', 'trade', JSON.stringify({ kind: a === 'on' ? 'chohang' : '' }));
      }));
    },
    update(dt) {
      if (!van) return;
      const r = player.ride;
      if (mine()) {
        van.spin += (r.speed * dt) / SPEC.wheel;
        for (const w of van.m.wheels) w.rotation.x = van.spin;
        // the bed is long: if its back goes into a wall, the van stops where it last was clear
        const p = me();
        if (clear(p, van.heading)) lastGood = { p: p.clone(), h: van.heading };
        else if (lastGood) { p.copy(lastGood.p); van.heading = lastGood.h; r.speed = 0; van.m.group.position.copy(p); van.m.group.rotation.set(0, van.heading, 0); player.root.rotation.set(0, van.heading, 0); }
        if (move) jolt(dt);
      }
      if (!move) return;
      if (move.phase === 'load' && !move.hello && dist(move.from) < 14) { move.hello = true; say('hello'); }
      if (move.phase === 'go' && !move.owner && dist(move.to) < 25) greet();
    },
    hint() {
      if (!van || waiting || player.seat) return '';
      if (mine()) return Math.abs(player.ride.speed) < 1.5 ? `<kbd>E</kbd> ${t('Xuống xe')}` : '';
      const held = carrying();
      if (held) {
        if (atNewHome()) return `<kbd>F</kbd> ${t('Đặt <b>{x}</b> trước cửa nhà mới', { x: held.name() })}`;
        if (atBed()) return `<kbd>F</kbd> ${t('Chất <b>{x}</b> lên xe', { x: held.name() })}`;
        return `<small>${t('Đang khiêng {x}', { x: held.name() })}</small>`;
      }
      const th = nearThing();
      if (th) return `<kbd>F</kbd> ${t('Khiêng <b>{x}</b>', { x: th.name() })}${th.broken ? ` <small class="jm-bad">${t('(bể)')}</small>` : ''}`;
      if (move?.phase === 'go' && atBed() && dist(move.to) < 14 && onBed().length) return `<kbd>F</kbd> ${t('Bốc đồ xuống')}`;
      if (nearVan() || atBed()) return `<kbd>E</kbd> ${t('Lên <b>xe ba gác</b>')}`;
      return '';
    },
    key(e) {
      if (!van || waiting || player.seat) return false;
      if (e.code === 'KeyE') {
        if (mine()) { if (Math.abs(player.ride.speed) > 1.5) return true; player.dismount(); audio?.sfx?.('click'); return true; }
        if ((nearVan() || atBed()) && !carrying() && !player.carry && !player.ride) { van.heading = van.m.group.rotation.y; player.mount(van); lastGood = null; warned = false; audio?.sfx?.('click'); return true; }
        return false;
      }
      if (e.code !== 'KeyF' || !api.hint().includes('<kbd>F')) return false;
      const held = carrying();
      if (held) { if (atNewHome() && !atBed()) deliver(held); else if (atBed()) load(held); else if (atNewHome()) deliver(held); return true; }
      const th = nearThing();
      if (th) { pickUp(th); return true; }
      if (move?.phase === 'go' && atBed()) { unload(); return true; }
      return false;
    },
    set(msg) {
      const was = on;
      if (msg.coins !== undefined) data = { ...(data || {}), coins: msg.coins };
      if (msg.van) { data = { ...(data || {}), van: msg.van }; if (msg.van.own && !van) spawnVan(); }
      if (msg.trade !== undefined) on = msg.trade === 'chohang';
      if (['trade', 'van', 'move'].includes(msg.act)) waiting = false;
      if (msg.act === 'van') {
        if (msg.van_bought) { toast(t('Đã mua xe ba gác! Xe đậu ở nhà, bấm E để lên xe.'), 4200); audio?.sfx?.('coin'); }
        else if (msg.error === 'coins') toast(t('Không đủ xu.'), 2400);
      }
      if (msg.act === 'trade') {
        if (msg.error === 'van') toast(t('Chở hàng thuê cần xe ba gác: mua trên bảng việc.'), 3400);
        else if (msg.traded === 'chohang') toast(t('Bắt đầu chở hàng thuê. Nhận chuyến trên bảng việc (J).'), 3600);
        else if (!msg.error && was && !on) { if (!msg.traded) toast(t('Nghỉ chở hàng.'), 2400); clearMove(); }
      }
      if (msg.act === 'move' && move) {
        if (msg.error) { toast(msg.error === 'early' ? t('Chủ nhà chưa trả tiền được, đợi chút rồi giao món cuối lại.') : t('Không nhận được tiền chuyến này.'), 3200);
          if (msg.error === 'early') { const last = move.things.find((x) => x.where === 'done'); if (last) { move.phase = 'go'; pickUp(last); } } }
        else {
          say(msg.broken ? 'broke' : 'thanks');
          setTimeout(() => toast(msg.broken
            ? t('Công {p} xu, đền {b} món bể {o} xu: <b>{sign}{n} xu</b>', { p: msg.moved, b: msg.broken, o: msg.owed, sign: msg.net >= 0 ? '+' : '−', n: Math.abs(msg.net) })
            : t('Chủ nhà trả tiền chuyến: <b>+{n} xu</b>', { n: msg.net }), 4200), 1800);
          if (msg.net > 0) audio?.sfx?.('coin');
          const done = move; move = null; jobs.refresh();
          setTimeout(() => { for (const th of done.things) th.obj.removeFromParent(); done.owner?.dispose(); }, 9000);
        }
      }
      jobs.refresh();
    },
  };
  return api;
}

export function install(host) {
  host.trades.register('chohang', createMover(host));
}
