/**
 * 蛋殼喵 APNG 工具 — 編碼輸出
 * PNG CRC32 / acTL 循環次數 / UPNG 編碼 / GIF 輸出 / 動畫 WEBP 觸發 / LINE 規範警告 / 語言重繪
 * @author [DaiEn]
 * @Date: 2026-11-26
 * @Correction: 16
 * 2026-11-26 修正（第 16 版）：APNG／WEBP 減色後「有顏色的地方也變透明」。
 *                 原因：直方圖把「實心（a=255）」與「羽化邊（a<255）」混在一起，
 *                 median-cut 低色數時同一個盒子同時裝著兩者，色票 alpha 取平均（例 233）；
 *                 加上查表只分 8 階 alpha，實心像素常常挑到「顏色比較近」的半透明色票。
 *                 實測：300×300 貼圖在 256 色下 47505 個實心像素有 47504 個掉成半透明。
 *                 改法：① buildSharedPalette 拆成兩份直方圖，實心色票 alpha 固定 255
 *                 ② buildPaletteLut 依 alpha 分兩組候選，實心格只准配不透明色票
 *                 ③ quantizeFrameToIndexed 對 a≥224 一律當實心，alpha 不參與抖動
 * 2026-11-26 修正（第 15 版）：GIF 產出後播放會「拖殘影」——每一格透明的地方露出上一格的像素。
 *                 原因：GIF 的 disposal 設成 0（不處理），而我們的每格都是「整張畫布＋透明背景」，
 *                 disposal 0 等於把前幾格疊起來；gif.js 的 addFrame 根本沒有 dispose 選項（frameDefaults
 *                 只抄 delay／copy），所以它產出的 GIF 也一律是 disposal 0。
 *                 改法：① 自己寫的 GIF 改用 disposal 2（restore to background，每格畫完就清掉）
 *                 ② GIF 一律走 omggif 的全域色表路徑（所有頁面都載入了 omggif），只留 gif.js 當備援
 *                 ③ 沒勾「自動減色」時 GIF 只編一階（「色彩」設定的色數），不再白跑降色流程
 * 2026-11-26 修正（第 14 版）：把「自動減色到 300KB 以下」擴到 GIF／WEBP。
 *                 新增 shrinkGifPalette()／shrinkIndexedGif()／paletteFramesToRgba()／
 *                 buildShrunkGif()／buildShrunkWebp()——
 *                 GIF 走 omggif 的全域色表（整份只帶一張 256 色盤）、Alpha 先二值化再共用調色盤；
 *                 WEBP 先量化成同組顏色再交給 WebpEncoder 的 canvas 編碼（保留 8-bit alpha）。
 *                 兩者都沿用 SHRINK_STEPS／SHRINK_TARGET 逐階降到 300KB；未勾選時原流程完全不動。
 * 2026-11-26 修正（第 13 版）：通用設置新增「自動減色到 300KB 以下」勾選項。
 *                 新增 buildSharedPalette()／buildPaletteLut()／quantizeFrameToIndexed()／
 *                 shrinkChunk()／shrinkCat()／shrinkIhdr()／shrinkFrameData()／buildIndexedApng()／
 *                 buildShrunkApng() —— 全部影格共用一份 4 維 median-cut 調色盤＋4×4 Bayer 抖動，
 *                 自組索引式 APNG（PLTE/tRNS/acTL/fcTL/fdAT），由 256 色逐階降到 16 色，命中 300KB 即停。
 *                 勾選後改走 buildShrunkApng()（async），未勾選仍走原本 UPNG.encode()，行為完全不變。
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
	// 減色過就講「從幾色降到幾色、實際幾 KB」；沒減色維持原本的完成訊息
	if (r.shrink) {
		status.innerHTML = t(r.shrink.over ? 'doneShrinkMiss' : 'doneShrink',
			{n: r.n, from: r.shrink.from, to: r.shrink.to, kb: r.shrink.kb});
	} else {
		status.innerHTML = t('done', {n: r.n});
	}
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
// 自動減色（共用調色盤 ＋ 有序抖動）——2026-11-26
//
// 為什麼不只把 cnum 調小：
//   UPNG.encode(frames, w, h, cnum) 的量化是「每格各自建一份調色盤」，十幾格下來
//   每格都帶一份 256 色盤（PLTE／tRNS 各十幾份），而且完全沒有抖動，
//   色階一砍就是一片斷層。這裡改成自己編：
//     ① 掃「全部影格」建一份共用調色盤——4 維 median-cut（R/G/B/A 一起切），
//        半透明邊緣才不會被壓成同一階 alpha（貼圖的柔和邊就靠這個）
//     ② 對應時加 4×4 Bayer 有序抖動，用空間上的疏密把被砍掉的色階補回來
//     ③ 自己組 APNG：IHDR(調色盤 8bit)＋PLTE＋tRNS＋acTL＋fcTL/IDAT/fdAT，
//        索引值用 pako level 9 壓，濾鏡在 None／Up 之間取小的那個
//     ④ 由 256 色往下逐階試（256→192→128→…→16），一達到 300KB 就停手
//   勾選框沒勾時完全不會走進這裡，輸出與舊版一模一樣。
// ============================================================

const SHRINK_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];  // 4×4 有序抖動矩陣（值 0–15）
const SHRINK_TARGET = 300 * 1024;                                             // 目標：300KB（300×1024）
const SHRINK_STEPS = [256, 192, 128, 96, 64, 48, 32, 24, 16];                 // 依序嘗試的色彩數
const SHRINK_BINS = 1 << 19;                                                  // 直方圖格數：R5+G5+B5+A4 = 19bit

/**
 * 掃描全部影格，建出一份「共用調色盤」。
 *
 * 分成兩組統計（2026-11-26 第 16 版修正）：
 *   ① 實心像素（alpha = 255）→ R5G5B5（15bit）直方圖，色票 alpha 固定 255
 *   ② 半透明像素（alpha 1–254）→ R5G5B5A4（19bit）直方圖，色票 alpha 取該盒平均
 * 以前兩者混在同一份直方圖，低色數時同一個盒子同時裝著「實心」與「羽化邊」，
 * 色票 alpha 就被平均拉低（例：233），整片人物跟著變半透明。
 * 分開之後，實心區永遠拿得到 alpha=255 的色票，羽化邊也還能保有自己的半透明。
 *
 * 排列：索引 0 = 全透明（0,0,0,0），接著是實心色票，最後是半透明色票。
 * buildPaletteLut 就是靠「alpha ≥ 250 與否」分辨這兩組。
 *
 * @param {ArrayBuffer[]} frames 每格 RGBA 像素（ArrayBuffer）
 * @param {number} maxColors 最多幾色（含透明那格，上限 256）
 * @returns {Uint8Array} 調色盤，每 4 bytes 一組 RGBA
 */
