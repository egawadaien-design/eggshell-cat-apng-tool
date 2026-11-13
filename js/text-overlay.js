/**
 * 蛋殼喵 APNG 工具 — 文字圖層（面板 + 繪製核心）
 * @author [DaiEn]
 * @Date: 2026-11-13
 * @Correction: 7
 * 本次修正：文字面板新增「旋轉」滑桿（0~360 度），以文字區塊的中心點為軸心旋轉。
 *   實作是「把座標系搬到中心 → 轉 → 搬回來」再沿用原本的繪字程式，
 *   所以外框、陰影、底線會跟著字一起轉，不必另外處理；
 *   沒設角度（0 度）時完全不呼叫 rotate，等於零成本。
 * 本次修正：文字面板的粗體／斜體／底線三顆按鈕改用站內圖示字型
 *   （cat-002／cat-003／cat-004，即 F0001~F0003），不再用 B／I／U 三個字母偽裝字形。
 *   連帶把 .tp-b/.tp-i/.tp-u 這三個「字母用」的類別從按鈕上移除——
 *   斜體與虛線底線那些裝飾套在圖示上只會多出一條雜線。
 *
 * 【這個檔在做什麼】
 *   APNG / FX / PNG 三頁都要能「在圖上打字」，三頁的預覽型態完全不同
 *   （<img>、<canvas>、被 CSS 縮放的 canvas），但「畫字」這件事一模一樣。
 *   所以把畫字的算式集中在 render()，把操作面板集中在 mount()，
 *   三頁只是各自 mount 一次、各自決定「什麼時候把字燒進輸出」。
 *
 * 【為什麼參數全部存「百分比」而不是 px】
 *   同一組文字要能同時套在 512×384 的 FX 預覽、使用者自訂尺寸的 APNG 輸出、
 *   還有 240×240 / 96×74 的 LINE 貼圖上。如果字級存 px，換個尺寸就整組歪掉；
 *   存「短邊的百分比」就永遠等比例。
 *     size        字級＝短邊的幾 %
 *     dx / dy     位置偏移＝寬 / 高的幾 %（0 = 置中）
 *     outlineW    外框粗細＝字級的幾 %
 *     shadowSize  陰影大小＝字級的幾 %
 *
 * 【為什麼三頁各有一份狀態，而不是共用一份】
 *   APNG 頁的文字是「動畫上的後製字幕」，PNG 頁是「貼圖上的字」，
 *   FX 頁是「特效畫面的一部分」。三者用途不同，共用一份會互相蓋台。
 *   共用的是「程式」與「面板」，不是「資料」。
 *
 * 【預覽怎麼疊字】
 *   APNG 的預覽是 <img>，PNG 的預覽是會被 zoom / pan 的 canvas，
 *   兩者都不能直接畫字。所以在預覽舞台（.preview-stage）上蓋一層透明 canvas，
 *   位置與大小即時跟著目標元素的實際矩形跑，字畫在那一層上。
 *   這一層 pointer-events: none，不會擋到 APNG 的拖曳或 PNG 的吸取顏色、橡皮擦。
 *   FX 頁不需要這一層 —— 它直接把字燒進影格，所見即所送。
 * 2026-11-13：「顯示格範圍」後面多了「淡入淡出」勾選；打開時字在起始格淡入、結束格淡出
 *             （frameAlpha 依格號算 globalAlpha，段落少於 3 格就不淡，免得停在半透明）。
 *
 * 2026-11-13：新增「顯示格範圍」──面板在 X / Y 後面多兩個輸入框（起始格 / 結束格），
 *             結束格填 0 代表到最後一格；render 與 paintOverlay 多收 frameIndex / totalFrames，
 *             不在範圍內的那幾格就不畫字（PNG 頁只有一張圖，mount 時傳 singleFrame 把這組藏起來）。
 *
 * 2026-11-12：字體列加上「讀取本機字體」鈕（Local Font Access，僅 Chrome / Edge），按了才跳授權，
 *             讀回來的家族名以 local: 前綴存進 state.font，內建七種與重複家族會先過濾掉。
 *
 * 2026-11-12：十字鍵的定位改由 CSS（.tp-up/.tp-left/.tp-center/.tp-right/.tp-down）負責，
 *             尺寸與「獨立影格設置」一致；字色色票移到字級那一列末尾，預設黑色。
 */

