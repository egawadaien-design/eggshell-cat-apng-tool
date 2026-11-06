<img src="icon/128x128.png" alt="蛋殼喵" height="80" align="left" style="margin-right:12px">
<img src="icon/logo-txt-w.png" alt="蛋殼喵 APNG 工具" height="80" align="left">

<br clear="left">

# 蛋殼喵 APNG 工具 (EggshellCat APNG Tool)

純前端、隱私優先的 APNG 動畫工具。
把一序列 PNG / APNG / GIF 打包成動畫 PNG（APNG），**所有處理都在你瀏覽器本機完成，圖片不上傳伺服器**。

---

## ✨ 功能特色

- 🌐 **多國語言** — 繁中 / 簡中 / English / 日本語 / ไทย，自動跟隨瀏覽器
- 🔒 **純本機處理** — 圖片不上傳，敏感素材也能安心用
- 📥 **匯入 APNG / GIF** — 直接拖入現有 APNG 或 GIF，自動拆解成影格並還原每格時間
- 🎞️ **每格獨立延遲** — 在縮圖卡片上直接輸入毫秒數，即時生效
- 🔁 **真實循環次數** — 直接修改 APNG 的 `acTL` chunk，外部播放器會正確播放
- 📐 **等比縮放** — 設寬度自動算高度，反之亦然
- 🎨 **可選色彩深度** — 全彩 24bit / 256 色 / 128 色
- 🖼️ **即時預覽** — 播放控制列 + 時間軸，CSS 向量圖標
- 🔀 **排序功能** — 依檔名、修改時間排序影格
- 🗑️ **影格管理** — 每格可刪除、前後移動、到最前/最後
- 📱 **RWD** — 手機小螢幕也能用

---

## 🚀 怎麼使用

打開 [apng-murex.vercel.app](https://apng-murex.vercel.app/) 即可使用，不需要安裝任何東西。

### 操作步驟
1. 把 PNG / APNG / GIF 拖曳到虛線框（可多選）
2. 在縮圖卡片上直接調整每格的延遲毫秒
3. 用卡片下方的 ⏮ ◀ ▶ ⏭ 按鈕調整影格順序，✕ 刪除不需要的格
4. 設定循環次數（0 = 無限）與色彩深度
5. 需要縮放才填輸出寬高，留空 = 原圖大小
6. 點「✨ 生成 APNG」→ 下載 PNG

---

## 🛠️ 技術棧

| 技術 | 用途 |
|---|---|
| [UPNG.js](https://github.com/photopea/UPNG.js) | APNG 編碼 / 解碼核心 |
| [pako](https://github.com/nodeca/pako) | DEFLATE 壓縮 |
| [omggif](https://github.com/deanm/omggif) | GIF 解碼 |
| [marked.js](https://marked.js.org/) | README Markdown 渲染 |
| Canvas API | 圖片縮放、像素讀取、影格合成 |
| 純 HTML/CSS/JS | 無框架、無建置流程 |

---

## 📁 專案結構

```
static/
├── index.html         ← 主頁面（多 tab）
├── README.md
├── css/
│   └── apng.css       ← 樣式
├── js/
│   ├── apng.js        ← 工具邏輯
│   └── i18n.js        ← 多國語言包
└── icon/              ← 圖示檔
```

---

## 🔧 進階功能

### 真實循環次數
UPNG.js 本身不支援 loops 參數，本工具會在編碼後直接修改 APNG 檔案的 `acTL` chunk，把 `num_plays` 欄位改成你指定的次數，並重算 CRC。

### 匯入 APNG
拖入現有 APNG 檔案，工具會自動讀取每個 `fcTL` chunk 的延遲時間，拆解成獨立影格。

### 匯入 GIF
用 omggif 解碼 GIF，正確處理 partial update 和 disposal，每格時間從 Graphic Control Extension 讀取。

---

## 📜 授權

MIT License — 自由使用、修改、散佈。

---

## 💕 關於作者

蛋殼喵工作室 (EggshellCat Studio)

---

## 📝 更新紀錄

### 2026-11-06
- 加入泰文（ไทย）語言，支援 5 國語言：繁中 / 簡中 / EN / 日本語 / ไทย
- 下載檔名改為隨機字串 `eggshell-XXXXXX.png`，避免每次同名
- 播放控制列右側改顯示 FPS 與單次循環總時間
- 修正 GIF 解碼 partial update 導致的斑點雜色（改為累積 canvas + disposal 處理）
- 修正 APNG 匯入時 fcTL delay_den=0 的解析（依規範視為 100）
- 拖入不支援的檔案會顯示警告訊息，不會靜默吞掉
- 內建蛋殼喵 Emoji 字型（258 格，PUA-A U+F0000 ~ U+F0101）
- i18n 字串支援嵌入 HTML，狀態列可顯示貓咪 emoji
- 語言下拉改為自訂選單（原生 select 不支援嵌入 emoji）

### 2026-11-05
- 加入多國語言切換（繁中 / 簡中 / EN / 日本語），自動跟隨瀏覽器
- 介面改為多 tab：APNG工具 / README / HELP / SRC
- README tab 改用 marked.js 動態渲染 markdown
- 主頁面改為 `index.html`，新增 `js/i18n.js`
- CSS 向量播放控制列、影格卡片排序與刪除功能
- 修正 favicon 路徑為相對路徑

---