function buildSharedPalette(frames, maxColors) {
	const SOLID_BINS = 1 << 15;                                                // R5+G5+B5
	const SOFT_BINS = 1 << 19;                                                 // R5+G5+B5+A4
	// 加總用 Float64Array —— 1080p × 20 格時 32bit 會溢位（255 × 4000 萬 > 2^32）
	const scnt = new Uint32Array(SOLID_BINS);
	const sr = new Float64Array(SOLID_BINS), sg = new Float64Array(SOLID_BINS), sb = new Float64Array(SOLID_BINS);
	const kcnt = new Uint32Array(SOFT_BINS);
	const kr = new Float64Array(SOFT_BINS), kg = new Float64Array(SOFT_BINS);
	const kb = new Float64Array(SOFT_BINS), ka = new Float64Array(SOFT_BINS);

	for (let fi = 0; fi < frames.length; fi++) {
		const d = new Uint8Array(frames[fi]);
		for (let i = 0; i < d.length; i += 4) {
			const a = d[i + 3];
			if (!a) continue;                                             // 全透明像素看不到，不進調色盤（省格數）
			const r = d[i], g = d[i + 1], b = d[i + 2];
			if (a === 255) {
				const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
				scnt[bin]++; sr[bin] += r; sg[bin] += g; sb[bin] += b;
			} else {
				const bin = ((r >> 3) << 14) | ((g >> 3) << 9) | ((b >> 3) << 4) | (a >> 4);
				kcnt[bin]++; kr[bin] += r; kg[bin] += g; kb[bin] += b; ka[bin] += a;
			}
		}
	}

	/**
	 * 通用 median-cut：挑跨度最大的通道從中間切，切到上限或切不動為止。
	 * 不用排序（常見做法要排序），像素多時才不會卡住。
	 * @param {number[]} ids 有像素的格子編號
	 * @param {Uint32Array} cnt 每格像素數
	 * @param {Float64Array[]} sums 每格的通道總和（[r,g,b] 或 [r,g,b,a]）
	 * @param {Function} centerFn (格子, 通道) → 該格中心值
	 * @param {number} nCh 通道數（3 或 4）
	 * @param {number} want 想要幾個盒子
	 * @returns {Array} 盒子（每盒含 list/count/sum/min/max/span）
	 */
	function medianCut(ids, cnt, sums, centerFn, nCh, want) {
		function makeBox(list) {
			let n = 0;
			const sum = [0, 0, 0, 0];
			const min = [255, 255, 255, 255], max = [0, 0, 0, 0];
			for (let k = 0; k < list.length; k++) {
				const id = list[k];
				n += cnt[id];
				for (let ch = 0; ch < nCh; ch++) {
					sum[ch] += sums[ch][id];
					const v = centerFn(id, ch);
					if (v < min[ch]) min[ch] = v;
					if (v > max[ch]) max[ch] = v;
				}
			}
			let span = 0;
			for (let ch = 0; ch < nCh; ch++) if (max[ch] - min[ch] > span) span = max[ch] - min[ch];
			return { list: list, count: n, sum: sum, min: min, max: max, span: span };
		}

		function splitBox(box) {
			let axis = 0, w = 0;
			for (let ch = 0; ch < nCh; ch++) {
				const d = box.max[ch] - box.min[ch];
				if (d > w) { w = d; axis = ch; }
			}
			if (w < 1) return null;
			const cut = (box.min[axis] + box.max[axis]) >> 1;
			const left = [], right = [];
			for (let k = 0; k < box.list.length; k++) {
				const id = box.list[k];
				(centerFn(id, axis) <= cut ? left : right).push(id);
			}
			if (!left.length || !right.length) return null;              // min/max 都是真實存在的值，正常不會空
			return [makeBox(left), makeBox(right)];
		}

		const boxes = [makeBox(ids)];
		while (boxes.length < want) {
			let pick = -1, best = -1;
			for (let i = 0; i < boxes.length; i++) {
				const b = boxes[i];
				if (b.list.length < 2 || b.span < 1) continue;
				const score = b.count * (b.span + 1);
				if (score > best) { best = score; pick = i; }
			}
			if (pick < 0) break;
			const parts = splitBox(boxes[pick]);
			if (!parts) { boxes[pick].span = 0; continue; }
			boxes[pick] = parts[0];
			boxes.push(parts[1]);
		}
		return boxes;
	}

	const solidIds = [], softIds = [];
	for (let i = 0; i < SOLID_BINS; i++) if (scnt[i]) solidIds.push(i);
	for (let i = 0; i < SOFT_BINS; i++) if (kcnt[i]) softIds.push(i);

	// 色數預算：羽化邊最多拿 1/8（至少 2 格、不超過它真正需要的格子數），其餘全給實心區。
	// 貼圖的主體是實心色塊，把色數浪費在邊緣上並不划算。
	const avail = Math.max(1, maxColors - 1);                                // 扣掉「全透明」那一格
	const softBudget = softIds.length ? Math.min(softIds.length, Math.max(2, Math.floor(avail / 8))) : 0;
	const solidBudget = Math.max(0, avail - softBudget);

	const sCenter = (id, ch) =>
		ch === 0 ? (((id >> 10) & 31) << 3) + 4 :
		ch === 1 ? (((id >> 5) & 31) << 3) + 4 : ((id & 31) << 3) + 4;
	const kCenter = (id, ch) =>
		ch === 0 ? (((id >> 14) & 31) << 3) + 4 :
		ch === 1 ? (((id >> 9) & 31) << 3) + 4 :
		ch === 2 ? (((id >> 4) & 31) << 3) + 4 : ((id & 15) << 4) + 8;

	const sBoxes = solidBudget > 0 ? medianCut(solidIds, scnt, [sr, sg, sb], sCenter, 3, solidBudget) : [];
	const kBoxes = softBudget > 0 ? medianCut(softIds, kcnt, [kr, kg, kb, ka], kCenter, 4, softBudget) : [];

	// 調色盤：第 0 格全透明（Uint8Array 預設就是 0），接著實心色票、再接著半透明色票
	const pal = new Uint8Array((1 + sBoxes.length + kBoxes.length) * 4);
	let o = 4;
	for (let i = 0; i < sBoxes.length; i++, o += 4) {
		const b = sBoxes[i];
		pal[o]     = Math.round(b.sum[0] / b.count);
		pal[o + 1] = Math.round(b.sum[1] / b.count);
		pal[o + 2] = Math.round(b.sum[2] / b.count);
		pal[o + 3] = 255;                                                 // 實心色票永遠不透明
	}
	for (let i = 0; i < kBoxes.length; i++, o += 4) {
		const b = kBoxes[i];
		pal[o]     = Math.round(b.sum[0] / b.count);
		pal[o + 1] = Math.round(b.sum[1] / b.count);
		pal[o + 2] = Math.round(b.sum[2] / b.count);
		pal[o + 3] = Math.max(1, Math.min(254, Math.round(b.sum[3] / b.count)));  // 羽化邊保留自己的 alpha
	}
	return pal;
}

