// Working for oneself (lifehome), the fourth trade: a sidewalk café (cà phê cóc). Bought on the board (J); with
// the trade on, F on a sidewalk sets it out where the player stands: a little station (a thermos, an ice box,
// glasses), two low tables and red stools, a parasol. People sit down; F asks what they'll have; at the station
// hold F to pour and let go at the line (a bad one is paid half); carry the glass over (F). When they've drunk it
// they get up to pay: be there (F) in time, or they walk off without paying. Prices are Python's (life.py ›
// cafe_buy, cafe_serve).
//
// createCafe({ city, scene, player, call, audio, busy, jobs, Character, library }) → { update(dt), hint(), key(e), keyUp(e), set(msg), fillBoard(el) }

import * as THREE from 'three';
import { t } from '/i18n.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DRINK = {
  den: { name: () => t('cà phê đen đá'), color: 0x2a1708 },
  sua: { name: () => t('cà phê sữa đá'), color: 0x8a5a33 },
  tra: { name: () => t('trà đá'), color: 0xb98a3a },
};
const ORDER = ['den', 'sua', 'sua', 'tra'];
const SAY = { den: 'Cho ly đen đá.', sua: 'Một sữa đá nha em.', tra: 'Cho ly trà đá.' };

function glass(kind) {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.12, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8f2f4, transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide }));
  const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.031, 0.09, 14), std(DRINK[kind].color, { roughness: 0.2 })); drink.position.y = -0.012;
  g.add(cup, drink);
  for (let k = 0; k < 3; k++) { const ice = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), std(0xeaf6fb, { transparent: true, opacity: 0.8, roughness: 0.1 })); ice.position.set((k - 1) * 0.018, 0.03, (k % 2) * 0.012); g.add(ice); }
  return g;
}
// the café: the station at the player's side, two tables down the sidewalk with three stools each
function makeCafe() {
  const g = new THREE.Group(), red = std(0xc0392b, { roughness: 0.45 }), blue = std(0x1d5fb4, { roughness: 0.45 }), steel = std(0xb9bec4, { metalness: 0.6, roughness: 0.35 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  // the station: a small table, a thermos, an ice box, glasses upside down on a tray, a jar of sugar
  add(new THREE.BoxGeometry(0.7, 0.04, 0.45), std(0x8a6a4a), 0, 0.62, 0);
  for (const [x, z] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]]) add(new THREE.BoxGeometry(0.03, 0.6, 0.03), std(0x5a4632), x, 0.3, z);
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 16), red, -0.2, 0.79, -0.05);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), std(0x222222), -0.2, 0.96, -0.05);
  add(new THREE.BoxGeometry(0.42, 0.3, 0.3), std(0xf2f2f0, { roughness: 0.9 }), 0, 0.15, 0.55);   // the ice box on the ground
  add(new THREE.BoxGeometry(0.44, 0.04, 0.32), blue, 0, 0.31, 0.55);
  add(new THREE.BoxGeometry(0.28, 0.01, 0.2), steel, 0.15, 0.645, 0.05);
  for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.032, 0.04, 0.11, 12), new THREE.MeshStandardMaterial({ color: 0xe8f2f4, transparent: true, opacity: 0.5, roughness: 0.05 }), 0.07 + (k % 3) * 0.08, 0.705, 0.0 + Math.floor(k / 3) * 0.09);
  const seats = [];
  for (const tz of [-1.6, -3.4]) {   // the tables, and their stools
    add(new THREE.BoxGeometry(0.55, 0.03, 0.55), blue, 0, 0.52, tz);
    for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) add(new THREE.BoxGeometry(0.03, 0.5, 0.03), blue, x, 0.25, tz + z);
    for (const [sx, sz, face] of [[0.55, 0, -Math.PI / 2], [-0.55, 0, Math.PI / 2], [0, -0.55, 0]]) {
      add(new THREE.CylinderGeometry(0.15, 0.13, 0.03, 14), red, sx, 0.46, tz + sz);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; add(new THREE.CylinderGeometry(0.012, 0.016, 0.45, 6), red, sx + Math.cos(a) * 0.1, 0.225, tz + sz + Math.sin(a) * 0.1); }
      seats.push({ at: V(sx, 0, tz + sz), face, table: V(sx * 0.45, 0.54, tz + sz * 0.45) });
    }
  }
  add(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 6), steel, 0.4, 1.1, -2.5);   // the parasol
  const shade = add(new THREE.ConeGeometry(1.4, 0.45, 12, 1, true), std(0x2f8a4a, { side: THREE.DoubleSide }), 0.4, 2.3, -2.5); shade.castShadow = true;
  return { group: g, seats, station: V(0, 0, 0) };
}

