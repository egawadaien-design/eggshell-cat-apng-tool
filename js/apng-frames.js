/**
 * 蛋殼喵 APNG 工具 — 影格管理
 * 檔案匯入 / APNG、GIF、WebP 拆格 / 排序 / 時間軸與卡片渲染 / 播放控制 / 清空
 * @author [DaiEn]
 * @Date: 2026-11-26
 * @Correction: 18
 * 本次修正：APNG 頁支援匯入影片（MP4／MOV／WebM）——importVideo()（L484 附近）用 <video> + seek
 *           + drawImage 抽格，不引入 demux 套件：10fps 取樣、夾在 5～20 格、只取前 4 秒、
 *           延遲均分但總和鎖在整數秒（LINE 規格）、取樣畫布長邊上限 512px；
 *           addFiles 分流加入 isVideo，影片解不開時給 videoFail 專屬訊息（HEVC／AV1）
 * 上次修正：播放期間「任何操作都先停播」——stopPlaybackOnAnyAction()（L832）在 document 以捕獲階段
 *           監聽 pointerdown／keydown／input／wheel，只要不是在播放鈕上就 pause()，
 *           避免動畫還在跑、使用者又改設定造成畫面與設定互相打架（切頁籤也一併停）。
 * 上次修正：右側「通用設置」新增「每 [N] 格刪除一個影格」——trimFramesByStep()（L134 附近）讀 #gsTrimStep，
 *           以「保留 N 格、刪 1 格」循環（N=1 刪第 2、4、6…格；N=2 刪第 3、6、9…格），
 *           一次算好保留清單再換掉（不逐格呼叫 deleteFrame），只重畫一次卡片；
 *           最後一格被刪時走 enterEmptyState()（由 deleteFrame() 抽出的共用收尾）。
 * 上次修正：生成後的預覽不再重複疊文字。apng-encoder.js 會把成品 APNG 放進 previewImg 並標記
 *           dataset.baked='1'，paintTextOverlay() 看到就收起疊層（成品裡的字已經烤好了，
 *           再疊一層靜止的字會蓋掉淡入淡出、看起來像「只停留在第一格」）；
 *           showFrame() 換格時清掉標記，appTextChanged() 改字時自動切回原圖預覽。
 * 上次修正：clearAll() 一併隱藏「下載 WEBP」鈕（downloadWebpLink），
 *           避免清空影格後還能下載上一輪留下的舊像素
 * 上次修正：接上右側「通用設置」——applyGeneralDelay()（L93）讀 #gsDelay 的毫秒數驗證 16～65535，
 *           把 frameDelays 全部填成同值後重畫卡片（renderTimeline）並更新總時間（updatePlaybackInfo）；
 *           #gsApply 沒有影格時由 rebuildPreviews 停用，輸入框按 Enter 也可套用
 * 上次修正：APNG 頁支援匯入 WebP（addFiles 分流 importWebP）——動畫 WebP 用 WebCodecs 的 ImageDecoder
 *           逐格解出並沿用每格 duration 當延遲；不支援 ImageDecoder 的瀏覽器退回只取第一格
 *           檔案型別判斷加入副檔名（type 為空字串或 image/apng 時也能正確分流）
 * 2026-11-12 追加：接上 js/text-overlay.js，APNG 頁新增「文字」面板（十字鍵 / 字體 / 粗斜體底線 / 字級 / 顏色 / 外框 / 陰影），
 *                 預覽用透明 canvas 疊在 .preview-stage 上，實際燒字在 apng-encoder.js
 * 2026-11-12 追加：影格縮圖收起時，排序列五顆排序鈕一起隱藏（sort-bar.grid-collapsed）
 *
 * 由原 apng.js 第 362~857 行原封不動切出，未改動任何邏輯
 * 2026-11-12 追加：影格卡片底部中間新增「複製此格」鈕（duplicateFrame），
 *                 導航鈕改用 class 抓取，不再依賴 querySelectorAll 的索引順序
 *                 補上與 js/frame-offset.js 的兩個接口（切格同步面板、複製時繼承位移記錄）
 * 2026-11-12 追加：接上 js/source-frame.js，預覽舞台畫出「第一張圖」的綠色外框（drawSourceFrame）
 * 2026-11-12 追加：排序列最右邊新增收合鈕（frameGridToggle），可把影格縮圖整片收起來
 * 注意：本檔包含全域狀態（files / previewUrls / frameDelays 等）與 DOM 節點宣告，
 *       必須在 apng-encoder.js、png-editor.js 之前載入
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// ============================================================
// DOM 元素 & 全域狀態
// ============================================================
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const makeBtn = document.getElementById('makeBtn');
const clearBtn = document.getElementById('clearBtn');
const previewImg = document.getElementById('previewImg');
const previewInfo = document.getElementById('previewInfo');
const downloadLink = document.getElementById('downloadLink');
const status = document.getElementById('status');
const fileInfo = document.getElementById('fileInfo');
const timeline = document.getElementById('timeline');
const playBtn = document.getElementById('playBtn');
playBtn.innerHTML = '<small class="cat cat-083 cat-2x cat-color03"></small>'; // 初始：播放圖示
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const outW = document.getElementById('outW');
const outH = document.getElementById('outH');
const gsDelayInput = document.getElementById('gsDelay');   // 通用設置：毫秒輸入框
const gsApplyBtn = document.getElementById('gsApply');       // 通用設置：設置鈕
const gsTrimInput = document.getElementById('gsTrimStep');    // 通用設置：刪格間隔輸入框
const gsTrimBtn = document.getElementById('gsTrimBtn');       // 通用設置：刪除鈕

let files = [];          // File 物件陣列
let sourceW = 0, sourceH = 0;
let previewUrls = [];     // 每格的 ObjectURL，給 <img> 用
let currentFrame = 0;
let playing = false;
let playTimer = null;
let frameDelays = [];     // 每格延遲 ms，跟 files 平行

// 翻譯小工具：優先走全域 t()（支援 {變數} 全域替換），
// i18n.js 未載入或 key 缺失時退回繁中內建字串，並補做一次佔位符替換
// 注意：不要命名為 t，否則會遮蔽全域 t() 造成 TDZ
function trMsg(key, vars, fallback) {
	let s;
	if (typeof t === 'function') {
		s = t(key, vars);
		if (s === key) s = fallback; // key 缺失時 t() 會直接回傳 key 本身
	} else {
		s = fallback;
	}
	if (vars) {
		for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
	}
	return s;
}

// 記錄最後一次「生成動畫」的結果，供切換語言時重繪警告列與摘要文字
// （這些文字是生成當下用 t() 寫死的，切語言不會自動更新）
let lastApngResult = null;

// 寬高聯動：設一邊自動算另一邊（等比）
outW.addEventListener('input', () => {
	if (sourceW && sourceH && outW.value) outH.value = Math.round(outW.value * sourceH / sourceW);
});
outH.addEventListener('input', () => {
	if (sourceW && sourceH && outH.value) outW.value = Math.round(outH.value * sourceW / sourceH);
});

// 通用設置：把所有影格的延遲一次設成同一個值
// 卡片上的「毫秒」輸入框是 renderTimeline() 產生的，所以改完 frameDelays 之後要重畫一次
function applyGeneralDelay() {
	if (!files.length) {
		status.innerHTML = trMsg('gsNoFrames', null, '尚無影格可設定');
		return;
	}
	const ms = parseInt(gsDelayInput.value, 10);
	// 16ms 以下播放器幾乎看不出動畫，65535 是單格延遲的合理上限
	if (!Number.isFinite(ms) || ms < 16 || ms > 65535) {
		status.innerHTML = trMsg('gsInvalid', null, '請輸入 16～65535 之間的毫秒數');
		return;
	}
	gsDelayInput.value = ms;                    // 去掉 0100 這種前導零
	for (let i = 0; i < files.length; i++) frameDelays[i] = ms;
	renderTimeline();                           // 卡片上的 ms 輸入框全部改成新值
	updatePlaybackInfo();                        // 總時間／平均延遲那行
	status.innerHTML = trMsg('gsDone', {ms}, '已把所有影格的延遲設為 {ms} 毫秒');
}
gsApplyBtn.addEventListener('click', applyGeneralDelay);
// 在輸入框按 Enter 也直接套用，不用特地移滑鼠去點按鈕
gsDelayInput.addEventListener('keydown', e => {
	if (e.key === 'Enter') { e.preventDefault(); applyGeneralDelay(); }
});

// ============================================================
// 按間隔刪格：保留 N 格 → 刪掉 1 格 → 再保留 N 格 → 再刪 1 格
// 例：N=1 第 2、4、6…格被刪（一半）；N=2 第 3、6、9…格被刪
// 為什麼不逐格呼叫 deleteFrame()：那支每次都會 renderList / renderTimeline / showFrame，
// 刪 50 格就要重畫 150 次卡片；這裡先把「要留的清單」算好再一次換掉，只重畫一次。
// ============================================================
function trimFramesByStep() {
	if (!files.length) {
		status.innerHTML = trMsg('gsNoFrames', null, '尚無影格可設定');
		return;
	}
	const step = parseInt(gsTrimInput.value, 10);
	if (!Number.isFinite(step) || step < 1 || step > 99) {
		status.innerHTML = trMsg('gsTrimInvalid', null, '請輸入 1～99 之間的整數');
		return;
	}
	pause();
	const cycle = step + 1;          // 一個循環 = 保留 step 格 + 刪 1 格
	const keepFiles = [], keepUrls = [], keepDelays = [];
	let removed = 0;
	for (let i = 0; i < files.length; i++) {
		// 1 起算的第 cycle、2×cycle… 格就是要刪的那一格
		if ((i + 1) % cycle === 0) {
			URL.revokeObjectURL(previewUrls[i]);
			removed++;
			continue;
		}
		keepFiles.push(files[i]);
		keepUrls.push(previewUrls[i]);
		keepDelays.push(frameDelays[i]);
	}
	gsTrimInput.value = step;        // 去掉 007 這種前導零
	if (removed === 0) {
		// 間隔比影格數還大（例如只有 3 格卻設 5），一格都刪不到，講清楚免得以為壞了
		status.innerHTML = trMsg('gsTrimNone', {step}, '間隔 {step} 格時沒有可刪的影格');
		return;
	}
	files = keepFiles;
	previewUrls = keepUrls;
	frameDelays = keepDelays;
	if (!files.length) {
		enterEmptyState();
		status.innerHTML = trMsg('gsTrimDone', {n: removed, left: 0}, '已刪除 {n} 格，剩下 {left} 格');
		return;
	}
	currentFrame = Math.min(currentFrame, files.length - 1);
	renderList();
	renderTimeline();
	showFrame(currentFrame);
	status.innerHTML = trMsg('gsTrimDone', {n: removed, left: files.length}, '已刪除 {n} 格，剩下 {left} 格');
}
gsTrimBtn.addEventListener('click', trimFramesByStep);
gsTrimInput.addEventListener('keydown', e => {
	if (e.key === 'Enter') { e.preventDefault(); trimFramesByStep(); }
});

// 拖曳上傳
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
	e.preventDefault();
	dropZone.classList.remove('dragover');
	addFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => addFiles(e.target.files));

// 預覽區背景切換：棋盤格 / 純黑
const bgToggle = document.getElementById('bgToggle');
const previewStage = document.getElementById('previewStage');
let bgMode = 'checker';
bgToggle.addEventListener('click', () => {
	bgMode = bgMode === 'checker' ? 'black' : 'checker';
	if (bgMode === 'black') {
		previewStage.style.background = '#000';
		bgToggle.textContent = '黑色';
	} else {
		previewStage.style.background = '';
		bgToggle.textContent = '棋盤格';
	}
});

// ============================================================
// 匯入檔案 —— 依型別分流：一般 PNG / APNG / GIF / WebP
// ============================================================
async function addFiles(list) {
	const unsupported = [];
	for (const f of Array.from(list)) {
		// 有些系統給的 type 是空字串（APNG 也可能給 image/apng），所以副檔名也一起判斷
		const name = f.name || '';
		const isGIF = f.type === 'image/gif' || /\.gif$/i.test(name);
		const isWebP = f.type === 'image/webp' || /\.webp$/i.test(name);
		const isPNG = f.type === 'image/png' || f.type === 'image/apng' || /\.(png|apng)$/i.test(name);
		// 影片（MP4／MOV／WebM）：交給 <video> 解碼後再抽格
		const isVideo = (f.type && f.type.indexOf('video/') === 0) || /\.(mp4|m4v|mov|webm)$/i.test(name);
		if (!isVideo && !isGIF && !isWebP && !isPNG) {
			unsupported.push(name);
			continue;
		}
		try {
			const buf = await f.arrayBuffer();
			if (isVideo) {
				await importVideo(buf, name);
			} else if (isGIF) {
				await importGIF(buf, name);
			} else if (isWebP) {
				await importWebP(buf, name);
			} else if (isAPNG(buf)) {
				await importAPNG(buf, name);
			} else {
				// 一般靜態 PNG，直接當一格
				files.push(f);
			}
		} catch (err) {
			console.error('[匯入] 失敗:', f.name, err);
			if (isVideo) {
				// 影片失敗講清楚原因（多數是 HEVC／AV1，瀏覽器沒有那個解碼器）
				status.innerHTML = trMsg('videoFail', {name}, '{name} 解不開：可能是 HEVC／AV1 編碼或檔案損壞，H.264 的 MP4 一定可以');
			} else {
				unsupported.push(f.name + '（解析錯誤）');
			}
		}
	}
	if (unsupported.length > 0) {
		status.innerHTML = t('unsupported', {list: unsupported.join('、')});
	}
	rebuildPreviews();
}

// ============================================================
// 排序 —— 用 index 陣列重排，同步三個平行陣列
// ============================================================
let currentSort = 'manual';
function sortFrames(mode) {
	currentSort = mode;
	const idx = files.map((_, i) => i);
	if (mode === 'name-asc') {
		idx.sort((a, b) => files[a].name.localeCompare(files[b].name, undefined, {numeric: true}));
	} else if (mode === 'name-desc') {
		idx.sort((a, b) => files[b].name.localeCompare(files[a].name, undefined, {numeric: true}));
	} else if (mode === 'date-new') {
		idx.sort((a, b) => files[b].lastModified - files[a].lastModified);
	} else if (mode === 'date-old') {
		idx.sort((a, b) => files[a].lastModified - files[b].lastModified);
	}
	files = idx.map(i => files[i]);
	previewUrls = idx.map(i => previewUrls[i]);
	frameDelays = idx.map(i => frameDelays[i]);
	renderList();
	renderTimeline();
	if (files.length > 0) showFrame(0);
}

document.querySelectorAll('.sort-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		// 排序列最右邊那顆是「收合影格縮圖」，沒有 data-sort，
		// 不是排序鈕，直接跳過（不然會把 active 狀態清掉又呼叫 sortFrames(undefined)）
		if (!btn.dataset.sort) return;
		document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		sortFrames(btn.dataset.sort);
	});
});

// ============================================================
// 收合／展開影格縮圖（排序列最右邊那顆「隱藏 / 顯示」鈕）
// 為什麼要有：影格一多，下面的「獨立影格設置」會被推到要捲好幾屏才有，
//   收掉縮圖網格後十字鍵跟 X / Y 輸入框就直接在眼前，調偏移量順手很多。
//   只是「看不看得到縮圖」而已，不影響 files / frameDelays / 目前選取的那一格。
// ============================================================
const frameGrid = document.getElementById('frameGrid');
const frameGridToggle = document.getElementById('frameGridToggle');
// 排序列的五顆排序鈕跟著這顆鈕進退：縮圖收起來時，排序鈕也沒有挑格的依據，一起讓位
const sortBar = document.querySelector('.sort-bar');
let frameGridHidden = false; // false = 縮圖展開（預設，跟以前一樣）

function applyFrameGridToggle() {
	if (!frameGrid || !frameGridToggle) return;
	frameGrid.classList.toggle('is-hidden', frameGridHidden);
	if (sortBar) sortBar.classList.toggle('grid-collapsed', frameGridHidden);
	const iconEl = frameGridToggle.querySelector('.cat');
	if (iconEl) {
		// cat-035 是「眼睛閉起來」的貓（隱藏），cat-034 是睜眼（顯示）
		iconEl.classList.toggle('cat-035', !frameGridHidden);
		iconEl.classList.toggle('cat-034', frameGridHidden);
	}
	const labelEl = frameGridToggle.querySelector('[data-i18n]');
	if (labelEl) {
		// data-i18n 也要一起換，否則切換語言時 applyLang 會用舊的 key 把文字蓋回去
		const key = frameGridHidden ? 'showFrames' : 'hideFrames';
		labelEl.setAttribute('data-i18n', key);
		labelEl.textContent = t(key);
	}
}

if (frameGridToggle) {
	frameGridToggle.addEventListener('click', () => {
		frameGridHidden = !frameGridHidden;
		applyFrameGridToggle();
	});
}

// 掃 PNG chunks，看到 acTL 就是 APNG
function isAPNG(buf) {
	const bytes = new Uint8Array(buf);
	let offset = 8; // 跳過 PNG signature，第一個 chunk 的 length 在這
	while (offset < bytes.length) {
		const len = (bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3];
		const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
		if (type === 'acTL') return true;
		if (type === 'IEND') return false;
		offset += 12 + len; // length(4)+type(4)+data(len)+crc(4)
	}
	return false;
}

// 自己讀 fcTL 拿每格 delay，不依賴 UPNG.decode 的欄位
// fcTL data layout: seq_num(4)+w(4)+h(4)+xoff(4)+yoff(4)+delay_num(2)+delay_den(2)+dispose(1)+blend(1)
// delay_num 在 data offset 20，delay_den 在 22
// APNG 規範：delay_den=0 時視為 100（即 1/100 秒）
function readAPNGDelays(buf) {
	const bytes = new Uint8Array(buf);
	const delays = [];
	let offset = 8;
	while (offset < bytes.length) {
		const len = (bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3];
		const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
		if (type === 'fcTL') {
			const ds = offset + 8;
			const dn = (bytes[ds+20]<<8)|bytes[ds+21];
			const dd = (bytes[ds+22]<<8)|bytes[ds+23];
			const den = dd === 0 ? 100 : dd;
			delays.push(Math.round(dn / den * 1000));
		}
		if (type === 'IEND') break;
		offset += 12 + len;
	}
	return delays;
}

// 把 APNG 拆回獨立 PNG 影格
async function importAPNG(buf, originalName) {
	const img = UPNG.decode(buf);
	const w = img.width, h = img.height;
	const n = img.frames.length;
	const delays = readAPNGDelays(buf);
	// UPNG.toRGBA8 回傳可能是 Array of Uint8Array，也可能是平坦大 ArrayBuffer，兩種都處理
	const rgbaResult = UPNG.toRGBA8(img);
	const frameSize = w * h * 4;
	for (let i = 0; i < n; i++) {
		let rgba;
		if (Array.isArray(rgbaResult)) {
			rgba = rgbaResult[i];
		} else {
			rgba = rgbaResult.slice(i * frameSize, (i + 1) * frameSize);
		}
		const canvas = document.createElement('canvas');
		canvas.width = w; canvas.height = h;
		const ctx = canvas.getContext('2d');
		ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
		const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
		const fname = originalName.replace(/\.png$/i, '') + '_' + String(i+1).padStart(3,'0') + '.png';
		files.push(new File([blob], fname, {type: 'image/png'}));
		frameDelays.push(Math.max(16, delays[i] || 100));
	}
	status.innerHTML = t('importedAPNG', {n});
}

// 把 GIF 拆回獨立 PNG 影格
// 重點：GIF 很多格只更新部分區域，必須維護一個累積 canvas，
// 依照 disposal 方式決定要不要清空，不然會跑出斑點雜色
async function importGIF(buf, originalName) {
	const reader = new GifReader(new Uint8Array(buf));
	const w = reader.width, h = reader.height;
	const n = reader.numFrames();
	const canvas = document.createElement('canvas');
	canvas.width = w; canvas.height = h;
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, w, h);
	for (let i = 0; i < n; i++) {
		const info = reader.frameInfo(i);
		// disposal=2：這格播完要還原成背景（透明）
		if (info.disposal === 2) {
			ctx.clearRect(0, 0, w, h);
		}
		const rgba = new Uint8Array(w * h * 4);
		reader.decodeAndBlitFrameRGBA(i, rgba);
		// 先畫到 tmp canvas，再合成到主畫布
		const tmp = document.createElement('canvas');
		tmp.width = w; tmp.height = h;
		tmp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
		ctx.drawImage(tmp, 0, 0);
		const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
		const fname = originalName.replace(/\.gif$/i, '') + '_' + String(i+1).padStart(3,'0') + '.png';
		files.push(new File([blob], fname, {type: 'image/png'}));
		// GIF delay 單位是 1/100 秒，*10 換成 ms；0 的時候預設 100ms
		let delay = info.delay * 10;
		if (delay < 10) delay = 100;
		frameDelays.push(Math.max(16, delay));
	}
	status.innerHTML = t('importedGIF', {n});
}

// 把 WebP 拆成獨立 PNG 影格
// 靜態 WebP ＝ 1 格；動畫 WebP 用 WebCodecs 的 ImageDecoder 逐格解（Chrome / Edge 94+），
// 每格的 duration（微秒）換算成毫秒就是該格延遲，跟 GIF 的 disposal 不同，這裡逐格都是完整畫面。
// 沒有 ImageDecoder 的瀏覽器（Safari、部分 Firefox）退回 createImageBitmap，只能取到第一格。
async function importWebP(buf, originalName) {
	const baseName = originalName.replace(/\.webp$/i, '');
	// 先累積在區域陣列，中途失敗才不會留下半套影格
	const newFiles = [];
	const newDelays = [];

	if (typeof ImageDecoder === 'function') {
		let decoder = null;
		try {
			decoder = new ImageDecoder({ data: buf, type: 'image/webp' });
			await decoder.tracks.ready;
			const track = decoder.tracks.selectedTrack;
			const total = track && track.frameCount ? track.frameCount : 1;
			for (let i = 0; i < total; i++) {
				const result = await decoder.decode({ frameIndex: i });
				const frame = result.image;               // VideoFrame
				const w = frame.displayWidth, h = frame.displayHeight;
				const canvas = document.createElement('canvas');
				canvas.width = w; canvas.height = h;
				canvas.getContext('2d').drawImage(frame, 0, 0);
				// VideoFrame.duration 單位是微秒；單格 WebP 會是 null，就當 100ms
				const delayMs = frame.duration ? Math.round(frame.duration / 1000) : 100;
				frame.close();                            // VideoFrame 一定要 close，不然記憶體不會放
				const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
				newFiles.push(new File([blob], baseName + '_' + String(i+1).padStart(3,'0') + '.png', {type: 'image/png'}));
				newDelays.push(Math.max(16, delayMs));
			}
			decoder.close();
		} catch (err) {
			console.warn('[WebP] ImageDecoder 解不開，改用單格模式', err);
			if (decoder) { try { decoder.close(); } catch (e) { /* 已關閉 */ } }
			newFiles.length = 0;
			newDelays.length = 0;
		}
	}

	if (newFiles.length === 0) {
		// 退回：createImageBitmap 對動畫 WebP 只會給第一格
		const bitmap = await createImageBitmap(new Blob([buf], { type: 'image/webp' }));
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width; canvas.height = bitmap.height;
		canvas.getContext('2d').drawImage(bitmap, 0, 0);
		bitmap.close();
		const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
		newFiles.push(new File([blob], baseName + '_001.png', {type: 'image/png'}));
		newDelays.push(100);
		status.innerHTML = t('importedWebP', {n: 1}) + ' ' + t('webpSingleFrame');
	} else {
		status.innerHTML = t('importedWebP', {n: newFiles.length});
	}

	for (const f of newFiles) files.push(f);
	for (const d of newDelays) frameDelays.push(d);
}

