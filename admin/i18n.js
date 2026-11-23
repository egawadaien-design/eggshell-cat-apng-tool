/**
 * 蛋殼喵 APNG 工具 — 管理後台專用 i18n（五語系）
 * @author [DaiEn]
 * @Date: 2026-11-24
 * @Correction: 2
 * 本次修正：新增刪除相關四條 key（btnDelete／confirmDelete／btnDeleting／doneDelete）× 五語系
 *           ——confirmDelete 帶 {title}，用「」包住使用者填的標題，並明講「圖檔與資料列都會刪、不可復原」
 *
 * 【為什麼不共用主站的 js/i18n.js】
 * 主站那份是「整個前台的翻譯字典」，400 多條 key，還綁著 Meme 牆、API 清單等前台邏輯；
 * 後台只需要二十幾條字，硬接過來會讓兩邊改字時互相牽動。
 * 所以這裡獨立一份，`/admin/` 底下自成一套，和主站唯一的共享只有 Emoji 字型。
 *
 * 【對外介面】window.AdminI18N
 *   t(key, vars)          取字並代入 {變數}
 *   applyLang(code)       套用語言（同時處理 data-i18n / data-i18n-ph / 按鈕 active 狀態）
 *   detectLang()          偵測語言：localStorage → 瀏覽器語言 → 退回 zh-TW
 *   getLang()             目前語言
 *   LANGS                 五個語言的中繼資料（含圖示 class、選單顯示名稱）
 *   onChange              （可選）切成函式，切語言後會呼叫，讓頁面重畫動態內容
 *
 * 儲存用的 key 跟主站分開（主站是 apng-lang），互不干擾。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
(function () {
	'use strict';

	// 五個語言：code / 圖示（沿用主站的 Emoji 字型 class）/ 顯示名稱 / html lang
	const LANGS = [
		{ code: 'zh-TW', icon: 'cat-214', label: '繁體中文', htmlLang: 'zh-Hant' },
		{ code: 'zh-CN', icon: 'cat-213', label: '简体中文', htmlLang: 'zh-Hans' },
		{ code: 'en', icon: 'cat-215', label: 'English', htmlLang: 'en' },
		{ code: 'ja', icon: 'cat-216', label: '日本語', htmlLang: 'ja' },
		{ code: 'th', icon: 'cat-239', label: 'ไทย', htmlLang: 'th' }
	];

	const I18N = {};

	I18N['zh-TW'] = {
		pageTitle: '蛋殼喵 APNG 工具 — 管理後台',
		heading: '蛋殼喵 · 管理後台',
		subtitle: '管理分享圖片要不要在前台的 Meme 牆展示',
		loginLabel: '管理密碼',
		loginPh: '請輸入管理密碼',
		loginBtn: '登入',
		loginNote: '密碼由伺服器端的環境變數（ADMIN_PASSWORD）保管，不會出現在前端，也不會寫在網址上。',
		msgNeedPwd: '請先輸入管理密碼',
		msgChecking: '驗證中…',
		msgLoggedOut: '已登出',
		tabAll: '全部',
		tabHidden: '未展示',
		tabVisible: '已展示',
		countText: '共 {n} 筆',
		reload: '重新整理',
		logout: '登出',
		pageInfo: '第 {p} / {t} 頁',
		prev: '上一頁',
		next: '下一頁',
		note: '「已展示」＝ 前台 Meme 牆看得到；新上傳的圖片預設是未展示，要在這裡打開才會出現。',
		loading: '載入中…',
		loadFail: '載入失敗：{msg}',
		opFail: '操作失敗：{msg}',
		emptyAll: '目前沒有任何分享圖片',
		emptyHidden: '沒有「未展示」的圖片',
		emptyVisible: '沒有「已展示」的圖片',
		badgeOn: '已展示',
		badgeOff: '未展示',
		btnShow: '放到前台展示',
		btnHide: '從前台隱藏',
		btnWorking: '處理中…',
		doneShow: '已放到前台展示',
		doneHide: '已從前台隱藏',
		btnDelete: '刪除這張',
		confirmDelete: '確定要刪除「{title}」嗎？\n資料列與 Storage 裡的圖檔會一起刪掉，無法復原。',
		btnDeleting: '刪除中…',
		doneDelete: '已刪除「{title}」',
		untitled: '（無標題）',
		anonymous: '匿名',
		tagsNone: '無標籤',
		likes: '讚 {n} · id {id}',
		by: 'by',
		errSession: '登入已失效，請重新登入',
		errServer: '伺服器回應異常（{status}）'
	};

	I18N['zh-CN'] = {
		pageTitle: '蛋壳喵 APNG 工具 — 管理后台',
		heading: '蛋壳喵 · 管理后台',
		subtitle: '管理分享图片要不要在前台的 Meme 墙展示',
		loginLabel: '管理密码',
		loginPh: '请输入管理密码',
		loginBtn: '登录',
		loginNote: '密码由服务器端的环境变量（ADMIN_PASSWORD）保管，不会出现在前端，也不会写在网址上。',
		msgNeedPwd: '请先输入管理密码',
		msgChecking: '验证中…',
		msgLoggedOut: '已登出',
		tabAll: '全部',
		tabHidden: '未展示',
		tabVisible: '已展示',
		countText: '共 {n} 条',
		reload: '重新整理',
		logout: '登出',
		pageInfo: '第 {p} / {t} 页',
		prev: '上一页',
		next: '下一页',
		note: '「已展示」＝ 前台 Meme 墙看得到；新上传的图片默认是未展示，要在这里打开才会出现。',
		loading: '加载中…',
		loadFail: '加载失败：{msg}',
		opFail: '操作失败：{msg}',
		emptyAll: '目前没有任何分享图片',
		emptyHidden: '没有「未展示」的图片',
		emptyVisible: '没有「已展示」的图片',
		badgeOn: '已展示',
		badgeOff: '未展示',
		btnShow: '放到前台展示',
		btnHide: '从前台隐藏',
		btnWorking: '处理中…',
		doneShow: '已放到前台展示',
		doneHide: '已从前台隐藏',
		btnDelete: '删除这张',
		confirmDelete: '确定要删除「{title}」吗？\n数据行与 Storage 里的图档会一起删掉，无法复原。',
		btnDeleting: '删除中…',
		doneDelete: '已删除「{title}」',
		untitled: '（无标题）',
		anonymous: '匿名',
		tagsNone: '无标签',
		likes: '赞 {n} · id {id}',
		by: 'by',
		errSession: '登录已失效，请重新登录',
		errServer: '服务器回应异常（{status}）'
	};

	I18N['en'] = {
		pageTitle: 'EggshellCat APNG Tool — Admin',
		heading: 'EggshellCat · Admin',
		subtitle: 'Choose which shared images appear on the public Meme wall',
		loginLabel: 'Admin password',
		loginPh: 'Enter the admin password',
		loginBtn: 'Sign in',
		loginNote: 'The password lives in a server-side environment variable (ADMIN_PASSWORD); it never reaches the browser or the URL.',
		msgNeedPwd: 'Please enter the admin password',
		msgChecking: 'Checking…',
		msgLoggedOut: 'Signed out',
		tabAll: 'All',
		tabHidden: 'Hidden',
		tabVisible: 'Visible',
		countText: '{n} items',
		reload: 'Refresh',
		logout: 'Sign out',
		pageInfo: 'Page {p} of {t}',
		prev: 'Prev',
		next: 'Next',
		note: '“Visible” means it appears on the public Meme wall. New uploads start hidden, so turn them on here.',
		loading: 'Loading…',
		loadFail: 'Load failed: {msg}',
		opFail: 'Action failed: {msg}',
		emptyAll: 'No shared images yet',
		emptyHidden: 'No hidden images',
		emptyVisible: 'No visible images',
		badgeOn: 'Visible',
		badgeOff: 'Hidden',
		btnShow: 'Show on site',
		btnHide: 'Hide from site',
		btnWorking: 'Working…',
		doneShow: 'Now visible on the site',
		doneHide: 'Hidden from the site',
		btnDelete: 'Delete',
		confirmDelete: 'Delete "{title}"?\nThe database row and the file in Storage will both be removed. This cannot be undone.',
		btnDeleting: 'Deleting…',
		doneDelete: 'Deleted "{title}"',
		untitled: '(untitled)',
		anonymous: 'Anonymous',
		tagsNone: 'No tags',
		likes: '{n} likes · id {id}',
		by: 'by',
		errSession: 'Session expired, please sign in again',
		errServer: 'Bad server response ({status})'
	};

	I18N['ja'] = {
		pageTitle: 'たまご殻ネコ APNG ツール — 管理画面',
		heading: 'たまご殻ネコ · 管理画面',
		subtitle: '共有画像をフロントの Meme ウォールに表示するかどうかを管理します',
		loginLabel: '管理パスワード',
		loginPh: '管理パスワードを入力',
		loginBtn: 'ログイン',
		loginNote: 'パスワードはサーバー側の環境変数（ADMIN_PASSWORD）に保管され、フロントにも URL にも出ません。',
		msgNeedPwd: '管理パスワードを入力してください',
		msgChecking: '確認中…',
		msgLoggedOut: 'ログアウトしました',
		tabAll: 'すべて',
		tabHidden: '非表示',
		tabVisible: '表示中',
		countText: '全 {n} 件',
		reload: '再読み込み',
		logout: 'ログアウト',
		pageInfo: '{p} / {t} ページ',
		prev: '前へ',
		next: '次へ',
		note: '「表示中」はフロントの Meme ウォールに表示される状態です。新しくアップロードされた画像は最初は非表示なので、ここでオンにしてください。',
		loading: '読み込み中…',
		loadFail: '読み込みに失敗：{msg}',
		opFail: '操作に失敗：{msg}',
		emptyAll: '共有画像はまだありません',
		emptyHidden: '「非表示」の画像はありません',
		emptyVisible: '「表示中」の画像はありません',
		badgeOn: '表示中',
		badgeOff: '非表示',
		btnShow: 'フロントに表示',
		btnHide: 'フロントから隠す',
		btnWorking: '処理中…',
		doneShow: 'フロントに表示しました',
		doneHide: 'フロントから隠しました',
		btnDelete: 'この画像を削除',
		confirmDelete: '「{title}」を削除しますか？\nデータ行と Storage の画像ファイルがまとめて消えます。元に戻せません。',
		btnDeleting: '削除中…',
		doneDelete: '「{title}」を削除しました',
		untitled: '（タイトルなし）',
		anonymous: '匿名',
		tagsNone: 'タグなし',
		likes: 'いいね {n} · id {id}',
		by: 'by',
		errSession: 'ログインが切れました。もう一度ログインしてください',
		errServer: 'サーバー応答が不正（{status}）'
	};

	I18N['th'] = {
		pageTitle: 'EggshellCat APNG Tool — ผู้ดูแลระบบ',
		heading: 'EggshellCat · ผู้ดูแลระบบ',
		subtitle: 'เลือกว่าภาพที่แชร์จะแสดงบน Meme wall หน้าร้านหรือไม่',
		loginLabel: 'รหัสผ่านผู้ดูแล',
		loginPh: 'ใส่รหัสผ่านผู้ดูแล',
		loginBtn: 'เข้าสู่ระบบ',
		loginNote: 'รหัสผ่านถูกเก็บใน environment variable ฝั่งเซิร์ฟเวอร์ (ADMIN_PASSWORD) ไม่ปรากฏบนหน้าเว็บหรือใน URL',
		msgNeedPwd: 'กรุณาใส่รหัสผ่าน',
		msgChecking: 'กำลังตรวจสอบ…',
		msgLoggedOut: 'ออกจากระบบแล้ว',
		tabAll: 'ทั้งหมด',
		tabHidden: 'ที่ซ่อนอยู่',
		tabVisible: 'ที่แสดงอยู่',
		countText: 'ทั้งหมด {n} รายการ',
		reload: 'รีเฟรช',
		logout: 'ออกจากระบบ',
		pageInfo: 'หน้า {p} / {t}',
		prev: 'ก่อนหน้า',
		next: 'ถัดไป',
		note: '“แสดงอยู่” คือภาพจะปรากฏบน Meme wall หน้าร้าน ภาพที่อัปโหลดใหม่จะถูกซ่อนไว้ก่อน ต้องเปิดที่นี่',
		loading: 'กำลังโหลด…',
		loadFail: 'โหลดไม่สำเร็จ: {msg}',
		opFail: 'ดำเนินการไม่สำเร็จ: {msg}',
		emptyAll: 'ยังไม่มีภาพที่แชร์',
		emptyHidden: 'ไม่มีภาพที่ซ่อนอยู่',
		emptyVisible: 'ไม่มีภาพที่แสดงอยู่',
		badgeOn: 'แสดงอยู่',
		badgeOff: 'ซ่อนอยู่',
		btnShow: 'แสดงบนหน้าร้าน',
		btnHide: 'ซ่อนจากหน้าร้าน',
		btnWorking: 'กำลังดำเนินการ…',
		doneShow: 'แสดงบนหน้าร้านแล้ว',
		doneHide: 'ซ่อนจากหน้าร้านแล้ว',
		btnDelete: 'ลบภาพนี้',
		confirmDelete: 'ต้องการลบ “{title}” ใช่ไหม?\nทั้งแถวข้อมูลและไฟล์ใน Storage จะถูกลบไปด้วย และกู้คืนไม่ได้',
		btnDeleting: 'กำลังลบ…',
		doneDelete: 'ลบ “{title}” แล้ว',
		untitled: '(ไม่มีชื่อ)',
		anonymous: 'ไม่ระบุชื่อ',
		tagsNone: 'ไม่มีแท็ก',
		likes: 'ไลก์ {n} · id {id}',
		by: 'by',
		errSession: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
		errServer: 'การตอบกลับจากเซิร์ฟเวอร์ผิดปกติ ({status})'
	};

	const STORE_KEY = 'eggshell-admin-lang';
	let currentLang = 'zh-TW';

	// 取字：目前語言 → zh-TW 備援 → 直接回 key（缺字時看得到 key，方便發現漏翻）
	function t(key, vars) {
		const lang = I18N[currentLang] ? currentLang : 'zh-TW';
		let s = (I18N[lang] && I18N[lang][key]) || (I18N['zh-TW'] && I18N['zh-TW'][key]) || key;
		if (vars) {
			Object.keys(vars).forEach(function (k) {
				s = s.split('{' + k + '}').join(String(vars[k]));
			});
		}
		return s;
	}

	// 偵測：先看上次選過的（後台自己的 key），再看瀏覽器語言
	function detectLang() {
		let saved = null;
		try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* 私密模式可能被擋 */ }
		if (saved && I18N[saved]) return saved;

		const nav = (navigator.language || '').toLowerCase();
		if (nav.indexOf('zh') === 0) {
			// zh-CN / zh-SG / zh-Hans 視為簡中，其餘 zh 視為繁中
			if (nav.indexOf('cn') > -1 || nav.indexOf('sg') > -1 || nav.indexOf('hans') > -1) return 'zh-CN';
			return 'zh-TW';
		}
		if (nav.indexOf('ja') === 0) return 'ja';
		if (nav.indexOf('th') === 0) return 'th';
		if (nav.indexOf('en') === 0) return 'en';
		return 'zh-TW';
	}

	// 套用語言：靜態標籤走 data-i18n / data-i18n-ph；語言鈕標記 active
	function applyLang(code) {
		if (!I18N[code]) code = 'zh-TW';
		currentLang = code;
		try { localStorage.setItem(STORE_KEY, code); } catch (e) { /* 忽略 */ }

		const meta = LANGS.filter(function (l) { return l.code === code; })[0];
		if (meta) document.documentElement.lang = meta.htmlLang;
		document.title = t('pageTitle');

		// 文字
		Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
			el.textContent = t(el.dataset.i18n);
		});
		// placeholder（輸入框提示不是 textContent，要另外處理）
		Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-ph]'), function (el) {
			el.placeholder = t(el.dataset.i18nPh);
		});

		// 語言按鈕 active
		Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (btn) {
			btn.classList.toggle('active', btn.dataset.lang === code);
		});

		// 動態內容（卡片、統計文字）由頁面自己重畫
		if (typeof window.AdminI18N.onChange === 'function') {
			window.AdminI18N.onChange(code);
		}
	}

	window.AdminI18N = {
		LANGS: LANGS,
		I18N: I18N,
		t: t,
		detectLang: detectLang,
		applyLang: applyLang,
		getLang: function () { return currentLang; },
		onChange: null
	};
})();
