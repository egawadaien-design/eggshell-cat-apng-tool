<img src="icon/128x128.png" alt="蛋殼喵" height="80" align="left" style="margin-right:12px">
<img src="icon/logo-txt-w.png" alt="蛋殼喵 APNG 工具" height="80" align="left">

<br clear="left">

# 蛋殼喵 APNG 工具 (EggshellCat APNG Tool)

純前端、隱私優先的 APNG 動畫工具。
把一序列 PNG / APNG / GIF 打包成動畫 PNG（APNG）或 GIF，**所有處理都在你瀏覽器本機完成，圖片不上傳伺服器**。

---

## ✨ 功能特色

- 🌐 **多國語言** — 繁中 / 簡中 / English / 日本語 / ไทย（泰語！不要懷疑，是AI幫忙翻譯的），自動跟隨瀏覽器
- 🔒 **純本機處理** — 圖片不上傳，敏感素材也能安心用
- 📥 **匯入 APNG / GIF** — 直接拖入現有 APNG 或 GIF，自動拆解成影格並還原每格時間
- ✨ **動畫特效頁（FX）** — 34 種內建動畫特效（斜光掃過、震動、旋轉、溶解、RGB 故障、老電視、萬花筒、漫畫線稿…），單張圖片一鍵生出一整組影格；調整特效、強度與格數後，整組影格一鍵送進「生成」頁接續編輯
- 🎚️ **每個特效都有專屬設定** — 選到哪支特效，右側「特效設定」就換成它專屬的滑桿或下拉：光掃有角度與光帶寬度、RGB 故障有撕裂頻率、萬花筒有切片數、漫畫效果有精細度與墨色…34 支各自一組，換別支再換回來，先前調好的值還留著
- 🟩 **綠色原圖外框** — APNG / FX / PNG 三個工作框都會用綠色虛線標出「你匯入的圖片實際佔多大一塊」；三頁都是棋盤格背景，有框才分得出圖片邊界。APNG 頁的框固定以**第一張圖的尺寸**為基準，切換到別格時框不會跟著變，所以看得出每格比第一張大多少、被 frame-offset 位移了多少
- 🎞️ **每格獨立延遲** — 在縮圖卡片上直接輸入毫秒數，即時生效
- 🎯 **獨立影格設置** — 點哪一格就調哪一格：卡片下方的十字鍵把該格往上／下／左／右各移 2px（可連按累積），中間那顆鈕一鍵還原成剛載入的樣子，右側也能直接輸入 X / Y 偏移量
- 🔤 **文字疊加** — APNG / FX / PNG 三頁都有同一套文字面板：打上字就能疊在畫面上，可選字體（還能讀取本機字體）、字級、顏色、粗斜體底線、外框、陰影，十字鍵微調位置；字級與偏移全存百分比，換輸出尺寸比例不變
- 🎚️ **文字顯示格範圍 + 淡入淡出** — 指定文字只出現在第幾格到第幾格（預設第一格到最後一格），勾了「淡入淡出」字會在段首淡入、段尾淡出
- 🖨️ **本機字體** — 「字型」旁邊按一下「讀取本機字體」向瀏覽器要授權，把系統字體清單塞進下拉選單（Chrome / Edge 103+，需 HTTPS 或 localhost）
- 📄 **複製影格** — 卡片導航列中間的複製鈕，在該格後面插入一格內容相同的影格（延遲一併沿用）
- 🔁 **真實循環次數** — 直接修改 APNG 的 `acTL` chunk，外部播放器會正確播放
- 📐 **等比縮放** — 設寬度自動算高度，反之亦然
- 🎨 **可選色彩深度** — 全彩 24bit / 256 色 / 128 色
- 🖼️ **即時預覽** — 播放控制列 + 時間軸，CSS 向量圖標
- 🎬 **雙格式輸出** — 同時生成 APNG 與 GIF，任選下載
- ⚠️ **LINE 貼圖提示** — 生成後自動檢查 6 項 LINE 動態貼圖規範
- 🐱 **Meme 表情包** — 內建蛋殼喵 APNG，點擊重播，可排序
- 🖼️ **PNG 靜態貼圖製作** — 上傳 JPG/PNG/GIF/WEBP，吸取顏色一鍵去背（flood fill）、全域刪除指定顏色、橡皮擦自由修邊
- 😺 **自製 Emoji 圖標** — 258 格蛋殼喵 CSS 向量圖示，純 class 複製貼上就能用
- 📤 **一鍵分享** — 生成後可將你的 APNG 上傳到公開 Meme 展示牆（Supabase 儲存）；分享按鈕只在白名單網域出現（`js/supabase-config.js` 的 `shareHosts`）
- 📑 **分頁記憶** — 重新整理後記住目前頁面
- 📱 **RWD** — 手機小螢幕也能用

---

## 🚀 怎麼使用

