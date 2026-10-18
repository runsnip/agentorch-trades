// A shop of one's own (lifehome): a corner shop (tạp hoá) in a house taken for rent. The city has houses standing
// empty with a CHO THUÊ board on their shutter (city.vacant); F at one takes it (the deposit and the fit-out, then
// rent each day: the app's, life.py › shop_rent). The shutter goes up, the room is fitted out (shelves of goods
// along the walls, a counter, a drinks fridge, the shop's board over the front). Goods are ordered at a wholesaler
// (an "Đại lý" rice and fish-sauce shop) and delivered to the shelves. With the shop open, people come in, look
// along the shelves and bring something to the counter: F there takes the money. Now and then one walks out with
// it instead: catch them before they're away. Goods kept too long go off (the app counts the days).
//
// createShop({ host }) → a trade for the hub: { fillBoard, update, hint, key, set }

import * as THREE from 'three';
import { t } from '/i18n.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (n) => Number(n).toLocaleString('vi-VN');
const WHOLESALE = new Set(['rice']);   // "Gạo · Nước Mắm — Đại lý cấp 1": the wholesaler
const GOODS_C = [0xc0392b, 0xe67e22, 0xf1c40f, 0x27ae60, 0x2980b9, 0x8e44ad, 0xecf0f1, 0x16a085, 0xd35400];

function boardTex(name) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#1d5fb4'; g.fillRect(0, 0, 768, 160);
  g.fillStyle = '#ffd84a'; g.font = '900 74px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('TẠP HOÁ', 384, 64);
  g.fillStyle = '#fff'; g.font = '800 34px sans-serif'; g.fillText((name || '').toUpperCase().slice(0, 28), 384, 128);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

