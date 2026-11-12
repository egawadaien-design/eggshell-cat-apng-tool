/**
 * 蛋殼喵 APNG 工具 — 共用小工具：動畫重播
 * @author [DaiEn]
 * @Date: 2026-11-12
 * @Correction: 3
 *
 * 【為什麼需要這支檔案】
 * 專案裡有四個地方都要「點一下，讓動畫從第一格重新播放」：
 *   1. js/meme.js      —— Meme 展示牆的卡片
 *   2. js/app-shell.js —— Meme 舊版 sample/ 清單
 *   3. js/share.js     —— 分享彈窗裡的預覽圖
 *   4. js/app-shell.js —— Help 頁的示意圖（stomp / wiggle 的 APNG 與 GIF）
 * 以前是各處自己寫一段，而且用的是「src = '' 再設回原值」的老招。這招有兩個小毛病：
 *   (1) 有些瀏覽器會把空字串解析成「目前頁面的網址」，白白多發一次請求；
 *   (2) 圖片會短暫變空白閃一下，而且命中快取時「不一定」真的重新解碼，
 *       使用者會覺得點了沒反應。
 * 所以統一收斂成這支 replayImg()，實作改成「換一個帶時間戳的網址」，
 * 瀏覽器就會把它當成新資源重新解碼，動畫自然從第一格開始播。
 *
 * 【怎麼用】
 *   replayImg(imgElement);
 * 只要傳入 <img> 元素就好，函式自己會處理網址乾淨化，呼叫端不用記任何狀態。
 *
 * 【載入順序】
 * 必須排在 i18n.js 之後、share.js / meme.js / app-shell.js 之前，
 * 這樣後面幾支綁事件時就已經看得到 replayImg。
 * 本檔不依賴任何其他模組，也不碰 DOM 以外的東西。
 */