/**
 * 為調色盤建一張查表：R4/G4/B4/A3（32768 格）。
 * 每個格子都預先算好「最接近哪一個調色盤索引」，逐像素對應時就是 O(1)，
 * 十幾格 × 幾十萬像素也不會卡。
 *
 * 候選色票依 alpha 分兩組（2026-11-26 第 16 版修正）：
 *   - alpha 格 7（224–255，也就是實心）只准配「不透明色票」（alpha ≥ 250）
 *   - 其餘格子只配「半透明色票」
 * 以前只有一張候選清單，實心像素常常因為「顏色湊巧比較近」挑到半透明色票，
 * 整個人物就跟著透掉；分組之後實心像素永遠配到實心色票，羽化邊也不會被硬拉成不透明。
 *
 * @param {Uint8Array} pal 調色盤（每 4 bytes 一組 RGBA）
 * @returns {Uint16Array} 32768 格的索引表
 */
function buildPaletteLut(pal) {
	const n = pal.length >> 2;
	const opaqueIdx = [], softIdx = [];
	for (let p = 0; p < n; p++) (pal[p * 4 + 3] >= 250 ? opaqueIdx : softIdx).push(p);
	const lut = new Uint16Array(16 * 16 * 16 * 8);
	for (let r = 0; r < 16; r++) {
		const rr = r * 16 + 8;
		for (let g = 0; g < 16; g++) {
			const gg = g * 16 + 8;
			for (let b = 0; b < 16; b++) {
				const bb = b * 16 + 8;
				for (let a = 0; a < 8; a++) {
					const aa = a * 32 + 16;
					// 實心格只挑不透明色票；半透明格只挑半透明色票（那一組空了才互相借用）
					const cand = a === 7 ? (opaqueIdx.length ? opaqueIdx : softIdx)
					                     : (softIdx.length ? softIdx : opaqueIdx);
					let best = cand[0], bestD = Infinity;
					for (let k = 0; k < cand.length; k++) {
						const p = cand[k], o = p * 4;
						const dr = rr - pal[o], dg = gg - pal[o + 1], db = bb - pal[o + 2];
						// alpha 差異權重 ×2：透明邊緣如果配錯顏色，看起來就是一圈髒邊
						const da = (aa - pal[o + 3]) * 2;
						const dist = dr * dr + dg * dg + db * db + da * da;
						if (dist < bestD) { bestD = dist; best = p; }
					}
					lut[(r << 11) | (g << 7) | (b << 3) | a] = best;
				}
			}
		}
	}
	return lut;
}

