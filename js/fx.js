/**
 * 蛋殼喵 APNG 工具 — FX 特效頁
 * @author [DaiEn]
 * @Date: 2026-11-12
 * @Correction: 8
 * 2026-11-12 追加：FX 頁新增「文字」面板，字直接燒進每一格（所見即所送）；
 *                 字一改就重新產格，送到 APNG 頁時字已經在圖上
 *
 * 【設計原則】
 * 1. 本頁只做「選特效 → 調參數 → 預覽 → 送出」，不做編輯（編輯交給 APNG 頁）
 * 2. 延遲固定 100ms，不開放使用者調整（避免送出後被 APNG 頁的預設值蓋掉）
 * 3. 輸出最長邊 ≤ 512px、影格數 ≤ 40
 * 4. 送出時呼叫 apng-frames.js 的 clearAll() + addFiles()，採「取代」模式
 * 5. 全部包在 IIFE：狀態不與 APNG 頁的 files / frameDelays 混用
 * 6. 預覽舞台的綠色外框走 js/source-frame.js（框＝canvas 可視邊界）
 *
 * 【特效架構】
 * 每個特效都是同一條管線裡的一個「配方」：
 *   draw(ctx, p, k, i)
 *   - ctx : 該格畫布的 2D context（尺寸 = W×H）
 *   - p   : 0~1 的播放進度（i / 影格數）
 *   - k   : 0~1 的強度（使用者的 Intensity）
 *   - i   : 第幾格（給需要穩定隨機的特效當種子）
 * 因此新增特效只要往 FX_RECIPES 加一筆，不必改渲染邏輯。
 */