(function () {
	'use strict';

	/**
	 * 把「我們自己加上去的」重播參數 r= 拆掉，還原成乾淨的原網址。
	 *
	 * 為什麼要拆：使用者連點第二次時，圖片的 src 已經是「原網址?r=舊時間戳」，
	 * 若直接再串一個上去，就會變成 ?r=1&r=2&r=3 一路疊，瀏覽器快取也會愈存愈多筆。
	 *
	 * 會處理到的情況：
	 *   原網址?r=123                → 原網址
	 *   原網址?a=1&r=123            → 原網址?a=1
	 *   原網址?a=1&r=123&b=2        → 原網址?a=1&b=2
	 * Supabase 帶的 ?token=... 這類參數會原封不動保留，只拿掉 r= 這一段。
	 *
	 * @param {string} url 目前 src 的值
	 * @returns {string} 不含 r= 的網址
	 */
	function stripReplayParam(url) {
		// 沒有 r= 就不用動，直接回傳，省掉後面的字串處理
		if (url.indexOf('r=') < 0) return url;

		// 只移除「我們自己的」r 參數：r= 後面一定接數字，避免誤刪別人的同名參數
		let clean = url.replace(/([?&])r=\d+(?=&|$)/g, '$1');

		// 移除後可能留下結尾孤零零的 ? 或 &，例如「a.png?r=123」會變成「a.png?」
		clean = clean.replace(/[?&]$/, '');

		// 也可能是「a.png?&b=2」這種中間多一個 & 的殘留，順手修掉
		clean = clean.replace(/\?&/, '?');

		return clean;
	}

	/**
	 * 產生「保證不一樣」的時間戳。
	 *
	 * 為什麼不直接用 Date.now()：兩次點擊若落在同一毫秒（例如雙擊、或測試程式連跑），
	 * Date.now() 會給出一模一樣的數字，瀏覽器就會把它當成同一個網址、直接用快取，
	 * 結果第二次點看起來「沒反應」。所以這裡自己記住上一個用過的數字，
	 * 只要沒有比上次大就 +1，確保每次呼叫都拿到新值。
	 *
	 * @returns {number} 比上一次更大的時間戳
	 */
	let lastStamp = 0;
	function nextStamp() {
		const now = Date.now();
		lastStamp = now > lastStamp ? now : lastStamp + 1;
		return lastStamp;
	}

	/**
	 * 讓一張動畫圖（GIF / APNG）從第一格重新播放。
	 *
	 * 原理：GIF / APNG 都是瀏覽器自己解碼播放的，沒有 API 可以叫它「倒帶」，
	 * 唯一可靠的做法是讓它重新載入一次。而「同一個網址」瀏覽器會直接用快取，
	 * 所以每次都要在網址尾巴掛一個不一樣的 r=時間戳，逼它重新解碼。
	 *
	 * @param {HTMLImageElement} img 要重播的圖片元素
	 * @returns {boolean} 真的執行了重播回 true；傳錯東西或沒 src 回 false
	 */
	function replayImg(img) {
		// 防呆一：不是圖片元素（或根本沒傳）就跳過，避免呼叫端傳錯時整個事件爆掉
		if (!img || typeof img.getAttribute !== 'function') return false;

		// 防呆二：還沒有 src（例如圖片尚未載入、或剛被清空）也沒有東西可重播
		const current = img.getAttribute('src') || '';
		if (!current) return false;

		const origin = stripReplayParam(current);

		// 【踩過的坑】blob: / data: 這類「記憶體直接供圖」的網址不能加 query！
		// 加了之後會變成一個根本不存在的網址（blob:http://xxx/uuid?r=123），
		// 瀏覽器找不到就噴 alt 文字，圖片直接消失——分享彈窗的預覽圖就是這樣壞掉的。
		// 這種情況改成「先移除 src、下一輪再設回同一個 blob 網址」，等於重新解碼一次。
		if (/^(blob|data):/i.test(origin)) {
			img.removeAttribute('src');
			setTimeout(function () { img.src = origin; }, 0);
			return true;
		}

		// 原網址本來就帶參數（例如 Supabase 的 ?token=...）時要用 & 接，否則用 ?
		const sep = origin.indexOf('?') >= 0 ? '&' : '?';

		img.src = origin + sep + 'r=' + nextStamp();

		return true;
	}

	/**
	 * 重播「由 Blob 產生」的預覽圖（分享彈窗用）。
	 *
	 * 為什麼不共用 replayImg：blob: 網址不能加 query（會直接失效），
	 * 而單純把同一個 blob 網址重新指回去也常因為快取而不重新解碼。
	 * 最乾淨的做法是向 Blob 再要一個「全新的 object URL」，網址不同 → 一定重新解碼。
	 *
	 * 記憶體注意事項：
	 *   - 上一次「由本函式建立」的 object URL，等新圖換上去之後再延遲釋放；
	 *   - 絕對不去 revoke 別人（例如 apng-encoder.js）建立的網址，
	 *     那個網址可能還掛在下載連結上，誤放會讓下載壞掉。
	 *
	 * @param {HTMLImageElement} img 預覽圖
	 * @param {Blob} blob 要重新播放的 APNG / GIF 內容
	 * @returns {boolean} 有執行回 true
	 */
	let lastCreatedUrl = null;   // 只記「本函式自己建立的」網址，用來回收上一筆
	function replayBlobImg(img, blob) {
		if (!img || typeof img.getAttribute !== 'function') return false;
		if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;

		const newUrl = URL.createObjectURL(blob);
		img.src = newUrl;

		// 上一筆自己建立的網址已經不再顯示，延遲一下再釋放（避免還在解碼就被回收）
		if (lastCreatedUrl) {
			const oldOne = lastCreatedUrl;
			setTimeout(function () { URL.revokeObjectURL(oldOne); }, 500);
		}
		lastCreatedUrl = newUrl;

		return true;
	}

	// 傳統 script 沒有模組系統，只能掛到 window 讓其他檔案共用。
	// 只放出這兩個名字，不再多污染全域。
	window.replayImg = replayImg;
	window.replayBlobImg = replayBlobImg;
})();
