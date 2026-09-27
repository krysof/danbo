// A module/import failure happens before preview.js can install its error UI.
// Keep the retry and return paths usable even on an unsupported WebGL browser.
(function(){
 'use strict';
 window.sakuraLoadFailed=function(){
  var code=document.documentElement.lang||navigator.language||'en';
  var text=/^ja/i.test(code)?['読み込めません。再試行するかゲームへ戻れます。','再読み込み','ゲームへ']:/^zh/i.test(code)?(/TW|HK|Hant/i.test(code)?['載入失敗，請重試或返回遊戲。','重新載入','返回遊戲']:['载入失败，请重试或返回游戏。','重新加载','返回游戏']):['Could not load. Retry or return to the game.','Try again','Back to game'];
  var status=document.getElementById('load-status'),retry=document.getElementById('retry'),back=document.getElementById('back');
  if(status)status.textContent=text[0];if(retry){retry.textContent=text[1];retry.hidden=false;retry.onclick=function(){location.reload();};}if(back)back.textContent=text[2];
  document.getElementById('go').hidden=true;document.getElementById('gate').hidden=false;
 };
})();