打開 [apng-murex.vercel.app](https://apng-murex.vercel.app/)（Vercel）或 [apng.top](https://apng.top/)（EdgeOne Pages）即可使用，不需要安裝任何東西。

兩站前端檔案完全相同，差別只在 `/api/upload` 由所在平台的函數處理（`api/upload.js` / `node-functions/api/upload.js`）。

### 操作步驟
1. 把 PNG / APNG / GIF 拖曳到虛線框（可多選）
2. 在縮圖卡片上直接調整每格的延遲毫秒
3. 用卡片下方的 ⏮ ◀ ▶ ⏭ 按鈕調整影格順序、中間的複製鈕插入同內容的一格，✕ 刪除不需要的格
4. 點某張卡片選取該格，用下方「獨立影格設置」的十字鍵做上下左右 2px 微調（中間鈕 = 還原成載入時的樣子，右側可直接輸入 X / Y 偏移量）
5. 設定循環次數（0 = 無限）與色彩深度
6. 需要縮放才填輸出寬高，留空 = 原圖大小
7. 要加文字就打開「文字」面板打字，挑字體、字級、顏色，需要就勾外框／陰影；「起始格 / 結束格」限制它出現在哪幾格，勾「淡入淡出」讓兩端淡掉
8. 點「✨ 生成動畫」→ 下載 APNG 或 GIF

### FX 頁（想先套特效再編輯時走這條）
1. 切到上方 Tab 的「FX」
2. 把一張圖片拖進虛線框（或點一下選檔）
3. 在右側清單挑一種特效（共 34 種，清單可上下滑動），再用滑桿調整強度與影格數；清單下方「特效設定」會換成這支特效專屬的參數
4. 畫面上會即時循環預覽，圓點列可以點任一格單獨查看
5. 滿意後按「送出到 APNG 頁」——原本的影格會被這組新影格取代
6. 工具自動切回「生成」頁，接著照上面的步驟 2～8 調整延遲、順序、位移、循環次數、尺寸並輸出

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

## 自製 Emoji 圖標

258（會越來越多吧）格蛋殼喵 CSS 向量圖示

緣由：
1. 純 class 複製貼上就能用
2. 這個CSS抄那個UI也忘記了，只是它很多ICON我用不上，所以自己做了一個
3. 原始文件放在 webfonts/EggshellCat.fcp
4. 有興趣自己改，自己加
5. 沒有宣告版權，似乎可以考慮獨立一個專案分享出去（圖案太少，沒人要吧）
6. 目前只有 EggshellCat.ttf / EggshellCat.woff 沒有 woff2（我的軟件是舊版的，沒買新的~沒錢，反正檔案不大）

---

## 📑 頁面說明

上方 Tab 列四個（APNG / FX / PNG / Meme）；Help、Emoji 字型、README、原始碼由頁尾按鈕進入。

| 頁籤 | 進入方式 | 功能 |
|---|---|---|
| **生成**（`tab-app`） | 上方 Tab | 拖 PNG/APNG/GIF → 設定參數 → 輸出 APNG / GIF；拖入 APNG / GIF 會自動拆成影格；卡片可調延遲、換順序、複製、刪除，下方「獨立影格設置」面板可對單一格做 2px 位移或輸入 X / Y 偏移量；右側「文字」面板可疊字（字體／字級／顏色／外框／陰影／顯示格範圍／淡入淡出） |
| **FX**（`tab-fx`） | 上方 Tab（排在生成之後） | 動畫特效：34 種特效、強度與格數滑桿、即時預覽；選到哪支特效，右側「特效設定」就換成它專屬的參數（滑桿或下拉）；確定後把整組影格送到「生成」頁（取代原有影格）；右側同樣有「文字」面板，文字直接燒進每一格 |
| **PNG**（`tab-png`） | 上方 Tab | 靜態貼圖製作：吸取顏色去背、全域刪除指定顏色、橡皮擦、縮放平移、分割、240×240 與 96×74 輸出；右側「文字」面板可疊字，按「確認圖片」時才燒進輸出 |
| **Meme**（`tab-meme`） | 上方 Tab | 蛋殼喵表情包展示牆，從 Supabase 動態載入，點擊重播 |
| **Help**（`tab-help`） | 頁尾按鈕 | 使用說明與常見問題 |
| **Emoji 字型**（`tab-emoji`） | 頁尾按鈕 | 258 個貓咪 CSS 向量圖示，點擊複製 class |
| **README**（`tab-readme`） | 頁尾按鈕 | 用 marked.js 直接渲染本文件 |
| **原始碼**（`tab-src`） | 頁尾按鈕 | GitHub 專案連結 |

> 註 1：原本的「拆圖」頁籤已移除，拆格功能改在「生成」頁拖入 APNG / GIF 時自動完成。

---

## 🛠️ 技術棧

| 技術 | 用途 |
|---|---|
| [UPNG.js](https://github.com/photopea/UPNG.js) | APNG 編碼 / 解碼核心 |
| [pako](https://github.com/nodeca/pako) | DEFLATE 壓縮 |
| [omggif](https://github.com/deanm/omggif) | GIF 解碼 |
| [gif.js](https://jnordberg.github.io/gif.js/) | GIF 背景編碼 |
| [marked.js](https://marked.js.org/) | README Markdown 渲染 |
| [Supabase JS](https://supabase.com/) | Meme 展示牆：Storage 存圖 + Postgres 存 metadata |
| Vercel Serverless Function | 主站 `/api/upload` 代理寫入，保護 service_role key 不暴露在前端 |
| EdgeOne Pages Node Function | 分站 `/api/upload`，同一支前端不改一行即可運作；額外有 base64 大小預檢、PNG magic number、簡易限流 |
| Canvas API | 圖片縮放、像素讀取、影格合成、單格位移烘焙、去背 flood fill、FX 頁 34 種特效繪製 |
| Local Font Access API | 「讀取本機字體」：`queryLocalFonts()` 徵求授權後列出系統字體家族（Chrome / Edge 103+，需 HTTPS 或 localhost） |
| 純 HTML/CSS/JS | 無框架、無建置流程 |

---

## 📁 專案結構

```
static/
├── index.html              ← 主頁面（多 tab SPA）
├── README.md
├── LICENSE                 ← MIT
├── vercel.json             ← Vercel 部署設定
├── robots.txt
├── sitemap.xml
├── Supabase 設置說明.md
├── Vercel 設置說明.md
├── api/
│   ├── upload.js           ← Vercel Serverless Function：代理 Supabase 上傳（主站）
│   └── README.md           ← Vercel 版 API 說明（端點契約、錯誤碼、環境變數）
├── node-functions/
│   └── api/
│       ├── upload.js       ← EdgeOne Pages Node Function：同一支 API 的分站版本
│       └── README.md       ← EdgeOne 版 API 說明（含三項額外防護）
├── css/
│   └── apng.css            ← 全站樣式
├── js/
│   ├── i18n.js             ← 5 國語言包（繁/簡/EN/JA/TH）
│   ├── media-utils.js      ← 共用小工具：replayImg()（點一下讓 GIF / APNG 從第一格重播）
│   ├── share.js            ← 分享 Modal 與上傳流程
│   ├── meme.js             ← Meme 展示牆載入（Supabase）
│   ├── app-shell.js        ← 頁籤切換 / Emoji 字牆 / README 載入 / 訪客追蹤 / Meme 舊版解析
│   ├── apng-frames.js      ← 影格管理：檔案匯入、APNG/GIF 拆格、排序、時間軸與卡片渲染、播放控制
│   ├── frame-offset.js     ← 獨立影格設置：單格上下左右 2px 位移、偏移量輸入、單格還原初始狀態
│   ├── source-frame.js     ← 三個工作框的綠色原圖外框（APNG 以第一張圖尺寸為基準，FX / PNG 貼齊畫布）
│   ├── text-overlay.js     ← 文字疊加：APNG / FX / PNG 三頁共用同一套文字面板（字體、字級、顏色、外框、陰影、顯示格範圍、淡入淡出）
│   ├── apng-encoder.js     ← 編碼輸出：CRC32、acTL 循環次數、UPNG 編碼、GIF 生成、LINE 規範警告
│   ├── png-editor.js       ← PNG 靜態貼圖：去背、橡皮擦、縮放平移、分割線、240×240 與 96×74 輸出
│   ├── fx.js               ← FX 特效頁：34 種特效配方（各自帶 params）、參數預覽、影格送出（交接給 apng-frames.js）
│   ├── supabase-config.js  ← Supabase URL / anon key / bucket 設定
│   └── gif.worker.js       ← GIF.js 背景編碼 worker
├── en/ ja/ th/ zh/
│   └── index.html          ← 各語言 thin page（SEO 用）
├── webfonts/
│   ├── EggshellCat.fcp     ← FontCore 原始檔
│   ├── EggshellCat.ttf    ← 彩色 ttf 字型
│   ├── EggshellCat.woff   ← 彩色 woff 字型
│   ├── EggshellCatEmoji.html  ← Emoji 預覽頁
│   └── font.css           ← Emoji class 定義
├── images/                 ← 網站圖片資產
└── icon/                   ← favicon / logo / 各尺寸圖示
```

> **`js/` 載入順序（傳統 script，載入順序＝執行順序，不可任意調換）**
> `i18n.js → supabase-config.js → media-utils.js → share.js → meme.js → app-shell.js → source-frame.js → text-overlay.js → apng-frames.js → frame-offset.js → apng-encoder.js → png-editor.js → fx.js`
> `apng-frames.js` 負責宣告全域 DOM 節點與影格狀態（`files` / `frameDelays` 等），必須排在 `apng-encoder.js`、`png-editor.js`、`fx.js` 之前，否則會踩 TDZ。
> `text-overlay.js` 只宣告 `window.TextOverlay`，排在 `apng-frames.js` 之前，因為 APNG 預覽要呼叫它的 `paintOverlay()`。
> `fx.js` 排最後：它要呼叫 `apng-frames.js` 的 `clearAll()` / `addFiles()` 與 `app-shell.js` 的 `switchTab()`，這些函式必須先宣告完成。
> 專案根目錄另有 `_backup/`（原 `apng.js` 的完整備份-最早寫出來的那個），不在 `static/` 內，不會被上傳或部署。

---

## 🔧 進階功能

### 真實循環次數
UPNG.js 本身不支援 loops 參數，本工具會在編碼後直接修改 APNG 檔案的 `acTL` chunk，把 `num_plays` 欄位改成你指定的次數，並重算 CRC。

### 匯入 APNG
拖入現有 APNG 檔案，工具會自動讀取每個 `fcTL` chunk 的延遲時間，拆解成獨立影格。

### 匯入 GIF
用 omggif 解碼 GIF，正確處理 partial update 和 disposal，每格時間從 Graphic Control Extension 讀取。

### FX 動畫特效（`js/fx.js`）
FX 頁只做「選特效 → 調參數 → 預覽 → 送出」，編輯一律交給「生成」頁，不另外長一套編輯器。

- **各種特效**：全部走同一條管線，每支都是 Canvas 2D 配方 `draw(ctx, p, k, i, o)`
  - `p` = 播放進度（0～1，決定動畫落在時間軸的哪個位置）
  - `k` = 強度（滑桿 0～100%）
  - `i` = 影格序號，當穩定隨機種子用；不然 Sparkle / Shake / Matrix Rain / Old TV / RGB Glitch 每格都會亂跳
  - `o` = 這支特效自己的參數物件（沒有宣告參數時是空物件，舊配方只收前四個參數也照樣能跑）
- **固定規格**（刻意不開放使用者調整，避免送出後還要再對一次）
  - 每格延遲固定 **100ms**，送出時會再覆寫一次 `frameDelays`，防止被「生成」頁的預設值補成別的數字
  - 輸出最長邊 **≤ 512px**，等比縮小、不放大
  - 影格數 **5 ～ 40 格**（預設 20）
- **送出＝取代**：已有舊影格時先 `confirm`，確認後 `clearAll()` → `addFiles()` → `switchTab('tab-app')`，檔名從 `fx-001.png` 起算
- **生成分批非同步**：每 4 格讓出一次主執行緒，各個特效 × 40 格在一般桌機應該不會卡住介面
- **來源圖**：任何 `image/*` 都能用；GIF 只取第一格靜圖（FX 是「一張圖 → 一組影格」，不繼承原 GIF 的動畫）
- **和 LINE 規範的關係**：FX 頁可以做到 40 格，但 LINE 動態貼圖上限是 20 格；送進「生成」頁後黃色警告列會提示，要上架記得自己降到 20 格以內

#### 特效設定（每支特效自己的參數）
- 參數**宣告在配方本身**（`recipe.params`），選哪支就渲染哪組 UI，不必另外維護一份對照表；
- 型別判斷：預設值是數字 → 滑桿 `input[type=range]`；`type: 'select'` → 下拉選單（選項文字也走 i18n，值可以是數字或字串）
- 值存在 `paramStore[特效 id]`，切換特效再切回來不會被洗掉
- 沒有宣告參數的特效會顯示一行「這個特效沒有額外設定」，而不是整格消失
- 「特效設定」標題在選到有參數的特效時會接上它的名字（例「特效設定 Shine Sweep」），名字是獨立的 `span.fx-param-name`（12px 淡色，當副標不搶 20px 粉紅主標）；標題節點刻意不掛 `data-i18n`，切換語言時由 `fxRenderParams()` 重畫
- 滑桿數值顯示：`step < 1` 的參數（流速 0.3～2、旋轉圈數 0.2 這類）保留到小數第二位，不會被四捨五入成 0 讓使用者以為拉了沒反應
- 清單高度固定露出 8 個（項目 34px、間距 6px、`max-height: 318px`），把空間讓給下面的「特效設定／輸出設定」

#### 狀態列的語言同步
- 狀態文字改成「記 key」（`setStatusKey(key, vars)`）：狀態訊息是程式寫進去的、不在 `data-i18n` 掃描範圍，舊做法會永遠停在載入時那個語言
- 切語言時 `applyLang()` 呼叫 `window.fxRefreshLangTexts()`，把狀態列、沒有圖時的預覽提示、影格位置文字（第 i／n 格）一起重翻

### 原圖外框（`js/source-frame.js`）
三個工作框（APNG / FX / PNG）的預覽舞台都是棋盤格背景，圖片放進去後看不出邊界，所以統一用綠色虛線標出來。

- **框是 DOM 疊層**（`position:absolute` + `pointer-events:none`），不是畫進 canvas：縮放、平移時線寬固定 2px，也不會攔截吸取顏色、橡皮擦、拖曳平移
- **APNG 用 `aroundFirstSize()`**：框＝第一張圖的原始尺寸 × 目前顯示比例，並以每格圖片的中心置中。切到別格時框不動，所以圖片貼齊框＝與第一張等大、超出框＝比第一張大，染色位移（`frame-offset.js` 的 dx / dy）也能一眼看出
- **FX / PNG 用 `aroundTarget()`**：框＝那個 canvas 的可視矩形。PNG 頁的縮放平移是 CSS `transform`，`getBoundingClientRect()` 拿到的已經是最終位置，不必自己算
- **重算時機**：圖片載入完成、切換影格、縮放／平移、視窗尺寸改變；影格清空或圖片移除時自動收起
- **已知小落差**：PNG 頁的 canvas 有 `transform 0.15s` 過渡，框是即時更新，按放大／縮小的一瞬間框會比圖快一步到位（150ms 後就重合）

### 獨立影格設置（`js/frame-offset.js`）
「生成」頁影格卡下方那塊十字鍵面板，只作用在**目前選取的那一格**，能動的範圍刻意收得很窄：只做位置微調，不改圖片內容。

- **每格留一份原始檔**：每個影格都保留使用者載入時的那份 `File`，位移量另外記成 `dx` / `dy`。
  若改成「每按一次就往目前的圖再移 2px」，位移會烙進像素，中間那顆「還原」就沒有東西可以還原了。
- **位移怎麼生效**：套用時從原始圖重畫一次（`ctx.drawImage(bitmap, dx, dy)`），把結果烘焙成新的 `File` 取代 `files[i]`，
  所以 `apng-encoder.js` 一行都不用改。畫布尺寸維持不變，移出邊界處被裁掉、露出來的地方保持透明，
  每格尺寸仍一致，不會觸發 encoder 的 `sizeMismatch` 檢查。
- **還原**：`dx` / `dy` 歸零時直接換回原始檔，不重新編碼（省一次畫質損失，也比較快）。
- **記錄用 `WeakMap`**：以 `File` 物件本身當 key，影格交換／移動／刪除都不必另外同步；舊 `File` 被丟掉時記錄也一起被回收。
- **連按不打架**：每次套用取一個 `token`，非同步解碼回來若已被超過就作廢，避免舊結果蓋掉新結果。
- **與其他功能的接縫**（都用 `typeof` 判斷，這支沒載入也不影響 APNG 頁）：
  - `showFrame()` → 換格時同步面板顯示（格號 / 檔名 / 延遲 / X,Y）
  - `deleteFrame()` 刪到空清單 → 面板收起（這條路不會經過 `showFrame`）
  - `duplicateFrame()` → 副本繼承同一份原始圖與位移量，否則副本按「還原」會還原成位移後的樣子
- **延遲顯示用捕獲階段監聽**：卡片上的延遲輸入自己會 `stopPropagation()`，掛冒泡根本收不到，所以監聽加上第三個參數 `true`。
- **位移上限**：輸入框夾在 ±999，避免手誤打進誇張數字讓整張圖移出畫布。

### 文字疊加（`js/text-overlay.js`）
APNG / FX / PNG 三頁共用同一支面板與同一份繪製程式，但**每一頁各自一份狀態**（`app` / `fx` / `png` 三個實例），
在 APNG 頁打好的字不會動到 FX 頁已經調好的樣式。

- **尺寸全部存百分比**：字級是「短邊的百分比」（預設 12%）、X / Y 偏移是寬高的百分比、外框寬與陰影大小是字級的百分比。
  所以同一組設定放在 512 的 FX 預覽、自訂尺寸的 APNG、240×240 與 96×74 的貼圖上，比例都一致，換尺寸不必重調。
  實際像素值要等 `render()` 拿到 `W` / `H` 才換算（`Math.min(W, H)` 當基準）。
- **面板 DOM 由程式組出來**：`panelHtml()` 負責生版面，`index.html` 只留 `#textHostApp` / `#textHostFx` / `#textHostPng` 三個掛載點，要改版面改一支 JS 就好。
- **預覽看得見 ≠ 已經燒進去**
  - APNG 頁：透明 canvas 疊在 `.preview-stage` 上（`.tp-overlay`），拖時間軸時跟著目前那一格重畫，只是給眼睛看；真正燒字在 `apng-encoder.js` 每格 `drawImage` 之後跑
  - FX 頁：直接燒進每一格，所見即所送
  - PNG 頁：預覽疊層跟 `applyTransform()` 一起重畫，按「確認圖片」時才把文字燒進 240×240 與 96×74 兩張輸出 —— 只打字不按確認，下載的圖不會有字
- **字體只用系統字型**（細明體 / 微軟正黑體 / 蘋方 / Noto Sans TC / 標楷體 / serif / sans），不內嵌字型檔，避免字型授權問題

#### 顯示格範圍與淡入淡出
- 面板在 X / Y 偏移後面多加了「起始格 / 結束格」，決定文字只在第幾格到第幾格出現；**結束格填 0 代表一路到最後一格**，所以預設狀態就是「第一格 → 最後一格」
- 判斷寫在 `visibleAt(st, index, total)`：APNG 預覽依目前格號、`apng-encoder.js` 依迴圈的格號、FX 依產格序號；PNG 只有一張圖，`mount()` 傳 `singleFrame: true` 把整組格號區塊（連同淡入淡出）藏起來
- 結束格填得比總格數大時以總格數為準，所以刪影格刪到比設定少也不會整段不見
- 勾「淡入淡出」後由 `frameAlpha()` 依格號算透明度：淡入淡出長度取整段的三分之一（最少 1 格、最多 5 格），首格從 `1/(len+1)` 起算、尾格對稱淡出；段落短於 3 格就不淡，免得字一直停在半透明像壞掉
  以 10 格、設 2～9 為例 → `0.25 / 0.50 / 0.75 / 1.00 / 1.00 / 0.75 / 0.50 / 0.25`
- 透明度用 `ctx.save()` 之後的 `ctx.globalAlpha` 設定，`restore()` 會還原，不會污染編碼流程裡同一顆 context 的下一格

#### 讀取本機字體
- 「字型」旁邊那顆鈕走 Local Font Access API：`queryLocalFonts()` 會跳瀏覽器授權，按允許後把家族清單塞進下拉
- 只有 Chrome / Edge 103+ 支援，而且要 HTTPS 或 localhost；Firefox / Safari 沒有這支 API，`mount()` 時直接把按鈕藏起來，不留一顆按了沒反應的鈕（只留一江春水向東流...）
- 清單用模組級快取（`localFamilies`），三頁共用一份，整個工作階段只跳一次授權
- 與內建七種重複的家族（`PMingLiU` / `Microsoft JhengHei` / `DFKai-SB` …）會被 `BASE_FAMILY_SET` 過濾掉，選單不會出現兩個一樣的名字
- 選到的本機字體存成 `local:家族名`，`fontCss()` 認前綴輸出 `"家族名", serif`；讀完按鈕自動收起

### Meme 圖片管理
- 展示牆從 Supabase 讀取已審核（`approved=true`）的圖片，每次載入 6 筆，支援分頁載入更多
- 圖片存放在 Supabase Storage bucket，metadata 寫在 `apng_images` 表
- 使用者生成 APNG 後點「分享我的圖片」即可一鍵上傳（預設 `approved=false`，需後台審核才會顯示）
- 呦~原來有後台啊！ 不... 完全沒有...（自己看數據庫，拿命令改一下就好了）

---

## 📜 授權

MIT License — 自由使用、修改、散佈。

---

## 💕 關於作者

蛋殼喵DaiEn (EggshellCat DaiEn)

---

## 📝 更新紀錄

### 2026-11-13
- README 更新
- 新增「文字」面板（`js/text-overlay.js`）：APNG / FX / PNG 三頁各掛一次，共用同一份繪製程式、各自一份 state
  - 面板：多行輸入框、十字鍵（上／下／左／右各 2%、中間鈕回正中）、字體下拉、粗體 / 斜體 / 下底線、字級、字色、外框（開關＋寬度＋顏色）、陰影（開關＋大小＋顏色）
  - APNG 頁用透明 canvas 疊在預覽舞台上，編碼時逐格燒字；FX 頁直接燒進每一格；PNG 頁按「確認圖片」才燒進 240×240 與 96×74 輸出
- 「圖片偏移」面板加上眼睛隱藏鈕（`#foHideBtn`），收合狀態記在 `localStorage` 的 `apng-fo-hidden`
- 影格「排序列」最右邊的兩顆鈕（隱藏縮圖 / 顯示獨立影格設置）收進 `.sort-bar-right`，不再被擠成第二列
- 隱藏影格縮圖（`#frameGridToggle`）時連五顆排序鈕（排序順序 / 檔名遞增 / 檔名遞減 / 最新在上 / 最早在上）一起收起來（`.sort-bar.grid-collapsed`）；這條由上方那顆隱藏鈕控制，不是綠色隱藏鈕
- 字體下拉旁新增「讀取本機字體」鈕（Local Font Access），讀回來的家族以 `local:` 前綴存進 `state.font`；不支援的瀏覽器整顆隱藏
- 新增「顯示格範圍」：X / Y 偏移後面兩個輸入框（起始格 / 結束格，結束格 0 = 到最後一格），`visibleAt()` 決定這一格要不要畫字；三頁呼叫端都帶上格號，PNG 頁整組隱藏
- 新增「淡入淡出」勾選：`frameAlpha()` 依格號算 `globalAlpha`，段落 1／3 當淡入淡出長度（1～5 格），少於 3 格不淡；實測 10 格設 2～9 → `0.25 / 0.50 / 0.75 / 1.00 / 1.00 / 0.75 / 0.50 / 0.25`
- `js/i18n.js` 五語系補上文字面板字串（`textTitle` / `tp*` / `textFont*` / `tpLoadFonts` / `tpFrom` / `tpTo` / `tpFade` 等）
- `css/apng.css` 新增 `.text-panel` / `.tp-*` / `.tp-overlay` / `.tp-frames` / `.tp-check` / `.fo-hide-btn` / `.sort-bar-right` / `.sort-bar.grid-collapsed`
- 驗證：node 直接執行 `FX_RECIPES` 陣列，特效 × 40 格 0 錯誤、每支再用預設參數跑一輪 0 錯誤；橫向／縱向切條數、撕裂開與關的 `drawImage` 次數、掃描線 0 與 25% 的黑線數、彈跳峰值 -15px、漂浮正負相位，嗯~全過
- 檔頭修正次數：`index.html` 36、`css/apng.css` 42、`js/i18n.js` 51、`js/media-utils.js` 5、`js/text-overlay.js` 5、`js/apng-frames.js` 9、`js/apng-encoder.js` 4、`js/png-editor.js` 4、`js/fx.js` 45、`js/frame-offset.js` 5

### 2026-11-12
- 影格「排序列」最右邊新增收合鈕（`cat-035` 隱藏 / `cat-034` 顯示）：一鍵把整片影格縮圖收起來，下方的「獨立影格設置」就會往上頂，調 X / Y 偏移不必再捲好幾屏；只影響看不看得到縮圖，不動 `files` / `frameDelays` / 目前選取的格
- 收合鈕的文字走 `hideFrames` / `showFrames`（五語系同步），切換語言時不會被舊字蓋回去；清空全部後自動回到「展開」狀態，避免重新匯入時影格卡一整個看不到
- 檔頭修正次數：`index.html` 26 → 27、`css/apng.css` 27 → 28、`js/apng-frames.js` 5 → 6、`js/i18n.js` 20 → 21
- 新增 `js/source-frame.js`：APNG / FX / PNG 三個工作框都畫出**綠色原圖外框**（2px 虛線 `#4caf50`），三頁都是棋盤格背景，有框才分得出「匯入的圖佔多大一塊」
- 外框走 DOM 疊層（`pointer-events:none`）而不是畫進 canvas：縮放、平移時線寬固定 2px 不會跟著變細，也不會擋到吸取顏色、橡皮擦、拖曳平移
- APNG 頁的外框以**第一張圖的原始尺寸**為基準、以每格圖片的中心置中：切到別格時框不跟著跳，才看得出每格與第一張的大小差、以及 `frame-offset.js`（dx / dy）造成的位移
- 外框會在圖片載入完成、切換影格、縮放／平移、視窗尺寸改變時重算；影格清空或圖片移除時自動收起
- 載入序新增 `js/source-frame.js`（排在 `apng-frames.js` 之前，APNG / FX / PNG 三頁共用）
- 檔頭修正次數：`index.html` 25 → 26、`css/apng.css` 26 → 27、`js/apng-frames.js` 4 → 5、`js/fx.js` 5 → 6、`js/png-editor.js` 1 → 2
- 修正獨立影格設置面板的「延遲」不跟隨更新：影格卡上的延遲輸入自己會 `stopPropagation()`，事件冒泡根本到不了外層容器，改用**捕獲階段**監聽（`addEventListener('input', fn, true)`）才收得到
- 新增「獨立影格設置」面板（`js/frame-offset.js`）：影格卡下方出現十字方向鍵，上／下／左／右一次把**目前這一格**位移 2px，中間鈕把該格還原成剛載入的樣子；右側顯示格號／檔名／延遲並可直接輸入 X、Y 偏移量。每一格的位移各自獨立，點哪一格就顯示哪一格的設定（圖片位置微調）
- 位移的實作方式：每個影格保留一份原始 `File`、位移量另外記 `dx` / `dy`，套用時用原始圖重畫一次並「烘焙」成新的 `File` 取代 `files[i]`，因此 `apng-encoder.js` 不必改動；畫布尺寸不變、移出邊界處裁掉並保持透明，不會觸發 encoder 的尺寸不一致檢查。記錄用 `WeakMap` 以 `File` 物件為 key，交換／移動／刪除影格都不必同步
- 影格卡片導航列中間新增「複製此格」鈕（`cat-247`）：按下後在該格後面插入一格內容相同的影格，延遲時間一併沿用，預覽直接跳到剛複製出來的那格；同時把導航鈕改為以 class 抓取，不再依賴 `querySelectorAll` 的索引順序
- Help 頁 部分示意圖改為跟隨語系：新增 `data-i18n-img` 屬性（值可寫 `{lang}` 佔位符），`applyLang()` 會自動換成 `colors-zh-TW / zh-CN / en / ja / th.jpg`，切語言不必再寫死單一語系的圖
- 新增 `js/media-utils.js`：共用 `replayImg()`，讓 GIF / APNG「點一下從第一格重新播放」只留一份實作
- 統一四處重播行為：Meme 展示牆（`meme.js`）、Meme 舊版 sample 清單與 Help 頁示意圖（`app-shell.js`）、分享彈窗預覽圖（`share.js`）
- 重播手法由舊的「`src = ''` 再設回」改為「原網址 + `?r=時間戳`」：舊招會讓圖片短暫空白、且命中快取時不一定重新解碼；新招另外補了單調遞增時間戳，避免同一毫秒連點拿到相同網址而沒重播
- Help 頁示意圖加上可點提示：`cursor:pointer`、hover 上浮陰影、`:active` 縮放、`:focus-visible` 以 box-shadow 顯示聚焦（全站 outline 已關閉），並支援 Enter／空白鍵重播
- 修正 `index.html` 的 `< class="faq-list">` 標籤漏字（該行 HTML 壞掉，`.faq-list` 樣式整段失效）
- 修正 `apng.css` 的 `.timeline-help img` 死選擇器（class 掛在 `img` 自身，無子元素可匹配），改為 `p.timeline-help-row img`，兩張併排才會正確吃到 `max-width`
- 新增「FX 動畫特效」頁（`tab-fx`，位置在「生成」之後）：特效清單、強度滑桿、影格數滑桿、圓點影格列、五鍵播放控制（首格 / 上一格 / 播放暫停 / 下一格 / 末格）
- FX 頁規格定案：延遲固定 100ms、輸出最長邊 ≤512px、影格數 5～40（預設 20）、送出採「取代」模式（要加入末尾...就自己先輸出PNG或GOF吧）
- FX 頁影格數上限由最初的 30 放寬到 40（`MAX_FRAMES`、滑桿 `max`、五語系提示文案一起改，避免滑桿能拉到 40 但程式夾在 30 的錯位）
- FX 頁 特效全部是自己寫的 Canvas 2D 配方（`FX_RECIPES`），沒有引入任何新函式庫，也沒有沿用外部實作
- Help 從上方 Tab 列移到頁尾（內容暫時不動），上方 Tab 變四個：APNG / FX / PNG / Meme
- `js/apng-frames.js` 把清空影格的邏輯從 `clearBtn` 的 click handler 抽出成 `clearAll()`，供 FX 頁交接呼叫
- `js/i18n.js` 五語系各補 21 條 FX 字串（共 105 條），並移除已不再使用的 `tabHelp` / `tabLong`
- 新增 `js/fx.js`；`index.html` 新增 `tab-fx` 區塊、FX 樣式與 `js/fx.js` 載入；`css/apng.css` 新增 FX 區段樣式
- 驗證：node + vm 最小 DOM/Canvas 測試特效 × 40 格 → 0 繪製錯誤；送出 40 張 PNG、`clearAll` 先執行、切頁正確；六支 JS 全數 `node --check` 通過
- 檔頭修正次數：`index.html` 19 → 20、`js/i18n.js` 14 → 15、`js/fx.js` 4 → 5、`css/apng.css` 20 → 21
- 兩支上傳 API 完整實測：Vercel 主站 GET `405` / POST `400` / OPTIONS `200` + `Access-Control-Allow-Origin: *`；EdgeOne 分站 GET `405` / POST `400` / OPTIONS `204` —— 皆正常、env 都已設定
- `api/upload.js`（Vercel 版）補 `typeof blobBase64 !== 'string'` 檢查：送非字串不再以 `TypeError` 落到 500，改回 `400 No image data`
- `api/upload.js` 的 catch 改為回通用 `Internal server error`，不再把 `e.message`（內含內部函式名）吐給呼叫者

### 2026-11-11
- 重構：`js/apng.js`（1908 行）拆分為四支傳統 script，程式邏輯零改動，全靠行號切分（本來就有稍微分類）
  - `js/app-shell.js`：頁籤切換與記憶、Emoji 字牆、Meme 舊版解析、README 載入、訪客追蹤
  - `js/apng-frames.js`：全域 DOM 節點與影格狀態、檔案匯入、APNG/GIF 拆格、排序、時間軸與卡片渲染、播放控制
  - `js/apng-encoder.js`：CRC32 / `acTL` 循環次數、UPNG 編碼、GIF 輸出、LINE 規範警告、切換語言時重繪結果文字
  - `js/png-editor.js`：PNG 靜態貼圖編輯器（去背、橡皮擦、縮放平移、分割線、240×240 與 96×74 輸出）
- 載入順序改為 `i18n → supabase-config → share → meme → app-shell → apng-frames → apng-encoder → png-editor`
- `apng-frames.js` 必須最先載入（宣告 `files` / `frameDelays` 等全域狀態），否則後兩支會踩 TDZ
- 維持不引入建置流程：多支傳統 script 直接載入，不編譯、不合併，拖曳部署方式不變
- 原 `apng.js` 完整備份放在專案根目錄 `_backup/`，不在 `static/` 內，不會被上傳或部署
- Help 頁新增「常見問題」
- 同步補齊 zh-TW / zh-CN / en / ja / th 五語系 `faqTitle`、`faqQ1~7`、`faqA1~7`，共 75 條字串
- FAQ 內容功能改寫：移除 Effects / Text Overlay / lossy 壓縮滑桿等描述（刪除了），文字或濾鏡特效明確標示需先用 Photoshop 等軟體製作
- `js/i18n.js` 修正次數 12 → 13、`css/apng.css` 17 → 18、`index.html` 16 → 17

### 2026-11-10
- README 更新：補上 PNG 靜態貼圖去背、自製 Emoji 圖標功能說明
- 技術棧補上 Supabase Storage/Postgres、Vercel Serverless Function
- 專案結構改為反映實際 static/ 目錄（api/、en/ja/th/zh/ 多語言 thin page、vercel.json 等）
- Meme 展示牆改為每次讀取 6 筆，並標註需 `approved=true` 才顯示
- 加入 Supabase 整合：使用者生成 APNG 後可一鍵分享到 Meme 展示頁
- 分享功能改為同頁 Modal（不再跳轉到獨立頁面），生成的 blob 透過 window 全域變數傳遞
- 分享 Modal 可填寫標題與作者暱稱（皆選填），上傳後自動切到 Meme tab 刷新
- 新增 `js/share.js`（分享 Modal 邏輯）、`js/meme.js`（Supabase Meme 載入）
- 修正：移除原本跨頁面 sessionStorage 傳 blob 的做法，改用 SPA 全域變數

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
- Help 說明更新

### 2026-11-06
- 加入泰文（ไทย）語言，支援 5 國語言：繁中 / 簡中 / EN / 日本語 / ไทย
- 下載檔名改為隨機字串 `eggshell-XXXXXX.png`，避免每次同名
- 播放控制列右側改顯示 FPS 與單次循環總時間
- 修正 GIF 解碼 partial update 導致的斑點雜色（改為累積 canvas + disposal 處理）
- 修正 APNG 匯入時 fcTL delay_den=0 的解析（依規範視為 100）
- 拖入不支援的檔案會顯示警告訊息，不會靜默吞掉
- 內建蛋殼喵 Emoji 字型（目前 258 格，PUA-A U+F0000 ~ U+F0101）
- i18n 字串支援嵌入 HTML，狀態列可顯示貓咪 emoji
- 語言下拉改為自訂選單（原生 select 不支援嵌入 emoji）

### 2026-11-05
- 加入多國語言切換（繁中 / 簡中 / EN / 日本語），自動跟隨瀏覽器
- 介面改為多 tab：APNG工具 / README / HELP / SRC
- README tab 改用 marked.js 動態渲染 markdown
- 主頁面改為 `index.html`，新增 `js/i18n.js`
- CSS 向量播放控制列、影格卡片排序與刪除功能
- 修正 favicon 路徑為相對路徑
- 初始專案製作（定稿：HTML + JS + CSS）
