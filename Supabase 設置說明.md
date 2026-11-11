# Supabase 設置說明

這個文件是AI寫的，如果不完整多多包涵~
本文件教你從零開始設置 Supabase，讓你的 APNG 工具能讓使用者上傳圖片。

---

## 一、申請 Supabase 帳號

1. 打開瀏覽器，前往 [https://supabase.com](https://supabase.com)
2. 點右上角 **「Start your project」**
3. 用 **GitHub 帳號** 註冊（最方便，之後 Vercel 也能連動）
4. 第一次登入會要你填：
   - 工作室名稱：隨便取，例如 `EggshellCat Studio`
   - 選擇 **Free** 方案（免費，夠用）
5. 完成！進入 Supabase Dashboard

> 免費額度：500MB 資料庫、1GB 檔案儲存、50,000 月活使用者。對個人專案綽綽有餘。

---

## 二、建立新專案

1. 在 Dashboard 左邊點 **「New Project」**
2. 填寫：
   - **Organization**：選剛建立的 organization
   - **Project name**：`eggshell-cat-apng`
   - **Database Password**：自己設一組密碼（記得起來！之後會用到）
   - **Region**：選 **Southeast Asia (Singapore)**（離台灣最近）
3. 點 **「Create new project」**
4. 等 2 分鐘左右，專案會建好（顯示綠燈）

---

## 三、建立 Storage Bucket（圖片儲存空間）

1. 左邊選單點 **「Storage」**
2. 點 **「New bucket」**
3. 填寫：
   - **Name**：`apng-uploads`（這個名字很重要，前後端都要一致）
   - **Public bucket**：✅ **打開**（要公開讀取才能顯示在 Meme 頁）
4. 點 **「Create bucket」**

---

## 四、設定 Storage Bucket 權限

我們的架構是：
- **前端**：只能「讀取」公開圖片
- **後端（Vercel Function）**：用 service_role key 「寫入」圖片
- 前端**不能直接上傳**到 Storage（避免被灌爆）

### 4.1 設定 Bucket Policy

1. 在 Storage 頁面，點剛建立的 `apng-uploads` bucket
2. 點上方 **「Policies」** 分頁
3. 點 **「New Policy」** → **「For full customization」**

#### Policy 1：公開讀取（給前端用）

- **Policy name**：`Public read access`
- **Allowed operation**：`SELECT`
- **Target roles**：`public`
- **USING expression**：`true`

點 **「Review」** → **「Save policy」**

#### Policy 2：禁止前端寫入

預設情況下，anon 角色沒有 INSERT 權限，所以**不用加任何 policy**。
寫入操作會由後端 Vercel Function 用 service_role key 繞過 RLS 完成。

---

## 五、建立資料表（apng_images）

1. 左邊選單點 **「SQL Editor」**（帶有 `</>` 圖示）
2. 點 **「New query」**
3. 貼上以下 SQL：

```sql
-- 建立 apng_images 資料表
CREATE TABLE apng_images (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT,
  author TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 開啟 RLS
ALTER TABLE apng_images ENABLE ROW LEVEL SECURITY;

-- 政策：前端只能讀 approved=true 的資料
CREATE POLICY "Public read approved only"
  ON apng_images FOR SELECT
  TO public
  USING (approved = true);

-- 政策：禁止前端直接 INSERT（後端用 service_role 繞過）
-- 不加任何 INSERT policy = 預設拒絕
```

4. 點 **「Run」**（或按 Ctrl+Enter）
5. 看到「Success. No rows returned」就成功了

---

## 六、取得金鑰

1. 左邊選單點 **「Project Settings」**（齒輪圖示）
2. 點 **「API」**
3. 你會看到兩組重要金鑰：

### 6.1 Project URL
長這樣：`https://xxxxxxxxxxxx.supabase.co`
→ 填到前端 `js/supabase-config.js` 的 `url`

### 6.2 anon public key
長一串 `eyJhbGciOi...` 的 JWT
→ 填到前端 `js/supabase-config.js` 的 `anonKey`
→ 這個金鑰**公開沒關係**，它只能做 SELECT approved=true

### 6.3 service_role key
長得跟 anon key 很像，但權限極大
→ **絕對不能放前端！**
→ 等一下要填到 Vercel 的環境變數

---

## 七、測試流程

1. 先在 Supabase Dashboard → Table Editor → `apng_images`
2. 手動加一筆測試資料：
   - filename：`test.png`
   - title：測試圖片
   - approved：✅ true
3. 把一張叫 `test.png` 的圖片手動上傳到 Storage 的 `apng-uploads` bucket
4. 打開你的網站，切到 Meme tab，應該會看到這張圖

如果看到了，代表讀取流程通了。接下來測試上傳流程（需要配合 Vercel 設置）。

---

## 八、之後要審核新圖片

使用者上傳的圖片預設 `approved = false`，不會顯示在 Meme 頁。

你要審核時：
1. 打開 Supabase Dashboard → Table Editor → `apng_images`
2. 找 `approved = false` 的列
3. 把 `approved` 改成 ✅ true
4. 儲存，前端 Meme 頁重新整理就會出現

---

## 常見問題

**Q: 忘記 Database Password 怎麼辦？**
A: Project Settings → Database → Reset database password。但這個密碼我們其實沒用到（前端用 API key），所以不重置也沒差。

**Q: bucket 名字可以改嗎？**
A: 建議不要。要改的話，前端 `supabase-config.js`、後端 Vercel Function、實際 bucket 名稱三處要一起改。

**Q: 免費額度用完了怎麼辦？**
A: 升 Pro 方案，或定期在 Storage 刪除不需要的舊圖片。
