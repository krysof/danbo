// core.js — DANBO World
// ============================================================
//  蛋宝世界 — DANBO World  (Hub City + Race Portals)
// ============================================================
/* global THREE */
if(typeof THREE==='undefined'){throw new Error('THREE not loaded yet');}
function _danboRaceObstacles(){
    try{
        if(typeof obstacleObjects!=='undefined'&&Array.isArray(obstacleObjects))return obstacleObjects;
    }catch(e){}
    return [];
}
function _danboRaceCoins(){
    try{
        if(typeof raceCoins!=='undefined'&&Array.isArray(raceCoins))return raceCoins;
    }catch(e){}
    return [];
}
// ---- i18n Localization ----
var _autoLangCode=(function(){
    var nav=navigator.language||navigator.userLanguage||'en';
    nav=nav.toLowerCase();
    if(nav.indexOf('zh-tw')===0||nav.indexOf('zh-hant')===0||nav.indexOf('zh-hk')===0)return 'zht';
    if(nav.indexOf('zh')===0)return 'zhs';
    if(nav.indexOf('ja')===0)return 'ja';
    return 'en';
})();
var _langMode='auto'; // 'auto' or manual code
// Restore saved language preference
try{var _savedLang=localStorage.getItem('danbo_lang');if(_savedLang&&['auto','zhs','zht','ja','en'].indexOf(_savedLang)>=0)_langMode=_savedLang;}catch(e){}
var _langCode=_langMode==='auto'?_autoLangCode:_langMode;
var DANBO_CUTE_STYLE='round-minimal-v2'; // Kirby-like: soft round mascot, clean face, almost no clutter
var I18N={
    title:{zhs:'\u86CB\u5B9D\u4E16\u754C',zht:'\u86CB\u5B9D\u4E16\u754C',ja:'\u30C0\u30F3\u30DC\u30EF\u30FC\u30EB\u30C9',en:'DANBO World'},
    subtitle:{zhs:'D A N B O   W O R L D',zht:'D A N B O   W O R L D',ja:'D A N B O   W O R L D',en:'D A N B O   W O R L D'},
    slogan:{zhs:'\u63A2\u7D22\u57CE\u5E02 \u00B7 \u7A7F\u8D8A\u4E16\u754C \u00B7 \u4E00\u8D77\u5192\u9669',zht:'\u63A2\u7D22\u57CE\u5E02 \u00B7 \u7A7F\u8D8A\u4E16\u754C \u00B7 \u4E00\u8D77\u5192\u96AA',ja:'\u63A2\u691C\u30FB\u3064\u306A\u304C\u308B\u30FB\u3044\u3063\u3057\u3087\u306B\u904A\u307C\u3046',en:'Explore \u00B7 Connect \u00B7 Run Together'},
    version:(function(){var v='v20260713.4';return{zhs:v+' by \u767D\u6CB3\u6101',zht:v+' by \u767D\u6CB3\u6101',ja:v+' by \u767D\u6CB3\u6101',en:v+' by Kryso'};})(),
    startBtn:{zhs:'\uD83C\uDFAE \u5F00\u59CB\u6E38\u620F',zht:'\uD83C\uDFAE \u958B\u59CB\u904A\u6232',ja:'\uD83C\uDFAE \u30B2\u30FC\u30E0\u30B9\u30BF\u30FC\u30C8',en:'\uD83C\uDFAE Start Game'},
    selectTitle:{zhs:'\u2014 \u9009 \u62E9 \u89D2 \u8272 \u2014',zht:'\u2014 \u9078 \u64C7 \u89D2 \u8272 \u2014',ja:'\u2014 \u30AD\u30E3\u30E9\u9078\u629E \u2014',en:'\u2014 SELECT CHARACTER \u2014'},
    confirmBtn:{zhs:'\u2694\uFE0F \u786E\u8BA4\u51FA\u6218',zht:'\u2694\uFE0F \u78BA\u8A8D\u51FA\u6230',ja:'\u2694\uFE0F \u6C7A\u5B9A',en:'\u2694\uFE0F Confirm'},
    portalYes:{zhs:'\u2705 \u8FDB\u5165 (Y/\u56DE\u8F66)',zht:'\u2705 \u9032\u5165 (Y/Enter)',ja:'\u2705 \u5165\u308B (Y/Enter)',en:'\u2705 Enter (Y/Enter)'},
    portalNo:{zhs:'\u274C \u53D6\u6D88 (N/ESC)',zht:'\u274C \u53D6\u6D88 (N/ESC)',ja:'\u274C \u30AD\u30E3\u30F3\u30BB\u30EB (N/ESC)',en:'\u274C Cancel (N/ESC)'},
    grabThrow:{zhs:'F\u6293/\u6254 R\u62F3 T\u811A | \u957F\u6309\u84C4\u529B',zht:'F\u6293/\u64F2 R\u62F3 T\u811A | \u9577\u6309\u84C4\u529B',ja:'F\u3064\u304B\u3080/\u6295\u3052 R\u30D1\u30F3\u30C1 T\u30AD\u30C3\u30AF',en:'F Grab/Throw R Punch T Kick'},
    zoomHint:{zhs:'\u6EDA\u8F6E \u7F29\u653E',zht:'\u6EFE\u8F2A \u7E2E\u653E',ja:'\u30DB\u30A4\u30FC\u30EB \u30BA\u30FC\u30E0',en:'Scroll Zoom'},
    moonCamHint:{zhs:'\u53F3\u952E\u62D6\u52A8 \u65CB\u8F6C\u89C6\u89D2',zht:'\u53F3\u9375\u62D6\u52D5 \u65CB\u8F49\u8996\u89D2',ja:'\u53F3\u30AF\u30EA\u30C3\u30AF\u30C9\u30E9\u30C3\u30B0 \u8996\u70B9\u56DE\u8EE2',en:'Right-drag to orbit camera'},
    raceBack:{zhs:'\uD83C\uDFD9\uFE0F \u8FD4\u56DE',zht:'\uD83C\uDFD9\uFE0F \u8FD4\u56DE',ja:'\uD83C\uDFD9\uFE0F \u623B\u308B',en:'\uD83C\uDFD9\uFE0F Back'},
    backCity:{zhs:'\uD83C\uDFD9\uFE0F \u8FD4\u56DE\u57CE\u5E02',zht:'\uD83C\uDFD9\uFE0F \u8FD4\u56DE\u57CE\u5E02',ja:'\uD83C\uDFD9\uFE0F \u8857\u306B\u623B\u308B',en:'\uD83C\uDFD9\uFE0F Back to City'},
    resultDone:{zhs:'\u5B8C\u6210\uFF01',zht:'\u5B8C\u6210\uFF01',ja:'\u5B8C\u4E86\uFF01',en:'Done!'},
    rushGoal:{zhs:'\u51B2\u5411\u7EC8\u70B9\uFF01',zht:'\u885D\u5411\u7D42\u9EDE\uFF01',ja:'\u30B4\u30FC\u30EB\u3092\u76EE\u6307\u305B\uFF01',en:'Rush to the finish!'},
    roundN:function(n){return{zhs:'\u7B2C '+n+' \u8F6E',zht:'\u7B2C '+n+' \u8F2A',ja:'\u7B2C'+n+'\u30E9\u30A6\u30F3\u30C9',en:'Round '+n}[_langCode];},
    placeN:function(n){return{zhs:'\uD83D\uDCCD \u7B2C'+n+'\u540D',zht:'\uD83D\uDCCD \u7B2C'+n+'\u540D',ja:'\uD83D\uDCCD '+n+'\u4F4D',en:'\uD83D\uDCCD #'+n}[_langCode];},
    resultWin:function(p,c){return{zhs:'\u7B2C'+p+'\u540D \u00B7 \u664B\u7EA7\uFF01',zht:'\u7B2C'+p+'\u540D \u00B7 \u6649\u7D1A\uFF01',ja:p+'\u4F4D \u00B7 \u901A\u904E\uFF01',en:'#'+p+' \u00B7 Passed!'}[_langCode];},
    resultLose:{zhs:'\u88AB\u6DD8\u6C70\u4E86\uFF01',zht:'\u88AB\u6DD8\u6C70\u4E86\uFF01',ja:'\u8131\u843D\u2026',en:'Eliminated!'},
    resultSub:function(c){return{zhs:'\u83B7\u5F97 \u2B50\u00D73 + \uD83E\uDE99\u00D7'+c,zht:'\u7372\u5F97 \u2B50\u00D73 + \uD83E\uDE99\u00D7'+c,ja:'\u2B50\u00D73 + \uD83E\uDE99\u00D7'+c+' \u7372\u5F97',en:'Got \u2B50\u00D73 + \uD83E\uDE99\u00D7'+c}[_langCode];},
    tryAgain:{zhs:'\u518D\u63A5\u518D\u53B1\uFF01',zht:'\u518D\u63A5\u518D\u53B2\uFF01',ja:'\u3082\u3046\u4E00\u5EA6\uFF01',en:'Try again!'},
    grab:{zhs:'\u6293',zht:'\u6293',ja:'\u3064\u304B\u3080',en:'Grab'},
    throwT:{zhs:'\u6254',zht:'\u64F2',ja:'\u6295\u3052\u308B',en:'Throw'},
    punch:{zhs:'\u62F3',zht:'\u62F3',ja:'\u30D1\u30F3\u30C1',en:'Punch'},
    kick:{zhs:'\u811A',zht:'\u811A',ja:'\u30AD\u30C3\u30AF',en:'Kick'},
    jump:{zhs:'\u8DF3',zht:'\u8DF3',ja:'\u30B8\u30E3\u30F3\u30D7',en:'Jump'},
    walkIn:{zhs:'\u8D70\u8FD1\u8FDB\u5165',zht:'\u8D70\u8FD1\u9032\u5165',ja:'\u8FD1\u3065\u3044\u3066\u5165\u308B',en:'Walk in to enter'},
    warpDesc:{zhs:'\u4F20\u9001\u5230\u5176\u4ED6\u57CE\u5E02\uFF01',zht:'\u50B3\u9001\u5230\u5176\u4ED6\u57CE\u5E02\uFF01',ja:'\u4ED6\u306E\u8857\u3078\u30EF\u30FC\u30D7\uFF01',en:'Warp to another city!'},
    earthReturn:{zhs:'\u8FD4\u56DE\u5730\u7403',zht:'\u8FD4\u56DE\u5730\u7403',ja:'\u5730\u7403\u3078\u5E30\u9084',en:'Return to Earth'},
    earthReturnDesc:{zhs:'\u4F20\u9001\u56DE\u5730\u7403\u57CE\u5E02',zht:'\u50B3\u9001\u56DE\u5730\u7403\u57CE\u5E02',ja:'\u5730\u7403\u306E\u8857\u3078\u30C6\u30EC\u30DD\u30FC\u30C8',en:'Teleport back to Earth city'},
    charNames:{
        zhs:['\u7ECF\u5178\u86CB\u5B9D','\u91CE\u725B','\u732B\u4ED4','\u9E21\u516C','\u72D7\u4ED4','\u9A6C\u9A9D','\u5927\u718A','\u66F1\u7534'],
        zht:['\u7D93\u5178\u86CB\u5BF6','\u91CE\u725B','\u8C93\u4ED4','\u96DE\u516C','\u72D7\u4ED4','\u99AC\u9A2E','\u5927\u718A','\u66F1\u7534'],
        ja:['\u30AF\u30E9\u30B7\u30C3\u30AF\u30C0\u30F3\u30DC','\u30D0\u30C3\u30D5\u30A1\u30ED\u30FC','\u30CD\u30B3','\u30CB\u30EF\u30C8\u30EA','\u30A4\u30CC','\u30B5\u30EB','\u30AF\u30DE','\u30B4\u30AD\u30D6\u30EA'],
        en:['Classic Danbo','Buffalo','Kitty','Rooster','Puppy','Monkey','Bear','Cockroach']
    },
    cityNames:{
        zhs:['\uD83C\uDFD9\uFE0F \u5E0C\u671B\u4E4B\u57CE','\uD83C\uDFDC\uFE0F \u6C99\u6F20\u57CE','\u2744\uFE0F \u51B0\u96EA\u57CE','\uD83D\uDD25 \u7194\u5CA9\u57CE','\uD83C\uDF6C \u7CD6\u679C\u57CE','\uD83C\uDF19 \u6708\u9762\u90FD\u5E02','\uD83C\uDF38 \u6A31\u4E4B\u56FD','\uD83C\uDFD4\uFE0F \u96EA\u4E4B\u4E61'],
        zht:['\uD83C\uDFD9\uFE0F \u5E0C\u671B\u4E4B\u57CE','\uD83C\uDFDC\uFE0F \u6C99\u6F20\u57CE','\u2744\uFE0F \u51B0\u96EA\u57CE','\uD83D\uDD25 \u7194\u5CA9\u57CE','\uD83C\uDF6C \u7CD6\u679C\u57CE','\uD83C\uDF19 \u6708\u9762\u90FD\u5E02','\uD83C\uDF38 \u6AFB\u4E4B\u570B','\uD83C\uDFD4\uFE0F \u96EA\u4E4B\u9109'],
        ja:['\uD83C\uDFD9\uFE0F \u5E0C\u671B\u306E\u8857','\uD83C\uDFDC\uFE0F \u7802\u6F20\u30B7\u30C6\u30A3','\u2744\uFE0F \u6C37\u96EA\u30B7\u30C6\u30A3','\uD83D\uDD25 \u6EB6\u5CA9\u30B7\u30C6\u30A3','\uD83C\uDF6C \u30AD\u30E3\u30F3\u30C7\u30A3\u30B7\u30C6\u30A3','\uD83C\uDF19 \u30EB\u30CA\u30FC\u30BE\u30FC\u30F3','\uD83C\uDF38 \u685C\u306E\u56FD','\uD83C\uDFD4\uFE0F \u96EA\u306E\u90F7'],
        en:['\uD83C\uDFD9\uFE0F City of Hope','\uD83C\uDFDC\uFE0F Desert City','\u2744\uFE0F Ice City','\uD83D\uDD25 Lava City','\uD83C\uDF6C Candy City','\uD83C\uDF19 Lunar Zone','\uD83C\uDF38 Sakura Land','\uD83C\uDFD4\uFE0F Snow Village']
    },
    raceNames:{
        zhs:['\uD83C\uDF00 \u7591\u72C2\u8D5B\u9053','\uD83D\uDD28 \u9524\u5B50\u98CE\u66B4','\u26A1 \u6781\u9650\u6311\u6218','\uD83D\uDC51 \u51A0\u519B\u4E4B\u8DEF','\uD83D\uDC8E \u7EFF\u5B9D\u77F3\u5C71\u4E18','\uD83D\uDD25 \u706B\u7130\u5C71\u8C37','\u2744\uFE0F \u51B0\u971C\u6ED1\u9053','\uD83C\uDF08 \u5F69\u8679\u5929\u7A7A','\uD83C\uDF44 \u8611\u83C7\u738B\u56FD','\uD83D\uDD25 \u5CA9\u6D46\u57CE\u5821','\u2601\uFE0F \u4E91\u7AEF\u5929\u5802','\uD83C\uDFF0 \u5E93\u5DF4\u57CE\u5821'],
        zht:['\uD83C\uDF00 \u760B\u72C2\u8CFD\u9053','\uD83D\uDD28 \u9318\u5B50\u98A8\u66B4','\u26A1 \u6975\u9650\u6311\u6230','\uD83D\uDC51 \u51A0\u8ECD\u4E4B\u8DEF','\uD83D\uDC8E \u7DA0\u5BF6\u77F3\u5C71\u4E18','\uD83D\uDD25 \u706B\u7130\u5C71\u8C37','\u2744\uFE0F \u51B0\u971C\u6ED1\u9053','\uD83C\uDF08 \u5F69\u8679\u5929\u7A7A','\uD83C\uDF44 \u8611\u83C7\u738B\u570B','\uD83D\uDD25 \u5CA9\u6F3F\u57CE\u5821','\u2601\uFE0F \u96F2\u7AEF\u5929\u5802','\uD83C\uDFF0 \u5EAB\u5DF4\u57CE\u5821'],
        ja:['\uD83C\uDF00 \u30AF\u30EC\u30A4\u30B8\u30FC\u30B3\u30FC\u30B9','\uD83D\uDD28 \u30CF\u30F3\u30DE\u30FC\u30B9\u30C8\u30FC\u30E0','\u26A1 \u30A8\u30AF\u30B9\u30C8\u30EA\u30FC\u30E0','\uD83D\uDC51 \u30C1\u30E3\u30F3\u30D4\u30AA\u30F3\u30ED\u30FC\u30C9','\uD83D\uDC8E \u30A8\u30E1\u30E9\u30EB\u30C9\u30D2\u30EB','\uD83D\uDD25 \u30D5\u30EC\u30A4\u30E0\u30D0\u30EC\u30FC','\u2744\uFE0F \u30A2\u30A4\u30B9\u30B9\u30E9\u30A4\u30C0\u30FC','\uD83C\uDF08 \u30EC\u30A4\u30F3\u30DC\u30FC\u30B9\u30AB\u30A4','\uD83C\uDF44 \u30AD\u30CE\u30B3\u30AD\u30F3\u30B0\u30C0\u30E0','\uD83D\uDD25 \u30DE\u30B0\u30DE\u30AD\u30E3\u30C3\u30B9\u30EB','\u2601\uFE0F \u30AF\u30E9\u30A6\u30C9\u30D8\u30D6\u30F3','\uD83C\uDFF0 \u30AF\u30C3\u30D1\u57CE'],
        en:['\uD83C\uDF00 Crazy Course','\uD83D\uDD28 Hammer Storm','\u26A1 Extreme Challenge','\uD83D\uDC51 Champion Road','\uD83D\uDC8E Emerald Hills','\uD83D\uDD25 Flame Valley','\u2744\uFE0F Ice Slider','\uD83C\uDF08 Rainbow Sky','\uD83C\uDF44 Mushroom Kingdom','\uD83D\uDD25 Magma Castle','\u2601\uFE0F Cloud Heaven','\uD83C\uDFF0 Koopa Castle']
    },
    raceDescs:{
        zhs:['\u65CB\u8F6C\u81C2\u4E0E\u4F20\u9001\u5E26\uFF01','\u5927\u9524\u4E0E\u6446\u9524\uFF01\u5C0F\u5FC3\uFF01','\u6240\u6709\u969C\u788D\u52A0\u901F\uFF01','\u6700\u7EC8\u51B3\u6218\uFF01','\u91D1\u5E01\u4E0E\u5F39\u7C27\uFF01','\u52A0\u901F\u5E26\u4E0E\u5CA9\u6D46\u5730\u5F62\uFF01','\u6ED1\u51B0\u5730\u5F62\u4E0E\u5F39\u7C27\uFF01','\u7A7A\u4E2D\u5E73\u53F0\u4E0E\u91D1\u5E01\u96E8\uFF01','\u7ECF\u5178\u6C34\u7BA1\u4E0E\u677F\u6817\uFF01','\u5CA9\u6D46\u5730\u5F62\u4E0E\u706B\u7403\uFF01','\u7A7A\u4E2D\u5E73\u53F0\u4E0E\u5F39\u7C27\uFF01','\u6700\u7EC8\u5173\u5361\uFF01\u5168\u969C\u788D\uFF01'],
        zht:['\u65CB\u8F49\u81C2\u8207\u50B3\u9001\u5E36\uFF01','\u5927\u9318\u8207\u64FA\u9318\uFF01\u5C0F\u5FC3\uFF01','\u6240\u6709\u969C\u7919\u52A0\u901F\uFF01','\u6700\u7D42\u6C7A\u6230\uFF01','\u91D1\u5E63\u8207\u5F48\u7C27\uFF01','\u52A0\u901F\u5E36\u8207\u5CA9\u6F3F\u5730\u5F62\uFF01','\u6ED1\u51B0\u5730\u5F62\u8207\u5F48\u7C27\uFF01','\u7A7A\u4E2D\u5E73\u53F0\u8207\u91D1\u5E63\u96E8\uFF01','\u7D93\u5178\u6C34\u7BA1\u8207\u677F\u6817\uFF01','\u5CA9\u6F3F\u5730\u5F62\u8207\u706B\u7403\uFF01','\u7A7A\u4E2D\u5E73\u53F0\u8207\u5F48\u7C27\uFF01','\u6700\u7D42\u95DC\u5361\uFF01\u5168\u969C\u7919\uFF01'],
        ja:['\u56DE\u8EE2\u30A2\u30FC\u30E0\u3068\u30D9\u30EB\u30C8\u30B3\u30F3\u30D9\u30A2\uFF01','\u30CF\u30F3\u30DE\u30FC\u3068\u632F\u308A\u5B50\uFF01\u6CE8\u610F\uFF01','\u5168\u969C\u5BB3\u7269\u30B9\u30D4\u30FC\u30C9UP\uFF01','\u6700\u7D42\u6C7A\u6226\uFF01','\u30B3\u30A4\u30F3\u3068\u30D0\u30CD\uFF01','\u30D6\u30FC\u30B9\u30C8\u3068\u6EB6\u5CA9\uFF01','\u6C37\u306E\u5730\u5F62\u3068\u30D0\u30CD\uFF01','\u7A7A\u4E2D\u8DB3\u5834\u3068\u30B3\u30A4\u30F3\u306E\u96E8\uFF01','\u571F\u7BA1\u3068\u30AF\u30EA\u30DC\u30FC\uFF01','\u6EB6\u5CA9\u3068\u706B\u306E\u7389\uFF01','\u7A7A\u4E2D\u8DB3\u5834\u3068\u30D0\u30CD\uFF01','\u6700\u7D42\u30B9\u30C6\u30FC\u30B8\uFF01\u5168\u969C\u5BB3\u7269\uFF01'],
        en:['Spinners & conveyors!','Hammers & pendulums! Watch out!','All obstacles sped up!','Final showdown!','Coins & springs!','Boost pads & lava terrain!','Ice terrain & springs!','Sky platforms & coin rain!','Classic pipes & goombas!','Lava terrain & fireballs!','Sky platforms & springs!','Final stage! All obstacles!']
    },
    loadFail:{zhs:'\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0',zht:'\u8F09\u5165\u5931\u6557\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406',ja:'\u8AAD\u307F\u8FBC\u307F\u5931\u6557\u3002\u30EA\u30ED\u30FC\u30C9\u3057\u3066\u304F\u3060\u3055\u3044',en:'Load failed, please refresh'},
    loading:{zhs:'3D\u5F15\u64CE\u52A0\u8F7D\u4E2D...',zht:'3D\u5F15\u64CE\u8F09\u5165\u4E2D...',ja:'3D\u30A8\u30F3\u30B8\u30F3\u8AAD\u307F\u8FBC\u307F\u4E2D...',en:'Loading 3D engine...'},
    music:{zhs:'\u97F3\u4E50',zht:'\u97F3\u6A02',ja:'\u97F3\u697D',en:'Music'},
    sfx:{zhs:'\u97F3\u6548',zht:'\u97F3\u6548',ja:'SE',en:'SFX'},
    struggle:{zhs:'\uD83D\uDD25 \u6323\u624E\u4E2D\uFF01\u7591\u72C2\u6309\u65B9\u5411\u952E\uFF01',zht:'\uD83D\uDD25 \u6399\u624E\u4E2D\uFF01\u760B\u72C2\u6309\u65B9\u5411\u9375\uFF01',ja:'\uD83D\uDD25 \u3082\u304C\u3044\u3066\uFF01\u65B9\u5411\u30AD\u30FC\u9023\u6253\uFF01',en:'\uD83D\uDD25 Struggle! Mash direction keys!'},
    chatPlaceholder:{zhs:'\u8F93\u5165\u6D88\u606F...',zht:'\u8F38\u5165\u8A0A\u606F...',ja:'\u30E1\u30C3\u30BB\u30FC\u30B8\u5165\u529B...',en:'Type a message...'}
};
function L(key){var v=I18N[key];if(!v)return key;if(typeof v==='string')return v;return v[_langCode]||v.en||'';}