/**
 * 把一格 RGBA 轉成「調色盤索引」（每像素 1 byte）。
 * a ≥ 224 一律當實心（alpha 不參與抖動），否則抖動會把實心像素推到半透明那一組去。
 * @param {ArrayBuffer} frameBuf 該格 RGBA 像素
 * @param {number} w 寬
 * @param {number} h 高
 * @param {Uint16Array} lut buildPaletteLut() 的結果
 * @param {boolean} dither 是否加有序抖動
 * @returns {Uint8Array} 索引陣列（長度 w*h）
 */
function quantizeFrameToIndexed(frameBuf, w, h, lut, dither) {
	const d = new Uint8Array(frameBuf);
	const out = new Uint8Array(w * h);
	let p = 0;
	for (let y = 0; y < h; y++) {
		const by = (y & 3) * 4;
		for (let x = 0; x < w; x++, p++) {
			const i = p * 4, a = d[i + 3];
			if (!a) { out[p] = 0; continue; }                  // 全透明 → 第 0 格
			let r = d[i], g = d[i + 1], b = d[i + 2], al = a;
			if (a >= 224) al = 255;                            // 近實心：只抖顏色，alpha 不動
			if (dither) {
				// Bayer 值 0–15 → 位移 −8…+8（約半個格距），相鄰像素輪流偏亮／偏暗，
				// 等於用空間疏密把被砍掉的色階補回來；alpha 的格距較粗（32），位移量 ×2
				const off = (SHRINK_BAYER[by + (x & 3)] + 0.5) / 16 * 16 - 8;
				r += off; g += off; b += off;
				if (al !== 255) al += off * 2;
				r = r < 0 ? 0 : r > 255 ? 255 : r;
				g = g < 0 ? 0 : g > 255 ? 255 : g;
				b = b < 0 ? 0 : b > 255 ? 255 : b;
				al = al < 0 ? 0 : al > 255 ? 255 : al;
			}
			out[p] = lut[((r >> 4) << 11) | ((g >> 4) << 7) | ((b >> 4) << 3) | (al >> 5)];
		}
	}
	return out;
}



/** 組一個 PNG chunk：長度(4) + 型別(4) + 資料 + CRC32(4)，CRC 涵蓋型別＋資料 */
function shrinkChunk(type, data) {
	const len = data.length;
	const out = new Uint8Array(12 + len);
	out[0] = (len >>> 24) & 255; out[1] = (len >>> 16) & 255;
	out[2] = (len >>> 8) & 255;  out[3] = len & 255;
	for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
	out.set(data, 8);
	const crc = crc32(out.subarray(4, 8 + len));
	out[8 + len]     = (crc >>> 24) & 255;
	out[9 + len]     = (crc >>> 16) & 255;
	out[10 + len]    = (crc >>> 8) & 255;
	out[11 + len]    = crc & 255;
	return out;
}

/** 把多個 Uint8Array 串成一個 */
function shrinkCat(parts) {
	let total = 0;
	for (let i = 0; i < parts.length; i++) total += parts[i].length;
	const out = new Uint8Array(total);
	let off = 0;
	for (let i = 0; i < parts.length; i++) { out.set(parts[i], off); off += parts[i].length; }
	return out;
}

/** 索引式 PNG 的 IHDR：8bit、color type 3（調色盤）、無交錯 */
function shrinkIhdr(w, h) {
	const d = new Uint8Array(13);
	const dv = new DataView(d.buffer);
	dv.setUint32(0, w); dv.setUint32(4, h);
	d[8] = 8;    // bit depth
	d[9] = 3;    // 3 = indexed-color
	d[10] = 0; d[11] = 0; d[12] = 0;
	return d;
}

/**
 * 一格索引資料 → zlib 壓縮後的 IDAT/fdAT 內容。
 * 濾鏡只試 None 與 Up 兩種（索引圖用這兩種就夠），各壓一次取小的：
 * 大片同色區用 Up 常常能再省一成以上，漸層區則 None 較好。
 * @param {Uint8Array} indices 該格索引
 * @param {number} w 寬
 * @param {number} h 高
 * @returns {Uint8Array} 壓縮後的位元組
 */
function shrinkFrameData(indices, w, h) {
	const none = new Uint8Array(h * (w + 1));
	const up = new Uint8Array(h * (w + 1));
	for (let y = 0; y < h; y++) {
		const src = y * w, dst = y * (w + 1);
		none[dst] = 0;                                         // filter = None
		up[dst] = 2;                                           // filter = Up
		for (let x = 0; x < w; x++) {
			const v = indices[src + x];
			none[dst + 1 + x] = v;
			up[dst + 1 + x] = y ? (v - indices[src - w + x]) & 255 : v;
		}
	}
	const zNone = new Uint8Array(pako.deflate(none, { level: 9 }));
	const zUp = new Uint8Array(pako.deflate(up, { level: 9 }));
	return zUp.length < zNone.length ? zUp : zNone;
}

