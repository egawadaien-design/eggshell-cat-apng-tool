/**
 * 蛋殼喵 APNG 工具 — 獨立影格設置（單格位移微調）
 * 每一格可以個別往上下左右移動 2px，中間那顆按鈕把該格還原成剛載入的樣子
 * @author [DaiEn]
 * @Date: 2026-11-12
 * @Correction: 5
 * 2026-11-12 追加：面板右側新增「隱藏」鈕（foHideBtn），收合狀態記在 localStorage；
 *                 收起來後由排序列的「顯示」鈕（foShowBtn）叫回來
 *
 * 【為什麼每個影格要留一份「原始檔」】
 *   如果每按一次就直接往「目前的圖」再位移 2px，位移量會烙進像素裡，
 *   那麼「恢復初始狀態」就沒有東西可以還原了。所以每個影格都保留
 *   使用者當初載入的那份 File，位移量另外記成 dx / dy 兩個數字，
 *   要顯示或輸出時才用原始圖重新算一次。
 *
 * 【為什麼用 WeakMap 而不是跟 files 平行的陣列】
 *   files 會被交換順序、移到最前最後、刪除、複製，平行陣列很容易某處忘了同步；
 *   WeakMap 直接以 File 物件本身當 key，搬動與刪除都不必維護，
 *   被丟掉的舊 File 也會連同記錄一起自動回收。
 *
 * 【位移怎麼作用到輸出】
 *   位移後的結果會直接「烘焙」成新的 File 取代 files[i]，
 *   所以 apng-encoder.js 完全不必改：它拿到的就已經是位移好的圖。
 *   畫布尺寸不變，移出邊界的地方會被裁掉、露出來的地方保持透明，
 *   這樣每格尺寸仍然一致，不會踩到 encoder 的 sizeMismatch 檢查。
 */

