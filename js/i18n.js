/*
	@author: DaiEn
	@Date: 2026-11-05
	@Correction: 1
	蛋殼喵 APNG 工具 — 多國語言包
	支援 zh-TW / zh-CN / en / ja，自動跟隨瀏覽器，可手動切換
*/

const I18N = {
	'zh-TW': {
		title: '蛋殼喵 APNG 工具',
		subtitle: '把一序列 PNG、APNG、GIF 打包成動畫 PNG',
		tabApp: 'APNG工具', tabReadme: '📖 README', tabHelp: '❓ HELP', tabSrc: '💻 SRC',
		dropHint: '把 PNG、APNG、GIF 圖片拖曳到這裡（可多選）',
		dropOrClick: '或點此選擇檔案',
		previewEmpty: '尚無圖片',
		bgToggle: '棋盤格',
		firstFrame: '到第一格', prevFrame: '上一格', playPause: '播放/暫停',
		nextFrame: '下一格', lastFrame: '到最後一格',
		sortManual: '≡ 排序順序', sortNameAsc: '⇅ 檔名遞增', sortNameDesc: '⇅ 檔名遞減',
		sortDateNew: '◷ 最新在上', sortDateOld: '◷ 最早在上',
		makeBtn: '✨️ 生成 APNG', clearBtn: '🗑️ 清空', downloadBtn: '⬇️ 下載 PNG',
		basicSettings: '⚙️ 基本設定',
		loopLabel: '循環次數（0 = 無限）',
		loop1: '播放1次', loop2: '播放2次', loop3: '播放3次', loop4: '播放4次', loopInf: '無限循環',
		colorLabel: '色彩（0 = 全彩 24bit）',
		color256: '256 色（較小檔）', color128: '128 色（更小）', colorFull: '全彩（最大檔但最細緻）',
		outSize: '📏 輸出尺寸',
		outW: '輸出寬度（px）', outH: '輸出高度（px）', outHint: '設其一，另一邊自動等比',
		fileList: '📋️ 檔案清單',
		helpTitle: '❓ 怎麼用',
		helpStep1: '把 PNG / APNG / GIF 拖到虛線框（可多選）',
		helpStep2: '在每張縮圖卡片上調整該格的延遲毫秒（預設 100ms）',
		helpStep3: '用卡片下方的 ⏮ ◀ ▶ ⏭ 按鈕調整影格順序，✕ 刪除不需要的格',
		helpStep4: '設定循環次數與色彩深度',
		helpStep5: '需要縮放才填輸出寬高，留空 = 原圖大小',
		helpStep6: '點「✨ 生成 APNG」→「⬇️ 下載 PNG」',
		helpTip: '💡 小提示',
		helpTip1: '拖入現成的 APNG / GIF 會自動拆成影格並還原時間',
		helpTip2: '右上的棋盤格 / 黑色按鈕可以切換預覽背景，方便看透明邊緣',
		helpTip3: '所有圖片都在你瀏覽器本機處理，不會上傳',
		helpTip4: '輸出的 PNG 是 APNG 格式，丟 Discord / Telegram / LINE 都會動',
		srcTitle: '💻 原始碼',
		srcDesc: '本工具開源在 GitHub，歡迎 star / issue / PR。',
		srcTech: '技術：純 HTML / CSS / JS · UPNG.js · pako · omggif · 無框架',
		unsupported: '⚠ 不支援的檔案：{list}（只接受 PNG / APNG / GIF）',
		importedAPNG: '已匯入 APNG：{n} 格',
		importedGIF: '已匯入 GIF：{n} 格',
		processing: '處理中...',
		encoding: '正在編碼 APNG...',
		done: '✅ 完成！共 {n} 影格',
		err: '❌ 錯誤：{msg}',
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
		tabApp: 'APNG工具', tabReadme: '📖 README', tabHelp: '❓ HELP', tabSrc: '💻 SRC',
		dropHint: '把 PNG、APNG、GIF 图片拖曳到这里（可多选）',
		dropOrClick: '或点此选择文件',
		previewEmpty: '尚无图片',
		bgToggle: '棋盘格',
		firstFrame: '到第一格', prevFrame: '上一格', playPause: '播放/暂停',
		nextFrame: '下一格', lastFrame: '到最后一格',
		sortManual: '≡ 排序顺序', sortNameAsc: '⇅ 文件名递增', sortNameDesc: '⇅ 文件名递减',
		sortDateNew: '◷ 最新在上', sortDateOld: '◷ 最早在上',
		makeBtn: '✨️ 生成 APNG', clearBtn: '🗑️ 清空', downloadBtn: '⬇️ 下载 PNG',
		basicSettings: '⚙️ 基本设置',
		loopLabel: '循环次数（0 = 无限）',
		loop1: '播放1次', loop2: '播放2次', loop3: '播放3次', loop4: '播放4次', loopInf: '无限循环',
		colorLabel: '色彩（0 = 全彩 24bit）',
		color256: '256 色（较小档）', color128: '128 色（更小）', colorFull: '全彩（最大档但最细致）',
		outSize: '📏 输出尺寸',
		outW: '输出宽度（px）', outH: '输出高度（px）', outHint: '设其一，另一边自动等比',
		fileList: '📋️ 文件列表',
		helpTitle: '❓ 怎么用',
		helpStep1: '把 PNG / APNG / GIF 拖到虚线框（可多选）',
		helpStep2: '在每张缩略图卡片上调整该格的延迟毫秒（默认 100ms）',
		helpStep3: '用卡片下方的 ⏮ ◀ ▶ ⏭ 按钮调整帧顺序，✕ 删除不需要的格',
		helpStep4: '设置循环次数与色彩深度',
		helpStep5: '需要缩放才填输出宽高，留空 = 原图大小',
		helpStep6: '点「✨ 生成 APNG」→「⬇️ 下载 PNG」',
		helpTip: '💡 小提示',
		helpTip1: '拖入现成的 APNG / GIF 会自动拆成帧并还原时间',
		helpTip2: '右上的棋盘格 / 黑色按钮可以切换预览背景，方便看透明边缘',
		helpTip3: '所有图片都在你浏览器本机处理，不会上传',
		helpTip4: '输出的 PNG 是 APNG 格式，发 Discord / Telegram / LINE 都会动',
		srcTitle: '💻 源代码',
		srcDesc: '本工具开源在 GitHub，欢迎 star / issue / PR。',
		srcTech: '技术：纯 HTML / CSS / JS · UPNG.js · pako · omggif · 无框架',
		unsupported: '⚠ 不支持的文件：{list}（只接受 PNG / APNG / GIF）',
		importedAPNG: '已导入 APNG：{n} 帧',
		importedGIF: '已导入 GIF：{n} 帧',
		processing: '处理中...',
		encoding: '正在编码 APNG...',
		done: '✅ 完成！共 {n} 帧',
		err: '❌ 错误：{msg}',
		sizeMismatch: '「{name}」尺寸 {w1}x{h1} 跟第一张 {w2}x{h2} 不同',
		previewAPNG: 'APNG 预览 · {n} 帧',
		fileInfo: '尺寸 {w}x{h} · {n} 帧 · {loopInfo} · 档案 {size} KB',
		loopOnce: '单次循环 {sec} 秒',
		loopTimes: ' · 共播 {n} 次 = {sec} 秒',
		loopInfLoop: ' · 无限循环',
		fps: 'FPS: {fps}',
	},

	'en': {
		title: 'Eggshell Cat APNG Tool',
		subtitle: 'Pack a sequence of PNG / APNG / GIF into an animated PNG',
		tabApp: 'APNG Tool', tabReadme: '📖 README', tabHelp: '❓ HELP', tabSrc: '💻 SRC',
		dropHint: 'Drag & drop PNG / APNG / GIF here (multi-select)',
		dropOrClick: 'or click to browse',
		previewEmpty: 'No images',
		bgToggle: 'Checker',
		firstFrame: 'First frame', prevFrame: 'Previous', playPause: 'Play / Pause',
		nextFrame: 'Next', lastFrame: 'Last frame',
		sortManual: '≡ Manual', sortNameAsc: '⇅ Name ↑', sortNameDesc: '⇅ Name ↓',
		sortDateNew: '◷ Newest', sortDateOld: '◷ Oldest',
		makeBtn: '✨️ Make APNG', clearBtn: '🗑️ Clear', downloadBtn: '⬇️ Download PNG',
		basicSettings: '⚙️ Settings',
		loopLabel: 'Loop count (0 = infinite)',
		loop1: 'Loop 1 time', loop2: 'Loop 2 times', loop3: 'Loop 3 times', loop4: 'Loop 4 times', loopInf: 'Infinite',
		colorLabel: 'Color (0 = full 24bit)',
		color256: '256 colors (smaller)', color128: '128 colors (even smaller)', colorFull: 'Full color (largest, best quality)',
		outSize: '📏 Output size',
		outW: 'Width (px)', outH: 'Height (px)', outHint: 'Set one, the other auto-scales',
		fileList: '📋️ File list',
		helpTitle: '❓ How to use',
		helpStep1: 'Drag PNG / APNG / GIF files into the drop zone (multi-select)',
		helpStep2: 'Adjust per-frame delay (ms) on each thumbnail card (default 100ms)',
		helpStep3: 'Use ⏮ ◀ ▶ ⏭ to reorder frames, ✕ to delete',
		helpStep4: 'Set loop count and color depth',
		helpStep5: 'Only set output W/H if you need to resize; leave blank = original size',
		helpStep6: 'Click "✨ Make APNG" → "⬇️ Download PNG"',
		helpTip: '💡 Tips',
		helpTip1: 'Drag in existing APNG / GIF to auto-split into frames with restored timing',
		helpTip2: 'Toggle checkerboard / black background to inspect transparent edges',
		helpTip3: 'All processing happens locally in your browser — nothing is uploaded',
		helpTip4: 'Output PNG is APNG — animated on Discord / Telegram / LINE',
		srcTitle: '💻 Source',
		srcDesc: 'Open source on GitHub — star / issue / PR welcome.',
		srcTech: 'Tech: vanilla HTML / CSS / JS · UPNG.js · pako · omggif · no framework',
		unsupported: '⚠ Unsupported: {list} (only PNG / APNG / GIF)',
		importedAPNG: 'Imported APNG: {n} frames',
		importedGIF: 'Imported GIF: {n} frames',
		processing: 'Processing...',
		encoding: 'Encoding APNG...',
		done: '✅ Done! {n} frames',
		err: '❌ Error: {msg}',
		sizeMismatch: '"{name}" is {w1}x{h1}, but first frame is {w2}x{h2}',
		previewAPNG: 'APNG preview · {n} frames',
		fileInfo: 'Size {w}x{h} · {n} frames · {loopInfo} · File {size} KB',
		loopOnce: 'One loop {sec}s',
		loopTimes: ' · {n} loops = {sec}s',
		loopInfLoop: ' · Infinite',
		fps: 'FPS: {fps}',
	},

	'ja': {
		title: 'たまねこ APNG ツール',
		subtitle: 'PNG / APNG / GIF を連結してアニメーション PNG に',
		tabApp: 'APNGツール', tabReadme: '📖 README', tabHelp: '❓ ヘルプ', tabSrc: '💻 ソース',
		dropHint: 'PNG / APNG / GIF をここにドラッグ（複数可）',
		dropOrClick: 'またはクリックして選択',
		previewEmpty: '画像なし',
		bgToggle: '市松模様',
		firstFrame: '先頭へ', prevFrame: '前へ', playPause: '再生 / 一時停止',
		nextFrame: '次へ', lastFrame: '最後へ',
		sortManual: '≡ 手動順序', sortNameAsc: '⇅ ファイル名昇順', sortNameDesc: '⇅ ファイル名降順',
		sortDateNew: '◷ 新しい順', sortDateOld: '◷ 古い順',
		makeBtn: '✨️ APNG生成', clearBtn: '🗑️ クリア', downloadBtn: '⬇️ PNGを保存',
		basicSettings: '⚙️ 基本設定',
		loopLabel: 'ループ回数（0 = 無限）',
		loop1: '1回再生', loop2: '2回再生', loop3: '3回再生', loop4: '4回再生', loopInf: '無限ループ',
		colorLabel: '色数（0 = フルカラー 24bit）',
		color256: '256色（軽量）', color128: '128色（さらに軽量）', colorFull: 'フルカラー（最高画質）',
		outSize: '📏 出力サイズ',
		outW: '幅（px）', outH: '高さ（px）', outHint: 'どちらか入力で自動計算',
		fileList: '📋️ ファイル一覧',
		helpTitle: '❓ 使い方',
		helpStep1: 'PNG / APNG / GIF をドロップゾーンにドラッグ（複数可）',
		helpStep2: '各サムネイルでフレームごとの遅延 ms を調整（既定 100ms）',
		helpStep3: 'カード下の ⏮ ◀ ▶ ⏭ で並び替え、✕ で削除',
		helpStep4: 'ループ回数と色数を設定',
		helpStep5: 'リサイズが必要な場合のみ幅/高さを入力（空欄 = 原寸）',
		helpStep6: '「✨ APNG生成」→「⬇️ PNGを保存」',
		helpTip: '💡 ヒント',
		helpTip1: '既存の APNG / GIF をドロップするとフレーム分割して時間も復元',
		helpTip2: '右上の市松/黒ボタンで背景を切替、透明エッジを確認',
		helpTip3: 'すべてブラウザ内で処理、アップロードなし',
		helpTip4: '出力 PNG は APNG 形式、Discord / Telegram / LINE で動く',
		srcTitle: '💻 ソースコード',
		srcDesc: 'GitHub でオープンソース。star / issue / PR 歓迎。',
		srcTech: '技術：vanilla HTML / CSS / JS · UPNG.js · pako · omggif · フレームワークなし',
		unsupported: '⚠ 未対応ファイル：{list}（PNG / APNG / GIF のみ）',
		importedAPNG: 'APNG 取り込み：{n} フレーム',
		importedGIF: 'GIF 取り込み：{n} フレーム',
		processing: '処理中...',
		encoding: 'APNG エンコード中...',
		done: '✅ 完了！全 {n} フレーム',
		err: '❌ エラー：{msg}',
		sizeMismatch: '「{name}」のサイズ {w1}x{h1} が 1 枚目 {w2}x{h2} と異なります',
		previewAPNG: 'APNG プレビュー · {n} フレーム',
		fileInfo: 'サイズ {w}x{h} · {n} フレーム · {loopInfo} · ファイル {size} KB',
		loopOnce: '1周 {sec} 秒',
		loopTimes: ' · {n} 周 = {sec} 秒',
		loopInfLoop: ' · 無限ループ',
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
	// 掃所有 data-i18n 節點
	document.querySelectorAll('[data-i18n]').forEach(el => {
		el.textContent = t(el.dataset.i18n);
	});
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		el.placeholder = t(el.dataset.i18nPlaceholder);
	});
	// 更新語言下拉選單的選中狀態
	const sel = document.getElementById('langSelect');
	if (sel) sel.value = lang;
}

// 語言切換事件
document.addEventListener('DOMContentLoaded', () => {
	const sel = document.getElementById('langSelect');
	if (sel) sel.addEventListener('change', () => applyLang(sel.value));
	applyLang(detectLang());
});
