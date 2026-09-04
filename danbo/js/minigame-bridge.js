// minigame-bridge.js — safe placeholders before plugin runtimes load
// Legacy minigames now live under plugins/, but shared engine code still checks a few global flags.
var _pfActive=false;
var _pfSavedCity=-1;
var _pfTile=4;
window.DANBO_LEGACY_MINIGAME_BRIDGE={version:1,loaded:true};