// ============================================================
// 把影片（MP4 / MOV / WebM）抽成獨立 PNG 影格
//
// 為什麼不自己 demux H.264：瀏覽器本來就有解碼器（還會吃到硬解），
//   只要「seek 到某個時間 → drawImage 到 canvas」就能拿到畫面，零依賴；
//   自己拉 mp4box 還要處理 B 幀重排、SPS/PPS，對表情包這種短片完全不划算。
//
// 取幾格（本工具自己的規則，對齊本站的使用情境＝表情包）：
//   1. 取樣率 10fps → 1 秒 10 格、2 秒 20 格，動作看起來夠順、檔案又不會爆
//   2. 夾在 5～20 格：20 是 LINE 動態貼圖的硬上限；少於 5 格 LINE 也不收
//   3. 只取前 4 秒：LINE 規定一支動畫最長 4 秒，超過的部分直接不採
//   4. 每格延遲均分，但總和鎖在「整數秒」（1／2／3／4）——LINE 規定播放時間必須是整數秒，
//      這步是為了讓使用者匯入後不用再手動調一輪（來源若不是整數秒，播放速度會略有差異）
//   5. 取樣畫布長邊上限 512px：20 格 ×512² 的記憶體與編碼時間都還在可接受範圍
// ============================================================
const VIDEO_SAMPLE_FPS = 10;
const VIDEO_MIN_FRAMES = 5;
const VIDEO_MAX_FRAMES = 20;
const VIDEO_MAX_SECONDS = 4;
const VIDEO_MAX_SIDE = 512;

