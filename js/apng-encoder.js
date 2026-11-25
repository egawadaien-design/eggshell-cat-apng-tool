/**
 * 蛋殼喵 APNG 工具 — 編碼輸出
 * PNG CRC32 / acTL 循環次數 / UPNG 編碼 / GIF 輸出 / 動畫 WEBP 觸發 / LINE 規範警告 / 語言重繪
 * @author [DaiEn]
 * @Date: 2026-11-25
 * @Correction: 12
 * 2026-11-25 修正（第 12 版）：生成後預覽會把成品 APNG 放進 previewImg，而文字疊層仍照舊畫一層「靜止」的字在上面，
 *                 兩層字疊在一起（成品那層在淡入淡出、上面那層不動），看起來就是「只停留在第一格」。
 *                 改法：生成時預覽圖加 dataset.baked='1'，apng-frames.js 看到就不再畫這一層；改字時自動切回原圖預覽。
 * 2026-11-25 修正（第 11 版）：GIF 版本在「透明背景 + 淡入淡出」時，還沒淡到全不透明的那幾格字會整片消失。
 *                 原因：GIF 只有 1-bit 透明，snapAlpha1BitData() 用門檻 128 直接把 alpha < 128 的像素刪掉，
 *                 而淡入首格約 1/3（約 85）、第二格約 2/3（約 170），首格的字於是被整片抹掉，
 *                 看起來像「透明區域上的字完全沒畫」，APNG／WEBP 因為保留 8-bit alpha 所以不受影響。
 *                 改法：只有「文字面板有字且開著淡入淡出」時，二值化改走 4×4 有序抖動（Bayer），
 *                 alpha 小的像素按比例留下稀疏像素點 → 在 1-bit 透明下仍看得出濃淡；其餘情況維持原本門檻 128。
 * 2026-11-25 修正：文字面板開啟「淡入淡出」後，整份輸出的文字都停在「首格」的不透明度（約 1/6，看起來像沒渲染），
 *                 若又把「開始格」設成第 2 格之後，輸出會整份都不帶字（預覽卻正常）。
 *                 原因：逐格燒字的迴圈漏了 frameNo++，只沿用上方「預讀第一張尺寸」時加到 1 的殘值，
 *                 等於每一格都拿 index=1 去算可見範圍與淡入 alpha。
 *                 改法：預讀迴圈移除 frameNo++，改在逐格燒字迴圈開頭遞增，索引 1..N 正確對應。
 * 2026-11-24 修正：縮小輸出後 GIF 出現明顯顆粒、邊緣殘留暗點。五處調整（縮小相關只在「輸出尺寸小於原圖」時生效）：
 *                 ① 新增 downscaleHighQuality()：每階最多縮一半的多階縮小（自製 box filter），
 *                    取代原本單步 drawImage 大比例縮小造成的摩爾紋與彩色雜點
 *                 ② bleedTransparent()：alpha=0 像素的 RGB 改成「最近的實體像素顏色」
 *                    （多源 BFS 一圈圈往外擴散；原本是全圖平均色，多色圖片會被單一顏色染掉、邊緣混出灰調），
 *                    縮小時邊緣只會吃到物件自己的顏色
 *                 ③ 新增 decontaminateEdges()：半透明且明顯偏暗的邊緣像素（黑底污染），
 *                    改用周圍實體色的平均 → 邊緣的深色點消失（APNG 也吃這一道，alpha 保持 8-bit 不動）
 *                 ④ GIF 端新增 snapAlpha1Bit()：alpha 二值化（門檻 128）＋移除孤立點，
 *                    1-bit 透明不再留單點暗點；APNG 不做二值化，維持完整透明（8-bit alpha）
 *                 ⑤ gif.js 的 quality 由固定 10 改為依像素量自動 1／3／8（1 = 最細調色盤），
 *                    漸層不再出現彩色顆粒；尺寸等於原圖時行為與舊版完全相同
 * 2026-11-23 修正：GIF 預處理把透明像素填成透明色時，因為 ImageData 直接採用傳入的陣列，
 *                 連 frames[i] 都被改寫成「綠底不透明」，導致後續輸出的 WEBP 整片綠底。
 *                 改成先 slice(0) 複製一份再處理（只影響 GIF，APNG 本來就先編碼所以沒感覺）
 * 2026-11-23 追加：APNG 頁「下載 WEBP」——生成時只暫存像素（webpSource），
 *                 按下按鈕才交給 js/webp-encoder.js 編碼，生成流程不會變慢
 * 2026-11-12 追加：每一格 drawImage 之後、取像素之前先把「文字」燒上去（TextOverlay.instances.app），
 *                 這樣輸出的 APNG 才會帶字，而不只是預覽看得到
 *
 * 由原 apng.js 第 304~360 行與第 859~1088 行原封不動切出，未改動任何邏輯
 * 依賴 apng-frames.js 先載入（使用其 DOM 節點與 files / frameDelays 狀態）
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
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
// 動畫 WEBP：生成時只暫存像素，按下「下載 WEBP」才編碼
// （生成流程維持原樣，不會因為多一個格式而變慢）
// ============================================================
const downloadWebpLink = document.getElementById('downloadWebpLink');
let webpSource = null;          // { frames, w, h, dels, loops, colors }
let webpBusy = false;           // 連點防護：編碼一次要幾百毫秒到數秒

// ============================================================
// 高品質縮圖與邊緣清理（2026-11-24 修正 GIF 顆粒／暗邊）
//
// 顆粒與暗點是四個原因疊出來的：
//   1) 單步 drawImage 從大尺寸直接縮到小尺寸（例如 1080 → 96，11 倍）取樣不足，
//      高頻細節被折疊成摩爾紋／彩色雜點 → 多階縮小（每階最多縮一半）
//   2) 縮小是對 RGBA 逐通道混合，透明區的 RGB（多半是 0,0,0）會被混進邊緣
//      → 縮小前先把透明像素的顏色「向外擴散」成最近的實體色
//   3) 來源圖本身就帶黑底污染（半透明邊的 RGB 偏黑），縮小後被原樣留下
//      → 縮小後把「明顯偏暗的半透明邊緣像素」換成周圍實體色（只修顏色、不動 alpha）
//   4) GIF 只有 1-bit alpha，門檻切完會留下單點暗點
//      → GIF 端二值化後移除孤立點（APNG 不切 alpha，維持完整透明）
// 調色盤太粗造成的彩色顆粒在下面 new GIF({ quality }) 那段處理。
//
// 前三個是 APNG／GIF 共用（只改 RGB，APNG 的 alpha 完全不動）；
// 第四個只掛 GIF。函式都拆成「純資料版（吃 Uint8ClampedArray，可單獨測試）」＋「畫布版」。
// ============================================================

/**
 * 純資料版：alpha=0 像素的 RGB 換成「最近的實體像素顏色」。
 * 用多源 BFS（把不透明像素當起點往外擴散一圈一圈），所以每個透明像素拿到的是
 * 空間上最接近它的那個顏色，不會像掃描式做法那樣「整張被第一個顏色染掉」。
 * 一張圖有紅、藍兩個物件時，紅邊的透明區會吃到紅、藍邊吃到藍，不會混成灰。
 *
 * 效能（1080×1080 約 100ms 級別）：每個像素最多入列／出列一次，
 * 佇列用 Int32Array 預先配好，不做動態 push/pop 陣列；平均色只在取樣下算，
 * 只當「BFS 真的到不了的孤島」的底色。
 * @param {Uint8ClampedArray} d RGBA 像素資料（就地修改）
 * @param {number} w 寬
 * @param {number} h 高
 */
