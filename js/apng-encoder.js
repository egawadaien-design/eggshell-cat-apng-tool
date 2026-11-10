/**
 * 蛋殼喵 APNG 工具 — 編碼輸出
 * PNG CRC32 / acTL 循環次數 / UPNG 編碼 / GIF 輸出 / LINE 規範警告 / 語言重繪
 * @author [DaiEn]
 * @Date: 2026-11-11
 * @Correction: 1
 *
 * 由原 apng.js 第 304~360 行與第 859~1088 行原封不動切出，未改動任何邏輯
 * 依賴 apng-frames.js 先載入（使用其 DOM 節點與 files / frameDelays 狀態）
 */

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
// 生成結果的文字重繪（切換語言時使用）
// 警告列、預覽提示、檔案摘要、狀態列都是生成當下用 t() 寫死的，
// 沒有 data-i18n 屬性，applyLang() 掃不到，必須主動重跑一次
// ============================================================
// LINE 動態貼圖規範警告列
function renderApngWarnings() {
	const warnBox = document.getElementById('lineStickerWarnings');
	if (!warnBox) return;
	if (!lastApngResult) { warnBox.innerHTML = ''; return; }

	const r = lastApngResult;
	const totalSec = r.totalMs / 1000;
	const warns = [];
	// 1. 總時間不是整數秒（1,2,3,4）
	if (!Number.isInteger(totalSec)) warns.push(t('lineWarnTimeNotInteger'));
	// 2. 總時間超過 4 秒
	if (totalSec > 4) warns.push(t('lineWarnTimeOver4'));
	// 3. 尺寸：寬或高其中一邊必須為 270px，且在 320×270 以內
	const sideOk = (r.w === 270 || r.h === 270);
	const withinMax = (r.w <= 320 && r.h <= 270);
	if (!sideOk || !withinMax) warns.push(t('lineWarnSize'));
	// 4. 影格數量 5～20
	if (r.n < 5 || r.n > 20) warns.push(t('lineWarnFrames'));
	// 5. 播放次數：1～4 次（0 = 無限循環）
	if (r.loops === 0 || r.loops > 4) warns.push(t('lineWarnLoops'));
	// 6. 檔案大小超過 1MB
	if (r.bytes > 1024 * 1024) warns.push(t('lineWarnFileSize'));

	if (warns.length > 0) {
		warnBox.innerHTML = `<div class="warn-title"><span class="cat cat-030"></span>&nbsp;${t('lineWarnTitle')}</div>` +
			warns.map(w => `<div class="warn-item">${w}</div>`).join('');
	} else {
		warnBox.innerHTML = '';
	}
}

// 預覽提示 / 檔案摘要 / 狀態列
function renderApngSummary() {
	if (!lastApngResult) return;
	const r = lastApngResult;
	previewInfo.textContent = t('previewAPNG', {n: r.n});

	const loopSec = (r.totalMs / 1000).toFixed(2);
	let loopInfo = t('loopOnce', {sec: loopSec});
	if (r.loops > 0) {
		loopInfo += t('loopTimes', {n: r.loops, sec: (r.totalMs * r.loops / 1000).toFixed(2)});
	} else {
		loopInfo += t('loopInfLoop');
	}
	fileInfo.textContent = t('fileInfo', {w: r.w, h: r.h, n: r.n, loopInfo: loopInfo, size: (r.bytes / 1024).toFixed(1)});
	status.innerHTML = t('done', {n: r.n});
}

// 一次重繪全部動態文字（給 i18n.js 的 applyLang() 呼叫）
function renderApngTexts() {
	renderApngWarnings();
	renderApngSummary();
}
window.renderApngTexts = renderApngTexts;

// ============================================================
// 產生 APNG
// ============================================================
makeBtn.addEventListener('click', async () => {
	pause();
	makeBtn.disabled = true;
	// 先清掉上一次的結果，若本次中途失敗，切換語言才不會把舊的成功訊息重繪回來
	lastApngResult = null;
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

		// 記住本次生成結果，切換語言時可重繪警告與摘要（見 renderApngWarnings / renderApngSummary）
		lastApngResult = {
			w, h,
			n: frames.length,
			totalMs: dels.reduce((a, b) => a + b, 0),
			loops,
			bytes: blob.size
		};
		// LINE 動態貼圖規範提示（條件判斷集中在 renderApngWarnings）
		renderApngWarnings();

		const url = URL.createObjectURL(blob);
		previewImg.src = url;
		renderApngSummary();
		downloadLink.href = url;
		downloadLink.download = 'eggshell-' + randomId(8) + '.png';
		downloadLink.style.display = 'inline-block';

		// 分享按鈕：把 blob 存到全域變數，給 modal 用
		try {
			window._currentApngBlob = blob;
			window._currentApngUrl = url;
			// 只有 Supabase 啟用時才顯示分享按鈕
			if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled) {
				document.getElementById('shareLink').style.display = 'inline-block';
			}
		} catch (e) { console.warn('share state fail', e); }

		// 預覽提示、檔案摘要與狀態列已由上面的 renderApngSummary() 一併處理，
		// 切換語言時會再重跑一次，不會留在舊語言

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