// 等影片 seek 到指定時間：seek 完成才有新畫面可以 drawImage
// （少數檔案的 seeked 事件不會回來，所以補一個 2 秒保險）
function seekVideo(video, t) {
	return new Promise(resolve => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			video.removeEventListener('seeked', finish);
			clearTimeout(timer);
			resolve();
		};
		const timer = setTimeout(finish, 2000);
		video.addEventListener('seeked', finish);
		try {
			video.currentTime = t;
		} catch (e) {
			finish();
		}
	});
}

async function importVideo(buf, originalName) {
	const ext = ((originalName.match(/\.(mp4|m4v|mov|webm)$/i) || [])[1] || 'mp4').toLowerCase();
	const mime = ext === 'webm' ? 'video/webm' : (ext === 'mov' ? 'video/quicktime' : 'video/mp4');
	const baseName = originalName.replace(/\.(mp4|m4v|mov|webm)$/i, '');

	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;
	video.preload = 'auto';
	const url = URL.createObjectURL(new Blob([buf], { type: mime }));
	video.src = url;

	try {
		// 等 metadata：長度與寬高都從這裡拿；8 秒還沒回應就當這台瀏覽器不吃這個編碼
		await new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('metadata timeout')), 8000);
			video.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
			video.onerror = () => { clearTimeout(timer); reject(new Error('video decode error')); };
		});

		const vw = video.videoWidth;
		const vh = video.videoHeight;
		if (!vw || !vh) throw new Error('no video size');
		if (!isFinite(video.duration) || video.duration <= 0) throw new Error('unknown duration');

		const span = Math.min(video.duration, VIDEO_MAX_SECONDS);           // 只取前 4 秒
		const count = Math.min(VIDEO_MAX_FRAMES,
			Math.max(VIDEO_MIN_FRAMES, Math.round(span * VIDEO_SAMPLE_FPS)));  // 5～20 格
		const totalSec = Math.min(VIDEO_MAX_SECONDS, Math.max(1, Math.round(span)));

		// 取樣畫布：長邊最多 512，等比
		const scale = Math.min(1, VIDEO_MAX_SIDE / Math.max(vw, vh));
		const cw = Math.max(1, Math.round(vw * scale));
		const ch = Math.max(1, Math.round(vh * scale));
		const canvas = document.createElement('canvas');
		canvas.width = cw;
		canvas.height = ch;
		const ctx = canvas.getContext('2d');

		// 均分延遲，尾數補在前幾格 → 總和剛好等於 totalSec × 1000
		const totalMs = totalSec * 1000;
		const baseMs = Math.floor(totalMs / count);
		const extra = totalMs - baseMs * count;

		const newFiles = [];
		const newDelays = [];
		for (let i = 0; i < count; i++) {
			status.innerHTML = trMsg('importingVideo', {done: i + 1, total: count}, '解析影片中…{done}/{total}');
			// 取每格時間區間的中點：0 秒常常是黑場／轉場，抓中點比較穩
			const t = Math.min(Math.max(0, span - 0.001), (i + 0.5) * (span / count));
			await seekVideo(video, t);
			ctx.clearRect(0, 0, cw, ch);
			ctx.drawImage(video, 0, 0, cw, ch);
			const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
			newFiles.push(new File([blob], baseName + '_' + String(i + 1).padStart(3, '0') + '.png', {type: 'image/png'}));
			newDelays.push(baseMs + (i < extra ? 1 : 0));
		}

		// 先全部解完才寫進全域陣列：中途失敗不會留下半套影格
		for (const f of newFiles) files.push(f);
		for (const d of newDelays) frameDelays.push(d);
		status.innerHTML = trMsg('importedVideo', {n: newFiles.length, sec: totalSec}, '已從影片取出 {n} 格（總長 {sec} 秒）');
	} finally {
		URL.revokeObjectURL(url);
		video.removeAttribute('src');
		try { video.load(); } catch (e) { /* 已經沒有 src，忽略 */ }
	}
}

