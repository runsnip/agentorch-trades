// Working for oneself (lifehome), a street cart: bánh mì sold from a pushcart on the sidewalk. Bought on the board
// (J) and delivered outside the boarding house; pushed with E (slowly; W/S on and back, A/D to turn); stocked at a
// bakery (F); set out to sell with F where one stops. People come by (more where there are shops about), F hands
// one a bánh mì. Stay set out too long in one place and the city's street patrol comes along: pack up (F) before
// they get there, or pay the fine. Prices and stock are Python's (life.py › cart_buy, stock_buy, sell, fine).
//
// createCart({ city, scene, player, call, audio, busy, home, jobs, Character, library }) →
//   { update(dt), hint(), key(e), set(msg), fillBoard(el) }

import * as THREE from 'three';
import { t } from '/i18n.js';

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BAKERIES = new Set(['banhmi', 'bakery']);

// ---- the cart: a steel frame on two bicycle wheels and a stand, a glass case on top with the loaves in it, a red
// board with BÁNH MÌ on the front, a little burner and pan at the side, a parasol; the handle at the back (−z)
function boardTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c4161c'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#ffd84a'; g.font = '900 78px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BÁNH MÌ', 256, 60);
  g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.fillText('Pa tê · Thịt · Ốp la', 256, 110);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function makeCart() {
  const g = new THREE.Group(), steel = std(0xb9bec4, { metalness: 0.7, roughness: 0.35 }), blue = std(0x2a6fb0, { roughness: 0.45 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(0.62, 0.5, 1.1), blue, 0, 0.58, 0);                    // the cabinet under the counter
  add(new THREE.BoxGeometry(0.66, 0.04, 1.16), steel, 0, 0.85, 0);                 // the counter top
  // the glass case and its frame
  const glass = new THREE.MeshStandardMaterial({ color: 0xdfeef2, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1 });
  add(new THREE.BoxGeometry(0.58, 0.42, 0.9), glass, 0, 1.08, 0.05);
  for (const [x, z] of [[-0.29, -0.4], [0.29, -0.4], [-0.29, 0.5], [0.29, 0.5]]) add(new THREE.BoxGeometry(0.025, 0.44, 0.025), steel, x, 1.08, z);
  add(new THREE.BoxGeometry(0.6, 0.02, 0.92), steel, 0, 1.3, 0.05);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.16), std(0xffffff, { map: boardTex() })); board.position.set(0, 0.73, 0.556); g.add(board);
  const sideBoard = board.clone(); sideBoard.rotation.y = Math.PI / 2; sideBoard.position.set(0.312, 0.73, 0); sideBoard.scale.set(1.6, 1, 1); g.add(sideBoard);
  // the loaves, laid in rows in the case (shown as many as there are in stock)
  const loafG = new THREE.CapsuleGeometry(0.035, 0.2, 4, 8); loafG.rotateZ(Math.PI / 2);
  const loafM = std(0xd99a4e, { roughness: 0.7 }), loaves = [];
  for (let k = 0; k < 30; k++) { const l = add(loafG, loafM, -0.18 + (k % 3) * 0.18, 0.9 + Math.floor(k / 15) * 0.07, -0.33 + (Math.floor(k / 3) % 5) * 0.17); l.visible = false; loaves.push(l); }
  // the burner and its pan on a shelf at the side, a jar of pickles
  add(new THREE.BoxGeometry(0.22, 0.03, 0.3), steel, -0.43, 0.82, 0.25);
  add(new THREE.CylinderGeometry(0.1, 0.08, 0.04, 16), std(0x2a2a2a, { metalness: 0.4 }), -0.43, 0.86, 0.25);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), std(0xe9a33a, { transparent: true, opacity: 0.85 }), 0.2, 0.93, 0.47);
  // the wheels at the front, two legs at the back, the handle
  const wheels = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.36, 0.28, 0.32); g.add(w);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 8, 28).rotateY(Math.PI / 2), std(0x161616)); tyre.castShadow = true; w.add(tyre);
    for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.48, 4), steel); sp.rotation.x = (k / 8) * Math.PI; w.add(sp); }
    wheels.push(w);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), steel, s * 0.27, 0.15, -0.48);
  }
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.76, 8).rotateZ(Math.PI / 2), steel, 0, 0.62, 0.32);   // the axle
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 8).rotateX(Math.PI / 2 - 0.35), steel, s * 0.25, 0.9, -0.72);
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 8).rotateZ(Math.PI / 2), std(0x222222), 0, 0.97, -0.9);   // the grip
  // the parasol over it
  add(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), steel, 0.25, 1.75, -0.2);
  const shade = add(new THREE.ConeGeometry(0.75, 0.3, 12, 1, true), std(0xf2c230, { side: THREE.DoubleSide }), 0.25, 2.3, -0.2);
  shade.castShadow = true;
  return { group: g, wheels, loaves, handles: [V(-0.2, 0.97, -0.9), V(0.2, 0.97, -0.9)] };
}