/**
 * 用「共用調色盤」的索引影格組出 APNG。
 * 結構：簽章 → IHDR → PLTE → tRNS → acTL → fcTL(0) → IDAT → [fcTL(n) → fdAT(n)] → IEND
 * fcTL 與 fdAT 共用同一條遞增序號（APNG 規格要求），延遲用 num/1000 秒表示。
 * @param {Uint8Array[]} framesIdx 每格索引陣列
 * @param {number} w 寬
 * @param {number} h 高
 * @param {Uint8Array} pal 調色盤
 * @param {number[]} delays 每格延遲（毫秒）
 * @param {number} loops 播放次數（0 = 無限）
 * @returns {Uint8Array} 完整 APNG 位元組
 */
function buildIndexedApng(framesIdx, w, h, pal, delays, loops) {
	const parts = [];
	parts.push(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));   // PNG 簽章
	parts.push(shrinkChunk('IHDR', shrinkIhdr(w, h)));

	// PLTE：每色 3 bytes（第 0 格是透明色，RGB 全 0）
	const nPal = pal.length >> 2;
	const plte = new Uint8Array(nPal * 3);
	for (let i = 0; i < nPal; i++) {
		plte[i * 3]     = pal[i * 4];
		plte[i * 3 + 1] = pal[i * 4 + 1];
		plte[i * 3 + 2] = pal[i * 4 + 2];
	}
	parts.push(shrinkChunk('PLTE', plte));

	// tRNS：每格的 alpha；尾端連續 255 可以整段省掉，只留到最後一個非 255 的格子
	let lastAlpha = -1;
	for (let i = 0; i < nPal; i++) if (pal[i * 4 + 3] !== 255) lastAlpha = i;
	if (lastAlpha >= 0) {
		const t = new Uint8Array(lastAlpha + 1);
		for (let i = 0; i <= lastAlpha; i++) t[i] = pal[i * 4 + 3];
		parts.push(shrinkChunk('tRNS', t));
	}

	// acTL：影格總數 + 播放次數（0 = 無限循環，跟 APNG 規格一致）
	const actl = new Uint8Array(8);
	const adv = new DataView(actl.buffer);
	adv.setUint32(0, framesIdx.length);
	adv.setUint32(4, loops || 0);
	parts.push(shrinkChunk('acTL', actl));

	// fcTL：序號 / 尺寸 / 位置 / 延遲 / dispose / blend（整張影格、不混合）
	let seq = 0;
	function fcTL(delay) {
		const d = new Uint8Array(26);
		const dv = new DataView(d.buffer);
		dv.setUint32(0, seq++);
		dv.setUint32(4, w); dv.setUint32(8, h);
		dv.setUint32(12, 0); dv.setUint32(16, 0);
		const num = Math.max(1, Math.min(65535, Math.round(delay || 100)));
		dv.setUint16(20, num); dv.setUint16(22, 1000);
		d[24] = 0; d[25] = 0;
		return d;
	}

	parts.push(shrinkChunk('fcTL', fcTL(delays[0])));
	parts.push(shrinkChunk('IDAT', shrinkFrameData(framesIdx[0], w, h)));
	for (let i = 1; i < framesIdx.length; i++) {
		parts.push(shrinkChunk('fcTL', fcTL(delays[i])));
		const z = shrinkFrameData(framesIdx[i], w, h);
		const fdat = new Uint8Array(4 + z.length);
		new DataView(fdat.buffer).setUint32(0, seq++);
		fdat.set(z, 4);
		parts.push(shrinkChunk('fdAT', fdat));
	}
	parts.push(shrinkChunk('IEND', new Uint8Array(0)));
	return shrinkCat(parts);
}

/**
 * 自動減色主流程：由多到少逐階試色，一達到 300KB 就停。
 * 抖動會讓高頻雜點變多，少數圖片反而變大 —— 超過目標時會再跑一次「無抖動」版本，取小的那個。
 * @param {ArrayBuffer[]} frames 每格 RGBA 像素
 * @param {number} w 寬
 * @param {number} h 高
 * @param {number[]} dels 每格延遲（毫秒）
 * @param {number} loops 播放次數（0 = 無限）
 * @param {number} cnum 「色彩」選單的值（0 = 全彩）；減色的起點不會超過它
 * @returns {Promise<{buf: ArrayBuffer, from: number, to: number, bytes: number, over: boolean}>}
 */
async function buildShrunkApng(frames, w, h, dels, loops, cnum) {
	const from = (Number.isFinite(cnum) && cnum > 0) ? Math.min(cnum, 256) : 256;
	const steps = SHRINK_STEPS.filter(function (n) { return n <= from; });
	let last = null;

	for (let si = 0; si < steps.length; si++) {
		const colors = steps[si];
		status.innerHTML = t('shrinkTrying', { n: colors });
		// 讓狀態列先畫出來；量化＋壓縮是同步的，不讓瀏覽器喘一口看起來就像當掉
		await new Promise(function (r) { setTimeout(r, 0); });

		const pal = buildSharedPalette(frames, colors);
		const lut = buildPaletteLut(pal);
		const idx = [];
		for (let i = 0; i < frames.length; i++) {
			idx.push(quantizeFrameToIndexed(frames[i], w, h, lut, true));
		}
		let out = buildIndexedApng(idx, w, h, pal, dels, loops);

		if (out.length > SHRINK_TARGET) {
			for (let i = 0; i < frames.length; i++) {
				idx[i] = quantizeFrameToIndexed(frames[i], w, h, lut, false);
			}
			const plain = buildIndexedApng(idx, w, h, pal, dels, loops);
			if (plain.length < out.length) out = plain;
		}

		last = { buf: out.buffer, colors: colors, bytes: out.length, over: out.length > SHRINK_TARGET };
		if (!last.over) break;                                 // 達標，不必再往下砍色
	}
	return { buf: last.buf, from: from, to: last.colors, bytes: last.bytes, over: last.over };
}


