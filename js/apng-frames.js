/**
 * 蛋殼喵 APNG 工具 — 影格管理
 * 檔案匯入 / APNG-GIF 拆格 / 排序 / 時間軸與卡片渲染 / 播放控制 / 清空
 * @author [DaiEn]
 * @Date: 2026-11-11
 * @Correction: 1
 *
 * 由原 apng.js 第 362~857 行原封不動切出，未改動任何邏輯
 * 注意：本檔包含全域狀態（files / previewUrls / frameDelays 等）與 DOM 節點宣告，
 *       必須在 apng-encoder.js、png-editor.js 之前載入
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
// 匯入檔案 —— 依型別分流：一般 PNG / APNG / GIF
// ============================================================
async function addFiles(list) {
	const unsupported = [];
	for (const f of Array.from(list)) {
		try {
			if (f.type !== 'image/png' && f.type !== 'image/gif') {
				unsupported.push(f.name);
				continue;
			}
			const buf = await f.arrayBuffer();
			if (f.type === 'image/gif') {
				await importGIF(buf, f.name);
			} else if (isAPNG(buf)) {
				await importAPNG(buf, f.name);
			} else {
				// 一般靜態 PNG，直接當一格
				files.push(f);
			}
		} catch (err) {
			console.error('[匯入] 失敗:', f.name, err);
			unsupported.push(f.name + '（解析錯誤）');
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
		document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		sortFrames(btn.dataset.sort);
	});
});

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

// 重新產生所有預覽 URL 並刷新 UI
function rebuildPreviews() {
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
				<span class="frame-nav-info"></span>
				<button class="nav-mini nav-next" title="${t('nextFrame')}"><small class="cat cat-083"></small></button>
				<button class="nav-mini nav-last" title="${t('lastFrame')}"><small class="cat cat-087"></small></button>
			</div>
		`;
		// 卡片底部 4 顆導航鈕：到最前 / 前一格 / 後一格 / 到最後
		const navBtns = card.querySelectorAll('.frame-nav button');
		navBtns[0].addEventListener('click', (e) => { e.stopPropagation(); if (i === 0) return; moveFrame(i, 0); });
		navBtns[1].addEventListener('click', (e) => { e.stopPropagation(); if (i === 0) return; swapFrames(i, i - 1); });
		navBtns[2].addEventListener('click', (e) => { e.stopPropagation(); if (i === files.length - 1) return; swapFrames(i, i + 1); });
		navBtns[3].addEventListener('click', (e) => { e.stopPropagation(); if (i === files.length - 1) return; moveFrame(i, files.length - 1); });
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

// 刪除第 i 格，同步調整 currentFrame 位置
function deleteFrame(i) {
	pause();
	URL.revokeObjectURL(previewUrls[i]);
	files.splice(i, 1);
	previewUrls.splice(i, 1);
	frameDelays.splice(i, 1);
	if (files.length === 0) {
		previewImg.style.display = 'none';
		previewInfo.textContent = '';
		document.getElementById('fileListGroup').style.display = 'none';
		document.querySelector('.preview-area').style.display = 'none';
		makeBtn.disabled = true;
		updatePlaybackInfo();
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
	previewImg.src = previewUrls[i];
	previewImg.style.display = 'block';
	previewInfo.textContent = `Frame: ${i+1} / ${previewUrls.length}`;
	// 同步高亮 timeline 和 frameGrid 的目前格
	document.querySelectorAll('.frame-card').forEach((el, idx) => el.classList.toggle('active', idx === i));
	document.querySelectorAll('.timeline-item').forEach((el, idx) => el.classList.toggle('active', idx === i));
	updatePlaybackInfo();
}

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
prevBtn.addEventListener('click', () => { pause(); showFrame((currentFrame - 1 + previewUrls.length) % previewUrls.length); });
nextBtn.addEventListener('click', () => { pause(); showFrame((currentFrame + 1) % previewUrls.length); });
document.getElementById('firstBtn').addEventListener('click', () => { pause(); showFrame(0); });
document.getElementById('lastBtn').addEventListener('click', () => { pause(); showFrame(previewUrls.length - 1); });

// 清空全部
clearBtn.addEventListener('click', () => {
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
	downloadLink.style.display = 'none';
	document.getElementById('downloadGifLink').style.display = 'none';
	document.getElementById('shareLink').style.display = 'none';
	status.innerHTML = '';
	fileInfo.textContent = '';
	document.getElementById('lineStickerWarnings').innerHTML = '';
	lastApngResult = null; // 清空後不保留結果，切換語言才不會把舊文字重繪回來
	document.querySelector('.preview-area').style.display = 'none';
	document.getElementById('fileListGroup').style.display = 'none';
});