// ---- Toon gradient ----
const _tc = document.createElement('canvas');
_tc.width = 8; _tc.height = 1;
const _tg = _tc.getContext('2d');
['#696969','#818181','#999999','#b1b1b1','#c9c9c9','#dddddd','#eeeeee','#ffffff'].forEach(function(c,i){
    _tg.fillStyle=c;_tg.fillRect(i,0,1,1);
});
const toonTex = new THREE.CanvasTexture(_tc);
toonTex.minFilter = THREE.NearestFilter; toonTex.magFilter = THREE.NearestFilter;

function _cleanMaterialOptions(opts){
    var clean={};
    opts=opts||{};
    for(var k in opts){
        if(Object.prototype.hasOwnProperty.call(opts,k)&&opts[k]!==undefined){
            clean[k]=opts[k];
        }
    }
    return clean;
}

function _cutePastelHex(color,amount){
    if(typeof color!=='number')return color;
    amount=(amount===undefined)?0.16:amount;
    var r=(color>>16)&255,g=(color>>8)&255,b=color&255;
    var lum=(r*0.299+g*0.587+b*0.114);
    if(lum<72)amount=Math.max(amount,0.24);
    else if(lum>220)amount=Math.min(amount,0.08);
    r=Math.round(r+(255-r)*amount);
    g=Math.round(g+(255-g)*amount);
    b=Math.round(b+(255-b)*amount);
    return (r<<16)|(g<<8)|b;
}

