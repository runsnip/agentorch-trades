// Working for oneself (lifehome), the first trade: a motorbike taxi (xe ôm). Taken up on the board (J) with a
// motorbike to hand (owned or rented today). While out riding it, now and then someone waves for a ride from the
// sidewalk a little way off: ride up, stop and take them on (F); they sit behind and say where to; the map shows the
// way; stop there and let them off (F). The fare is Python's (life.py › fare), by the distance.
//
// createXeom({ city, scene, player, call, audio, jobs, Character, library }) → { update(dt), hint(), key(e), set(msg) }

import * as THREE from 'three';
import { t } from '/i18n.js';

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const WAIT = 120;            // seconds a fare waits before giving up
const ASKS = [   // what they say when they get on ({shop}: where to)
  'Cho em tới {shop} nha anh.', 'Chở cô tới {shop} với.', 'Đi {shop}, chạy từ từ thôi nha.', 'Anh ơi, {shop}, gấp chút nha.', 'Tới {shop}, bao nhiêu cũng được.',
];

export function createXeom({ city, scene, player, call, audio, jobs, Character, library }) {
  const fronts = city?.fronts || [];
  let on = false, clock = 25, fare = null, waiting = false;
  // fare = { c, phase: 'wait' | 'ride', at: { x, z, name }, dest, t, from: Vector3, startedAt }
  const toast = (h, ms) => jobs.toast(h, ms);
  const people = () => {
    const mine = player.modelFile, all = library().filter((m) => m.family === 'biped' && m.animations?.length).map((m) => m.file);
    const casual = all.filter((f) => /^(Male|Female)_Adult_/i.test(f) && f !== mine);
    return casual.length ? casual : all;
  };
  const onMoto = () => player.ride?.v.kind === 'moto';

  function spawn() {
    const me = player.root.position;
    const pool = fronts.filter((f) => { const d = Math.hypot(f.x - me.x, f.z - me.z); return d > 60 && d < 200; });
    if (!pool.length) return;
    const f = pool[Math.floor(Math.random() * pool.length)], [nx, nz] = f.n;
    const files = people(), c = new Character({ name: t('Khách'), model: files[Math.floor(Math.random() * files.length)] || null, pick: null });
    c.human = true; c.ring.visible = false; c.lamp.visible = false; c.tag.visible = false;
    const at = { x: f.x + nx * 1.8, z: f.z + nz * 1.8, name: f.name };   // near the kerb, looking out at the road
    c.placeAt(new THREE.Vector3(at.x, 0, at.z), new THREE.Vector3(at.x + nx, 0, at.z + nz)); scene.add(c.root);
    fare = { c, phase: 'wait', at, t: 0, waveT: 0 };
    jobs.guide({ to: at, label: t('KHÁCH ĐANG VẪY XE') });
    toast(t('Có khách vẫy xe ôm trước <b>{shop}</b>, cách {m} m.', { shop: esc(f.name), m: Math.round(Math.hypot(at.x - me.x, at.z - me.z)) }), 3800);
    audio?.sfx?.('message');
  }
  function end() {
    if (!fare) return;
    const c = fare.c;
    if (fare.phase === 'ride' || fare.phase === 'off') { scene.attach(c.root); }
    c.dispose(); fare = null; jobs.guide(null);
  }
  function pickUp() {
    const v = player.ride.v, c = fare.c;
    // sitting behind the rider, side-saddle, facing the left
    v.m.group.add(c.root); c.root.position.set(0, 0.72 - 0.6, -0.62); c.root.rotation.set(0, Math.PI / 2, 0);
    c.seated = true; c.play('sit');
    const me = player.root.position;
    const pool = fronts.filter((f) => { const d = Math.hypot(f.x - me.x, f.z - me.z); return d > 220 && d < 650; });
    const f = pool[Math.floor(Math.random() * pool.length)] || fronts[0];
    const dest = { x: f.x + f.n[0] * 1.8, z: f.z + f.n[1] * 1.8, name: f.name, door: new THREE.Vector3(f.x - f.n[0] * 0.8, 0, f.z - f.n[1] * 0.8) };
    Object.assign(fare, { phase: 'ride', dest, startedAt: performance.now(), from: { x: fare.at.x, z: fare.at.z } });
    jobs.guide({ to: dest, label: t('CHỞ KHÁCH TỚI') });
    toast(t('Khách: “{line}”', { line: esc(ASKS[Math.floor(Math.random() * ASKS.length)].replace('{shop}', f.name)) }), 4200);
    audio?.sfx?.('click');
  }
  function dropOff() {
    const c = fare.c, v = player.ride.v, metres = jobs.routeLength(fare.from, fare.dest), secs = (performance.now() - fare.startedAt) / 1000;
    scene.attach(c.root); c.seated = false;
    const side = new THREE.Vector3(Math.cos(v.heading), 0, -Math.sin(v.heading)).multiplyScalar(0.8);
    c.root.position.add(side).setY(0); c.root.rotation.set(0, c.root.rotation.y, 0);
    c.walkTo(fare.dest.door);   // off into the shop
    fare.phase = 'off'; fare.t = 0;
    jobs.guide(null);
    waiting = true; call('lifeAct', 'fare', JSON.stringify({ m: Math.round(metres), s: Math.round(secs) }));
  }

  const near = (a) => { const p = player.root.position; return Math.hypot(a.x - p.x, a.z - p.z); };
  const stopped = () => Math.abs(player.ride?.speed || 0) < 1;
  const api = {
    get on() { return on; },
    // the board's part for it: take the trade up, or put it down
    fillBoard(el) {
      const row = document.createElement('div');
      row.innerHTML = `<div class="jb-card${on ? ' taken' : ''}"><div class="jb-main"><b>${t('Chạy xe ôm')}<i class="jb-risk thief" title="${t('Gần chốt cảnh sát giao thông: chạy quá 30 km/h, lấn làn, chạy trên vỉa hè sẽ bị phạt')}">${t('CSGT')}</i></b>
        <small>${on ? t('Đang chạy: chạy xe máy ngoài phố, khách sẽ vẫy') : t('Cần xe máy điện (mua hoặc thuê). Khách vẫy dọc đường, cước theo quãng đường')}</small></div>
        <div class="jb-act"><button data-xeom="${on ? 'off' : 'on'}">${on ? t('Nghỉ') : t('Bắt đầu')}</button></div></div>`;
      el.append(row);
      row.querySelector('[data-xeom]').onclick = (e) => { if (waiting) return; waiting = true; call('lifeAct', 'trade', JSON.stringify({ kind: e.target.dataset.xeom === 'on' ? 'xeom' : '' })); };
    },
    update(dt) {
      if (fare) {
        fare.t += dt;
        if (fare.phase === 'wait') {
          if ((fare.waveT -= dt) <= 0) { fare.waveT = 3; fare.c.play('wave'); setTimeout(() => fare?.phase === 'wait' && fare.c.play('idle'), 1800); }
          if (fare.t > WAIT || !on) { toast(t('Khách đợi lâu quá, đi xe khác rồi.'), 3000); end(); clock = 30; }
        } else if (fare.phase === 'off' && fare.t > 6) end();
        return;
      }
      if (!on || !onMoto() || jobs.busy() || player.seat) return;
      if ((clock -= dt) <= 0) { clock = 35 + Math.random() * 45; spawn(); }
    },
    hint() {
      if (!fare || !onMoto() || waiting) return '';
      if (fare.phase === 'wait' && near(fare.at) < 3.5) return stopped() ? `<kbd>F</kbd> ${t('Đón khách')}` : t('Dừng xe lại để đón khách');
      if (fare.phase === 'ride' && near(fare.dest) < 4.5) return stopped() ? `<kbd>F</kbd> ${t('Trả khách')}` : t('Dừng xe lại để trả khách');
      return '';
    },
    key(e) {
      if (e.code !== 'KeyF' || !api.hint().includes('<kbd>')) return false;
      if (fare.phase === 'wait') pickUp(); else dropOff();
      return true;
    },
    // Python's word: the trade taken up or put down, a fare paid
    set(msg) {
      const was = on;
      if (msg.trade !== undefined) { on = msg.trade === 'xeom'; jobs.refresh(); }
      if (msg.act === 'trade' || msg.act === 'fare') waiting = false;
      if (msg.act === 'trade') {
        if (msg.error === 'moto') toast(t('Chạy xe ôm cần xe máy điện: mua hoặc thuê ở tiệm sửa xe.'), 3600);
        else if (msg.traded === 'xeom') { toast(t('Bắt đầu chạy xe ôm. Lên xe máy ra phố, khách sẽ vẫy.'), 3600); clock = 15; }
        else if (!msg.error && was && !on) { if (!msg.traded) toast(t('Nghỉ chạy xe ôm.'), 2400); if (fare?.phase === 'wait') end(); }
      }
      if (msg.act === 'fare') {
        if (msg.fare) { toast(t('Khách trả tiền: <b>+{n} xu</b>', { n: msg.fare }), 3600); audio?.sfx?.('coin'); }
        else toast(t('Khách chưa trả tiền được, thử lại sau.'), 2600);
      }
    },
  };
  return api;
}

// The add-on's entry: the trade made with what the app's host offers, registered on the job board's hub
// (host.trades: its card on the board, its part of each frame, its hints and keys, the app's word on its money).
export function install(host) {
  host.trades.register('xeom', createXeom({ city: host.city, scene: host.scene, player: host.player, call: host.callPy, audio: host.audio, jobs: host.jobs, Character: host.Character, library: host.library }));
}