function bleedTransparentData(d, w, h) {
	const len = d.length, row = w * 4, total = w * h;
	const mask = new Uint8Array(total);        // 1 = 顏色已確定
	const q = new Int32Array(total);           // BFS 佇列（每個像素最多放一次）
	let qh = 0, qt = 0, solid = 0;

	// 起點：所有不透明像素
	for (let p = 0, i = 0; p < total; p++, i += 4) {
		if (d[i + 3] === 0) continue;
		mask[p] = 1; q[qt++] = p; solid++;
	}
	if (!solid) return;                        // 整張全透明：沒有顏色可借

	// 一圈一圈往外擴散（4 鄰域：上下左右，行為最穩定）
	while (qh < qt) {
		const p = q[qh++];
		const si = p * 4, sr = d[si], sg = d[si + 1], sb = d[si + 2];
		const x = p % w, y = (p - x) / w;
		if (x > 0) {
			const np = p - 1;
			if (!mask[np]) { const ni = np * 4; d[ni] = sr; d[ni + 1] = sg; d[ni + 2] = sb; mask[np] = 1; q[qt++] = np; }
		}
		if (x < w - 1) {
			const np = p + 1;
			if (!mask[np]) { const ni = np * 4; d[ni] = sr; d[ni + 1] = sg; d[ni + 2] = sb; mask[np] = 1; q[qt++] = np; }
		}
		if (y > 0) {
			const np = p - w;
			if (!mask[np]) { const ni = np * 4; d[ni] = sr; d[ni + 1] = sg; d[ni + 2] = sb; mask[np] = 1; q[qt++] = np; }
		}
		if (y < h - 1) {
			const np = p + w;
			if (!mask[np]) { const ni = np * 4; d[ni] = sr; d[ni + 1] = sg; d[ni + 2] = sb; mask[np] = 1; q[qt++] = np; }
		}
	}

	// 保險：BFS 到不了的透明像素（極端孤島）鋪一層取樣平均色，避免留原始黑色
	if (qt < total) {
		let ar = 0, ag = 0, ab = 0, n = 0;
		for (let i = 0; i < len; i += 12) {
			if (d[i + 3] !== 0) continue;
			ar += d[i]; ag += d[i + 1]; ab += d[i + 2]; n++;
		}
		if (n) {
			ar = Math.round(ar / n); ag = Math.round(ag / n); ab = Math.round(ab / n);
			for (let p = 0, i = 0; p < total; p++, i += 4) {
				if (mask[p]) continue;
				d[i] = ar; d[i + 1] = ag; d[i + 2] = ab;
			}
		}
	}
}

