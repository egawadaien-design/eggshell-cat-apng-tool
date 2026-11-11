/**
 * 蛋殼喵 APNG 工具 — 應用外殼
 * 頁籤切換 / Emoji 字牆 / Meme 舊版解析 / README 載入 / 訪客追蹤
 * @author [DaiEn]
 * @Date: 2026-11-11
 * @Correction: 1
 *
 * 由原 apng.js 第 9~302 行原封不動切出，未改動任何邏輯
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

// ============================================================
// Meme 頁面：動態載入 sample/list.json，生成圖片卡片
// 點擊圖片重新播放一次 APNG 循環
// ============================================================
// 解析 APNG / GIF 的中繼資訊（尺寸、格數、循環時間、檔案大小）
async function parseAnimationMeta(url) {
	const resp = await fetch(url);
	const blob = await resp.blob();
	const buf = await blob.arrayBuffer();
	const dv = new DataView(buf);
	const bytes = new Uint8Array(buf);

	const meta = {
		width: 0, height: 0,
		frames: 0, durationMs: 0,
		size: blob.size
	};

	// 判斷格式：PNG signature 89 50 4E 47
	const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
	const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;

	if (isPNG) {
		// 從 offset 8 開始掃 chunks
		let off = 8;
		while (off < bytes.length - 8) {
			const len = dv.getUint32(off);
			const type = String.fromCharCode(bytes[off+4], bytes[off+5], bytes[off+6], bytes[off+7]);
			const dataOff = off + 8;
			if (type === 'IHDR') {
				meta.width = dv.getUint32(dataOff);
				meta.height = dv.getUint32(dataOff + 4);
			} else if (type === 'acTL') {
				meta.frames = dv.getUint32(dataOff);
			} else if (type === 'fcTL') {
				const num = dv.getUint16(dataOff + 20);
				const den = dv.getUint16(dataOff + 22);
				meta.durationMs += den === 0 ? num * 10 : (num / den) * 1000;
			}
			off += 12 + len; // len(4) + type(4) + data + crc(4)
		}
	} else if (isGIF) {
		// Logical Screen Descriptor: offset 6, width(2) + height(2)
		meta.width = dv.getUint16(6, true);
		meta.height = dv.getUint16(8, true);
		// 掃描 blocks，找 Graphic Control Extension (0x21 0xF9)
		let off = 13; // 跳過 LSD + global color table flag
		while (off < bytes.length) {
			if (bytes[off] === 0x21 && bytes[off+1] === 0xF9) {
				// GCE: 0x21 F9 size(1=4) ... delay(2)
				const delay = dv.getUint16(off + 4, true);
				meta.durationMs += delay * 10;
				meta.frames++;
			}
			// 簡單掃描：GIF block 結構較複雜，這裡粗略跳過
			if (bytes[off] === 0x3b) break; // trailer
			off++;
		}
	}
	return meta;
}

// 位元組轉可讀字串（B / KB / MB）
function formatSize(bytes) {
	if (bytes < 1024) return bytes + 'B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
	return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

(function initMeme() {
	const grid = document.getElementById('memeGrid');
	const sortBtn = document.getElementById('memeSortBtn');
	if (!grid) return;

	let memes = [];
	let asc = true; // 預設正序

	// 未來這裡會改成從 Supabase 讀取：
	// const { data } = await supabase.from('apng_images').select('*').order('created_at', { ascending: false });
	// memes = data || [];

	function renderMemes() {
		grid.innerHTML = '';
		const list = asc ? memes : [...memes].reverse();

		if (list.length === 0) {
			const empty = document.createElement('div');
			empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:60px 20px;color:#a08090;font-size:15px;';
			const emptyText = (typeof I18N !== 'undefined' && typeof currentLang !== 'undefined' && I18N[currentLang])
				? I18N[currentLang].memeEmpty || '' : 'No memes yet~';
			//empty.innerHTML = '<p style="font-size:40px;margin:0 0 12px;">🐾</p><p>' + emptyText + '</p>';
			empty.innerHTML = '<p>' + emptyText + '</p>';
			grid.appendChild(empty);
			return;
		}

		list.forEach(item => {
			const div = document.createElement('div');
			div.className = 'meme-item';
			const loadingText = (typeof I18N !== 'undefined' && typeof currentLang !== 'undefined' && I18N[currentLang])
				? I18N[currentLang].loading || 'Loading...' : 'Loading...';
			div.innerHTML = `
				<img src="sample/${item.file}" alt="${item.label}" loading="lazy">
				<p class="meme-caption">${item.label}</p>
				<p class="meme-meta">${loadingText}</p>
			`;
			// 點擊重新播放：重新設定 src 強制 APNG 從頭播放
			div.querySelector('img').addEventListener('click', function () {
				const src = this.src;
				this.src = '';
				this.src = src;
			});
			grid.appendChild(div);

			// 非同步載入中繼資訊
			parseAnimationMeta(`sample/${item.file}`)
				.then(meta => {
					const metaEl = div.querySelector('.meme-meta');
					if (metaEl) {
						const sec = (meta.durationMs / 1000).toFixed(1);
						metaEl.textContent = `[${meta.width}x${meta.height}px | ${meta.frames} | ${sec}s | ${formatSize(meta.size)}]`;
					}
				})
				.catch(() => {
					const metaEl = div.querySelector('.meme-meta');
					if (metaEl) metaEl.textContent = '';
				});
		});
	}
	// 排序樣品動畫圖片
	if (sortBtn) {
		function updateSortLabel() {
			const key = asc ? 'memeSortAsc' : 'memeSortDesc';
			const label = document.getElementById('memeSortLabel');
			if (typeof I18N !== 'undefined' && typeof currentLang !== 'undefined' && I18N[currentLang]) {
				if (label) label.textContent = I18N[currentLang][key] || key;
			}
		}
		sortBtn.addEventListener('click', () => {
			asc = !asc;
			renderMemes();
			updateSortLabel();
		});
		// 初始文字
		updateSortLabel();
	}

	// 初次渲染（目前 memes 是空陣列，會顯示空狀態提示）
	renderMemes();

	// 暴露給 applyLang 切換語言時呼叫
	window.renderMemes = renderMemes;
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
