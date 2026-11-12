/**
 * 蛋殼喵 APNG 工具 — PNG 靜態貼圖編輯器
 * 去背（flood fill / 全域刪除）/ 橡皮擦 / 縮放平移 / 分割線 / 240×240 與 96×74 輸出
 * @author [DaiEn]
 * @Date: 2026-11-12
 * @Correction: 4
 * 2026-11-12 追加：PNG 頁新增「文字」面板；240×240 與 96×74 兩張輸出各自燒字（burnTextToResult），
 *                 主畫布預覽那一層跟著 applyTransform 重畫（縮放平移時字也貼在圖上）
 *
 * 由原 apng.js 第 1090~1908 行原封不動切出，未改動任何邏輯（自封閉 IIFE）
 * 2026-11-12：接上 js/source-frame.js，預覽舞台畫出原圖的綠色外框（applyTransform 內更新）
 */

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

	// 記錄最後一次「生成靜態貼圖」的檢查數據，供切換語言時重繪警告列
	// 宣告提前到此處，避免前方的 loadImage 等函式取用時踩到 TDZ
	let lastStickerCheck = null;

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
			// 換新圖：把上一張的 LINE 警告與檢查數據一起清掉，避免切換語言時冒出舊警告
			// 注意：這裡用 getElementById 取得節點，不引用下方才宣告的 warnBox（避免 TDZ）
			lastStickerCheck = null;
			const stickerWarnEl = document.getElementById('pngStickerWarn');
			if (stickerWarnEl) stickerWarnEl.style.display = 'none';

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

	// ============================================================
	// 文字（PNG 頁）
	// 這一頁的字最後會燒進 240×240 與 96×74 兩張輸出，
	// 主畫布上疊的那一層只是給眼睛看（跟 APNG 頁同一套做法）
	// ============================================================
	let pngText = null;
	(function mountPngTextPanel() {
		const host = document.getElementById('textHostPng');
		if (!host || !window.TextOverlay) return;
		pngText = window.TextOverlay.mount(host, {
			prefix: 'png',
			onChange: paintPngText,
			// PNG 頁只有一張圖，沒有「第幾格到第幾格」這種事，面板上那兩個輸入框會藏起來
			singleFrame: true
		});
	})();

	function paintPngText() {
		if (!window.TextOverlay) return;
		const st = pngText ? pngText.state : null;
		const area = document.getElementById('pngPreviewArea');
		// 還沒載圖就把疊層收起來，不然字會浮在空白的預覽舞台上
		if (!st || !area || area.style.display === 'none') {
			window.TextOverlay.paintOverlay(previewStage, canvas, null);
			return;
		}
		window.TextOverlay.paintOverlay(previewStage, canvas, st);
	}

	// 燒字到輸出畫布：字級存的是「短邊百分比」，所以 240 與 96 兩張的比例看起來一致
	function burnTextToResult(ctx, w, h) {
		if (!window.TextOverlay || !pngText || !pngText.state.text) return;
		window.TextOverlay.render(ctx, w, h, pngText.state);
	}

	function applyTransform() {
		canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
		canvas.style.transformOrigin = 'center center';
		if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + '%';
		// 綠色原圖外框：這裡的縮放／平移都是 CSS transform，canvas 的元素矩形
		// 已經是最終顯示位置，直接量它最準（js/source-frame.js）
		if (window.SourceFrame) window.SourceFrame.aroundTarget(previewStage, canvas);
		// 文字疊層跟外框一樣靠量 canvas 的最終矩形定位，縮放／平移後要重畫
		paintPngText();
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
		burnTextToResult(ctx240, 240, 240);
		document.getElementById('pngResult240Info').textContent = `${src.width}×${src.height} → 240×240`;
		// 96x74：等比縮放到最大可用寬度，高度自適應
		const c96 = document.getElementById('pngResult96');
		const ctx96 = c96.getContext('2d');
		c96.width = 96; c96.height = 74;
		ctx96.clearRect(0, 0, 96, 74);
		const scale96 = Math.min(96 / src.width, 74 / src.height);
		const dw96 = src.width * scale96, dh96 = src.height * scale96;
		ctx96.drawImage(src, (96 - dw96) / 2, (74 - dh96) / 2, dw96, dh96);
		burnTextToResult(ctx96, 96, 74);
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
		// 視窗尺寸改變 → max-width / max-height 會改變顯示比例，外框要重算
		window.addEventListener('resize', () => {
			if (window.SourceFrame) window.SourceFrame.aroundTarget(previewStage, canvas);
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
		if (liveRgb) liveRgb.textContent = `(${r},${g},${b})`;
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

	// trMsg 與 lastStickerCheck 宣告在檔案上方，避免此處才宣告造成前方函式踩 TDZ

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

		// 記住本次檢查數據，切換語言時可重繪警告列（見 renderPngStickerWarnings）
		lastStickerCheck = { W: stickerCanvas.width, H: stickerCanvas.height, bytes };
		renderPngStickerWarnings();
	});

	// 重繪 PNG 靜態貼圖的 LINE 規範警告列
	// 這些文字是動態產生的、沒有 data-i18n 屬性，applyLang() 掃不到，所以切換語言時要重跑一次
	function renderPngStickerWarnings() {
		if (!warnBox || !lastStickerCheck) return;
		const W = lastStickerCheck.W, H = lastStickerCheck.H, bytes = lastStickerCheck.bytes;

		// 條件檢查：只收集不通過的
		const warns = [];
		// 1. 寬高上限
		if (W > 370 || H > 320) {
			warns.push(trMsg('pngWarnSizeFail', { w: W, h: H }, '圖片超過上限：370×320px（目前 {w}×{h}）'));
		}
		// 2. 檔案大小 1MB
		if (bytes > 1024 * 1024) {
			const mb = (bytes / 1024 / 1024).toFixed(2);
			warns.push(trMsg('pngWarnFileFail', { mb: mb }, '檔案超過 1MB（目前 {mb} MB）'));
		}
		// 3. 偶數
		if (W % 2 !== 0 || H % 2 !== 0) {
			warns.push(trMsg('pngWarnEvenFail', { w: W, h: H }, '寬高需為偶數（目前 {w}×{h}）'));
		}

		// 全部通過 → 不顯示警告框
		if (warns.length === 0) {
			warnBox.style.display = 'none';
			return;
		}
		// 動態生成警告條（先抓起標題節點，清空後再放回，標題才不會跟著被清掉）
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

	// 暴露給 i18n.js 的 applyLang()：切換語言時重繪警告列
	window.renderPngStickerWarnings = renderPngStickerWarnings;

	// 清空：等同右邊重置按鈕
	const clearAllBtn = document.getElementById('pngClear');
	if (clearAllBtn) clearAllBtn.addEventListener('click', () => {
		resetBtn.click();
		// 同時隱藏生成結果
		warnBox.style.display = 'none';
		stickerPreview.style.display = 'none';
		dlPngBtn.style.display = 'none';
		// 清空後不保留檢查數據，否則切換語言會把舊警告又重繪出來
		lastStickerCheck = null;
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
