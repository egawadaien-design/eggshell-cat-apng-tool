/*
	@author: DaiEn
	@Date: 2026-11-05
	@Correction: 51
	蛋殼喵 APNG 工具 — 前端邏輯
	圖片完全在瀏覽器本機處理，不上傳伺服器
*/

// ============================================================
// Tab 切換：分頁，按 data-tab 對應 panel id
// ============================================================
// 切換 tab 並記住目前頁面（重新整理後保留）
function switchTab(target) {
	document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
	document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
	document.querySelectorAll(`[data-tab="${target}"]`).forEach(b => b.classList.add('active'));
	document.getElementById(target).classList.add('active');
	localStorage.setItem('eggshellcat-tab', target);
}

// 所有帶 data-tab 的元素（上方 tab-btn + 底部 footer-github 等）
document.querySelectorAll('[data-tab]').forEach(btn => {
	btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// 頁面載入時恢復上次的 tab
(function restoreTab() {
	const saved = localStorage.getItem('eggshellcat-tab');
	if (saved && document.getElementById(saved)) {
		switchTab(saved);
	}
})();

// ============================================================
// Meme 頁面：動態載入 sample/list.json，生成圖片卡片
// 點擊圖片重新播放一次 APNG 循環
// ============================================================
// 解析 APNG / GIF 的中繼資訊（尺寸、格數、循環時間、檔案大小）
async function parseAnimationMeta(url) {
	const resp = await fetch(url);
	const blob = await resp.blob();
	const buf = await blob.arrayBuffer();
	const dv = new DataView(buf);
	const bytes = new Uint8Array(buf);

	const meta = {
		width: 0, height: 0,
		frames: 0, durationMs: 0,
		size: blob.size
	};

	// 判斷格式：PNG signature 89 50 4E 47
	const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
	const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;

	if (isPNG) {
		// 從 offset 8 開始掃 chunks
		let off = 8;
		while (off < bytes.length - 8) {
			const len = dv.getUint32(off);
			const type = String.fromCharCode(bytes[off+4], bytes[off+5], bytes[off+6], bytes[off+7]);
			const dataOff = off + 8;
			if (type === 'IHDR') {
				meta.width = dv.getUint32(dataOff);
				meta.height = dv.getUint32(dataOff + 4);
			} else if (type === 'acTL') {
				meta.frames = dv.getUint32(dataOff);
			} else if (type === 'fcTL') {
				const num = dv.getUint16(dataOff + 20);
				const den = dv.getUint16(dataOff + 22);
				meta.durationMs += den === 0 ? num * 10 : (num / den) * 1000;
			}
			off += 12 + len; // len(4) + type(4) + data + crc(4)
		}
	} else if (isGIF) {
		// Logical Screen Descriptor: offset 6, width(2) + height(2)
		meta.width = dv.getUint16(6, true);
		meta.height = dv.getUint16(8, true);
		// 掃描 blocks，找 Graphic Control Extension (0x21 0xF9)
		let off = 13; // 跳過 LSD + global color table flag
		while (off < bytes.length) {
			if (bytes[off] === 0x21 && bytes[off+1] === 0xF9) {
				// GCE: 0x21 F9 size(1=4) ... delay(2)
				const delay = dv.getUint16(off + 4, true);
				meta.durationMs += delay * 10;
				meta.frames++;
			}
			// 簡單掃描：GIF block 結構較複雜，這裡粗略跳過
			if (bytes[off] === 0x3b) break; // trailer
			off++;
		}
	}
	return meta;
}

// 位元組轉可讀字串（B / KB / MB）
function formatSize(bytes) {
	if (bytes < 1024) return bytes + 'B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
	return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

(function initMeme() {
	const grid = document.getElementById('memeGrid');
	const sortBtn = document.getElementById('memeSortBtn');
	if (!grid) return;

	let memes = [];
	let asc = true; // 預設正序

	fetch('sample/list.json')
		.then(r => r.json())
		.then(data => {
			memes = data.items || [];
			renderMemes();
		})
		.catch(err => console.warn('Meme list.json 載入失敗:', err));

	function renderMemes() {
		grid.innerHTML = '';
		const list = asc ? memes : [...memes].reverse();
		list.forEach(item => {
			const div = document.createElement('div');
			div.className = 'meme-item';
			div.innerHTML = `
				<img src="sample/${item.file}" alt="${item.label}" loading="lazy">
				<p class="meme-caption">${item.label}</p>
				<p class="meme-meta">載入中...</p>
			`;
			// 點擊重新播放：重新設定 src 強制 APNG 從頭播放
			div.querySelector('img').addEventListener('click', function () {
				const src = this.src;
				this.src = '';
				this.src = src;
			});
			grid.appendChild(div);

			// 非同步載入中繼資訊
			parseAnimationMeta(`sample/${item.file}`)
				.then(meta => {
					const metaEl = div.querySelector('.meme-meta');
					if (metaEl) {
						const sec = (meta.durationMs / 1000).toFixed(1);
						metaEl.textContent = `[${meta.width}x${meta.height}px | ${meta.frames} | ${sec}s | ${formatSize(meta.size)}]`;
					}
				})
				.catch(() => {
					const metaEl = div.querySelector('.meme-meta');
					if (metaEl) metaEl.textContent = '';
				});
		});
	}
	// 排序樣品動畫圖片
	if (sortBtn) {
		function updateSortLabel() {
			const key = asc ? 'memeSortAsc' : 'memeSortDesc';
			const label = document.getElementById('memeSortLabel');
			if (typeof I18N !== 'undefined' && typeof currentLang !== 'undefined' && I18N[currentLang]) {
				if (label) label.textContent = I18N[currentLang][key] || key;
			}
		}
		sortBtn.addEventListener('click', () => {
			asc = !asc;
			renderMemes();
			updateSortLabel();
		});
		// 初始文字
		updateSortLabel();
	}
})();

// Emoji 字型展示：動態產生 258 個貓咪 emoji
const emojiGrid = document.getElementById('emojiGrid');
if (emojiGrid) {
	for (let i = 1; i <= 258; i++) {
		const num = String(i).padStart(3, '0');
		const item = document.createElement('div');
		item.className = 'emoji-item';
		item.innerHTML = `
			<span class="emoji-icon cat cat-${num}"></span>
			<span class="emoji-name">cat-${num}</span>
		`;
		item.title = `Copy cat-${num}`;
		item.addEventListener('click', () => {
			navigator.clipboard.writeText(`cat cat-${num}`).then(() => {
				item.style.background = '#d4708a';
				item.querySelector('.emoji-name').textContent = 'copied!';
				setTimeout(() => {
					item.style.background = '';
					item.querySelector('.emoji-name').textContent = `cat-${num}`;
				}, 800);
			});
		});
		emojiGrid.appendChild(item);
	}
}

// ============================================================
// README tab：從 GitHub raw 抓 README.md，用 marked.js 渲染成 HTML
// Vercel 預設不 serve *.md，所以直接從 GitHub 抓
// ============================================================
fetch('https://raw.githubusercontent.com/egawadaien-design/eggshell-cat-apng-tool/main/README.md')
	.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
	.then(md => {
		document.getElementById('readmeContent').innerHTML = marked.parse(md);
	})
	.catch(err => {
		document.getElementById('readmeContent').innerHTML =
			'<p style="color:#c06078"><span class="cat cat-030"></span>&nbsp;Failed to load README: ' + err.message + '</p>';
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

// 隨機英數字串（下載檔名用）
function randomId(len) {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let s = '';
	for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
	return s;
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
	status.innerHTML = '';
	fileInfo.textContent = '';
	document.getElementById('lineStickerWarnings').innerHTML = '';
	document.querySelector('.preview-area').style.display = 'none';
	document.getElementById('fileListGroup').style.display = 'none';
});

// ============================================================
// 產生 APNG
// ============================================================
makeBtn.addEventListener('click', async () => {
	pause();
	makeBtn.disabled = true;
	status.innerHTML = t('processing');
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
				throw new Error(t('sizeMismatch', {name: f.name, w1: bitmap.width, h1: bitmap.height, w2: srcW, h2: srcH}));
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

		status.innerHTML = t('encoding');
		let buf = UPNG.encode(frames, w, h, cnum, dels);
		// UPNG 不支援 loops，自己事後改 acTL
		if (loops > 0) buf = setApngLoops(buf, loops);

		const blob = new Blob([buf], {type: 'image/apng'});

		// LINE 動態貼圖提示（全部生成後才判斷）
		const warnBox = document.getElementById('lineStickerWarnings');
		if (warnBox) {
			const warns = [];
			const totalMs = dels.reduce((a, b) => a + b, 0);
			const totalSec = totalMs / 1000;
			// 1. 總時間不是整數秒（1,2,3,4）
			if (!Number.isInteger(totalSec)) warns.push(t('lineWarnTimeNotInteger'));
			// 2. 總時間超過 4 秒
			if (totalSec > 4) warns.push(t('lineWarnTimeOver4'));
			// 3. 尺寸：寬或高其中一邊必須為 270px，且在 320×270 以內
			const sideOk = (w === 270 || h === 270);
			const withinMax = (w <= 320 && h <= 270);
			if (!sideOk || !withinMax) warns.push(t('lineWarnSize'));
			// 4. 影格數量 5～20
			const nFrames = frames.length;
			if (nFrames < 5 || nFrames > 20) warns.push(t('lineWarnFrames'));
			// 5. 播放次數：1～4 次（0 = 無限循環）
			if (loops === 0 || loops > 4) warns.push(t('lineWarnLoops'));
			// 6. 檔案大小超過 1MB
			if (blob.size > 1024 * 1024) warns.push(t('lineWarnFileSize'));
			// 渲染
			if (warns.length > 0) {
				warnBox.innerHTML = `<div class="warn-title"><span class="cat cat-030"></span>&nbsp;${t('lineWarnTitle')}</div>` +
					warns.map(w => `<div class="warn-item">${w}</div>`).join('');
			} else {
				warnBox.innerHTML = '';
			}
		}

		const url = URL.createObjectURL(blob);
		previewImg.src = url;
		previewInfo.textContent = t('previewAPNG', {n: frames.length});
		downloadLink.href = url;
		downloadLink.download = 'eggshell-' + randomId(8) + '.png';
		downloadLink.style.display = 'inline-block';

		// 算一下總時間顯示給使用者看
		const loopMs = dels.reduce((a, b) => a + b, 0);
		const loopSec = (loopMs / 1000).toFixed(2);
		let loopInfo = t('loopOnce', {sec: loopSec});
		if (loops > 0) {
			loopInfo += t('loopTimes', {n: loops, sec: (loopMs * loops / 1000).toFixed(2)});
		} else {
			loopInfo += t('loopInfLoop');
		}
		fileInfo.textContent = t('fileInfo', {w, h, n: frames.length, loopInfo, size: (blob.size/1024).toFixed(1)});
		status.innerHTML = t('done', {n: frames.length});

		// 順便產生 GIF 版本
		// GIF 只支援 1-bit 透明：先掃描所有 frame，找一個圖片裡沒用過的顏色當透明色，避免跟圖片撞色
		const downloadGifLink = document.getElementById('downloadGifLink');
		if (downloadGifLink && typeof GIF !== 'undefined') {
			// 第一步：掃所有 frame，收集出現過的 RGB 組合
			const usedColors = new Set();
			for (const f of frames) {
				const d = new Uint8Array(f);
				for (let p = 0; p < d.length; p += 4) {
					if (d[p + 3] >= 128) { // 只記錄不透明像素
						usedColors.add((d[p] << 16) | (d[p + 1] << 8) | d[p + 2]);
					}
				}
			}
			// 第二步：候選顏色，優先選跟圖片色系差很遠的（量化後才不會撞色）
			// 洋紅/純紅容易被量化成圖片本來就有的粉色，所以排後面
			const candidates = [
				0x00FF00, // 純綠（跟粉色系差最遠）
				0x0000FF, // 純藍
				0x00FFFF, // 青色
				0x00CCFF, // 天藍
				0xFF00FF, // 洋紅
				0xFF0000, // 純紅
				0xFFFF00, // 純黃
				0xFF00CC, // 粉紅
				0xCC00FF, // 紫
			];
			let transparentColor = 0x00FF00;
			for (const c of candidates) {
				if (!usedColors.has(c)) { transparentColor = c; break; }
			}
			const tr = (transparentColor >> 16) & 0xFF;
			const tg = (transparentColor >> 8) & 0xFF;
			const tb = transparentColor & 0xFF;

			// gif.js repeat: 0=無限, -1=只播一次, n=播 n+1 次
			// APNG loops: 0=無限, n=播 n 次
			// 對應: loops=0→repeat=0, loops=1→repeat=-1, loops≥2→repeat=loops-1
			let gifRepeat;
			if (loops === 0) gifRepeat = 0;
			else if (loops === 1) gifRepeat = -1;
			else gifRepeat = loops - 1;
			const gif = new GIF({
				workers: 2,
				quality: 10,
				workerScript: 'js/gif.worker.js',
				transparent: transparentColor,
				repeat: gifRepeat
			});
			for (let i = 0; i < frames.length; i++) {
				const c = document.createElement('canvas');
				c.width = w; c.height = h;
				const ctx = c.getContext('2d');
				const imgData = new ImageData(new Uint8ClampedArray(frames[i]), w, h);
				// 把透明像素填成選定的透明色，同時把 alpha 改成 255（不透明）
				// 否則 gif.js 看不到那個像素（因為 alpha=0），會把背景填成黑色
				for (let p = 0; p < imgData.data.length; p += 4) {
					if (imgData.data[p + 3] < 128) {
						imgData.data[p] = tr;
						imgData.data[p + 1] = tg;
						imgData.data[p + 2] = tb;
						imgData.data[p + 3] = 255; // 改成不透明，gif.js 才看得到
					}
				}
				ctx.putImageData(imgData, 0, 0);
				gif.addFrame(c, { delay: dels[i], copy: true });
			}
			gif.on('finished', function(gifBlob) {
				const gifUrl = URL.createObjectURL(gifBlob);
				downloadGifLink.href = gifUrl;
				downloadGifLink.download = 'eggshell-' + randomId(8) + '.gif';
				downloadGifLink.style.display = 'inline-block';
			});
			gif.render();
		}

	} catch (err) {
		status.innerHTML = t('err', {msg: err.message});
		console.error(err);
		
	} finally {
		makeBtn.disabled = false;
	}
});

// ============================================================
// PNG 貼圖製作頁面（tab-png）
// ============================================================
(function initPngMaker() {
	const fileInput = document.getElementById('pngFileInput');
	const dropZone = document.getElementById('pngDropZone');
	const previewArea = document.getElementById('pngPreviewArea');
	const canvas = document.getElementById('pngCanvas');
	const pickBtn = document.getElementById('pngPickBtn');
	const removeBtn = document.getElementById('pngRemoveBtn');
	const resetBtn = document.getElementById('pngResetBtn');
	const toleranceSlider = document.getElementById('pngTolerance');
	const toleranceVal = document.getElementById('pngToleranceVal');
	const eraserSizeSlider = document.getElementById('pngEraserSize');
	const eraserSizeVal = document.getElementById('pngEraserSizeVal');
	const globalModeCheckbox = document.getElementById('pngGlobalMode');
	const settingsCard = document.getElementById('pngSettingsCard');
	const settingsPlaceholder = document.getElementById('pngSettingsPlaceholder');
	if (!fileInput) return;

	// 記住「吸取顏色」按鈕的原始文字
	const pickBtnDefaultText = pickBtn.querySelector('span[data-i18n]').textContent;

	const ctx = canvas.getContext('2d');
	let originalImageData = null;
	let pickedColor = null;
	let picking = false;
	let erasing = false;
	let erasingActive = false;
	let history = []; // 撤銷堆疊（最多 20 步）

	function pushHistory() {
		if (!originalImageData) return;
		try {
			const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
			history.push(snap);
			if (history.length > 20) history.shift();
		} catch (e) {}
	}

	dropZone.addEventListener('click', () => fileInput.click());
	['dragenter', 'dragover'].forEach(evt => {
		dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover'); });
	});
	['dragleave', 'drop'].forEach(evt => {
		dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragover'); });
	});
	dropZone.addEventListener('drop', (e) => {
		const file = e.dataTransfer.files[0];
		if (file) loadImage(file);
	});
	fileInput.addEventListener('change', (e) => {
		const file = e.target.files[0];
		if (file) loadImage(file);
	});

	function loadImage(file) {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);
			originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			previewArea.style.display = 'block';
			settingsCard.style.display = 'block';
			settingsPlaceholder.style.display = 'none';
			pickedColor = null;
			removeBtn.disabled = false;
			document.getElementById('pngMakeSticker').disabled = false;
			setZoom(1.0); // 新圖片歸一縮放
			panX = 0; panY = 0; // 重置平移
			applyTransform();
			history = []; // 清空撤銷堆疊

			// 填入原圖尺寸到輸出尺寸欄位
			const outW = document.getElementById('pngOutW');
			const outH = document.getElementById('pngOutH');
			const outGroup = document.getElementById('pngOutSizeGroup');
			if (outW) outW.value = img.width;
			if (outH) outH.value = img.height;
			if (outGroup) outGroup.style.display = 'block';
			const splitGroup = document.getElementById('pngSplitGroup');
			if (splitGroup) splitGroup.style.display = 'block';
			aspectRatio = img.width / img.height;
		};
		img.src = url;
	}

	// 縮放 + 平移功能
	let zoom = 1.0, panX = 0, panY = 0, aspectRatio = 1;
	const zoomInBtn = document.getElementById('pngZoomIn');
	const zoomOutBtn = document.getElementById('pngZoomOut');
	const zoomLabel = document.getElementById('pngZoomLabel');
	const previewStage = document.getElementById('pngPreviewStage');

	function applyTransform() {
		canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
		canvas.style.transformOrigin = 'center center';
		if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + '%';
	}
	function setZoom(newZoom) {
		zoom = Math.max(0.25, Math.min(5.0, newZoom));
		applyTransform();
	}
	if (zoomInBtn) zoomInBtn.addEventListener('click', () => setZoom(zoom * 1.25));
	if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoom(zoom / 1.25));

	// 輸出尺寸：改寬自動算高，改高自動算寬
	const outW = document.getElementById('pngOutW');
	const outH = document.getElementById('pngOutH');
	if (outW && outH) {
		outW.addEventListener('input', () => {
			const w = parseInt(outW.value) || 0;
			if (w > 0) outH.value = Math.round(w / aspectRatio);
		});
		outH.addEventListener('input', () => {
			const h = parseInt(outH.value) || 0;
			if (h > 0) outW.value = Math.round(h * aspectRatio);
		});
	}

	// 畫面分割：水平 / 垂直分割數量 +/-
	let splitH = 1, splitV = 1;
	const splitHVal = document.getElementById('pngSplitHVal');
	const splitVVal = document.getElementById('pngSplitVVal');
	function updateSplitDisplay() {
		if (splitHVal) splitHVal.textContent = splitH;
		if (splitVVal) splitVVal.textContent = splitV;
	}
	const hMinus = document.getElementById('pngSplitHMinus');
	const hPlus = document.getElementById('pngSplitHPlus');
	const vMinus = document.getElementById('pngSplitVMinus');
	const vPlus = document.getElementById('pngSplitVPlus');
	if (hMinus) hMinus.addEventListener('click', () => {
		splitH = Math.max(0, splitH - 1);
		updateSplitDisplay();
		if (hPositions.length > 0) {
			hPositions.pop();
		}
		if (splitVisible) drawSplitOverlay();
	});
	if (hPlus) hPlus.addEventListener('click', () => {
		splitH = Math.min(10, splitH + 1);
		updateSplitDisplay();
		if (hPositions.length === 0) {
			hPositions.push(0.5);
		} else {
			const sorted = [...hPositions].sort((a, b) => a - b);
			let maxGap = -1, bestPos = 0, prev = 0;
			for (const p of sorted) {
				const gap = p - prev;
				if (gap > maxGap) { maxGap = gap; bestPos = prev + gap / 2; }
				prev = p;
			}
			const gap = 1 - prev;
			if (gap > maxGap) bestPos = prev + gap / 2;
			hPositions.push(bestPos);
		}
		if (splitVisible) drawSplitOverlay();
	});
	if (vMinus) vMinus.addEventListener('click', () => {
		splitV = Math.max(0, splitV - 1);
		updateSplitDisplay();
		if (vPositions.length > 0) {
			vPositions.pop();
		}
		if (splitVisible) drawSplitOverlay();
	});
	if (vPlus) vPlus.addEventListener('click', () => {
		splitV = Math.min(10, splitV + 1);
		updateSplitDisplay();
		if (vPositions.length === 0) {
			vPositions.push(0.5);
		} else {
			const sorted = [...vPositions].sort((a, b) => a - b);
			let maxGap = -1, bestPos = 0, prev = 0;
			for (const p of sorted) {
				const gap = p - prev;
				if (gap > maxGap) { maxGap = gap; bestPos = prev + gap / 2; }
				prev = p;
			}
			const gap = 1 - prev;
			if (gap > maxGap) bestPos = prev + gap / 2;
			vPositions.push(bestPos);
		}
		if (splitVisible) drawSplitOverlay();
	});

	// 分割線 overlay（疊在 canvas 上，可拖曳）
	let splitVisible = false;
	let hPositions = []; // 水平線位置（百分比 0~1）
	let vPositions = []; // 垂直線位置（百分比 0~1）
	// 把 canvas 包進 wrapper，overlay 跟 canvas 同尺寸
	const canvasWrapper = document.createElement('div');
	canvasWrapper.style.cssText = 'position:relative;display:inline-block;';
	canvas.parentNode.insertBefore(canvasWrapper, canvas);
	canvasWrapper.appendChild(canvas);
	const splitOverlay = document.createElement('div');
	splitOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none;z-index:5;';
	canvasWrapper.appendChild(splitOverlay);

	function initPositions() {
		hPositions = [];
		vPositions = [];
		for (let i = 1; i <= splitH; i++) hPositions.push(i / (splitH + 1));
		for (let i = 1; i <= splitV; i++) vPositions.push(i / (splitV + 1));
	}

	function drawSplitOverlay() {
		if (!splitVisible) { splitOverlay.style.display = 'none'; return; }
		splitOverlay.style.display = 'block';
		let html = '';
		// 垂直分割線（直線，可左右拖）
		vPositions.forEach((p, i) => {
			html += `<div class="split-line-v" data-index="${i}" style='position:absolute;left:${p * 100}%;top:0;bottom:0;border-left:2px dashed #4caf50;cursor:ew-resize;pointer-events:auto;'></div>`;
		});
		// 水平分割線（橫線，可上下拖）
		hPositions.forEach((p, i) => {
			html += `<div class="split-line-h" data-index="${i}" style='position:absolute;top:${p * 100}%;left:0;right:0;border-top:2px dashed #4caf50;cursor:ns-resize;pointer-events:auto;'></div>`;
		});
		splitOverlay.innerHTML = html;

		// 綁定拖曳
		splitOverlay.querySelectorAll('.split-line-v').forEach(el => {
			el.addEventListener('mousedown', (e) => {
				e.stopPropagation();
				const idx = parseInt(el.dataset.index);
				const rect = splitOverlay.getBoundingClientRect();
				function onMove(ev) {
					const x = (ev.clientX - rect.left) / rect.width;
					vPositions[idx] = Math.max(0.05, Math.min(0.95, x));
					drawSplitOverlay();
				}
				function onUp() {
					window.removeEventListener('mousemove', onMove);
					window.removeEventListener('mouseup', onUp);
				}
				window.addEventListener('mousemove', onMove);
				window.addEventListener('mouseup', onUp);
			});
		});
		splitOverlay.querySelectorAll('.split-line-h').forEach(el => {
			el.addEventListener('mousedown', (e) => {
				e.stopPropagation();
				const idx = parseInt(el.dataset.index);
				const rect = splitOverlay.getBoundingClientRect();
				function onMove(ev) {
					const y = (ev.clientY - rect.top) / rect.height;
					hPositions[idx] = Math.max(0.05, Math.min(0.95, y));
					drawSplitOverlay();
				}
				function onUp() {
					window.removeEventListener('mousemove', onMove);
					window.removeEventListener('mouseup', onUp);
				}
				window.addEventListener('mousemove', onMove);
				window.addEventListener('mouseup', onUp);
			});
		});
	}

	const toggleBtn = document.getElementById('pngSplitToggle');
	if (toggleBtn) toggleBtn.addEventListener('click', () => {
		splitVisible = !splitVisible;
		toggleBtn.style.background = splitVisible ? '#4caf50' : '';
		toggleBtn.style.color = splitVisible ? '#fff' : '';
		// 開啟分割線時，關閉刪除顏色與橡皮擦
		if (splitVisible) {
			picking = false;
			erasing = false;
			pickBtn.style.background = '';
			pickBtn.style.color = '';
			removeBtn.style.background = '';
			removeBtn.style.color = '';
			document.getElementById('pngPreviewStage').classList.remove('picking', 'erasing');
			canvas.style.cursor = '';
		}
		// 只有第一次開啟且分割線數量大於 0 時才初始化
		if (splitVisible && splitH > 0 && hPositions.length === 0) {
			initPositions();
		}
		if (splitVisible && splitV > 0 && vPositions.length === 0) {
			initPositions();
		}
		drawSplitOverlay();
	});

	const equalBtn = document.getElementById('pngSplitEqual');
	if (equalBtn) equalBtn.addEventListener('click', () => {
		initPositions();
		drawSplitOverlay();
	});

	// 移除所有分割線
	const clearBtn = document.getElementById('pngSplitClear');
	if (clearBtn) clearBtn.addEventListener('click', () => {
		splitVisible = false;
		hPositions = [];
		vPositions = [];
		splitH = 1;
		splitV = 1;
		updateSplitDisplay();
		toggleBtn.style.background = '';
		toggleBtn.style.color = '';
		drawSplitOverlay();
		const thumbs = document.getElementById('pngSplitThumbs');
		if (thumbs) thumbs.innerHTML = '';
	});

	// 顯示縮圖：依分割線切出各區塊
	const previewBtn = document.getElementById('pngSplitPreview');
	const confirmRow = document.getElementById('pngConfirmRow');
	const resultArea = document.getElementById('pngResultArea');
	const resultError = document.getElementById('pngResultError');
	let splitThumbsData = []; // 存每個縮圖的裁切 canvas

	if (previewBtn) previewBtn.addEventListener('click', () => {
		const thumbs = document.getElementById('pngSplitThumbs');
		if (!thumbs) return;
		thumbs.innerHTML = '';
		splitThumbsData = [];
		const w = canvas.width, h = canvas.height;
		const xs = [0, ...vPositions.slice().sort((a, b) => a - b).map(p => Math.round(p * w)), w];
		const ys = [0, ...hPositions.slice().sort((a, b) => a - b).map(p => Math.round(p * h)), h];
		let num = 1;
		for (let yi = 0; yi < ys.length - 1; yi++) {
			for (let xi = 0; xi < xs.length - 1; xi++) {
				const sx = xs[xi], sy = ys[yi], sw = xs[xi + 1] - sx, sh = ys[yi + 1] - sy;
				const tc = document.createElement('canvas');
				tc.width = sw;
				tc.height = sh;
				tc.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
				splitThumbsData.push(tc);
				const div = document.createElement('div');
				div.className = 'split-thumb';
				const img = document.createElement('img');
				img.src = tc.toDataURL();
				const numLabel = document.createElement('span');
				numLabel.className = 'split-thumb-num';
				numLabel.textContent = num;
				const del = document.createElement('button');
				del.className = 'split-thumb-del';
				del.innerHTML = '<span class="cat cat-017"></span>';
				del.addEventListener('click', () => {
					const idx = splitThumbsData.indexOf(tc);
					if (idx >= 0) splitThumbsData.splice(idx, 1);
					div.remove();
					// 重新編號
					thumbs.querySelectorAll('.split-thumb-num').forEach((n, i) => n.textContent = i + 1);
				});
				div.appendChild(img);
				div.appendChild(numLabel);
				div.appendChild(del);
				thumbs.appendChild(div);
				num++;
			}
		}
		confirmRow.style.display = 'block';
		resultArea.style.display = 'none';
		resultError.style.display = 'none';
	});

	// 確認圖片：必須只剩 1 張，產生 240x240 和 96x74
	const confirmBtn = document.getElementById('pngConfirmBtn');
	if (confirmBtn) confirmBtn.addEventListener('click', () => {
		if (splitThumbsData.length !== 1) {
			resultError.innerHTML = (typeof I18N !== 'undefined' && currentLang && I18N[currentLang])
				? I18N[currentLang].pngConfirmError : '請只保留 1 張縮圖';
			resultError.style.display = 'block';
			resultArea.style.display = 'none';
			return;
		}
		resultError.style.display = 'none';
		const src = splitThumbsData[0];
		// 240x240：等比縮放到最大可用寬度/高度，置中
		const c240 = document.getElementById('pngResult240');
		const ctx240 = c240.getContext('2d');
		c240.width = 240; c240.height = 240;
		ctx240.clearRect(0, 0, 240, 240);
		const scale240 = Math.min(240 / src.width, 240 / src.height);
		const dw240 = src.width * scale240, dh240 = src.height * scale240;
		ctx240.drawImage(src, (240 - dw240) / 2, (240 - dh240) / 2, dw240, dh240);
		document.getElementById('pngResult240Info').textContent = `${src.width}×${src.height} → 240×240`;
		// 96x74：等比縮放到最大可用寬度，高度自適應
		const c96 = document.getElementById('pngResult96');
		const ctx96 = c96.getContext('2d');
		c96.width = 96; c96.height = 74;
		ctx96.clearRect(0, 0, 96, 74);
		const scale96 = Math.min(96 / src.width, 74 / src.height);
		const dw96 = src.width * scale96, dh96 = src.height * scale96;
		ctx96.drawImage(src, (96 - dw96) / 2, (74 - dh96) / 2, dw96, dh96);
		document.getElementById('pngResult96Info').textContent = `${src.width}×${src.height} → 96×74`;
		resultArea.style.display = 'block';
	});

	// 下載 ZIP
	const zipBtn = document.getElementById('pngDownloadZip');
	if (zipBtn) zipBtn.addEventListener('click', async () => {
		const zip = new JSZip();
		const c240 = document.getElementById('pngResult240');
		const c96 = document.getElementById('pngResult96');
		// 轉成 PNG blob
		const b240 = await new Promise(r => c240.toBlob(r, 'image/png'));
		const b96 = await new Promise(r => c96.toBlob(r, 'image/png'));
		zip.file('240x240.png', b240);
		zip.file('96x74.png', b96);
		const blob = await zip.generateAsync({ type: 'blob' });
		const a = document.createElement('a');
		const name = 'egg-' + Math.random().toString(36).slice(2, 8) + '.zip';
		a.href = URL.createObjectURL(blob);
		a.download = name;
		a.click();
		URL.revokeObjectURL(a.href);
	});

	// 拖曳平移（分割線模式開啟時鎖定，不拖曳圖片）
	let dragging = false, dragStartX = 0, dragStartY = 0;
	if (previewStage) {
		previewStage.addEventListener('mousedown', (e) => {
			if (picking || erasing) return; // 吸取/橡皮擦模式不拖曳
			if (splitVisible) return; // 分割線模式鎖定圖片
			dragging = true;
			dragStartX = e.clientX - panX;
			dragStartY = e.clientY - panY;
			previewStage.style.cursor = 'grabbing';
		});
		window.addEventListener('mousemove', (e) => {
			if (!dragging) return;
			panX = e.clientX - dragStartX;
			panY = e.clientY - dragStartY;
			applyTransform();
		});
		window.addEventListener('mouseup', () => {
			dragging = false;
			previewStage.style.cursor = '';
		});
	}

	// 吸取顏色模式
	pickBtn.addEventListener('click', () => {
		picking = !picking;
		// 互斥：開啟吸取顏色時，取消橡皮擦與分割線
		if (picking) {
			erasing = false;
			removeBtn.style.background = '';
			removeBtn.style.color = '';
			canvas.style.cursor = 'default';
			// 關閉分割線模式
			if (splitVisible) {
				splitVisible = false;
				toggleBtn.style.background = '';
				toggleBtn.style.color = '';
				drawSplitOverlay();
			}
		}
		document.getElementById('pngPreviewStage').classList.toggle('picking', picking);
		document.getElementById('pngPreviewStage').classList.remove('erasing');
		pickBtn.style.background = picking ? '#4caf50' : '';
		pickBtn.style.color = picking ? '#fff' : '';
	});

	// 即時滑鼠顏色預覽
	canvas.addEventListener('mousemove', (e) => {
		if (!originalImageData) return;
		const rect = canvas.getBoundingClientRect();
		const x = Math.floor((e.clientX - rect.left) * canvas.width / rect.width);
		const y = Math.floor((e.clientY - rect.top) * canvas.height / rect.height);
		if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;
		const idx = (y * canvas.width + x) * 4;
		// 讀 canvas 目前狀態（含已刪除的透明區域）
		const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
		const r = currentData[idx], g = currentData[idx+1], b = currentData[idx+2], a = currentData[idx+3];
		const liveRgb = document.getElementById('pngLiveRgb');
		const liveCat = document.getElementById('pngLiveCat');
		if (liveRgb) liveRgb.textContent = `RGB(${r},${g},${b})`;
		if (liveCat) {
			if (a === 0) {
				// 透明區域：顯示紅色 cat-017
				liveCat.className = 'cat cat-017';
				liveCat.style.color = '';
			} else {
				// 有顏色：顯示 cat-133 並著色
				liveCat.className = 'cat cat-133';
				liveCat.style.color = `rgb(${r},${g},${b})`;
			}
		}
	});

	// 點 canvas 取色 + 刪除（局部 flood fill 或全域掃描）
	canvas.addEventListener('click', (e) => {
		if (!picking || !originalImageData) return;
		const rect = canvas.getBoundingClientRect();
		const x = Math.floor((e.clientX - rect.left) * canvas.width / rect.width);
		const y = Math.floor((e.clientY - rect.top) * canvas.height / rect.height);
		const idx = (y * canvas.width + x) * 4;
		const data = originalImageData.data;
		pickedColor = [data[idx], data[idx+1], data[idx+2]];
		const tol = parseInt(toleranceSlider.value) || 0;
		pushHistory(); // 記錄刪除前的狀態
		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const w = canvas.width, h = canvas.height;
		const [tr, tg, tb] = pickedColor;
		const isGlobal = globalModeCheckbox && globalModeCheckbox.checked;
		if (isGlobal) {
			// 全域掃描：所有同色像素都刪
			for (let yy = 0; yy < h; yy++) {
				for (let xx = 0; xx < w; xx++) {
					const cidx = (yy * w + xx) * 4;
					const r = imgData.data[cidx], g = imgData.data[cidx+1], b = imgData.data[cidx+2];
					const diff = Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb);
					if (diff <= tol * 3) imgData.data[cidx + 3] = 0;
				}
			}
		} else {
			// 局部 flood fill
			const visited = new Uint8Array(w * h);
			const stack = [[x, y]];
			while (stack.length) {
				const [cx, cy] = stack.pop();
				if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
				if (visited[cy * w + cx]) continue;
				const cidx = (cy * w + cx) * 4;
				const r = imgData.data[cidx], g = imgData.data[cidx+1], b = imgData.data[cidx+2];
				const diff = Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb);
				if (diff <= tol * 3) {
					visited[cy * w + cx] = 1;
					imgData.data[cidx + 3] = 0;
					stack.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
				}
			}
		}
		ctx.putImageData(imgData, 0, 0);
	});

	// 容許度滑桿
	toleranceSlider.addEventListener('input', () => {
		toleranceVal.textContent = toleranceSlider.value;
	});
	eraserSizeSlider.addEventListener('input', () => {
		eraserSizeVal.textContent = eraserSizeSlider.value;
	});

	// 橡皮擦：切換模式
	removeBtn.addEventListener('click', () => {
		if (!originalImageData) return;
		erasing = !erasing;
		picking = false;
		pickBtn.style.background = '';
		pickBtn.style.color = '';
		document.getElementById('pngPreviewStage').classList.remove('picking');
		document.getElementById('pngPreviewStage').classList.toggle('erasing', erasing);
		removeBtn.style.background = erasing ? '#4caf50' : '';
		removeBtn.style.color = erasing ? '#fff' : '';
		canvas.style.cursor = erasing ? 'crosshair' : 'default';
		// 開啟橡皮擦時關閉分割線模式
		if (erasing && splitVisible) {
			splitVisible = false;
			toggleBtn.style.background = '';
			toggleBtn.style.color = '';
			drawSplitOverlay();
		}
	});

	// 橡皮擦：在 canvas 上拖曳擦除
	function eraserAt(x, y) {
		const size = parseInt(eraserSizeSlider.value) || 10;
		const radius = size / 2;
		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const w = canvas.width, h = canvas.height;
		const minX = Math.max(0, Math.floor(x - radius));
		const maxX = Math.min(w - 1, Math.ceil(x + radius));
		const minY = Math.max(0, Math.floor(y - radius));
		const maxY = Math.min(h - 1, Math.ceil(y + radius));
		for (let cy = minY; cy <= maxY; cy++) {
			for (let cx = minX; cx <= maxX; cx++) {
				const dx = cx - x, dy = cy - y;
				if (dx * dx + dy * dy <= radius * radius) {
					const idx = (cy * w + cx) * 4;
					imgData.data[idx + 3] = 0;
				}
			}
		}
		ctx.putImageData(imgData, 0, 0);
	}
	canvas.addEventListener('mousedown', (e) => {
		if (!erasing || !originalImageData) return;
		pushHistory(); // 記錄橡皮擦開始前的狀態
		erasingActive = true;
		const rect = canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) * canvas.width / rect.width;
		const y = (e.clientY - rect.top) * canvas.height / rect.height;
		eraserAt(x, y);
	});
	canvas.addEventListener('mousemove', (e) => {
		if (!erasingActive || !erasing) return;
		const rect = canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) * canvas.width / rect.width;
		const y = (e.clientY - rect.top) * canvas.height / rect.height;
		eraserAt(x, y);
	});
	window.addEventListener('mouseup', () => { erasingActive = false; });

	// 撤銷：回到上一個動作
	const undoBtn = document.getElementById('pngUndo');
	if (undoBtn) {
		undoBtn.addEventListener('click', () => {
			if (history.length === 0) return;
			const prev = history.pop();
			ctx.putImageData(prev, 0, 0);
		});
	}

	// 還原：回到圖片剛載入的樣子
	const restoreBtn = document.getElementById('pngReset');
	if (restoreBtn) {
		restoreBtn.addEventListener('click', () => {
			if (!originalImageData) return;
			pushHistory(); // 記錄還原前狀態（這樣還原後還能撤銷回去）
			ctx.putImageData(originalImageData, 0, 0);
		});
	}

	// 生成靜態貼圖：顯示 LINE 限制提醒 + 縮圖預覽
	const makeStickerBtn = document.getElementById('pngMakeSticker');
	const warnBox = document.getElementById('pngStickerWarn');
	const stickerPreview = document.getElementById('pngStickerPreview');
	const stickerPreviewImg = document.getElementById('pngStickerPreviewImg');
	const stickerPreviewInfo = document.getElementById('pngStickerPreviewInfo');
	const dlPngBtn = document.getElementById('pngDownloadPng');
	let stickerCanvas = null; // 最終輸出用 canvas

	if (makeStickerBtn) makeStickerBtn.addEventListener('click', () => {
		// 顯示警告框
		if (warnBox) warnBox.style.display = 'block';

		// 讀取輸出寬高設定
		const outW = parseInt(document.getElementById('pngOutW')?.value) || 0;
		const outH = parseInt(document.getElementById('pngOutH')?.value) || 0;

		// 建立輸出 canvas
		if (outW && outH) {
			stickerCanvas = document.createElement('canvas');
			stickerCanvas.width = outW;
			stickerCanvas.height = outH;
			const sctx = stickerCanvas.getContext('2d');
			sctx.clearRect(0, 0, outW, outH);
			// 等比縮放：以寬或高為限制，置中
			const scale = Math.min(outW / canvas.width, outH / canvas.height);
			const dw = canvas.width * scale, dh = canvas.height * scale;
			sctx.drawImage(canvas, (outW - dw) / 2, (outH - dh) / 2, dw, dh);
		} else {
			// 留空 = 原圖大小
			stickerCanvas = document.createElement('canvas');
			stickerCanvas.width = canvas.width;
			stickerCanvas.height = canvas.height;
			stickerCanvas.getContext('2d').drawImage(canvas, 0, 0);
		}

		const dataUrl = stickerCanvas.toDataURL('image/png');
		stickerPreviewImg.src = dataUrl;
		const base64 = dataUrl.split(',')[1];
		const bytes = Math.round(base64.length * 0.75);
		const kb = (bytes / 1024).toFixed(1);
		const sizeStr = stickerCanvas.width + '×' + stickerCanvas.height + 'px';
		stickerPreviewInfo.textContent = sizeStr + ' · ' + kb + ' KB';
		stickerPreview.style.display = 'block';
		dlPngBtn.style.display = 'inline-block';

		// 條件檢查：只顯示不通過的
		const W = stickerCanvas.width, H = stickerCanvas.height;
		const t = (typeof I18N !== 'undefined' && I18N[currentLang]) ? I18N[currentLang] : {};
		let warns = [];
		// 1. 寬高上限
		if (W > 370 || H > 320) {
			warns.push((t.pngWarnSizeFail || '圖片超過上限：370×320px（目前 {w}×{h}）').replace('{w}', W).replace('{h}', H));
		}
		// 2. 檔案大小 1MB
		if (bytes > 1024 * 1024) {
			const mb = (bytes / 1024 / 1024).toFixed(2);
			warns.push((t.pngWarnFileFail || '檔案超過 1MB（目前 {mb} MB）').replace('{mb}', mb));
		}
		// 3. 偶數
		if (W % 2 !== 0 || H % 2 !== 0) {
			warns.push((t.pngWarnEvenFail || '寬高需為偶數（目前 {w}×{h}）').replace('{w}', W).replace('{h}', H));
		}
		// 動態生成警告條
		if (warnBox) {
			if (warns.length === 0) {
				// 全部通過 → 不顯示警告框
				warnBox.style.display = 'none';
			} else {
				warnBox.style.display = 'block';
				const titleEl = warnBox.querySelector('.warn-title');
				warnBox.innerHTML = '';
				if (titleEl) warnBox.appendChild(titleEl);
				warns.forEach(msg => {
					const div = document.createElement('div');
					div.className = 'warn-item';
					div.textContent = msg;
					warnBox.appendChild(div);
				});
			}
		}
	});

	// 清空：等同右邊重置按鈕
	const clearAllBtn = document.getElementById('pngClear');
	if (clearAllBtn) clearAllBtn.addEventListener('click', () => {
		resetBtn.click();
		// 同時隱藏生成結果
		warnBox.style.display = 'none';
		stickerPreview.style.display = 'none';
		dlPngBtn.style.display = 'none';
	});

	// 下載 PNG：下載目前 canvas
	if (dlPngBtn) dlPngBtn.addEventListener('click', () => {
		if (!stickerCanvas) return;
		const a = document.createElement('a');
		a.href = stickerCanvas.toDataURL('image/png');
		a.download = 'sticker-' + Math.random().toString(36).slice(2, 8) + '.png';
		a.click();
	});

	// 重設：還原去背 + 清空整張圖片
	resetBtn.addEventListener('click', () => {
		// 1. 先還原像素
		if (originalImageData) {
			ctx.putImageData(originalImageData, 0, 0);
		}
		// 2. 清空 canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// 3. 隱藏預覽區和設定面板，恢復預設提示
		document.getElementById('pngPreviewArea').style.display = 'none';
		document.getElementById('pngSettingsCard').style.display = 'none';
		document.getElementById('pngSettingsPlaceholder').style.display = 'block';
		// 4. 清空狀態
		pickedColor = null;
		originalImageData = null;
		img = null;
		removeBtn.disabled = true;
		document.getElementById('pngMakeSticker').disabled = true;
		fileInput.value = '';
		pickBtn.querySelector('span[data-i18n]').textContent = pickBtnDefaultText;
		picking = false;
		erasing = false;
		document.getElementById('pngPreviewStage').classList.remove('picking');
		document.getElementById('pngPreviewStage').classList.remove('erasing');
		pickBtn.style.background = '';
		pickBtn.style.color = '';
		removeBtn.style.background = '';
		removeBtn.style.color = '';
		// 5. 清空即時顏色顯示
		const liveRgb = document.getElementById('pngLiveRgb');
		if (liveRgb) liveRgb.textContent = 'RGB(-,-,-)';
		const liveCat = document.getElementById('pngLiveCat');
		if (liveCat) {
			liveCat.className = 'cat cat-017';
			liveCat.style.color = '';
		}
		// 6. 復原設定面板：全域刪除取消、容許度回預設
		const globalChk = document.getElementById('pngGlobalMode');
		if (globalChk) globalChk.checked = false;
		const tolSlider = document.getElementById('pngTolerance');
		const tolVal = document.getElementById('pngToleranceVal');
		if (tolSlider) tolSlider.value = 15;
		if (tolVal) tolVal.textContent = '15';
		// 橡皮擦大小復原為 10
		const eraserSlider = document.getElementById('pngEraserSize');
		const eraserVal = document.getElementById('pngEraserSizeVal');
		if (eraserSlider) eraserSlider.value = 10;
		if (eraserVal) eraserVal.textContent = '10';
		// 橡皮擦模式關閉
		erasing = false;
		removeBtn.style.background = '';
		removeBtn.style.color = '';
		canvas.style.cursor = 'default';
		// 7. 重置分割線狀態
		splitVisible = false;
		hPositions = [];
		vPositions = [];
		splitH = 1;
		splitV = 1;
		updateSplitDisplay();
		if (toggleBtn) {
			toggleBtn.style.background = '';
			toggleBtn.style.color = '';
		}
		drawSplitOverlay();
		// 清空縮圖區
		const thumbs = document.getElementById('pngSplitThumbs');
		if (thumbs) thumbs.innerHTML = '';
	});
})();
