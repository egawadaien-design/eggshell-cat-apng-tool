# Vercel 設置說明

本文件教你從零開始把這個純靜態 APNG 工具部署到 Vercel，並設定安全的環境變數。

---

## 一、申請 Vercel 帳號

1. 打開瀏覽器，前往 [https://vercel.com](https://vercel.com)
2. 點右上角 **「Sign Up」**
3. 選擇 **「Continue with GitHub」**（建議跟 Supabase 用同一個 GitHub 帳號）
4. 授權 Vercel 存取你的 GitHub
5. 第一次登入會問你：
   - 你的名稱：隨便填
   - 選擇 **Hobby** 方案（免費，給個人專案用）
6. 完成！進入 Vercel Dashboard

> Hobby 免費額度：
> - 部署包 100 MB
> - 頻寬 100 GB / 月
> - CDN 請求 100 萬次 / 月
> - Serverless Function 執行時間 100 GB-hrs / 月

---

## 二、部署方式選擇

你有兩種部署方式：

| 方式 | 適合誰 | 優點 | 缺點 |
|---|---|---|---|
| **拖曳部署** | 快速測試、不想用 Git | 最快 | 改程式要重新拖曳 |
| **連結 GitHub** | 正式專案 | git push 自動部署 | 要先把程式放上 GitHub |

**建議**：先拖曳部署測試，之後再連結 GitHub。

---

## 三、拖曳部署（快速上手）

1. 打開 Vercel Dashboard
2. 直接把整個 `static` 資料夾**拖曳到 Dashboard 畫面中間**
3. Vercel 會自動開始部署
4. 等 30 秒左右，會給你一個網址，例如：
   `https://eggshell-cat-apng.vercel.app`
5. 打開那個網址，應該看到你的 APNG 工具首頁

> ⚠️ **重要**：拖曳部署時，`api/` 資料夾要放在 `static/` 裡面。
> Vercel 才會把它識別成 Serverless Function。

---

## 四、設定環境變數（關鍵！）

我們的上傳功能靠 Vercel Serverless Function 代理，需要 Supabase 的 **service_role key**。
這個 key **絕對不能放前端原始碼**，所以要存在 Vercel 環境變數裡。

### 4.1 進入環境變數設定

1. 在 Vercel Dashboard，點你的專案
2. 上方點 **「Settings」**
3. 左邊選 **「Environment Variables」**

### 4.2 加入兩個變數

#### 變數 1：SUPABASE_URL

- **Key**：`SUPABASE_URL`
- **Value**：你的 Supabase Project URL
  （長這樣 `https://xxxxxxxxxxxx.supabase.co`，從 Supabase Dashboard → Settings → API 複製）
- **Environments**：✅ 全選（Production / Preview / Development）
- 點 **「Save」**

#### 變數 2：SUPABASE_SERVICE_ROLE_KEY

- **Key**：`SUPABASE_SERVICE_ROLE_KEY`
- **Value**：你的 Supabase service_role key
  （長一串 `eyJhbGciOi...`，從 Supabase Dashboard → Settings → API 複製，注意是 service_role 不是 anon）
- **Environments**：✅ 全選
- 點 **「Save」**

### 4.3 重新部署

環境變數改完後，**一定要重新部署才會生效**：

1. 上方點 **「Deployments」**
2. 找最新那一次部署，右邊點 **「⋯」**
3. 選 **「Redeploy」**
4. 等 30 秒

---

## 五、vercel.json 設定

專案根目錄要有一個 `vercel.json`，內容大概長這樣：

```json
{
  "version": 2,
  "buildCommand": null,
  "outputDirectory": ".",
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  }
}
```

說明：
- `buildCommand: null`：純靜態網站，不用 build
- `outputDirectory: "."`：直接用根目錄當輸出
- `functions.api/*.js`：把 `api/` 資料夾下的 .js 都註冊成 Serverless Function
- `maxDuration: 10`：Function 最多跑 10 秒（Hobby 方案上限）

> ⚠️ 不要在 vercel.json 裡寫 `runtime` 欄位，Vercel 會直接報 build failed。

---

## 六、安全設置檢查清單

部署完之後，請確認以下事項：

### ✅ 1. service_role key 沒有出現在前端原始碼

打開你的網址，按右鍵 → 檢視原始碼 → Ctrl+F 搜尋 `service_role`
應該**完全找不到**這個字串。

### ✅ 2. anon key 可以出現在前端

打開 `js/supabase-config.js`，裡面的 anon key 是公開的，這是正常的。
它只能做 SELECT approved=true，無法寫入。

### ✅ 3. 直接呼叫 API 會失敗

在瀏覽器網址列輸入：
`https://你的網址.vercel.app/api/upload`
應該回傳錯誤（因為你沒帶圖片上傳），而不是直接成功。

### ✅ 4. Supabase Storage 沒有開放匿名上傳

到 Supabase Dashboard → Storage → Policies
應該只有一條 `Public read access` 的 SELECT policy，
**沒有** INSERT / UPDATE / DELETE 的 policy 給 anon 角色。

---

## 七、後續操作

### 修改程式碼後怎麼更新？

**拖曳部署**：
- 改完後重新把 `static` 資料夾拖到 Vercel Dashboard
- 舊的部署會保留，可隨時回到上一個版本

**GitHub 連結**：
- 在 Vercel Dashboard → Settings → Git → Connect Git Repository
- 之後 `git push` 就會自動部署

### 看部署紀錄

- Dashboard → 你的專案 → **Deployments**
- 每次部署都會留歷史，可以一鍵回滾

### 看 Function Logs

- Dashboard → 你的專案 → **Logs**
- 上傳失敗時看這裡，會有詳細錯誤訊息

---

## 常見問題

**Q: 部署後打開網站是 404？**
A: 確認你拖曳的是 `static` 資料夾本身，不是 `EggshellCatApngTool` 整個專案資料夾。Vercel 要看到根目錄有 `index.html`。

**Q: /api/upload 回傳 500？**
A: 99% 是環境變數沒設好，或重新部署後才生效。到 Vercel Logs 看詳細錯誤。

**Q: 上傳成功但 Meme 頁看不到圖片？**
A: 正常！因為新上傳的圖片 `approved = false`。去 Supabase Table Editor 把它改成 true 就會出現。

**Q: 我的 service_role key 外洩了怎麼辦？**
A: 立刻到 Supabase Dashboard → Settings → API → 點 service_role key 旁邊的「Reset」。舊 key 會立刻失效，新 key 要更新到 Vercel 環境變數。