function toon(color, opts) {
    if(color===undefined||color===null)color=0xffffff;
    opts=_cleanMaterialOptions(opts);
    var noPastel=opts.noPastel, pastelAmount=opts.pastelAmount;
    delete opts.noPastel;delete opts.pastelAmount;
    var pastelColor=noPastel?color:_cutePastelHex(color,pastelAmount);
    return new THREE.MeshToonMaterial({color:pastelColor, gradientMap:toonTex, ...opts});
}

// Physically based material shared by hero surfaces.  High mode keeps full
// roughness/bump/environment response; low mode falls back without changing geometry.
function softPBR(color,opts){
    if(color===undefined||color===null)color=0xffffff;
    opts=_cleanMaterialOptions(opts);
    var pastelAmount=opts.pastelAmount;
    delete opts.pastelAmount;
    var c=_cutePastelHex(color,pastelAmount===undefined?0.07:pastelAmount);
    if(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low){
        delete opts.roughness;delete opts.metalness;delete opts.clearcoat;delete opts.clearcoatRoughness;
        delete opts.roughnessMap;delete opts.transmission;delete opts.thickness;delete opts.ior;
        delete opts.sheen;delete opts.sheenRoughness;delete opts.sheenColor;delete opts.iridescence;delete opts.iridescenceIOR;
        return new THREE.MeshLambertMaterial({color:c,...opts});
    }
    var wantsPhysical=opts.clearcoat!==undefined||opts.sheen!==undefined||opts.transmission!==undefined||opts.iridescence!==undefined;
    var MaterialType=((wantsPhysical||(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high))&&THREE.MeshPhysicalMaterial)?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
    return new MaterialType({
        color:c,
        roughness:opts.roughness===undefined?0.72:opts.roughness,
        metalness:opts.metalness===undefined?0.0:opts.metalness,
        ...opts
    });
}
