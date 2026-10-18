// Working for oneself (lifehome), the third trade: a roadside bike repair stall. The kit is bought on the board (J);
// with the trade on, F on a sidewalk sets the stall out where the player stands (F again packs it up). Riders pull
// up now and then with something to fix (a puncture, a soft tyre, the oil); F starts the work: each step a needle
// sweeps a bar and F stops it, in the green it's done right. Miss two steps and the bike's been damaged: no pay,
// and the rider has to be paid for it. Prices are Python's (life.py › kit_buy, repair).
//
// createRepair({ city, scene, player, call, audio, busy, jobs, Character, library, makeMoto, makeBike }) →
//   { update(dt), hint(), key(e), set(msg), fillBoard(el) }

import * as THREE from 'three';
import { t } from '/i18n.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const JOBS = {
  patch: { name: () => t('Vá vỏ'), steps: () => [t('Tháo bánh xe'), t('Tìm lỗ thủng trong thau nước'), t('Dán miếng vá')] },
  pump: { name: () => t('Bơm bánh'), steps: () => [t('Bơm hơi vừa đủ')] },
  oil: { name: () => t('Thay nhớt'), steps: () => [t('Xả nhớt cũ'), t('Đổ nhớt mới'), t('Siết ốc')] },
};
const ASK = { patch: 'Bánh xe xẹp rồi, vá giùm em với.', pump: 'Bơm giùm cái bánh sau nha.', oil: 'Thay nhớt giùm anh nha.' };

// the stall: a wooden tool box, a compressor, a tub of water, inner tubes on a rod, a cardboard sign, a stool
function signTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#c9a774'; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#1d1d1d'; g.font = '900 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('VÁ XE', 128, 62); g.font = '800 26px sans-serif'; g.fillText('Bơm · Thay nhớt', 128, 122);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function makeStall() {
  const g = new THREE.Group(), wood = std(0x7a5532, { roughness: 0.85 }), red = std(0xc0392b, { roughness: 0.45 }), steel = std(0x9aa0a6, { metalness: 0.6, roughness: 0.4 });
  const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(0.6, 0.32, 0.36), wood, -0.5, 0.16, 0);                       // the tool box
  add(new THREE.BoxGeometry(0.62, 0.03, 0.38), wood, -0.5, 0.33, 0);
  for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.03, 0.02, 0.18), steel, -0.7 + k * 0.1, 0.355, 0, k * 0.4);   // spanners on it
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 16).rotateZ(Math.PI / 2), red, 0.45, 0.2, -0.1);   // the compressor's tank
  add(new THREE.BoxGeometry(0.22, 0.16, 0.2), std(0x333333), 0.45, 0.43, -0.1);
  add(new THREE.TorusGeometry(0.15, 0.012, 6, 20), std(0x111111), 0.7, 0.25, -0.1, Math.PI / 2);   // its coiled hose
  add(new THREE.CylinderGeometry(0.26, 0.22, 0.2, 18, 1, true), std(0x2c6fb0, { side: THREE.DoubleSide }), 0.1, 0.1, 0.45);   // the tub
  const water = add(new THREE.CircleGeometry(0.24, 18), std(0x6c8fa3, { roughness: 0.1, metalness: 0.2 }), 0.1, 0.17, 0.45); water.rotation.x = -Math.PI / 2;
  add(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), steel, -0.95, 0.65, -0.2);                 // a rod with tubes hanging
  for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.18, 0.025, 8, 24), std(0x111111), -0.95, 1.0 - k * 0.12, -0.2 + k * 0.03, Math.PI / 2 * 0.2);
  const sign = add(new THREE.PlaneGeometry(0.45, 0.28), std(0xffffff, { map: signTex(), side: THREE.DoubleSide }), -0.95, 0.42, 0.05);
  sign.rotation.set(-0.15, 0, 0);
  for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) add(new THREE.BoxGeometry(0.035, 0.32, 0.035), std(0x1d5fb4), 0.2 + x, 0.16, -0.6 + z);   // a low stool
  add(new THREE.BoxGeometry(0.3, 0.03, 0.3), std(0x1d5fb4), 0.2, 0.33, -0.6);
  return g;
}

