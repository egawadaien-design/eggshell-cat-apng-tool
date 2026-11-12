/**
 * 蛋殼喵 APNG 工具 — 原圖外框（綠色虛線）
 * @author [DaiEn]
 * @Date: 2026-11-12
 * @Correction: 1
 *
 * 【這個檔在做什麼】
 *   三個工作框（APNG / FX / PNG）的預覽舞台都是棋盤格背景，
 *   圖片放進去以後，使用者看不出「到底哪一塊才是我匯入的圖」，
 *   所以在圖片的可視範圍外面畫一圈綠色虛線框。
 *
 * 【為什麼獨立成一支】
 *   三頁的預覽型態完全不同（<img> / <canvas> / 被 CSS transform 的 canvas），
 *   但「把框對到那個元素的可視矩形」這件事完全一樣，
 *   與其在三支檔案各寫一次 getBoundingClientRect 的換算，不如共用一支。
 *
 * 【為什麼框要畫在 DOM 上，而不是畫進 canvas】
 *   1. canvas 內的線條會跟著圖一起被 CSS 縮放，PNG 頁縮到 25% 時虛線會細到看不見
 *   2. DOM 的虛線寬度固定 2px，缩放/平移都維持清楚
 *   3. pointer-events:none，不會擋到吸取顏色、擦除、拖曳平移這些操作
 *
 * 【兩種框的差別】
 *   aroundTarget()     框＝那個元素目前實際佔的矩形（FX / PNG 用：canvas 本身就是原圖）
 *   aroundFirstSize()  框＝「第一張圖的原始尺寸 × 目前顯示比例」（APNG 用）
 *     APNG 有多格，如果每格都貼著自己的邊界畫框，換格時框會一起跳，
 *     就看不出「這格比第一張大多少、往右偏多少」。所以框固定吃第一張的尺寸，
 *     然後以每格圖片的中心置中 —— 圖片貼齊框代表與第一張等大，超出框就代表比較大。
 */

(function sourceFrame() {
	'use strict';

	const CLASS_NAME = 'source-frame';

	// 取得（必要時建立）舞台裡的框元素
	function getBox(stage) {
		let el = stage.querySelector('.' + CLASS_NAME);
		if (!el) {
			el = document.createElement('div');
			el.className = CLASS_NAME;
			stage.appendChild(el);
		}
		return el;
	}

	// 相對於「舞台的 padding box」定位
	// absolute 子元素的 left/top 是從 padding edge 量起的，所以要把框線寬扣掉
	function place(stage, left, top, width, height) {
		const el = getBox(stage);
		if (!(width > 0) || !(height > 0)) {
			el.style.display = 'none';
			return;
		}
		el.style.display = 'block';
		el.style.left = left + 'px';
		el.style.top = top + 'px';
		el.style.width = width + 'px';
		el.style.height = height + 'px';
	}

	// 目標元素現在看不看得到（還沒載入、被隱藏、尺寸為 0 都視為看不到）
	function visible(target) {
		if (!target) return false;
		if (target.style && target.style.display === 'none') return false;
		const r = target.getBoundingClientRect();
		return r.width >= 1 && r.height >= 1;
	}

	// 取得「目標 − 舞台」的相對座標
	function relative(stage, target) {
		const s = stage.getBoundingClientRect();
		const t = target.getBoundingClientRect();
		return {
			left: t.left - s.left - (stage.clientLeft || 0),
			top: t.top - s.top - (stage.clientTop || 0),
			width: t.width,
			height: t.height
		};
	}

	/**
	 * 框＝目標元素目前的可視外框
	 * 用在 FX（canvas 就是輸出圖）與 PNG（canvas 就是原圖，含 zoom / pan 的 CSS transform）
	 */
	function aroundTarget(stage, target) {
		if (!stage || !visible(target)) {
			hide(stage);
			return;
		}
		const r = relative(stage, target);
		place(stage, r.left, r.top, r.width, r.height);
	}

	/**
	 * 框＝第一張圖的原始尺寸 × 目前顯示比例，並以目標元素的中心置中
	 * 用在 APNG（多格、可能尺寸不同、也可能是 frame-offset 位移過的圖）
	 * @param {Element} stage     預覽舞台
	 * @param {Element} target    目前顯示的那張 <img>
	 * @param {number} firstW     第一張圖的原始寬（px）
	 * @param {number} firstH     第一張圖的原始高（px）
	 */
	function aroundFirstSize(stage, target, firstW, firstH) {
		if (!stage || !visible(target)) {
			hide(stage);
			return;
		}
		const r = relative(stage, target);
		// 目前這張圖被 CSS 縮成多少 → 換算「原始 1px 對應幾個螢幕 px」
		const natW = target.naturalWidth || target.width || 0;
		if (!firstW || !firstH || !natW) {
			// 第一張的尺寸還沒量到（detectFirstImageSize 是 async），先退回貼齊目前這張
			aroundTarget(stage, target);
			return;
		}
		const scale = r.width / natW;
		const w = firstW * scale;
		const h = firstH * scale;
		place(stage,
			r.left + (r.width - w) / 2,
			r.top + (r.height - h) / 2,
			w, h);
	}

	// 沒有圖時把框收起來
	function hide(stage) {
		if (!stage) return;
		const el = stage.querySelector('.' + CLASS_NAME);
		if (el) el.style.display = 'none';
	}

	window.SourceFrame = {
		aroundTarget: aroundTarget,
		aroundFirstSize: aroundFirstSize,
		hide: hide
	};
})();