// 重新產生所有預覽 URL 並刷新 UI
function rebuildPreviews() {
	gsApplyBtn.disabled = files.length === 0;   // 沒有影格時「設置」鈕不給按
	gsTrimBtn.disabled = files.length === 0;    // 沒有影格時「刪除」鈕也不給按
	previewUrls.forEach(u => URL.revokeObjectURL(u));
	previewUrls = files.map(f => URL.createObjectURL(f));
	// 補齊 frameDelays：新加入的圖片預設 100ms
	while (frameDelays.length < files.length) {
		frameDelays.push(100);
	}
	currentFrame = 0;
	renderList();
	renderTimeline();
	if (files.length > 0) {
		showFrame(0);
		detectFirstImageSize();
		document.querySelector('.preview-area').style.display = 'block';
		document.getElementById('fileListGroup').style.display = 'block';
	} else {
		previewImg.style.display = 'none';
		previewInfo.textContent = '';
		if (window.SourceFrame) window.SourceFrame.hide(previewStage);
		document.querySelector('.preview-area').style.display = 'none';
		document.getElementById('fileListGroup').style.display = 'none';
		updatePlaybackInfo();
	}
}

// 讀取第一張圖片的原始尺寸，自動填入輸出寬高欄位
async function detectFirstImageSize() {
	if (files.length === 0) {
		sourceW = sourceH = 0;
		outW.value = '';
		outH.value = '';
		return;
	}
	try {
		const bitmap = await createImageBitmap(files[0]);
		sourceW = bitmap.width;
		sourceH = bitmap.height;
		outW.value = sourceW;
		outH.value = sourceH;
		// 尺寸量到了，綠色外框要用「第一張的原始尺寸」重算一次
		// （第一次上傳時 showFrame 跑得比這裡早，當下還不知道 sourceW / sourceH）
		drawSourceFrame();
	} catch (e) { console.warn(e); }
}