export function createRepair({ city, scene, player, call, audio, busy, jobs, Character, library, makeMoto, makeBike }) {
  let data = null, on = false, stall = null, waiting = false, custT = 12, cust = null, work = null;
  const toast = (h, ms) => jobs.toast(h, ms);
  const me = () => player.root.position;
  const G = city?.grid;
  const people = () => {
    const all = library().filter((m) => m.family === 'biped' && m.animations?.length).map((m) => m.file);
    const pick = all.filter((f) => /^(Male|Female)_Adult_/i.test(f) && f !== player.modelFile);
    return pick.length ? pick : all;
  };
  // on a sidewalk (not the road, not inside a block's lots too far from the street)
  const onSidewalk = (p) => {
    if (!G) return false;
    const i = Math.round((p.x - G.cx) / G.pitch), j = Math.round((p.z - G.cz) / G.pitch), lx = Math.abs(p.x - G.cx - i * G.pitch), lz = Math.abs(p.z - G.cz - j * G.pitch), h = G.inner / 2;
    return (lx <= h && lz <= h) && (lx > h - G.walk || lz > h - G.walk);
  };

  // ---- the work: a needle sweeping a bar, F stops it
  const bar = document.createElement('div'); bar.id = 'repair-bar'; bar.className = 'hidden';
  bar.innerHTML = '<small></small><b></b><div class="rb-track"><i class="rb-zone"></i><i class="rb-needle"></i></div><em></em>';
  document.body.append(bar);
  function startWork() {
    const steps = JOBS[cust.kind].steps();
    work = { steps, k: 0, missed: 0, pos: 0, dir: 1, zone: 0, wide: 0.24 };
    nextStep(); bar.classList.remove('hidden'); player.keys.clear();
  }
  function nextStep() {
    work.wide = Math.max(0.14, 0.26 - work.k * 0.05); work.zone = 0.15 + Math.random() * (0.7 - work.wide); work.pos = 0; work.dir = 1;
    bar.querySelector('small').textContent = `${JOBS[cust.kind].name()} · ${t('bước {k}/{n}', { k: work.k + 1, n: work.steps.length })}`;
    bar.querySelector('b').textContent = work.steps[work.k];
    bar.querySelector('em').innerHTML = `<kbd>F</kbd> ${t('khi kim ở vùng xanh')}`;
    const z = bar.querySelector('.rb-zone'); z.style.left = `${work.zone * 100}%`; z.style.width = `${work.wide * 100}%`;
  }
  function stopNeedle() {
    const hit = work.pos >= work.zone && work.pos <= work.zone + work.wide;
    if (!hit) work.missed++;
    audio?.sfx?.(hit ? 'click' : 'error');
    toast(hit ? t('Chuẩn!') : t('Trật rồi…'), 900);
    work.k++;
    if (work.k < work.steps.length) { nextStep(); return; }
    bar.classList.add('hidden');
    waiting = true; call('lifeAct', 'repair', JSON.stringify({ kind: cust.kind, missed: work.missed }));
  }

  // ---- riders pulling up
  function spawnCustomer() {
    const p = stall.position, r = stall.rotation.y, out = V(Math.sin(r), 0, Math.cos(r));   // the stall faces the road
    const along = V(out.z, 0, -out.x), from = p.clone().addScaledVector(out, 2.4).addScaledVector(along, (Math.random() < 0.5 ? -1 : 1) * 28);
    const to = p.clone().addScaledVector(out, 1.5);
    const kind = ['patch', 'patch', 'pump', 'oil'][Math.floor(Math.random() * 4)];
    const bike = Math.random() < 0.75 ? makeMoto([0xe8e4dc, 0xb3261e, 0x1f4f8c, 0x3a3b3f][Math.floor(Math.random() * 4)]) : makeBike(0x2f6db5);
    bike.group.position.copy(from); bike.group.lookAt(to); scene.add(bike.group);
    const files = people(), c = new Character({ name: t('Khách'), model: files[Math.floor(Math.random() * files.length)] || null, pick: null });
    c.human = true; c.ring.visible = false; c.lamp.visible = false; c.tag.visible = false;
    bike.group.add(c.root); c.root.position.set(0, bike.seat.y - 0.6, bike.seat.z + 0.05); c.seated = true; c.play('sit');
    cust = { c, bike, kind, phase: 'come', to, t: 0 };
  }
  function riderOff() {
    const { c, bike } = cust;
    scene.attach(c.root); c.seated = false; c.play('idle');
    const side = V(Math.cos(bike.group.rotation.y), 0, -Math.sin(bike.group.rotation.y)).multiplyScalar(0.8);
    c.root.position.add(side).setY(0); c.lookToward(stall.position, 1);
    cust.phase = 'wait'; cust.t = 0;
    toast(t('Khách: “{line}” ({job} · {n} xu)', { line: ASK[cust.kind], job: JOBS[cust.kind].name(), n: data?.repairs?.[cust.kind] ?? '' }), 4000);
    audio?.sfx?.('message');
  }
  function sendOff(happy) {
    if (!cust) return;
    const { c, bike } = cust;
    bike.group.add(c.root); c.root.position.set(0, bike.seat.y - 0.6, bike.seat.z + 0.05); c.root.rotation.set(0, 0, 0); c.seated = true; c.play('sit');
    cust.phase = 'go'; cust.t = 0; cust.happy = happy;
  }
  function endCustomer() { if (!cust) return; cust.c.dispose(); cust.bike.group.removeFromParent(); cust = null; }

  function setUp() {
    const r = player.root.rotation.y;
    stall = makeStall(); stall.position.copy(me()).setY(0).add(V(Math.sin(r), 0, Math.cos(r)).multiplyScalar(0.9));
    // turned to face the nearer road
    if (G) {
      const i = Math.round((stall.position.x - G.cx) / G.pitch), j = Math.round((stall.position.z - G.cz) / G.pitch);
      const lx = stall.position.x - G.cx - i * G.pitch, lz = stall.position.z - G.cz - j * G.pitch;
      stall.rotation.y = Math.abs(lx) > Math.abs(lz) ? (lx > 0 ? Math.PI / 2 : -Math.PI / 2) : (lz > 0 ? 0 : Math.PI);
    }
    scene.add(stall); custT = 10 + Math.random() * 10;
    toast(t('Đã dựng sạp sửa xe. Đợi khách ghé.'), 2600); audio?.sfx?.('click');
  }
  function packUp() {
    if (work) { work = null; bar.classList.add('hidden'); }
    if (cust) { if (cust.phase === 'wait') sendOff(false); else endCustomer(); }
    stall?.removeFromParent(); stall = null;
    toast(t('Đã dọn sạp.'), 1800);
  }

  const api = {
    fillBoard(el) {
      const own = !!data?.own;
      const act = !own ? `<button data-kit="buy">${t('Mua đồ nghề · {n} xu', { n: (data?.price ?? 2500).toLocaleString('vi-VN') })}</button>`
        : `<button data-kit="${on ? 'off' : 'on'}">${on ? t('Nghỉ') : t('Bắt đầu')}</button>`;
      const info = own ? (on ? t('Đang làm · bấm F ở vỉa hè để dựng sạp') : t('Có đồ nghề')) : t('Vá vỏ {a} xu · bơm {b} xu · thay nhớt {c} xu', { a: 15, b: 5, c: 25 });
      const row = document.createElement('div');
      row.innerHTML = `<div class="jb-card${on ? ' taken' : ''}"><div class="jb-main"><b>${t('Sửa xe vỉa hè')}<i class="jb-risk fragile" title="${t('Làm trật từ 2 bước trở lên là làm hỏng xe khách: không được tiền, phải đền {n} xu', { n: data?.compensation ?? 20 })}">${t('Làm hỏng phải đền')}</i></b>
        <small>${info}</small></div><div class="jb-act">${act}</div></div>`;
      el.append(row);
      row.querySelector('[data-kit]').onclick = (e) => {
        if (waiting) return; waiting = true;
        const k = e.target.dataset.kit;
        if (k === 'buy') call('lifeAct', 'kit', '{}'); else call('lifeAct', 'trade', JSON.stringify({ kind: k === 'on' ? 'suaxe' : '' }));
      };
    },
    update(dt) {
      if (work) {   // the needle, faster on each step
        work.pos += work.dir * dt * (0.55 + work.k * 0.2);
        if (work.pos > 1) { work.pos = 1; work.dir = -1; } else if (work.pos < 0) { work.pos = 0; work.dir = 1; }
        bar.querySelector('.rb-needle').style.left = `${work.pos * 100}%`;
      }
      if (busy()) return;
      if (stall && Math.hypot(stall.position.x - me().x, stall.position.z - me().z) > 12) { packUp(); toast(t('Đi xa sạp quá: đã dọn sạp.'), 2400); }
      if (!stall) return;
      if (!cust && (custT -= dt) <= 0) { custT = 25 + Math.random() * 35; spawnCustomer(); }
      if (!cust) return;
      cust.t += dt;
      const b = cust.bike.group;
      if (cust.phase === 'come') {
        const d = b.position.distanceTo(cust.to), step = Math.min(d, (d > 6 ? 5 : 1.5 + d * 0.5) * dt);
        b.position.addScaledVector(cust.to.clone().sub(b.position).setY(0).normalize(), step);
        if (d < 0.1) riderOff();
      } else if (cust.phase === 'wait' && cust.t > 60 && !work) {
        toast(t('Khách đợi lâu quá, dắt xe đi chỗ khác.'), 2600); sendOff(false);
      } else if (cust.phase === 'go') {
        const r = b.rotation.y; b.position.add(V(Math.sin(r), 0, Math.cos(r)).multiplyScalar(5 * dt));
        if (cust.t > 7) endCustomer();
      }
    },
    hint() {
      if (player.ride || player.seat || waiting || player.push) return '';
      if (work) return '';
      if (stall) {
        const near = Math.hypot(stall.position.x - me().x, stall.position.z - me().z) < 3;
        if (cust?.phase === 'wait') {   // a rider waiting: F is the work (never packing up under their nose)
          const d = Math.hypot(cust.bike.group.position.x - me().x, cust.bike.group.position.z - me().z);
          return d < 3.5 ? `<kbd>F</kbd> ${t('{job} cho khách', { job: JOBS[cust.kind].name() })}` : near ? t('Khách đang đợi: ra chỗ xe khách') : '';
        }
        return near ? `<kbd>F</kbd> ${t('Dọn sạp')}` : '';
      }
      if (on && onSidewalk(me())) return `<kbd>F</kbd> ${t('Dựng sạp sửa xe ở đây')}`;
      return '';
    },
    key(e) {
      if (e.code !== 'KeyF' || player.ride || player.seat || waiting || player.push) return false;
      if (work) { stopNeedle(); return true; }
      const h = api.hint();
      if (!h.includes('<kbd>')) return false;
      if (stall && cust?.phase === 'wait' && h.includes(JOBS[cust.kind].name())) { startWork(); return true; }
      if (stall) { packUp(); return true; }
      setUp(); return true;
    },
    // Python's word: the kit, the trade, a repair done
    set(msg) {
      if (msg.kit) data = msg.kit;
      if (msg.trade !== undefined) { on = msg.trade === 'suaxe'; if (!on && stall) packUp(); }
      if (['trade', 'kit', 'repair'].includes(msg.act)) waiting = false;
      if (msg.act === 'kit') { if (msg.kit_bought) toast(t('Đã mua đồ nghề sửa xe!'), 3000); else if (msg.error === 'coins') toast(t('Không đủ xu.')); }
      if (msg.act === 'trade' && msg.error === 'kit') toast(t('Cần mua đồ nghề trước.'));
      if (msg.act === 'trade' && msg.traded === 'suaxe') toast(t('Bắt đầu sửa xe. Ra vỉa hè, bấm F để dựng sạp.'), 3400);
      if (msg.act === 'repair') {
        work = null;
        if (msg.botched) { toast(t('Làm hỏng xe khách rồi! Phải đền <b>{n} xu</b>.', { n: -msg.amount }), 3600); audio?.sfx?.('error'); sendOff(false); }
        else if (msg.amount) { toast(t('Xong! Khách trả <b>+{n} xu</b>', { n: msg.amount }), 3000); audio?.sfx?.('coin'); sendOff(true); }
        else { toast(t('Từ từ, chưa xong…'), 1500); sendOff(false); }
      }
      jobs.refresh();
    },
  };
  return api;
}

// The add-on's entry: the trade made with what the app's host offers, registered on the job board's hub
// (host.trades: its card on the board, its part of each frame, its hints and keys, the app's word on its money).
export function install(host) {
  host.trades.register('suaxe', createRepair({ city: host.city, scene: host.scene, player: host.player, call: host.callPy, audio: host.audio, busy: host.uiBusy, jobs: host.jobs, Character: host.Character, library: host.library, makeMoto: host.vehicles.makeMoto, makeBike: host.vehicles.makeBike }));
}
