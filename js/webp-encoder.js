/**
 * 蛋殼喵 APNG 工具 — 動畫 WEBP 輸出（純 JS 容器封裝，不引入 WASM／第三方套件）
 *
 * 為什麼要自己寫：瀏覽器只有「單張」WebP 編碼（canvas.toBlob），沒有「動畫 WebP」API，
 * 所以我們逐格把 canvas 編成單張 WebP，再把每格的位元流（ALPH／VP8／VP8L）原封不動
 * 搬進 RIFF 容器的 ANMF chunk。全程不解碼、不重壓縮，畫質損失只發生在 canvas 那一層。
 *
 * 容器結構：
 *   RIFF <size> WEBP
 *     ├─ VP8X  10 bytes：旗標（Animation / Alpha）＋畫布寬高減一
 *     ├─ ANIM   6 bytes：背景色 BGRA＋循環次數（0 = 無限）
 *     └─ ANMF  16 bytes 表頭（X/Y/寬減一/高減一/延遲 各 24 bit ＋ 1 byte 旗標）
 *              ＋ 選用 ALPH ＋ VP8 或 VP8L
 *
 * @author [DaiEn]
 * @Date: 2026-11-23
 * @Correction: 1
 * 2026-11-23 建立：APNG 頁新增「下載 WEBP」——按下才編碼（不在生成時多花時間），
 *            每格全畫面、blend=no-blend（1）、dispose=none（0），延遲沿用 frameDelays。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
(function () {
	// ============================================================
	// 位元組寫入工具（RIFF 一律小端序）
	// ============================================================
	function putU32(bytes, off, v) {
		bytes[off] = v & 0xFF;
		bytes[off + 1] = (v >>> 8) & 0xFF;
		bytes[off + 2] = (v >>> 16) & 0xFF;
		bytes[off + 3] = (v >>> 24) & 0xFF;
	}

	// 24 位元欄位：Frame X/Y（實際座標 = 值 * 2）、寬高減一、延遲（毫秒）都用這個
	function putU24(bytes, off, v) {
		bytes[off] = v & 0xFF;
		bytes[off + 1] = (v >>> 8) & 0xFF;
		bytes[off + 2] = (v >>> 16) & 0xFF;
	}

	function writeFourCC(bytes, off, tag) {
		bytes[off] = tag.charCodeAt(0);
		bytes[off + 1] = tag.charCodeAt(1);
		bytes[off + 2] = tag.charCodeAt(2);
		bytes[off + 3] = tag.charCodeAt(3);
	}

	function readFourCC(bytes, off) {
		return String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
	}

	// ============================================================
	// 組一個 RIFF chunk：8 bytes 標頭（FourCC＋長度）＋內容＋奇數長度的 1 byte 填充
	// ============================================================
	function makeChunk(tag, payload) {
		const size = payload.length;
		const pad = size & 1;                       // RIFF 規定每個 chunk 長度必須是偶數
		const out = new Uint8Array(8 + size + pad);
		writeFourCC(out, 0, tag);
		putU32(out, 4, size);
		out.set(payload, 8);                        // 填充位元組預設就是 0，不用另外寫
		return out;
	}

	// ============================================================
	// 拆一張「單張 WebP」，只留下動畫需要的兩個子區塊
	//   有 ALPH（有損＋透明）：ALPH 必須排在 VP8 前面
	//   無損（VP8L）：透明資訊已經編在 VP8L 裡，不會有 ALPH
	// 回傳的是「整塊原始 chunk（含標頭與填充）」，之後直接貼進 ANMF 的 Frame Data
	// ============================================================
	function extractFrameChunks(buf) {
		if (buf.length < 12) return null;
		if (readFourCC(buf, 0) !== 'RIFF' || readFourCC(buf, 8) !== 'WEBP') return null;

		let alpha = null;                           // ALPH chunk 原始位元組
		let bitstream = null;                       // VP8 或 VP8L chunk 原始位元組
		let off = 12;

		while (off + 8 <= buf.length) {
			const tag = readFourCC(buf, off);
			const size = buf[off + 4] | (buf[off + 5] << 8) | (buf[off + 6] << 16) | (buf[off + 7] << 24);
			if (size < 0 || off + 8 + size > buf.length) break;
			const end = off + 8 + size + (size & 1);    // 含填充位

			if (tag === 'ALPH') {
				alpha = buf.slice(off, Math.min(end, buf.length));
			} else if (tag === 'VP8 ' || tag === 'VP8L') {
				bitstream = buf.slice(off, Math.min(end, buf.length));
			}
			// VP8X／ICCP／EXIF／XMP 一律丟掉：ANMF 的 Frame Data 只認 ALPH／VP8／VP8L
			off = end;
		}

		if (!bitstream) return null;
		return { alpha: alpha, bitstream: bitstream };
	}

	// ============================================================
	// 這一格有沒有「真的半透明／全透明」的像素（決定 VP8X 的 Alpha 旗標）
	// ============================================================
	function hasTransparentPixel(rgba) {
		for (let i = 3; i < rgba.length; i += 4) {
			if (rgba[i] < 255) return true;
		}
		return false;
	}

	// ============================================================
	// canvas → 單張 WebP（Safari 等不支援編碼的瀏覽器會退回 PNG，
	// 由呼叫端檢查 blob.type 就知道支援與否）
	// ============================================================
	function canvasToWebpBlob(canvas, quality) {
		return new Promise(function (resolve) {
			if (typeof canvas.toBlob !== 'function') { resolve(null); return; }
			canvas.toBlob(function (blob) { resolve(blob || null); }, 'image/webp', quality);
		});
	}

	// 延遲：0 在 WebP 是「由實作決定」，各家瀏覽器多半拉到 10ms，這裡直接補 10ms 避免一閃到底
	function durationOf(ms) {
		const v = Math.round(Number(ms) || 0);
		if (v <= 0) return 10;
		return Math.min(0xFFFFFF, v);               // 欄位只有 24 bit
	}

	// ============================================================
	// 「色彩」選單 → WebP 有損品質
	// WebP 沒有調色盤概念，這裡只是借用同一顆選單的「檔案大小／細緻度」語意：
	//   全彩（cnum = 0）→ 0.9、256 色 → 0.8、128 色 → 0.7
	// ============================================================
	function qualityForColors(cnum) {
		if (cnum === 0) return 0.9;
		if (cnum >= 256) return 0.8;
		return 0.7;
	}

	// 這台瀏覽器能不能編 WebP（同步偵測，給 UI 或除錯用）
	let supportedCache = null;
	function isSupported() {
		if (supportedCache !== null) return supportedCache;
		const c = document.createElement('canvas');
		c.width = 1; c.height = 1;
		// 不支援時 toDataURL 會回 PNG 的 data URI，開頭不是 data:image/webp
		supportedCache = String(c.toDataURL('image/webp')).indexOf('data:image/webp') === 0;
		return supportedCache;
	}

	// ============================================================
	// 主流程：逐格編碼 → 收集 ANMF → 補 VP8X／ANIM → 輸出 Blob
	// 回傳 null 代表「這個瀏覽器編不出 WebP」，呼叫端據此顯示提示
	// ============================================================
	async function encode(options) {
		const frames = options.frames || [];        // 每格都是 RGBA 的 ArrayBuffer
		const w = Math.round(options.w || 0);
		const h = Math.round(options.h || 0);
		const dels = options.dels || [];
		const loops = Math.max(0, Math.min(0xFFFF, Math.round(options.loops || 0)));
		const quality = (typeof options.quality === 'number') ? options.quality : 0.9;
		const onProgress = options.onProgress;

		if (!frames.length || !w || !h) return null;

		// 動畫 WebP 的畫布上限（單邊 24 bit，但實務上 16383 就會被多數解碼器擋）
		if (w > 16383 || h > 16383) throw new Error('too large for WebP (' + w + 'x' + h + ')');

		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d', { alpha: true });

		const anmfChunks = [];
		let hasAlpha = false;

		for (let i = 0; i < frames.length; i++) {
			// 一格一格來（不要同時 toBlob）：影格多時同時編碼會把記憶體衝爆
			const pixels = new Uint8ClampedArray(frames[i]);
			ctx.clearRect(0, 0, w, h);
			ctx.putImageData(new ImageData(pixels, w, h), 0, 0);

			const blob = await canvasToWebpBlob(canvas, quality);
			if (!blob || blob.type !== 'image/webp') return null;   // 瀏覽器不支援 → 由呼叫端提示

			const still = new Uint8Array(await blob.arrayBuffer());
			const parts = extractFrameChunks(still);
			if (!parts) throw new Error('WebP frame parse failed (frame ' + (i + 1) + ')');

			// 有 ALPH 就一定帶透明；沒 ALPH（無損或全不透明）才回頭掃像素
			if (parts.alpha || hasTransparentPixel(pixels)) hasAlpha = true;

			// ANMF 表頭 16 bytes
			const head = new Uint8Array(16);
			putU24(head, 0, 0);                  // Frame X / 2 = 0：每格都是整張畫布
			putU24(head, 3, 0);                  // Frame Y / 2 = 0
			putU24(head, 6, w - 1);              // 寬減一
			putU24(head, 9, h - 1);              // 高減一
			putU24(head, 12, durationOf(dels[i]));  // 顯示毫秒數
			// 最後 1 byte：Reserved 6 bit | B 1 bit | D 1 bit
			//   B = 1（no-blend：直接覆蓋矩形，透明像素不會疊到上一格）
			//   D = 0（dispose none：不還原背景）
			head[15] = 0x02;

			const alphaLen = parts.alpha ? parts.alpha.length : 0;
			const payload = new Uint8Array(16 + alphaLen + parts.bitstream.length);
			payload.set(head, 0);
			let off = 16;
			if (parts.alpha) { payload.set(parts.alpha, off); off += alphaLen; }  // ALPH 必須在 VP8 前面
			payload.set(parts.bitstream, off);

			anmfChunks.push(makeChunk('ANMF', payload));
			if (onProgress) onProgress(i + 1, frames.length);
		}

		// VP8X：旗標 1 byte（bit1 = Animation、bit4 = Alpha）＋ 3 bytes 保留 ＋ 畫布寬高減一
		const vp8xPayload = new Uint8Array(10);
		vp8xPayload[0] = 0x02 | (hasAlpha ? 0x10 : 0x00);
		putU24(vp8xPayload, 4, w - 1);
		putU24(vp8xPayload, 7, h - 1);

		// ANIM：背景色 BGRA（透明黑）＋循環次數（0 = 無限）
		const animPayload = new Uint8Array(6);
		animPayload[4] = loops & 0xFF;
		animPayload[5] = (loops >>> 8) & 0xFF;

		const chunks = [makeChunk('VP8X', vp8xPayload), makeChunk('ANIM', animPayload)];
		for (const c of anmfChunks) chunks.push(c);

		let bodySize = 0;
		for (const c of chunks) bodySize += c.length;

		// RIFF 標頭：'RIFF' ＋ 長度（不含前 8 bytes）＋ 'WEBP'
		const out = new Uint8Array(12 + bodySize);
		writeFourCC(out, 0, 'RIFF');
		putU32(out, 4, 4 + bodySize);        // 4 = 'WEBP' 這 4 bytes，後面才是 chunks
		writeFourCC(out, 8, 'WEBP');

		let off = 12;
		for (const c of chunks) { out.set(c, off); off += c.length; }

		return new Blob([out], { type: 'image/webp' });
	}

	window.WebpEncoder = {
		encode: encode,
		qualityForColors: qualityForColors,
		isSupported: isSupported
	};
})();
