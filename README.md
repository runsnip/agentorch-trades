# AgentOrch trades

The trades of lifehome (working for oneself) — each one a package of its own that AgentOrch downloads when the
player picks it on the job board (J):

| Folder | Package | Trade |
|---|---|---|
| `xeom/` | `trade-xeom` | Motorbike taxi (xe ôm) |
| `banhmi/` | `trade-banhmi` | Bánh mì pushcart |
| `suaxe/` | `trade-suaxe` | Roadside bike repair |
| `cafe/` | `trade-cafe` | Sidewalk café (cà phê cóc) |

## How a trade plugs in

A trade folder holds `manifest.json` (`{"name": "trade-<id>", "version", "entry", "requires": {"host": 3}}`) and its
module. The entry exports `install(host)` and registers the trade on the board's hub:

```js
export function install(host) {
  host.trades.register('<id>', {
    fillBoard(el) {},   // its card on the board (J): what it is, buy / start / stop
    update(dt) {},      // every frame
    hint() {},          // what F/E does here: html, or ''
    key(e) {},          // F/E: true if it took the key
    keyUp(e) {},        // optional: a key let go
    set(msg) {},        // the app's word: the player's coins, the trade on, its things, the outcome of an action
  });
}
```

What the host offers (AgentOrch's `web/extras.js`, host API 3): the scene, the player, the city (its grid, shop
fronts), `callPy` (the app), `audio`, `uiBusy`, `jobs` (toast, guide on the map, routeLength, refresh, busy),
`vehicles` (the one ridden, the bicycle and motorbike models), `Character` and `library()` (people), `homePlace()`.

Every coin is the app's to decide (AgentOrch's `agentorch/life.py`): a trade asks (`callPy('lifeAct', act, json)`),
the app answers on the `life` message. A trade whose money works in a new way needs the app updated too.

## Develop and release

`python -m agentorch --dev` runs the trades straight from this checkout (next to the AgentOrch one): edit, reload.
`python3 tools/pack.py` builds `dist/trade-<id>.zip` (+ `.sha256`) for each. To release, bump every
`manifest.json` to the same version and push the tag `v<version>`.

Apache-2.0.
