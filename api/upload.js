/**
 * Vercel Serverless Function: 上傳 APNG 到 Supabase
 * @author [DaiEn]
 * @Date: 2026-11-10
 * @Correction: 2
 *
 * 【功能說明】
 * 前端把 APNG 圖片（base64 格式）POST 到這支 Function，
 * Function 在 Vercel 伺服器端用 service_role key 上傳到 Supabase。
 *
 * 為什麼要這樣做？
 * - service_role key 權限超大（可以直接寫資料庫、跳過 RLS）
 * - 不能放在前端程式碼，否則任何人 F12 都能偷走亂上傳
 * - 放在 Vercel 環境變數裡，只有 Function 程式讀得到
 *
 * 【前端呼叫方式】
 * POST /api/upload
 * Body: { blobBase64, title, author, tags }
 *
 * 【環境變數（在 Vercel 後台設）】
 * SUPABASE_URL           - Supabase 專案網址
 * SUPABASE_SERVICE_ROLE_KEY - Supabase 私密金鑰（sb_secret_開頭那串）
 * SUPABASE_BUCKET        - Storage bucket 名稱（預設 apng-uploads）
 */

export default async function handler(req, res) {
  // CORS 設定：允許本機開發時跨域呼叫
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 preflight 請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 從 Vercel 環境變數讀取 Supabase 設定（不會出現在前端）
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 環境變數沒設好的話直接回錯誤
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Supabase env not configured' });
    }

    // 解析前端送來的 JSON 資料
    const { blobBase64, title, author, tags } = req.body;

    // 沒有圖片資料就拒絕
    if (!blobBase64) {
      return res.status(400).json({ error: 'No image data' });
    }

    // 把 base64 字串還原成二進位 Buffer
    // 格式：data:image/png;base64,iVBORw0K... → 只要逗號後面的部分
    const base64Data = blobBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 產生隨機檔名：eggshell-xxxxxxxx.png，避免檔名重複
    const filename = `eggshell-${Math.random().toString(36).slice(2, 10)}.png`;

    // 從環境變數讀 bucket 名稱，預設 apng-uploads
    const bucket = process.env.SUPABASE_BUCKET || 'apng-uploads';

    // ====== 第一步：上傳圖片到 Supabase Storage ======
    // 用 service_role key，跳過 RLS 直接上傳
    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'image/png',
        },
        body: buffer,
      }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      return res.status(500).json({ error: 'Storage upload failed: ' + errText });
    }

    // ====== 第二步：在資料庫寫一筆記錄 ======
    // 讓前端 Meme 頁面能讀到這張圖的中繼資料
    const dbResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/apng_images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          filename: filename,      // 對應 Storage 裡的檔名
          title: title || null,     // 使用者填的標題（選填）
          author: author || null,   // 使用者填的暱稱（選填）
          tags: tags || [],         // 分類標籤編號陣列
          approved: false,          // 預設待審核，管理者改 true 才會顯示
        }),
      }
    );

    if (!dbResponse.ok) {
      const errText = await dbResponse.text();
      return res.status(500).json({ error: 'Database insert failed: ' + errText });
    }

    // 全部成功，回傳檔名給前端
    return res.status(200).json({ success: true, filename: filename });
  } catch (e) {
    // 任何意外錯誤都在這裡攔截
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
