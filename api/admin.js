/**
 * Vercel Serverless Function: 管理後台 API（分享圖片是否展示）
 * @author [DaiEn]
 * @Date: 2026-11-23
 * @Correction: 1
 *
 * 【功能】
 * 給 /admin/ 管理頁用的後端：驗管理密碼、列出全部分享圖片（含未通過的）、
 * 切換某一筆的 approved（true = 前台 Meme 牆看得到）。
 *
 * 【為什麼單一入口】
 * POST /api/admin，用 body 的 action 分流，Vercel 一支 Function 只有一個路由。
 * 本機 STS 的 AdminController.java 用完全相同的契約，前端 js/admin.js 兩站通用。
 *
 * 【環境變數（Vercel 後台 → Settings → Environment Variables）】
 * ADMIN_PASSWORD              - 管理密碼（必填；沒設 = 後台一律拒絕）
 * SUPABASE_URL                - Supabase 專案網址
 * SUPABASE_SERVICE_ROLE_KEY   - Supabase 私密金鑰（sb_secret_ 開頭）
 * SUPABASE_BUCKET             - Storage bucket（預設 apng-uploads）
 *
 * 【安全】service_role key 只在伺服器端使用；密碼不落前端，登入只發 HMAC 簽章的短期通行證。
 */

import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = 12 * 3600;   // 通行證 12 小時
const MAX_PAGE_SIZE = 50;

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function sign(password, ts) {
  return crypto
    .createHmac('sha256', password)
    .update('eggshell-admin|' + ts)
    .digest('base64url');
}

// 通行證驗證：時間窗 + 簽章比對。改密碼等於全部舊通行證自動作廢
function checkToken(password, token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const ts = Number(token.slice(0, dot));
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (ts > now + 60 || now - ts > TOKEN_TTL_SECONDS) return false;
  const expect = sign(password, ts);
  const given = token.slice(dot + 1);
  // timingSafeEqual 要求長度一致，長度不同直接視為不通過
  if (given.length !== expect.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expect));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const BUCKET = process.env.SUPABASE_BUCKET || 'apng-uploads';

  if (!ADMIN_PASSWORD) return fail(res, 500, 'ADMIN_PASSWORD 未設定');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return fail(res, 500, 'Supabase 未設定');

  // req.body 在 Vercel 會自動解析 JSON；保險起見兩種都吃
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return fail(res, 400, 'Body 不是合法 JSON'); }
  }
  if (!body || typeof body !== 'object') return fail(res, 400, 'Body 不是合法 JSON');

  const action = String(body.action || '');

  // ---------- login ----------
  if (action === 'login') {
    const given = String(body.password || '');
    const a = Buffer.from(ADMIN_PASSWORD);
    const b = Buffer.from(given);
    // 長度不同時 timingSafeEqual 會拋錯，先擋掉
    const same = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!same) return fail(res, 401, '管理密碼錯誤');

    const ts = Math.floor(Date.now() / 1000);
    return res.status(200).json({
      ok: true,
      token: ts + '.' + sign(ADMIN_PASSWORD, ts),
      expiresAt: (ts + TOKEN_TTL_SECONDS) * 1000,
    });
  }

  // ---------- 之後的動作都要通行證 ----------
  if (!checkToken(ADMIN_PASSWORD, req.headers['x-admin-token'])) {
    return fail(res, 401, '登入已失效，請重新登入');
  }

  // ---------- list ----------
  if (action === 'list') {
    let page = Number(body.page);
    page = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
    let size = Number(body.size);
    size = Number.isFinite(size) && size > 0 ? Math.min(Math.floor(size), MAX_PAGE_SIZE) : 12;

    const status = String(body.status || 'all');

    let qs =
      'select=id,filename,title,author,tags,likes,approved,created_at' +
      '&order=created_at.desc' +
      '&limit=' + size +
      '&offset=' + page * size;
    if (status === 'visible') qs += '&approved=eq.true';
    else if (status === 'hidden') qs += '&approved=eq.false';

    const r = await fetch(`${SUPABASE_URL}/rest/v1/apng_images?${qs}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        // count=exact：總筆數放在 Content-Range（0-11/37）
        Prefer: 'count=exact',
      },
    });

    if (!r.ok) {
      const t = await r.text();
      return fail(res, 502, '讀取列表失敗：' + r.status + ' ' + t);
    }

    const rows = await r.json();
    // 公開網址在後端組好，前端不必知道自己接的是哪個 Supabase 專案
    const norm = (Array.isArray(rows) ? rows : []).map((row) => ({
      ...row,
      publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${row.filename}`,
    }));

    // Content-Range: 0-11/37 → 37
    const cr = r.headers.get('content-range') || '';
    const slash = cr.lastIndexOf('/');
    const tail = slash >= 0 ? cr.slice(slash + 1).trim() : '';
    const total = tail && tail !== '*' && Number.isFinite(Number(tail)) ? Number(tail) : norm.length;

    return res.status(200).json({ ok: true, rows: norm, total, page, size, status });
  }

  // ---------- setVisible ----------
  if (action === 'setVisible') {
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) return fail(res, 400, 'id 格式錯誤');
    if (typeof body.approved !== 'boolean') return fail(res, 400, 'approved 必須是布林值');

    const r = await fetch(`${SUPABASE_URL}/rest/v1/apng_images?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ approved: body.approved }),
    });

    if (!r.ok) {
      const t = await r.text();
      return fail(res, 502, '更新失敗：' + r.status + ' ' + t);
    }
    return res.status(200).json({ ok: true, id, approved: body.approved });
  }

  return fail(res, 400, '未知的 action：' + action);
}
