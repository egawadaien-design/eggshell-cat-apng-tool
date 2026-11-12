# api/ — Vercel Serverless Function（Vercel後端）

這個資料夾只有一個用途：**在 Vercel 伺服器端代理「上傳 APNG 到 Supabase」**，
讓 `service_role` 金鑰永遠不會出現在前端程式碼裡。

- 作者：DaiEn
- 建立：2026-11-10
- 最後更新：2026-11-12（`upload.js` 補 `typeof` 檢查、catch 改回通用錯誤訊息）
- 對應平台：Vercel（主站 `apng-murex.vercel.app`）

---

## 檔案清單

| 檔案 | 用途 | 路由 |
|---|---|---|
| `upload.js` | 收前端送來的 base64 APNG → 上傳 Supabase Storage → 在 `apng_images` 表寫一筆 `approved=false` 的待審記錄 | `POST /api/upload` |

> 分站（EdgeOne Pages）的同路由版本在 `../node-functions/api/upload.js`。
> 兩支程式**打的是同一個 Supabase 專案**，差別只在平台的函數契約。

---

## 為什麼要有一支後端？

`service_role` key 可以跳過 RLS 直接寫資料庫與 Storage，權限等於整個專案。
放前端 = 任何人 F12 就能抄走亂傳。所以：

```
瀏覽器 ──base64──▶ Vercel Function ──service_role──▶ Supabase（Storage + Postgres）
                      ↑ 金鑰只存在這裡的環境變數
```

前端手上只有 `anon` key，而 `anon` 在 RLS 下**只能讀 `approved=true` 的資料**。

---

## 端點契約

```
POST /api/upload
Content-Type: application/json
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `blobBase64` | string | ✓ | `data:image/png;base64,....` 或純 base64（程式會自己剝掉前綴） |
| `title` | string \| null | | 標題，前端 `maxlength=40` |
| `author` | string \| null | | 暱稱，前端 `maxlength=20` |
| `tags` | number[] | | 分類標籤編號（1～9），前端為多選 |

**成功回應**

```json
{ "success": true, "filename": "eggshell-a1b2c3d4.png" }
```

檔名由伺服器端產生（`eggshell-` + 8 位隨機英數 + `.png`），不由前端決定。

---

## 錯誤碼對照

| HTTP | `error` | 常見原因 |
|---|---|---|
| 200 | —（`success:true`） | 成功 |
| 405 | `Method not allowed` | 方法不是 POST / OPTIONS |
| 500 | `Supabase env not configured` | 環境變數沒設或設在錯誤環境 |
| 400 | `No image data` | 沒有 `blobBase64`，或值不是字串（送數字／物件也會被這道檢查擋下，回 400 而不是 500） |
| 500 | `Internal server error` | 未預期的例外。**刻意不回 `e.message`**，否則會把內部細節送給呼叫者；真正原因看 Vercel → 專案 → Logs → Functions |
| 500 | `Storage upload failed: ...` | bucket 名稱不一致（最常見）、bucket 非 public、金鑰失效 |
| 500 | `Database insert failed: ...` | `apng_images` 欄位缺漏（例如沒有 `tags`）、RLS 阻擋 |

---

## 環境變數（Vercel → Settings → Environment Variables）

| Key | 說明 |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...`（**不是** `sb_publishable_`） |
| `SUPABASE_BUCKET` | 可省略，預設 `apng-uploads` |

三個環境都要勾（Production / Preview / Development），**改完要重新部署**才生效。

---

## 這一版還缺的三道防護

`upload.js`（Vercel 版）是早期的精簡版，比 EdgeOne 版少了：

1. **body 大小預檢** —— Vercel 免費方案 body 上限約 4.5MB，超過會回平台層 413，訊息不明確
2. **PNG magic number 檢查** —— 目前任何二進位內容都能塞進 bucket
3. **限流** —— 沒有 per-IP 次數限制

EdgeOne 版（`../node-functions/api/upload.js`）這三項都已補上，未來若要對齊可參考它。

---

## 部署注意

- `vercel.json` 已設定 `rewrite: /api/upload → /api/upload.js`，**不要移除**，否則路由 404。
- Vercel 只把 `.js` 當函數入口；本 `README.md` 只是文件，不會被當成函數執行。
  （若某次部署出現與此資料夾相關的異常，最安全的做法是把文件移到上層資料夾。）
- 前端是 `fetch('/api/upload')` 同源呼叫，所以**不需要**在這裡處理 CORS 以外的來源限制。