(function () {
	'use strict';

	// ============================================================
	// 常數
	// ============================================================
	const MAX_SIDE = 512;      // 輸出最長邊上限
	const MAX_FRAMES = 40;     // 影格數上限
	const MIN_FRAMES = 5;      // 影格數下限
	const FIXED_DELAY = 100;   // 固定延遲（ms）
	const TAU = Math.PI * 2;

	// ============================================================
	// DOM（沒有 FX 頁就直接退出，避免在其他頁面報錯）
	// ============================================================
	const dropZone = document.getElementById('fxDropZone');
	if (!dropZone) return;

	const fileInput = document.getElementById('fxFileInput');
	const previewArea = document.getElementById('fxPreviewArea');
	const previewStage = document.getElementById('fxPreviewStage');
	const previewInfo = document.getElementById('fxPreviewInfo');
	const canvas = document.getElementById('fxCanvas');
	const ctx = canvas.getContext('2d');
	const timelineBox = document.getElementById('fxTimeline');
	const statusBox = document.getElementById('fxStatus');
	const infoBox = document.getElementById('fxInfo');
	const sendBtn = document.getElementById('fxSendBtn');
	const clearBtn = document.getElementById('fxClearBtn');
	const playBtn = document.getElementById('fxPlayBtn');
	const firstBtn = document.getElementById('fxFirstBtn');
	const prevBtn = document.getElementById('fxPrevBtn');
	const nextBtn = document.getElementById('fxNextBtn');
	const lastBtn = document.getElementById('fxLastBtn');
	const framePosText = document.getElementById('fxFramePosText');
	const frameCountInput = document.getElementById('fxFrameCount');
	const frameCountVal = document.getElementById('fxFrameCountVal');
	const intensityInput = document.getElementById('fxIntensity');
	const intensityVal = document.getElementById('fxIntensityVal');
	const effectList = document.getElementById('fxEffectList');

	// ============================================================
	// 狀態（全部關在這個 IIFE 裡，不外洩到全域）
	// ============================================================
	let sourceImg = null;     // 原始圖片
	let baseCanvas = null;    // 依輸出尺寸縮放後的基準畫布
	let W = 0, H = 0;         // 輸出尺寸
	let frames = [];          // 每格 canvas
	let currentIndex = 0;
	let playing = false;
	let playTimer = null;
	let selectedId = 'shineSweep';   // 預設特效，初始化時再依 FX_RECIPES 校正
	let genToken = 0;         // 打斷舊的生成流程用
	let genTimer = null;      // 參數變更的 debounce
	let genPromise = null;    // 目前這輪生成的 promise（送出前要等它收斂）
	let sending = false;

	// ============================================================
	// 小工具
	// ============================================================
	// 翻譯：優先走全域 t()，key 缺失時回退繁中內建字串
	function tr(key, vars) {
		let s = key;
		if (typeof t === 'function') {
			s = t(key, vars);
			if (s === key) s = key;
		}
		if (vars) {
			for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
		}
		return s;
	}

	function setStatus(msg) {
		if (statusBox) statusBox.textContent = msg || '';
	}

	function setInfo(msg) {
		if (infoBox) infoBox.textContent = msg || '';
	}

	// 開一張離線畫布
	function mkCanvas(w, h) {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	}

	// 極簡 LCG 隨機（同一 seed 每次都得到同樣序列，避免每格亂跳）
	function rnd(seed) {
		let s = (seed * 9301 + 49297) % 233280;
		return function () {
			s = (s * 9301 + 49297) % 233280;
			return s / 233280;
		};
	}

	// 把基準圖置中縮放繪製（scale > 1 會超出畫布，剛好給旋轉／放大類特效補邊）
	function centerScale(c, scale) {
		const w = W * scale, h = H * scale;
		c.drawImage(baseCanvas, (W - w) / 2, (H - h) / 2, w, h);
	}

	// 等一個 animation frame（生成多格時讓 UI 有機會更新）
	function nextFrame() {
		return new Promise(function (resolve) {
			requestAnimationFrame(function () { resolve(); });
		});
	}

	// ============================================================
// 特效配方表（41 個）
// ============================================================
	const FX_RECIPES = [
		{
			id: 'shineSweep', name: 'Shine Sweep',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				// 白色斜向光帶，從左掃到右
				const bandW = Math.max(60, W * 0.35);
				const x = -bandW * 1.6 + p * (W + bandW * 2.2);
				c.save();
				c.beginPath();
				c.moveTo(x, 0);
				c.lineTo(x + bandW, 0);
				c.lineTo(x + bandW - H * 0.5, H);
				c.lineTo(x - H * 0.5, H);
				c.closePath();
				c.clip();
				const g = c.createLinearGradient(x, 0, x + bandW, H * 0.4);
				g.addColorStop(0, 'rgba(255,255,255,0)');
				g.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 * k) + ')');
				g.addColorStop(1, 'rgba(255,255,255,0)');
				c.fillStyle = g;
				c.fillRect(x - bandW, 0, bandW * 3, H);
				c.restore();
			}
		},
		{
			id: 'colorCycle', name: 'Color Cycle',
			draw: function (c, p, k) {
				c.filter = 'hue-rotate(' + (p * 360 * k) + 'deg)';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'pulseGlow', name: 'Pulse Glow',
			draw: function (c, p, k) {
				const amt = 0.5 - 0.5 * Math.cos(p * TAU);
				c.save();
				c.shadowColor = 'rgba(255,255,255,' + (0.85 * amt * k) + ')';
				c.shadowBlur = 12 + 28 * amt * k;
				centerScale(c, 1 + 0.02 * Math.sin(p * TAU));
				c.restore();
			}
		},
		{
			id: 'sparkle', name: 'Sparkle',
			draw: function (c, p, k, i) {
				c.drawImage(baseCanvas, 0, 0);
				const r = rnd(i * 37 + 11);
				const n = Math.round(18 + 40 * k);
				c.save();
				c.globalCompositeOperation = 'lighter';
				for (let j = 0; j < n; j++) {
					const x = r() * W;
					const y = r() * H;
					const s = 1 + r() * 3;
					const tw = 0.4 + 0.6 * Math.abs(Math.sin(p * TAU + r() * TAU));
					c.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.6 * tw) + ')';
					c.fillRect(x, y, s, s);
				}
				c.restore();
			}
		},
		{
			id: 'rainbowWave', name: 'Rainbow Wave',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				const g = c.createLinearGradient(0, 0, W, H);
				for (let s = 0; s <= 6; s++) {
					g.addColorStop(s / 6, 'hsla(' + ((p * 360 + s * 60) % 360) + ',100%,60%,' + (0.55 * k) + ')');
				}
				c.save();
				c.globalCompositeOperation = 'overlay';
				c.fillStyle = g;
				c.fillRect(0, 0, W, H);
				c.restore();
			}
		},
		{
			id: 'bounce', name: 'Bounce',
			draw: function (c, p, k) {
				const dy = -Math.abs(Math.sin(p * TAU)) * H * 0.12 * k;
				c.drawImage(baseCanvas, 0, dy);
			}
		},
		{
			id: 'fade', name: 'Fade',
			draw: function (c, p, k) {
				const a = 1 - (0.85 * k) * (0.5 - 0.5 * Math.cos(p * TAU));
				c.globalAlpha = a;
				c.drawImage(baseCanvas, 0, 0);
				c.globalAlpha = 1;
			}
		},
		{
			id: 'shake', name: 'Shake',
			draw: function (c, p, k, i) {
				const r = rnd(i * 13 + 5);
				const dx = (r() * 2 - 1) * W * 0.03 * k;
				const dy = (r() * 2 - 1) * H * 0.03 * k;
				c.drawImage(baseCanvas, dx, dy);
			}
		},
		{
			id: 'rotate', name: 'Rotate',
			draw: function (c, p) {
				// 放大到 √2 倍，旋轉時四角才不會露出空白
				const s = Math.sqrt(2);
				c.save();
				c.translate(W / 2, H / 2);
				c.rotate(p * TAU);
				c.drawImage(baseCanvas, -W * s / 2, -H * s / 2, W * s, H * s);
				c.restore();
			}
		},
		{
			id: 'colorTint', name: 'Color Tint',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				c.save();
				c.globalCompositeOperation = 'color';
				c.globalAlpha = 0.85 * k;
				c.fillStyle = 'hsl(' + Math.round(p * 360) + ',90%,55%)';
				c.fillRect(0, 0, W, H);
				c.restore();
			}
		},
		{
			id: 'blurWave', name: 'Blur Wave',
			draw: function (c, p, k) {
				const b = (2 + 10 * k) * (0.5 - 0.5 * Math.cos(p * TAU));
				c.filter = 'blur(' + b.toFixed(2) + 'px)';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'pixelate', name: 'Pixelate',
		draw: function (c, p, k) {
				const block = 3 + Math.round(12 * k);
				if (block < 2) {
					c.drawImage(baseCanvas, 0, 0);
					return;
				}
				const tw = Math.max(1, Math.round(W / block));
				const th = Math.max(1, Math.round(H / block));
				const tmp = mkCanvas(tw, th);
				tmp.getContext('2d').drawImage(baseCanvas, 0, 0, tw, th);
				c.imageSmoothingEnabled = false;
				c.drawImage(tmp, 0, 0, tw, th, 0, 0, W, H);
				c.imageSmoothingEnabled = true;
			}
		},
		{
			id: 'scanLines', name: 'Scan Lines',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				c.save();
				c.fillStyle = 'rgba(0,0,0,' + (0.32 * k) + ')';
				for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 2);
				// 緩慢下移的亮帶
				const by = ((p * 1.6) % 1) * (H + 60) - 30;
				const g = c.createLinearGradient(0, by - 30, 0, by + 30);
				g.addColorStop(0, 'rgba(255,255,255,0)');
				g.addColorStop(0.5, 'rgba(255,255,255,' + (0.18 * k) + ')');
				g.addColorStop(1, 'rgba(255,255,255,0)');
				c.globalCompositeOperation = 'lighter';
				c.fillStyle = g;
				c.fillRect(0, by - 30, W, 60);
				c.restore();
			}
		},
		{
			id: 'sepiaFlash', name: 'Sepia Flash',
			draw: function (c, p, k) {
				const s = (0.4 + 0.6 * (0.5 - 0.5 * Math.cos(p * TAU))) * k;
				c.filter = 'sepia(' + s.toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'vignettePulse', name: 'Vignette Pulse',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				const amt = (0.35 + 0.4 * (0.5 - 0.5 * Math.cos(p * TAU))) * k;
				const g = c.createRadialGradient(
					W / 2, H / 2, Math.min(W, H) * 0.28,
					W / 2, H / 2, Math.max(W, H) * 0.75
				);
				g.addColorStop(0, 'rgba(0,0,0,0)');
				g.addColorStop(1, 'rgba(0,0,0,' + amt.toFixed(3) + ')');
				c.fillStyle = g;
				c.fillRect(0, 0, W, H);
			}
		},
		{
			id: 'waveDistort', name: 'Wave Distort',
			draw: function (c, p, k) {
				const amp = W * 0.04 * k;
				for (let y = 0; y < H; y += 4) {
					const dx = Math.sin((y / H) * 8 + p * TAU) * amp;
					c.drawImage(baseCanvas, 0, y, W, 4, dx, y, W, 4);
				}
			}
		},
		{
			id: 'invertFlash', name: 'Invert Flash',
			draw: function (c, p, k) {
				const v = Math.pow(Math.max(0, Math.sin(p * TAU * 3)), 2) * k;
				c.filter = 'invert(' + v.toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
			c.filter = 'none';
			}
		},
		{
			id: 'float', name: 'Float',
			draw: function (c, p, k) {
				const dy = Math.sin(p * TAU) * H * 0.05 * k;
				c.drawImage(baseCanvas, 0, dy);
			}
		},
		{
			id: 'contrastPulse', name: 'Contrast Pulse',
			draw: function (c, p, k) {
				const v = (0.5 - 0.5 * Math.cos(p * TAU)) * k;
				c.filter = 'contrast(' + (1 + 0.8 * v).toFixed(3) + ') saturate(' + (1 + 0.2 * v).toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'filmGrain', name: 'Film Grain',
			draw: function (c, p, k, i) {
				c.drawImage(baseCanvas, 0, 0);
				const r = rnd(i * 71 + 3);
				const dots = Math.round((W * H) / 160);
				const a = 0.10 * k;
				c.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
				for (let j = 0; j < dots; j++) {
					c.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1);
				}
				c.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')';
				for (let j = 0; j < dots; j++) {
					c.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1);
				}
			}
		},
		{
			id: 'rgbGlitch', name: 'RGB Glitch',
			draw: function (c, p, k, i) {
				c.drawImage(baseCanvas, 0, 0);
				const dx = (2 + 10 * k) * Math.sin(p * TAU * 2);
				c.save();
				c.globalCompositeOperation = 'screen';
				c.globalAlpha = 0.35;
				c.filter = 'hue-rotate(120deg)';
				c.drawImage(baseCanvas, dx, 0);
				c.filter = 'hue-rotate(-120deg)';
				c.drawImage(baseCanvas, -dx, 0);
				c.restore();
				// 偶發的水平撕裂
				const r = rnd(i * 29 + 7);
				if (r() > 0.6) {
					const sh = Math.round(H * (0.03 + 0.1 * r()));
					const sy = Math.round(r() * Math.max(1, H - sh));
					const off = (r() * 2 - 1) * W * 0.06 * k;
					c.drawImage(baseCanvas, 0, sy, W, sh, off, sy, W, sh);
				}
			}
		},
		{
			id: 'zoomIn', name: 'Zoom In',
			draw: function (c, p, k) {
				const s = 1 + (0.18 * k) * (0.5 - 0.5 * Math.cos(p * TAU));
				centerScale(c, s);
			}
		},
		{
			id: 'slideLeft', name: 'Slide Left',
			draw: function (c, p) {
				const x = -p * W;
				c.drawImage(baseCanvas, x, 0);
				c.drawImage(baseCanvas, x + W, 0);
			}
		},
		{
			id: 'slideDown', name: 'Slide Down',
			draw: function (c, p) {
				const y = p * H;
				c.drawImage(baseCanvas, 0, y);
				c.drawImage(baseCanvas, 0, y - H);
			}
		},
		{
			id: 'swing', name: 'Swing',
			draw: function (c, p, k) {
				c.save();
				c.translate(W / 2, 0);
				c.rotate(Math.sin(p * TAU) * 0.12 * k);
				c.drawImage(baseCanvas, -W / 2, 0);
				c.restore();
			}
		},
		{
			id: 'colorStrobe', name: 'Color Strobe',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				const f = Math.sin(p * TAU * 6);
				if (f > 0) {
					c.save();
					c.globalCompositeOperation = 'overlay';
					c.globalAlpha = 0.5 * f * k;
					c.fillStyle = 'hsl(' + Math.round((p * 720) % 360) + ',100%,55%)';
					c.fillRect(0, 0, W, H);
					c.restore();
				}
			}
		},
		{
			id: 'breathe', name: 'Breathe',
			draw: function (c, p, k) {
				centerScale(c, 1 + 0.07 * k * Math.sin(p * TAU));
			}
		},
		{
			id: 'shadowPulse', name: 'Shadow Pulse',
			draw: function (c, p, k) {
				const amt = 0.5 - 0.5 * Math.cos(p * TAU);
				c.save();
				c.shadowColor = 'rgba(0,0,0,' + ((0.45 + 0.35 * amt) * k) + ')';
				c.shadowBlur = 10 + 22 * amt * k;
				c.shadowOffsetY = 4 * k;
				centerScale(c, 0.94);
				c.restore();
			}
		},
		{
			id: 'flipAnim', name: 'Flip Anim',
			draw: function (c, p) {
				const sx = Math.cos(p * TAU);
				const ax = Math.abs(sx) < 0.03 ? 0.03 : Math.abs(sx);
				c.save();
				c.translate(W / 2, H / 2);
				c.scale(sx < 0 ? -ax : ax, 1);
				c.drawImage(baseCanvas, -W / 2, -H / 2);
				c.restore();
			}
		},
		{
			id: 'spotlight', name: 'Spotlight',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				// 用一張遮罩畫布做「挖洞」，避免 destination-out 把底圖也挖掉
				const mask = mkCanvas(W, H);
				const m = mask.getContext('2d');
				m.fillStyle = 'rgba(0,0,0,' + (0.78 * k) + ')';
				m.fillRect(0, 0, W, H);
				const cx = W / 2 + Math.cos(p * TAU) * W * 0.28;
				const cy = H / 2 + Math.sin(p * TAU) * H * 0.22;
				const r = Math.min(W, H) * 0.3;
				m.globalCompositeOperation = 'destination-out';
				const g = m.createRadialGradient(cx, cy, 0, cx, cy, r);
				g.addColorStop(0, 'rgba(0,0,0,1)');
				g.addColorStop(1, 'rgba(0,0,0,0)');
				m.fillStyle = g;
				m.beginPath();
				m.arc(cx, cy, r, 0, TAU);
				m.fill();
				c.drawImage(mask, 0, 0);
			}
		},
		{
			id: 'reveal', name: 'Reveal',
			draw: function (c, p) {
				c.save();
				c.beginPath();
				c.rect(0, 0, W * p, H);
				c.clip();
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
				if (p < 1) {
					c.fillStyle = 'rgba(212,112,138,0.9)';
					c.fillRect(Math.max(0, W * p - 1), 0, 2, H);
				}
			}
		},
		{
			id: 'matrixRain', name: 'Matrix Rain',
			draw: function (c, p, k, i) {
				c.drawImage(baseCanvas, 0, 0);
				c.fillStyle = 'rgba(0,0,0,' + (0.25 * k) + ')';
				c.fillRect(0, 0, W, H);
				const fs = Math.max(10, Math.round(Math.min(W, H) / 16));
				const step = fs * 0.9;
				const cols = Math.max(1, Math.floor(W / step));
				const r = rnd(i * 17 + 9);
				c.font = fs + 'px monospace';
				c.textBaseline = 'top';
				for (let col = 0; col < cols; col++) {
					const speed = 0.6 + r() * 0.8;
					const y = (((r() * 1.4) + p * speed) % 1.4) * H - H * 0.2;
					const ch = String.fromCharCode(0x30A0 + Math.floor(r() * 90));
					c.fillStyle = 'rgba(80,255,140,' + (0.55 + 0.45 * k).toFixed(3) + ')';
					c.fillText(ch, col * step, y);
				}
			}
		},
		{
			id: 'ripple', name: 'Ripple',
			draw: function (c, p, k) {
				const cy = H / 2;
				for (let y = 0; y < H; y += 4) {
					const dist = Math.abs(y - cy) / (H / 2);
					const dx = Math.sin(dist * 10 - p * TAU * 2) * W * 0.05 * k * (1 - dist * 0.5);
					c.drawImage(baseCanvas, 0, y, W, 4, dx, y, W, 4);
				}
			}
		},
		{
			id: 'kaleidoscope', name: 'Kaleidoscope',
			draw: function (c, p, k) {
				c.save();
				c.translate(W / 2, H / 2);
				c.rotate(p * TAU * 0.2);
				const n = 6;
				c.globalAlpha = 0.55 + 0.35 * k;
				for (let j = 0; j < n; j++) {
					c.save();
					c.rotate(j * TAU / n);
					c.scale(1, j % 2 ? -1 : 1);
					c.drawImage(baseCanvas, -W / 2, -H / 2);
					c.restore();
				}
				c.restore();
			}
		},
		{
			id: 'dissolve', name: 'Dissolve',
			draw: function (c, p) {
				// 用座標雜湊當機率（不用每格亂數），方塊才會穩定出現而不是閃爍
				const block = 16;
				for (let y = 0; y < H; y += block) {
					for (let x = 0; x < W; x += block) {
						const v = ((Math.floor(x / block) * 73 + Math.floor(y / block) * 151) % 997) / 997;
						if (v < p) {
							const bw = Math.min(block, W - x);
							const bh = Math.min(block, H - y);
							c.drawImage(baseCanvas, x, y, bw, bh, x, y, bw, bh);
						}
					}
				}
			}
		},
		{
			id: 'heartbeat', name: 'Heartbeat',
			draw: function (c, p, k) {
				const beat = function (center) {
					const d = p - center;
					return Math.exp(-(d * d) / 0.006);
				};
				const pulse = Math.max(beat(0.12), 0) + 0.6 * Math.max(beat(0.36), 0);
				centerScale(c, 1 + 0.09 * k * pulse);
			}
		},
		{
			id: 'neonGlow', name: 'Neon Glow',
			draw: function (c, p, k) {
				c.save();
				c.shadowColor = 'hsla(' + ((p * 360) % 360) + ',100%,60%,' + (0.9 * k) + ')';
				c.shadowBlur = 10 + 26 * k;
				c.drawImage(baseCanvas, 0, 0);
				// 疊第二次讓光暈更明顯
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
			}
		},
		{
			id: 'chromaticShift', name: 'Chromatic Shift',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				const off = Math.sin(p * TAU) * 6 * k;
				c.save();
				c.globalCompositeOperation = 'screen';
				c.globalAlpha = 0.3;
				c.filter = 'hue-rotate(90deg)';
				c.drawImage(baseCanvas, off, 0);
				c.filter = 'hue-rotate(-90deg)';
				c.drawImage(baseCanvas, -off, 0);
				c.restore();
			}
		},
		{
			id: 'oldTV', name: 'Old TV',
			draw: function (c, p, k, i) {
				const r = rnd(i * 31 + 17);
				c.save();
				c.translate((r() * 2 - 1) * 2 * k, 0);
				c.filter = 'saturate(' + (1 - 0.25 * k).toFixed(3) + ') brightness(' + (1 + 0.05 * k).toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
				// 掃描線
				c.fillStyle = 'rgba(0,0,0,' + (0.25 * k) + ')';
				for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
				// 滾動亮帶
				const roll = ((p * 1.2) % 1) * H;
				const g = c.createLinearGradient(0, roll - 20, 0, roll + 20);
				g.addColorStop(0, 'rgba(255,255,255,0)');
				g.addColorStop(0.5, 'rgba(255,255,255,' + (0.12 * k) + ')');
				g.addColorStop(1, 'rgba(255,255,255,0)');
				c.fillStyle = g;
				c.fillRect(0, roll - 20, W, 40);
			}
		},
		{
			id: 'liquidWobble', name: 'Liquid Wobble',
			draw: function (c, p, k) {
				for (let y = 0; y < H; y += 4) {
					const dx = Math.sin((y / H) * 6 + p * TAU) * W * 0.05 * k;
					c.drawImage(baseCanvas, 0, y, W, 4, dx, y, W, 4);
				}
			}
		},
		{
			id: 'confettiBurst', name: 'Confetti Burst',
			draw: function (c, p, k) {
				c.drawImage(baseCanvas, 0, 0);
				const palette = ['#ff5c8a', '#ffd166', '#43d9ad', '#4d96ff', '#c77dff', '#ff8fab'];
				const n = 24 + Math.round(36 * k);
				for (let j = 0; j < n; j++) {
					const r = rnd(j * 97 + 5);
					const x0 = r() * W;
					const speed = 0.5 + r() * 1.2;
					const y = ((r() * 0.6 + p * speed) % 1.2) * H - H * 0.1;
					const w = 4 + r() * 6;
					const h = 3 + r() * 5;
					const rot = p * TAU * (1 + r() * 2) + r() * TAU;
					c.save();
					c.translate(x0 + Math.sin(p * TAU + r() * 6) * W * 0.02, y);
					c.rotate(rot);
					c.fillStyle = palette[j % palette.length];
					c.globalAlpha = 0.9;
					c.fillRect(-w / 2, -h / 2, w, h);
					c.restore();
				}
			}
		}
	];

	// ============================================================
	// 特效清單（右側，可上下滑動）
	// ============================================================
	function renderEffectList() {
		effectList.innerHTML = '';
		FX_RECIPES.forEach(function (r, idx) {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'fx-effect-item' + (r.id === selectedId ? ' active' : '');
			btn.dataset.id = r.id;
			const nameEl = document.createElement('span');
			nameEl.textContent = r.name;
			const idxEl = document.createElement('span');
			idxEl.className = 'fx-idx';
			idxEl.textContent = String(idx + 1);
			btn.appendChild(nameEl);
			btn.appendChild(idxEl);
			btn.addEventListener('click', function () {
				selectEffect(r.id);
			});
			effectList.appendChild(btn);
		});
	}

	function selectEffect(id) {
		selectedId = id;
		effectList.querySelectorAll('.fx-effect-item').forEach(function (b) {
			b.classList.toggle('active', b.dataset.id === id);
		});
		if (sourceImg) scheduleGenerate(0);
	}

	// ============================================================
	// 綠色原圖外框（js/source-frame.js）
	// FX 的畫布尺寸就是「這張圖縮到 ≤512 之後的輸出邊界」，
	// 所以框貼著 canvas 的可視矩形即可，不需要另外算比例
	// ============================================================
	function drawSourceFrame() {
		if (!window.SourceFrame) return;
		if (canvas.style.display === 'none' || !W || !H) {
			window.SourceFrame.hide(previewStage);
			return;
		}
		window.SourceFrame.aroundTarget(previewStage, canvas);
	}

	// ============================================================
	// 讀圖：算輸出尺寸（最長邊 ≤ MAX_SIDE）並建立基準畫布
	// ============================================================
	function loadFile(file) {
		if (!file) return;
		if (!/^image\//.test(file.type || '')) {
			setStatus(tr('fxUnsupported'));
			return;
		}
		setStatus('');
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = function () {
			URL.revokeObjectURL(url);
			sourceImg = img;
			const longSide = Math.max(img.naturalWidth, img.naturalHeight);
			const scale = Math.min(1, MAX_SIDE / longSide);
			W = Math.max(1, Math.round(img.naturalWidth * scale));
			H = Math.max(1, Math.round(img.naturalHeight * scale));
			baseCanvas = mkCanvas(W, H);
			baseCanvas.getContext('2d').drawImage(img, 0, 0, W, H);

			canvas.width = W;
			canvas.height = H;
			canvas.style.display = 'block';
			previewInfo.style.display = 'none';
			previewArea.style.display = 'block';
			sendBtn.disabled = false;
			// 綠色原圖外框：FX 的畫布就是「這張圖的輸出邊界」，
			// 所以框直接貼著 canvas 的可視矩形（js/source-frame.js）
			drawSourceFrame();

			scheduleGenerate(0);
		};
		img.onerror = function () {
			URL.revokeObjectURL(url);
			setStatus(tr('fxUnsupported'));
		};
		img.src = url;
	}

	// ============================================================
	// 產生影格（非同步分批，避免卡住 UI）
	// ============================================================
	function scheduleGenerate(delay) {
		if (genTimer) clearTimeout(genTimer);
		genTimer = setTimeout(function () {
			genTimer = null;
			genPromise = generate();
		}, typeof delay === 'number' ? delay : 150);
	}

	async function generate() {
		if (!sourceImg) {
			setStatus(tr('fxNeedImage'));
			return;
		}
		const token = ++genToken;
		stopPlay();

		const recipe = FX_RECIPES.find(function (r) { return r.id === selectedId; });
		const n = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, parseInt(frameCountInput.value, 10) || 20));
		const k = Math.max(0, Math.min(100, parseInt(intensityInput.value, 10) || 0)) / 100;

		const list = [];
		for (let i = 0; i < n; i++) {
			if (token !== genToken) return;  // 中途被新的請求取代
			const cvs = mkCanvas(W, H);
			const cx = cvs.getContext('2d');
			if (recipe) {
				try {
					recipe.draw(cx, i / n, k, i);
				} catch (e) {
					console.error('[FX] 特效繪製失敗:', recipe.id, e);
				}
			} else {
				cx.drawImage(baseCanvas, 0, 0);
			}
			// 文字燒進這一格（fxText 還沒建好時不會有東西）
			if (fxText && fxText.state.text && window.TextOverlay) {
				window.TextOverlay.render(cx, W, H, fxText.state, i + 1, n);
			}
			list.push(cvs);
			if (i % 4 === 0) {
				setStatus(tr('fxGenerating', { n: Math.round((i / n) * 100) }));
				await nextFrame();
			}
		}
		if (token !== genToken) return;

		// 舊影格換掉（canvas 沒有 revoke 問題，交給 GC）
		frames = list;
		buildTimeline();
		showFrame(0);
		stopPlay();   // 預設停在第一格，不自動播放（要看得自己按播放鍵）
		setStatus('');
		setInfo(tr('fxReady', { n: frames.length, w: W, h: H }));
	}

	// ============================================================
	// 影格指示點與播放
	// ============================================================
	function buildTimeline() {
		timelineBox.innerHTML = '';
		if (frames.length === 0) return;
		for (let i = 0; i < frames.length; i++) {
			const dot = document.createElement('div');
			dot.className = 'fx-dot' + (i === 0 ? ' active' : '');
			dot.textContent = String(i + 1);   // 方形塊只顯示影格編號，不畫縮圖
			dot.addEventListener('click', function () {
				stopPlay();
				showFrame(i);
			});
			timelineBox.appendChild(dot);
		}
	}

	function showFrame(i) {
		if (frames.length === 0) return;
		currentIndex = ((i % frames.length) + frames.length) % frames.length;
		ctx.clearRect(0, 0, W, H);
		ctx.drawImage(frames[currentIndex], 0, 0);
		if (framePosText) framePosText.textContent = tr('fxFramePos', { i: currentIndex + 1, n: frames.length });
		timelineBox.querySelectorAll('.fx-dot').forEach(function (d, idx) {
			d.classList.toggle('active', idx === currentIndex);
		});
	}

	// 播放圖示切換（比照 APNG 頁：cat-083 播放、cat-080 暫停）
	function setPlayIcon(isPlaying) {
		if (!playBtn) return;
		playBtn.innerHTML = isPlaying
			? '<small class="cat cat-080 cat-2x cat-color03"></small>'
			: '<small class="cat cat-083 cat-2x cat-color03"></small>';
	}

	function play() {
		if (frames.length === 0) return;
		playing = true;
		setPlayIcon(true);
		tick();
	}

	function tick() {
		if (playTimer) clearTimeout(playTimer);
		playTimer = setTimeout(function () {
			if (!playing) return;
			showFrame(currentIndex + 1);
			tick();
		}, FIXED_DELAY);
	}

	function stopPlay() {
		playing = false;
		setPlayIcon(false);
		if (playTimer) {
			clearTimeout(playTimer);
			playTimer = null;
		}
	}

	// ============================================================
	// 送出到 APNG 頁（取代模式）
	// ============================================================
	async function sendToApng() {
		if (sending) return;
		if (!frames.length) {
			setStatus(tr('fxNeedImage'));
			return;
		}
		// 檢查 APNG 頁的函式是否都在（避免外掛式載入失敗）
		if (typeof clearAll !== 'function' || typeof addFiles !== 'function') {
			setStatus(tr('fxSendFail', { msg: 'APNG functions not found' }));
			return;
		}

		// 先把還在等待／執行中的生成收斂掉，避免送出前一組影格
		if (genTimer) {
			clearTimeout(genTimer);
			genTimer = null;
			genPromise = generate();
		}
		if (genPromise) {
			try { await genPromise; } catch (e) { /* generate 內部已自行處理 */ }
		}

		// APNG 頁已有影格 → 先確認（本頁固定為「取代」）
		let existing = 0;
		try { existing = files.length; } catch (e) { existing = 0; }
		if (existing > 0 && !window.confirm(tr('fxReplaceConfirm'))) return;

		sending = true;
		sendBtn.disabled = true;
		stopPlay();
		setStatus('');

		try {
			// 逐格轉 PNG（File 型態，addFiles() 只認 image/png 的 File）
			const newFiles = [];
			for (let i = 0; i < frames.length; i++) {
				const blob = await new Promise(function (resolve) {
					frames[i].toBlob(resolve, 'image/png');
				});
				if (!blob) throw new Error('toBlob failed');
				newFiles.push(new File(
					[blob],
					'fx-' + String(i + 1).padStart(3, '0') + '.png',
					{ type: 'image/png' }
				));
			}

			clearAll();
			await addFiles(newFiles);

			// addFiles → rebuildPreviews 會把不足的延遲補成 100ms，
			// 這裡再明確覆寫一次，確保「固定 100ms」不被其他預設值影響
			try {
				for (let i = 0; i < frameDelays.length; i++) frameDelays[i] = FIXED_DELAY;
			} catch (e) { /* 忽略：萬一 frameDelays 不在全域 */ }

			if (typeof renderTimeline === 'function') renderTimeline();
			if (typeof showFrame === 'function') showFrame(0);
			if (typeof updatePlaybackInfo === 'function') updatePlaybackInfo();
			if (typeof switchTab === 'function') switchTab('tab-app');

			setStatus(tr('fxSent', { n: newFiles.length }));
		} catch (e) {
			console.error('[FX] 送出失敗:', e);
			setStatus(tr('fxSendFail', { msg: e.message || e }));
		} finally {
			sending = false;
			sendBtn.disabled = frames.length === 0;
		}
	}

	// ============================================================
	// 清空
	// ============================================================
	function clearFx() {
		stopPlay();
		genToken++;
		frames = [];
		currentIndex = 0;
		W = H = 0;
		sourceImg = null;
		baseCanvas = null;
		canvas.width = canvas.height = 0;
		canvas.style.display = 'none';
		// 沒有圖就沒有外框，一起收掉
		if (window.SourceFrame) window.SourceFrame.hide(previewStage);
		previewInfo.style.display = '';
		previewInfo.textContent = tr('fxPreviewEmpty');
		previewArea.style.display = 'none';
		timelineBox.innerHTML = '';
		sendBtn.disabled = true;
		fileInput.value = '';
		setStatus('');
		setInfo('');
	}

	// ============================================================
	// 事件綁定
	// ============================================================
	// 點擊／拖曳上傳
	dropZone.addEventListener('click', function () { fileInput.click(); });
	fileInput.addEventListener('change', function () {
		if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
	});
	['dragover', 'dragenter'].forEach(function (ev) {
		dropZone.addEventListener(ev, function (e) {
			e.preventDefault();
			dropZone.classList.add('dragover');
		});
	});
	['dragleave', 'drop'].forEach(function (ev) {
		dropZone.addEventListener(ev, function (e) {
			e.preventDefault();
			dropZone.classList.remove('dragover');
		});
	});
	dropZone.addEventListener('drop', function (e) {
		const dt = e.dataTransfer;
		if (dt && dt.files && dt.files[0]) loadFile(dt.files[0]);
	});

	// 參數滑桿
	frameCountInput.addEventListener('input', function () {
		frameCountVal.textContent = frameCountInput.value;
		scheduleGenerate(200);
	});
	intensityInput.addEventListener('input', function () {
		intensityVal.textContent = intensityInput.value + '%';
		scheduleGenerate(200);
	});

	// 視窗尺寸改變時 CSS 的 max-width / max-height 會改變顯示比例，綠色外框要重算
	window.addEventListener('resize', drawSourceFrame);

	// 播放控制（FX 頁自己的播放器）
	if (playBtn) {
		playBtn.addEventListener('click', function () {
			if (frames.length === 0) return;
			if (playing) stopPlay(); else play();
		});
	}
	if (firstBtn) {
		firstBtn.addEventListener('click', function () {
			stopPlay();
			showFrame(0);
		});
	}
	if (prevBtn) {
		prevBtn.addEventListener('click', function () {
			stopPlay();
			showFrame(currentIndex - 1);
		});
	}
	if (nextBtn) {
		nextBtn.addEventListener('click', function () {
			stopPlay();
			showFrame(currentIndex + 1);
		});
	}
	if (lastBtn) {
		lastBtn.addEventListener('click', function () {
			stopPlay();
			showFrame(frames.length - 1);
		});
	}

	// 送出／清空
	sendBtn.addEventListener('click', sendToApng);
	clearBtn.addEventListener('click', clearFx);

	// 切到別的 Tab 就暫停 FX 播放，避免背景一直跑 timer
	document.querySelectorAll('[data-tab]').forEach(function (btn) {
		btn.addEventListener('click', function () {
			if (btn.dataset.tab !== 'tab-fx') stopPlay();
		});
	});

	// ============================================================
	// 文字（FX 頁）
	// 這一頁的字是「燒進影格」而不是另外疊一層：
	// 預覽看到什麼，送到 APNG 頁就是什麼，不會有用戶以為有字、結果送出卻沒字的落差。
	// APNG 頁自己的文字面板是另一層後製（兩者要分開，因為一個是特效畫面、一個是事後加字）
	// ============================================================
	let fxText = null;
	(function mountFxTextPanel() {
		const host = document.getElementById('textHostFx');
		if (!host || !window.TextOverlay) return;
		fxText = window.TextOverlay.mount(host, {
			prefix: 'fx',
			// 字一改就要重新產格，否則預覽還是舊的畫面
			onChange: function () { scheduleGenerate(150); }
		});
	})();

	// ============================================================
	// 初始化
	// ============================================================
	selectedId = FX_RECIPES[0].id;
	renderEffectList();
	selectEffect(selectedId);
	frameCountVal.textContent = frameCountInput.value;
	intensityVal.textContent = intensityInput.value + '%';
	setStatus(tr('fxNeedImage'));
})();
