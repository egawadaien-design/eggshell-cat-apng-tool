/**
 * 蛋殼喵 APNG 工具 — 應用外殼
 * 頁籤切換 / Emoji 字牆 / README 載入 / 訪客追蹤 / Help 示意動畫重播
 * @author [DaiEn]
 * @Date: 2026-11-23
 * @Correction: 5
 *
 * 由原 apng.js 第 9~302 行原封不動切出，未改動任何邏輯
 * 2026-11-12 追加：Help 頁的示意動畫支援「點一下從第一格重新播放」
 * 2026-11-23 修正：移除舊版 sample/list.json 的 Meme 渲染（含 window.renderMemes 覆寫與
 *                  parseAnimationMeta / formatSize 兩支只服務它的函式）。
 *                  Meme 頁改由 js/meme.js（Supabase）獨占，修好「切換語言就把 Meme 牆清空」。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// ============================================================
// Supabase 訪客追蹤（背景記錄，不顯示在頁面上）
// ============================================================
(function initVisitorTracking() {
  const cfg = window.SUPABASE_CONFIG;
  if (!cfg) { console.warn('SUPABASE_CONFIG not loaded, skip visitor tracking'); return; }

  // 動態載入 Supabase JS
  const tag = document.createElement('script');
  tag.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  tag.onload = async () => {
    try {
      // 注意：區域變數名稱不能跟全域 supabase 撞名（TDZ 問題）
      const sb = window.supabase.createClient(cfg.url, cfg.anonKey);

      // 產生或取得匿名使用者 ID
      let userId = localStorage.getItem('visitor_id');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('visitor_id', userId);
      }

      // 用「本地日期」而非 UTC，避免晚上 8 點後日期算錯
      const d = new Date();
      const today = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

      const visitorData = {
        user_id: userId,
        visit_date: today,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        referrer: document.referrer
      };

      // 同一天同一使用者 upsert 一筆（背景靜默執行）
      await sb.from('visitors').upsert(visitorData, {
        onConflict: 'user_id,visit_date'
      });
    } catch (e) {
      // 靜默失敗，不影響網站功能，也不顯示給使用者
      console.debug('Visitor tracking skipped:', e.message);
    }
  };
  document.head.appendChild(tag);
})();

// ============================================================
// Tab 切換：分頁，按 data-tab 對應 panel id
// ============================================================
// 切換 tab 並記住目前頁面（重新整理後保留）
function switchTab(target) {
	document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
	document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
	document.querySelectorAll(`[data-tab="${target}"]`).forEach(b => b.classList.add('active'));
	document.getElementById(target).classList.add('active');
	localStorage.setItem('eggshellcat-tab', target);
}

// 所有帶 data-tab 的元素（上方 tab-btn + 底部 footer-github 等）
document.querySelectorAll('[data-tab]').forEach(btn => {
	btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// 頁面載入時恢復上次的 tab
(function restoreTab() {
	const saved = localStorage.getItem('eggshellcat-tab');
	if (saved && document.getElementById(saved)) {
		switchTab(saved);
	}
})();

// Emoji 字型展示：動態產生 258 個貓咪 emoji
const emojiGrid = document.getElementById('emojiGrid');
if (emojiGrid) {
	for (let i = 1; i <= 258; i++) {
		const num = String(i).padStart(3, '0');
		const item = document.createElement('div');
		item.className = 'emoji-item';
		item.innerHTML = `
			<span class="emoji-icon cat cat-${num}"></span>
			<span class="emoji-name">cat-${num}</span>
		`;
		item.title = `Copy cat-${num}`;
		item.addEventListener('click', () => {
			const text = `cat cat-${num}`;
			const showCopied = () => {
				item.style.background = '#d4708a';
				item.querySelector('.emoji-name').textContent = 'copied!';
				setTimeout(() => {
					item.style.background = '';
					item.querySelector('.emoji-name').textContent = `cat-${num}`;
				}, 800);
			};
			const showError = () => {
				item.style.background = '#c06078';
				item.querySelector('.emoji-name').textContent = 'copy failed!';
				setTimeout(() => {
					item.style.background = '';
					item.querySelector('.emoji-name').textContent = `cat-${num}`;
				}, 800);
			};
			// 優先用現代 Clipboard API
			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(text).then(showCopied).catch(showError);
			} else {
				// Fallback：舊式 execCommand
				const ta = document.createElement('textarea');
				ta.value = text;
				ta.style.position = 'fixed';
				ta.style.opacity = '0';
				document.body.appendChild(ta);
				ta.select();
				try {
					document.execCommand('copy');
					showCopied();
				} catch (e) {
					showError();
				}
				document.body.removeChild(ta);
			}
		});
		emojiGrid.appendChild(item);
	}
}

// ============================================================
// README tab：從 GitHub raw 抓 README.md，用 marked.js 渲染成 HTML
// Vercel 預設不 serve *.md，所以直接從 GitHub 抓
// ============================================================
fetch('https://raw.githubusercontent.com/egawadaien-design/eggshell-cat-apng-tool/main/README.md')
	.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
	.then(md => {
		document.getElementById('readmeContent').innerHTML = marked.parse(md);
	})
	.catch(err => {
		document.getElementById('readmeContent').innerHTML =
			'<p style="color:#c06078"><span class="cat cat-030"></span>&nbsp;Failed to load README: ' + err.message + '</p>';
	});

// ============================================================
// Help 頁示意圖：點一下從第一格重新播放
// ------------------------------------------------------------
// 重播的實作統一放在 js/media-utils.js 的 replayImg()（換帶時間戳的網址逼瀏覽器重新解碼），
// 這裡只負責「挑出該綁的圖」跟「加上可點的視覺提示」。
// 只綁 .gif / .png：靜態的 jpg 對照圖點了也沒有動畫可以播，不必給游標提示。
// ============================================================
(function initHelpReplay() {
	const helpPanel = document.getElementById('tab-help');
	if (!helpPanel) return;   // 沒有 Help 頁（例如被移掉）就直接跳過

	// 提示文字跟著語系走；i18n 尚未載入時退回中文，避免顯示 key 名稱
	const hint = (typeof t === 'function') ? t('helpReplayHint') : '點一下重新播放';

	helpPanel.querySelectorAll('img').forEach(function (image) {
		const originalSrc = image.getAttribute('src') || '';
		if (!/\.(gif|png)(\?|#|$)/i.test(originalSrc)) return;   // 只處理會動的檔

		image.classList.add('replayable');
		image.title = hint;
		image.setAttribute('role', 'button');       // 讓輔助工具知道它可以按
		image.tabIndex = 0;                          // 鍵盤也搆得到

		// 點一下、或鍵盤 Enter／空白鍵，都交給共用的 replayImg 重播
		image.addEventListener('click', function () {
			replayImg(image);
		});
		// Enter / 空白鍵跟滑鼠點擊行為一致（空白鍵要擋掉頁面捲動）
		image.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				replayImg(image);
			}
		});
	});
})();
