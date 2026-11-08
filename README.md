<img src="icon/128x128.png" alt="蛋殼喵" height="80" align="left" style="margin-right:12px">
<img src="icon/logo-txt-w.png" alt="蛋殼喵 APNG 工具" height="80" align="left">

<br clear="left">

# 蛋殼喵 APNG 工具 (EggshellCat APNG Tool)

純前端、隱私優先的 APNG 動畫工具。
把一序列 PNG / APNG / GIF 打包成動畫 PNG（APNG）或 GIF，**所有處理都在你瀏覽器本機完成，圖片不上傳伺服器**。

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
- 🎬 **雙格式輸出** — 同時生成 APNG 與 GIF，任選下載
- ⚠️ **LINE 貼圖提示** — 生成後自動檢查 6 項 LINE 動態貼圖規範
- 🐱 **Meme 表情包** — 內建蛋殼喵 APNG，點擊重播，可排序
- 📑 **分頁記憶** — 重新整理後記住目前頁面
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
6. 點「✨ 生成動畫」→ 下載 APNG 或 GIF

---

## ⚠️ LINE 動態貼圖規範提示

生成完動畫後，工具會自動檢查以下 6 項 LINE 規範，不符合的會顯示黃色警告列：

1. 動畫播放時間必須是整數秒（1、2、3、4 秒）
2. 動畫播放時間不可超過 4 秒
3. 圖片尺寸：寬或高其中一邊必須為 270px
4. 影格數量限制為 5～20 格
5. 重複播放次數：1～4 次（不可無限循環）
6. 每張圖片檔案大小須小於 1MB

---

## 📑 頁面說明

| 頁籤 | 功能 |
|---|---|
| **生成** | 拖 PNG → 設定參數 → 輸出 APNG / GIF |
| **拆圖** | 把 APNG / GIF 拆回單張 PNG |
| **PNG** | 貼圖製作：吸取顏色去背、橡皮擦、縮放平移 |
| **Meme** | 蛋殼喵表情包展示，點擊重播，可排序 |
| **Emoji 字型** | 258 個貓咪 CSS 向量圖示，點擊複製 class |
| **Help** | 使用說明 |
| **關於** | 修改記錄 |

---

## 🛠️ 技術棧

| 技術 | 用途 |
|---|---|
| [UPNG.js](https://github.com/photopea/UPNG.js) | APNG 編碼 / 解碼核心 |
| [pako](https://github.com/nodeca/pako) | DEFLATE 壓縮 |
| [omggif](https://github.com/deanm/omggif) | GIF 解碼 |
| [gif.js](https://jnordberg.github.io/gif.js/) | GIF 背景編碼 |
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
│   ├── gif.worker.js  ← 
│   └── i18n.js        ← 多國語言包
├── webfonts/
│   ├── EggshellCat.fcp  ← 原始檔案
│   ├── EggshellCat.ttf  ← 彩色 ttf 字型
│   ├── EggshellCat.woff  ← 彩色 woff 字型
│   ├── EggshellCat.woff2  ← 彩色 woff2 字型
│   ├── EggshellCatEmoji.html  ← 預覽html
│   └── font.css  ← 預覽html用的css文件
├── sample/            ← Meme 圖片範本
│   ├── list.json      ← 圖片索引
│   └── *.png / *.gif
├── images/            ← 圖片
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

### Meme 圖片管理
- 圖片放在 `sample/` 資料夾
- 索引寫在 `sample/list.json`
- 新增圖片只要丟檔 + 改 JSON，不用動 HTML
- 以後可改為從 Supabase 等遠端儲存讀取

---

## 📜 授權

MIT License — 自由使用、修改、散佈。

---

## 💕 關於作者

蛋殼喵工作室 (EggshellCat Studio)

---

## 📝 更新紀錄

### 2026-11-08
- 新增「PNG 貼圖製作」頁面：拖曳上傳 JPG / PNG / GIF / WEBP，本機處理
- 吸取顏色功能：點擊圖片顏色，flood fill 刪除連通區域
- 全域顏色刪除：一次刪除所有相近色像素
- 橡皮擦工具：可調大小，自由塗抹去背
- 工具列：放大 / 縮小 / 撤銷（最多 20 步）/ 還原（回到原圖）
- 滑鼠拖曳平移圖片，放大後可看局部細節
- 即時顏色預覽：滑鼠移動時顯示當下 RGB
- 容許度滑桿：控制顏色相近程度
- 新圖片載入時自動歸一縮放與平移

### 2026-11-07
- 加入 GIF 輸出功能，同時生成 APNG 與 GIF 雙格式下載
- 加入 LINE 動態貼圖 6 項規範檢查，生成後顯示黃色警告
- Meme 頁面改為動態載入 `sample/list.json`，支援排序、點擊重播
- 分頁切換後重新整理（F5）仍保留在目前頁面
- 移除 Meme 圖片 caption 的 i18n 綁定，直接顯示 label
- Help 說明更新為「下載 APNG 或 GIF」

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
