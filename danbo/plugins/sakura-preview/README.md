# 蛋宝世界 · 樱花车站 / Little Egg Friends · Sakura Station

An isolated, playable **visual prototype**, not a replacement for the main city.

- Open `plugins/sakura-preview/` from the same static server as the client.
- The current Danbo mascot geometry is reused directly from `../../js/entity.js`.
- Scene builders/materials/collision data are adapted through a separate host using the project's existing **Three.js r180**, not a second Three.js version.
- Walk with WASD/arrows, drag to orbit, Space to jump. Standard controllers: left stick to move, right stick to orbit, A to jump, Start for UI. Touch: left pad to move, drag scene to look, right button to jump.
- Three collectible starlights are a session-only preview activity. This page does not join multiplayer, modify accounts, or read/write character/progress saves.
- Browser/EXE main-game settings, routes and renderer remain unchanged. The only preference stored by this page is `danbo_sakura_preview_language`.
- Quality can change without reloading. Low skips the outline/bloom prepasses; medium/high use the upstream cel pipeline. Initial procedural scene generation and atlas merging are prototype costs, not a final mobile performance guarantee.
- No external fonts, CDN scripts, analytics or remote assets are requested.

## Third-party attribution

Scene code: **Sakuragaoka Station**, Kenton-GMI/sakuragaoka-station.
Pinned upstream revision: `4112f57208b7e29998344ca71fef74202c2b2bdd`.
Copyright (c) 2026 Sakuragaoka Station contributors.
Licensed under the MIT License. Full notice: [upstream/LICENSE](upstream/LICENSE).
Original files and SHA-256 hashes: [upstream/SOURCE.json](upstream/SOURCE.json).

The files under `upstream/` are unmodified. `preview.js`, `controls.js`, `preview.css` and this HTML page are the Danbo integration layer. Upstream human street NPCs and the original first-person controller are not loaded. Preview characters are Danbo mascots.

Two additional official Three.js r180 helpers (`RoundedBoxGeometry` and `BufferGeometryUtils`) live under `vendor/three-r180/`, with their MIT license and source hashes. The renderer itself still comes from the existing Danbo vendor directory; the main game's files are not modified.
