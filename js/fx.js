/**
 * 蛋殼喵 APNG 工具 — FX 特效頁
 * @author [DaiEn]
 * @Date: 2026-11-13
 * @Correction: 46
 * 2026-11-13 修正：漫畫效果的「精細度」範圍從 1~10 拉大到 1~20（再細一倍），
 *   門檻改成等比下降 `55 × 0.9^(精細度-1)`（1 只剩主輪廓、10 柔和照片也有完整線條、20 連淡漸層都抓得到），預設改 10
 * 上次修正：新增第 34 支特效「漫畫效果 Comic Ink」——原圖慢慢變成只剩線條的線稿，中段停留一下再回到原圖；
 *   專屬設定：精細度（邊緣門檻）、線條粗細、墨色濃度、底色（透明／白色）；
 *   線稿用全解析度的亮度差偵測畫成一張遮罩畫布並快取，每格只做一次 drawImage
 * 上次修正：dissolve（溶解消散）改成「一去一回」的完整循環——崩解 → 畫面全空 → 方塊由少到多拼回完整圖；
 *   包絡 `phase = sin(πp)`（p=0／p=1 都是 0，浮點尾巴壓成 0），密度改成指數 `1/(0.5+密度)` 控制崩解急緩
 * 上次修正：sliceSplit（切割）改成「一去一回」的完整循環——撕開飛散 → 畫面全空 → 原路飛回拼好，
 *   包絡用 sin 的正半波再平方（`q = sin(πp)^(2/速度)`），頭尾都是貼齊狀態，APNG 循環看不到接縫
 * 上次修正：新增第 33 支特效「切割 Slice Split」：切線垂直於移動方向，切片一條往右一條往左飄出畫面；
 *   參數＝切割數量（1~20）、方向（沿用滑入那支 0°~360° 角度滑桿）、速度（1~3，改的是起步衝勁）
 * 上次修正：shadowPulse 的陰影改成「只照不透明輪廓投影」——先把底圖 alpha 抽成黑色輪廓，再偏移＋模糊；
 *   透明區完全不會生出陰影（先前是把底圖連陰影一起丟給 canvas，半透明羽邊會跟著糊進去、濃度也不好抓）
 * 上次修正：kaleidoscope 旋轉圈數只給整數（1~3 圈，預設 1 圈），結尾 360° 等於開頭 0°，循環不再跳格
 * 上次修正：paramText 對 step < 1 的滑桿改成保留小數（流速 0.3、旋轉 0.2 圈不再被四捨五入成 0）
 * 上次修正：reveal 改成「揭開後繼續往同方向移動直到消失」（用一條圖寬的窗口掃過，一圈一次循環）
 * 上次修正：dissolve 的顆粒大小改用專屬 key（paramGrainSize），面板不再顯示籠統的「大小」
 * 2026-11-13 修正：spotlight 加「半徑／繞行幅度」、reveal 加「方向（沿用滑入的角度規格）／速度」、dissolve 改成「完整圖→消散→全空」並加「顆粒大小／密度」
 * 上次修正：swing 加「擺幅／次數」、colorStrobe 加「頻閃次數／色相圈數」、heartbeat 加「幅度／節拍間隔／次數」
 * 上次修正：四支「強度×波形」類特效（sepiaFlash／vignettePulse／invertFlash／contrastPulse）補上強度與次數設定
 * 上次修正：pixelate 改成「原圖 → 馬賽克 → 原圖」的循環（新增循環次數），格線透明度跟著包絡
 * 上次修正：染色 colorTint 加「色相／圈數／強度」、朦朧波動 blurWave 加「模糊／圈數」、馬賽克 pixelate 加「方塊大小／格線」
 * 上次修正：旋轉 rotate 加「圈數／轉向」、放大 zoomIn 加「縮放幅度／循環次數」
 * 上次修正：震動 shake 加上專屬設定（幅度／方向／頻率）
 * 上次修正：向左滑入＋向下滑入合併成「滑入 slideIn」（角度 0~360° + 速度），33 → 32
 * 上次修正：刪掉視覺太接近的四支（呼吸縮放／漣漪／底片顆粒／霓虹光暈），37 → 33
 * 上次修正：特效合併 41 → 37（liquidWobble 併入 waveDistort、chromaticShift 併入 rgbGlitch、
 *           scanLines 併入 oldTV、bounce 併入 float），四支改成參數化後各自保留原有效果
 * 上次修正：rainbowWave 加上四個專屬設定（色帶數量／角度／流動圈數／混合模式），
 *           漸層改成「沿指定角度、長度取畫布投影」以免斜著放時露角
 * 上次修正：狀態列／預覽提示／影格位置文字改成記 key（setStatusKey）＋ refreshLangTexts()，
 *           切語言時一併重翻（原本只有 data-i18n 節點會換，狀態列永遠停在載入時那個語言）
 * 上次修正：特效名稱多語言（effectName()）＋修正英／日／泰介面仍冒出中文名——
 *           原本靠 <html lang> 判斷，但清單在 applyLang() 之前就畫好，改成問 i18n 的 getLang()，
 *           並在 applyLang() 時呼叫 fxRenderEffectList() 重畫清單
 * 上次修正：pulseGlow 加上四個專屬設定（光暈半徑／脈動次數／縮放幅度／光暈顏色），
 *           顏色參數存 #rrggbb，畫的時候用 media-utils.js 的共用 hexToRgba() 補透明度
 * 上次修正：colorCycle 改成「色相走完整整 turns 圈」讓循環頭尾銜接，並加上圈數／轉向兩個專屬設定；
 *           參數機制新增下拉選單（type: select）
 * 上次修正：「特效設定」標題的特效名稱改成獨立 span（.fx-param-name），小字＋淡色當副標
 * 上次修正：「特效設定」標題改成「特效設定 特效名稱」的順序（名稱在後），沒有獨立設定的特效只顯示「特效設定」
 * 上次修正：shineSweep 的角度參數開到 -90°～0°（-90° 光帶完全垂直、0° 完全水平）
 * 上次修正：新增「特效設定」參數機制（recipe.params／paramStore／renderParams）；shineSweep 改成「整張畫布轉到光帶座標系再畫」——光帶長度、寬度都超出畫布，
 *           漸層沿光帶的寬度方向（斜向）淡掉，畫面上不再出現直線斷面
 * 上次修正：fade 的透明度曲線改成「淡入 → 顯現 → 淡出」三段包絡
 *           （舊版 1 - (0.85k)(0.5 - 0.5cos(2πp)) 是「顯現 → 淡出 → 淡入」，順序相反）
 * 上次修正：FX 頁新增「文字」面板，字直接燒進每一格（所見即所送）；
 *           字一改就重新產格，送到 APNG 頁時字已經在圖上
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
	const paramGroup = document.getElementById('fxParamGroup');
	const paramBody = document.getElementById('fxParamBody');
	const paramTitle = document.getElementById('fxParamTitle');

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

	// 特效名稱：中文語系優先取 i18n 的 fxName_*，其他語系（英／日／泰）直接顯示英文原名。
	//
	// 【踩過的坑 2026-11-13】一開始是用 <html lang> 判斷，結果英／日／泰介面還是冒出中文名。
	// 原因是清單在「fx.js 載入當下」就畫好了，那時 applyLang() 還沒跑（html lang 還是 index.html
	// 寫死的 zh-TW），等語言套用上去時清單早就定版了。所以改成直接問 i18n 目前語言
	// （window.getLang()），並且在 applyLang() 結束時叫 window.fxRenderEffectList() 重畫一次清單。
	// 退一萬步，只有在連 getLang 都拿不到時（例如單獨拿這支檔案測試）才回頭讀 html lang。
	function effectName(recipe) {
		if (!recipe) return '';
		let lang = '';
		if (typeof window.getLang === 'function') lang = String(window.getLang() || '');
		if (!lang && document.documentElement) lang = String(document.documentElement.lang || '');
		lang = lang.toLowerCase();
		// 只有 zh / zh-tw / zh-cn 這類才顯示中文名，其餘一律英文原名
		if (lang.indexOf('zh') !== 0) return recipe.name;
		const key = 'fxName_' + recipe.id;
		const s = tr(key);
		return (s && s !== key) ? s : recipe.name;
	}

	// 記住「目前狀態列是哪一條訊息（key ＋ 變數）」。
	// 狀態列的內容是程式寫進去的，沒有 data-i18n，切語言時只重掃 DOM 不會動到它，
	// 所以要留一份 key，切語言時再翻一次（見 refreshLangTexts）
	let statusSpec = null;

	/**
	 * 設定狀態列，並記住對應的 i18n key 以便切語言時重翻。
	 * @param {string} key i18n key，傳空字串等於清空狀態列
	 * @param {Object} [vars] {變數} 插值用
	 */
	function setStatusKey(key, vars) {
		statusSpec = key ? { key: key, vars: vars || null } : null;
		if (statusBox) statusBox.textContent = key ? tr(key, vars) : '';
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

	// 漫畫特效用：把底圖掃一遍，先把「線稿」畫成一張跟輸出同尺寸的遮罩畫布（只算一次，之後每一格共用）
	// 原理是最簡單的邊緣偵測：每個像素跟左右鄰居比亮度差、跟上下的鄰居比亮度差，
	// 差距夠大就當成「這裡有條線」，差越大線越黑（所以對比強的輪廓會比淡邊更明顯）
	// threshold 由「精細度」決定：越大只留越明顯的大輪廓，越小連細碎的花紋都會變線
	function comicInkMask(lineWidth, threshold) {
		const mask = mkCanvas(W, H);
		const mctx = mask.getContext('2d');
		let src;
		try {
			src = baseCanvas.getContext('2d').getImageData(0, 0, W, H).data;
		} catch (e) {
			return mask;
		}
		// 亮度（含 alpha 加權）：全透明的地方當成 0，才不會把「透明的邊界」也畫成一條線
		function lum(x, y) {
			if (x < 0 || y < 0 || x >= W || y >= H) return 0;
			const i = (y * W + x) * 4;
			return ((src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) * src[i + 3]) / 255;
		}
		const half = lineWidth / 2;
		mctx.fillStyle = '#000000';
		// 邊界那一圈不比對（沒有鄰居），直接跳過
		for (let y = 1; y < H - 1; y++) {
			for (let x = 1; x < W - 1; x++) {
				const gx = lum(x + 1, y) - lum(x - 1, y);
				const gy = lum(x, y + 1) - lum(x, y - 1);
				const mag = Math.sqrt(gx * gx + gy * gy);
				if (mag < threshold) continue;
				// 線條粗細的做法：以這一像素為中心畫一個 lineWidth 大小的方塊，相鄰的點自然連成筆畫
				mctx.globalAlpha = Math.min(1, mag / 150);
				mctx.fillRect(x - half, y - half, lineWidth, lineWidth);
			}
		}
		return mask;
	}

	// 等一個 animation frame（生成多格時讓 UI 有機會更新）
	function nextFrame() {
		return new Promise(function (resolve) {
			requestAnimationFrame(function () { resolve(); });
		});
	}

	// ============================================================
// 特效配方表（34 個）
// ============================================================
	const FX_RECIPES = [
		{
			id: 'shineSweep', name: 'Shine Sweep',
			// 斜光掃過：把整張畫布轉到光帶自己的座標系再畫
			//   局部 x ＝ 光帶長軸（左下 → 右上）
			//   局部 y ＝ 光帶的寬度方向 ＝ 漸層方向（跟光帶垂直，也就是斜著淡掉）
			// 舊版是「平行四邊形 clip ＋ 一條方向對不齊的斜漸層」，光帶的側邊在畫布中間
			// 會留下直線斷面；這裡光帶長度、寬度都刻意超出畫布，畫面上只會看到柔和的漸層。
			// 參數：角度（0° = 光帶水平、-90° = 光帶垂直，中間就是斜的）、光帶寬度
			params: [
				{ key: 'angle', i18n: 'paramAngle', min: -90, max: 0, step: 1, def: -63, unit: '°' },
				{ key: 'band', i18n: 'paramBandWidth', min: 15, max: 55, step: 1, def: 28, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);

				const diag = Math.sqrt(W * W + H * H);
				const bandPct = (o && typeof o.band === 'number') ? o.band : 28;
				const bandW = Math.max(90, diag * bandPct / 100);   // 光帶寬度：預設 28% 對角線
				const angle = (((o && typeof o.angle === 'number') ? o.angle : -63) * Math.PI) / 180;
				const cos = Math.cos(angle), sin = Math.sin(angle);

				// 光帶中心沿「寬度方向」掃過：起點在畫面外，終點也在畫面外
				const reach = Math.abs(sin) * W / 2 + Math.abs(cos) * H / 2 + bandW / 2 + 2;
				const offset = -reach + p * reach * 2;

				// 光帶沿長軸要夠長，讓兩端都落在畫布外
				const halfLen = Math.abs(cos) * W / 2 + Math.abs(sin) * H / 2 + bandW;

				c.save();
				c.translate(W / 2, H / 2);
				c.rotate(angle);
				c.translate(0, offset);

				const g = c.createLinearGradient(0, -bandW / 2, 0, bandW / 2);
				g.addColorStop(0, 'rgba(255,255,255,0)');
				g.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 * k) + ')');
				g.addColorStop(1, 'rgba(255,255,255,0)');
				c.fillStyle = g;
				c.fillRect(-halfLen, -bandW / 2, halfLen * 2, bandW);
				c.restore();
			}
		},
		{
			id: 'colorCycle', name: 'Color Cycle',
			// 專屬設定：每輪繞幾圈（只收整數，才會跟第一格接得順）、轉向
			params: [
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{
					key: 'dir', i18n: 'paramDirection', type: 'select', def: 1,
					options: [
						{ v: 1, i18n: 'dirCW' },
						{ v: -1, i18n: 'dirCCW' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const dir = (o && o.dir === -1) ? -1 : 1;
				// 色相走完整整 turns 圈：每一格的間隔固定是 360*turns/格數，
				// 最後一格剛好差一步回到原色，所以循環播放時頭尾接得順。
				// 舊版把圈數乘上強度 k（hue = 360*p*k），k 不是整數時會停在半途，
				// 一循環顏色就突然跳回原色，看起來就是頭尾沒有接在一起。
				const hue = 360 * turns * dir * p;
				c.drawImage(baseCanvas, 0, 0);
				if (k > 0) {
					// 強度改成「上色比重」：疊一層色相偏移的圖，k 越大越明顯；
					// 色相本身永遠走整圈，所以任何 k 都不會破壞頭尾銜接
					c.save();
					c.globalAlpha = Math.min(1, k);
					c.filter = 'hue-rotate(' + hue + 'deg)';
					c.drawImage(baseCanvas, 0, 0);
					c.restore();
				}
			}
		},
		{
			id: 'pulseGlow', name: 'Pulse Glow',
			// 專屬設定：光暈半徑、脈動次數、縮放幅度、光暈顏色
			params: [
				{ key: 'glow', i18n: 'paramGlowRadius', min: 10, max: 90, step: 2, def: 40, unit: 'px' },
				{ key: 'pulses', i18n: 'paramPulses', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'breathe', i18n: 'paramZoom', min: 0, max: 8, step: 1, def: 2, unit: '%' },
				{
					key: 'color', i18n: 'paramColor', type: 'select', def: '#ffffff',
					options: [
						{ v: '#ffffff', i18n: 'colorWhite' },
						{ v: '#ff9ec4', i18n: 'colorPink' },
						{ v: '#ffd479', i18n: 'colorGold' },
						{ v: '#9fd8ff', i18n: 'colorBlue' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				// 脈動次數取整數：整數圈才會每格間隔一致，循環播放頭尾不會突然跳一下
				const pulses = Math.round((o && typeof o.pulses === 'number') ? o.pulses : 1);
				const glow = (o && typeof o.glow === 'number') ? o.glow : 40;
				const breathe = (o && typeof o.breathe === 'number') ? o.breathe : 2;
				const color = (o && o.color) ? o.color : '#ffffff';
				const amt = 0.5 - 0.5 * Math.cos(p * TAU * pulses);   // 0 → 1 → 0
				c.save();
				c.shadowColor = hexToRgba ? hexToRgba(color, 0.85 * amt * k) : color;
				c.shadowBlur = glow * amt * k;                        // 半徑由使用者決定，亮度仍跟強度走
				centerScale(c, 1 + (breathe / 100) * Math.sin(p * TAU * pulses));
				c.restore();
			}
		},
		{
			id: 'sparkle', name: 'Sparkle',
			// 專屬設定：星點數量、星點大小、閃爍速度、星點顏色
			params: [
				{ key: 'count', i18n: 'paramCount', min: 10, max: 120, step: 2, def: 60 },
				{ key: 'size', i18n: 'paramSize', min: 2, max: 8, step: 1, def: 4, unit: 'px' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 4, step: 1, def: 1 },
				{
					key: 'color', i18n: 'paramColor', type: 'select', def: '#ffffff',
					options: [
						{ v: '#ffffff', i18n: 'colorWhite' },
						{ v: '#ff9ec4', i18n: 'colorPink' },
						{ v: '#ffd479', i18n: 'colorGold' },
						{ v: '#9fd8ff', i18n: 'colorBlue' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const count = (o && typeof o.count === 'number') ? o.count : 60;
				const size = (o && typeof o.size === 'number') ? o.size : 4;
				// 閃爍速度取整數：整數圈頭尾才接得上，半圈的話最後一格會跟第一格差一截
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				const color = (o && o.color) ? o.color : '#ffffff';
				// 數量仍然跟強度走（k=0 時只剩約四成五），不然低強度也滿天星、看不出差別
				const n = Math.round(count * (0.45 + 0.55 * k));
				const r = rnd(i * 37 + 11);
				c.save();
				c.globalCompositeOperation = 'lighter';
				for (let j = 0; j < n; j++) {
					const x = r() * W;
					const y = r() * H;
					// 大小：1px 起跳，往上抽到使用者設的上限（舊版寫死 1 + r()*3，等於上限 4）
					const s = 1 + r() * (size - 1);
					// 每一顆星給一個固定相位，再乘上速度跑幾個整圈 → 閃爍頻率可調又不會亂跳
					const tw = 0.4 + 0.6 * Math.abs(Math.sin(p * TAU * speed + r() * TAU));
					const alpha = 0.25 + 0.6 * tw;
					c.fillStyle = hexToRgba ? hexToRgba(color, alpha) : 'rgba(255,255,255,' + alpha + ')';
					c.fillRect(x, y, s, s);
				}
				c.restore();
			}
		},
		{
			id: 'rainbowWave', name: 'Rainbow Wave',
			// 專屬設定：色帶數量、角度、流動圈數、混合模式
			params: [
				{ key: 'bands', i18n: 'paramBands', min: 2, max: 8, step: 1, def: 6 },
				{ key: 'angle', i18n: 'paramAngle', min: -90, max: 90, step: 1, def: 45, unit: '°' },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{
					key: 'blend', i18n: 'paramBlend', type: 'select', def: 'overlay',
					options: [
						{ v: 'overlay', i18n: 'blendOverlay' },
						{ v: 'soft-light', i18n: 'blendSoftLight' },
						{ v: 'screen', i18n: 'blendScreen' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const bands = Math.round((o && typeof o.bands === 'number') ? o.bands : 6);
				// 圈數取整數：色相要走完整圈，循環播放頭尾才接得上（跟 colorCycle 同一個道理）
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const blend = (o && o.blend) ? o.blend : 'overlay';
				// 角度：0° 由左往右、90° 由上往下、45° 就是舊版的左上→右下
				const angle = (o && typeof o.angle === 'number') ? o.angle : 45;
				const rad = angle * Math.PI / 180;
				const dx = Math.cos(rad);
				const dy = Math.sin(rad);
				// 漸層要蓋滿整張畫布：取方向在畫布上的投影長度，短邊那側也不會露出一角沒上色
				const len = Math.abs(W * dx) + Math.abs(H * dy);
				const cx = W / 2;
				const cy = H / 2;
				const g = c.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
				// 色帶：bands 段，每段轉 360/bands 度，湊起來剛好一整圈彩虹
				for (let s = 0; s <= bands; s++) {
					const hue = (p * 360 * turns + (s * 360) / bands) % 360;
					g.addColorStop(s / bands, 'hsla(' + hue + ',100%,60%,' + (0.55 * k) + ')');
				}
				c.save();
				c.globalCompositeOperation = blend;
				c.fillStyle = g;
				c.fillRect(0, 0, W, H);
				c.restore();
			}
		},
		{
			id: 'fade', name: 'Fade',
			// 淡入 → 顯現 → 淡出（三段包絡）
			// 前 30% 從透明淡到全顯、中段維持全顯、後 30% 再淡回透明，
			// 這樣第一格是「空的」、最後一格也淡掉，循環播放時不會突然跳出來
			// 舊版用 1 - (0.85k)(0.5-0.5cos) 是「顯現 → 淡出 → 淡入」，順序相反，已改掉
			params: [
				{ key: 'fadeLen', i18n: 'paramFadeLength', min: 15, max: 50, step: 1, def: 30, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const fadeLen = ((o && typeof o.fadeLen === 'number') ? o.fadeLen : 30) / 100;   // 淡入／淡出各佔整段的比例
				const floor = 1 - Math.min(1, Math.max(0, k));   // k=0 完全不淡、k=1 淡到全透明
				let env;                          // 包絡：0 = 全透明，1 = 全顯
				if (p < fadeLen) {
					env = p / fadeLen;                        // 淡入：0 → 1
				} else if (p > 1 - fadeLen) {
					env = (1 - p) / fadeLen;                  // 淡出：1 → 0
				} else {
					env = 1;                                  // 中段：全顯
				}
				c.globalAlpha = floor + (1 - floor) * env;
				c.drawImage(baseCanvas, 0, 0);
				c.globalAlpha = 1;
			}
		},
		{
			id: 'shake', name: 'Shake',
			// 專屬設定：幅度、方向（水平／垂直／雙向）、頻率
			// 舊版固定是「雙向 3%、每一格都換位置」；預設值刻意保留同樣的長相，
			// 想收斂成單一方向或讓它頓一下再跳，就調方向與頻率
			params: [
				{ key: 'amp', i18n: 'paramAmplitude', min: 1, max: 10, step: 1, def: 3, unit: '%' },
				{
					key: 'axis', i18n: 'paramAxis', type: 'select', def: 'both',
					options: [
						{ v: 'h', i18n: 'dirHorizontal' },
						{ v: 'v', i18n: 'dirVertical' },
						{ v: 'both', i18n: 'dirBoth' }
					]
				},
				// 頻率不掛「次」這種中文單位，否則英／日／泰語系會露出中文，只留純數字
				{ key: 'freq', i18n: 'paramFrequency', min: 4, max: 40, step: 1, def: 40 }
			],
			draw: function (c, p, k, i, o) {
				const amp = ((o && typeof o.amp === 'number') ? o.amp : 3) / 100;
				const axis = (o && o.axis) ? o.axis : 'both';
				// 頻率 = 一整圈之內換幾次位置；取整數段的種子，頻率低時相鄰影格會停在同一處
				const freq = Math.round((o && typeof o.freq === 'number') ? o.freq : 40);
				const seg = Math.floor(p * freq);
				const r = rnd(seg * 131 + 17);
				const dx = (axis === 'v') ? 0 : (r() * 2 - 1) * W * amp * k;
				const dy = (axis === 'h') ? 0 : (r() * 2 - 1) * H * amp * k;
				c.drawImage(baseCanvas, dx, dy);
			}
		},
		{
			id: 'rotate', name: 'Rotate',
			// 專屬設定：圈數（整圈才接得順）、轉向（順時針／逆時針）
			params: [
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{
					key: 'dir', i18n: 'paramDirection', type: 'select', def: 1,
					options: [
						{ v: 1, i18n: 'dirCW' },
						{ v: -1, i18n: 'dirCCW' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const dir = (o && o.dir === -1) ? -1 : 1;
				// 放大到 √2 倍，旋轉時四角才不會在轉動中露出空白
				const s = Math.sqrt(2);
				c.save();
				c.translate(W / 2, H / 2);
				// 角度 = 轉向 × 進度 × 整圈 × 圈數：整數圈讓最後一格剛好轉回原角度，循環不看接縫
				c.rotate(dir * p * TAU * turns);
				c.drawImage(baseCanvas, -W * s / 2, -H * s / 2, W * s, H * s);
				c.restore();
			}
		},
		{
			id: 'colorTint', name: 'Color Tint',
			// 專屬設定：色相（從哪個顏色開始跑）、流動圈數、染色強度
			params: [
				{ key: 'hue', i18n: 'paramHue', min: 0, max: 360, step: 10, def: 0, unit: '°' },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 85, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const hue = (o && typeof o.hue === 'number') ? o.hue : 0;
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 85) / 100;
				c.drawImage(baseCanvas, 0, 0);
				c.save();
				// 'color' 混合只吃色相與飽和度，畫面原本的明暗層次會留著，看起來像「換色」而不是「蓋色」
				c.globalCompositeOperation = 'color';
				c.globalAlpha = strength * k;
				// 色相 = 起始色相 + 進度 × 整圈 × 圈數，取 360 餘數繞回 0，循環時顏色接得順
				c.fillStyle = 'hsl(' + Math.round((hue + p * 360 * turns) % 360) + ',90%,55%)';
				c.fillRect(0, 0, W, H);
				c.restore();
			}
		},
		{
			id: 'blurWave', name: 'Blur Wave',
			// 專屬設定：模糊大小、波動圈數
			params: [
				{ key: 'blur', i18n: 'paramBlur', min: 2, max: 24, step: 1, def: 12, unit: 'px' },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const blur = (o && typeof o.blur === 'number') ? o.blur : 12;
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				// 清晰 → 模糊 → 清晰：cos 波形頭尾都是 0，所以起點與終點都是原圖，循環看不到跳動
				const b = blur * k * (0.5 - 0.5 * Math.cos(p * TAU * turns));
				c.filter = 'blur(' + b.toFixed(2) + 'px)';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'pixelate', name: 'Pixelate',
			// 專屬設定：方塊大小（馬賽克最重時的格子邊長）、循環次數、格線
			// 走法：原圖 → 格子慢慢變大（越糊）→ 縮回細格（回到原圖），一整段是一個循環
			// 波形用 cos，p=0 與 p=1 都停在 1px（等於沒馬賽克），所以循環頭尾都是乾淨的原圖
			params: [
				{ key: 'size', i18n: 'paramSize', min: 3, max: 30, step: 1, def: 15, unit: 'px' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'grid', i18n: 'paramGrid', min: 0, max: 50, step: 1, def: 0, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const size = Math.round((o && typeof o.size === 'number') ? o.size : 15);
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const grid = ((o && typeof o.grid === 'number') ? o.grid : 0) / 100;
				// 包絡 0 → 1 → 0：0 的時候格子 1px（原圖）、1 的時候格子等於設定的方塊大小
				const wave = 0.5 - 0.5 * Math.cos(p * TAU * cycles);
				const block = Math.round(1 + (size - 1) * k * wave);
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
				if (grid > 0) {
					// 每一格畫一條線：格寬不一定剛好整除，所以直接用 W/tw、H/th 算實際格距
					const bw = W / tw;
					const bh = H / th;
					c.save();
					c.strokeStyle = 'rgba(0,0,0,' + (0.55 * grid * wave).toFixed(3) + ')';
					c.lineWidth = 1;
					c.beginPath();
					for (let x = bw; x < W; x += bw) { c.moveTo(x, 0); c.lineTo(x, H); }
					for (let y = bh; y < H; y += bh) { c.moveTo(0, y); c.lineTo(W, y); }
					c.stroke();
					c.restore();
				}
			}
		},
		{
			id: 'sepiaFlash', name: 'Sepia Flash',
			// 專屬設定：褐色強度、閃光次數
			params: [
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 100, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 100) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const wave = 0.5 - 0.5 * Math.cos(p * TAU * cycles);
				// 0.4 是「泛黃底」：最淡的那一格也留一點褐色，不會完全回到原色（舊版就是這個長相）
				const s = (0.4 + 0.6 * wave) * strength * k;
				c.filter = 'sepia(' + s.toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'vignettePulse', name: 'Vignette Pulse',
			// 專屬設定：暗角強度、暗角範圍（內圈半徑）、脈動次數
			params: [
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 100, unit: '%' },
				{ key: 'size', i18n: 'paramVignette', min: 0, max: 60, step: 5, def: 28, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 100) / 100;
				const inner = ((o && typeof o.size === 'number') ? o.size : 28) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const wave = 0.5 - 0.5 * Math.cos(p * TAU * cycles);
				const amt = (0.35 + 0.4 * wave) * strength * k;
				const g = c.createRadialGradient(
					W / 2, H / 2, Math.min(W, H) * inner,
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
			// 專屬設定：方向、頻率、幅度、速度
			// 原 liquidWobble 已併進來（它其實就是同一支切條位移，只差頻率 6→8 與幅度 5%→4%），
			// 現在靠「方向＋頻率」就能調出兩種原本的長相，不必留兩支幾乎一樣的配方
			params: [
				{
					key: 'axis', i18n: 'paramAxis', type: 'select', def: 'h',
					options: [
						{ v: 'h', i18n: 'dirHorizontal' },
						{ v: 'v', i18n: 'dirVertical' }
					]
				},
				{ key: 'freq', i18n: 'paramFrequency', min: 2, max: 12, step: 1, def: 8 },
				{ key: 'amp', i18n: 'paramAmplitude', min: 1, max: 12, step: 1, def: 4, unit: '%' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const axis = (o && o.axis) ? o.axis : 'h';
				const freq = Math.round((o && typeof o.freq === 'number') ? o.freq : 8);
				const ampPct = ((o && typeof o.amp === 'number') ? o.amp : 4) / 100;
				// 速度取整數圈，頭尾相位才接得上（否則最後一格會突然跳回起點）
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				if (axis === 'v') {
					// 縱向：切直條，左右不動、每條上下錯位（原 liquidWobble 的方向）
					const amp = H * ampPct * k;
					for (let x = 0; x < W; x += 4) {
						const dy = Math.sin((x / W) * freq + p * TAU * speed) * amp;
						c.drawImage(baseCanvas, x, 0, 4, H, x, dy, 4, H);
					}
				} else {
					// 橫向：切橫條，每條左右錯位（原 waveDistort 的方向）
					const amp = W * ampPct * k;
					for (let y = 0; y < H; y += 4) {
						const dx = Math.sin((y / H) * freq + p * TAU * speed) * amp;
						c.drawImage(baseCanvas, 0, y, W, 4, dx, y, W, 4);
					}
				}
			}
		},
		{
			id: 'invertFlash', name: 'Invert Flash',
			// 專屬設定：反色強度、閃爍次數（原本寫死 3 次）
			params: [
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 100, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 6, step: 1, def: 3 }
			],
			draw: function (c, p, k, i, o) {
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 100) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 3);
				// sin 取正值再平方：一閃一閃（暗→亮→暗），負半邊直接壓成 0，所以不會「反兩次」
				const v = Math.pow(Math.max(0, Math.sin(p * TAU * cycles)), 2) * strength * k;
				c.filter = 'invert(' + v.toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
			c.filter = 'none';
			}
		},
		{
			id: 'float', name: 'Float',
			// 專屬設定：幅度、模式（平滑漂浮／往上彈跳）、循環次數（paramCycles，不用 paramPulses 是因為這裡是「來回幾趟」）
			// 原 bounce 已併進來：彈跳只是把 sin 換成 |sin|（貼地只往上跳），共用同一支配方
			params: [
				{ key: 'amp', i18n: 'paramAmplitude', min: 2, max: 15, step: 1, def: 5, unit: '%' },
				{
					key: 'mode', i18n: 'paramMode', type: 'select', def: 'float',
					options: [
						{ v: 'float', i18n: 'modeFloat' },
						{ v: 'bounce', i18n: 'modeBounce' }
					]
				},
				{ key: 'pulses', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const amp = ((o && typeof o.amp === 'number') ? o.amp : 5) / 100;
				const mode = (o && o.mode) ? o.mode : 'float';
				// 來回次數取整數，循環播放頭尾才接得上
				const pulses = Math.round((o && typeof o.pulses === 'number') ? o.pulses : 1);
				const dy = (mode === 'bounce')
					? -Math.abs(Math.sin(p * TAU * pulses)) * H * amp * k
					: Math.sin(p * TAU * pulses) * H * amp * k;
				c.drawImage(baseCanvas, 0, dy);
			}
		},
		{
			id: 'contrastPulse', name: 'Contrast Pulse',
			// 專屬設定：對比強度、脈動次數
			params: [
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 100, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 100) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const v = (0.5 - 0.5 * Math.cos(p * TAU * cycles)) * k * strength;
				// 對比拉高時飽和度一起推一點（0.8 : 0.2 的比例跟舊版一致），畫面才不會「只變硬不變豔」
				c.filter = 'contrast(' + (1 + 0.8 * v).toFixed(3) + ') saturate(' + (1 + 0.2 * v).toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'rgbGlitch', name: 'RGB Glitch',
			// 專屬設定：色差位移、抖動速度、撕裂機率
			// 原 chromaticShift 已併進來（它就是這支的溫和版：色相偏移少一點、沒有撕裂），
			// 現在把「撕裂」關掉就等於原本的色差偏移
			params: [
				{ key: 'split', i18n: 'paramSplit', min: 2, max: 20, step: 1, def: 12, unit: 'px' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 4, step: 1, def: 2 },
				{
					key: 'tear', i18n: 'paramTear', type: 'select', def: 'sometimes',
					options: [
						{ v: 'off', i18n: 'tearOff' },
						{ v: 'sometimes', i18n: 'tearSometimes' },
						{ v: 'often', i18n: 'tearOften' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const split = (o && typeof o.split === 'number') ? o.split : 12;
				// 速度取整數圈，色差來回才不會在接點突然換方向
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 2);
				const tear = (o && o.tear) ? o.tear : 'sometimes';
				const dx = split * k * Math.sin(p * TAU * speed);
				c.save();
				c.globalCompositeOperation = 'screen';
				c.globalAlpha = 0.35;
				c.filter = 'hue-rotate(120deg)';
				c.drawImage(baseCanvas, dx, 0);
				c.filter = 'hue-rotate(-120deg)';
				c.drawImage(baseCanvas, -dx, 0);
				c.restore();
				// 撕裂：機率由參數決定；關掉就完全不畫，等於溫和版色差偏移
				if (tear === 'off') return;
				const r = rnd(i * 29 + 7);
				const gate = tear === 'often' ? 0.3 : 0.6;   // 門檻越低越常出現
				if (r() > gate) {
					const sh = Math.round(H * (0.03 + 0.1 * r()));
					const sy = Math.round(r() * Math.max(1, H - sh));
					const off = (r() * 2 - 1) * W * 0.06 * k;
					c.drawImage(baseCanvas, 0, sy, W, sh, off, sy, W, sh);
				}
			}
		},
		{
			id: 'zoomIn', name: 'Zoom In',
			// 專屬設定：縮放幅度、循環次數
			params: [
				{ key: 'zoom', i18n: 'paramZoom', min: 5, max: 50, step: 1, def: 18, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const zoom = ((o && typeof o.zoom === 'number') ? o.zoom : 18) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				// 一個 cos 波形：起點 1 倍 → 中段最大 → 尾端回到 1 倍，循環頭尾才接得上
				const wave = 0.5 - 0.5 * Math.cos(p * TAU * cycles);
				const s = 1 + zoom * k * wave;
				centerScale(c, s);
			}
		},
		{
			id: 'slideIn', name: 'Slide In',
			// 專屬設定：滑入角度、速度
			// 原 slideLeft（向左）與 slideDown（向下）已併成這支：角度 180° 就是原本的向左滑入、90° 是向下滑入，
			// 其他角度則是兩者的斜向混合（0° 向右、270° 向上）
			params: [
				{ key: 'angle', i18n: 'paramAngle', min: 0, max: 360, step: 15, def: 180, unit: '°' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const deg = (o && typeof o.angle === 'number') ? o.angle : 180;
				// 速度取整數圈：p 從 0 走到 1 剛好位移「整數趟」，循環時才不會看到接縫
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				const rad = (deg * Math.PI) / 180;
				const dx = Math.cos(rad);
				const dy = Math.sin(rad);
				// 沿這個方向要移動多遠，才能把整張畫布完全換掉一輪（斜向時取兩軸投影相加）
				const span = Math.abs(dx) * W + Math.abs(dy) * H;
				const travel = p * speed * span;
				c.save();
				c.translate(dx * travel, dy * travel);
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
				// 第二張貼在「後方 span」的位置，第一張離開畫布時留下的空隙由它補上
				c.save();
				c.translate(dx * (travel - span), dy * (travel - span));
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
			}
		},
		{
			id: 'swing', name: 'Swing',
			// 專屬設定：擺幅角度、擺盪次數
			// 擺點在上方中央，所以像掛著晃；角度 7° 約等於舊版的 0.12 弧度
			params: [
				{ key: 'angle', i18n: 'paramAngle', min: 2, max: 20, step: 1, def: 7, unit: '°' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const ampDeg = (o && typeof o.angle === 'number') ? o.angle : 7;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				// sin 走整數圈：p=0 與 p=1 都是 0°，循環時不會有一格突然歪掉
				const rad = Math.sin(p * TAU * cycles) * (ampDeg * Math.PI / 180) * k;
				c.save();
				c.translate(W / 2, 0);
				c.rotate(rad);
				c.drawImage(baseCanvas, -W / 2, 0);
				c.restore();
			}
		},
		{
			id: 'colorStrobe', name: 'Color Strobe',
			// 專屬設定：頻閃次數、色相圈數（一整段裡換幾輪顏色）
			params: [
				{ key: 'freq', i18n: 'paramFrequency', min: 2, max: 12, step: 1, def: 6 },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 2 }
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const freq = Math.round((o && typeof o.freq === 'number') ? o.freq : 6);
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 2);
				// sin 只取正半邊：一半時間亮、一半時間暗，所以「閃」的次數就是 freq
				const f = Math.sin(p * TAU * freq);
				if (f > 0) {
					c.save();
					c.globalCompositeOperation = 'overlay';
					c.globalAlpha = 0.5 * f * k;
					c.fillStyle = 'hsl(' + Math.round((p * 360 * turns) % 360) + ',100%,55%)';
					c.fillRect(0, 0, W, H);
					c.restore();
				}
			}
		},
		{
			id: 'shadowPulse', name: 'Shadow Pulse',
			// 專屬設定：陰影距離（往下沉多少）、模糊（散得多開）、脈動次數
			// 舊版寫死距離 4px、模糊 10px 起跳、一圈脈動一次，預設值就是舊版
			params: [
				{ key: 'offset', i18n: 'paramShadowOffset', min: 0, max: 20, step: 1, def: 4, unit: 'px' },
				{ key: 'blur', i18n: 'paramBlur', min: 0, max: 40, step: 1, def: 10, unit: 'px' },
				{ key: 'pulses', i18n: 'paramPulses', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const offset = (o && typeof o.offset === 'number') ? o.offset : 4;
				const blurBase = (o && typeof o.blur === 'number') ? o.blur : 10;
				const pulses = Math.round((o && typeof o.pulses === 'number') ? o.pulses : 1);
				// 脈動次數直接乘進 cos 的週期，整數圈才會頭尾接得回 0
				const amt = 0.5 - 0.5 * Math.cos(p * TAU * pulses);
				const alpha = (0.45 + 0.35 * amt) * k;          // 陰影濃度（沿用舊版公式）
				const radius = (blurBase + 22 * amt * k) / 2;    // 模糊半徑（內建 shadowBlur 約等於 2 倍半徑）
				const scale = 0.94;
				const dw = W * scale;
				const dh = H * scale;
				// 只讓「不透明的地方」投影：先取出底圖的 alpha 輪廓，再用 source-in 整片塗黑。
				// 輪廓裡全透明的像素是 0，所以透明區不會生出任何陰影（含半透明的羽邊也不會亂撒）
				const mask = mkCanvas(W, H);
				const m = mask.getContext('2d');
				m.drawImage(baseCanvas, (W - dw) / 2, (H - dh) / 2, dw, dh);
				m.globalCompositeOperation = 'source-in';
				m.fillStyle = '#000';
				m.fillRect(0, 0, W, H);
				c.save();
				if (typeof c.filter === 'string') {
					// 有 filter 的環境：把輪廓偏移後直接模糊，濃度與柔化程度都能準確控制；
					// 模糊會把 alpha 攤開，所以濃度要補回來（1.9 倍是實測接得近舊版觀感的值）
					c.globalAlpha = Math.min(1, alpha * 1.9);
					c.filter = 'blur(' + radius.toFixed(1) + 'px)';
					c.drawImage(mask, 0, offset * k);
				} else {
					// 沒有 filter（舊一點的 Safari）：退回 canvas 內建陰影，也是照輪廓算，
					// 只是濃度會被攤薄一些（補 1.4 倍）
					c.shadowColor = 'rgba(0,0,0,' + Math.min(1, alpha * 1.4) + ')';
					c.shadowBlur = radius * 2;
					c.shadowOffsetX = W * 2;   // 輪廓本體畫到畫面外，靠 offset 把影子拉回原位
					c.shadowOffsetY = offset * k;
					c.drawImage(mask, -W * 2, 0);
				}
				c.restore();
				centerScale(c, scale);
			}
		},
		{
			id: 'flipAnim', name: 'Flip Anim',
			// 專屬設定：翻轉軸（水平／垂直）、圈數
			// 舊版只有水平翻、一圈翻一次，預設值就是舊版；垂直是新增的（改成縮放 y 軸）
			params: [
				{ key: 'axis', i18n: 'paramAxis', type: 'select', def: 'h', options: [{ v: 'h', i18n: 'dirHorizontal' }, { v: 'v', i18n: 'dirVertical' }] },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const axis = (o && typeof o.axis === 'string') ? o.axis : 'h';
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const sx = Math.cos(p * TAU * turns);
				// 薄到 0 會讓 drawImage 整個消失，留 0.03 的邊，看起來才像翻到側面
				const ax = Math.abs(sx) < 0.03 ? 0.03 : Math.abs(sx);
				c.save();
				c.translate(W / 2, H / 2);
				if (axis === 'v') {
					c.scale(1, sx < 0 ? -ax : ax);
				} else {
					c.scale(sx < 0 ? -ax : ax, 1);
				}
				c.drawImage(baseCanvas, -W / 2, -H / 2);
				c.restore();
			}
		},
		{
			id: 'spotlight', name: 'Spotlight',
			// 專屬設定：光圈半徑、繞行幅度（0 就固定在正中央）
			params: [
				{ key: 'radius', i18n: 'paramRadius', min: 5, max: 60, step: 1, def: 30, unit: '%' },
				{ key: 'orbit', i18n: 'paramOrbit', min: 0, max: 50, step: 1, def: 28, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const radius = ((o && typeof o.radius === 'number') ? o.radius : 30) / 100;
				const orbit = ((o && typeof o.orbit === 'number') ? o.orbit : 28) / 100;
				// 用一張遮罩畫布做「挖洞」，避免 destination-out 把底圖也挖掉
				const mask = mkCanvas(W, H);
				const m = mask.getContext('2d');
				m.fillStyle = 'rgba(0,0,0,' + (0.78 * k) + ')';
				m.fillRect(0, 0, W, H);
				// 繞行幅度 0 時 cos／sin 乘 0，光圈就停在正中央
				const cx = W / 2 + Math.cos(p * TAU) * W * orbit;
				const cy = H / 2 + Math.sin(p * TAU) * H * orbit * 0.8;
				const r = Math.min(W, H) * radius;
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
			// 專屬設定：揭幕方向（0~360°）、速度（一圈內走幾趟）
			// 走法：窗口從畫面外掃進來把圖揭開 → 繼續往同方向掃出去，直到整張圖消失（一圈剛好一次循環）
			// 方向沿用滑入 slideIn 的規格（每 15° 一格）：0° 從左往右、90° 由上往下、180° 由右往左、
			// 270° 由下往上，其餘角度是斜向
			params: [
				{ key: 'angle', i18n: 'paramAngle', min: 0, max: 360, step: 15, def: 0, unit: '°' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const deg = (o && typeof o.angle === 'number') ? o.angle : 0;
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				const rad = (deg * Math.PI) / 180;
				const dx = Math.cos(rad);
				const dy = Math.sin(rad);
				// n 是方向轉 90°，拿它把邊線兩端拉到畫面外，clip 的多邊形才夠大
				const nx = -dy;
				const ny = dx;
				// 整張圖沿這個方向的投影範圍 [a, b]：a 是投影起點、b 是投影終點，b-a = span
				const span = Math.abs(dx) * W + Math.abs(dy) * H;
				const a = (W / 2 * dx + H / 2 * dy) - span / 2;
				const b = a + span;
				const raw = p * speed;
				let t = raw - Math.floor(raw);
				// 速度 1 且走到最後一格時要停在「已滑出」，否則 p=1 會被取餘數拉回 0
				if (speed === 1 && p >= 1) t = 1;
				// 一條跟圖一樣寬的「窗口」從畫面外掃進來、掃出去：
				// t=0 窗口還在外面（全空）→ t=0.5 窗口正好蓋住整張圖（全滿）→ t=1 窗口已掃出（全空）
				// 所以前半段是「揭幕進場」，後半段就是「繼續往同方向移動直到消失」
				const lo = a - span + t * span * 2;
				const hi = lo + span;
				const far = W + H;
				const q1x = lo * dx + nx * far, q1y = lo * dy + ny * far;
				const q2x = lo * dx - nx * far, q2y = lo * dy - ny * far;
				const q3x = hi * dx - nx * far, q3y = hi * dy - ny * far;
				const q4x = hi * dx + nx * far, q4y = hi * dy + ny * far;
				// 只畫窗口內的那一條（內容用 clip 裁掉窗外）
				c.save();
				c.beginPath();
				c.moveTo(q1x, q1y);
				c.lineTo(q2x, q2y);
				c.lineTo(q3x, q3y);
				c.lineTo(q4x, q4y);
				c.closePath();
				c.clip();
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
				// 正在移動的那一條邊（前半段是入口線、後半段是出口線）畫淡粉色
				c.save();
				c.strokeStyle = 'rgba(212,112,138,0.9)';
				c.lineWidth = 2;
				[[lo, q1x, q1y, q2x, q2y], [hi, q4x, q4y, q3x, q3y]].forEach(function (e) {
					// 邊線跑到圖外面就不用畫了，否則會在空白處多出一條粉線
					if (e[0] <= a || e[0] >= b) return;
					c.beginPath();
					c.moveTo(e[1], e[2]);
					c.lineTo(e[3], e[4]);
					c.stroke();
				});
				c.restore();
			}
		},
		{
			id: 'matrixRain', name: 'Matrix Rain',
			// 專屬設定：字元大小、流速、密度（有字的欄位比例）
			// 舊版字級是 min(W,H)/16 自動算、流速固定、每欄都有字，預設值就是舊版
			params: [
				{ key: 'size', i18n: 'paramSize', min: 6, max: 36, step: 2, def: 16, unit: 'px' },
				{ key: 'speed', i18n: 'paramSpeed', min: 0.3, max: 2, step: 0.1, def: 1 },
				{ key: 'density', i18n: 'paramDensity', min: 10, max: 100, step: 5, def: 100, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const fs = Math.max(6, Math.round((o && typeof o.size === 'number') ? o.size : 16));
				const speedMul = (o && typeof o.speed === 'number') ? o.speed : 1;
				const density = ((o && typeof o.density === 'number') ? o.density : 100) / 100;
				c.drawImage(baseCanvas, 0, 0);
				// 先壓暗底圖，綠色字才跳得出來（強度越大壓得越暗）
				c.fillStyle = 'rgba(0,0,0,' + (0.25 * k) + ')';
				c.fillRect(0, 0, W, H);
				const step = fs * 0.9;
				const cols = Math.max(1, Math.floor(W / step));
				const r = rnd(i * 17 + 9);
				c.font = fs + 'px monospace';
				c.textBaseline = 'top';
				for (let col = 0; col < cols; col++) {
					const speed = (0.6 + r() * 0.8) * speedMul;
					const y = (((r() * 1.4) + p * speed) % 1.4) * H - H * 0.2;
					const ch = String.fromCharCode(0x30A0 + Math.floor(r() * 90));
					// 密度用欄位編號當雜湊：抽掉的字照樣先把亂數吃掉，所以調密度不會讓其他欄位亂跳
					if (((col * 37) % 100) / 100 >= density) continue;
					c.fillStyle = 'rgba(80,255,140,' + (0.55 + 0.45 * k).toFixed(3) + ')';
					c.fillText(ch, col * step, y);
				}
			}
		},
		{
			id: 'kaleidoscope', name: 'Kaleidoscope',
			// 專屬設定：切片數、旋轉圈數（整圈，1 圈才接得回開頭）、強度（疊得透不透）
			// 舊版固定 6 片、轉 0.2 圈（0.2 圈結尾會停在 72°，接不回第一格），
			// 所以圈數只給整數：1 圈＝結尾 360°＝開頭 0°，循環無縫
			params: [
				{ key: 'slices', i18n: 'paramSlices', min: 2, max: 12, step: 1, def: 6 },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'strength', i18n: 'paramStrength', min: 30, max: 100, step: 5, def: 90, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const slices = Math.round((o && typeof o.slices === 'number') ? o.slices : 6);
				// 圈數取整，避免 0.2 圈那種「結尾差 72°」的跳格
				const turns = Math.max(1, Math.round((o && typeof o.turns === 'number') ? o.turns : 1));
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 90) / 100;
				c.save();
				c.translate(W / 2, H / 2);
				c.rotate(p * TAU * turns);
				const n = Math.max(2, slices);
				// 強度 90 等於舊版的 0.55~0.9（k=0 偏淡、k=1 疊到最滿）
				c.globalAlpha = strength * (0.6 + 0.4 * k);
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
			// 專屬設定：顆粒大小、消散密度
			// 一輪是「完整圖 → 方塊一塊塊崩解 → 畫面全空 → 方塊由少到多拼回來 → 完整圖」，
			// 頭尾都是完整圖，APNG 循環時看不到接縫
			params: [
				{ key: 'size', i18n: 'paramGrainSize', min: 4, max: 40, step: 2, def: 16, unit: 'px' },
				{ key: 'density', i18n: 'paramDensity', min: 10, max: 100, step: 5, def: 50, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const block = Math.max(2, Math.round((o && typeof o.size === 'number') ? o.size : 16));
				const density = ((o && typeof o.density === 'number') ? o.density : 50) / 100;
				// 一去一回：sin 正半波 p=0 是 0、p=0.5 是 1（全空）、p=1 又回到 0，頭尾接得回完整圖
				const phase = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
				// 密度改的是「崩解得急不急」：密度低 → 指數大 → 前期慢慢掉、後期才成片消失；
				// 密度高 → 指數小 → 一下子就崩掉大半。phase = 1 時任何密度都會剛好全空
				// （p 剛好是 0 或 1 時 sin 會留下 1e-16 的浮點尾巴，先壓成 0，頭尾才會是完整圖）
				const gone = phase < 1e-6 ? 0 : Math.pow(phase, 1 / (0.5 + density));
				// 用座標雜湊當順序（不用每格亂數），方塊才會穩定消失而不是閃爍
				for (let y = 0; y < H; y += block) {
					for (let x = 0; x < W; x += block) {
						const v = ((Math.floor(x / block) * 73 + Math.floor(y / block) * 151) % 997) / 997;
						if (v >= gone) {
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
			// 專屬設定：幅度、節拍間隔（兩下之間的距離）、循環次數
			// 每輪兩下（第二下比較輕，跟真的心跳一樣「咚—咚」），位置固定在週期開頭的 12%
			params: [
				{ key: 'amp', i18n: 'paramAmplitude', min: 2, max: 20, step: 1, def: 9, unit: '%' },
				{ key: 'gap', i18n: 'paramBeatGap', min: 10, max: 40, step: 2, def: 24, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const amp = ((o && typeof o.amp === 'number') ? o.amp : 9) / 100;
				const gap = ((o && typeof o.gap === 'number') ? o.gap : 24) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const cycLen = 1 / cycles;
				// 換算成「這一輪內的進度」，高斯才知道每一拍落在哪裡（多圈時每圈都會重播同一個節拍）
				const t = (((p % cycLen) + cycLen) % cycLen) / cycLen;
				const beat = function (frac) {
					const d = t - frac;
					return Math.exp(-(d * d) / 0.006);
				};
				// 第一下全力、第二下 0.6 倍，間隔可調
				const pulse = Math.max(beat(0.12), 0) + 0.6 * Math.max(beat(0.12 + gap), 0);
				centerScale(c, 1 + amp * k * pulse);
			}
		},
		{
			id: 'oldTV', name: 'Old TV',
			// 專屬設定：掃描線強度、滾動亮帶、畫面抖動、降飽和
			// 原 scanLines 已併進來（掃描線＋滾動亮帶本來就是這支的一部分），
			// 把抖動與降飽和調到 0 就幾乎等於原本的掃描線
			params: [
				{ key: 'scan', i18n: 'paramScanStrength', min: 0, max: 40, step: 1, def: 25, unit: '%' },
				{ key: 'roll', i18n: 'paramRollBand', min: 0, max: 30, step: 1, def: 12, unit: '%' },
				{ key: 'jitter', i18n: 'paramJitter', min: 0, max: 6, step: 1, def: 2, unit: 'px' },
				{ key: 'desat', i18n: 'paramDesat', min: 0, max: 50, step: 1, def: 25, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const scan = ((o && typeof o.scan === 'number') ? o.scan : 25) / 100;
				const rollPct = ((o && typeof o.roll === 'number') ? o.roll : 12) / 100;
				const jitter = (o && typeof o.jitter === 'number') ? o.jitter : 2;
				const desat = ((o && typeof o.desat === 'number') ? o.desat : 25) / 100;
				const r = rnd(i * 31 + 17);
				c.save();
				c.translate((r() * 2 - 1) * jitter * k, 0);
				c.filter = 'saturate(' + (1 - desat * k).toFixed(3) + ') brightness(' + (1 + 0.05 * k).toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
				// 掃描線（強度 0 就不畫，整片留給底圖）
				if (scan > 0) {
					c.fillStyle = 'rgba(0,0,0,' + (scan * k).toFixed(3) + ')';
					for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
				}
				// 滾動亮帶（強度 0 就不畫）
				if (rollPct > 0) {
					const roll = ((p * 1.2) % 1) * H;
					const g = c.createLinearGradient(0, roll - 20, 0, roll + 20);
					g.addColorStop(0, 'rgba(255,255,255,0)');
					g.addColorStop(0.5, 'rgba(255,255,255,' + (rollPct * k).toFixed(3) + ')');
					g.addColorStop(1, 'rgba(255,255,255,0)');
					c.fillStyle = g;
					c.fillRect(0, roll - 20, W, 40);
				}
			}
		},
		{
			id: 'confettiBurst', name: 'Confetti Burst',
			// 專屬設定：紙片數量、紙片大小、落下速度
			// 舊版是 24~60 片、寬 4~10px 高 3~8px、速度 0.5~1.7，預設值就是舊版（強度 k 會再微調片數）
			params: [
				{ key: 'count', i18n: 'paramCount', min: 10, max: 90, step: 5, def: 60 },
				{ key: 'size', i18n: 'paramSize', min: 3, max: 14, step: 1, def: 6, unit: 'px' },
				{ key: 'speed', i18n: 'paramSpeed', min: 0.4, max: 2, step: 0.1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const count = Math.round((o && typeof o.count === 'number') ? o.count : 60);
				const size = (o && typeof o.size === 'number') ? o.size : 6;
				const speedMul = (o && typeof o.speed === 'number') ? o.speed : 1;
				c.drawImage(baseCanvas, 0, 0);
				const palette = ['#ff5c8a', '#ffd166', '#43d9ad', '#4d96ff', '#c77dff', '#ff8fab'];
				// 強度越高片數越多（k=0 是六成、k=1 是全部）
				const n = Math.max(4, Math.round(count * (0.6 + 0.4 * k)));
				for (let j = 0; j < n; j++) {
					const r = rnd(j * 97 + 5);
					const x0 = r() * W;
					const speed = (0.5 + r() * 1.2) * speedMul;
					const y = ((r() * 0.6 + p * speed) % 1.2) * H - H * 0.1;
					// 大小 6px 是基準，換算成倍率去縮放每片的長寬
					const sc = size / 6;
					const w = (4 + r() * 6) * sc;
					const h = (3 + r() * 5) * sc;
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
		},
		{
			id: 'sliceSplit', name: 'Slice Split',
			// 專屬設定：切割數量、切割方向（跟滑入共用同一支角度滑桿）、移動速度
			// 切線一律「垂直於移動方向」，所以方向 0°（向右）時就是橫向切成一條條、
			// 一條往右一條往左各自飄出畫面；90°（向下）則變成直向切片往上／下分開。
			// 一輪是「完整圖 → 撕開飛散 → 畫面全空 → 各自原路飛回 → 拼回完整圖」，
			// 所以頭尾都是貼齊的狀態，APNG 循環時看不到接縫
			params: [
				{ key: 'cuts', i18n: 'paramCuts', min: 1, max: 20, step: 1, def: 8 },
				{ key: 'angle', i18n: 'paramAngle', min: 0, max: 360, step: 15, def: 0, unit: '°' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const cuts = Math.max(1, Math.round((o && typeof o.cuts === 'number') ? o.cuts : 8));
				const deg = (o && typeof o.angle === 'number') ? o.angle : 0;
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				const rad = (deg * Math.PI) / 180;
				const dx = Math.cos(rad);
				const dy = Math.sin(rad);
				// 一去一回的包絡：p=0 貼齊 → p=0.5 全部飛散（畫面全空）→ p=1 拼回原位。
				// 先取 sin 的正半波（頭尾都剛好是 0），再平方讓「完整圖」的時間多一點、
				// 飛散的時間集中在中段；速度越大指數越小 → 起步衝、中段停留短
				const base = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
				const q = Math.pow(base, 2 / speed);
				// 沿這個方向要移動多遠才算完全離開畫布（斜向時取兩軸投影相加）
				const span = Math.abs(dx) * W + Math.abs(dy) * H;
				const travel = span * 1.12 + 8;
				c.save();
				// 先把移動方向轉到 +x：轉完之後「沿 y 疊起來的橫帶」就是切片，
				// 每一條再各自沿 x 往正／負兩邊推出去
				c.translate(W / 2, H / 2);
				c.rotate(Math.atan2(dy, dx));
				c.translate(-W / 2, -H / 2);
				for (let s = 0; s < cuts; s++) {
					// 用取整的邊界切，避免分數像素在切片之間留一條透明縫
					const y0 = Math.round((s * H) / cuts);
					const y1 = Math.round(((s + 1) * H) / cuts);
					const bandH = y1 - y0;
					if (bandH <= 0) continue;
					const off = (s % 2 === 0 ? 1 : -1) * q * travel;
					c.save();
					c.beginPath();
					c.rect(0, y0, W, bandH);
					c.clip();
					c.drawImage(baseCanvas, off, 0);
					c.restore();
				}
				c.restore();
			}
		},
		{
			id: 'comic', name: 'Comic Ink',
			// 專屬設定：精細度（取樣多密＝線條多細）、線條粗細、墨色濃度、底色
			// 走法是一去一回：原圖 → 慢慢只剩線稿 → 停留一下 → 慢慢回到原圖，
			// 中段會有一段「完全是漫畫線稿」的停留，循環頭尾都是原圖所以看不到接縫
			params: [
				{ key: 'detail', i18n: 'paramDetail', min: 1, max: 20, step: 1, def: 10 },
				{ key: 'lineWidth', i18n: 'paramLineWidth', min: 1, max: 8, step: 1, def: 2, unit: 'px' },
				{ key: 'ink', i18n: 'paramInk', min: 30, max: 100, step: 5, def: 100, unit: '%' },
				{
					key: 'paper', i18n: 'paramPaper', type: 'select', def: 'transparent',
					options: [{ v: 'transparent', i18n: 'paperTransparent' }, { v: 'white', i18n: 'paperWhite' }]
				}
			],
			draw: function (c, p, k, i, o) {
				const detail = Math.max(1, Math.round((o && typeof o.detail === 'number') ? o.detail : 10));
				const lw = Math.max(1, Math.round((o && typeof o.lineWidth === 'number') ? o.lineWidth : 2));
				const ink = ((o && typeof o.ink === 'number') ? o.ink : 100) / 100;
				const paper = (o && o.paper === 'white') ? 'white' : 'transparent';
				// 精細度越高 → 門檻越低 → 越多淡邊也被抓成線（細節多）；1 只留最明顯的大輪廓
				// 範圍 1~20（等於把原本 1~10 再細一倍），門檻每格 ×0.9 等比下降（55 → 21 → 7）
				// 55 剛好只留主輪廓、10（預設）連柔和照片都會出一組完整線條、20 連很淡的漸層都抓得到
				const threshold = 55 * Math.pow(0.9, detail - 1);
				// 一去一回，放大 1.6 倍後夾在 1 以內：中段（大約 p=0.2~0.8）整段停在「純線稿」
				// （p 剛好 0／1 時 sin 會留 1e-16 的浮點尾巴，先壓成 0，頭尾才是乾淨的原圖）
				let q = Math.min(1, Math.sin(Math.PI * Math.min(1, Math.max(0, p))) * 1.6);
				if (q < 1e-6) q = 0;
				// 白紙：只在「已經開始變漫畫」之後才鋪，並且跟著進度淡入，開頭才不會突然一片白
				if (paper === 'white' && q > 0) {
					c.save();
					c.globalAlpha = q;
					c.fillStyle = '#ffffff';
					c.fillRect(0, 0, W, H);
					c.restore();
				}
				// 原圖慢慢淡出（q=0 是完整的原圖，q=1 完全不見）
				if (q < 1) {
					c.save();
					c.globalAlpha = 1 - q;
					c.drawImage(baseCanvas, 0, 0);
					c.restore();
				}
				// 線稿遮罩只算一次，之後每一格只做一次 drawImage（記在配方物件上，
				// 換圖、換尺寸、換線條粗細或精細度才重算）
				const key = W + 'x' + H + '#' + lw + '@' + threshold;
				if (!this._inkMask || this._inkKey !== key || this._inkSrc !== baseCanvas) {
					this._inkMask = comicInkMask(lw, threshold);
					this._inkKey = key;
					this._inkSrc = baseCanvas;
				}
				if (q > 0 && ink > 0) {
					c.save();
					c.globalAlpha = q * ink;
					c.drawImage(this._inkMask, 0, 0);
					c.restore();
				}
			}
		}
	];

	// ============================================================
	// 特效自己的參數
	// 參數是「宣告在配方上」的：recipe.params 一寫，右側的「特效設定」就會
	// 自動長出對應的滑桿，不必再到 DOM 或 CSS 補一份。沒有宣告的特效只會
	// 顯示一行說明，不會整格消失（避免使用者以為壞掉）。
	// 值存在 paramStore[特效 id] 裡，切換特效再切回來不會把調過的值洗掉。
	// ============================================================
	const paramStore = Object.create(null);

	function recipeOf(id) {
		return FX_RECIPES.find(function (r) { return r.id === id; }) || null;
	}

	// 取某個特效目前的參數值（沒調過就用宣告的預設值）
	// 值的型別照預設值走：預設是數字就存數字，預設是字串就存字串（下拉選單用得到）
	function paramValues(recipe) {
		if (!recipe || !recipe.params) return {};
		const store = paramStore[recipe.id] || (paramStore[recipe.id] = {});
		const out = {};
		recipe.params.forEach(function (p) {
			out[p.key] = Object.prototype.hasOwnProperty.call(store, p.key) ? store[p.key] : p.def;
		});
		return out;
	}

	// 把滑桿／下拉選單拿到的原始字串轉成型別正確的值
	function paramRead(p, raw) {
		if (p.type === 'select') {
			return (typeof p.def === 'number') ? Number(raw) : String(raw);
		}
		const v = parseFloat(raw);
		return isNaN(v) ? p.def : v;
	}

	// 顏色轉換走 media-utils.js 的共用版（其他頁面要上色也用同一支，不在各檔各寫一份）
	// 取不到就退回「直接用原本的顏色」，至少不會讓整個特效爆掉
	const hexToRgba = window.hexToRgba || null;

	// 滑桿數值 → 顯示字串（乘上 scale 再補單位）
	function paramText(p, v) {
		const n = Number(v) * (p.scale || 1);
		// 有小數格（step < 1，例如流速 0.3、旋轉 0.2 圈）就保留到小數第二位，
		// 否則四捨五入會被吃成 0，使用者拉了半天還以為沒反應
		const txt = (p.step && p.step < 1) ? String(Math.round(n * 100) / 100) : String(Math.round(n));
		return txt + (p.unit || '');
	}

	function renderParams() {
		if (!paramGroup || !paramBody) return;
		const recipe = recipeOf(selectedId);
		const list = (recipe && recipe.params) || [];
		// 標題：主要文字固定是「特效設定」，後面再接目前特效的名字；
		// 名字用小字＋淡色（.fx-param-name）當副標，視覺上不會跟主標搶
		// 沒有設定時只留「特效設定」，下方再補一行說明
		if (paramTitle) {
			paramTitle.textContent = '';
			const mainSpan = document.createElement('span');
			mainSpan.textContent = tr('fxParams');
			paramTitle.appendChild(mainSpan);
			if (list.length && recipe) {
				const nameSpan = document.createElement('span');
				nameSpan.className = 'fx-param-name';
				nameSpan.textContent = effectName(recipe);
				paramTitle.appendChild(nameSpan);
			}
		}
		paramBody.innerHTML = '';
		if (!list.length) {
			const tip = document.createElement('small');
			tip.className = 'fx-params-empty';
			tip.textContent = tr('paramNone');
			paramBody.appendChild(tip);
			return;
		}
		const vals = paramValues(recipe);
		list.forEach(function (p) {
			const row = document.createElement('div');
			row.className = 'fx-row fx-param-row';
			const label = document.createElement('label');
			label.textContent = tr(p.i18n || p.key);
			const input = document.createElement(p.type === 'select' ? 'select' : 'input');
			let valEl = null;
			if (p.type === 'select') {
				// 下拉選單：選項文字也走 i18n，切語言時由 fxRenderParams() 重畫整個面板
				(p.options || []).forEach(function (opt) {
					const op = document.createElement('option');
					op.value = String(opt.v);
					op.textContent = tr(opt.i18n || String(opt.v));
					if (String(opt.v) === String(vals[p.key])) op.selected = true;
					input.appendChild(op);
				});
			} else {
				input.type = 'range';
				input.min = p.min;
				input.max = p.max;
				input.step = p.step || 1;
				input.value = vals[p.key];
				valEl = document.createElement('span');
				valEl.textContent = paramText(p, vals[p.key]);
			}
			const commit = function () {
				const v = paramRead(p, input.value);
				paramStore[recipe.id][p.key] = v;
				if (valEl) valEl.textContent = paramText(p, v);
				// 拖動／選取時即時重畫（scheduleGenerate 自己有 debounce，不會每個像素都產一輪）
				if (sourceImg) scheduleGenerate(120);
			};
			// 滑桿要邊拖邊看，選單只要最後選定的值
			if (p.type === 'select') {
				input.addEventListener('change', commit);
			} else {
				input.addEventListener('input', commit);
			}
			row.appendChild(label);
			row.appendChild(input);
			if (valEl) row.appendChild(valEl);
			paramBody.appendChild(row);
		});
	}

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
			nameEl.className = 'fx-name';
			const label = effectName(r);
			nameEl.textContent = label;
			if (label !== r.name) {
				// 主標已經是中文時，把英文原名用小字淡色放在後面，方便對照競品與程式
				const enEl = document.createElement('span');
				enEl.className = 'fx-name-en';
				enEl.textContent = r.name;
				nameEl.appendChild(enEl);
			}
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
		renderParams();   // 換特效 → 右側「特效設定」換成這個特效的參數
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
			setStatusKey('fxUnsupported');
			return;
		}
		setStatusKey('');
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
			setStatusKey('fxUnsupported');
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
			setStatusKey('fxNeedImage');
			return;
		}
		const token = ++genToken;
		stopPlay();

		const recipe = FX_RECIPES.find(function (r) { return r.id === selectedId; });
		const n = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, parseInt(frameCountInput.value, 10) || 20));
		const k = Math.max(0, Math.min(100, parseInt(intensityInput.value, 10) || 0)) / 100;
		const opts = paramValues(recipe);   // 這個特效自己的參數

		const list = [];
		for (let i = 0; i < n; i++) {
			if (token !== genToken) return;  // 中途被新的請求取代
			const cvs = mkCanvas(W, H);
			const cx = cvs.getContext('2d');
			if (recipe) {
				try {
					recipe.draw(cx, i / n, k, i, opts);
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
				setStatusKey('fxGenerating', { n: Math.round((i / n) * 100) });
				await nextFrame();
			}
		}
		if (token !== genToken) return;

		// 舊影格換掉（canvas 沒有 revoke 問題，交給 GC）
		frames = list;
		buildTimeline();
		showFrame(0);
		stopPlay();   // 預設停在第一格，不自動播放（要看得自己按播放鍵）
		setStatusKey('');
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
			setStatusKey('fxNeedImage');
			return;
		}
		// 檢查 APNG 頁的函式是否都在（避免外掛式載入失敗）
		if (typeof clearAll !== 'function' || typeof addFiles !== 'function') {
			setStatusKey('fxSendFail', { msg: 'APNG functions not found' });
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
		setStatusKey('');

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

			setStatusKey('fxSent', { n: newFiles.length });
		} catch (e) {
			console.error('[FX] 送出失敗:', e);
			setStatusKey('fxSendFail', { msg: e.message || e });
			
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
		setStatusKey('');
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
	setStatusKey('fxNeedImage');

	// 切換語言時把「程式寫死的動態文字」重新翻一次：
	//   1. 狀態列（例如「請先選一張圖片」）——它不在 data-i18n 掃描範圍內
	//   2. 沒有圖時的預覽提示
	//   3. 影格位置文字（第 i／n 格）——重畫目前影格最省事，畫面也一致
	function refreshLangTexts() {
		if (statusBox) statusBox.textContent = statusSpec ? tr(statusSpec.key, statusSpec.vars) : '';
		if (!sourceImg && previewInfo && previewInfo.style.display !== 'none') {
			previewInfo.textContent = tr('fxPreviewEmpty');
		}
		if (frames.length) showFrame(currentIndex);
	}

	// 切換語言時，i18n 會叫這支把參數滑桿的標籤重畫一次（標籤是動態產生的，沒有 data-i18n）
	window.fxRenderParams = renderParams;
	// 同上，特效清單的名稱也是程式產生的，切語言要整個重畫（不然會停在切換前那個語言）
	window.fxRenderEffectList = renderEffectList;
	// 狀態列／預覽提示／影格位置文字（同樣是程式寫進去的，切語言要重翻）
	window.fxRefreshLangTexts = refreshLangTexts;
})();
