/*
	@author: DaiEn
	@Date: 2026-11-05
	@Correction: 14
	蛋殼喵 APNG 工具 — 前端邏輯
	圖片完全在瀏覽器本機處理，不上傳伺服器
*/

// ============================================================
// Tab 切換：四個分頁，按 data-tab 對應 panel id
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
		document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
		btn.classList.add('active');
		document.getElementById(btn.dataset.tab).classList.add('active');
	});
});

// ============================================================
// README tab：fetch 同層 README.md，用 marked.js 渲染成 HTML
// 這樣改 README.md 不用動 HTML
// ============================================================
fetch('README.md')
	.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
	.then(md => {
		document.getElementById('readmeContent').innerHTML = marked.parse(md);
	})
	.catch(err => {
		document.getElementById('readmeContent').innerHTML =
			'<p style="color:#c06078">⚠ 無法載入 README.md：' + err.message + '</p>';
	});

// ============================================================
// PNG CRC32 —— UPNG.encode 出來的 APNG 不會設 num_plays，
// 所以我們要自己改 acTL chunk，改完記得重算 CRC，不然瀏覽器不認
// ============================================================
const crcTable = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) {
			c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
		}
		table[i] = c >>> 0;
	}
	return table;
})();
function crc32(bytes) {
	let crc = 0xFFFFFFFF;
	for (let i = 0; i < bytes.length; i++) {
		crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
	}
	return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 掃 PNG chunks 找到 acTL，把 num_plays 寫進去（offset+12 開始 4 bytes）
// loops=0 就是無限循環，跟 APNG 規格一致
function setApngLoops(buffer, loops) {
	const bytes = new Uint8Array(buffer);
	let offset = 8;
	while (offset < bytes.length) {
		const length = (bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3];
		const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
		if (type === 'acTL') {
			bytes[offset+12] = (loops >>> 24) & 0xFF;
			bytes[offset+13] = (loops >>> 16) & 0xFF;
			bytes[offset+14] = (loops >>> 8) & 0xFF;
			bytes[offset+15] = loops & 0xFF;
			// CRC 要涵蓋 type + data（不含 length 和 CRC 本身）
			const crc = crc32(bytes.subarray(offset+4, offset+8+length));
			const crcPos = offset + 8 + length;
			bytes[crcPos]   = (crc >>> 24) & 0xFF;
			bytes[crcPos+1] = (crc >>> 16) & 0xFF;
			bytes[crcPos+2] = (crc >>> 8) & 0xFF;
			bytes[crcPos+3] = crc & 0xFF;
			return bytes.buffer;
		}
		offset += 12 + length;
	}
	throw new Error('找不到 acTL chunk');
}

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
		status.textContent = `⚠ 不支援的檔案：${unsupported.join('、')}（只接受 PNG / APNG / GIF）`;
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
	status.textContent = `已匯入 APNG：${n} 格`;
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
	status.textContent = `已匯入 GIF：${n} 格`;
}

// 重新產生所有預覽 URL 並刷新 UI
function rebuildPreviews() {
	previewUrls.forEach(u => URL.revokeObjectURL(u));
	previewUrls = files.map(f => URL.createObjectURL(f));
	if (frameDelays.length === 0) {
		frameDelays = files.map(() => 100); // 預設 100ms
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
			<button class="frame-del" title="移除">✕</button>
			<img class="frame-thumb" src="${previewUrls[i]}">
			<div class="frame-name">${file.name}</div>
			<div class="frame-ms">
				<input type="number" class="frame-delay-input" value="${frameDelays[i] || 100}" min="16" step="1">
				<span>ms</span>
			</div>
			<div class="frame-nav">
				<button class="nav-mini nav-first" title="移到最前"></button>
				<button class="nav-mini nav-prev" title="往前一格"></button>
				<span class="frame-nav-info"></span>
				<button class="nav-mini nav-next" title="往後一格"></button>
				<button class="nav-mini nav-last" title="移到最後"></button>
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
	posEl.textContent = `FPS: ${fps}`;
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
	previewInfo.textContent = '尚無圖片';
	downloadLink.style.display = 'none';
	status.textContent = '';
	fileInfo.textContent = '';
	document.querySelector('.preview-area').style.display = 'none';
	document.getElementById('fileListGroup').style.display = 'none';
});

// ============================================================
// 產生 APNG
// ============================================================
makeBtn.addEventListener('click', async () => {
	pause();
	makeBtn.disabled = true;
	status.textContent = '處理中...';
	try {
		const loops = parseInt(document.getElementById('loops').value) || 0;
		const cnum = parseInt(document.getElementById('cnum').value);

		// 先讀第一張的尺寸當基準
		const frames = [];
		let srcW = 0, srcH = 0;
		for (const f of files) {
			const bitmap = await createImageBitmap(f);
			srcW = bitmap.width; srcH = bitmap.height;
			break;
		}
		sourceW = srcW; sourceH = srcH;

		// 輸出尺寸：留空 = 原圖；設一邊自動算另一邊
		let targetW = parseInt(outW.value) || srcW;
		let targetH = parseInt(outH.value) || srcH;
		if (outW.value && !outH.value) targetH = Math.round(srcH * targetW / srcW);
		if (outH.value && !outW.value) targetW = Math.round(srcW * targetH / srcH);

		// 每張圖縮放後取 RGBA，丟給 UPNG.encode
		for (const f of files) {
			const bitmap = await createImageBitmap(f);
			if (bitmap.width !== srcW || bitmap.height !== srcH) {
				throw new Error(`「${f.name}」尺寸 ${bitmap.width}x${bitmap.height} 跟第一張 ${srcW}x${srcH} 不同`);
			}
			const canvas = document.createElement('canvas');
			canvas.width = targetW; canvas.height = targetH;
			const ctx = canvas.getContext('2d');
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(bitmap, 0, 0, targetW, targetH);
			const data = ctx.getImageData(0, 0, targetW, targetH).data;
			frames.push(new Uint8Array(data).buffer);
		}
		const w = targetW, h = targetH;
		const dels = frameDelays.slice(0, frames.length);

		status.textContent = '正在編碼 APNG...';
		let buf = UPNG.encode(frames, w, h, cnum, dels);
		// UPNG 不支援 loops，自己事後改 acTL
		if (loops > 0) buf = setApngLoops(buf, loops);

		const blob = new Blob([buf], {type: 'image/apng'});
		const url = URL.createObjectURL(blob);
		previewImg.src = url;
		previewInfo.textContent = `APNG 預覽 · ${frames.length} 格`;
		downloadLink.href = url;
		downloadLink.download = 'animation.png';
		downloadLink.style.display = 'inline-block';

		// 算一下總時間顯示給使用者看
		const loopMs = dels.reduce((a, b) => a + b, 0);
		const loopSec = (loopMs / 1000).toFixed(2);
		let loopInfo = `單次循環 ${loopSec} 秒`;
		if (loops > 0) {
			loopInfo += ` · 共播 ${loops} 次 = ${(loopMs * loops / 1000).toFixed(2)} 秒`;
		} else {
			loopInfo += ` · 無限循環`;
		}
		fileInfo.textContent = `尺寸 ${w}x${h} · ${frames.length} 影格 · ${loopInfo} · 檔案 ${(blob.size/1024).toFixed(1)} KB`;
		status.textContent = `✅ 完成！共 ${frames.length} 影格`;
	} catch (err) {
		status.textContent = `❌ 錯誤：${err.message}`;
		console.error(err);
	} finally {
		makeBtn.disabled = false;
	}
});
