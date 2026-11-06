/*
	@author: DaiEn
	@Date: 2026-11-06
	@Correction: 6
	蛋殼喵 APNG 工具 — 多國語言包
	支援 zh-TW / zh-CN / en / ja / th，自動跟隨瀏覽器，可手動切換
*/

const I18N = {
	'zh-TW': {
		title: '蛋殼喵 APNG 工具',
		subtitle: '把一序列 PNG、APNG、GIF 打包成動畫 PNG',
		tabApp: 'Apng', tabReadme: 'APNG Tool 更新日誌', tabHelp: 'Help', tabMeme: 'Meme',
		tabEmoji: 'Emoji', tabSrc: 'GitHub',
		dropHint: '把 PNG、APNG、GIF 圖片拖曳到這裡（可多選）',
		dropOrClick: '或點此選擇檔案',
		previewEmpty: '尚無圖片',
		bgToggle: '棋盤格',
		bgToggleTitle: '切換背景',
		firstFrame: '到第一格', prevFrame: '上一格', playPause: '播放/暫停',
		nextFrame: '下一格', lastFrame: '到最後一格',
		deleteFrame: '刪除此格',
		sortManual: '排序順序', sortNameAsc: '檔名遞增', sortNameDesc: '檔名遞減',
		sortDateNew: '最新在上', sortDateOld: '最早在上',
		makeBtn: '生成 APNG', clearBtn: '清空', downloadBtn: '下載 PNG',
		basicSettings: '基本設定',
		loopLabel: '循環次數（0 = 無限）',
		loop1: '播放1次', loop2: '播放2次', loop3: '播放3次', loop4: '播放4次', loopInf: '無限循環',
		colorLabel: '色彩（0 = 全彩 24bit）',
		color256: '256 色（較小檔）', color128: '128 色（更小）', colorFull: '全彩（最大檔但最細緻）',
		outSize: '輸出尺寸',
		outW: '輸出寬度（px）', outH: '輸出高度（px）', outHint: '設其一，另一邊自動等比',
		fileList: '檔案清單',
		helpTitle: '怎麼用',
		helpStep1: '把 PNG / APNG / GIF 拖到虛線框（可多選）',
		helpStep2: '在每張縮圖卡片上調整該格的延遲毫秒（預設 100ms）',
		helpStep3: '用卡片下方的&nbsp;&nbsp;<span class="cat cat-color06"><span class="cat-086"></span>&nbsp;<span class="cat-082"></span>&nbsp;<span class="cat-083"></span>&nbsp;<span class="cat-087"></span></span>&nbsp;&nbsp;按鈕調整影格順序，<span class="cat cat-color06 cat-017"></span>&nbsp;刪除不需要的格',
		helpStep4: '設定循環次數與色彩深度',
		helpStep5: '需要縮放才填輸出寬高，留空 = 原圖大小',
		helpStep6: '點「<span class="cat cat-color06 cat-033"></span>&nbsp;生成 APNG」→「<span class="cat cat-color06 cat-022"></span>&nbsp;下載 PNG」',
		helpTip: '小提示',
		helpTip1: '拖入現成的 APNG / GIF 會自動拆成影格並還原時間',
		helpTip2: '右上的棋盤格 / 黑色按鈕可以切換預覽背景，方便看透明邊緣',
		helpTip3: '所有圖片都在你瀏覽器本機處理，不會上傳',
		helpTip4: '輸出的 PNG 是 APNG 格式，丟 Discord / Telegram / LINE 都會動',
		srcTitle: '原始碼',
		srcDesc: '本工具開源在 GitHub，歡迎 star / issue / PR。',
		srcTech: '技術：純 HTML / CSS / JS · UPNG.js · pako · omggif · 無框架',
		emojiTitle: '蛋殼喵 Emoji 字型',
		emojiDesc: '點擊任何圖示即可複製 class 名稱，貼到 HTML 就能用~',
		memeTitle: '貓咪 表情包',
		memeDesc: '這裡放一些蛋殼喵的梗圖和廢文，開心一下~點擊圖片可重新播放',
		memeSortAsc: '按時間：正序',
		memeSortDesc: '按時間：反序',
		aboutTitle: '修改記錄',
		changelogDate1: '2026-11-06',
		changelog1_1: '加入泰文（ไทย），支援 5 國語言',
		changelog1_2: '下載檔名改為隨機字串 eggshell-XXXXXX.png',
		changelog1_3: '播放列右側顯示 FPS 與單次循環總時間',
		changelog1_4: '修正 GIF 解碼 partial update 導致的斑點雜色',
		changelog1_5: '修正 APNG 匯入 fcTL delay_den=0 的解析',
		changelog1_6: '加入 Meme 頁面與底部導航',
		changelogDate2: '2026-11-05',
		changelog2_1: '加入多國語言切換（繁中 / 簡中 / EN / 日本語）',
		changelog2_2: '介面改為多 tab：APNG工具 / About / Help / GitHub / Meme',
		changelog2_3: 'CSS 向量播放控制列、影格卡片排序與刪除功能',
		footerNote: '所有圖片皆在你的瀏覽器本機處理，不用上傳',
		unsupported: '<span class="cat cat-052"></span>&nbsp;不支援的檔案：{list}（只接受 PNG / APNG / GIF）',
		importedAPNG: '已匯入 APNG：{n} 格',
		importedGIF: '已匯入 GIF：{n} 格',
		processing: '處理中...',
		encoding: '正在編碼 APNG...',
		done: '<small class="cat cat-018"></small>&nbsp;完成！共 {n} 影格',
		err: '<small class="cat cat-017"></small>&nbsp;錯誤：{msg}',
		sizeMismatch: '「{name}」尺寸 {w1}x{h1} 跟第一張 {w2}x{h2} 不同',
		previewAPNG: 'APNG 預覽 · {n} 格',
		fileInfo: '尺寸 {w}x{h} · {n} 影格 · {loopInfo} · 檔案 {size} KB',
		loopOnce: '單次循環 {sec} 秒',
		loopTimes: ' · 共播 {n} 次 = {sec} 秒',
		loopInfLoop: ' · 無限循環',
		fps: 'FPS: {fps}',
	},

	'zh-CN': {
		title: '蛋壳喵 APNG 工具',
		subtitle: '把一序列 PNG、APNG、GIF 打包成动画 PNG',
		tabApp: 'Apng', tabReadme: 'APNG Tool 更新记录', tabHelp: 'Help', tabMeme: 'Meme',
		tabEmoji: 'Emoji', tabSrc: 'GitHub',
		dropHint: '把 PNG、APNG、GIF 图片拖曳到这里（可多选）',
		dropOrClick: '或点此选择文件',
		previewEmpty: '尚无图片',
		bgToggle: '棋盘格',
		bgToggleTitle: '切换背景',
		firstFrame: '到第一格', prevFrame: '上一格', playPause: '播放/暂停',
		nextFrame: '下一格', lastFrame: '到最后一格',
		deleteFrame: '删除此帧',
		sortManual: '排序顺序', sortNameAsc: '文件名递增', sortNameDesc: '文件名递减',
		sortDateNew: '最新在上', sortDateOld: '最早在上',
		makeBtn: '生成 APNG', clearBtn: '清空', downloadBtn: '下载 PNG',
		basicSettings: '基本设置',
		loopLabel: '循环次数（0 = 无限）',
		loop1: '播放1次', loop2: '播放2次', loop3: '播放3次', loop4: '播放4次', loopInf: '无限循环',
		colorLabel: '色彩（0 = 全彩 24bit）',
		color256: '256 色（较小档）', color128: '128 色（更小）', colorFull: '全彩（最大档但最细致）',
		outSize: '输出尺寸',
		outW: '输出宽度（px）', outH: '输出高度（px）', outHint: '设其一，另一边自动等比',
		fileList: '文件列表',
		helpTitle: '怎么用',
		helpStep1: '把 PNG / APNG / GIF 拖到虚线框（可多选）',
		helpStep2: '在每张缩略图卡片上调整该格的延迟毫秒（默认 100ms）',
		helpStep3: '用卡片下方的&nbsp;&nbsp;<span class="cat cat-color06"><span class="cat-086"></span>&nbsp;<span class="cat-082"></span>&nbsp;<span class="cat-083"></span>&nbsp;<span class="cat-087"></span></span>&nbsp;&nbsp;按钮调整帧顺序，<span class="cat cat-color06 cat-017"></span>&nbsp;删除不需要的格',
		helpStep4: '设置循环次数与色彩深度',
		helpStep5: '需要缩放才填输出宽高，留空 = 原图大小',
		helpStep6: '点「<span class="cat cat-color06 cat-033"></span>&nbsp;生成 APNG」→「<span class="cat cat-color06 cat-022"></span>&nbsp;下载 PNG」',
		helpTip: '小提示',
		helpTip1: '拖入现成的 APNG / GIF 会自动拆成帧并还原时间',
		helpTip2: '右上的棋盘格 / 黑色按钮可以切换预览背景，方便看透明边缘',
		helpTip3: '所有图片都在你浏览器本机处理，不会上传',
		helpTip4: '输出的 PNG 是 APNG 格式，发 Discord / Telegram / LINE 都会动',
		srcTitle: '源代码',
		srcDesc: '本工具开源在 GitHub，欢迎 star / issue / PR。',
		srcTech: '技术：纯 HTML / CSS / JS · UPNG.js · pako · omggif · 无框架',
		emojiTitle: '蛋壳喵 Emoji 字体',
		emojiDesc: '点击任何图标即可复制 class 名称，贴到 HTML 就能用~',
		memeTitle: '猫咪 表情包',
		memeDesc: '这里放一些蛋壳喵的梗图和废文，开心一下~点击图片可重新播放',
		memeSortAsc: '按时间：正序',
		memeSortDesc: '按时间：反序',
		aboutTitle: '修改记录',
		changelogDate1: '2026-11-06',
		changelog1_1: '加入泰文（ไทย），支持 5 国语言',
		changelog1_2: '下载文件名改为随机字符串 eggshell-XXXXXX.png',
		changelog1_3: '播放列右侧显示 FPS 与单次循环总时间',
		changelog1_4: '修正 GIF 解码 partial update 导致的斑点杂色',
		changelog1_5: '修正 APNG 导入 fcTL delay_den=0 的解析',
		changelog1_6: '加入 Meme 页面与底部导航',
		changelogDate2: '2026-11-05',
		changelog2_1: '加入多语言切换（繁中 / 简中 / EN / 日本語）',
		changelog2_2: '界面改为多 tab：APNG工具 / About / Help / GitHub / Meme',
		changelog2_3: 'CSS 向量播放控制列、帧卡片排序与删除功能',
		footerNote: '所有图片都在你的浏览器本机处理，不上传',
		unsupported: '<span class="cat cat-052"></span>&nbsp;不支持的文件：{list}（只接受 PNG / APNG / GIF）',
		importedAPNG: '已导入 APNG：{n} 帧',
		importedGIF: '已导入 GIF：{n} 帧',
		processing: '处理中...',
		encoding: '正在编码 APNG...',
		done: '<small class="cat cat-018"></small>&nbsp;完成！共 {n} 帧',
		err: '<small class="cat cat-017"></small>&nbsp;错误：{msg}',
		sizeMismatch: '「{name}」尺寸 {w1}x{h1} 跟第一张 {w2}x{h2} 不同',
		previewAPNG: 'APNG 预览 · {n} 帧',
		fileInfo: '尺寸 {w}x{h} · {n} 帧 · {loopInfo} · 档案 {size} KB',
		loopOnce: '单次循环 {sec} 秒',
		loopTimes: ' · 共播 {n} 次 = {sec} 秒',
		loopInfLoop: ' · 无限循环',
		fps: 'FPS: {fps}',
	},

	'en': {
		title: 'EggshellCat APNG Tool',
		subtitle: 'Pack a sequence of PNG / APNG / GIF into an animated PNG',
		tabApp: 'Apng', tabReadme: 'APNG Tool Changelog', tabHelp: 'Help', tabMeme: 'Meme',
		tabEmoji: 'Emoji', tabSrc: 'GitHub',
		dropHint: 'Drag & drop PNG / APNG / GIF here (multi-select)',
		dropOrClick: 'or click to browse',
		previewEmpty: 'No images',
		bgToggle: 'Checker',
		bgToggleTitle: 'Toggle background',
		firstFrame: 'First frame', prevFrame: 'Previous', playPause: 'Play / Pause',
		nextFrame: 'Next', lastFrame: 'Last frame',
		deleteFrame: 'Delete frame',
		sortManual: 'Manual', sortNameAsc: 'Name ↑', sortNameDesc: 'Name ↓',
		sortDateNew: 'Newest', sortDateOld: 'Oldest',
		makeBtn: 'Make APNG', clearBtn: 'Clear', downloadBtn: 'Download PNG',
		basicSettings: 'Settings',
		loopLabel: 'Loop count (0 = infinite)',
		loop1: 'Loop 1 time', loop2: 'Loop 2 times', loop3: 'Loop 3 times', loop4: 'Loop 4 times', loopInf: 'Infinite',
		colorLabel: 'Color (0 = full 24bit)',
		color256: '256 colors (smaller)', color128: '128 colors (even smaller)', colorFull: 'Full color (largest, best quality)',
		outSize: 'Output size',
		outW: 'Width (px)', outH: 'Height (px)', outHint: 'Set one, the other auto-scales',
		fileList: 'File list',
		helpTitle: 'How to use',
		helpStep1: 'Drag PNG / APNG / GIF files into the drop zone (multi-select)',
		helpStep2: 'Adjust per-frame delay (ms) on each thumbnail card (default 100ms)',
		helpStep3: 'Use&nbsp;&nbsp;<span class="cat cat-color06"><span class="cat-086"></span>&nbsp;<span class="cat-082"></span>&nbsp;<span class="cat-083"></span>&nbsp;<span class="cat-087"></span></span>&nbsp;&nbsp;to reorder frames, <span class="cat cat-color06 cat-017"></span>&nbsp;to delete',
		helpStep4: 'Set loop count and color depth',
		helpStep5: 'Only set output W/H if you need to resize; leave blank = original size',
		helpStep6: 'Click "<span class="cat cat-color06 cat-033"></span>&nbsp;Make APNG" → "<span class="cat cat-color06 cat-022"></span>&nbsp;Download PNG"',
		helpTip: 'Tips',
		helpTip1: 'Drag in existing APNG / GIF to auto-split into frames with restored timing',
		helpTip2: 'Toggle checkerboard / black background to inspect transparent edges',
		helpTip3: 'All processing happens locally in your browser — nothing is uploaded',
		helpTip4: 'Output PNG is APNG — animated on Discord / Telegram / LINE',
		srcTitle: 'Source',
		srcDesc: 'Open source on GitHub — star / issue / PR welcome.',
		srcTech: 'Tech: vanilla HTML / CSS / JS · UPNG.js · pako · omggif · no framework',
		emojiTitle: 'EggshellCat Emoji Font',
		emojiDesc: 'Click any icon to copy its class name, then paste it into your HTML~',
		memeTitle: 'Cat Memes',
		memeDesc: 'Some EggshellCat memes and silly stuff to brighten your day~',
		memeSortAsc: 'Sort: Oldest',
		memeSortDesc: 'Sort: Newest',
		aboutTitle: 'Changelog',
		changelogDate1: '2026-11-06',
		changelog1_1: 'Added Thai (ไทย), now supports 5 languages',
		changelog1_2: 'Download filename changed to random eggshell-XXXXXX.png',
		changelog1_3: 'FPS and loop duration shown on the right of playback bar',
		changelog1_4: 'Fixed GIF decode artifacts from partial updates',
		changelog1_5: 'Fixed APNG fcTL delay_den=0 parsing',
		changelog1_6: 'Added Meme page and footer navigation',
		changelogDate2: '2026-11-05',
		changelog2_1: 'Added multi-language support (zh-TW / zh-CN / EN / JA)',
		changelog2_2: 'UI changed to multi-tab: APNG / About / Help / GitHub / Meme',
		changelog2_3: 'CSS vector playback controls, frame card sort and delete',
		footerNote: 'All images are processed locally in your browser, nothing uploaded',
		unsupported: '<span class="cat cat-052"></span>&nbsp;Unsupported: {list} (only PNG / APNG / GIF)',
		importedAPNG: 'Imported APNG: {n} frames',
		importedGIF: 'Imported GIF: {n} frames',
		processing: 'Processing...',
		encoding: 'Encoding APNG...',
		done: '<small class="cat cat-018"></small>&nbsp;Done! {n} frames',
		err: '<small class="cat cat-017"></small>&nbsp;Error: {msg}',
		sizeMismatch: '"{name}" is {w1}x{h1}, but first frame is {w2}x{h2}',
		previewAPNG: 'APNG preview · {n} frames',
		fileInfo: 'Size {w}x{h} · {n} frames · {loopInfo} · File {size} KB',
		loopOnce: 'One loop {sec}s',
		loopTimes: ' · {n} loops = {sec}s',
		loopInfLoop: ' · Infinite',
		fps: 'FPS: {fps}',
	},

	'ja': {
		title: 'エッグシェル・ミャオ APNG ツール',
		subtitle: 'PNG / APNG / GIF を連結してアニメーション PNG に',
		tabApp: 'Apng', tabReadme: 'APNG Tool 変更履歴', tabHelp: 'Help', tabMeme: 'Meme',
		tabEmoji: 'Emoji', tabSrc: 'GitHub',
		dropHint: 'PNG / APNG / GIF をここにドラッグ（複数可）',
		dropOrClick: 'またはクリックして選択',
		previewEmpty: '画像なし',
		bgToggle: '市松模様',
		bgToggleTitle: '背景切換',
		firstFrame: '先頭へ', prevFrame: '前へ', playPause: '再生 / 一時停止',
		nextFrame: '次へ', lastFrame: '最後へ',
		deleteFrame: 'このフレームを削除',
		sortManual: '手動順序', sortNameAsc: 'ファイル名昇順', sortNameDesc: 'ファイル名降順',
		sortDateNew: '新しい順', sortDateOld: '古い順',
		makeBtn: 'APNG生成', clearBtn: 'クリア', downloadBtn: 'PNGを保存',
		basicSettings: '基本設定',
		loopLabel: 'ループ回数（0 = 無限）',
		loop1: '1回再生', loop2: '2回再生', loop3: '3回再生', loop4: '4回再生', loopInf: '無限ループ',
		colorLabel: '色数（0 = フルカラー 24bit）',
		color256: '256色（軽量）', color128: '128色（さらに軽量）', colorFull: 'フルカラー（最高画質）',
		outSize: '出力サイズ',
		outW: '幅（px）', outH: '高さ（px）', outHint: 'どちらか入力で自動計算',
		fileList: 'ファイル一覧',
		helpTitle: '使い方',
		helpStep1: 'PNG / APNG / GIF をドロップゾーンにドラッグ（複数可）',
		helpStep2: '各サムネイルでフレームごとの遅延 ms を調整（既定 100ms）',
		helpStep3: 'カード下の&nbsp;&nbsp;<span class="cat cat-color06"><span class="cat-086"></span>&nbsp;<span class="cat-082"></span>&nbsp;<span class="cat-083"></span>&nbsp;<span class="cat-087"></span></span>&nbsp;&nbsp;で並び替え、<span class="cat cat-color06 cat-017"></span>&nbsp;で削除',
		helpStep4: 'ループ回数と色数を設定',
		helpStep5: 'リサイズが必要な場合のみ幅/高さを入力（空欄 = 原寸）',
		helpStep6: '「<span class="cat cat-color06 cat-033"></span>&nbsp;APNG生成」→「<span class="cat cat-color06 cat-022"></span>&nbsp;PNGを保存」',
		helpTip: 'ヒント',
		helpTip1: '既存の APNG / GIF をドロップするとフレーム分割して時間も復元',
		helpTip2: '右上の市松/黒ボタンで背景を切替、透明エッジを確認',
		helpTip3: 'すべてブラウザ内で処理、アップロードなし',
		helpTip4: '出力 PNG は APNG 形式、Discord / Telegram / LINE で動く',
		srcTitle: 'ソースコード',
		srcDesc: 'GitHub でオープンソース。star / issue / PR 歓迎。',
		srcTech: '技術：vanilla HTML / CSS / JS · UPNG.js · pako · omggif · フレームワークなし',
		emojiTitle: 'エッグシェル・ミャオ Emoji フォント',
		emojiDesc: 'アイコンをクリックするとクラス名をコピー、HTMLに貼り付けて使えるよ~',
		memeTitle: '猫ミーム',
		memeDesc: 'エッグシェル・ミャオのミームや小ネタで癒やされよう~',
		memeSortAsc: '並び替え：昇順',
		memeSortDesc: '並び替え：降順',
		aboutTitle: '変更履歴',
		changelogDate1: '2026-11-06',
		changelog1_1: 'タイ語（ไทย）を追加、5言語対応',
		changelog1_2: 'ダウンロードファイル名をランダムな eggshell-XXXXXX.png に変更',
		changelog1_3: '再生バー右側にFPSとループ合計時間を表示',
		changelog1_4: 'GIFデコードのpartial updateによるノイズを修正',
		changelog1_5: 'APNG読み込み時のfcTL delay_den=0の解析を修正',
		changelog1_6: 'Memeページとフッターナビを追加',
		changelogDate2: '2026-11-05',
		changelog2_1: '多言語切替を追加（繁体中国語 / 簡体中国語 / EN / 日本語）',
		changelog2_2: 'UIをマルチタブに変更：APNG / About / Help / GitHub / Meme',
		changelog2_3: 'CSSベクター再生コントロール、フレームカードの並び替えと削除',
		footerNote: 'すべての画像はブラウザ内で処理され、アップロードされません',
		unsupported: '<span class="cat cat-052"></span>&nbsp;未対応ファイル：{list}（PNG / APNG / GIF のみ）',
		importedAPNG: 'APNG 取り込み：{n} フレーム',
		importedGIF: 'GIF 取り込み：{n} フレーム',
		processing: '処理中...',
		encoding: 'APNG エンコード中...',
		done: '<small class="cat cat-018"></small>&nbsp;完了！全 {n} フレーム',
		err: '<small class="cat cat-017"></small>&nbsp;エラー：{msg}',
		sizeMismatch: '「{name}」のサイズ {w1}x{h1} が 1 枚目 {w2}x{h2} と異なります',
		previewAPNG: 'APNG プレビュー · {n} フレーム',
		fileInfo: 'サイズ {w}x{h} · {n} フレーム · {loopInfo} · ファイル {size} KB',
		loopOnce: '1周 {sec} 秒',
		loopTimes: ' · {n} 周 = {sec} 秒',
		loopInfLoop: ' · 無限ループ',
		fps: 'FPS: {fps}',
	},

	'th': {
		title: 'EggshellCat APNG Tool',
		subtitle: 'รวม PNG / APNG / GIF เป็นภาพเคลื่อนไหว PNG',
		tabApp: 'Apng', tabReadme: 'APNG Tool ประวัติ', tabHelp: 'Help', tabMeme: 'Meme',
		tabEmoji: 'Emoji', tabSrc: 'GitHub',
		dropHint: 'ลาก PNG / APNG / GIF มาวางที่นี่ (เลือกหลายไฟล์ได้)',
		dropOrClick: 'หรือคลิกเพื่อเลือกไฟล์',
		previewEmpty: 'ยังไม่มีภาพ',
		bgToggle: 'ตารางหมากรุก',
		bgToggleTitle: 'สลับพื้นหลัง',
		firstFrame: 'เฟรมแรก', prevFrame: 'ก่อนหน้า', playPause: 'เล่น / หยุด',
		nextFrame: 'ถัดไป', lastFrame: 'เฟรมสุดท้าย',
		deleteFrame: 'ลบเฟรมนี้',
		sortManual: 'เรียงลำดับเอง', sortNameAsc: 'ชื่อ A-Z', sortNameDesc: 'ชื่อ Z-A',
		sortDateNew: 'ใหม่สุด', sortDateOld: 'เก่าสุด',
		makeBtn: 'สร้าง APNG', clearBtn: 'ล้าง', downloadBtn: 'ดาวน์โหลด PNG',
		basicSettings: 'ตั้งค่าพื้นฐาน',
		loopLabel: 'จำนวนรอบ (0 = ไม่จำกัด)',
		loop1: 'เล่น 1 รอบ', loop2: 'เล่น 2 รอบ', loop3: 'เล่น 3 รอบ', loop4: 'เล่น 4 รอบ', loopInf: 'วนไม่จำกัด',
		colorLabel: 'สี (0 = เต็มสี 24bit)',
		color256: '256 สี (ไฟล์เล็ก)', color128: '128 สี (เล็กกว่า)', colorFull: 'เต็มสี (ใหญ่สี คมชัดสุด)',
		outSize: 'ขนาดส่งออก',
		outW: 'กว้าง (px)', outH: 'สูง (px)', outHint: 'ใส่ค่าใดค่าหนึ่ง อีกด้านจะปรับตามสัดส่วน',
		fileList: 'รายการไฟล์',
		helpTitle: 'วิธีใช้',
		helpStep1: 'ลากไฟล์ PNG / APNG / GIF มาวางในกรอบเส้นประ (เลือกหลายไฟล์ได้)',
		helpStep2: 'ปรับเวลาหน่วงต่อเฟรม (ms) การ์ดภาพขนาดย่อ (ค่าเริ่มต้น 100ms)',
		helpStep3: 'ใช้&nbsp;&nbsp;<span class="cat cat-color06"><span class="cat-086"></span>&nbsp;<span class="cat-082"></span>&nbsp;<span class="cat-083"></span>&nbsp;<span class="cat-087"></span></span>&nbsp;&nbsp;จัดลำดับเฟรม <span class="cat cat-color06 cat-017"></span>&nbsp;ลบเฟรมที่ไม่ต้องการ',
		helpStep4: 'ตั้งจำนวนรอบและจำนวนสี',
		helpStep5: 'กรอกขนาดส่งออกเฉพาะตอนต้องการปรับขนาด เว้นว่าง = ขนาดเดิม',
		helpStep6: 'กด «<span class="cat cat-color06 cat-033"></span>&nbsp;สร้าง APNG» → «<span class="cat cat-color06 cat-022"></span>&nbsp;ดาวน์โหลด PNG»',
		helpTip: 'เคล็ดลับ',
		helpTip1: 'ลาก APNG / GIF ที่มีอยู่แล้วจะแยกเป็นเฟรมและกู้คืนเวลาเอง',
		helpTip2: 'ปุ่มตารางหมากรุก / ดำ ที่มุมขวาบนใช้สลับพื้นหลังดูขอบโปร่ง',
		helpTip3: 'ประมวลผลทั้งหมดในเบราว์เซอร์ของคุณ ไม่อัปโหลดขึ้นเซิร์ฟเวอร์',
		helpTip4: 'ไฟล์ PNG ที่ส่งออกเป็น APNG เล่นบน Discord / Telegram / LINE ได้',
		srcTitle: 'ซอร์สโค้ด',
		srcDesc: 'เครื่องมือนี้เปิดโอเพนซอร์สบน GitHub ยินดี star / issue / PR',
		srcTech: 'เทคโนโลยี: HTML / CSS / JS ล้วนๆ · UPNG.js · pako · omggif · ไม่มีเฟรมเวิร์ก',
		emojiTitle: 'ฟอนต์ Emoji EggshellCat',
		emojiDesc: 'คลิกไอคอนเพื่อคัดลอกชื่อ class แล้ววางใน HTML ได้เลย~',
		memeTitle: 'มีมแมว',
		memeDesc: 'มีมและเรื่องขบขันของ EggshellCat มาดูกัน~',
		memeSortAsc: 'เรียง: เก่าสุด',
		memeSortDesc: 'เรียง: ใหม่สุด',
		aboutTitle: 'ประวัติการแก้ไข',
		changelogDate1: '2026-11-06',
		changelog1_1: 'เพิ่มภาษาไทย รองรับ 5 ภาษา',
		changelog1_2: 'ชื่อไฟล์ดาวน์โหลดเปลี่ยนเป็นสุ่ม eggshell-XXXXXX.png',
		changelog1_3: 'แสดง FPS และเวลารวมวนซ้ำทางด้านขวาของแถบเล่น',
		changelog1_4: 'แก้ไขจุดด่างจากการถอดรหัส GIF แบบ partial update',
		changelog1_5: 'แก้ไขการอ่านค่า fcTL delay_den=0 ของ APNG',
		changelog1_6: 'เพิ่มหน้า Meme และแถบนำทางด้านล่าง',
		changelogDate2: '2026-11-05',
		changelog2_1: 'เพิ่มการสลับภาษา (จีนดั้งเดิม / จีนตัวย่อ / EN / ญี่ปุ่น)',
		changelog2_2: 'เปลี่ยน UI เป็นหลายแท็บ: APNG / About / Help / GitHub / Meme',
		changelog2_3: 'ปุ่มควบคุมการเล่นแบบเวกเตอร์ CSS, เรียงลำดับและลบการ์ดเฟรม',
		footerNote: 'รูปภาพทั้งหมดประมวลผลในเบราว์เซอร์ของคุณ ไม่มีการอัปโหลด',
		unsupported: '<span class="cat cat-052"></span>&nbsp;ไฟล์ที่ไม่รองรับ: {list} (รับเฉพาะ PNG / APNG / GIF)',
		importedAPNG: 'นำเข้า APNG แล้ว: {n} เฟรม',
		importedGIF: 'นำเข้า GIF แล้ว: {n} เฟรม',
		processing: 'กำลังประมวลผล...',
		encoding: 'กำลังเข้ารหัส APNG...',
		done: '<small class="cat cat-018"></small>&nbsp;เสร็จสิ้น! ทั้งหมด {n} เฟรม',
		err: '<small class="cat cat-017"></small>&nbsp;ข้อผิดพลาด: {msg}',
		sizeMismatch: '«{name}» ขนาด {w1}x{h1} ไม่ตรงกับเฟรมแรก {w2}x{h2}',
		previewAPNG: 'ตัวอย่าง APNG · {n} เฟรม',
		fileInfo: 'ขนาด {w}x{h} · {n} เฟรม · {loopInfo} · ไฟล์ {size} KB',
		loopOnce: 'วนเดียว {sec} วิ',
		loopTimes: ' · ทั้งหมด {n} รอบ = {sec} วิ',
		loopInfLoop: ' · วนไม่จำกัด',
		fps: 'FPS: {fps}',
	},
};

