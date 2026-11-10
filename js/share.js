/**
 * 蛋殼喵 APNG 工具 — 分享 Modal 邏輯
 * @author [DaiEn]
 * @Date: 2026-11-10
 * @Correction: 3
 *
 * 與 index.html 同頁，直接讀 window._currentApngBlob
 */
(function () {
	'use strict';

	const cfg = window.SUPABASE_CONFIG;
	const modal = document.getElementById('shareModal');
	const backdrop = document.getElementById('shareModalBackdrop');
	const closeBtn = document.getElementById('shareModalClose');
	const cancelBtn = document.getElementById('shareCancelBtn');
	const submitBtn = document.getElementById('shareSubmitBtn');
	const previewImg = document.getElementById('sharePreviewImg');
	const metaBox = document.getElementById('shareMeta');
	const statusBox = document.getElementById('shareStatus');
	const titleInput = document.getElementById('shareTitle');
	const authorInput = document.getElementById('shareAuthor');
	const shareBtn = document.getElementById('shareLink');
	const shareTagBar = document.getElementById('shareTagBar');

	if (!modal || !shareBtn) return;

	// 若 Supabase 未啟用：隱藏分享按鈕，整個功能不運作
	if (!cfg || !cfg.enabled) {
		shareBtn.style.display = 'none';
		return;
	}

	// 初始化 Supabase client
	let sbClient = null;
	try {
		if (window.supabase && cfg) {
			sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
		}
	} catch (e) { console.warn('supabase init fail', e); }

	// 標籤按鈕：點擊切換選取
	function setupTagBar(bar) {
		if (!bar) return;
		bar.querySelectorAll('.meme-tag-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				btn.classList.toggle('active');
			});
		});
	}
	setupTagBar(shareTagBar);

	function resetTagBar(bar) {
		if (!bar) return;
		bar.querySelectorAll('.meme-tag-btn').forEach(btn => btn.classList.remove('active'));
	}

	function getSelectedTags(bar) {
		if (!bar) return [];
		const tags = [];
		bar.querySelectorAll('.meme-tag-btn.active').forEach(btn => {
			tags.push(parseInt(btn.dataset.tag, 10));
		});
		return tags;
	}

	function openModal() {
		const blob = window._currentApngBlob;
		const url = window._currentApngUrl;
		if (!blob || !url) {
			alert(t('shareNeedGenerate'));
			return;
		}
		previewImg.src = url;
		previewImg.style.cursor = 'pointer';
		// 點擊預覽圖：清空 src 再設回，強制重新播放 APNG
		previewImg.onclick = () => {
			const src = previewImg.src;
			previewImg.src = '';
			previewImg.src = src;
		};
		metaBox.textContent = t('shareSize', { size: (blob.size / 1024).toFixed(1) });
		statusBox.innerHTML = '';
		titleInput.value = '';
		authorInput.value = '';
		resetTagBar(shareTagBar);
		submitBtn.disabled = false;
		modal.style.display = 'block';
	}

	function closeModal() {
		modal.style.display = 'none';
	}

	shareBtn.addEventListener('click', openModal);
	backdrop.addEventListener('click', closeModal);
	closeBtn.addEventListener('click', closeModal);
	cancelBtn.addEventListener('click', closeModal);

	submitBtn.addEventListener('click', async () => {
		const blob = window._currentApngBlob;
		if (!blob) { alert(t('shareNoData')); return; }

		submitBtn.disabled = true;
		statusBox.innerHTML = t('shareUploading');

		try {
			// 1. 把 blob 轉成 base64
			const reader = new FileReader();
			const base64 = await new Promise((resolve, reject) => {
				reader.onload = () => resolve(reader.result);
				reader.onerror = reject;
				reader.readAsDataURL(blob);
			});

			// 2. 呼叫 Vercel Function 上傳
			const selectedTags = getSelectedTags(shareTagBar);
			const response = await fetch('/api/upload', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					blobBase64: base64,
					title: titleInput.value.trim() || null,
					author: authorInput.value.trim() || null,
					tags: selectedTags,
				}),
			});

			const result = await response.json();
			if (!response.ok) throw new Error(result.error || 'Upload failed');

			statusBox.innerHTML = t('shareSuccess');
			setTimeout(() => {
				closeModal();
				// 切到 Meme tab 並刷新
				document.querySelector('[data-tab="tab-meme"]').click();
				if (typeof window.loadMemePage === 'function') window.loadMemePage(0);
			}, 1000);
		} catch (e) {
			statusBox.innerHTML = t('shareFail') + (e.message || e);
			submitBtn.disabled = false;
		}
	});
})();