export function createCafe({ city, scene, player, call, audio, busy, jobs, Character, library }) {
  let data = null, on = false, cafe = null, waiting = false, custT = 8, guests = [], pour = null, holding = null;
  const toast = (h, ms) => jobs.toast(h, ms);
  const me = () => player.root.position;
  const G = city?.grid;
  const people = () => {
    const all = library().filter((m) => m.family === 'biped' && m.animations?.length).map((m) => m.file);
    const pick = all.filter((f) => /^(Male|Female)_Adult_/i.test(f) && f !== player.modelFile);
    return pick.length ? pick : all;
  };
  const onSidewalk = (p) => {
    if (!G) return false;
    const i = Math.round((p.x - G.cx) / G.pitch), j = Math.round((p.z - G.cz) / G.pitch), lx = Math.abs(p.x - G.cx - i * G.pitch), lz = Math.abs(p.z - G.cz - j * G.pitch), h = G.inner / 2;
    return lx <= h && lz <= h && (lx > h - G.walk || lz > h - G.walk);
  };
  const W = (local) => cafe.group.localToWorld(local.clone());
  const dist = (p) => Math.hypot(p.x - me().x, p.z - me().z);

  // ---- pouring: hold F, the glass fills; let go at the line
  const gauge = document.createElement('div'); gauge.id = 'pour-gauge'; gauge.className = 'hidden';
  gauge.innerHTML = '<small></small><div class="pg-glass"><i class="pg-band"></i><i class="pg-fill"></i></div><em></em>';
  document.body.append(gauge);
  function startPour(guest) {
    pour = { guest, level: 0, filling: false, band: 0.55 + Math.random() * 0.25, wide: 0.12 };
    gauge.querySelector('small').textContent = DRINK[guest.kind].name();
    gauge.querySelector('em').innerHTML = `${t('Giữ')} <kbd>F</kbd> ${t('để rót, thả ra ở vạch xanh')}`;
    const b = gauge.querySelector('.pg-band'); b.style.bottom = `${pour.band * 100}%`; b.style.height = `${pour.wide * 100}%`;
    gauge.querySelector('.pg-fill').style.height = '0%';
    gauge.querySelector('.pg-fill').style.background = `#${DRINK[guest.kind].color.toString(16).padStart(6, '0')}`;
    gauge.classList.remove('hidden'); player.keys.clear();
  }
  function endPour() {
    const ok = pour.level >= pour.band && pour.level <= pour.band + pour.wide;
    gauge.classList.add('hidden');
    const gst = pour.guest; pour = null;
    gst.good = ok; gst.phase = 'made';
    holding = { guest: gst, obj: glass(gst.kind) }; scene.add(holding.obj);
    player.carry = { obj: holding.obj, hold: 'side', w: 0.05, h: 0.12, d: 0.05 };
    toast(ok ? t('Ly ngon! Bưng ra cho khách.') : t('Rót chưa chuẩn… ly này hơi dở.'), 2200);
    audio?.sfx?.(ok ? 'click' : 'error');
  }

  // ---- guests
  function spawnGuest() {
    const free = cafe.seats.filter((s) => !guests.some((g) => g.seat === s));
    if (!free.length) return;
    const seat = free[Math.floor(Math.random() * free.length)], files = people();
    const c = new Character({ name: t('Khách'), model: files[Math.floor(Math.random() * files.length)] || null, pick: null });
    c.human = true; c.ring.visible = false; c.lamp.visible = false; c.tag.visible = false;
    const sp = W(seat.at), a = Math.random() * Math.PI * 2;
    c.root.position.set(sp.x + Math.cos(a) * 18, 0, sp.z + Math.sin(a) * 18); scene.add(c.root);
    const g = { c, seat, phase: 'come', t: 0, kind: ORDER[Math.floor(Math.random() * ORDER.length)] };
    c.walkTo(sp.clone().add(V(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.5)), () => {
      c.placeAt(sp.clone(), null); c.root.rotation.y = cafe.group.rotation.y + seat.face; c.seated = true; c.play('sit');
      g.phase = 'order'; g.t = 0;
    });
    guests.push(g);
  }
  function leave(g, paid) {
    const c = g.c;
    c.seated = false; c.play('idle');
    g.cup?.removeFromParent();
    const away = c.root.position.clone().add(V(Math.random() * 30 - 15, 0, Math.random() * 30 - 15));
    c.walkTo(away, () => c.dispose()); setTimeout(() => !c.disposed && c.dispose(), 20000);
    guests.splice(guests.indexOf(g), 1);
    if (paid === null) return;
  }
  const guestNear = (phase, r = 1.8) => guests.find((g) => g.phase === phase && dist(g.c.root.position) < r);

  function setUp() {
    const r = player.root.rotation.y;
    const m = makeCafe(); cafe = m; scene.add(m.group);
    // along the sidewalk: the tables run beside the road, the station where the player stands
    m.group.position.copy(me()).setY(0);
    if (G) {
      const i = Math.round((me().x - G.cx) / G.pitch), j = Math.round((me().z - G.cz) / G.pitch);
      const lx = me().x - G.cx - i * G.pitch, lz = me().z - G.cz - j * G.pitch;
      const alongZ = Math.abs(lx) > Math.abs(lz);   // on an east or west sidewalk: tables run along z
      const fwd = alongZ ? V(0, 0, Math.cos(r) >= 0 ? 1 : -1) : V(Math.sin(r) >= 0 ? 1 : -1, 0, 0);
      m.group.rotation.y = Math.atan2(-fwd.x, -fwd.z);   // the tables (−z locally) ahead of the player
    }
    custT = 6; toast(t('Đã bày quán cà phê. Đợi khách ghé.'), 2600); audio?.sfx?.('click');
  }
  function packUp() {
    for (const g of [...guests]) leave(g, null);
    if (holding) { holding.obj.removeFromParent(); if (player.carry?.obj === holding.obj) player.carry = null; holding = null; }
    if (pour) { pour = null; gauge.classList.add('hidden'); }
    cafe?.group.removeFromParent(); cafe = null;
    toast(t('Đã dọn quán.'), 1800);
  }

  const api = {
    fillBoard(el) {
      const own = !!data?.own;
      const act = !own ? `<button data-cafe="buy">${t('Mua đồ bày quán · {n} xu', { n: (data?.price ?? 4000).toLocaleString('vi-VN') })}</button>`
        : `<button data-cafe="${on ? 'off' : 'on'}">${on ? t('Nghỉ') : t('Bắt đầu')}</button>`;
      const dr = data?.drinks || {};
      const info = own ? (on ? t('Đang bán · bấm F ở vỉa hè để bày quán') : t('Có đồ bày quán')) : t('Đen đá {a} · sữa đá {b} · trà đá {c} xu', { a: dr.den?.price ?? 12, b: dr.sua?.price ?? 15, c: dr.tra?.price ?? 5 });
      const row = document.createElement('div');
      row.innerHTML = `<div class="jb-card${on ? ' taken' : ''}"><div class="jb-main"><b>${t('Cà phê cóc vỉa hè')}<i class="jb-risk thief" title="${t('Khách uống xong đứng dậy tính tiền: không ra kịp là khách đi luôn, mất tiền nguyên liệu')}">${t('Khách quỵt')}</i></b>
        <small>${info}</small></div><div class="jb-act">${act}</div></div>`;
      el.append(row);
      row.querySelector('[data-cafe]').onclick = (e) => {
        if (waiting) return; waiting = true;
        const k = e.target.dataset.cafe;
        if (k === 'buy') call('lifeAct', 'cafe', '{}'); else call('lifeAct', 'trade', JSON.stringify({ kind: k === 'on' ? 'cafe' : '' }));
      };
    },
    update(dt) {
      if (pour?.filling) {
        pour.level = Math.min(1, pour.level + dt / 1.7);
        gauge.querySelector('.pg-fill').style.height = `${pour.level * 100}%`;
        if (pour.level >= 1) endPour();
      }
      if (busy() || !cafe) return;
      if (dist(cafe.group.position) > 15) { packUp(); toast(t('Đi xa quán quá: đã dọn quán.'), 2400); return; }
      if ((custT -= dt) <= 0) { custT = 14 + Math.random() * 18; spawnGuest(); }
      for (const g of [...guests]) {
        g.t += dt;
        if (g.phase === 'order' && g.t > 40) { toast(t('Khách ngồi đợi lâu không ai hỏi, bỏ đi rồi.'), 2600); leave(g, null); }
        else if ((g.phase === 'wait' || g.phase === 'made') && g.t > 100 && holding?.guest !== g) { toast(t('Khách đợi nước lâu quá, bỏ đi rồi.'), 2600); leave(g, null); }
        else if (g.phase === 'drink' && g.t > g.drinkT) {   // done: up to pay
          g.phase = 'pay'; g.t = 0; g.c.seated = false; g.c.play('idle');
          toast(t('Khách uống xong, đứng dậy tính tiền!'), 2600); audio?.sfx?.('message');
        } else if (g.phase === 'pay' && g.t > 12) {   // nobody came: off without paying
          toast(t('Khách đi luôn không trả tiền!'), 3000); audio?.sfx?.('error');
          waiting = true; call('lifeAct', 'serve', JSON.stringify({ kind: g.kind, outcome: 'skipped' }));
          leave(g, false);
        }
      }
    },
    hint() {
      if (player.ride || player.seat || player.push) return '';
      if (pour) return '';
      if (!cafe) return on && onSidewalk(me()) ? `<kbd>F</kbd> ${t('Bày quán cà phê ở đây')}` : '';
      if (waiting) return '';
      const payer = guestNear('pay', 2.4);
      if (payer) return `<kbd>F</kbd> ${t('Tính tiền ({d})', { d: DRINK[payer.kind].name() })}`;
      if (holding) {
        const g = holding.guest;
        return dist(g.c.root.position) < 1.8 ? `<kbd>F</kbd> ${t('Bưng {d} cho khách', { d: DRINK[g.kind].name() })}` : t('Bưng {d} ra cho khách', { d: DRINK[g.kind].name() });
      }
      const asker = guestNear('order');
      if (asker) return `<kbd>F</kbd> ${t('Hỏi khách uống gì')}`;
      if (dist(W(cafe.station)) < 1.4) {
        const next = guests.find((g) => g.phase === 'wait');
        if (next) return `<kbd>F</kbd> ${t('Pha {d}', { d: DRINK[next.kind].name() })}`;
      }
      if (dist(W(cafe.station)) < 1.4 && !guests.length) return `<kbd>F</kbd> ${t('Dọn quán')}`;
      return '';
    },
    key(e) {
      if (e.code !== 'KeyF' || e.repeat || player.ride || player.seat || player.push) return false;
      if (pour) { pour.filling = true; return true; }
      const h = api.hint();
      if (!h.includes('<kbd>')) return false;
      if (!cafe) { setUp(); return true; }
      const payer = guestNear('pay', 2.4);
      if (payer) {
        payer.phase = 'paid'; waiting = true;
        call('lifeAct', 'serve', JSON.stringify({ kind: payer.kind, outcome: payer.good ? 'paid' : 'bad' }));
        payer.c.lookToward(me(), 1); leave(payer, true); return true;
      }
      if (holding && dist(holding.guest.c.root.position) < 1.8) {   // the glass on the table in front of them
        const g = holding.guest;
        player.carry = null; g.cup = holding.obj; g.cup.position.copy(W(g.seat.table)); holding = null;
        g.phase = 'drink'; g.t = 0; g.drinkT = 25 + Math.random() * 20;
        audio?.sfx?.('click'); return true;
      }
      const asker = guestNear('order');
      if (asker) { asker.phase = 'wait'; asker.t = 0; toast(t('Khách: “{line}”', { line: SAY[asker.kind] }), 2600); return true; }
      const next = guests.find((g) => g.phase === 'wait');
      if (next && dist(W(cafe.station)) < 1.4) { startPour(next); return true; }
      if (!guests.length) { packUp(); return true; }
      return false;
    },
    keyUp(e) { if (e.code === 'KeyF' && pour?.filling) { pour.filling = false; endPour(); } },
    // Python's word: the café bought, the trade, a drink paid for (or not)
    set(msg) {
      if (msg.cafe) data = msg.cafe;
      if (msg.trade !== undefined) { on = msg.trade === 'cafe'; if (!on && cafe) packUp(); }
      if (['trade', 'cafe', 'serve'].includes(msg.act)) waiting = false;
      if (msg.act === 'cafe') { if (msg.cafe_bought) toast(t('Đã mua đồ bày quán cà phê!'), 3000); else if (msg.error === 'coins') toast(t('Không đủ xu.')); }
      if (msg.act === 'trade' && msg.error === 'cafe') toast(t('Cần mua đồ bày quán trước.'));
      if (msg.act === 'trade' && msg.traded === 'cafe') toast(t('Bắt đầu bán cà phê. Ra vỉa hè, bấm F để bày quán.'), 3400);
      if (msg.act === 'serve' && !msg.error) {
        if (msg.outcome === 'paid') { toast(t('Khách trả tiền: <b>+{n} xu</b> (đã trừ nguyên liệu)', { n: msg.amount }), 2600); audio?.sfx?.('coin'); }
        else if (msg.outcome === 'bad') { toast(t('Ly dở, khách chỉ trả nửa tiền: <b>{n} xu</b>', { n: msg.amount }), 2800); audio?.sfx?.('coin'); }
        else toast(t('Mất tiền nguyên liệu: <b>{n} xu</b>', { n: msg.amount }), 2600);
      }
      jobs.refresh();
    },
  };
  return api;
}

// The add-on's entry: the trade made with what the app's host offers, registered on the job board's hub
// (host.trades: its card on the board, its part of each frame, its hints and keys, the app's word on its money).
export function install(host) {
  host.trades.register('cafe', createCafe({ city: host.city, scene: host.scene, player: host.player, call: host.callPy, audio: host.audio, busy: host.uiBusy, jobs: host.jobs, Character: host.Character, library: host.library }));
}