(function textOverlay() {
	'use strict';

	// ============================================================
	// 可選字體：只列「作業系統內建」或「已在系統內的常見字型」，
	// 不放任何要另外安裝的字型檔（字型檔散佈會有授權問題）
	// ============================================================
	const FONTS = [
		{ id: 'ming', css: '"PMingLiU","MingLiU","細明體",serif', key: 'textFontMing' },
		{ id: 'hei', css: '"Microsoft JhengHei","微軟正黑體",sans-serif', key: 'textFontHei' },
		{ id: 'ping', css: '"PingFang TC","蘋方-繁",sans-serif', key: 'textFontPing' },
		{ id: 'noto', css: '"Noto Sans TC","Noto Sans CJK TC",sans-serif', key: 'textFontNoto' },
		{ id: 'kai', css: '"DFKai-SB","標楷體",serif', key: 'textFontKai' },
		{ id: 'serif', css: 'serif', key: 'textFontSerif' },
		{ id: 'sans', css: 'sans-serif', key: 'textFontSans' }
	];

	function fontCss(id) {
		// 使用者從「本機字體」清單挑的那一種：value 存成 local:字體名稱
		// （加 local: 前綴是為了跟內建那七種的 id 分開，否則撞名會挑錯）
		if (id && String(id).indexOf('local:') === 0) {
			const fam = String(id).slice(6).replace(/"/g, '');
			return '"' + fam + '", serif';
		}
		const f = FONTS.find(function (x) { return x.id === id; });
		return (f || FONTS[0]).css;
	}

	// 內建那七種對應到的「系統字體家族名」，讀本機清單時要跳過，
	// 不然選單會出現兩個細明體（一個叫「細明體」、一個叫 PMingLiU）
	const BASE_FAMILY_SET = new Set([
		'pmingliu', 'mingliu', '微軟正黑體', 'microsoft jhenghei', '蘋方-繁', 'pingfang tc',
		'noto sans tc', 'noto sans cjk tc', 'dfkai-sb', '標楷體', 'serif', 'sans-serif'
	]);

	// 讀回來的本機字體清單只有一份，三頁共用：
	// 不然在 APNG、FX、PNG 各按一次就會跳三次授權視窗
	let localFamilies = null;

	function fetchLocalFamilies() {
		if (localFamilies) return Promise.resolve(localFamilies);
		return window.queryLocalFonts().then(function (list) {
			const set = new Set();
			(list || []).forEach(function (f) {
				if (!f || !f.family) return;
				if (BASE_FAMILY_SET.has(f.family.toLowerCase())) return;
				set.add(f.family);
			});
			localFamilies = Array.from(set).sort(function (a, b) {
				return a.localeCompare(b, undefined, { sensitivity: 'base' });
			});
			return localFamilies;
		});
	}

	// ============================================================
	// 一份預設狀態（每頁各拿一份，互不影響）
	// ============================================================
	function defaultState() {
		return {
			text: '',
			font: 'ming',        // 預設細明體，跟示意圖一致
			size: 12,            // 字級：短邊的 12%
			color: '#000000',    // 字色預設黑色：淺色貼圖上黑字最清楚，白字常常直接融進背景
			bold: false,
			italic: false,
			underline: false,
			dx: 0,               // 位置偏移（%）：0 = 置中
			dy: 0,
			// 旋轉角度（0~360 度），以「文字區塊的中心」為軸心轉。
			// 存角度而不是弧度，是因為面板滑桿直接就是度數，不必來回換算
			rot: 0,
			// 只在這幾格出現：from 是第幾格開始（1 起算），to 的 0 代表「到最後一格」。
			// 存的是「格號」不是百分比，所以換圖片尺寸不影響；影格數量變動時
			// 由 render() 比對當下的總格數決定要不要畫
			from: 1,
			to: 0,
			// 淡入淡出：打開後文字在起始格淡入、在結束格淡出（太短的分段就不淡，避免半透明卡住）
			fade: false,
			outline: false,
			outlineW: 12,        // 外框粗細：字級的 12%
			outlineColor: '#000000',
			shadow: false,
			shadowSize: 15,      // 陰影模糊：字級的 15%
			shadowColor: '#000000'
		};
	}

	// ============================================================
	// 這一格要不要顯示文字
	// index 是「第幾格」（1 起算）、total 是總格數；to = 0 表示一路畫到最後一格。
	// 沒有傳 index 的呼叫（例如 PNG 頁的單張圖）就當作永遠顯示。
	// ============================================================
	function visibleAt(st, index, total) {
		if (index == null) return true;
		const from = Math.max(1, parseInt(st.from, 10) || 1);
		const to = parseInt(st.to, 10) || 0;
		if (index < from) return false;
		if (to > 0 && index > (total ? Math.min(to, total) : to)) return false;
		return true;
	}

	// ============================================================
	// 這一格的文字要多透明
	// 淡入淡出的長度取整段的三分之一（最少 1 格、最多 5 格），
	// 首格是 1/(len+1) 的不透明度，看起來像從背景裡浮出來；尾格反過來淡出。
	// 段落只有 1～2 格時乾脆不淡 —— 否則字會一直停在半透明，反而像做壞了。
	// ============================================================
	function frameAlpha(st, index, total) {
		if (!st.fade || index == null) return 1;
		const from = Math.max(1, parseInt(st.from, 10) || 1);
		const to = parseInt(st.to, 10) || 0;
		const end = to > 0 ? (total ? Math.min(to, total) : to) : (total || index);
		const span = end - from + 1;
		if (span < 3) return 1;
		const len = Math.max(1, Math.min(5, Math.round(span / 3)));
		let a = 1;
		if (index - from + 1 <= len) a = (index - from + 1) / (len + 1);
		if (end - index + 1 <= len) a = Math.min(a, (end - index + 1) / (len + 1));
		return Math.max(0, Math.min(1, a));
	}

	// ============================================================
	// 繪製核心：把文字畫到任何 2D context 上
	// ctx 的座標系就是「圖片」的座標系，所以 W / H 一律傳圖片尺寸
	// frameIndex / totalFrames 有傳才會套用「顯示在第幾格到第幾格」的限制
	// ============================================================
	function render(ctx, W, H, st, frameIndex, totalFrames) {
		if (!ctx || !st || !st.text) return;
		if (!visibleAt(st, frameIndex, totalFrames)) return;
		const alpha = frameAlpha(st, frameIndex, totalFrames);
		const lines = String(st.text).split('\n');
		const base = Math.min(W, H);
		const fs = Math.max(4, base * (Number(st.size) || 12) / 100);

		ctx.save();
		// 淡入淡出只影響這一層的繪製；save / restore 會把 globalAlpha 還原，
		// 不會污染外面（例如編碼流程同一顆 context 還要畫下一格）
		ctx.globalAlpha = alpha;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		// 粗體 / 斜體直接交給 canvas 的字型字串（中文沒有真斜體，瀏覽器會自動做傾斜）
		ctx.font = (st.italic ? 'italic ' : '') + (st.bold ? 'bold ' : '')
			+ fs.toFixed(1) + 'px ' + fontCss(st.font);

		const cx = W / 2 + W * (Number(st.dx) || 0) / 100;
		const cy = H / 2 + H * (Number(st.dy) || 0) / 100;
		const lineH = fs * 1.25;
		const totalH = lineH * lines.length;

		// 旋轉：以「文字區塊的中心」(cx, cy) 為軸心。
		// 做法是把座標系搬過去 → 轉 → 搬回來，之後的繪字、外框、陰影、底線
		// 全都沿用原本的算式，自然就一起轉了（不必逐個元素另外算旋轉矩陣）。
		// 0 度時整個 if 都不進去，等於沒有這項功能，不會拖慢每一格。
		const rotDeg = ((Number(st.rot) || 0) % 360 + 360) % 360;
		if (rotDeg) {
			const rad = rotDeg * Math.PI / 180;
			ctx.translate(cx, cy);
			ctx.rotate(rad);
			ctx.translate(-cx, -cy);
		}

		lines.forEach(function (line, i) {
			if (!line) return;
			const y = cy - totalH / 2 + lineH * i + lineH / 2;

			// 外框：先描一圈再填字，lineJoin 用 round 才不會在轉角爆出尖刺
			if (st.outline) {
				ctx.lineJoin = 'round';
				ctx.lineWidth = Math.max(0.5, fs * (Number(st.outlineW) || 12) / 100);
				ctx.strokeStyle = st.outlineColor || '#000000';
				ctx.strokeText(line, cx, y);
			}

			// 陰影：模糊半徑與下移量都跟著字級走，字放大時陰影才會一起放大
			if (st.shadow) {
				ctx.shadowColor = st.shadowColor || '#000000';
				ctx.shadowBlur = fs * (Number(st.shadowSize) || 15) / 100;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = fs * (Number(st.shadowSize) || 15) / 100 * 0.25;
			} else {
				ctx.shadowColor = 'transparent';
				ctx.shadowBlur = 0;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 0;
			}

			ctx.fillStyle = st.color || '#000000';
			ctx.fillText(line, cx, y);

			// 填完字就把陰影關掉，否則底線會再吃到一次陰影、看起來髒髒的
			ctx.shadowColor = 'transparent';
			ctx.shadowBlur = 0;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;

			// 底線：canvas 沒有 textDecoration，只能自己量寬度量一條線
			if (st.underline) {
				const w = ctx.measureText(line).width;
				const uy = y + fs / 2 + fs * 0.1;
				ctx.strokeStyle = st.color || '#000000';
				ctx.lineWidth = Math.max(1, fs / 14);
				ctx.beginPath();
				ctx.moveTo(cx - w / 2, uy);
				ctx.lineTo(cx + w / 2, uy);
				ctx.stroke();
			}
		});
		ctx.restore();
	}

	// ============================================================
	// 預覽疊層：在預覽舞台上蓋一層透明 canvas，位置跟著目標元素跑
	// stage：預覽舞台（.preview-stage）
	// target：目前顯示的 <img> 或 <canvas>
	// ============================================================
	function paintOverlay(stage, target, st, frameIndex, totalFrames) {
		if (!stage) return;
		let cv = stage.querySelector('.tp-overlay');

		// 沒有文字、或這一格不在顯示範圍內，就把整層收起來，不做多餘的繪製
		if (!st || !st.text || !visibleAt(st, frameIndex, totalFrames)) {
			if (cv) cv.style.display = 'none';
			return;
		}
		if (!target || !target.getBoundingClientRect) return;
		if (target.style && target.style.display === 'none') {
			if (cv) cv.style.display = 'none';
			return;
		}

		const s = stage.getBoundingClientRect();
		const t = target.getBoundingClientRect();
		if (t.width < 1 || t.height < 1) {
			if (cv) cv.style.display = 'none';
			return;
		}

		if (!cv) {
			cv = document.createElement('canvas');
			cv.className = 'tp-overlay';
			stage.appendChild(cv);
		}
		cv.style.display = 'block';
		// 跟 source-frame.js 一樣用「目標 − 舞台」的相對座標（扣掉舞台邊框）
		cv.style.left = (t.left - s.left - (stage.clientLeft || 0)) + 'px';
		cv.style.top = (t.top - s.top - (stage.clientTop || 0)) + 'px';
		cv.style.width = t.width + 'px';
		cv.style.height = t.height + 'px';

		// devicePixelRatio 讓字在 Retina 上不會糊；上限 2 是為了別把記憶體吃掉
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const cw = Math.max(1, Math.round(t.width * dpr));
		const ch = Math.max(1, Math.round(t.height * dpr));
		if (cv.width !== cw) cv.width = cw;
		if (cv.height !== ch) cv.height = ch;

		const ctx = cv.getContext('2d');
		ctx.clearRect(0, 0, cw, ch);
		render(ctx, cw, ch, st, frameIndex, totalFrames);
	}

	// ============================================================
	// 面板：用同一份模板生出「十字鍵 + 文字輸入 + 字體 + X/Y + B/I/U + 進階設定」
	// 因為三頁要長得一樣，寫成 HTML 字串再由這裡組出來，就不用在 index.html 貼三份
	// ============================================================
	function panelHtml(prefix) {
		const fontOptions = FONTS.map(function (f) {
			return '<option value="' + f.id + '" data-i18n="' + f.key + '">' + t(f.key) + '</option>';
		}).join('');

		return ''
			+ '<div class="tp-row">'
			+ '  <div class="tp-pad" id="' + prefix + 'Pad">'
			+ '    <button type="button" class="tp-btn tp-up" data-dir="up" title="' + t('tpUp') + '"><small class="cat cat-081"></small></button>'
			+ '    <button type="button" class="tp-btn tp-left" data-dir="left" title="' + t('tpLeft') + '"><small class="cat cat-082"></small></button>'
			+ '    <button type="button" class="tp-btn tp-center" data-dir="reset" title="' + t('tpReset') + '"></button>'
			+ '    <button type="button" class="tp-btn tp-right" data-dir="right" title="' + t('tpRight') + '"><small class="cat cat-083"></small></button>'
			+ '    <button type="button" class="tp-btn tp-down" data-dir="down" title="' + t('tpDown') + '"><small class="cat cat-249"></small></button>'
			+ '  </div>'
			+ '  <div class="tp-main">'
			+ '    <input type="text" class="tp-text" id="' + prefix + 'Text" placeholder="' + t('tpPlaceholder') + '" data-i18n-placeholder="tpPlaceholder">'
			+ '    <div class="tp-font-row">'
			+ '      <select class="tp-font" id="' + prefix + 'Font">' + fontOptions + '</select>'
			// 只有支援 queryLocalFonts 的瀏覽器（Chrome / Edge）才看得到這顆，
			// 按下去會跳系統授權，允許之後把清單塞進上面的選單
			+ '      <button type="button" class="tp-font-local" id="' + prefix + 'FontLocal" data-i18n="tpLoadFonts" title="' + t('tpLoadFonts') + '">' + t('tpLoadFonts') + '</button>'
			+ '      <span class="tp-font-status" id="' + prefix + 'FontStatus"></span>'
			+ '    </div>'
			+ '    <div class="tp-fields">'
			+ '      <div class="tp-field"><span class="tp-label" data-i18n="foXLabel">' + t('foXLabel') + '</span>'
			+ '        <input type="number" step="1" value="0" id="' + prefix + 'X"></div>'
			+ '      <div class="tp-field"><span class="tp-label" data-i18n="foYLabel">' + t('foYLabel') + '</span>'
			+ '        <input type="number" step="1" value="0" id="' + prefix + 'Y"></div>'
			// 顯示格範圍：預設第一格到最後一格；勾了「淡入淡出」兩端會自動變透明
			// （單張圖的 PNG 頁由 mount 把整組藏起來）
			+ '      <div class="tp-frames" id="' + prefix + 'Frames">'
			+ '        <div class="tp-field tp-frame-field"><span class="tp-label" data-i18n="tpFrom">' + t('tpFrom') + '</span>'
			+ '          <input type="number" step="1" min="1" value="1" id="' + prefix + 'From" title="' + t('tpFromHint') + '" data-i18n-title="tpFromHint"></div>'
			+ '        <div class="tp-field tp-frame-field"><span class="tp-label" data-i18n="tpTo">' + t('tpTo') + '</span>'
			+ '          <input type="number" step="1" min="0" value="0" id="' + prefix + 'To" title="' + t('tpToHint') + '" data-i18n-title="tpToHint"></div>'
			+ '        <label class="tp-check"><input type="checkbox" id="' + prefix + 'Fade">'
			+ '          <span data-i18n="tpFade">' + t('tpFade') + '</span></label>'
			+ '      </div>'
			+ '    </div>'
			+ '  </div>'
			+ '  <div class="tp-style">'
			// 粗體／斜體／底線改用站內圖示字型（cat-002 / cat-003 / cat-004），
			// 不再用 B／I／U 三個字母去偽裝字形——字母在 32×28 的小方鈕裡本來就偏擠，
			// 而且斜體、虛線底線那些 CSS 對「字」有效、對「圖示」只會多出一條雜線
			+ '    <button type="button" class="tp-sbtn" id="' + prefix + 'B" title="' + t('tpBold') + '"><cat class="cat cat-002"></cat></button>'
			+ '    <button type="button" class="tp-sbtn" id="' + prefix + 'I" title="' + t('tpItalic') + '"><cat class="cat cat-003"></cat></button>'
			+ '    <button type="button" class="tp-sbtn" id="' + prefix + 'U" title="' + t('tpUnderline') + '"><cat class="cat cat-004"></cat></button>'
			+ '  </div>'
			+ '</div>'
			+ '<div class="tp-adv">'
			+ '  <div class="tp-line">'
			+ '    <label data-i18n="tpSize">' + t('tpSize') + '</label>'
			+ '    <input type="range" id="' + prefix + 'Size" min="3" max="40" value="12">'
			+ '    <span class="tp-val" id="' + prefix + 'SizeVal">12%</span>'
			// 字色緊接在字級後面，跟外框、陰影那兩列的色票一樣落在最右邊，四列右緣對齊
			+ '    <input type="color" id="' + prefix + 'Color" value="#000000" title="' + t('tpColor') + '" data-i18n-title="tpColor">'
			+ '  </div>'
			// 旋轉：0~360 度，軸心是「文字區塊的中心」（正值順時針）
			+ '  <div class="tp-line">'
			+ '    <label data-i18n="tpRotate">' + t('tpRotate') + '</label>'
			+ '    <input type="range" id="' + prefix + 'Rot" min="0" max="360" step="1" value="0">'
			+ '    <span class="tp-val" id="' + prefix + 'RotVal">0°</span>'
			+ '  </div>'
			+ '  <div class="tp-line tp-flag">'
			+ '    <label><input type="checkbox" id="' + prefix + 'OutlineOn">'
			+ '      <span data-i18n="tpOutline">' + t('tpOutline') + '</span></label>'
			+ '    <input type="range" id="' + prefix + 'OutlineW" min="1" max="40" value="12">'
			+ '    <span class="tp-val" id="' + prefix + 'OutlineWVal">12%</span>'
			+ '    <input type="color" id="' + prefix + 'OutlineColor" value="#000000">'
			+ '  </div>'
			+ '  <div class="tp-line tp-flag">'
			+ '    <label><input type="checkbox" id="' + prefix + 'ShadowOn">'
			+ '      <span data-i18n="tpShadow">' + t('tpShadow') + '</span></label>'
			+ '    <input type="range" id="' + prefix + 'ShadowSize" min="1" max="60" value="15">'
			+ '    <span class="tp-val" id="' + prefix + 'ShadowSizeVal">15%</span>'
			+ '    <input type="color" id="' + prefix + 'ShadowColor" value="#000000">'
			+ '  </div>'
			+ '</div>';
	}

	/**
	 * 建立一個文字面板實例
	 * @param {Element} container 掛載容器
	 * @param {Object} opts
	 *   prefix    DOM id 前綴（app / fx / png，三頁不可重複）
	 *   onChange  任何設定變動後呼叫，讓該頁去重畫預覽
	 */
	function mount(container, opts) {
		if (!container) return null;
		const prefix = (opts && opts.prefix) || 'tp';
		const st = defaultState();

		container.innerHTML = panelHtml(prefix);

		const textIn = document.getElementById(prefix + 'Text');
		const fontIn = document.getElementById(prefix + 'Font');
		const xIn = document.getElementById(prefix + 'X');
		const yIn = document.getElementById(prefix + 'Y');
		const bBtn = document.getElementById(prefix + 'B');
		const iBtn = document.getElementById(prefix + 'I');
		const uBtn = document.getElementById(prefix + 'U');
		const sizeIn = document.getElementById(prefix + 'Size');
		const sizeVal = document.getElementById(prefix + 'SizeVal');
		const rotIn = document.getElementById(prefix + 'Rot');
		const rotVal = document.getElementById(prefix + 'RotVal');
		const colorIn = document.getElementById(prefix + 'Color');
		const oOn = document.getElementById(prefix + 'OutlineOn');
		const oW = document.getElementById(prefix + 'OutlineW');
		const oWVal = document.getElementById(prefix + 'OutlineWVal');
		const oColor = document.getElementById(prefix + 'OutlineColor');
		const sOn = document.getElementById(prefix + 'ShadowOn');
		const sSize = document.getElementById(prefix + 'ShadowSize');
		const sSizeVal = document.getElementById(prefix + 'ShadowSizeVal');
		const sColor = document.getElementById(prefix + 'ShadowColor');
		const pad = document.getElementById(prefix + 'Pad');
		const fromIn = document.getElementById(prefix + 'From');
		const toIn = document.getElementById(prefix + 'To');
		const fadeIn = document.getElementById(prefix + 'Fade');
		const framesBox = document.getElementById(prefix + 'Frames');
		const fontLocalBtn = document.getElementById(prefix + 'FontLocal');
		const fontStatus = document.getElementById(prefix + 'FontStatus');

		// PNG 頁只有一張圖，沒有「第幾格」的概念，整個格號區塊（含淡入淡出）收起來
		if (opts && opts.singleFrame && framesBox) {
			framesBox.style.display = 'none';
		}

		// 瀏覽器沒有 Local Font Access（Firefox / Safari / 非 HTTPS 環境）就把那顆藏起來，
		// 留著一顆按了沒反應的按鈕只會讓人以為壞了
		if (fontLocalBtn && typeof window.queryLocalFonts !== 'function') {
			fontLocalBtn.style.display = 'none';
		}

		// 把讀回來的本機字體塞進選單（只塞一次，之後再加又按也只會重複一份）
		function fillLocalFontGroup() {
			if (!fontIn || fontIn.querySelector('optgroup')) return;
			if (!localFamilies || !localFamilies.length) return;
			const group = document.createElement('optgroup');
			group.label = t('tpFontGroup');
			localFamilies.forEach(function (family) {
				const opt = document.createElement('option');
				// value 帶 local: 前綴，fontCss() 才認得出這是本機字體
				opt.value = 'local:' + family;
				opt.textContent = family;
				group.appendChild(opt);
			});
			fontIn.appendChild(group);
			// 加選項會把 select 的選取狀態歸零，補回目前選的那一個
			fontIn.value = st.font;
		}

		let lastSig = '';

		// 統一的「改了 → 通知外面」入口：簽章沒變就不重畫，避免拖滑桿時做白工
		function changed() {
			const sig = [st.text, st.font, st.size, st.color, st.bold, st.italic, st.underline,
				st.dx, st.dy, st.rot, st.from, st.to, st.fade, st.outline, st.outlineW, st.outlineColor,
				st.shadow, st.shadowSize, st.shadowColor].join('|');
			if (sig === lastSig) return;
			lastSig = sig;
			if (opts && typeof opts.onChange === 'function') opts.onChange(st);
		}

		// 把狀態寫回 DOM（切語言、外部設定時用）
		function sync() {
			textIn.value = st.text;
			fontIn.value = st.font;
			if (document.activeElement !== xIn) xIn.value = st.dx;
			if (document.activeElement !== yIn) yIn.value = st.dy;
			bBtn.classList.toggle('active', st.bold);
			iBtn.classList.toggle('active', st.italic);
			uBtn.classList.toggle('active', st.underline);
			sizeIn.value = st.size;
			sizeVal.textContent = st.size + '%';
			if (rotIn) rotIn.value = st.rot;
			if (rotVal) rotVal.textContent = st.rot + '°';
			colorIn.value = st.color;
			oOn.checked = st.outline;
			oW.value = st.outlineW;
			oWVal.textContent = st.outlineW + '%';
			oColor.value = st.outlineColor;
			sOn.checked = st.shadow;
			sSize.value = st.shadowSize;
			sSizeVal.textContent = st.shadowSize + '%';
			sColor.value = st.shadowColor;
			if (fromIn && document.activeElement !== fromIn) fromIn.value = st.from;
			if (toIn && document.activeElement !== toIn) toIn.value = st.to;
			if (fadeIn) fadeIn.checked = !!st.fade;
			// 外框 / 陰影沒開的時候，下面那幾個控制項淡掉，讓使用者知道現在沒作用
			oW.disabled = oColor.disabled = !st.outline;
			sSize.disabled = sColor.disabled = !st.shadow;
		}

		// ---- 文字與字體 ----
		textIn.addEventListener('input', function () {
			st.text = textIn.value;
			changed();
		});
		fontIn.addEventListener('change', function () {
			st.font = fontIn.value;
			changed();
		});

		// ---- 讀取本機字體：按了才跳授權，允許後把清單塞進上面的下拉 ----
		if (fontLocalBtn && typeof window.queryLocalFonts === 'function') {
			// 別的頁面已經讀過就先把清單補進來，不必再按一次（按鈕也一併收起來）
			if (localFamilies) {
				fillLocalFontGroup();
				if (fontStatus) fontStatus.textContent = t('tpFontDone', { n: localFamilies.length });
				fontLocalBtn.style.display = 'none';
			}
			fontLocalBtn.addEventListener('click', function () {
				if (fontStatus) fontStatus.textContent = '';
				fontLocalBtn.disabled = true;
				fetchLocalFamilies().then(function () {
					fillLocalFontGroup();
					if (fontStatus) fontStatus.textContent = t('tpFontDone', { n: localFamilies.length });
					// 讀到之後這顆就沒事了，收起來讓選單拿回整條寬度
					fontLocalBtn.style.display = 'none';
				}).catch(function () {
					// 多半是使用者在授權視窗按了「不允許」，再按一次還有機會
					if (fontStatus) fontStatus.textContent = t('tpFontDenied');
					fontLocalBtn.disabled = false;
				});
			});
		}

		// ---- X / Y 位移（輸入框，按 Enter 或失焦才算數）----
		function readNum(input, limit) {
			const v = parseInt(input.value, 10);
			if (isNaN(v)) return 0;
			return Math.max(-limit, Math.min(limit, v));
		}
		xIn.addEventListener('change', function () {
			st.dx = readNum(xIn, 200);
			xIn.value = st.dx;
			changed();
		});
		yIn.addEventListener('change', function () {
			st.dy = readNum(yIn, 200);
			yIn.value = st.dy;
			changed();
		});

		// ---- 顯示格範圍：起始格至少 1，結束格 0 代表到最後一格 ----
		if (fromIn) {
			fromIn.addEventListener('change', function () {
				let v = parseInt(fromIn.value, 10);
				if (isNaN(v) || v < 1) v = 1;
				st.from = v;
				fromIn.value = v;
				changed();
			});
		}
		if (toIn) {
			toIn.addEventListener('change', function () {
				let v = parseInt(toIn.value, 10);
				if (isNaN(v) || v < 0) v = 0;
				st.to = v;
				toIn.value = v;
				changed();
			});
		}

		if (fadeIn) {
			fadeIn.addEventListener('change', function () {
				st.fade = fadeIn.checked;
				changed();
			});
		}

		// ---- 十字鍵：一次走 2 個百分點，中間那顆回正中 ----
		const STEP = 2;
		pad.addEventListener('click', function (e) {
			const btn = e.target.closest('.tp-btn');
			if (!btn) return;
			e.preventDefault();
			const dir = btn.dataset.dir;
			if (dir === 'reset') {
				st.dx = 0;
				st.dy = 0;
			} else {
				if (dir === 'left') st.dx = Math.max(-200, st.dx - STEP);
				if (dir === 'right') st.dx = Math.min(200, st.dx + STEP);
				if (dir === 'up') st.dy = Math.max(-200, st.dy - STEP);
				if (dir === 'down') st.dy = Math.min(200, st.dy + STEP);
			}
			sync();
			changed();
		});

		// ---- 粗體 / 斜體 / 底線 ----
		bBtn.addEventListener('click', function () {
			st.bold = !st.bold;
			sync();
			changed();
		});
		iBtn.addEventListener('click', function () {
			st.italic = !st.italic;
			sync();
			changed();
		});
		uBtn.addEventListener('click', function () {
			st.underline = !st.underline;
			sync();
			changed();
		});

		// ---- 字級 / 旋轉 / 顏色 ----
		sizeIn.addEventListener('input', function () {
			st.size = parseInt(sizeIn.value, 10) || 12;
			sizeVal.textContent = st.size + '%';
			changed();
		});
		if (rotIn) {
			rotIn.addEventListener('input', function () {
				// 滑桿本身就只給 0~360，這裡再夾一次是為了避免有人用開發者工具亂改值
				const v = Math.max(0, Math.min(360, parseInt(rotIn.value, 10) || 0));
				st.rot = v;
				if (rotVal) rotVal.textContent = v + '°';
				changed();
			});
		}
		colorIn.addEventListener('input', function () {
			st.color = colorIn.value;
			changed();
		});

		// ---- 外框 ----
		oOn.addEventListener('change', function () {
			st.outline = oOn.checked;
			sync();
			changed();
		});
		oW.addEventListener('input', function () {
			st.outlineW = parseInt(oW.value, 10) || 12;
			oWVal.textContent = st.outlineW + '%';
			changed();
		});
		oColor.addEventListener('input', function () {
			st.outlineColor = oColor.value;
			changed();
		});

		// ---- 陰影 ----
		sOn.addEventListener('change', function () {
			st.shadow = sOn.checked;
			sync();
			changed();
		});
		sSize.addEventListener('input', function () {
			st.shadowSize = parseInt(sSize.value, 10) || 15;
			sSizeVal.textContent = st.shadowSize + '%';
			changed();
		});
		sColor.addEventListener('input', function () {
			st.shadowColor = sColor.value;
			changed();
		});

		sync();

		const api = {
			state: st,
			sync: sync,
			changed: changed,
			contains: function (el) { return container.contains(el); }
		};
		registry[prefix] = api;
		return api;
	}

	// 三頁的實例都放這裡，讓 apng-encoder.js / png-editor.js / fx.js 取用
	const registry = {};

	window.TextOverlay = {
		render: render,
		paintOverlay: paintOverlay,
		mount: mount,
		defaultState: defaultState,
		instances: registry
	};
})();
