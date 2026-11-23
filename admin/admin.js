/**
 * 蛋殼喵 APNG 工具 — 管理後台（/admin/）
 * @author [DaiEn]
 * @Date: 2026-11-24
 * @Correction: 3
 * 本次修正：新增「刪除」——每張卡片多一顆 .ad-btn-del（白底紅字外框），
 *          按下先 window.confirm 二次確認，再送 {action:'delete', id}；
 *          後端在同一個請求裡把「資料列 + Storage 圖檔」一起刪掉（前端不碰 service_role）；
 *          刪完若這一頁空了會自動退回上一頁，避免停在空白頁
 * 上次修正：全面改走 admin/i18n.js 的 t()（五語系）；語言鈕切換後重畫列表（卡片文字是動態產生的，
 *           applyLang 掃 data-i18n 掃不到），並把語言選擇記在 localStorage（key 與主站分開）
 *
 * 這頁只做四件事：
 *   1. 用管理密碼換一張通行證（token 存 sessionStorage，關掉分頁就消失）
 *   2. 列出「全部」分享圖片（含未通過的），這是跟前台 Meme 牆最大的差別
 *   3. 切換某張圖的 approved：true = 前台看得到，false = 收起來
 *   4. 刪掉某張圖：資料列與 Storage 圖檔一起消失（不可復原）
 *
 * 後端契約（本機 AdminController.java／Vercel api/admin.js 完全相同）：
 *   POST /api/admin  body {action:'login'|'list'|'setVisible'|'delete', ...}
 *   登入後帶 header X-Admin-Token
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
(function () {
	'use strict';

	const API = '/api/admin';
	const PAGE_SIZE = 12;
	const TOKEN_KEY = 'eggshell-admin-token';
	const EXPIRE_KEY = 'eggshell-admin-expire';

	// 翻譯：全部字串都走 admin/i18n.js，這裡只留一個短別名
	const i18n = window.AdminI18N;
	const t = i18n.t;

	const loginBox = document.getElementById('adLogin');
	const panel = document.getElementById('adPanel');
	const pwdInput = document.getElementById('adPassword');
	const loginBtn = document.getElementById('adLoginBtn');
	const loginMsg = document.getElementById('adLoginMsg');
	const grid = document.getElementById('adGrid');
	const statusMsg = document.getElementById('adStatus');
	const countEl = document.getElementById('adCount');
	const pageInfo = document.getElementById('adPageInfo');
	const prevBtn = document.getElementById('adPrev');
	const nextBtn = document.getElementById('adNext');
	const reloadBtn = document.getElementById('adReload');
	const logoutBtn = document.getElementById('adLogout');
	const tabs = Array.prototype.slice.call(document.querySelectorAll('.ad-tab'));
	const langBtns = Array.prototype.slice.call(document.querySelectorAll('[data-lang]'));

	// 目前檢視狀態：全部 / 未展示 / 已展示
	const state = { page: 0, status: 'all', total: 0, busy: false };

	// ============================================================
	// 呼叫後端
	// ============================================================
	function token() {
		return sessionStorage.getItem(TOKEN_KEY) || '';
	}

	function setMsg(el, text, kind) {
		el.textContent = text || '';
		el.className = 'ad-msg' + (kind ? ' ad-msg-' + kind : '');
	}

	async function api(payload) {
		const res = await fetch(API, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Admin-Token': token(),
			},
			body: JSON.stringify(payload),
		});

		let data = null;
		try {
			data = await res.json();
		} catch (e) {
			// 後端回非 JSON（例如 Vercel 的 404 頁）時，也要有可讀的錯誤
			throw new Error(t('errServer', { status: res.status }));
		}

		if (res.status === 401 && payload.action !== 'login') {
			// 通行證過期或被改密碼作廢：直接退回登入畫面
			sessionStorage.removeItem(TOKEN_KEY);
			sessionStorage.removeItem(EXPIRE_KEY);
			showLogin(t('errSession'));
			throw new Error('session-expired');     // 內部旗標，不拿去顯示
		}
		if (!res.ok || !data || data.ok === false) {
			throw new Error((data && data.error) || ('HTTP ' + res.status));
		}
		return data;
	}

	/** 內部旗標：上面的 api() 已經處理完 UI，呼叫端不要再把訊息印一次 */
	function isSessionError(e) {
		return e && e.message === 'session-expired';
	}

	// ============================================================
	// 登入 / 登出
	// ============================================================
	function showLogin(message) {
		loginBox.hidden = false;
		panel.hidden = true;
		pwdInput.value = '';
		setMsg(loginMsg, message || '', message ? 'err' : '');
		pwdInput.focus();
	}

	function showPanel() {
		loginBox.hidden = true;
		panel.hidden = false;
	}

	async function doLogin() {
		const password = pwdInput.value;
		if (!password) {
			setMsg(loginMsg, t('msgNeedPwd'), 'err');
			return;
		}
		loginBtn.disabled = true;
		setMsg(loginMsg, t('msgChecking'), '');
		try {
			const data = await api({ action: 'login', password: password });
			sessionStorage.setItem(TOKEN_KEY, data.token);
			sessionStorage.setItem(EXPIRE_KEY, String(data.expiresAt || 0));
			showPanel();
			load(0);
		} catch (e) {
			// 密碼錯誤的訊息來自後端（中文），照原樣顯示
			setMsg(loginMsg, e.message, 'err');
		} finally {
			loginBtn.disabled = false;
		}
	}

	function doLogout() {
		sessionStorage.removeItem(TOKEN_KEY);
		sessionStorage.removeItem(EXPIRE_KEY);
		showLogin(t('msgLoggedOut'));
	}

	loginBtn.addEventListener('click', doLogin);
	pwdInput.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') doLogin();
	});
	logoutBtn.addEventListener('click', doLogout);
	reloadBtn.addEventListener('click', function () { load(state.page); });

	tabs.forEach(function (btn) {
		btn.addEventListener('click', function () {
			tabs.forEach(function (b) { b.classList.remove('active'); });
			btn.classList.add('active');
			state.status = btn.dataset.status;
			load(0);
		});
	});

	prevBtn.addEventListener('click', function () {
		if (state.page > 0) load(state.page - 1);
	});
	nextBtn.addEventListener('click', function () {
		if ((state.page + 1) * PAGE_SIZE < state.total) load(state.page + 1);
	});

	// ============================================================
	// 語言切換：按鈕 → applyLang → onChange 重畫（卡片是動態生成，data-i18n 掃不到）
	// ============================================================
	i18n.onChange = function () {
		if (!panel.hidden) load(state.page);
	};

	langBtns.forEach(function (btn) {
		btn.addEventListener('click', function () {
			i18n.applyLang(btn.dataset.lang);
		});
	});

	// ============================================================
	// 讀取列表
	// ============================================================
	async function load(page) {
		if (state.busy) return;
		state.busy = true;
		setMsg(statusMsg, t('loading'), '');

		try {
			const data = await api({
				action: 'list',
				page: page,
				size: PAGE_SIZE,
				status: state.status,
			});
			state.page = data.page || 0;
			state.total = data.total || 0;
			render(data.rows || []);
		} catch (e) {
			if (!isSessionError(e)) setMsg(statusMsg, t('loadFail', { msg: e.message }), 'err');
		} finally {
			state.busy = false;
		}
	}

	// ============================================================
	// 渲染
	// ============================================================
	function fmtDate(iso) {
		if (!iso) return '—';
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		const pad = function (n) { return String(n).padStart(2, '0'); };
		return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
			' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
	}

	function makeEl(tag, cls, text) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (text !== undefined && text !== null) el.textContent = text;
		return el;
	}

	function render(rows) {
		grid.textContent = '';

		const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
		countEl.textContent = t('countText', { n: state.total });
		pageInfo.textContent = t('pageInfo', { p: state.page + 1, t: totalPages });
		prevBtn.disabled = state.page <= 0;
		nextBtn.disabled = (state.page + 1) >= totalPages;

		if (!rows.length) {
			const emptyKey = state.status === 'hidden' ? 'emptyHidden'
				: (state.status === 'visible' ? 'emptyVisible' : 'emptyAll');
			setMsg(statusMsg, t(emptyKey), '');
			return;
		}
		setMsg(statusMsg, '', '');

		rows.forEach(function (row) {
			const approved = row.approved === true;

			const card = makeEl('div', 'ad-card ad-item' + (approved ? ' ad-on' : ' ad-off'));

			// 縮圖：APNG 直接用 <img> 就會動（瀏覽器原生支援）
			const thumbWrap = makeEl('a', 'ad-thumb');
			thumbWrap.href = row.publicUrl || '#';
			thumbWrap.target = '_blank';
			thumbWrap.rel = 'noopener';
			const img = makeEl('img');
			img.src = row.publicUrl || '';
			img.alt = row.title || t('badgeOn');
			img.loading = 'lazy';
			thumbWrap.appendChild(img);
			thumbWrap.appendChild(makeEl('span', 'ad-badge', approved ? t('badgeOn') : t('badgeOff')));
			card.appendChild(thumbWrap);

			// 文字資訊：全部用 textContent，避免使用者填的標題／暱稱帶 HTML
			const info = makeEl('div', 'ad-info');
			info.appendChild(makeEl('div', 'ad-title', row.title || t('untitled')));
			info.appendChild(makeEl('div', 'ad-line',
				t('by') + ' ' + (row.author || t('anonymous')) + ' · ' + fmtDate(row.created_at)));

			const tags = Array.isArray(row.tags) ? row.tags : [];
			info.appendChild(makeEl('div', 'ad-line ad-tags',
				tags.length ? tags.map(function (x) { return '#' + x; }).join(' ') : t('tagsNone')));

			info.appendChild(makeEl('div', 'ad-line ad-id',
				t('likes', { n: row.likes || 0, id: row.id })));

			// 兩顆動作鈕排成一列：展示開關＋刪除
			// （用 .ad-actions 包起來，CSS 才好讓它們各佔一半寬；單顆時就是整條寬）
			const actions = makeEl('div', 'ad-actions');

			// 開關按鈕
			const btn = makeEl('button', approved ? 'ad-btn-hide' : 'ad-btn-show',
				approved ? t('btnHide') : t('btnShow'));
			btn.type = 'button';
			btn.addEventListener('click', function () {
				toggle(row, approved, btn);
			});
			actions.appendChild(btn);

			// 刪除鈕：後端會把資料列與 Storage 圖檔一起刪掉，所以一定要先二次確認
			const delBtn = makeEl('button', 'ad-btn-del', t('btnDelete'));
			delBtn.type = 'button';
			delBtn.addEventListener('click', function () {
				removeRow(row, delBtn);
			});
			actions.appendChild(delBtn);

			info.appendChild(actions);

			card.appendChild(info);
			grid.appendChild(card);
		});
	}

	// ============================================================
	// 切換展示狀態
	// ============================================================
	async function toggle(row, approved, btn) {
		const target = !approved;               // 目前是「已展示」就改成隱藏，反之打開
		btn.disabled = true;
		const oldText = btn.textContent;
		btn.textContent = t('btnWorking');

		try {
			await api({ action: 'setVisible', id: row.id, approved: target });
			// 重新抓一次：這樣「共 N 筆」與篩選結果才會跟資料庫一致
			await load(state.page);
			setMsg(statusMsg, target ? t('doneShow') : t('doneHide'), 'ok');
		} catch (e) {
			if (!isSessionError(e)) {
				setMsg(statusMsg, t('opFail', { msg: e.message }), 'err');
				btn.disabled = false;
				btn.textContent = oldText;
			}
		}
	}

	// ============================================================
	// 刪除：資料列 + Storage 圖檔（後端同一個請求處理）
	// 前端只送 id，檔名與 service_role 都在後端，避免前端能亂指定要刪哪個物件
	// ============================================================
	async function removeRow(row, btn) {
		// 標題可能被使用者填空白，用「（無標題）」當確認框的稱呼
		const name = row.title || t('untitled');

		// 不可復原 → 先問一次；按取消就完全不打後端
		if (!window.confirm(t('confirmDelete', { title: name }))) return;

		btn.disabled = true;
		const oldText = btn.textContent;
		btn.textContent = t('btnDeleting');

		try {
			await api({ action: 'delete', id: row.id });

			// 這一頁原本只有這張圖時，刪完會變空頁 → 自動退回上一頁
			const remain = grid.querySelectorAll('.ad-card').length - 1;
			const nextPage = (remain <= 0 && state.page > 0) ? state.page - 1 : state.page;

			// 重新抓一次列表，「共 N 筆」與篩選結果才會跟資料庫一致
			await load(nextPage);
			setMsg(statusMsg, t('doneDelete', { title: name }), 'ok');
		} catch (e) {
			// 刪除失敗（例如 Storage 刪不掉）：按鈕復原，訊息留在狀態列
			if (!isSessionError(e)) {
				setMsg(statusMsg, t('opFail', { msg: e.message }), 'err');
				btn.disabled = false;
				btn.textContent = oldText;
			}
		}
	}

	// ============================================================
	// 進頁面時：先套語言，再看有沒有通行證
	// 順序很重要：applyLang 會觸發 onChange，此時 panel 還是隱藏的，所以不會多打一次 list
	// ============================================================
	(function init() {
		i18n.applyLang(i18n.detectLang());

		const tk = token();
		const expire = Number(sessionStorage.getItem(EXPIRE_KEY) || 0);
		if (tk && (!expire || expire > Date.now())) {
			showPanel();
			load(0);
		} else {
			showLogin('');
		}
	})();
})();