// ============================================================
// 同一套「共用調色盤＋抖動」搬到 GIF／WEBP（2026-11-26）
//
// GIF：本來就是索引圖，正好整碗端過去——把二值化後的影格用同一份調色盤量化，
//      再用 omggif（站上 head 已載入）寫「全域色表」的 GIF：整份檔案只帶一張 256 色盤，
//      不像 gif.js 每格各自建盤（每格多 768 bytes，色票還會逐格跳動）。
//      GIF 只有 1-bit 透明，所以索引 0 留給透明色，alpha 先照舊二值化（淡入淡出用抖動）。
// WEBP：沒有調色盤這回事，但可以把影格「先量化成同一組顏色」再交給 canvas 編碼，
//      等於讓有損壓縮只處理少量色階，檔案自然變小、也不會逐格偏色。
// 兩者都和 APNG 共用 SHRINK_STEPS／SHRINK_TARGET：逐階降到 300KB 就停手。
// ============================================================

/**
 * 把 RGBA 調色盤轉成 GIF 要的全域色表（0xRRGGBB 陣列）。
 * GIF 規定色表長度必須是 2 的次方且 2–256，所以不足就用黑色補齊（用不到的索引不會出現）。
 * @param {Uint8Array} pal RGBA 調色盤（第 0 格是全透明）
 * @param {number} transparentColor 透明色（給忽略透明設定的檢視器用，與舊版一致）
 * @returns {number[]} 0xRRGGBB 陣列
 */
function shrinkGifPalette(pal, transparentColor) {
	const n = pal.length >> 2;
	let size = 2;
	while (size < n) size <<= 1;
	if (size > 256) size = 256;
	const rgb = [];
	rgb[0] = transparentColor & 0xFFFFFF;          // 索引 0 = 透明色
	for (let i = 1; i < n && i < size; i++) {
		rgb[i] = (pal[i * 4] << 16) | (pal[i * 4 + 1] << 8) | pal[i * 4 + 2];
	}
	for (let i = rgb.length; i < size; i++) rgb[i] = 0;
	return rgb;
}

/**
 * 用「全域色表」把索引影格寫成 GIF（omggif）。
 * 全部影格共用一張色表，整份檔案只有一份 PLTE；透明索引固定 0。
 * @param {Uint8Array[]} framesIdx 每格索引陣列
 * @param {number} w 寬
 * @param {number} h 高
 * @param {number[]} rgbPalette 全域色表（0xRRGGBB）
 * @param {number[]} dels 每格延遲（毫秒）
 * @param {number} loops 播放次數（0 = 無限），換算成 Netscape 區塊
 * @returns {Uint8Array|null} GIF 位元組；omggif 不在時回 null
 */
function shrinkIndexedGif(framesIdx, w, h, rgbPalette, dels, loops) {
	if (typeof GifWriter === 'undefined') return null;
	// gif.js 的 repeat：0 = 無限、-1 = 只播一次、n = 播 n+1 次
	// omggif 的 loop：null = 不寫 Netscape 區塊（只播一次）、0 = 無限、n = 再播 n 次
	let gifLoop = null;
	if (loops === 0) gifLoop = 0;
	else if (loops > 1) gifLoop = loops - 1;

	// omggif 寫進「固定長度的緩衝」：索引 1 byte，LZW 最壞約 1.15 倍＋sub-block 標頭，
	// 這裡先留 1.4 倍，真的不夠再放大（超出範圍的寫入會被 TypedArray 靜默吃掉，不偵測就壞檔）
	let buf = new Uint8Array(Math.ceil(w * h * framesIdx.length * 1.4) + 4096);
	const gw = new GifWriter(buf, w, h, { palette: rgbPalette, loop: gifLoop });

	for (let i = 0; i < framesIdx.length; i++) {
		const p = gw.getOutputBufferPosition();
		const need = Math.ceil(w * h * 1.4) + 4096;
		if (p + need > buf.length) {
			const nb = new Uint8Array(Math.ceil((p + need) * 1.5));
			nb.set(buf.subarray(0, p));
			buf = nb;
			gw.setOutputBuffer(nb);
		}
		gw.addFrame(0, 0, w, h, framesIdx[i], {
			// omggif 的 delay 單位是 1/100 秒（GIF 規格），站上的 dels 是毫秒 → 除以 10
			delay: Math.max(1, Math.min(65535, Math.round((dels[i] || 100) / 10))),
			// disposal 一定要用 2（restore to background）＝每格畫完就清掉，
			// 否則這一格「透明」的區域會露出上一格畫好的像素，播放時就是一層殘影拖在後面
			// （disposal 0 是「不處理」，對有透明區域的動畫來說等於把前幾格疊起來）
			disposal: 2,
			transparent: 0                            // 索引 0 = 透明色
		});
	}
	const len = gw.end();
	return buf.slice(0, len);
}