/**
 * 純資料版：把「半透明且明顯偏暗」的邊緣像素，RGB 換成周圍實體色。
 * 只處理 0 < alpha < 255 的像素，alpha 完全不動 → APNG 的柔和邊不會被破壞。
 * 判斷方式「亮度比周圍不透明鄰居低 24 以上」才換：物件自己的深色不會被抹掉，
 * 真正修掉的是黑底／黑邊污染（那種「半透明卻發黑」的像素）。
 * @param {Uint8ClampedArray} d RGBA 像素資料（就地修改）
 * @param {number} w 寬
 * @param {number} h 高
 * @returns {number} 實際修改的像素數（除錯／量測用）
 */
function decontaminateEdgesData(d, w, h) {
	let fixed = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const p = y * w + x, i = p * 4, a = d[i + 3];
			if (a === 0 || a === 255) continue;          // 全透明看不到、全不透明不需修
			let r = 0, g = 0, b = 0, n = 0;
			for (let dy = -1; dy <= 1; dy++) {
				const ny = y + dy;
				if (ny < 0 || ny >= h) continue;
				for (let dx = -1; dx <= 1; dx++) {
					const nx = x + dx;
					if (nx < 0 || nx >= w) continue;
					if (!dx && !dy) continue;                // 自己不算
					const j = (ny * w + nx) * 4;
					if (d[j + 3] < 200) continue;            // 只信「幾乎不透明」的鄰居
					r += d[j]; g += d[j + 1]; b += d[j + 2]; n++;
				}
			}
			if (!n) continue;                            // 四周沒有實體色可借（孤立半透明點）→ 不動
			r /= n; g /= n; b /= n;
			const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
			const lref = 0.299 * r + 0.587 * g + 0.114 * b;
			if (lum < lref - 24) {                       // 暗超過門檻 → 判定為黑邊污染
				d[i] = r; d[i + 1] = g; d[i + 2] = b;
				fixed++;
			}
		}
	}
	return fixed;
}