// 渲染左側檔案清單（檔名 + 大小）
function renderList() {
	fileList.innerHTML = files.map((f, i) =>
		`<div><span>${i+1}. ${f.name}</span><span>${(f.size/1024).toFixed(1)} KB</span></div>`
	).join('');
	makeBtn.disabled = files.length < 2; // 至少要 2 格才能動
}

// 同時渲染上面的 timeline 小列和下面的 frameGrid 卡片
function renderTimeline() {
	timeline.innerHTML = '';
	previewUrls.forEach((url, i) => {
		const div = document.createElement('div');
		div.className = 'timeline-item' + (i === currentFrame ? ' active' : '');
		div.innerHTML = `<img src="${url}"><div class="num">${i+1}</div>`;
		div.addEventListener('click', () => showFrame(i));
		timeline.appendChild(div);
	});

	const grid = document.getElementById('frameGrid');
	if (!grid) return;
	grid.innerHTML = '';
	files.forEach((file, i) => {
		const card = document.createElement('div');
		card.className = 'frame-card' + (i === currentFrame ? ' active' : '');
		card.innerHTML = `
			<div class="frame-num">${i + 1}</div>
			<button class="frame-del" title="${t('deleteFrame')}"><small class="cat cat-1x5 cat-017 cat-color02"></small></button>
			<img class="frame-thumb" src="${previewUrls[i]}">
			<div class="frame-name">${file.name}</div>
			<div class="frame-ms">
				<input type="number" class="frame-delay-input" value="${frameDelays[i] || 100}" min="16" step="1">
				<span>ms</span>
			</div>
			<div class="frame-nav">
				<button class="nav-mini nav-first" title="${t('firstFrame')}"><small class="cat cat-086"></small></button>
				<button class="nav-mini nav-prev" title="${t('prevFrame')}"><small class="cat cat-082"></small></button>
				<button class="nav-mini nav-dup" title="${t('dupFrame')}"><small class="cat cat-247"></small></button>
				<button class="nav-mini nav-next" title="${t('nextFrame')}"><small class="cat cat-083"></small></button>
				<button class="nav-mini nav-last" title="${t('lastFrame')}"><small class="cat cat-087"></small></button>
			</div>
		`;
		// 卡片底部 5 顆鈕：到最前 / 前一格 / 複製這格插在後面 / 後一格 / 到最後
		// 用 class 抓按鈕而不是陣列索引，以後中間再插一顆也不會把位置整個錯開
		card.querySelector('.nav-first').addEventListener('click', (e) => { e.stopPropagation(); if (i === 0) return; moveFrame(i, 0); });
		card.querySelector('.nav-prev').addEventListener('click', (e) => { e.stopPropagation(); if (i === 0) return; swapFrames(i, i - 1); });
		card.querySelector('.nav-dup').addEventListener('click', (e) => { e.stopPropagation(); duplicateFrame(i); });
		card.querySelector('.nav-next').addEventListener('click', (e) => { e.stopPropagation(); if (i === files.length - 1) return; swapFrames(i, i + 1); });
		card.querySelector('.nav-last').addEventListener('click', (e) => { e.stopPropagation(); if (i === files.length - 1) return; moveFrame(i, files.length - 1); });
		// 每格延遲即時輸入
		const delayInput = card.querySelector('.frame-delay-input');
		delayInput.addEventListener('input', (e) => {
			e.stopPropagation();
			frameDelays[i] = Math.max(16, parseInt(e.target.value) || 100);
			updatePlaybackInfo();
		});
		delayInput.addEventListener('click', (e) => e.stopPropagation());
		// 刪除這格
		card.querySelector('.frame-del').addEventListener('click', (e) => {
			e.stopPropagation();
			deleteFrame(i);
		});
		// 點卡片其他地方 = 選取這格
		card.addEventListener('click', (e) => {
			if (e.target.classList.contains('frame-del')) return;
			if (e.target.closest('.frame-nav')) return;
			if (e.target.classList.contains('frame-delay-input')) return;
			showFrame(i);
		});
		grid.appendChild(card);
	});
}