/**
 * 索引影格 → RGBA 影格（把調色盤顏色填回每個像素），給 WEBP 的 canvas 編碼用。
 * @param {Uint8Array[]} framesIdx 每格索引陣列
 * @param {Uint8Array} pal RGBA 調色盤
 * @returns {ArrayBuffer[]} 每格的 RGBA 像素
 */
function paletteFramesToRgba(framesIdx, pal) {
	const out = [];
	for (let f = 0; f < framesIdx.length; f++) {
		const ix = framesIdx[f];
		const px = new Uint8ClampedArray(ix.length * 4);
		for (let p = 0, o = 0; p < ix.length; p++, o += 4) {
			const q = ix[p] * 4;
			px[o] = pal[q]; px[o + 1] = pal[q + 1]; px[o + 2] = pal[q + 2]; px[o + 3] = pal[q + 3];
		}
		out.push(px.buffer);
	}
	return out;
}

/**
 * GIF 版的自動減色：二值化 → 共用調色盤 → 逐階降到 300KB。
 * @param {ArrayBuffer[]} frames 每格 RGBA 像素
 * @param {number} w 寬
 * @param {number} h 高
 * @param {number[]} dels 每格延遲（毫秒）
 * @param {number} loops 播放次數（0 = 無限）
 * @param {number} cnum 「色彩」選單的值（0 = 全彩）；起點不會超過它
 * @param {number} transparentColor 透明色（0xRRGGBB）
 * @param {boolean} fadeDither 文字淡入淡出時，透明改用抖動（與舊 GIF 行為一致）
 * @param {boolean} [tier=true] true = 由 256 逐階降到 300KB；false = 只編一階（cnum 指定的色數）
 * @returns {Promise<{buf: Uint8Array|null, from: number, to: number, bytes: number, over: boolean, tier: boolean}>}
 */
async function buildShrunkGif(frames, w, h, dels, loops, cnum, transparentColor, fadeDither, tier = true) {
	// GIF 沒有半透明：先把 alpha 二值化（這步與舊版完全一樣，淡入淡出才不會整片消失）
	const bins = [];
	for (let i = 0; i < frames.length; i++) {
		const d = new Uint8ClampedArray(frames[i].slice(0));
		snapAlpha1BitData(d, w, h, 128, fadeDither);
		bins.push(new Uint8Array(d));
	}

	const from = (Number.isFinite(cnum) && cnum > 0) ? Math.min(cnum, 256) : 256;
	// 沒勾自動減色就只跑一階：色數直接用「色彩」設定（全彩＝256）
	const steps = tier ? SHRINK_STEPS.filter(function (n) { return n <= from; }) : [from];
	let last = null;
	for (const colors of steps) {
		if (tier) {
			status.innerHTML = t('shrinkTryingFmt', { fmt: 'GIF', n: colors });
			await new Promise(function (r) { setTimeout(r, 0); });
		}

		const pal = buildSharedPalette(bins, colors);
		const lut = buildPaletteLut(pal);
		const idx = [];
		for (let i = 0; i < bins.length; i++) idx.push(quantizeFrameToIndexed(bins[i], w, h, lut, true));

		const rgb = shrinkGifPalette(pal, transparentColor);
		let out = shrinkIndexedGif(idx, w, h, rgb, dels, loops);
		if (!out) return { buf: null, from: from, to: colors, bytes: 0, over: false, tier: tier };

		// 抖動會多出高頻雜點，GIF 的 LZW 不一定吃這套 → 只有在追 300KB 時才多跑一次無抖動版比大小
		if (tier && out.length > SHRINK_TARGET) {
			for (let i = 0; i < bins.length; i++) idx[i] = quantizeFrameToIndexed(bins[i], w, h, lut, false);
			const plain = shrinkIndexedGif(idx, w, h, rgb, dels, loops);
			if (plain && plain.length < out.length) out = plain;
		}

		last = { buf: out, colors: colors, bytes: out.length, over: out.length > SHRINK_TARGET };
		if (!last.over) break;
	}
	return { buf: last.buf, from: from, to: last.colors, bytes: last.bytes, over: last.over, tier: tier };
}

/**
 * WEBP 版的自動減色：把影格先量化成同一組顏色，再交給 WebpEncoder（canvas 有損編碼）。
 * WebP 本身有 8-bit alpha，所以不二值化，半透明邊緣照樣保留。
 * @param {ArrayBuffer[]} frames 每格 RGBA 像素
 * @param {number} w 寬
 * @param {number} h 高
 * @param {number[]} dels 每格延遲（毫秒）
 * @param {number} loops 播放次數（0 = 無限）
 * @param {number} cnum 「色彩」選單的值（0 = 全彩）
 * @param {Function} [onProgress] 每編完一格的通知
 * @returns {Promise<{blob: Blob|null, from: number, to: number, bytes: number, over: boolean}>}
 */