/**
 * 純資料版：GIF 用的 1-bit alpha。先二值化，再移除孤立點。
 * 孤立點 = 不透明像素的 8 鄰居裡，不透明者 ≤1 個（也就是 1px 大小的雜點）；
 * 這種點在 1-bit 透明下就是邊緣的一顆暗點，直接抹掉最乾淨。
 * dither 打開時改走 4×4 有序抖動（Bayer）：半透明像素按 alpha 比例留下稀疏的點，
 * 在只有「透明／不透明」兩種狀態的 GIF 裡也能看出濃淡，淡入淡出的前幾格才不會整片不見。
 * @param {Uint8ClampedArray} d RGBA 像素資料（就地修改）
 * @param {number} w 寬
 * @param {number} h 高
 * @param {number} [threshold=128] alpha 門檻：≥ 門檻算不透明
 * @param {boolean} [dither=false] 是否用有序抖動取代硬門檻
 */
function snapAlpha1BitData(d, w, h, threshold = 128, dither = false) {
	// 4×4 抖動矩陣，值域 0..15；同一格的相鄰像素會輪到不同的門檻，
	// 人眼看起來就是一整片「淡」，而不是一堆規律的方格
	const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const a = d[i + 3];
			if (a === 255) continue;
			if (dither) {
				// 用 alpha/255 當「留下來的比例」，愈淡的像素點愈稀；這樣 GIF 的濃淡才對得上原圖，
				// 淡入的 1/3、2/3 兩格會分別剩下約 33%、67% 的點，而不是全部消失或全部實心
				if (a < 32) { d[i + 3] = 0; continue; }
				const t = BAYER[(y & 3) * 4 + (x & 3)];
				const cut = 255 * (t + 0.5) / 16;
				d[i + 3] = a > cut ? 255 : 0;
			} else {
				d[i + 3] = a >= threshold ? 255 : 0;
			}
		}
	}
	// 先拍快照再判斷，避免「邊修邊連鎖」把整條細線一起吃掉
	const mask = new Uint8Array(w * h);
	for (let p = 0, i = 0; p < mask.length; p++, i += 4) mask[p] = d[i + 3] ? 1 : 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const p = y * w + x;
			if (!mask[p]) continue;
			let n = 0;
			for (let dy = -1; dy <= 1; dy++) {
				const ny = y + dy;
				if (ny < 0 || ny >= h) continue;
				for (let dx = -1; dx <= 1; dx++) {
					const nx = x + dx;
					if (nx < 0 || nx >= w) continue;
					if (!dx && !dy) continue;
					if (mask[ny * w + nx]) n++;
				}
			}
			// 抖動模式下單點是「濃淡」的一部分，不能當雜點清掉，否則字會越抖越淡
			if (n <= 1 && !dither) d[p * 4 + 3] = 0;   // 孤立點 → 當雜點去掉
		}
	}
}

/**
 * 畫布版：把 alpha=0 像素的 RGB 擴散成最近實體色
 * @param {CanvasRenderingContext2D} ctx 來源畫布（會被就地修改）
 * @param {number} w 寬
 * @param {number} h 高
 */
function bleedTransparent(ctx, w, h) {
	const img = ctx.getImageData(0, 0, w, h);
	bleedTransparentData(img.data, w, h);
	ctx.putImageData(img, 0, 0);
}

