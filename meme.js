/**
 * 蛋殼喵 APNG 工具 — Meme 展示邏輯（嵌在 index.html tab-meme）
 * @author [DaiEn]
 * @Date: 2026-11-10
 * @Correction: 4
 *
 * 提供 window.loadMemePage(page) 給 share.js 呼叫
 * 每次顯示最新 20 筆，底部分頁
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

		// 先定義一個空的 loadMemePage，避免 renderMemes 呼叫到 undefined
		window.loadMemePage = function () {};

		const cfg = window.SUPABASE_CONFIG;

		// 若 Supabase 未啟用：顯示提示
		if (!cfg || !cfg.enabled) {
			grid.innerHTML = '<div class="meme-empty">' + t('shareDisabled') + '</div>';
			return;
		}

		const pager = document.createElement('div');
		pager.className = 'meme-pager';
		grid.parentElement.appendChild(pager);

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
				img.addEventListener('click', () => {
					const src = img.src;
					img.src = '';
					img.src = src;
				});

				const title = document.createElement('div');
				title.className = 'meme-title';
				title.textContent = row.title || t('memeUntitled');

				const author = document.createElement('div');
				author.className = 'meme-author';
				author.textContent = row.author ? ('by ' + row.author) : t('memeAnonymous');

				card.appendChild(img);
				card.appendChild(title);
				card.appendChild(author);
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