// 交換兩格（連 files / previewUrls / frameDelays 一起換）
function swapFrames(a, b) {
	[files[a], files[b]] = [files[b], files[a]];
	[previewUrls[a], previewUrls[b]] = [previewUrls[b], previewUrls[a]];
	[frameDelays[a], frameDelays[b]] = [frameDelays[b], frameDelays[a]];
	renderList();
	renderTimeline();
	showFrame(b);
}

// 把第 from 格移到第 to 格（連 files / previewUrls / frameDelays 一起搬）
function moveFrame(from, to) {
	const f = files.splice(from, 1)[0];
	const u = previewUrls.splice(from, 1)[0];
	const d = frameDelays.splice(from, 1)[0];
	files.splice(to, 0, f);
	previewUrls.splice(to, 0, u);
	frameDelays.splice(to, 0, d);
	renderList();
	renderTimeline();
	showFrame(to);
}

// 複製第 i 格，把副本插在它「後面」一格（圖片內容與延遲時間都照抄）
function duplicateFrame(i) {
	pause();                 // 複製途中影格陣列會變長，先暫停播放免得播到一半索引對不上
	const src = files[i];
	if (!src) return;

	// 用同一個 Blob 內容重新包成一個 File：檔名、MIME 原樣帶過去，
	// 這樣 apng-encoder.js 後面那套流程完全不用為「複製出來的格」另開分支。
	// （File 建構子的第一個參數吃 Blob，直接丟 File 進去也可以）
	const copy = new File([src], src.name, { type: src.type || 'image/png' });

	// 副本要繼承原本那格的「位移記錄」（原始圖與 dx / dy），
	// 否則副本按「恢復初始狀態」會還原成位移後的樣子，跟原本那格對不上
	if (typeof window.inheritFrameMeta === 'function') window.inheritFrameMeta(src, copy);

	files.splice(i + 1, 0, copy);
	previewUrls.splice(i + 1, 0, URL.createObjectURL(copy));
	frameDelays.splice(i + 1, 0, frameDelays[i] || 100);

	renderList();
	renderTimeline();
	showFrame(i + 1);        // 跳到剛複製出來的那格，讓使用者一眼看到結果
}