export function createShop(host) {
  const { scene, player, city } = host, jobs = host.jobs, call = host.callPy;
  let data = null, on = false, waiting = false, shop = null, guests = [], custT = 8;
  const toast = (h, ms) => jobs.toast(h, ms);
  const me = () => player.root.position;
  const dist = (p) => Math.hypot(p.x - me().x, p.z - me().z);
  const vacant = () => city.vacant || [];
  const people = () => {
    const all = host.library().filter((m) => m.family === 'biped' && m.animations?.length).map((m) => m.file);
    const pick = all.filter((f) => /^(Male|Female)_Adult_/i.test(f) && f !== player.modelFile);
    return pick.length ? pick : all;
  };

  // ---- the shop, fitted out in the house's room (u along the front, v in from it)
  function fitOut(v) {
    const r = v.room, w = r.width, d = r.depth, P = (u, vv, y = 0) => V(r.x + r.along[0] * u + r.inward[0] * vv, y, r.z + r.along[1] * u + r.inward[1] * vv);
    const turn = Math.atan2(r.along[0], r.along[1]) + Math.PI / 2;   // a mesh's +x along the front, +z in to the back
    const g = new THREE.Group(); scene.add(g);
    const add = (geo, mat, u, y, vv, extra = 0) => { const m = new THREE.Mesh(geo, mat); m.position.copy(P(u, vv, y)); m.rotation.y = turn + extra; m.castShadow = true; g.add(m); return m; };
    const walls = [], solid = (u0, u1, v0, v1) => { const a = P(u0, v0), b = P(u1, v1); walls.push({ y: 0, kind: 'shop', minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) }); };
    const wood = std(0x8a6a4a), steel = std(0xb9bec4, { metalness: 0.5, roughness: 0.4 });
    // shelves down both walls: uprights, four boards, the goods on them (as many shown as are in stock)
    const slots = [], v0 = 0.7, v1 = Math.max(v0 + 1, d - 1.9);
    for (const [ua, ub] of [[0.05, 0.5], [w - 0.5, w - 0.05]]) {
      for (const vv of [v0, (v0 + v1) / 2, v1]) add(new THREE.BoxGeometry(0.45, 1.9, 0.04), steel, (ua + ub) / 2, 0.95, vv);
      for (const y of [0.15, 0.6, 1.05, 1.5]) {
        add(new THREE.BoxGeometry(0.45, 0.025, v1 - v0), wood, (ua + ub) / 2, y, (v0 + v1) / 2);
        for (let vv = v0 + 0.12; vv < v1 - 0.08; vv += 0.2) slots.push({ u: (ua + ub) / 2 + (Math.random() - 0.5) * 0.12, y, vv, c: GOODS_C[Math.floor(Math.random() * GOODS_C.length)], tall: Math.random() < 0.4 });
      }
      solid(ua, ub, v0, v1);
    }
    const goods = slots.map((s) => {
      const m = add(s.tall ? new THREE.CylinderGeometry(0.045, 0.045, 0.26, 10) : new THREE.BoxGeometry(0.2, 0.22, 0.14), std(s.c, { roughness: 0.45 }), s.u, s.y + (s.tall ? 0.145 : 0.125), s.vv);
      m.visible = false; return m;
    });
    // the counter across the back, a cash box and a glass jar of sweets on it; the drinks fridge in the corner
    const cu0 = w * 0.3, cu1 = w - 0.6, cv = d - 1.45;
    add(new THREE.BoxGeometry(cu1 - cu0, 0.95, 0.5), std(0xe8e4dc, { roughness: 0.4 }), (cu0 + cu1) / 2, 0.475, cv);
    add(new THREE.BoxGeometry(cu1 - cu0 + 0.04, 0.03, 0.54), wood, (cu0 + cu1) / 2, 0.965, cv);
    add(new THREE.BoxGeometry(0.32, 0.12, 0.24), std(0x2a2a2a), cu1 - 0.35, 1.04, cv);
    add(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 14), std(0xdfeef2, { transparent: true, opacity: 0.4, roughness: 0.05 }), cu0 + 0.3, 1.09, cv);
    solid(cu0, cu1, cv - 0.25, cv + 0.25);
    add(new THREE.BoxGeometry(0.7, 1.9, 0.6), std(0xf4f4f4, { roughness: 0.3 }), 0.45, 0.95, d - 0.5);
    add(new THREE.PlaneGeometry(0.58, 1.6), std(0x9fd3e6, { transparent: true, opacity: 0.45, roughness: 0.05, emissive: 0x1a3a44 }), 0.45, 1.0, d - 0.79, Math.PI);
    for (let k = 0; k < 12; k++) add(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), std(GOODS_C[k % GOODS_C.length]), 0.25 + (k % 4) * 0.13, 0.45 + Math.floor(k / 4) * 0.5, d - 0.6);
    solid(0.1, 0.8, d - 0.8, d - 0.2);
    // the shop's board over the front
    const board = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w + 0.2, 4.6), 0.9), std(0xffffff, { map: boardTex(player.name), roughness: 0.5 }));
    const bp = P(w / 2, -0.38, v.sTop + 0.5);   // (the room starts 0.3 m in from the front: out past it)
    board.position.copy(bp); board.rotation.y = Math.atan2(v.n[0], v.n[1]); g.add(board);
    host.addWalls(walls);
    return { g, goods, walls, P, w, d, counter: P((cu0 + cu1) / 2, cv - 0.75), till: P((cu0 + cu1) / 2, cv + 0.6), door: P(w / 2, -1.2), inside: P(w / 2, 0.6),
      browse: [P(1.0, v0 + 0.6), P(1.0, v1 - 0.4), P(w - 1.0, v0 + 0.6), P(w - 1.0, v1 - 0.4)], turnIn: Math.atan2(r.inward[0], r.inward[1]) };
  }
  function showGoods() { if (!shop) return; const n = data?.goods || 0, all = shop.fit.goods, k = Math.round((n / (data?.max || 120)) * all.length); all.forEach((m, i) => (m.visible = i < k)); }
  function open(v) {   // the shutter rolls up, the board comes down, the room is fitted out
    shop = { v, fit: fitOut(v), lift: 0 };
    v.sign.visible = false;
    host.removeWalls([v.front]);
    showGoods();
  }
  function close() {   // given up: emptied, the shutter down again, the board back
    if (!shop) return;
    for (const g of [...guests]) leave(g);
    host.removeWalls(shop.fit.walls); shop.fit.g.removeFromParent();
    const v = shop.v; v.shutter.position.y = (v.sTop + 0.14) / 2; v.shutter.scale.y = 1; v.sign.visible = true; host.addWalls([v.front]);
    shop = null;
  }

  // ---- customers
  function spawn() {
    const f = shop.fit, files = people(), c = host.Character && new host.Character({ name: t('Khách'), model: files[Math.floor(Math.random() * files.length)] || null, pick: null });
    c.human = true; c.ring.visible = false; c.lamp.visible = false; c.tag.visible = false;
    const out = V(shop.v.n[0], 0, shop.v.n[1]), side = V(-out.z, 0, out.x).multiplyScalar(Math.random() < 0.5 ? -14 : 14);
    c.root.position.copy(f.door).add(out.clone().multiplyScalar(2)).add(side); scene.add(c.root);
    const g = { c, phase: 'in', t: 0, thief: Math.random() < 0.12, spot: f.browse[Math.floor(Math.random() * f.browse.length)].clone() };
    c.walkTo(f.door.clone(), () => c.walkTo(f.inside.clone(), () => c.walkTo(g.spot, () => { g.phase = 'browse'; g.t = 0; c.play('idle'); })));
    guests.push(g);
  }
  function leave(g) {
    const c = g.c, f = shop?.fit;
    guests.splice(guests.indexOf(g), 1);
    g.mark?.removeFromParent();
    if (!f) { c.dispose(); return; }
    const out = V(shop.v.n[0], 0, shop.v.n[1]);
    c.walkTo(f.inside.clone(), () => c.walkTo(f.door.clone(), () => c.walkTo(f.door.clone().add(out.multiplyScalar(3)).add(V(Math.random() * 20 - 10, 0, Math.random() * 20 - 10)), () => c.dispose())));
    setTimeout(() => !c.disposed && c.dispose(), 30000);
  }
  const mark = () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 4), std(0xff2a2a, { emissive: 0xff1010, emissiveIntensity: 0.9 })); m.rotation.x = Math.PI; scene.add(m); return m; };

  const nearVacant = () => vacant().find((v) => dist(v) < 2.6 && v.sign.visible);
  const wholesaler = () => (city.fronts || []).find((f) => WHOLESALE.has(f.trade) && dist(f) < 3.2);
  const atTill = () => shop && dist(shop.fit.till) < 1.6;

  const api = {
    fillBoard(el) {
      const s = data || {};
      let info, act;
      if (!s.own) {
        info = t('Thuê nhà có bảng CHO THUÊ ngoài phố: cọc {d} + sửa sang {f} xu, thuê {r} xu/ngày. Nhập hàng ở đại lý, bán {p} xu/món.', { d: fmt(s.deposit ?? 10000), f: fmt(s.fit_out ?? 5000), r: s.rent ?? 120, p: s.price ?? 10 });
        act = `<button data-shop="find">${t('Chỉ đường tới nhà cho thuê')}</button>`;
      } else {
        info = t('Trên kệ {g}/{m} món{sp} · thuê {r} xu/ngày · cọc đang giữ {h} xu', { g: s.goods, m: s.max, sp: s.spoiling ? t(' ({n} món sắp hư)', { n: s.spoiling }) : '', r: s.rent, h: fmt(s.held) });
        act = `<button data-shop="${on ? 'off' : 'on'}">${on ? t('Đóng cửa') : t('Mở cửa bán')}</button> <button data-shop="leave" class="jb-ghost">${t('Trả nhà')}</button>`;
      }
      const row = document.createElement('div');
      row.innerHTML = `<div class="jb-card${on ? ' taken' : ''}"><div class="jb-main"><b>${t('Tiệm tạp hoá của bạn')}<i class="jb-risk late" title="${t('Hàng để quá {n} ngày là hư; có khách cầm hàng đi không trả tiền, phải đuổi theo', { n: s.spoil_days ?? 4 })}">${t('Hàng hư · kẻ cắp')}</i></b>
        <small>${info}</small></div><div class="jb-act vs-act">${act}</div></div>`;
      el.append(row);
      row.querySelectorAll('[data-shop]').forEach((b) => (b.onclick = () => {
        const k = b.dataset.shop;
        if (k === 'find') {   // the nearest house for rent, on the map
          const v = vacant().filter((x) => x.sign.visible).sort((a, b2) => dist(a) - dist(b2))[0];
          if (v) { jobs.guide({ to: { x: v.x, z: v.z, name: t('Nhà cho thuê') }, label: t('NHÀ CHO THUÊ') }); toast(t('Đã chỉ đường tới nhà cho thuê gần nhất.'), 2400); }
          return;
        }
        if (waiting) return; waiting = true;
        if (k === 'leave') call('lifeAct', 'unlease', '{}');
        else call('lifeAct', 'trade', JSON.stringify({ kind: k === 'on' ? 'tiem' : '' }));
      }));
    },
    update(dt) {
      if (shop && shop.lift < 1) {   // the shutter rolling up into its box
        shop.lift = Math.min(1, shop.lift + dt * 0.6);
        const v = shop.v, h0 = v.sTop - 0.14; v.shutter.scale.y = Math.max(0.03, 1 - shop.lift); v.shutter.position.y = v.sTop - (h0 * v.shutter.scale.y) / 2;
      }
      if (!shop || host.uiBusy()) return;
      if (on && (data?.goods || 0) > 0 && guests.length < 3 && dist(shop.fit.inside) < 40 && (custT -= dt) <= 0) { custT = 12 + Math.random() * 16; spawn(); }
      for (const g of [...guests]) {
        g.t += dt;
        const c = g.c, p = c.root.position;
        if (g.phase === 'browse' && g.t > 4 + Math.random() * 0.1 * 40) {
          if (g.thief) {   // off out with it
            g.phase = 'steal'; g.t = 0; c.play('walk'); g.mark = mark();
            c.walkTo(shop.fit.door.clone(), () => c.walkTo(shop.fit.door.clone().add(V(shop.v.n[0], 0, shop.v.n[1]).multiplyScalar(16)).add(V(Math.random() * 10 - 5, 0, Math.random() * 10 - 5))));
            toast(t('Có khách cầm hàng đi ra cửa không trả tiền! Chặn lại!'), 3000); host.audio?.sfx?.('message');
          } else { g.phase = 'pay'; g.t = 0; c.walkTo(shop.fit.counter.clone(), () => { c.lookToward(shop.fit.till, 1); g.phase = 'till'; g.t = 0; }); }
        } else if (g.phase === 'till' && g.t > 40) { toast(t('Khách đợi tính tiền lâu quá, bỏ đi.'), 2400); leave(g); }
        else if (g.phase === 'steal') {
          g.mark.position.set(p.x, 2.25, p.z);
          if (dist(p) < 1.2) { toast(t('Bắt được rồi! Khách trả lại món hàng.'), 2600); host.audio?.sfx?.('coin'); leave(g); }
          else if (p.distanceTo(shop.fit.door) > 14 || g.t > 25) { waiting = true; call('lifeAct', 'shopsale', JSON.stringify({ stolen: true })); toast(t('Kẻ cắp chạy mất một món hàng.'), 2600); host.audio?.sfx?.('error'); g.mark.removeFromParent(); guests.splice(guests.indexOf(g), 1); setTimeout(() => !c.disposed && c.dispose(), 8000); }
        }
      }
    },
    hint() {
      if (player.ride || player.seat || player.push || waiting) return '';
      if (!data?.own) { const v = nearVacant(); return v ? `<kbd>F</kbd> ${t('Thuê nhà này mở tiệm: cọc {d} + sửa sang {f} xu · {r} xu/ngày', { d: fmt(data?.deposit ?? 10000), f: fmt(data?.fit_out ?? 5000), r: data?.rent ?? 120 })}` : ''; }
      const ws = wholesaler();
      if (ws) return (data.goods || 0) >= (data.max || 120) ? t('Kệ hàng đã đầy') : `<kbd>F</kbd> ${t('Đặt {n} món giao về tiệm ({c} xu/món)', { n: (data.max || 120) - (data.goods || 0), c: data.cost ?? 6 })}`;
      if (atTill()) { const g = guests.find((x) => x.phase === 'till'); return g ? `<kbd>F</kbd> ${t('Tính tiền cho khách')}` : ''; }
      return '';
    },
    key(e) {
      if (e.code !== 'KeyF' || !api.hint().includes('<kbd>')) return false;
      if (!data?.own) { const v = nearVacant(); waiting = true; call('lifeAct', 'lease', JSON.stringify({ house: v.id })); api.leasing = v; return true; }
      if (wholesaler()) { waiting = true; call('lifeAct', 'restock', JSON.stringify({ n: (data.max || 120) - (data.goods || 0) })); return true; }
      const g = guests.find((x) => x.phase === 'till');
      if (g) { g.phase = 'paying'; waiting = true; call('lifeAct', 'shopsale', '{}'); api.paying = g; return true; }
      return false;
    },
    // the app's word: the lease, the goods, the trade, a sale
    set(msg) {
      if (msg.shop) {
        data = msg.shop;
        if (data.own && !shop) { const v = vacant().find((x) => x.id === data.house); if (v) open(v); }
        if (!data.own && shop) close();
        showGoods();
      }
      if (msg.trade !== undefined) on = msg.trade === 'tiem';
      if (['trade', 'lease', 'unlease', 'restock', 'shopsale'].includes(msg.act)) waiting = false;
      for (const n of msg.notes || []) {
        if (n === 'deposit') toast(t('Không đủ tiền thuê, chủ nhà trừ vào tiền cọc.'), 3600);
        else if (n === 'ended') toast(t('Hết tiền thuê lẫn tiền cọc: chủ nhà lấy lại nhà.'), 4200);
        else if (n.startsWith('spoiled:')) toast(t('{n} món hàng để lâu đã hư, phải bỏ.', { n: n.split(':')[1] }), 3600);
      }
      if (msg.act === 'lease') {
        if (msg.leased !== undefined) { toast(t('Đã thuê nhà! Cửa cuốn đang kéo lên. Đặt hàng ở đại lý để bày kệ.'), 4200); host.audio?.sfx?.('coin'); jobs.guide(null); }
        else if (msg.error === 'coins') toast(t('Không đủ xu: cần {n} xu.', { n: fmt((data?.deposit ?? 10000) + (data?.fit_out ?? 5000)) }), 3000);
      }
      if (msg.act === 'unlease' && msg.left !== undefined) toast(t('Đã trả nhà, nhận lại {n} xu tiền cọc.', { n: fmt(msg.left) }), 3600);
      if (msg.act === 'restock') {
        if (msg.restocked) { toast(t('Đã đặt {n} món, đại lý giao tới kệ tiệm.', { n: msg.restocked }), 3000); host.audio?.sfx?.('coin'); }
        else toast(msg.error === 'full' ? t('Kệ hàng đã đầy') : t('Không đủ xu.'));
      }
      if (msg.act === 'trade' && msg.traded === 'tiem') toast(t('Tiệm đã mở cửa. Đứng ở quầy để tính tiền cho khách.'), 3200);
      if (msg.act === 'trade' && msg.error === 'shop') toast(t('Cần thuê nhà mở tiệm trước.'));
      if (msg.act === 'shopsale') {
        const g = api.paying; api.paying = null;
        if (msg.sold) { toast(t('Bán được: <b>+{n} xu</b>', { n: msg.sold }), 2000); host.audio?.sfx?.('coin'); }
        else if (msg.error === 'early') toast(t('Từ từ, đang bỏ đồ vào bịch…'), 1500);
        if (g) leave(g);
      }
      jobs.refresh();
    },
  };
  return api;
}

// The add-on's entry: registered on the job board's hub.
export function install(host) {
  host.trades.register('tiem', createShop(host));
}