(function frameOffset() {
	'use strict';

	// ============================================================
	// 每格的位移記錄：File → { orig, dx, dy, token }
	// ============================================================
	const shiftMeta = new WeakMap();

	function getMeta(file) {
		if (!file) return null;
		let m = shiftMeta.get(file);
		if (!m) {
			// 第一次碰到這個影格代表它還沒被位移過，原始檔就是它自己
			m = { orig: file, dx: 0, dy: 0, token: 0 };
			shiftMeta.set(file, m);
		}
		return m;
	}

	// 給 apng-frames.js 的 duplicateFrame() 用：
	// 複製出來的格要沿用同一份原始圖與同樣的位移量，否則「恢復初始狀態」
	// 會還原成「位移後」的樣子，行為就跟原本那格不一致了
	function inheritFrameMeta(from, to) {
		if (!from || !to) return;
		const m = shiftMeta.get(from);
		if (!m) return;
		shiftMeta.set(to, m);
	}

	// ============================================================
	// 面板 DOM
	// ============================================================
	const panel = document.getElementById('frameOffsetPanel');
	if (!panel) return;   // 舊版 HTML 沒有這塊面板就整支跳過，不影響其他功能

	const pad = document.getElementById('foPad');
	const xInput = document.getElementById('foX');
	const yInput = document.getElementById('foY');
	const frameText = document.getElementById('foFrameText');
	const nameText = document.getElementById('foName');
	const msText = document.getElementById('foMs');
	// 收合鈕：面板內的「隱藏」把整塊收起來，排序列上的「顯示」把它叫回來
	// （HTML 若沒有這兩顆就當作沒有收合功能，其他行為不受影響）
	const hideBtn = document.getElementById('foHideBtn');
	const showBtn = document.getElementById('foShowBtn');
	const HIDE_KEY = 'apng-fo-hidden';
	// 收合狀態記在 localStorage：這次嫌它占位子，下次開頁面也維持收起來
	let collapsed = false;
	try { collapsed = localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { collapsed = false; }

	// 一次按鍵走幾像素：固定 2px，使用者要更精細就用下方輸入框直接打數字
	const STEP = 2;
	// 輸入框允許的範圍：太大會整張圖移出畫布，給個上限避免誤打
	const LIMIT = 999;

	// ============================================================
	// 面板同步：永遠顯示「目前選取的那一格」
	// ============================================================
	function refreshFrameOffsetPanel() {
		if (typeof files === 'undefined' || files.length === 0) {
			panel.style.display = 'none';
			if (showBtn) showBtn.style.display = 'none';
			return;
		}
		// 收起來的時候整塊不佔位，改由排序列那顆「顯示」鈕提醒使用者它還在
		panel.style.display = collapsed ? 'none' : '';
		if (showBtn) showBtn.style.display = collapsed ? '' : 'none';
		const i = Math.min(currentFrame, files.length - 1);
		const m = getMeta(files[i]);

		frameText.textContent = t('foFrame', { n: i + 1 });
		nameText.textContent = files[i].name;
		msText.textContent = (frameDelays[i] || 100) + 'ms';

		// 正在輸入的那個框不要去覆寫它，免得打到一半被自己的更新蓋掉
		if (document.activeElement !== xInput) xInput.value = m.dx;
		if (document.activeElement !== yInput) yInput.value = m.dy;
	}

	// 掛到 window 讓 apng-frames.js 的 showFrame() 能呼叫（那邊用 typeof 判斷存在）
	window.refreshFrameOffsetPanel = refreshFrameOffsetPanel;
	window.inheritFrameMeta = inheritFrameMeta;

	// ============================================================
	// 依 dx / dy 重新產生某一格的圖
	// dx 正的往右、負的往左；dy 正的往下、負的往上（跟 Canvas 座標系一致）
	// ============================================================
	async function applyShift(index, dx, dy) {
		if (typeof files === 'undefined' || index < 0 || index >= files.length) return;
		const m = getMeta(files[index]);
		if (!m) return;

		m.dx = dx;
		m.dy = dy;

		// 連按時只讓最後一次生效：每次呼叫都拿走一個新號碼，
		// 非同步解碼回來後若號碼已經被超過，就代表中途又被按過，這次結果直接作廢
		const token = ++m.token;

		const oldUrl = previewUrls[index];

		if (dx === 0 && dy === 0) {
			// 位移歸零就換回原始檔，不必重新編碼一次（比較快，也不會白白掉一次畫質）
			files[index] = m.orig;
			shiftMeta.set(m.orig, m);
			previewUrls[index] = URL.createObjectURL(m.orig);
		} else {
			const bitmap = await createImageBitmap(m.orig);
			if (token !== m.token) return;

			const canvas = document.createElement('canvas');
			canvas.width = bitmap.width;
			canvas.height = bitmap.height;
			const ctx = canvas.getContext('2d');
			// 只畫一張、平移 dx / dy：沒畫到的地方維持透明，超出畫布的部分自然被裁掉
			ctx.drawImage(bitmap, dx, dy);
			if (typeof bitmap.close === 'function') bitmap.close();   // 解碼後的記憶體早點釋放

			const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
			if (!blob || token !== m.token) return;

			const shifted = new File([blob], m.orig.name, { type: 'image/png' });
			shiftMeta.set(shifted, m);
			files[index] = shifted;
			previewUrls[index] = URL.createObjectURL(shifted);
		}

		// 舊的 object URL 已經沒有元素在用了，回收掉才不會愈按愈佔記憶體
		if (oldUrl && oldUrl !== previewUrls[index] && oldUrl.indexOf('blob:') === 0) {
			URL.revokeObjectURL(oldUrl);
		}

		renderList();
		renderTimeline();       // 卡片縮圖與上方時間軸都會跟著更新
		showFrame(index);       // showFrame 內會順便重畫面板資訊
	}

	// ============================================================
	// 方向鍵：上 / 下 / 左 / 右 / 中間還原
	// ============================================================
	pad.addEventListener('click', (e) => {
		const btn = e.target.closest('.fo-btn');
		if (!btn || typeof files === 'undefined' || files.length === 0) return;
		e.preventDefault();

		if (typeof pause === 'function') pause();   // 調整時先停播，免得按到正在播的那一格

		const i = Math.min(currentFrame, files.length - 1);
		const m = getMeta(files[i]);
		const dir = btn.dataset.dir;

		if (dir === 'reset') {
			applyShift(i, 0, 0);
			return;
		}
		const nx = m.dx + (dir === 'left' ? -STEP : dir === 'right' ? STEP : 0);
		const ny = m.dy + (dir === 'up' ? -STEP : dir === 'down' ? STEP : 0);
		applyShift(i, nx, ny);
	});

	// ============================================================
	// 直接輸入偏移量（失焦或按 Enter 才套用，避免邊打邊重算）
	// ============================================================
	function readOffset(input) {
		const v = parseInt(input.value, 10);
		if (isNaN(v)) return 0;
		return Math.max(-LIMIT, Math.min(LIMIT, v));
	}

	function applyFromInputs() {
		if (typeof files === 'undefined' || files.length === 0) return;
		const i = Math.min(currentFrame, files.length - 1);
		applyShift(i, readOffset(xInput), readOffset(yInput));
	}
	xInput.addEventListener('change', applyFromInputs);
	yInput.addEventListener('change', applyFromInputs);

	// ============================================================
	// 影格卡上的延遲輸入會改到面板顯示的「100ms」，用事件代理即時跟上
	// （卡片是每次渲染重建的，所以監聽掛在外層容器才不會被重建掉）
	// ============================================================
	// 影格卡上的延遲輸入會改到面板顯示的「100ms」，用事件代理即時跟上
	// 【踩過的坑】這裡一定要用「捕獲階段」（第三個參數 true）：
	//   卡片裡的延遲輸入自己會呼叫 e.stopPropagation()，冒泡到 frameGrid 的事件
	//   會被它擋掉，掛在冒泡階段一輩子都收不到；
	//   捕獲階段是由外往內、在目標自身的處理器之前跑完，所以一定收得到。
	const grid = document.getElementById('frameGrid');
	if (grid) grid.addEventListener('input', refreshFrameOffsetPanel, true);

	// ============================================================
	// 收合 / 展開
	// 只是 display:none，位移記錄與 files 完全沒動，展開後數值照舊
	// ============================================================
	function setCollapsed(v) {
		collapsed = v;
		try { localStorage.setItem(HIDE_KEY, v ? '1' : '0'); } catch (e) { /* 無痕模式不給寫就算了 */ }
		refreshFrameOffsetPanel();
	}
	if (hideBtn) hideBtn.addEventListener('click', () => setCollapsed(true));
	if (showBtn) showBtn.addEventListener('click', () => setCollapsed(false));

	// 初始狀態：沒有影格時先收起來
	refreshFrameOffsetPanel();
})();