// 影格清空後的收尾（最後一格被刪掉時用）：把預覽、清單、按鈕、綠框一起收起來。
// deleteFrame() 與 trimFramesByStep() 都用得到，抽成一支避免兩邊各寫一份而走鐘
function enterEmptyState() {
	previewImg.style.display = 'none';
	previewInfo.textContent = '';
	document.getElementById('fileListGroup').style.display = 'none';
	document.querySelector('.preview-area').style.display = 'none';
	makeBtn.disabled = true;
	gsApplyBtn.disabled = true;      // 沒有影格時「設置」鈕也不能按
	gsTrimBtn.disabled = true;       // 「刪除」鈕同理
	updatePlaybackInfo();
	// 影格全刪光了，獨立影格設置面板也要跟著收起來（它不會經過 showFrame）
	if (typeof window.refreshFrameOffsetPanel === 'function') window.refreshFrameOffsetPanel();
	// 沒有影格就沒有原圖，綠色外框一起收掉
	if (window.SourceFrame) window.SourceFrame.hide(previewStage);
}

// 刪除第 i 格，同步調整 currentFrame 位置
function deleteFrame(i) {
	pause();
	URL.revokeObjectURL(previewUrls[i]);
	files.splice(i, 1);
	previewUrls.splice(i, 1);
	frameDelays.splice(i, 1);
	if (files.length === 0) {
		enterEmptyState();
		return;
	}
	// 刪完後要把 currentFrame 調整到合理位置
	if (currentFrame >= files.length) currentFrame = files.length - 1;
	else if (i < currentFrame) currentFrame--;
	renderList();
	renderTimeline();
	showFrame(currentFrame);
}

// 切換到第 i 格預覽，同步高亮時間軸和卡片
function showFrame(i) {
	if (previewUrls.length === 0) return;
	currentFrame = i;
	// 換格就代表回到「原圖預覽」，把成品標記拿掉，文字疊層才會重新畫出來
	delete previewImg.dataset.baked;
	previewImg.src = previewUrls[i];
	previewImg.style.display = 'block';
	previewInfo.textContent = `Frame: ${i+1} / ${previewUrls.length}`;
	// 同步高亮 timeline 和 frameGrid 的目前格
	document.querySelectorAll('.frame-card').forEach((el, idx) => el.classList.toggle('active', idx === i));
	document.querySelectorAll('.timeline-item').forEach((el, idx) => el.classList.toggle('active', idx === i));
	updatePlaybackInfo();
	// 獨立影格設置面板（js/frame-offset.js）也要跟著換成目前這一格；
	// 該檔不一定存在，所以先用 typeof 判斷再呼叫
	if (typeof window.refreshFrameOffsetPanel === 'function') window.refreshFrameOffsetPanel();
	// 綠色原圖外框：換格時重畫（框固定吃第一張圖的尺寸，所以不會跟著這格一起跳）
	drawSourceFrame();
}

// ============================================================
// 綠色原圖外框（js/source-frame.js）
// 為什麼框要用「第一張圖」的尺寸，而不是目前這一格的尺寸：
//   多格匯入時每格可能大小不同，frame-offset.js 又會把位移烘焙進圖片，
//   如果框貼著每格自己的邊界跑，換格時框也一起變，就看不出「這格比第一張大多少」。
//   框固定吃第一張的原始尺寸，圖片貼齊框＝與第一張等大，超出框＝比第一張大。
// ============================================================
function drawSourceFrame() {
	if (window.SourceFrame) {
		if (previewImg.style.display === 'none' || previewUrls.length === 0) {
			window.SourceFrame.hide(previewStage);
		} else {
			window.SourceFrame.aroundFirstSize(previewStage, previewImg, sourceW, sourceH);
		}
	}
	// 文字疊層跟綠色外框吃同一個時機：換格、圖片載入完、視窗縮放都會走到這裡，
	// 兩層都靠量「目標元素的實際矩形」定位，所以在這裡一起重畫最省事
	paintTextOverlay();
}

// ============================================================
// 文字疊層（js/text-overlay.js）
// APNG 頁只是「預覽時疊上去」，真正燒進輸出是 apng-encoder.js 那邊的事；
// 這裡的狀態也只屬於 APNG 頁，FX / PNG 各自 mount 自己那一份
// ============================================================
let appText = null;
(function mountAppTextPanel() {
	const host = document.getElementById('textHostApp');
	if (!host || !window.TextOverlay) return;
	appText = window.TextOverlay.mount(host, {
		prefix: 'app',
		onChange: appTextChanged
	});
})();

