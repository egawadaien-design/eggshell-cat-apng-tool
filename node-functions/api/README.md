# node-functions/api/ — EdgeOne Pages Node Function（EdgeOne後端）

這個資料夾只有一個用途：**讓 EdgeOne Pages 分站也有一個 `/api/upload`**，
行為與主站的 Vercel Function 完全一致，前端一行都不用改。

- 作者：DaiEn
- 建立：2026-11-11
- 最後更新：2026-11-11
- 對應平台：EdgeOne Pages（分站 `eggshell-cat-apng-tool.edgeone.dev`）

---

## 檔案清單

| 檔案 | 用途 | 路由 |
|---|---|---|
| `upload.js` | 收前端送來的 base64 APNG → 上傳 Supabase Storage → 在 `apng_images` 表寫一筆 `approved=false` 的待審記錄 | `POST /api/upload` |

主站（Vercel）的對應版本在 `../../api/upload.js`，兩支打同一個 Supabase 專案。

---

## 為什麼不放在 `edge-functions/`？

| | `edge-functions` | `node-functions`（本資料夾） |
|---|---|---|
| 執行環境 | V8 邊緣，**沒有 Node 的 `Buffer`** | Node.js 20.x，`Buffer` 可用 |
| body 上限 | **1MB** | **6MB** |
| 適不適合收 APNG | 一張就爆 | 可以 |

base64 會把檔案膨脹約 33%，1MB 上限等於原圖只能 750KB 左右，做貼圖根本不夠用，
所以只能走 `node-functions`。

---

## 與 Vercel 版的差異（只有五處）

| # | Vercel 版 `api/upload.js` | EdgeOne 版（本檔） |
|---|---|---|
| 1 | 入口 `handler(req, res)` | 入口 `onRequest(context)`，回傳 `Response` 物件 |
| 2 | body 已自動解析 `req.body` | 要自己 `await request.json()` |
| 3 | 環境變數 `process.env.X` | 環境變數 `context.env.X` |
| 4 | 回應 `res.status(500).json(...)` | 回應 `json(data, status)`（內部 `new Response`） |
| 5 | 位置 `api/` | 位置 `node-functions/api/` |

邏輯本體（Storage 上傳、DB 寫入、檔名產生、回應格式）兩邊**完全一致**，
所以前端 `fetch('/api/upload')` 不需分辨自己在哪一個站。

---

## 本版額外補的三道防護

| # | 防護 | 細節 |
|---|---|---|
| 1 | **base64 長度上限** | `MAX_BASE64_LEN = 5MB` 字元（約 3.9MB 原圖）。為什麼要自己擋：EdgeOne body 上限 6MB，超過是平台層 413，使用者只會看到「上傳失敗」，很難查 |
| 2 | **PNG magic number** | 檢查前 8 bytes 是否為 `89 50 4E 47 0D 0A 1A 0A`，擋掉亂塞的二進位 |
| 3 | **簡易限流** | 同一 IP 10 分鐘內最多 5 次，超過回 `429`。用記憶體 `Map` 計數，Node Functions 可能多實例，**跨實例不精確，只足以擋手動亂打** |

> 限流的 `rateMap` 在單一實例內有效；若之後真的被灌，正確做法是接到
> Upstash Redis / Cloudflare KV 之類的共享儲存，而不是加大這張 Map。

---

## 端點契約

```
POST /api/upload
Content-Type: application/json
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `blobBase64` | string | ✓ | `data:image/png;base64,....` 或純 base64 |
| `title` | string \| null | | 標題（前端上限 40 字） |
| `author` | string \| null | | 暱稱（前端上限 20 字） |
| `tags` | number[] | | 分類標籤編號（1～9） |

**成功回應**

```json
{ "success": true, "filename": "eggshell-a1b2c3d4.png" }
```

---

## 錯誤碼對照

| HTTP | `error` | 常見原因 |
|---|---|---|
| 200 | —（`success:true`） | 成功 |
| 204 | —（無 body） | CORS preflight（OPTIONS） |
| 405 | `Method not allowed` | 方法不是 POST / OPTIONS |
| 429 | `請求過於頻繁，請稍後再試（10 分鐘內上限 5 次）` | 觸發限流 |
| 500 | `Server not configured` | `context.env` 讀不到環境變數（**刻意不吐細節**，真正原因看控制台函數日誌） |
| 400 | `Invalid JSON body` | body 不是合法 JSON |
| 400 | `No image data` | 缺 `blobBase64`，或不是字串 |
| 413 | `圖片過大（x.xMB 的 base64，上限約 3.9MB 原圖）` | 超過 `MAX_BASE64_LEN` |
| 400 | `Base64 解析失敗` | base64 內容壞掉 |
| 400 | `檔案不是有效的 PNG / APNG` | magic number 不符 |
| 500 | `Storage upload failed: ...` | bucket 名稱錯、bucket 非 public、金鑰失效 |
| 500 | `Database insert failed: ...` | `apng_images` 欄位缺漏、RLS 阻擋 |

**快速驗函數是否活著**：

```powershell
Invoke-WebRequest -Uri "https://eggshell-cat-apng-tool.edgeone.dev/api/upload" `
  -Method Post -ContentType "application/json" -Body '{"x":1}' -UseBasicParsing
```

- 回 `400 No image data` → 函數正常、env 也讀到了
- 回 `500 Server not configured` → 函數正常但 env 空，補完要**重新部署**
- 回 EdgeOne 的 `404 NOT_FOUND` 頁 → 函數沒被認到，檢查路徑與專案根目錄設定

---

## 環境變數（EdgeOne 控制台 → 項目設置 → 環境管理）

| Key | 說明 |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...`（**不是** `sb_publishable_`） |
| `SUPABASE_BUCKET` | 可省略，預設 `apng-uploads` |

⚠️ **EdgeOne 的環境變數改完必須重新部署才會生效**（這點和 Vercel 不同，很容易漏）。

---

## 部署注意

1. `node-functions/` 必須在**專案根目錄**，拼成 `api/node-functions/upload.js` 會 404。
2. 路由是「資料夾＝路由」：`node-functions/api/upload.js` → `/api/upload`，檔名大小寫敏感。
3. EdgeOne 只把 `.js` 當函數入口；本 `README.md` 只是文件，不會被當函數執行。
4. 前端是否顯示「分享我的圖片」由 `js/supabase-config.js` 的 `shareHosts` 白名單決定，
   換網域時記得兩邊一起改（白名單 + 這裡的部署位置）。
5. 這支函數預設寫入 `approved=false`；要在展示牆看到，得去 Supabase 把該列改成 `true`。
