# 蛋宝世界 · 樱花车站 / Little Egg Friends · Sakura Station

## Main-game integration

The station is also a **real ninth city (city 8)** in Little Egg Friends. In Hope
City, enter the pink **Sakura Station** gate west of the arrival plaza (x=-15,
z=16). The return gate is on the station's shopping street (x=1.6, z=40).

- `../../js/station-city.js` registers the city; `city-runtime.js` lazily builds
  only the scenery and its collision grid during the normal city transfer.
- The main game retains its renderer, player, controls, combat, HUD, account,
  coin progression and multiplayer connection. No embedded page or second game
  loop is launched. Six local Danbo NPCs and eight normal collectibles populate
  the area; remote players in city 8 use the existing multiplayer actor path.
- Keyboard/mouse, touch and standard gamepads use the existing game controls.
  Station walls, stairs/platform floors, moving trains and camera obstruction
  use the town's spatial physics grid. Train phase uses the local wall clock;
  it is not a server-authoritative railway simulation.
- Titles/portal labels support simplified/traditional Chinese, Japanese and
  English. The Japanese scenery/shop signs are original environment artwork.
- Entry is lazy: the town is not generated at game boot. First entry still
  incurs procedural generation and atlas costs. Do not assume final mobile
  performance. Scene resources and old portal triggers are released on exit;
  a failed load rolls back to the origin through the main transfer lifecycle.

## Standalone visual preview

The original isolated preview remains available for visual comparisons:

- Open `plugins/sakura-preview/` from the same static server as the client.
- The current Danbo mascot geometry is reused directly from `../../js/entity.js`.
- Scene builders/materials/collision data are adapted through a separate host using the project's existing **Three.js r180**, not a second Three.js version.
- Walk with WASD/arrows, drag to orbit, Space to jump. Standard controllers: left stick to move, right stick to orbit, A to jump, Start for UI. Touch: left pad to move, drag scene to look, right button to jump.
- Three collectible starlights are a session-only preview activity. This page does not join multiplayer, modify accounts, or read/write character/progress saves.
- The preview does not change Browser/EXE main-game settings or saves. Its only stored preference is `danbo_sakura_preview_language`.
- Quality can change without reloading. Low skips the outline/bloom prepasses; medium/high use the upstream cel pipeline. Initial procedural scene generation and atlas merging are prototype costs, not a final mobile performance guarantee.
- No external fonts, CDN scripts, analytics or remote assets are requested.

## Third-party attribution

Scene code: **Sakuragaoka Station**, Kenton-GMI/sakuragaoka-station.
Pinned upstream revision: `4112f57208b7e29998344ca71fef74202c2b2bdd`.
Copyright (c) 2026 Sakuragaoka Station contributors.
Licensed under the MIT License. Full notice: [upstream/LICENSE](upstream/LICENSE).
Original files and SHA-256 hashes: [upstream/SOURCE.json](upstream/SOURCE.json).

The files under `upstream/` are unmodified. The host files outside that directory are the Danbo integration layer. Upstream human street NPCs and the original first-person controller are not loaded. Characters are Danbo mascots.

Two additional official Three.js r180 helpers (`RoundedBoxGeometry` and `BufferGeometryUtils`) live under `vendor/three-r180/`, with their MIT license and source hashes. Both hosts use the existing Danbo Three.js r180 renderer library; it is not upgraded or duplicated.