function paintTextOverlay() {
	if (!window.TextOverlay) return;
	// 預覽上放的是「已烤好字的成品 APNG」（apng-encoder.js 生成時打的標記）：
	// 字已經在畫面裡了，再疊一層只會變雙影，而且那層是靜止的，會蓋掉正在淡入淡出的成品
	if (previewImg.dataset.baked === '1') {
		window.TextOverlay.paintOverlay(previewStage, previewImg, null);
		return;
	}
	const st = appText ? appText.state : null;
	// 沒有影格（或預覽是收起來的）就把疊層藏起來，免得字浮在空白舞台上
	if (!st || previewUrls.length === 0 || previewImg.style.display === 'none') {
		window.TextOverlay.paintOverlay(previewStage, previewImg, null);
		return;
	}
	// 現在是第幾格也要一併傳，否則「只顯示第 3～8 格」在預覽上不會生效
	window.TextOverlay.paintOverlay(previewStage, previewImg, st, currentFrame + 1, previewUrls.length);
}

// ============================================================
// 文字面板有任何改動時走這裡：如果預覽正停在「已烤好字的成品」，
// 先切回原圖那一格，否則新字永遠看不到（改完字要能立刻看到效果）
// ============================================================
function appTextChanged() {
	if (previewImg.dataset.baked === '1') {
		delete previewImg.dataset.baked;
		if (previewUrls.length > 0) { showFrame(currentFrame); return; }
	}
	paintTextOverlay();
}

// 圖片載入完成才知道 naturalWidth（第一次上傳時 sourceW 還是 0，必須等這裡重畫）
previewImg.addEventListener('load', drawSourceFrame);
// 視窗尺寸改變 → CSS 的 max-width / max-height 會改變顯示比例，框要跟著重算
window.addEventListener('resize', drawSourceFrame);

// 右上角資訊列：FPS + 單次循環總時間
function updatePlaybackInfo() {
	const posEl = document.getElementById('framePosText');
	const timeEl = document.getElementById('totalTimeText');
	if (!posEl || !timeEl) return;
	const totalMs = frameDelays.reduce((sum, d) => sum + (d || 100), 0);
	const totalSec = totalMs / 1000;
	const fps = totalSec > 0 ? (previewUrls.length / totalSec).toFixed(1) : '0.0';
	posEl.textContent = t('fps', {fps});
	const m = Math.floor(totalSec / 60);
	const s = Math.floor(totalSec % 60);
	const ms = Math.round((totalSec % 1) * 100);
	timeEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
}

// ============================================================
// 播放控制 —— 用 setTimeout 遞迴，每格等自己的 delay
// ============================================================
function togglePlay() {
	if (previewUrls.length < 2) return;
	if (playing) {
		pause();
	} else {
		playing = true;
		playBtn.classList.add('playing');
		playBtn.innerHTML = '<small class="cat cat-080 cat-2x cat-color03"></small>';
		tick();
	}
}
function tick() {
	if (!playing) return;
	const delay = frameDelays[currentFrame] || 100;
	playTimer = setTimeout(() => {
		showFrame((currentFrame + 1) % previewUrls.length);
		tick();
	}, delay);
}
function pause() {
	playing = false;
	playBtn.classList.remove('playing');
	playBtn.innerHTML = '<small class="cat cat-083 cat-2x cat-color03"></small>';
	if (playTimer) clearTimeout(playTimer);
}
playBtn.addEventListener('click', togglePlay);

// ============================================================
// 播放期間「任何操作都要先停播」
// 使用者在畫面上任何地方一動手（點按鈕、拖滑桿、打字、貼上、滾輪、切換頁籤）就先 pause()，
// 免得動畫還在跑、畫面又被他剛做的改動改掉，兩邊互相打架。
// 用捕獲階段（第三個參數 true）是為了比各按鈕自己的 click 更早執行。
// 掛在 document 而不是只掛 APNG 頁，是因為切到 FX／PNG 頁時預覽已經看不見，
// 動畫卻還在背景跑（回來時又從中途接著播），這種情況也該一起停。
// 播放鈕本身例外：它就是「播放↔暫停」的開關，交給 togglePlay() 判斷。
// ============================================================
(function stopPlaybackOnAnyAction() {
	['pointerdown', 'keydown', 'input', 'wheel'].forEach(function (type) {
		document.addEventListener(type, function (e) {
			if (!playing) return;
			if (e.target && playBtn.contains(e.target)) return;  // 播放鈕自己處理
			pause();
		}, true);
	});
})();
prevBtn.addEventListener('click', () => { pause(); showFrame((currentFrame - 1 + previewUrls.length) % previewUrls.length); });
nextBtn.addEventListener('click', () => { pause(); showFrame((currentFrame + 1) % previewUrls.length); });
document.getElementById('firstBtn').addEventListener('click', () => { pause(); showFrame(0); });
document.getElementById('lastBtn').addEventListener('click', () => { pause(); showFrame(previewUrls.length - 1); });

// 清空全部
// 抽成具名函式：FX 頁按「送到 APNG 頁」時要先清空舊影格再匯入
function clearAll() {
	pause();
	files = [];
	previewUrls.forEach(u => URL.revokeObjectURL(u));
	previewUrls = [];
	frameDelays = [];
	currentFrame = 0;
	sourceW = sourceH = 0;
	outW.value = '';
	outH.value = '';
	renderList();
	renderTimeline();
	previewImg.style.display = 'none';
	previewInfo.textContent = t('previewEmpty');
	// 影格清空就沒有「原圖」了，綠色外框也要一起收起來
	if (window.SourceFrame) window.SourceFrame.hide(previewStage);
	downloadLink.style.display = 'none';
	document.getElementById('downloadGifLink').style.display = 'none';
	document.getElementById('downloadWebpLink').style.display = 'none';
	document.getElementById('shareLink').style.display = 'none';
	status.innerHTML = '';
	fileInfo.textContent = '';
	document.getElementById('lineStickerWarnings').innerHTML = '';
	lastApngResult = null; // 清空後不保留結果，切換語言才不會把舊文字重繪回來
	document.querySelector('.preview-area').style.display = 'none';
	document.getElementById('fileListGroup').style.display = 'none';
	// 縮圖區回到預設展開：不然清空後再匯入新圖，影格卡會一整個看不到
	frameGridHidden = false;
	applyFrameGridToggle();
}

clearBtn.addEventListener('click', () => clearAll());