/**
 * 畫布版：修掉半透明邊緣的深色污染
 * @param {CanvasRenderingContext2D} ctx 目標畫布（會被就地修改）
 * @param {number} w 寬
 * @param {number} h 高
 */
function decontaminateEdges(ctx, w, h) {
	const img = ctx.getImageData(0, 0, w, h);
	if (decontaminateEdgesData(img.data, w, h)) ctx.putImageData(img, 0, 0);
}

/**
 * 高品質縮小成 tw × th 的新畫布（多階 box filter）。
 * 尺寸與原圖相同時直接原樣輸出，行為等於舊版的一次 drawImage。
 * @param {ImageBitmap} bitmap 原圖
 * @param {number} tw 目標寬
 * @param {number} th 目標高
 * @returns {HTMLCanvasElement} 已縮放完成的畫布（可直接 getImageData 取像素）
 */
function downscaleHighQuality(bitmap, tw, th) {
	const sw = bitmap.width, sh = bitmap.height;

	// 沒有要縮小 → 原樣輸出，不做白工（也避免多一次重取樣造成微微變糊）
	if (sw === tw && sh === th) {
		const same = document.createElement('canvas');
		same.width = tw; same.height = th;
		same.getContext('2d').drawImage(bitmap, 0, 0);
		return same;
	}

	// 先畫進一張「原尺寸」畫布：ImageBitmap 不可就地改像素，而 bleed 需要改像素
	const base = document.createElement('canvas');
	base.width = sw; base.height = sh;
	const bctx = base.getContext('2d');
	bctx.drawImage(bitmap, 0, 0);
	bleedTransparent(bctx, sw, sh);

	// 逐階縮小：每階最多縮一半，縮到「目標的兩倍以內」就停
	let cur = base, cw = sw, ch = sh;
	while (cw > tw * 2 || ch > th * 2) {
		const nw = Math.max(tw, Math.floor(cw / 2));   // 不會縮過頭：最小就是最終目標
		const nh = Math.max(th, Math.floor(ch / 2));
		const c = document.createElement('canvas');
		c.width = nw; c.height = nh;
		const x = c.getContext('2d');
		x.imageSmoothingEnabled = true;                // 一定要開，關掉會變成 nearest，顆粒更兇
		x.imageSmoothingQuality = 'high';              // 讓瀏覽器用較好的濾波器（Lanczos 近似）
		x.drawImage(cur, 0, 0, nw, nh);
		cur = c; cw = nw; ch = nh;
	}

	// 最後一階：從接近目標的尺寸縮到精確尺寸（比例已 ≤2，取樣足夠）
	const out = document.createElement('canvas');
	out.width = tw; out.height = th;
	const octx = out.getContext('2d');
	octx.imageSmoothingEnabled = true;
	octx.imageSmoothingQuality = 'high';
	octx.drawImage(cur, 0, 0, cw, ch, 0, 0, tw, th);

	// 縮完才修暗邊：這時邊緣的半透明像素已經是「最終解析度」的樣子，
	// 修顏色最直接。APNG／GIF 共用這道（只動 RGB，不動 alpha）
	decontaminateEdges(octx, tw, th);
	return out;
}


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
		let frameNo = 0;
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

		// 文字狀態（APNG 頁）整段流程共用一份：燒字與 GIF 的二值化策略都要看它
		const textSt = (window.TextOverlay && window.TextOverlay.instances.app)
			? window.TextOverlay.instances.app.state : null;
		// GIF 只有 1-bit 透明，半透明的淡入淡出字會被門檻 128 整片刪掉；
		// 只有「有字 + 開了淡入淡出」才改用有序抖動，其餘情況維持原本的硬邊處理
		const fadeDither = !!(textSt && textSt.text && textSt.fade);

		// 每張圖縮放後取 RGBA，丟給 UPNG.encode
		for (const f of files) {
			// 逐格遞增（1 起算）：淡入淡出的透明度、以及「顯示第幾格到第幾格」
			// 全靠這個索引在 TextOverlay.render() 裡算，漏了遞增就會整組都當成第 1 格
			frameNo++;
			const bitmap = await createImageBitmap(f);
			if (bitmap.width !== srcW || bitmap.height !== srcH) {
				throw new Error(t('sizeMismatch', {name: f.name, w1: bitmap.width, h1: bitmap.height, w2: srcW, h2: srcH}));
			}
			// 縮小改走多階 box filter（見上方 downscaleHighQuality 的說明）；
			// 目標尺寸與原圖相同時，它會原樣輸出一張同尺寸畫布，行為與舊版一致
			const canvas = downscaleHighQuality(bitmap, targetW, targetH);
			const ctx = canvas.getContext('2d');

			// 文字（APNG 頁）：先把字燒在這一格上再取像素，
			// 這樣 UPNG 收到的就已經是有字的畫面；預覽那邊只是疊一層透明 canvas 給眼睛看，
			// 兩邊都吃同一份 state（短邊 % 的字級），所以「看到什麼就會輸出什麼」
			// 逐格傳「第幾格 / 共幾格」，只有落在指定範圍的那幾格才燒字
			if (textSt && textSt.text) {
				window.TextOverlay.render(ctx, targetW, targetH, textSt, frameNo, files.length);
			}

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
		// 標記「預覽現在播的是已經烤好字的成品」：apng-frames.js 的 paintTextOverlay()
		// 看到這個標記就不再疊那一層預覽文字，否則成品動畫自己在淡入淡出、上面又壓一層靜止的字，
		// 看起來就會像「淡入淡出沒生效、字停在某一格」
		previewImg.dataset.baked = '1';
		previewImg.src = url;
		renderApngSummary();
		downloadLink.href = url;
		downloadLink.download = 'eggshell-' + randomId(8) + '.png';
		downloadLink.style.display = 'inline-block';

		// 分享按鈕：把 blob 存到全域變數，給 modal 用
		try {
			window._currentApngBlob = blob;
			window._currentApngUrl = url;
			// 只有在分享白名單網域（且 Supabase 啟用）時才顯示分享按鈕
			if (window.SHARE_ALLOWED) {
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
			// gif.js 的 quality 是「調色盤取樣係數」：1 = 最細（每個像素都參與建盤）、30 = 最粗，
			// 不是視覺品質也不是檔案大小。原本固定 10 等於只依 1/10 的像素分佈去分配 256 色，
			// 縮小後的漸層與細節就會出現彩色顆粒（這正是「顆粒感」的主因之一）。
			// 依輸出像素量折衷：小圖求品質、大圖保速度（240×240 是 LINE 貼圖最常見的尺寸）
			const gifPixels = w * h;
			const gifQuality = gifPixels <= 240 * 240 ? 1 : (gifPixels <= 500 * 500 ? 3 : 8);
			const gif = new GIF({
				workers: 2,
				quality: gifQuality,
				workerScript: 'js/gif.worker.js',
				transparent: transparentColor,
				repeat: gifRepeat
			});
			for (let i = 0; i < frames.length; i++) {
				const c = document.createElement('canvas');
				c.width = w; c.height = h;
				const ctx = c.getContext('2d');
				// frames[i] 是 ArrayBuffer，直接傳給 Uint8ClampedArray／ImageData 只會建「檢視」，
				// 而 ImageData 依規範是「直接採用」傳進來的陣列（不複製），
				// 下面把透明像素填成透明色時就會連 frames[i] 一起洗掉——
				// 導致後面「下載 WEBP」拿到的是綠底不透明的像素（APNG 因為先編碼才沒事）。
				// 所以這裡一定要先 slice(0) 複製一份，GIF 的預處理不准動到原始影格。
				const imgData = new ImageData(new Uint8ClampedArray(frames[i].slice(0)), w, h);
				// GIF 只有 1-bit 透明：先二值化（門檻 128）＋移除孤立點。
				// 少了這步，半透明邊緣切完會留下一顆一顆的深色雜點（就是「邊緣暗點」）
				// 但「淡入淡出」的字本身就是半透明，硬門檻會把它整片刪掉（透明背景上尤其明顯），
				// 所以那種情況改走有序抖動，用像素密度表現濃淡
				snapAlpha1BitData(imgData.data, w, h, 128, fadeDither);
				// 把透明像素填成選定的透明色，同時把 alpha 改成 255（不透明）
				// 否則 gif.js 看不到那個像素（因為 alpha=0），會把背景填成黑色
				for (let p = 0; p < imgData.data.length; p += 4) {
					if (imgData.data[p + 3] === 0) {
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

		// 記住這一輪的像素，等使用者按「下載 WEBP」才編碼
		// 品質沿用「色彩」選單的語意（WebP 沒有調色盤，全彩＝0.9、256 色＝0.8、128 色＝0.7）
		// 這裡只存 cnum，品質在按下按鈕時才算——語言分頁的薄殼是動態插入 script，
		// 載入順序不保證，避免 webp-encoder.js 還沒到就先鎖死品質
		webpSource = {
			frames: frames,
			w: w,
			h: h,
			dels: dels.slice(),
			loops: loops,
			colors: Number.isFinite(cnum) ? cnum : 0
		};
		if (downloadWebpLink) downloadWebpLink.style.display = 'inline-block';

	} catch (err) {
		status.innerHTML = t('err', {msg: err.message});
		console.error(err);
		
	} finally {
		makeBtn.disabled = false;
	}
});

// ============================================================
// 下載 WEBP：按下才編碼
// 第一格就編不出 WebP（blob.type 不是 image/webp）＝這台瀏覽器不支援，
// 直接顯示提示即可，按鈕本身不隱藏（它只是「額外下載」功能，APNG 仍是主線）
// ============================================================
if (downloadWebpLink) {
	downloadWebpLink.addEventListener('click', async function (e) {
		e.preventDefault();                     // <a> 沒有 href，仍攔一下避免被當成跳頁
		if (webpBusy) return;                   // 編碼中再點一次會排隊做兩份，擋掉

		if (!webpSource || !window.WebpEncoder) {
			status.innerHTML = t('webpFail', { msg: 'WebpEncoder not loaded' });
			return;
		}

		webpBusy = true;
		downloadWebpLink.style.pointerEvents = 'none';
		try {
			const total = webpSource.frames.length;
			status.innerHTML = t('webpEncoding', { i: 0, n: total });

			const blob = await window.WebpEncoder.encode({
				frames: webpSource.frames,
				w: webpSource.w,
				h: webpSource.h,
				dels: webpSource.dels,
				loops: webpSource.loops,
				quality: window.WebpEncoder.qualityForColors(webpSource.colors),
				// 每編完一格就更新狀態列，讓使用者知道沒有卡住
				onProgress: function (done, n) {
					status.innerHTML = t('webpEncoding', { i: done, n: n });
				}
			});

			if (!blob) {
				status.innerHTML = t('webpUnsupported');
				return;
			}

			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'eggshell-' + randomId(8) + '.webp';
			document.body.appendChild(a);
			a.click();
			a.remove();
			// 下載已開始才回收；太早 revoke 會讓部分瀏覽器抓到空檔
			setTimeout(function () { URL.revokeObjectURL(url); }, 30000);

			status.innerHTML = t('webpDone', { kb: Math.round(blob.size / 1024) });
		} catch (err) {
			console.error('[WEBP]', err);
			status.innerHTML = t('webpFail', { msg: err.message || err });
		} finally {
			webpBusy = false;
			downloadWebpLink.style.pointerEvents = '';
		}
	});
}
