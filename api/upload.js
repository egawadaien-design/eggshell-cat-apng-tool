/**
 * Vercel Serverless Function: 上傳 APNG 到 Supabase
 * @author [DaiEn]
 * @Date: 2026-11-10
 * @Correction: 1
 *
 * 前端 POST 圖片到此 Function，Function 內部用 service_role key 上傳
 * 前端完全不知道 Supabase 的 URL 和 key
 */

export default async function handler(req, res) {
  // 只接受 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Supabase env not configured' });
    }

    // 接收前端送來的 JSON
    const { blobBase64, title, author, tags } = req.body;

    if (!blobBase64) {
      return res.status(400).json({ error: 'No image data' });
    }

    // 把 base64 轉回 Blob
    const base64Data = blobBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 產生隨機檔名
    const filename = `eggshell-${Math.random().toString(36).slice(2, 10)}.png`;

    // 1. 上傳到 Supabase Storage
    const bucket = process.env.SUPABASE_BUCKET || 'apng-uploads';
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

    // 2. 寫入資料庫
    const dbResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/apng_images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          filename: filename,
          title: title || null,
          author: author || null,
          tags: tags || [],
          approved: false,
        }),
      }
    );

    if (!dbResponse.ok) {
      const errText = await dbResponse.text();
      return res.status(500).json({ error: 'Database insert failed: ' + errText });
    }

    // 成功
    return res.status(200).json({ success: true, filename: filename });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
