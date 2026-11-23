/**
 * 蛋殼喵 APNG 工具 — Meme 展示邏輯（嵌在 index.html tab-meme）
 * @author [DaiEn]
 * @Date: 2026-11-23
 * @Correction: 9
 * 本次修正：卡片加「小紅心」按讚鈕——未點亮 cat-123／已點亮 cat-252，右邊顯示次數；
 *           計數走 Supabase RPC like_meme()（security definer，前端 anon key 不能直接 UPDATE），
 *           點過的 id 記在 localStorage，所以「已點亮」只對同一個瀏覽器有效；
 *           寫回失敗時會把紅心與次數一起還原（避免出現「紅心亮了、次數還是 0」的假狀態）
 * 上次修正：init() 加上幂等旗標（grid.dataset.memeInit）並改為沿用既有的 .meme-pager，
 *           修正 init 被 DOM ready 與 i18n renderMemes 各叫一次、導致 Meme 頁出現兩排分頁的問題
 *
 * 提供 window.loadMemePage(page) 給 share.js 呼叫
 * 每次顯示最新 20 筆，底部分頁
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
(function () {
	'use strict';

	// 先定義 renderMemes，不管 init 有沒有跑完都能被 i18n.js 呼叫
	// 如果 init 好了就直接重新載入；還沒好就先 init 再載入
	window.renderMemes = function () {
		if (typeof window.loadMemePage === 'function') {
			window.loadMemePage(0);
		} else {
			// loadMemePage 還沒定義，表示 init 還沒跑完，先跑一次
			init();
		}
	};

	function init() {
		const grid = document.getElementById('memeGrid');
		if (!grid) return;

		// 只初始化一次：init 會被兩個時機各叫一次——
		//   ① 本檔最下方的 DOM ready 區塊
		//   ② i18n 首次 applyLang 呼叫 window.renderMemes()（此時 loadMemePage 還沒定義，會 fallback 叫 init）
		// 以前每叫一次就 new 一個 .meme-pager 接在 grid 後面，所以 Meme 頁會出現兩排一樣的分頁。
		// 用 dataset 當旗標擋掉第二次；放資料屬性而不是模組變數，是為了讓 thin page 重建 DOM 後能重新初始化。
		if (grid.dataset.memeInit === '1') return;
		grid.dataset.memeInit = '1';

		// 先定義一個空的 loadMemePage，避免 renderMemes 呼叫到 undefined
		window.loadMemePage = function () {};

		const cfg = window.SUPABASE_CONFIG;

		// 若 Supabase 未啟用：顯示提示
		if (!cfg || !cfg.enabled) {
			grid.innerHTML = '<div class="meme-empty">' + t('shareDisabled') + '</div>';
			return;
		}

		// 分頁容器：沿用已存在的，沒有才建一個（雙重保險，避免任何路徑又生出第二排）
		let pager = grid.parentElement.querySelector('.meme-pager');
		if (!pager) {
			pager = document.createElement('div');
			pager.className = 'meme-pager';
			grid.parentElement.appendChild(pager);
		}

		// 把標籤列移到分頁下方
		const tagBar = document.getElementById('memeTagBar');
		if (tagBar) grid.parentElement.appendChild(tagBar);

		const PAGE_SIZE = 6;
		let sbClient = null;
		let sortDesc = true;
		let currentTag = 0; // 0 = 全部

		const sortBtn = document.getElementById('memeSortBtn');
		const sortLabel = document.getElementById('memeSortLabel');

		function updateSortLabel() {
			if (sortLabel) {
				sortLabel.textContent = sortDesc ? t('memeSortDesc') : t('memeSortAsc');
			}
		}

		// 標籤列：點擊過濾
		if (tagBar) {
			tagBar.querySelectorAll('.meme-tag-btn').forEach(btn => {
				btn.addEventListener('click', () => {
					tagBar.querySelectorAll('.meme-tag-btn').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
					currentTag = parseInt(btn.dataset.tag, 10);
					loadMemePage(0);
				});
			});
		}

		if (sortBtn) {
			sortBtn.addEventListener('click', () => {
				sortDesc = !sortDesc;
				updateSortLabel();
				loadMemePage(0);
			});
		}
		updateSortLabel();

		try {
			if (window.supabase && cfg) {
				sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
			}
		} catch (e) { console.warn('meme supabase init fail', e); }

		function publicUrl(filename) {
			return cfg.url + '/storage/v1/object/public/' + cfg.bucket + '/' + filename;
		}

		// ============================================================
		// 小紅心（按讚）
		// 未點亮 cat-123、已點亮 cat-252；右邊顯示次數
		// 這個站沒有帳號，所以「誰點過讚」只能記在 localStorage——同一個瀏覽器才會記得，
		// 換裝置／清快取後紅心會回到未點亮（但次數本身仍以資料庫為準）
		// ============================================================
		const LIKED_KEY = 'apng-meme-likes';

		function likedList() {
			try {
				const arr = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]');
				return Array.isArray(arr) ? arr : [];
			} catch (e) { return []; }   // 被瀏覽器擋 localStorage（例如無痕）就當作沒點過
		}

		function isLiked(id) {
			return likedList().indexOf(id) !== -1;
		}

		function markLiked(id, on) {
			const arr = likedList();
			const i = arr.indexOf(id);
			if (on && i === -1) arr.push(id);
			if (!on && i !== -1) arr.splice(i, 1);
			try { localStorage.setItem(LIKED_KEY, JSON.stringify(arr)); } catch (e) { /* 寫不進去就只活在這一次瀏覽 */ }
		}

		// 點一下：先改畫面（樂觀更新），再把計數交給伺服器
		async function onLikeClick(btn, heart, num, id) {
			if (btn.dataset.busy === '1') return;      // 連點保護：等這一輪寫回結束再放行
			const before = isLiked(id);                // 點擊前的狀態，寫回失敗時要還原成它
			const next = !before;
			const delta = next ? 1 : -1;
			const n0 = parseInt(num.textContent, 10) || 0;
			const n1 = Math.max(0, n0 + delta);        // 次數不會被扣到負數

			btn.classList.toggle('liked', next);
			btn.setAttribute('aria-pressed', next ? 'true' : 'false');
			btn.title = next ? t('memeUnlike') : t('memeLike');
			heart.className = 'cat ' + (next ? 'cat-252' : 'cat-123');
			num.textContent = String(n1);
			markLiked(id, next);

			btn.dataset.busy = '1';
			try {
				if (!sbClient) throw new Error('supabase not ready');
				// 走 RPC 而不是 UPDATE：前端只有 anon key，直接 UPDATE 會被 RLS 擋掉；
				// 而且 apng_images 的 anon 權限是「整列可改」，開 UPDATE 等於讓人能改 approved/title
				const { data, error } = await sbClient.rpc('like_meme', { p_id: id, p_delta: delta });
				if (error) throw error;
				num.textContent = String(typeof data === 'number' ? data : n1);   // 以伺服器回傳的真實次數為準
			} catch (e) {
				// 寫回失敗 → 把紅心與次數一起還原，不要留下「亮了卻顯示 0」的假狀態
				btn.classList.toggle('liked', before);
				btn.setAttribute('aria-pressed', before ? 'true' : 'false');
				btn.title = before ? t('memeUnlike') : t('memeLike');
				heart.className = 'cat ' + (before ? 'cat-252' : 'cat-123');
				num.textContent = String(n0);
				markLiked(id, before);
				console.warn('[MEME] 按讚沒有寫回資料庫（like_meme 函式還沒建立？見 data/like_meme.sql）：', e.message || e);
			} finally {
				delete btn.dataset.busy;
			}
		}

		// 在卡片底部畫一顆紅心（放在作者列下面）
		function renderLike(card, row) {
			const id = Number(row.id);
			const liked = isLiked(id);

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'meme-like' + (liked ? ' liked' : '');
			btn.dataset.memeId = String(id);
			btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
			btn.title = liked ? t('memeUnlike') : t('memeLike');

			const heart = document.createElement('cat');
			heart.className = 'cat ' + (liked ? 'cat-252' : 'cat-123');

			const num = document.createElement('span');
			num.className = 'meme-like-count';
			num.textContent = String(row.likes || 0);   // likes 為 null／undefined 時顯示 0

			btn.appendChild(heart);
			btn.appendChild(num);
			btn.addEventListener('click', () => onLikeClick(btn, heart, num, id));
			card.appendChild(btn);
		}

		async function loadMemePage(page) {
			if (!sbClient) {
				grid.innerHTML = '<div class="meme-empty">Supabase uninitialized</div>';
				return;
			}

			grid.innerHTML = '<div class="meme-empty">' + t('memeLoading') + '</div>';
			pager.innerHTML = '';

			const from = page * PAGE_SIZE;
			const to = from + PAGE_SIZE - 1;

			let query = sbClient
				.from('apng_images')
				.select('id, filename, title, author, tags, likes, created_at', { count: 'exact' })
				.eq('approved', true);

			// 標籤過濾：非 0 時只顯示有該標籤的圖
			if (currentTag > 0) {
				query = query.contains('tags', [currentTag]);
			}

			const { data, error, count } = await query
				.order('created_at', { ascending: !sortDesc })
				.range(from, to);

			if (error) {
				grid.innerHTML = '<div class="meme-empty">' + t('memeLoadFail') + error.message + '</div>';
				return;
			}

			if (!data || data.length === 0) {
				grid.innerHTML = '<div class="meme-empty">' + t('memeEmpty') + '</div>';
				return;
			}

			grid.innerHTML = '';

			for (const row of data) {
				const card = document.createElement('div');
				card.className = 'meme-card';

				const img = document.createElement('img');
				img.src = publicUrl(row.filename);
				img.alt = row.title || 'APNG';
				img.loading = 'lazy';
				img.style.cursor = 'pointer';
				// 點一下重播：實作在 js/media-utils.js 的 replayImg()，
				// 以前是「src = '' 再設回」的老招，會閃一下且偶爾不重播，已統一改掉
				img.addEventListener('click', () => replayImg(img));

				const title = document.createElement('div');
				title.className = 'meme-title';
				title.textContent = row.title || t('memeUntitled');

				const author = document.createElement('div');
				author.className = 'meme-author';
				author.textContent = row.author ? ('by ' + row.author) : t('memeAnonymous');

				card.appendChild(img);
				card.appendChild(title);
				card.appendChild(author);
				renderLike(card, row);   // 小紅心＋次數
				grid.appendChild(card);
			}

			// 分頁：最多顯示 5 個頁碼，前後按鈕
			const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
			pager.innerHTML = '';

			if (totalPages <= 1) return;

			// 計算要顯示哪些頁碼（0-based）
			function visiblePages(cur, total) {
				if (total <= 5) return Array.from({ length: total }, (_, i) => i);
				if (cur <= 2) return [0, 1, 2, 3, total - 1];
				if (cur >= total - 3) return [0, total - 4, total - 3, total - 2, total - 1];
				return [0, cur - 1, cur, cur + 1, total - 1];
			}

			// 工具：加一個 icon 按鈕
			function addIconBtn(iconCls, targetPage, disabled) {
				const btn = document.createElement('button');
				btn.className = 'meme-page-btn meme-page-icon';
				if (disabled) btn.disabled = true;
				btn.innerHTML = `<small class="cat ${iconCls}"></small>`;
				btn.addEventListener('click', () => loadMemePage(targetPage));
				pager.appendChild(btn);
			}

			// 工具：加一個頁碼按鈕
			function addNumBtn(pageIdx) {
				const btn = document.createElement('button');
				btn.className = 'meme-page-btn' + (pageIdx === page ? ' active' : '');
				btn.textContent = (pageIdx + 1);
				btn.addEventListener('click', () => loadMemePage(pageIdx));
				pager.appendChild(btn);
			}

			// 第一頁 / 上一頁
			addIconBtn('cat-086', 0, page === 0);
			addIconBtn('cat-082', page - 1, page === 0);

			// 中間頁碼
			const pages = visiblePages(page, totalPages);
			let prev = -1;
			for (const p of pages) {
				if (prev !== -1 && p - prev > 1) {
					const dots = document.createElement('span');
					dots.className = 'meme-page-dots';
					dots.textContent = '…';
					pager.appendChild(dots);
				}
				addNumBtn(p);
				prev = p;
			}

			// 下一頁 / 最終頁
			addIconBtn('cat-083', page + 1, page === totalPages - 1);
			addIconBtn('cat-087', totalPages - 1, page === totalPages - 1);
		}

		// 暴露給其他地方呼叫
		window.loadMemePage = loadMemePage;
		window._memeLoaded = true;

		// 初始化時直接載入一次
		loadMemePage(0);
	}

	// 如果 DOM 已經 ready 就直接 init，否則等 DOMContentLoaded
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