async function buildShrunkWebp(frames, w, h, dels, loops, cnum, onProgress) {
	if (!window.WebpEncoder) return { blob: null, from: 0, to: 0, bytes: 0, over: true };
	const quality = window.WebpEncoder.qualityForColors(cnum);
	const from = (Number.isFinite(cnum) && cnum > 0) ? Math.min(cnum, 256) : 256;
	let last = null;

	for (const colors of SHRINK_STEPS.filter(function (n) { return n <= from; })) {
		status.innerHTML = t('shrinkTryingFmt', { fmt: 'WEBP', n: colors });
		await new Promise(function (r) { setTimeout(r, 0); });

		const pal = buildSharedPalette(frames, colors);
		const lut = buildPaletteLut(pal);
		const idx = [];
		for (let i = 0; i < frames.length; i++) idx.push(quantizeFrameToIndexed(frames[i], w, h, lut, true));

		const blob = await window.WebpEncoder.encode({
			frames: paletteFramesToRgba(idx, pal),
			w: w, h: h, dels: dels, loops: loops,
			quality: quality, onProgress: onProgress
		});
		if (!blob) return { blob: null, from: from, to: colors, bytes: 0, over: true };

		last = { blob: blob, colors: colors, bytes: blob.size, over: blob.size > SHRINK_TARGET };
		if (!last.over) break;                          // 已在一階之內達標
	}
	return { blob: last.blob, from: from, to: last.colors, bytes: last.bytes, over: last.over };
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
		let buf, shrink = null;
		// 「自動減色到 300KB 以下」勾選時走自建的共用調色盤編碼（見檔頭 buildShrunkApng 那一段）；
		// 沒勾、或 pako 沒載入成功時，完全照舊走 UPNG.encode，輸出與舊版一模一樣
		const autoShrink = document.getElementById('autoShrink');
		if (autoShrink && autoShrink.checked && typeof pako !== 'undefined') {
			const r = await buildShrunkApng(frames, w, h, dels, loops, cnum);
			buf = r.buf;
			shrink = { from: r.from, to: r.to, kb: Math.round(r.bytes / 1024), over: r.over };
		} else {
			buf = UPNG.encode(frames, w, h, cnum, dels);
			// UPNG 不支援 loops，自己事後改 acTL
			if (loops > 0) buf = setApngLoops(buf, loops);
		}

		const blob = new Blob([buf], {type: 'image/apng'});

		// 記住本次生成結果，切換語言時可重繪警告與摘要（見 renderApngWarnings / renderApngSummary）
		lastApngResult = {
			w, h,
			n: frames.length,
			totalMs: dels.reduce((a, b) => a + b, 0),
			loops,
			bytes: blob.size,
			shrink: shrink
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
	if (downloadGifLink) {
		// 第一步：掃所有 frame，收集出現過的 RGB 組合（挑透明色用，兩種路徑共用）
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

		// 有 omggif 就一律走自己寫的 GIF（整份只帶一張全域色表，disposal 也由我們控制）：
		// 勾了「自動減色」才逐階降到 300KB；沒勾就是「色彩」設定那個色數，一次編完
		if (typeof GifWriter !== 'undefined') {
			const gifRes = await buildShrunkGif(frames, w, h, dels, loops, cnum,
				transparentColor, fadeDither, !!(autoShrink && autoShrink.checked));
			if (gifRes.buf) {
				const gifBlob = new Blob([gifRes.buf], { type: 'image/gif' });
				const gifUrl = URL.createObjectURL(gifBlob);
				downloadGifLink.href = gifUrl;
				downloadGifLink.download = 'eggshell-' + randomId(8) + '.gif';
				downloadGifLink.style.display = 'inline-block';
				try { window._currentGifBlob = gifBlob; } catch (e) { /* 分享用，失敗不影響 */ }
				// 狀態列平常會還原成 APNG 的結果；只有「追 300KB」追不到才留在這則提醒
				if (gifRes.tier && gifRes.over) {
					status.innerHTML = t('doneShrinkMissFmt', {
						fmt: 'GIF', to: gifRes.to, kb: Math.round(gifRes.bytes / 1024)
					});
				} else {
					renderApngSummary();
				}
			}
		} else if (typeof GIF !== 'undefined') {

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

			// 勾了「自動減色」→ 先把影格量化成同一組顏色再編（逐階降到 300KB，見 buildShrunkWebp）；
			// 沒勾就照原本的一條直線編碼，品質仍依「色彩」設定
			const autoShrinkOn = !!(document.getElementById('autoShrink') && document.getElementById('autoShrink').checked)
				&& typeof pako !== 'undefined';
			let blob, shrinkInfo = null;
			if (autoShrinkOn) {
				const r = await buildShrunkWebp(
					webpSource.frames, webpSource.w, webpSource.h, webpSource.dels,
					webpSource.loops, webpSource.colors,
					function (done, n) { status.innerHTML = t('webpEncoding', { i: done, n: n }); }
				);
				blob = r.blob;
				if (blob) shrinkInfo = { from: r.from, to: r.to, kb: Math.round(r.bytes / 1024), over: r.over };
			} else {
				blob = await window.WebpEncoder.encode({
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
			}

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

			// 減色過就講「從幾色降到幾色、實際幾 KB」；沒減色維持原本的完成訊息
			if (shrinkInfo) {
				status.innerHTML = t(shrinkInfo.over ? 'doneShrinkMissFmt' : 'doneShrinkFmt', {
					fmt: 'WEBP', from: shrinkInfo.from, to: shrinkInfo.to, kb: shrinkInfo.kb
				});
			} else {
				status.innerHTML = t('webpDone', { kb: Math.round(blob.size / 1024) });
			}
		} catch (err) {
			console.error('[WEBP]', err);
			status.innerHTML = t('webpFail', { msg: err.message || err });
		} finally {
			webpBusy = false;
			downloadWebpLink.style.pointerEvents = '';
		}
	});
}
