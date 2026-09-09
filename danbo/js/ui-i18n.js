// Supplementary UI copy. Translate only authored UI text, never save keys,
// player names, chat, server addresses or other externally supplied content.
// No observers, DOM scans in the render loop, network calls or font downloads.
(function(root){
    'use strict';
    var table=Object.create(null),locales=['zhs','zht','ja','en'];
    function locale(){return typeof _langCode==='string'&&locales.indexOf(_langCode)>=0?_langCode:'zhs';}
    function text(source,values){
        var row=table[source],s=row?row[locales.indexOf(locale())]:source;
        if(!row&&typeof source==='string'&&table[source.trim()])s=source.match(/^\s*/)[0]+table[source.trim()][locales.indexOf(locale())]+source.match(/\s*$/)[0];
        if(values)s=s.replace(/\{([a-zA-Z]+)\}/g,function(token,key){return Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):token;});
        return s;
    }
    function add(rows){rows.trim().split('\n').forEach(function(line){var row=line.split('¦');if(row.length!==4||row.some(function(s){return !s;}))throw new Error('Invalid UI translation row');if(table[row[0]])throw new Error('Duplicate UI translation: '+row[0]);table[row[0]]=row;});}
    // Only for constant HTML fragments authored in source, BEFORE interpolation.
    // Attribute names/styles/handlers and dynamic user text are never translated.
    function html(source){return source.split(/(<[^>]*>)/g).map(function(part){
        if(part.charAt(0)==='<')return part.replace(/(aria-label|title|data-steer-label)="([^"]*)"/g,function(all,key,value){return key+'="'+text(value)+'"';});
        if(table[part])return text(part);
        return part.replace(/^(\s*)(.*?)(\s*)$/,function(all,left,value,right){return left+text(value)+right;});
    }).join('');}
    function refresh(){
        if(!root.document||!document.querySelectorAll)return;
        if(document.documentElement)document.documentElement.lang={zhs:'zh-CN',zht:'zh-TW',ja:'ja',en:'en'}[locale()];
        if(typeof L==='function'){
            document.title=L('title');
            document.querySelectorAll('[data-game-title]').forEach(function(el){if(el.tagName==='META')el.setAttribute('content',L('title'));else el.textContent=L('title');});
            var manifest=document.querySelector&&document.querySelector('link[rel="manifest"]');
            if(manifest)manifest.setAttribute('href',locale()==='en'?'manifest.webmanifest':'manifest.'+locale()+'.webmanifest');
        }
        document.querySelectorAll('[data-ui-text]').forEach(function(el){el.textContent=text(el.getAttribute('data-ui-text'));});
        ['aria-label','placeholder','title'].forEach(function(attr){document.querySelectorAll('[data-ui-'+attr+']').forEach(function(el){el.setAttribute(attr,text(el.getAttribute('data-ui-'+attr)));});});
    }
    root.UI_T=text;root.UI_HTML=html;root.DANBO_UI_I18N={text:text,html:html,refresh:refresh,add:add,locales:locales,table:table};
    add(`被抓住了 · 连按方向或跳跃挣脱¦被抓住了 · 連按方向或跳躍掙脫¦つかまれた！方向かジャンプを連打して脱出¦Grabbed! Tap directions or Jump to escape
已抓起 · 再按抓取投掷，长按蓄力¦已抓起 · 再按抓取投擲，長按蓄力¦持ち上げた！つかむボタンで投げる・長押しでためる¦Carrying · Press Grab again to throw; hold to charge
蓄力中 · 松开投掷¦蓄力中 · 放開投擲¦ため中 · 離して投げる¦Charging · Release to throw
抓取中…¦抓取中…¦つかみ中…¦Grabbing…
暂时无法抓取，靠近后再试¦暫時無法抓取，靠近後再試¦今はつかめません。近づいて再試行¦Cannot grab now. Move closer and try again`);
    add(`旅行装扮¦旅行裝扮¦旅の装い¦Expedition outfit
日常装扮¦日常裝扮¦いつもの装い¦Everyday outfit
旅装¦旅裝¦旅装¦Travel`);
    add(`旅程手册¦旅程手冊¦旅の手帳¦Journey journal
来我的房间一起玩¦來我的房間一起玩¦私のルームで一緒に遊ぼう¦Come play in my room
收起¦收起¦閉じる¦Collapse
继续游戏¦繼續遊戲¦ゲームに戻る¦Continue playing
多人挑战¦多人挑戰¦みんなでチャレンジ¦Co-op challenge
保存与接力¦儲存與接力¦セーブ・引き継ぎ¦Save and transfer
奖励：初旅星环¦獎勵：初旅星環¦報酬：はじまりの星環¦Reward: First Journey Halo
奖励：初旅星环 ✓¦獎勵：初旅星環 ✓¦報酬：はじまりの星環 ✓¦Reward: First Journey Halo ✓
★ 星光 +1 · {n}/3¦★ 星光 +1 · {n}/3¦★ 星の光 +1 · {n}/3¦★ Starlight +1 · {n}/3
✨ 初旅星环已获得 · 已自动佩戴¦✨ 已獲得初旅星環 · 已自動佩戴¦✨ はじまりの星環を獲得・装着しました¦✨ First Journey Halo unlocked and equipped
账号连接必须使用 HTTPS¦帳號連線必須使用 HTTPS¦アカウント接続には HTTPS が必要です¦Account connections require HTTPS
服务器地址不能包含凭证¦伺服器位址不能包含憑證¦サーバーアドレスに認証情報は含められません¦Server addresses cannot contain credentials
请先配置服务器地址¦請先設定伺服器位址¦先にサーバーアドレスを設定してください¦Set a server address first
浏览器无法保存游客资料，请允许网站存储或注册账号¦瀏覽器無法儲存訪客資料，請允許網站儲存或註冊帳號¦ゲスト情報を保存できません。サイトの保存を許可するか、アカウント登録してください¦Guest data could not be saved. Allow site storage or register an account.`);
    add(`初次旅行¦初次旅行¦はじめての旅¦First journey
移动 {n}/12 米 · WASD / 左摇杆¦移動 {n}/12 公尺 · WASD / 左搖桿¦{n}/12 m 歩こう · WASD / 左スティック¦Move {n}/12 m · WASD / left stick
轻按并松开空格 /「跳」按钮¦輕按並放開空白鍵 /「跳」按鈕¦スペース /「ジャンプ」を押して離そう¦Press and release Space / Jump
沿金色路标收集星光 {n}/3¦沿金色路標收集星光 {n}/3¦金色の目印で星の光を集めよう {n}/3¦Follow the gold markers for starlight {n}/3
首个挑战完成！¦首個挑戰完成！¦はじめてのチャレンジ達成！¦First challenge complete!
今日小目标：打开一个新宝箱¦今日小目標：打開一個新寶箱¦今日の目標：新しい宝箱を1つ開こう¦Today: open one new chest
今日旅程已盖章 · 自由探索吧¦今日旅程已蓋章 · 自由探索吧¦今日のスタンプ獲得 · 自由に探索しよう¦Today's stamp earned · Explore freely
旅程手册 · {hint}¦旅程手冊 · {hint}¦旅の手帳 · {hint}¦Journey journal · {hint}
初次旅行 · {hint}¦初次旅行 · {hint}¦はじめての旅 · {hint}¦First journey · {hint}
① 移动 12 米 {walk}　② 跳跃一次 {jump}　③ 收集星光 {n}/3¦① 移動 12 公尺 {walk}　② 跳躍一次 {jump}　③ 收集星光 {n}/3¦① 12 m 歩く {walk}　② ジャンプ {jump}　③ 星の光 {n}/3¦① Walk 12 m {walk}　② Jump once {jump}　③ Starlight {n}/3
已获得并解锁「初旅星环」！可以在装扮商店重新佩戴。¦已獲得並解鎖「初旅星環」！可在裝扮商店重新佩戴。¦「旅立ちの星輪」を獲得！着せ替えショップでいつでも装備できます。¦First Journey Halo unlocked! Re-equip it at the boutique anytime.
完成后获得「初旅星环」，没有倒计时、不限尝试次数。¦完成後獲得「初旅星環」，沒有倒數計時、不限嘗試次數。¦クリアで「旅立ちの星輪」を獲得。時間制限なし、何度でも挑戦できます。¦Earn the First Journey Halo. No timer, unlimited attempts.
旅行纪念章：{n} 枚。{today} 不连续登录也不会扣奖励。¦旅行紀念章：{n} 枚。{today} 不連續登入也不會扣獎勵。¦旅のスタンプ：{n} 個。{today} 毎日ログインしなくても報酬は減りません。¦Journey stamps: {n}. {today} No rewards lost for missing a day.
今天已获得。¦今天已獲得。¦今日は獲得済みです。¦Earned today.
打开一个新宝箱，留下今天的足迹。¦打開一個新寶箱，留下今天的足跡。¦新しい宝箱を開いて、今日の足跡を残そう。¦Open a new chest to mark today's visit.
你的蛋宝¦你的蛋寶¦あなたのたまご¦Your egg buddy
挑战完成！星环已经戴好。现在可以继续探索，或扫码把蛋宝带回家。¦挑戰完成！星環已經戴好。現在可繼續探索，或掃碼把蛋寶帶回家。¦チャレンジ達成！星輪を装備しました。探索を続けるか、QRコードで仲間を持ち帰ろう。¦Challenge complete! Your halo is equipped. Keep exploring or scan a transfer card to take your buddy home.
操作失败，请重试¦操作失敗，請重試¦操作に失敗しました。もう一度お試しください。¦That didn't work. Please try again.
初旅星环 · 已获得¦初旅星環 · 已獲得¦旅立ちの星輪 · 獲得済み¦First Journey Halo · Earned
带着蛋宝，继续旅程¦帶著蛋寶，繼續旅程¦仲間と旅を続けよう¦Continue your journey with your buddy
扫码继续 · 10 分钟有效 · 仅可领取一次¦掃碼繼續 · 10 分鐘有效 · 僅可領取一次¦QRで続ける · 有効10分 · 1回限り¦Scan to continue · Valid 10 min · Single use
包含人物和进度，不包含账号登录权限¦包含人物和進度，不包含帳號登入權限¦キャラと進行状況のみ。アカウントへのログイン権限は含みません¦Character and progress only; no account login access
接力卡已生成。请私下传给自己的手机，不要公开发布；过期后可重新生成。¦接力卡已產生。請私下傳給自己的手機，不要公開發布；過期後可重新產生。¦引き継ぎカードを作成しました。自分のスマホだけに送り、公開しないでください。期限切れ後は再作成できます。¦Transfer card ready. Send it privately to your own phone; do not post it publicly. Generate a new one if it expires.
接力链接已复制¦接力連結已複製¦引き継ぎリンクをコピーしました¦Transfer link copied
图片生成失败¦圖片產生失敗¦画像を作成できませんでした¦Could not create the image
使用云端存档？本机这份将备份，但当前游戏内的未同步进度会被替换。¦使用雲端存檔？本機這份將備份，但目前遊戲內未同步的進度會被替換。¦オンラインのセーブを使いますか？端末のデータはバックアップしますが、未同期の進行状況は置き換わります。¦Use the online save? This device's save will be backed up, but unsynced progress in the current game will be replaced.
确定用此设备的完整存档替换云端？另一设备的进度不会自动合并。¦確定用此裝置的完整存檔替換雲端？另一裝置的進度不會自動合併。¦この端末のセーブ全体でオンラインのデータを置き換えますか？他の端末の進行状況は統合されません。¦Replace the online save with this device's entire save? Progress from another device will not be merged.
邮件订阅偏好已保存。当前尚未启用邮件发送。¦電子郵件訂閱偏好已儲存。目前尚未啟用郵件寄送。¦メールの設定を保存しました。現在メール配信は開始していません。¦Email preference saved. Email delivery is not enabled yet.
iPhone：在 Safari 中点“分享 → 添加到主屏幕”。Android / PC：使用浏览器菜单的“安装应用 / 添加到主屏幕”。仍需网络连接。¦iPhone：在 Safari 點「分享 → 加入主畫面」。Android / PC：使用瀏覽器選單的「安裝應用程式 / 加入主畫面」。仍需網路連線。¦iPhone：Safari の「共有 → ホーム画面に追加」。Android / PC：ブラウザの「アプリをインストール / ホーム画面に追加」。インターネット接続は必要です。¦iPhone: Safari → Share → Add to Home Screen. Android / PC: browser menu → Install app / Add to Home Screen. Internet is still required.
准备下一位游客？当前游客进度将留一份本机备份；请先扫码带走。账号用户不能使用此操作。¦準備下一位遊客？目前遊客進度將留一份本機備份；請先掃碼帶走。帳號使用者不能使用此操作。¦次のゲストを迎えますか？現在の進行状況は端末にバックアップします。先にQRで持ち帰ってください。登録ユーザーには使えません。¦Prepare for the next guest? A local backup will remain. Scan your transfer card first. Registered accounts cannot use this action.
收到一份蛋宝接力存档。领取会切换为游客，不会登录原账号；此浏览器已有进度会先备份。¦收到一份蛋寶接力存檔。領取會切換為遊客，不會登入原帳號；此瀏覽器已有進度會先備份。¦引き継ぎデータが届きました。受け取るとゲストに切り替わり、元のアカウントにはログインしません。このブラウザの進行状況は先にバックアップします。¦Transfer save received. Claiming switches to a guest, not the original account. Existing browser progress will be backed up first.
领取并切换到这位游客？当前浏览器进度会先保留备份。¦領取並切換到這位遊客？目前瀏覽器進度會先保留備份。¦受け取ってこのゲストに切り替えますか？現在の進行状況は先にバックアップします。¦Claim and switch to this guest? Current browser progress will be backed up first.
接力成功！关闭手册，选择服务器即可继续。建议注册账号长期保存。¦接力成功！關閉手冊，選擇伺服器即可繼續。建議註冊帳號長期保存。¦引き継ぎ完了！手帳を閉じてサーバーを選ぶと続けられます。長期保存には登録をおすすめします。¦Transfer complete! Close the journal and choose a server to continue. Register an account for long-term saves.
游客进度保存在本机¦遊客進度儲存在本機¦ゲストの進行状況はこの端末に保存します¦Guest progress is stored on this device
浏览器存储已满，当前进度尚未安全保存¦瀏覽器儲存空間已滿，目前進度尚未安全儲存¦ブラウザの容量がいっぱいです。現在の進行状況はまだ保存できていません¦Browser storage is full. Current progress is not safely saved yet
存档格式不兼容；原数据未删除¦存檔格式不相容；原資料未刪除¦セーブ形式が対応していません。元のデータは削除していません¦Incompatible save format; original data was not deleted
游客进度已保存在此浏览器¦遊客進度已儲存在此瀏覽器¦ゲストの進行状況をこのブラウザに保存しました¦Guest progress saved in this browser
正在读取云存档…¦正在讀取雲端存檔…¦オンラインのセーブを読み込み中…¦Loading online save…
发现两份进度，请打开旅程手册选择；没有覆盖任何一份¦發現兩份進度，請開啟旅程手冊選擇；沒有覆蓋任何一份¦2つのセーブがあります。旅の手帳で選んでください。どちらも上書きしていません¦Two saves found. Choose one in the journal; neither has been overwritten
云存档暂不可用，本机进度保留。¦雲端存檔暫時無法使用，本機進度保留。¦オンラインのセーブを利用できません。端末の進行状況は保持しています。¦Online save unavailable. Local progress is preserved. 
云存档已同步¦雲端存檔已同步¦オンラインのセーブと同期済み¦Online save synced
新进度等待同步¦新進度等待同步¦新しい進行状況は同期待ちです¦New progress waiting to sync
其他设备有新进度，请选择存档；两份均已保留¦其他裝置有新進度，請選擇存檔；兩份均已保留¦他の端末に新しい進行状況があります。セーブを選んでください。両方保持しています¦Another device has new progress. Choose a save; both are preserved
云同步失败，本机进度保留。¦雲端同步失敗，本機進度保留。¦同期できませんでした。端末の進行状況は保持しています。¦Sync failed. Local progress is preserved. 
云端还没有存档¦雲端還沒有存檔¦オンラインにはまだセーブがありません¦No online save yet
云端与本机版本不同，请选择存档¦雲端與本機版本不同，請選擇存檔¦オンラインと端末のセーブが異なります。使用するセーブを選んでください¦Online and local saves differ. Please choose which to use
展台重置只能用于游客，请先退出账号¦展台重設只能用於遊客，請先登出帳號¦展示のリセットはゲスト専用です。先にログアウトしてください¦Booth reset is for guests only. Sign out first
把蛋宝带回家¦把蛋寶帶回家¦仲間を家に連れて帰ろう¦Take your buddy home
关闭旅程手册¦關閉旅程手冊¦旅の手帳を閉じる¦Close journey journal
未自动覆盖任何存档。请选择完整保留其中一份（不会合并金币）：¦未自動覆蓋任何存檔。請選擇完整保留其中一份（不會合併金幣）：¦セーブは上書きしていません。どちらか一方を選んでください（コインは合算されません）：¦No saves were automatically overwritten. Choose one entire save to keep (coins are not merged):
使用云端存档¦使用雲端存檔¦オンラインのセーブを使う¦Use online save
用本机存档替换云端¦用本機存檔替換雲端¦端末のセーブで置き換える¦Replace online with local save
注册并保存这只蛋宝¦註冊並儲存這隻蛋寶¦登録してこの仲間を保存¦Register and save this buddy
立即同步 / 重试¦立即同步 / 重試¦今すぐ同期 / 再試行¦Sync now / Retry
生成手机接力卡¦產生手機接力卡¦スマホ引き継ぎカードを作る¦Create phone transfer card
添加到主屏幕¦加入主畫面¦ホーム画面に追加¦Add to Home Screen
领取这份接力存档¦領取這份接力存檔¦このセーブを受け取る¦Claim this transfer save
蛋宝纪念卡和一次性接力二维码¦蛋寶紀念卡和一次性接力 QR 碼¦思い出カードと1回限りの引き継ぎQRコード¦Buddy keepsake card and single-use transfer QR code
保存纪念卡图片¦儲存紀念卡圖片¦思い出カードの画像を保存¦Save keepsake image
复制接力链接¦複製接力連結¦引き継ぎリンクをコピー¦Copy transfer link
接力码 10 分钟有效，领取后失效。它包含人物和当前进度，不含账号登录权限。长期保存请注册；接力卡不要公开分享。¦接力碼 10 分鐘有效，領取後失效。包含人物及目前進度，不含帳號登入權限。長期保存請註冊；接力卡請勿公開分享。¦引き継ぎコードは10分間有効、1回限りです。キャラと進行状況のみで、ログイン権限は含みません。長期保存には登録を。カードは公開しないでください。¦Transfer codes expire in 10 minutes and after one use. They contain character and progress, not account access. Register for long-term saves. Do not share the card publicly.
设置¦設定¦設定¦Settings
允许匿名试玩统计（可选，保留 90 天；不含姓名、邮箱、聊天）¦允許匿名試玩統計（選填，保留 90 天；不含姓名、電子郵件、聊天）¦匿名プレイ統計を許可（任意・90日保存。名前、メール、チャットは含みません）¦Allow anonymous play statistics (optional, kept 90 days; no names, email or chat)
愿意接收游戏更新邮件（可选，随时取消）¦願意接收遊戲更新郵件（選填，隨時取消）¦ゲーム更新メールを受け取る（任意・いつでも解除可）¦Receive game update emails (optional; unsubscribe anytime)
展台：准备下一位游客¦展台：準備下一位遊客¦展示：次のゲストを迎える¦Booth: prepare for next guest`);
    add(`选择服务器¦選擇伺服器¦サーバーを選択¦Choose a server
刷新服务器状态，选择后再进入角色界面。¦重新整理伺服器狀態，選擇後再進入角色畫面。¦サーバーを選んで、キャラクター選択へ進もう。¦Choose a server, then pick your character.
游客 / 登录注册¦遊客 / 登入註冊¦ゲスト / ログイン・登録¦Guest / Sign in or register
↻ 刷新列表¦↻ 重新整理¦↻ 更新¦↻ Refresh
服务器列表¦伺服器清單¦サーバー一覧¦Server list
返回游戏¦返回遊戲¦ゲームに戻る¦Back to game
进入所选服务器 →¦進入所選伺服器 →¦このサーバーに入る →¦Enter selected server →
关闭¦關閉¦閉じる¦Close
一起逛蛋宝世界¦一起逛蛋寶世界¦仲間と世界を歩こう¦Explore together
房间内跨城同行；只显示与你在同一城市的伙伴。¦房間內跨城同行；只顯示與你在同一城市的夥伴。¦同じルームで街を巡ろう。同じ街にいる仲間が表示されます。¦Travel between cities in a room. You see companions in your current city.
你的名字¦你的名字¦あなたの名前¦Your name
输入昵称¦輸入暱稱¦ニックネームを入力¦Enter a nickname
房间码¦房間代碼¦ルームコード¦Room code
例如 DANBO88¦例如 DANBO88¦例：DANBO88¦e.g. DANBO88
旅程手册 / 带走蛋宝¦旅程手冊 / 帶走蛋寶¦旅の手帳 / 仲間を持ち帰る¦Journal / Take your buddy home
选择服务器 / 换服¦選擇伺服器 / 換服¦サーバー選択 / 移動¦Choose / Switch server
快速加入公共房¦快速加入公開房¦公開ルームに入る¦Quick join public room
创建私人房¦建立私人房¦プライベートルーム作成¦Create private room
按房间码加入¦以房間代碼加入¦コードで参加¦Join with room code
分享邀请¦分享邀請¦招待を共有¦Share invitation
退出房间¦離開房間¦ルームを退出¦Leave room
房间成员¦房間成員¦ルームのメンバー¦Room members
容量由服务器提供¦容量由伺服器提供¦定員はサーバーから取得します¦Capacity provided by the server
高级设置 · 联机服务器¦進階設定 · 連線伺服器¦詳細設定 · 接続先¦Advanced settings · Server
服务器地址¦伺服器位址¦サーバーアドレス¦Server address
wss://你的服务器¦wss://你的伺服器¦wss://your-server¦wss://your-server
默认由 Cloudflare Tunnel 转发到本机联机服务器，测试时也可临时覆盖地址。¦預設由 Cloudflare Tunnel 轉送至本機連線伺服器，測試時可暫時覆寫位址。¦通常は Cloudflare Tunnel 経由で接続します。テスト用の接続先も指定できます。¦Connects through Cloudflare Tunnel by default. You can override the address for testing.
未连接¦未連線¦未接続¦Disconnected
服务器版本较旧，请先升级服务器¦伺服器版本較舊，請先升級伺服器¦サーバーが古いバージョンです。更新してください¦The server needs an update
无法获取服务器列表¦無法取得伺服器清單¦サーバー一覧を取得できません¦Could not load server list
公共分区¦公開分區¦公開サーバー¦Public server
在线 / 容量¦在線 / 容量¦接続中 / 定員¦Online / Capacity
延迟¦延遲¦応答時間¦Latency
推荐同服¦推薦同服¦おすすめ¦Recommended
已满（含预留席位）¦已滿（含保留席位）¦満員（予約席を含む）¦Full (including reserved slots)
可进入¦可進入¦参加可能¦Available
离线¦離線¦オフライン¦Offline
正在获取服务器状态…¦正在取得伺服器狀態…¦サーバー状態を確認中…¦Checking servers…
没有可用的服务器地址¦沒有可用的伺服器位址¦利用できる接続先がありません¦No server address available
{total} 个公共分区 · {available} 个可进入 · 不同分区互不相通¦{total} 個公開分區 · {available} 個可進入 · 不同分區互不相通¦公開サーバー {total} · 参加可能 {available} · 同じサーバーで遊ぼう¦{total} public servers · {available} available · Players on different servers cannot meet
服务器响应超时，请刷新重试¦伺服器回應逾時，請重新整理再試¦応答がありません。更新して再試行してください¦Server timed out. Refresh to try again
服务器暂时不可用，请刷新重试¦伺服器暫時無法使用，請重新整理再試¦現在サーバーを利用できません。更新して再試行してください¦Server unavailable. Refresh to try again
服务器¦伺服器¦サーバー¦Server
服务器 {n}¦伺服器 {n}¦サーバー {n}¦Server {n}
在线 ¦在線 ¦接続中 ¦Online 
在线 {n}¦在線 {n}¦オンライン {n}¦Online {n}
空位 {n}¦空位 {n}¦空き {n}¦Open slots {n}
最多 {n} 人¦最多 {n} 人¦定員 {n} 人¦Up to {n} players
读取容量中…¦讀取容量中…¦定員を確認中…¦Loading capacity…
连接中¦連線中¦接続中¦Connecting
连接失败¦連線失敗¦接続失敗¦Connection failed
所选服务器已满或席位被预留，请选择其他服务器¦所選伺服器已滿或席位已保留，請選擇其他伺服器¦選択したサーバーは満員です。他のサーバーを選んでください¦This server is full or slots are reserved. Choose another server
无法连接联机服务器¦無法連線至伺服器¦サーバーに接続できません¦Could not connect to the server
联机组件加载失败¦連線元件載入失敗¦通信コンポーネントを読み込めません¦Could not load networking component
尚未加入房间¦尚未加入房間¦ルームに参加していません¦Not in a room
你 · ¦你 · ¦あなた · ¦You · 
城市 ¦城市 ¦街 ¦City 
尚未连接联机房间。¦尚未連線至連線房間。¦まだルームに接続していません。¦Not connected to a room yet.
需要服务器¦需要伺服器¦接続先が必要です¦Server required
尚未配置联机服务器地址。请在“高级设置”中填写 WSS 地址。¦尚未設定連線伺服器位址。請在「進階設定」填寫 WSS 位址。¦「詳細設定」に WSS 接続先を入力してください。¦Enter a WSS server address in Advanced settings.
请先选好角色并进入城市，再加入房间。¦請先選好角色並進入城市，再加入房間。¦キャラクターを選んで街に入ってからルームに参加してください。¦Choose a character and enter a city before joining a room.
连接中…¦連線中…¦接続中…¦Connecting…
正在进入房间 ¦正在進入房間 ¦ルームに参加中：¦Joining room 
所选服务器不可用，请刷新列表¦所選伺服器無法使用，請重新整理清單¦このサーバーは利用できません。一覧を更新してください¦Selected server unavailable. Refresh the list
重连中…¦重新連線中…¦再接続中…¦Reconnecting…
网络中断，正在保留席位并自动重连。¦網路中斷，正在保留席位並自動重新連線。¦接続が切れました。席を確保して自動で再接続しています。¦Connection lost. Your slot is reserved while we reconnect.
已重连¦已重新連線¦再接続しました¦Reconnected
已恢复房间 ¦已恢復房間 ¦ルームに復帰：¦Rejoined room 
房间 ¦房間 ¦ルーム ¦Room 
已加入 ¦已加入 ¦参加しました：¦Joined 
，同一城市的玩家会显示在场景中。¦，同一城市的玩家會顯示在場景中。¦。同じ街のプレイヤーが表示されます。¦. Players in the same city appear in the world.
DANBO 联机房¦DANBO 連線房¦DANBO オンラインルーム¦DANBO online room
来我的 DANBO 房间一起玩¦來我的 DANBO 房間一起玩¦私の DANBO ルームで一緒に遊ぼう¦Come play in my DANBO room
邀请链接已复制。¦邀請連結已複製。¦招待リンクをコピーしました。¦Invite link copied.`);
    add(`发型¦髮型¦ヘアスタイル¦Hair
发饰¦髮飾¦ヘアアクセ¦Hair accessories
眼镜¦眼鏡¦メガネ¦Glasses
帽子¦帽子¦帽子¦Hats
光环¦光環¦オーラ¦Halos
背饰¦背飾¦背中のアクセ¦Back accessories
脚印特效¦腳印特效¦足跡エフェクト¦Footprint effects
短发¦短髮¦ショートヘア¦Short hair
刺猟头¦刺蝟頭¦ツンツンヘア¦Spiky hair
运动短发¦運動短髮¦スポーティーショート¦Sporty short hair
武士发型¦武士髮型¦サムライヘア¦Samurai hair
双马尾¦雙馬尾¦ツインテール¦Twin tails
长直发¦長直髮¦ストレートロング¦Long straight hair
卷发¦捲髮¦カーリーヘア¦Curly hair
公主发型¦公主髮型¦プリンセスヘア¦Princess hair
粉色发卡¦粉色髮夾¦ピンクの髪留め¦Pink hair clip
樱花发卡¦櫻花髮夾¦桜の髪留め¦Sakura hair clip
星星发卡¦星星髮夾¦星の髪留め¦Star hair clip
猫耳发箮¦貓耳髮箍¦ネコミミ¦Cat ears
兔耳发箮¦兔耳髮箍¦ウサミミ¦Bunny ears
皇冠¦皇冠¦王冠¦Crown
圆框眼镜¦圓框眼鏡¦丸メガネ¦Round glasses
墨镜¦墨鏡¦サングラス¦Sunglasses
爱心眼镜¦愛心眼鏡¦ハートのメガネ¦Heart glasses
星星眼镜¦星星眼鏡¦星のメガネ¦Star glasses
草帽¦草帽¦麦わら帽子¦Straw hat
贝雷帽¦貝雷帽¦ベレー帽¦Beret
探险家帽¦探險家帽¦探検家の帽子¦Explorer hat
宇航头盔¦太空頭盔¦宇宙ヘルメット¦Space helmet
初旅星环（旅程奖励）¦初旅星環（旅程獎勵）¦旅立ちの星輪（旅の報酬）¦First Journey Halo (journey reward)
星星光环¦星星光環¦星のオーラ¦Star halo
樱花光环¦櫻花光環¦桜のオーラ¦Sakura halo
云朵光环¦雲朵光環¦雲のオーラ¦Cloud halo
彩虹光环¦彩虹光環¦虹のオーラ¦Rainbow halo
羁绊羽翼（协作奖励）¦羈絆羽翼（協作獎勵）¦絆の翼（協力報酬）¦Bond Wings (co-op reward)
小翅膀¦小翅膀¦小さな翼¦Little wings
天使翅膀¦天使翅膀¦天使の翼¦Angel wings
恶魔翅膀¦惡魔翅膀¦悪魔の翼¦Devil wings
火箭背包¦火箭背包¦ロケットパック¦Rocket pack
樱花脚印¦櫻花腳印¦桜の足跡¦Sakura footprints
雪花脚印¦雪花腳印¦雪の足跡¦Snowflake footprints
火焰脚印¦火焰腳印¦炎の足跡¦Flame footprints
彩虹脚印¦彩虹腳印¦虹の足跡¦Rainbow footprints
羽¦羽¦翼¦Wings
脚印¦腳印¦足跡¦Footprints
 · 实时试穿¦ · 即時試穿¦ · 試着中¦ · Live preview
选择商品 · 3D 实时试穿¦選擇商品 · 即時試穿¦アイテムを選んで試着¦Select an item to try it on
原创造型收藏¦原創造型收藏¦オリジナルコレクション¦Original collection
角色 {n}¦角色 {n}¦キャラ {n}¦Characters {n}
含场景 NPC¦含場景 NPC¦街の NPC を含む¦Includes scene NPCs
选择一件商品，在展台上实时试穿¦選擇一件商品，在展台上即時試穿¦アイテムを選んで、ここで試着しよう¦Select an item to try it on here
◆ 已装备¦◆ 已裝備¦◆ 装備中¦◆ Equipped
◇ 已拥有¦◇ 已擁有¦◇ 所持済み¦◇ Owned
已装备¦已裝備¦装備中¦Equipped
已拥有¦已擁有¦所持済み¦Owned
协作挑战解锁¦協作挑戰解鎖¦協力チャレンジで獲得¦Unlock in co-op challenge
旅程挑战解锁¦旅程挑戰解鎖¦旅のチャレンジで獲得¦Unlock in journey challenge
金币¦金幣¦コイン¦coins
完成星光协奏获得¦完成星光協奏獲得¦星のデュエットで獲得¦Complete Star Duet to unlock
完成初次旅行获得¦完成初次旅行獲得¦はじめての旅で獲得¦Complete First Journey to unlock
卸下¦卸下¦外す¦Unequip
装备¦裝備¦装備¦Equip
购买¦購買¦購入¦Buy
购买成功！¦購買成功！¦購入しました！¦Purchased!
金币不足！¦金幣不足！¦コインが足りません！¦Not enough coins!
🏪 选购¦🏪 選購¦🏪 お買い物¦🏪 Shop
和老板选购外观？¦和老闆選購造型？¦店主と着せ替えを選びますか？¦Browse outfits with the shopkeeper?
🏪 走近老板，点击确认选购¦🏪 走近老闆，點選確認選購¦🏪 店主に近づいて決定でお買い物¦🏪 Approach the shopkeeper and confirm to shop
🏪 走近入口，点击确认¦🏪 走近入口，點選確認¦🏪 入口に近づいて決定¦🏪 Approach the entrance and confirm
选择一件商品试穿¦選擇一件商品試穿¦アイテムを選んで試着¦Choose an item to try on`);
    add(`新手探险家¦新手探險家¦かけだし探検家¦Novice explorer
旅行者¦旅行者¦旅人¦Traveler
冒险家¦冒險家¦冒険家¦Adventurer
资深探险家¦資深探險家¦ベテラン探検家¦Veteran explorer
世界旅人¦世界旅人¦世界の旅人¦World traveler
传奇探险家¦傳奇探險家¦伝説の探検家¦Legendary explorer
✨ 今日探索奖励！双倍积分¦✨ 今日探索獎勵！雙倍積分¦✨ 今日の探索ボーナス！ポイント2倍¦✨ Daily exploration bonus! Double points
🔍 发现隐藏区域：¦🔍 發現隱藏區域：¦🔍 隠しエリア発見：¦🔍 Hidden area found: 
👑 传说宝箱¦👑 傳說寶箱¦👑 伝説の宝箱¦👑 Legendary chest
💎 稀有宝箱¦💎 稀有寶箱¦💎 レア宝箱¦💎 Rare chest
探索等级提升¦探索等級提升¦探検レベルアップ¦Exploration level up
🏆 探索排行榜¦🏆 探索排行榜¦🏆 探索ランキング¦🏆 Exploration ranking
昵称¦暱稱¦ニックネーム¦Nickname
等级¦等級¦レベル¦Level
积分¦積分¦ポイント¦Points
此处仅显示本机玩家的探索记录。¦此處僅顯示本機玩家的探索紀錄。¦ここには、この端末のプレイヤーの探索記録のみ表示します。¦Only this device's player exploration record is shown here.
蛋宝城探险家¦蛋寶城探險家¦たまごの街の探検家¦Egg City explorer
沙海旅人¦沙海旅人¦砂漠の旅人¦Desert wanderer
冰原探索家¦冰原探索家¦氷原の探検家¦Icefield explorer
熔岩挑战者¦熔岩挑戰者¦溶岩の挑戦者¦Lava challenger
糖果收藏家¦糖果收藏家¦お菓子コレクター¦Candy collector
樱花旅人¦櫻花旅人¦桜の旅人¦Sakura traveler
雪村守护者¦雪村守護者¦雪の村の守り手¦Snow village guardian
月面探险家¦月面探險家¦月面探検家¦Moon explorer
云端旅者¦雲端旅者¦雲の旅人¦Cloud traveler
探险帽¦探險帽¦探検帽¦Explorer cap
沙漠围巾¦沙漠圍巾¦砂漠のスカーフ¦Desert scarf
雪地脚印¦雪地腳印¦雪原の足跡¦Snow footprints
火焰拖尾¦火焰拖尾¦炎のトレイル¦Flame trail
棒棒糖帽¦棒棒糖帽¦キャンディ帽¦Lollipop hat
冬日帽¦冬日帽¦冬の帽子¦Winter hat
太空头盔¦太空頭盔¦宇宙ヘルメット¦Astronaut helmet
初次冒险¦初次冒險¦はじめての冒険¦First adventure
失落遗迹¦失落遺跡¦失われた遺跡¦Lost ruins
冰封大师¦冰封大師¦氷の達人¦Frozen master
熔岩奔跑者¦熔岩奔跑者¦溶岩ランナー¦Lava runner
甜蜜旅程¦甜蜜旅程¦スイートジャーニー¦Sweet journey
赏花大师¦賞花大師¦お花見の達人¦Blossom master
冬日访客¦冬日訪客¦冬の訪問者¦Winter visitor
登上月球¦登上月球¦月に到着¦To the moon
云端之上¦雲端之上¦雲の上へ¦Above the clouds
世界探索者¦世界探索者¦世界の探検家¦World explorer
🌈 全地图探索完成！¦🌈 全地圖探索完成！¦🌈 全エリア探索完了！¦🌈 All areas explored!
☁️ 云栖蛋境 探索 100%！¦☁️ 雲棲蛋境 探索 100%！¦☁️ 雲のたまごの国 探索 100%！¦☁️ Cloud Egg Realm explored 100%!
 探索 100%！¦ 探索 100%！¦ 探索 100%！¦ explored 100%!
探索奖励已发放¦探索獎勵已發放¦探索報酬を獲得¦Exploration rewards received
🏅 称号：¦🏅 稱號：¦🏅 称号：¦🏅 Title: 
🎀 装扮：¦🎀 裝扮：¦🎀 着せ替え：¦🎀 Outfit: 
探索积分¦探索積分¦探索ポイント¦exploration points
🏆 成就：¦🏆 成就：¦🏆 ゲーム内実績：¦🏆 In-game achievement: 
传送失败，请重试¦傳送失敗，請重試¦ワープできませんでした。再試行してください¦Warp failed. Please try again
巴别塔¦巴別塔¦バベルの塔¦Tower of Babel
🏠 房屋¦🏠 房屋¦🏠 家¦🏠 House
进入房屋？¦進入房屋？¦家に入りますか？¦Enter the house?
🚪 走近入口，点击确认¦🚪 走近入口，點選確認¦🚪 入口に近づいて決定¦🚪 Approach the entrance and confirm
走到老板面前确认选购 · 走到门口离开¦走到老闆面前確認選購 · 走到門口離開¦店主に近づいて決定で買い物 · 出口に歩いて退店¦Approach the shopkeeper to browse · Walk to the door to leave
🏠 房屋内部¦🏠 房屋內部¦🏠 家の中¦🏠 Inside the house
内容开发中 · 走到门口离开¦內容開發中 · 走到門口離開¦準備中 · 出口から外へ¦Content in development · Walk to the door to leave
🗺️ 世界地图¦🗺️ 世界地圖¦🗺️ ワールドマップ¦🗺️ World map
当前位于：¦目前位於：¦現在地：¦You are here: 
M 键 或 点击关闭 · 未到达城市显示 ???¦M 鍵或點選關閉 · 未到達城市顯示 ???¦M キーまたはクリックで閉じる · 未訪問の街は ???¦Press M or click to close · Unvisited cities show ???`);
    add(`STAGE 1 · 绿城郊外¦STAGE 1 · 綠城郊外¦STAGE 1 · 緑の郊外¦STAGE 1 · Green outskirts
STAGE 2 · 森林弯道¦STAGE 2 · 森林彎道¦STAGE 2 · 森のカーブ¦STAGE 2 · Forest bends
STAGE 3 · 港湾高架¦STAGE 3 · 港灣高架¦STAGE 3 · 港の高架¦STAGE 3 · Harbor overpass
STAGE 4 · 海岸公路¦STAGE 4 · 海岸公路¦STAGE 4 · 海岸道路¦STAGE 4 · Coastal highway
STAGE 5 · 峡谷荒原¦STAGE 5 · 峽谷荒原¦STAGE 5 · 峡谷の荒野¦STAGE 5 · Canyon wilds
STAGE 6 · 田园冲刺¦STAGE 6 · 田園衝刺¦STAGE 6 · 田園スプリント¦STAGE 6 · Countryside sprint
方向¦方向¦ハンドル¦Steer
退出¦退出¦終了¦Exit
刹车¦煞車¦ブレーキ¦Brake
油门¦油門¦アクセル¦Throttle
多人模式已预留，等服务器房间接入后开放¦多人模式尚未開放，待伺服器房間串接後推出¦マルチプレイはまだ利用できません。ルーム対応後に公開予定です¦Multiplayer is not available yet; it will open after room integration
🚗 蛋宝火箭公路¦🚗 蛋寶火箭公路¦🚗 たまごロケットロード¦🚗 Egg Rocket Road
街机公路 · 单关挑战¦街機公路 · 單關挑戰¦アーケードドライブ · ステージチャレンジ¦Arcade highway · Stage challenge
单人游戏¦單人遊戲¦ひとりで遊ぶ¦Single player
多人游戏 ¦多人遊戲 ¦みんなで遊ぶ ¦Multiplayer 
开发中¦開發中¦開発中¦In development
高分榜¦高分榜¦ハイスコア¦High scores
6 个独立关卡；每次挑战 1 关，通关解锁下一关。¦6 個獨立關卡；每次挑戰 1 關，通關解鎖下一關。¦全6ステージ。1つずつクリアして次のステージを解放しよう。¦6 stages. Clear each one to unlock the next.
🏁 选择关卡¦🏁 選擇關卡¦🏁 ステージ選択¦🏁 Select a stage
通关上一关后，下一场景才会开放¦通關上一關後，下一場景才會開放¦前のステージをクリアすると次が開きます¦Clear the previous stage to unlock the next
可挑战¦可挑戰¦挑戦可能¦Available
返回标题¦返回標題¦タイトルへ¦Back to title
使用方向控制转向、加速和减速；触屏设备可直接点按画面按钮。¦使用方向控制轉向、加速和減速；觸控裝置可直接點按畫面按鈕。¦方向キーでハンドル・加速・減速。タッチ操作では画面のボタンを使います。¦Use directional controls to steer, accelerate and brake; on touchscreens use the on-screen controls.
先通关前一关才能挑战这里¦先通關前一關才能挑戰這裡¦前のステージをクリアしてください¦Clear the previous stage first
分¦分¦点¦points
还没有记录，先跑一局吧。¦還沒有紀錄，先跑一局吧。¦まだ記録がありません。走ってみよう！¦No records yet. Go for a run!
🏆 高分榜¦🏆 高分榜¦🏆 ハイスコア¦🏆 High scores
 通关！¦ 通關！¦ クリア！¦ cleared!
💥 挑战结束¦💥 挑戰結束¦💥 チャレンジ終了¦💥 Run ended
关卡：¦關卡：¦ステージ：¦Stage: 
分数：¦分數：¦スコア：¦Score: 
距离：¦距離：¦距離：¦Distance: 
补油：¦補油：¦給油：¦Refuels: 
碰撞：¦碰撞：¦衝突：¦Collisions: 
次¦次¦回¦times
用时：¦用時：¦タイム：¦Time: 
秒¦秒¦秒¦seconds
已解锁：¦已解鎖：¦解放：¦Unlocked: 
挑战下一关¦挑戰下一關¦次のステージ¦Next stage
再来一次¦再來一次¦もう一度¦Retry
选择关卡¦選擇關卡¦ステージ選択¦Select stage
打滑！反打方向稳住！¦打滑！反打方向穩住！¦スリップ！逆ハンドルで立て直そう！¦Skidding! Countersteer to recover!
补油 +¦補油 +¦給油 +¦Refuel +`);
    add(`账号服务暂时不可用¦帳號服務暫時無法使用¦アカウントサービスを利用できません¦Account service unavailable
连接超时，请稍后再试¦連線逾時，請稍後再試¦接続がタイムアウトしました。後でもう一度お試しください¦Connection timed out. Try again later
连接失败，请重试¦連線失敗，請重試¦接続できません。再試行してください¦Connection failed. Please try again
请先选择游客或登录账号¦請先選擇遊客或登入帳號¦ゲストを選ぶかログインしてください¦Choose guest mode or sign in first
保存失败，请重试¦儲存失敗，請重試¦保存できません。再試行してください¦Save failed. Please try again
登录服务繁忙，请稍后重试¦登入服務忙碌，請稍後重試¦ログインサービスが混雑しています。後でお試しください¦Sign-in service is busy. Try again later
用户名须为 3–16 个文字、字母、数字、下划线或短横线¦使用者名稱須為 3–16 個文字、字母、數字、底線或連字號¦ユーザー名は3～16文字。文字・数字・_・-が使えます¦Username must be 3–16 letters, numbers, underscores or hyphens
请输入有效邮箱地址¦請輸入有效的電子郵件地址¦有効なメールアドレスを入力してください¦Enter a valid email address
密码长度须为 15–128 个字符，可使用空格和中文¦密碼長度須為 15–128 個字元，可使用空格和中文¦パスワードは15～128文字。空白や日本語も使えます¦Password must be 15–128 characters; spaces and Unicode characters are allowed
人物名字须为 2–16 个文字、字母、数字、空格、下划线或短横线¦人物名字須為 2–16 個文字、字母、數字、空格、底線或連字號¦キャラクター名は2～16文字。文字・数字・空白・_・-が使えます¦Character name must be 2–16 letters, numbers, spaces, underscores or hyphens
请选择有效角色¦請選擇有效角色¦有効なキャラクターを選んでください¦Choose a valid character
尝试次数过多，请稍后再试¦嘗試次數過多，請稍後再試¦試行回数が多すぎます。しばらく待ってください¦Too many attempts. Try again later
该用户名或邮箱不可用，请更换或直接登录¦此使用者名稱或電子郵件無法使用，請更換或直接登入¦このユーザー名またはメールは使えません。変更するかログインしてください¦Username or email unavailable. Use another or sign in
请输入用户名或邮箱及密码¦請輸入使用者名稱或電子郵件及密碼¦ユーザー名またはメールとパスワードを入力してください¦Enter your username or email and password
用户名、邮箱或密码不正确¦使用者名稱、電子郵件或密碼不正確¦ユーザー名、メールまたはパスワードが正しくありません¦Username, email or password is incorrect
游客席位暂时繁忙，请稍后重试¦遊客席位暫時忙碌，請稍後重試¦ゲストの席が混雑しています。後でお試しください¦Guest slots are busy. Try again later
请先登录账号¦請先登入帳號¦先にログインしてください¦Sign in first
登录已过期，请重新登录¦登入已過期，請重新登入¦ログインの有効期限が切れました。再度ログインしてください¦Session expired. Sign in again
存档数值不正确¦存檔數值不正確¦セーブ内の数値が不正です¦Invalid save values
存档项目过多或格式不正确¦存檔項目過多或格式不正確¦セーブの項目が多すぎるか、形式が不正です¦Too many save entries or invalid format
存档项目名称不正确¦存檔項目名稱不正確¦セーブの項目名が不正です¦Invalid save entry name
存档标记不正确¦存檔標記不正確¦セーブのフラグが不正です¦Invalid save flags
不支持的存档版本或存档过大¦不支援的存檔版本或存檔過大¦非対応のセーブ形式、またはサイズが大きすぎます¦Unsupported save version or save too large
存档结构不正确¦存檔結構不正確¦セーブの構造が不正です¦Invalid save structure
每日存档格式不正确¦每日存檔格式不正確¦デイリーセーブの形式が不正です¦Invalid daily save format
装扮格式不正确¦裝扮格式不正確¦着せ替えデータの形式が不正です¦Invalid outfit format
旅程日期不正确¦旅程日期不正確¦旅の日付が不正です¦Invalid journey dates
奖励服务繁忙¦獎勵服務忙碌¦報酬サービスが混雑しています¦Reward service is busy
游客进度保存在浏览器；注册后可以使用云存档¦遊客進度儲存在瀏覽器；註冊後可使用雲端存檔¦ゲストの進行状況はブラウザに保存されます。登録するとオンラインセーブを使えます¦Guest progress stays in the browser. Register to use online saves
另一台设备已有新进度，请先选择保留哪份存档¦另一台裝置已有新進度，請先選擇保留哪份存檔¦他の端末に新しい進行状況があります。残すセーブを選んでください¦Another device has new progress. Choose which save to keep first
订阅设置不正确¦訂閱設定不正確¦購読設定が不正です¦Invalid subscription setting
接力服务繁忙，请稍后再试¦接力服務忙碌，請稍後再試¦引き継ぎサービスが混雑しています。後でお試しください¦Transfer service is busy. Try again later
接力码格式不正确¦接力碼格式不正確¦引き継ぎコードの形式が不正です¦Invalid transfer code format
接力码已使用或已过期，请在原设备重新生成¦接力碼已使用或已過期，請在原裝置重新產生¦コードは使用済みか期限切れです。元の端末で再作成してください¦Transfer code used or expired. Generate a new one on the original device
统计格式不正确¦統計格式不正確¦統計データの形式が不正です¦Invalid statistics format
统计容量已满¦統計容量已滿¦統計データの保存容量がいっぱいです¦Statistics storage is full
请使用 JSON 请求¦請使用 JSON 請求¦JSON 形式で送信してください¦Use a JSON request
账号请求过大¦帳號請求過大¦アカウントリクエストが大きすぎます¦Account request is too large
账号服务暂时不可用，请稍后重试¦帳號服務暫時無法使用，請稍後重試¦アカウントサービスを利用できません。後でお試しください¦Account service unavailable. Try again later
请求格式或长度不正确¦請求格式或長度不正確¦リクエストの形式または長さが不正です¦Invalid request format or length
进入失败，请重试¦進入失敗，請重試¦開始できません。再試行してください¦Could not enter. Please try again`);
})(window);