export function createCart({ city, scene, player, call, audio, busy, home, jobs, Character, library }) {
  const fronts = city?.fronts || [];
  let data = null, on = false, cart = null, open = false, waiting = false, stock = 0;
  let openAt = 0, openT = 0, custT = 10, patrolT = 30, queue = [], patrol = null;
  const toast = (h, ms) => jobs.toast(h, ms);
  const people = (re = /^(Male|Female)_Adult_/i) => {
    const all = library().filter((m) => m.family === 'biped' && m.animations?.length).map((m) => m.file);
    const pick = all.filter((f) => re.test(f) && f !== player.modelFile);
    return pick.length ? pick : all;
  };
  const me = () => player.root.position;
  const near = (p, r) => Math.hypot(p.x - me().x, p.z - me().z) < r;
  const showStock = () => { if (cart) cart.loaves.forEach((l, k) => (l.visible = k < stock)); };

  function place() {   // the cart, when there is one: outside the boarding house the first time
    if (cart || !data?.own) return;
    cart = makeCart(); scene.add(cart.group);
    const at = home?.parking ? home.parking.clone().add(V(-2.2, 0, 0)) : me().clone().add(V(2, 0, 0));
    cart.group.position.copy(at); cart.group.rotation.y = 0;
    showStock();
  }
  const cartNear = (r = 2.2) => cart && near(cart.group.position, r);
  const bakery = () => fronts.find((f) => BAKERIES.has(f.trade) && near(f, 3.5));
  // how busy a spot is: shops round about bring people by
  const busyness = (p) => fronts.reduce((n, f) => n + (Math.hypot(f.x - p.x, f.z - p.z) < 30 ? 1 : 0), 0);

  function setOpen(v) {
    open = v; openT = 0; openAt = v ? performance.now() : 0;
    if (v) { player.push = null; custT = 6; patrolT = 90 + Math.random() * 60; }
    else { for (const q of queue) leave(q); queue = []; }
  }
  function spawnCustomer() {
    const p = cart.group.position, a = Math.random() * Math.PI * 2;
    const files = people(), c = new Character({ name: t('Khách'), model: files[Math.floor(Math.random() * files.length)] || null, pick: null });
    c.human = true; c.ring.visible = false; c.lamp.visible = false; c.tag.visible = false;
    c.root.position.set(p.x + Math.cos(a) * 18, 0, p.z + Math.sin(a) * 18); scene.add(c.root);
    // up to the front of the cart (the other side from the seller), one after another
    const r = cart.group.rotation.y, front = p.clone().add(V(Math.sin(r), 0, Math.cos(r)).multiplyScalar(1.0 + queue.length * 0.8));
    c.walkTo(front, null, p.clone());
    queue.push({ c, t: 0 });
  }
  function leave(q) {
    const p = q.c.root.position, away = p.clone().add(p.clone().sub(cart.group.position).setY(0).normalize().multiplyScalar(20));
    q.c.walkTo(away, () => q.c.dispose());
    setTimeout(() => !q.c.disposed && q.c.dispose(), 20000);
  }
  function spawnPatrol() {
    const p = cart.group.position, a = Math.random() * Math.PI * 2, files = people(/^Male_Adult_/i), crew = [];
    for (let k = 0; k < 2; k++) {
      const c = new Character({ name: t('Trật tự đô thị'), model: files[(k + 1) % files.length] || null, pick: null });
      c.human = true; c.ring.visible = false; c.lamp.visible = false; c.tag.visible = false;
      c.root.position.set(p.x + Math.cos(a) * (32 + k), 0, p.z + Math.sin(a) * (32 + k * 1.2)); scene.add(c.root);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 12, 1, true), std(0xc4161c, { side: THREE.DoubleSide }));   // a red armband
      scene.add(arm); c.armband = arm;
      crew.push(c);
    }
    patrol = { crew, t: 0, phase: 'come' };
    toast(t('Trật tự đô thị đang đi tới! Dọn hàng (F) rồi đẩy xe đi mau!'), 4200);
    audio?.sfx?.('message');
  }
  function endPatrol() { if (!patrol) return; for (const c of patrol.crew) { c.armband?.removeFromParent(); c.dispose(); } patrol = null; }

  const api = {
    fillBoard(el) {
      const own = !!data?.own;
      const act = !own ? `<button data-cart="buy">${t('Mua xe đẩy · {n} xu', { n: (data?.price ?? 800).toLocaleString('vi-VN') })}</button>`
        : `<button data-cart="${on ? 'off' : 'on'}">${on ? t('Nghỉ') : t('Bắt đầu')}</button>`;
      const info = !own ? t('Xe đẩy kính, giao tận nhà trọ. Nhập bánh ở tiệm bánh mì ({c} xu/ổ), bán {s} xu/ổ.', { c: data?.cost ?? 4, s: data?.sell ?? 10 })
        : on ? t('Đang bán · trên xe còn {n} ổ. Đẩy xe tới chỗ đông người, bấm F để bày bán.', { n: stock }) : t('Có xe đẩy · trên xe còn {n} ổ', { n: stock });
      const row = document.createElement('div');
      row.innerHTML = `<div class="jb-card${on ? ' taken' : ''}"><div class="jb-main"><b>${t('Bán bánh mì xe đẩy')}<i class="jb-risk late" title="${t('Bày bán lâu một chỗ, trật tự đô thị sẽ tới: không dọn kịp là bị phạt')}">${t('Trật tự đô thị')}</i></b>
        <small>${info}</small></div><div class="jb-act">${act}</div></div>`;
      el.append(row);
      row.querySelector('[data-cart]').onclick = (e) => {
        if (waiting) return; waiting = true;
        const k = e.target.dataset.cart;
        if (k === 'buy') call('lifeAct', 'cart', '{}'); else call('lifeAct', 'trade', JSON.stringify({ kind: k === 'on' ? 'banhmi' : '' }));
      };
    },
    update(dt) {
      if (busy()) return;
      if (open && cart) {
        openT += dt;
        if (!near(cart.group.position, 3.5)) { setOpen(false); toast(t('Đi xa xe quá: dọn hàng rồi.'), 2400); }
        // people come by: more often where there are shops about
        if (stock > 0 && queue.length < 3 && (custT -= dt) <= 0) { custT = Math.max(7, 32 / (1 + busyness(cart.group.position) * 0.12)) * (0.7 + Math.random() * 0.6); spawnCustomer(); }
        for (const q of [...queue]) { q.t += dt; if (q.t > 30) { queue.splice(queue.indexOf(q), 1); leave(q); toast(t('Khách đợi lâu, bỏ đi rồi.'), 2200); } }
        // the street patrol, now and then, once set out a good while
        if (!patrol && openT > 60 && (patrolT -= dt) <= 0) { patrolT = 80 + Math.random() * 80; if (Math.random() < 0.6) spawnPatrol(); }
      }
      if (patrol) {
        patrol.t += dt;
        for (const c of patrol.crew) {
          const p = c.root.position, to = cart.group.position, d = Math.hypot(to.x - p.x, to.z - p.z);
          if (patrol.phase === 'come' && d > 1.8) { const v = V(to.x - p.x, 0, to.z - p.z).normalize(); p.addScaledVector(v, 1.5 * dt); c.lookToward(to, Math.min(1, dt * 6)); if (c.action !== 'walk') c.play('walk'); }
          else if (patrol.phase === 'come') { c.play('idle'); c.lookToward(to, 1); }
          if (c.armband && c.body?.object) {   // on the left arm
            let b = c.armBone; if (!b) c.body.object.traverse((o) => { if (!b && o.isBone && /(L[_ ]?|Left)UpperArm$|LeftArm$/i.test(o.name)) b = o; }); c.armBone = b;
            if (b) { b.getWorldPosition(c.armband.position); c.armband.position.y -= 0.12; c.armband.visible = c.body.object.visible; }
          }
        }
        const lead = patrol.crew[0], d = Math.hypot(cart.group.position.x - lead.root.position.x, cart.group.position.z - lead.root.position.z);
        if (patrol.phase === 'come' && d < 2.6) {
          patrol.phase = 'go'; patrol.t = 0;
          if (open) { call('lifeAct', 'fine', JSON.stringify({ kind: 'street' })); setOpen(false); toast(t('Trật tự đô thị: bán hàng lấn chiếm vỉa hè, phạt!'), 3600); audio?.sfx?.('error'); }
          else toast(t('Trật tự đô thị: “Lần sau đừng bày bán chỗ này nha.”'), 3200);
          for (const c of patrol.crew) c.walkTo(c.root.position.clone().add(V(Math.random() * 30 - 15, 0, Math.random() * 30 - 15)));
        }
        if (patrol.phase === 'go' && patrol.t > 10) endPatrol();
        if (patrol && patrol.phase === 'come' && patrol.t > 60) endPatrol();
      }
    },
    hint() {
      if (!cart || player.ride || player.seat || waiting) return '';
      if (open) {
        const q = queue[0];
        if (q && Math.hypot(q.c.root.position.x - cart.group.position.x, q.c.root.position.z - cart.group.position.z) < 1.4) return `<kbd>F</kbd> ${t('Bán một ổ bánh mì')} &nbsp; <small>${t('còn {n} ổ', { n: stock })}</small>`;
        return `<kbd>F</kbd> ${t('Dọn hàng')} &nbsp; <small>${stock ? t('còn {n} ổ · đợi khách', { n: stock }) : t('hết bánh')}</small>`;
      }
      if (player.push) {
        const b = bakery();
        if (b) return `<kbd>F</kbd> ${t('Nhập bánh mì ở <b>{shop}</b> ({c} xu/ổ)', { shop: esc(b.name), c: data?.cost ?? 4 })} &nbsp; <kbd>E</kbd> ${t('Buông xe')}`;
        return `${on ? `<kbd>F</kbd> ${t('Bày bán ở đây')} &nbsp; ` : ''}<kbd>E</kbd> ${t('Buông xe')}`;
      }
      if (cartNear()) return `<kbd>E</kbd> ${t('Đẩy <b>xe bánh mì</b>')}${on ? ` &nbsp; <kbd>F</kbd> ${t('Bày bán')}` : ''}`;
      return '';
    },
    key(e) {
      if (!cart || player.ride || player.seat || waiting) return false;
      if (e.code === 'KeyE') {
        if (open) return false;
        if (player.push) { player.push = null; audio?.sfx?.('click'); return true; }
        if (cartNear()) {   // behind the handle, facing the way the cart points
          const r = cart.group.rotation.y;
          player.root.position.copy(cart.group.position).add(V(-Math.sin(r), 0, -Math.cos(r)).multiplyScalar(1.0));
          player.root.rotation.set(0, r, 0); player.push = cart; audio?.sfx?.('click'); return true;
        }
        return false;
      }
      if (e.code !== 'KeyF') return false;
      if (open) {
        const q = queue[0];
        if (q && Math.hypot(q.c.root.position.x - cart.group.position.x, q.c.root.position.z - cart.group.position.z) < 1.4) {
          waiting = true; call('lifeAct', 'sell', '{}');
          q.sold = true; return true;
        }
        setOpen(false); toast(t('Đã dọn hàng.'), 1800); audio?.sfx?.('click'); return true;
      }
      if (player.push && bakery()) { waiting = true; call('lifeAct', 'stock', JSON.stringify({ n: (data?.max ?? 30) - stock })); return true; }
      if (on && (player.push || cartNear())) {
        if (!stock) { toast(t('Trên xe hết bánh: đẩy xe tới tiệm bánh mì để nhập.'), 3000); return true; }
        setOpen(true); toast(t('Bày bán bánh mì. Khách sẽ ghé mua.'), 2600); audio?.sfx?.('click'); return true;
      }
      return false;
    },
    // Python's word: the cart and its stock, the trade, a sale
    set(msg) {
      if (msg.cart) { data = msg.cart; stock = msg.cart.stock; place(); showStock(); }
      if (msg.trade !== undefined) { on = msg.trade === 'banhmi'; if (!on && open) setOpen(false); }
      if (['trade', 'cart', 'stock', 'sell'].includes(msg.act)) waiting = false;
      if (msg.act === 'cart') {
        if (msg.cart_bought) toast(t('Đã mua xe đẩy! Xe đang đậu trước nhà trọ.'), 3600);
        else if (msg.error === 'coins') toast(t('Không đủ xu.'));
      }
      if (msg.act === 'trade' && msg.error === 'cart') toast(t('Cần mua xe đẩy trước.'));
      if (msg.act === 'trade' && msg.traded === 'banhmi') toast(t('Bắt đầu bán bánh mì. Đẩy xe tới tiệm bánh để nhập bánh.'), 3600);
      if (msg.act === 'stock') {
        if (msg.stocked) { toast(t('Nhập {n} ổ bánh mì (−{c} xu).', { n: msg.stocked, c: msg.stocked * (data?.cost ?? 4) }), 3000); audio?.sfx?.('coin'); }
        else toast(msg.error === 'full' ? t('Xe đã đầy bánh.') : t('Không đủ xu.'));
      }
      if (msg.act === 'sell') {
        const q = queue.find((x) => x.sold);
        if (q) {
          queue.splice(queue.indexOf(q), 1);
          if (msg.sold) {   // a loaf in a paper bag in the hand, off they go
            const bag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.24), std(0xe8dcc0)); q.c.root.add(bag); bag.position.set(0.18, 0.85, 0.15);
            toast(t('Bán được một ổ: <b>+{n} xu</b>', { n: msg.sold }), 2200); audio?.sfx?.('coin');
          }
          leave(q);
          queue.forEach((x, k) => { const r = cart.group.rotation.y; x.c.walkTo(cart.group.position.clone().add(V(Math.sin(r), 0, Math.cos(r)).multiplyScalar(1.0 + k * 0.8)), null, cart.group.position.clone()); });
        }
        if (msg.error === 'early') toast(t('Từ từ, đang gói bánh…'), 1500);
      }
      if (open && stock <= 0 && !queue.length) toast(t('Hết bánh rồi! Dọn hàng, đi nhập thêm.'), 3000);
      jobs.refresh();
    },
  };
  return api;
}

// The add-on's entry: the trade made with what the app's host offers, registered on the job board's hub
// (host.trades: its card on the board, its part of each frame, its hints and keys, the app's word on its money).
export function install(host) {
  host.trades.register('banhmi', createCart({ city: host.city, scene: host.scene, player: host.player, call: host.callPy, audio: host.audio, busy: host.uiBusy, home: host.homePlace(), jobs: host.jobs, Character: host.Character, library: host.library }));
}