// ============================================================
// 語言切換核心
// ============================================================
let currentLang = 'zh-TW';

function detectLang() {
	// 使用者手動選過就用 localStorage 的
	const saved = localStorage.getItem('apng-lang');
	if (saved && I18N[saved]) return saved;
	// 否則讀瀏覽器語言
	const nav = (navigator.language || 'zh-TW').toLowerCase();
	if (nav.startsWith('zh')) {
		// zh-CN / zh-SG 視為簡中，其餘 zh 視為繁中
		if (nav.includes('cn') || nav.includes('sg') || nav.includes('hans')) return 'zh-CN';
		return 'zh-TW';
	}
	if (nav.startsWith('ja')) return 'ja';
	if (nav.startsWith('th')) return 'th';
	return 'en'; // 預設英文
}

function t(key, vars) {
	let s = (I18N[currentLang] && I18N[currentLang][key]) || I18N['zh-TW'][key] || key;
	if (vars) {
		for (const k in vars) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
	}
	return s;
}

function applyLang(lang) {
	currentLang = lang;
	localStorage.setItem('apng-lang', lang);
	document.documentElement.lang = lang === 'zh-CN' ? 'zh-CN' : lang.toLowerCase();
	document.title = t('title');
	// 掃所有 data-i18n 節點（用 innerHTML 才能渲染裡面的 <span class="cat"> emoji）
	document.querySelectorAll('[data-i18n]').forEach(el => {
		el.innerHTML = t(el.dataset.i18n);
	});
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		el.placeholder = t(el.dataset.i18nPlaceholder);
	});
	// 掃 data-i18n-title（按鈕的滑鼠懸停提示）
	document.querySelectorAll('[data-i18n-title]').forEach(el => {
		el.title = t(el.dataset.i18nTitle);
	});
	// 更新語言下拉的選中狀態
	const btn = document.getElementById('langBtn');
	if (btn) {
		const item = document.querySelector('.lang-menu li[data-value="' + lang + '"]');
		if (item) {
			// 更新 emoji
			const itemCat = item.querySelector('.cat');
			const btnCat = btn.querySelector('.cat');
			if (itemCat && btnCat) {
				btnCat.className = itemCat.className;
			}
			// 更新文字
			const label = btn.querySelector('.lang-label');
			if (label) label.textContent = item.textContent.trim();
		}
	}
	// 切換語言後重建影格卡片，讓動態產生的 title 也跟著變
	if (typeof rebuildPreviews === 'function') rebuildPreviews();
}

// 語言切換：自訂下拉（直接綁定，不依賴 DOMContentLoaded）
function initLangDropdown() {
	const dropdown = document.getElementById('langDropdown');
	const btn = document.getElementById('langBtn');
	const menu = document.getElementById('langMenu');
	if (!dropdown || !btn || !menu) {
		// DOM 還沒載入，等一下再試
		setTimeout(initLangDropdown, 50);
		return;
	}

	// 點按鈕開關選單
	btn.onclick = (e) => {
		e.stopPropagation();
		menu.classList.toggle('open');
	};
	// 點選單項目
	menu.querySelectorAll('li').forEach(li => {
		li.onclick = () => {
			applyLang(li.dataset.value);
			menu.classList.remove('open');
		};
	});
	// 點外面關閉
	document.onclick = () => menu.classList.remove('open');
	applyLang(detectLang());
}
initLangDropdown();
