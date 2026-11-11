/**
 * EdgeOne Pages Node Function: 上傳 APNG 到 Supabase（分站專用）
 * @author [DaiEn]
 * @Date: 2026-11-11
 * @Correction: 1
 *
 * 【這支是做什麼的】
 * 主站跑在 Vercel，用的是 api/upload.js（Vercel 的 handler(req, res) 契約）。
 * 分站跑在 EdgeOne Pages，Vercel 那套契約在 EdgeOne 完全不適用，
 * 所以在這裡另建一支同路由的函數：
 *   node-functions/api/upload.js  →  路由 /api/upload
 * 前端 fetch('/api/upload') 不必改，兩站各自打到自己的後端，資料庫同一個。
 *
 * 【為什麼不放 edge-functions？】
 * edge-functions 是 V8 邊緣執行環境，請求 body 上限只有 1MB，
 * base64 的 APNG 隨便一張就爆；而且沒有 Node 的 Buffer。
 * node-functions 是 Node.js 20.x，body 上限 6MB，Buffer 可用。
 *
 * 【與 api/upload.js 的差異只有五處】
 * 1. 入口：handler(req, res)  →  onRequest(context)，回傳 Response 物件
 * 2. 取 body：req.body  →  await request.json()
 * 3. 環境變數：process.env.X  →  context.env.X
 * 4. 回應：res.status().json()  →  new Response(JSON.stringify(), { status })
 * 5. 位置：api/  →  node-functions/api/
 *
 * 【環境變數（EdgeOne 控制台 → 項目設置 → 環境管理）】
 * SUPABASE_URL              Supabase 專案網址
 * SUPABASE_SERVICE_ROLE_KEY Supabase 私密金鑰（sb_secret_ 開頭）
 * SUPABASE_BUCKET           Storage bucket 名稱（可省略，預設 apng-uploads）
 * 注意：環境變數改完必須重新部署才會生效。
 *
 * 【本版額外補的三道防護】
 * 1. base64 長度上限（配合 EdgeOne 6MB body 限制，避免直接 413 看不出原因）
 * 2. PNG magic number 檢查（擋掉亂塞的內容，也順便擋掉非 PNG 的二進位）
 * 3. 簡易限流（同一 IP 10 分鐘內最多 5 次；記憶體計數，跨實例不精確但足以擋誤用）
 */

// ============================================================
// 常數與工具
// ============================================================

// base64 字串上限：5MB 字元約等於 3.9MB 原圖
// 為什麼留這麼多餘裕？EdgeOne node-functions 的 body 上限是 6MB，
// 整個 JSON（含 title / author / tags）都要塞在裡面，超過就是平台層 413，
// 使用者只會看到「上傳失敗」四個字，很難查。這裡先自己擋並回明確訊息。
const MAX_BASE64_LEN = 5 * 1024 * 1024;

// 限流設定
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 分鐘
const RATE_MAX = 5;                    // 每個 IP 最多 5 次

// 記憶體計數表。Node Functions 可能有多個實例，
// 所以這只是「擋掉手動亂打」的粗防護，不是嚴謹的分散式限流。
const rateMap = new Map();

function corsHeaders() {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
}

// 統一的 JSON 回應（一定帶 CORS 標頭，否則分站跨域會失敗）
function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status: status,
		headers: Object.assign(
			{ 'Content-Type': 'application/json; charset=UTF-8' },
			corsHeaders()
		),
	});
}

// 簡易滑動窗口限流
function isRateLimited(ip) {
	const now = Date.now();
	const rec = rateMap.get(ip);

	if (!rec || now - rec.start > RATE_WINDOW_MS) {
		rateMap.set(ip, { start: now, count: 1 });
		return false;
	}

	rec.count += 1;
	// 偶爾清理過期紀錄，避免 Map 無限長大
	if (rateMap.size > 500) {
		for (const [k, v] of rateMap) {
			if (now - v.start > RATE_WINDOW_MS) rateMap.delete(k);
		}
	}
	return rec.count > RATE_MAX;
}

// PNG / APNG 的檔案開頭固定是這 8 個位元組
function isPng(buf) {
	return (
		buf.length > 8 &&
		buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
		buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
	);
}

// ============================================================
// 請求入口
// ============================================================

export default async function onRequest(context) {
	const request = context.request;
	const env = context.env || {};

	// ---- CORS preflight ----
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders() });
	}

	if (request.method !== 'POST') {
		return json({ error: 'Method not allowed' }, 405);
	}

	// ---- 限流 ----
	const ip =
		context.clientIp ||
		request.headers.get('x-forwarded-for') ||
		request.headers.get('x-real-ip') ||
		'unknown';
	if (isRateLimited(ip)) {
		return json({ error: '請求過於頻繁，請稍後再試（10 分鐘內上限 5 次）' }, 429);
	}

	// ---- 環境變數檢查 ----
	const SUPABASE_URL = env.SUPABASE_URL;
	const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
		// 這裡刻意不吐細節，避免把設定狀態暴露給外部；
		// 真正的原因看控制台的函數日誌。
		return json({ error: 'Server not configured' }, 500);
	}

	try {
		// ---- 解析 body（Vercel 會自動 parse，這裡要自己來）----
		let body;
		try {
			body = await request.json();
		} catch (e) {
			return json({ error: 'Invalid JSON body' }, 400);
		}

		const { blobBase64, title, author, tags } = body || {};

		if (!blobBase64 || typeof blobBase64 !== 'string') {
			return json({ error: 'No image data' }, 400);
		}

		// 先擋大小，別讓平台層直接 413
		if (blobBase64.length > MAX_BASE64_LEN) {
			const mb = (blobBase64.length / 1024 / 1024).toFixed(1);
			return json(
				{ error: `圖片過大（${mb}MB 的 base64，上限約 3.9MB 原圖）` },
				413
			);
		}

		// ---- base64 還原成 Buffer ----
		// 格式：data:image/png;base64,iVBORw0K... → 只取逗號後面
		const base64Data = blobBase64.replace(/^data:image\/\w+;base64,/, '');
		let buffer;
		try {
			buffer = Buffer.from(base64Data, 'base64');
		} catch (e) {
			return json({ error: 'Base64 解析失敗' }, 400);
		}

		// ---- PNG magic number 檢查 ----
		if (!isPng(buffer)) {
			return json({ error: '檔案不是有效的 PNG / APNG' }, 400);
		}

		// ---- 隨機檔名，避免撞名 ----
		const filename = `eggshell-${Math.random().toString(36).slice(2, 10)}.png`;
		const bucket = env.SUPABASE_BUCKET || 'apng-uploads';

		// ====== 第一步：上傳圖片到 Supabase Storage ======
		// apikey 與 Authorization 都帶：Supabase REST / Storage 少了 apikey 會回 No API key found
		const uploadResponse = await fetch(
			`${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
					apikey: SUPABASE_SERVICE_ROLE_KEY,
					'Content-Type': 'image/png',
				},
				body: buffer,
			}
		);

		if (!uploadResponse.ok) {
			const errText = await uploadResponse.text();
			return json({ error: 'Storage upload failed: ' + errText }, 500);
		}

		// ====== 第二步：寫入資料庫（預設待審核）======
		const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/apng_images`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
				apikey: SUPABASE_SERVICE_ROLE_KEY,
				'Content-Type': 'application/json',
				Prefer: 'return=minimal',
			},
			body: JSON.stringify({
				filename: filename,
				title: title || null,
				author: author || null,
				tags: tags || [],
				approved: false, // 預設待審核，管理者改成 true 才會出現在展示牆
			}),
		});

		if (!dbResponse.ok) {
			const errText = await dbResponse.text();
			return json({ error: 'Database insert failed: ' + errText }, 500);
		}

		// 回傳格式與 api/upload.js 一致，前端不必分辨自己在哪個站
		return json({ success: true, filename: filename }, 200);
	} catch (e) {
		return json({ error: e.message || 'Unknown error' }, 500);
	}
}
