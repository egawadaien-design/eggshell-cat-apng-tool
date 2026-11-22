<img src="icon/128x128.png" alt="蛋殼喵" height="80" align="left" style="margin-right:12px">
<img src="icon/logo-txt-w.png" alt="蛋殼喵 APNG 工具" height="80" align="left">

<br clear="left">

# 蛋殼喵 APNG 工具 (EggshellCat APNG Tool)

純前端、隱私優先的 APNG 動畫工具。
把一序列 PNG / APNG / GIF 打包成動畫 PNG（APNG）或 GIF，**所有處理都在你瀏覽器本機完成，圖片不上傳伺服器**。

---

## ✨ 功能特色

- 🌐 **多國語言** — 繁中 / 簡中 / English / 日本語 / ไทย（泰語經 AI 協助翻譯），自動跟隨瀏覽器
- 🔒 **純本機處理** — 圖片不上傳，敏感素材也能安心用
- 📥 **匯入 APNG / GIF** — 直接拖入現有 APNG 或 GIF，自動拆解成影格並還原每格時間
- ✨ **動畫特效頁（FX）** — 內建動畫特效（斜光掃過、震動、旋轉、溶解、RGB 故障、萬花筒、漫畫線稿、3D 方塊旋轉…），單張圖片一鍵生出一整組影格；調整特效、強度與格數後，整組影格一鍵送進「生成」頁接續編輯
- 🎚️ **每個特效都有專屬設定** — 選到哪支特效，右側「特效設定」就換成它專屬的滑桿或下拉：光掃有角度與光帶寬度、RGB 故障有撕裂頻率、萬花筒有切片數、漫畫效果有精細度與墨色…
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
- 🐱 **Meme 表情包** — 站上分享的蛋殼喵 APNG 展示牆（Supabase），點擊重播，可排序、可依標籤篩選
- 🖼️ **PNG 靜態貼圖製作** — 上傳 JPG/PNG/GIF/WEBP，吸取顏色一鍵去背（flood fill）、全域刪除指定顏色、橡皮擦自由修邊
- 😺 **自製 Emoji 圖標** — 258 格蛋殼喵 CSS 向量圖示，純 class 複製貼上就能用
- 📤 **一鍵分享** — 生成後可將你的 APNG 上傳到公開 Meme 展示牆（Supabase 儲存）；分享按鈕只在白名單網域出現（`js/supabase-config.js` 的 `shareHosts`）
- 📑 **分頁記憶** — 重新整理後記住目前頁面
- 📱 **RWD** — 手機小螢幕也能用

---

## 🚀 怎麼使用

打開 [apng-murex.vercel.app](https://apng-murex.vercel.app/)（Vercel）或 [apng.top](https://apng.top/)（EdgeOne Pages）即可使用，不需要安裝任何東西，也可以自行部署一份。

兩站前端檔案完全相同，差別只在 `/api/upload` 由所在平台的函數處理（`api/upload.js` / `node-functions/api/upload.js`）。

js/supabase-config.js 裡面的設置 enabled: true,  ← 分享功能開關：true = 啟用，false = 關閉（不顯示分享按鈕）<br>
設置為 false 就會關閉分享功能，程序會變成完全前端作業，不會有上傳/分享圖片功能。

### 操作步驟
參考站內頁面help → 放在網站開啟後頁面底部導航。

### FX 頁（想先套特效再編輯時走這條）
1. 切到上方 Tab 的「FX」
2. 把一張圖片拖進虛線框（或點一下選檔）
3. 在右側清單挑一種特效（清單可上下滑動），再用滑桿調整強度與影格數；清單下方「特效設定」會換成這支特效專屬的參數
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

規範整理自 LINE 官方公告（2026-11-06），實際送審請以官方最新說明為準。

---

## 自製 Emoji 圖標

258 格，蛋殼喵 CSS 向量圖示

緣由：
1. 純 class 複製貼上就能用
2. 以 CSS 向量製作，只保留站內用得到的圖案
3. 原始文件放在 webfonts/EggshellCat.fcp
4. 有興趣可以自己改、自己加
5. 字型與圖示以 MIT 授權（見 `webfonts/LICENSE`），可自由使用、修改、商用，保留版權聲明即可
6. 目前提供 EggshellCat.ttf / EggshellCat.woff（檔案不大，未另做 woff2）

---

## 📑 頁面說明

上方 Tab 列四個（APNG / FX / PNG / Meme）；Help、Emoji 字型、README、原始碼由頁尾按鈕進入。

| 頁籤 | 進入方式 | 功能 |
|---|---|---|
| **生成**（`tab-app`） | 上方 Tab | 拖 PNG/APNG/GIF → 設定參數 → 輸出 APNG / GIF；拖入 APNG / GIF 會自動拆成影格；卡片可調延遲、換順序、複製、刪除，下方「獨立影格設置」面板可對單一格做 2px 位移或輸入 X / Y 偏移量；右側「文字」面板可疊字（字體／字級／顏色／外框／陰影／顯示格範圍／淡入淡出） |
| **FX**（`tab-fx`） | 上方 Tab（排在生成之後） | 動畫特效：多種特效、強度與格數滑桿、即時預覽；選到哪支特效，右側「特效設定」就換成它專屬的參數（滑桿或下拉）；確定後把整組影格送到「生成」頁（取代原有影格）；右側同樣有「文字」面板，文字直接燒進每一格 |
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
| Canvas API | 圖片縮放、像素讀取、影格合成、單格位移烘焙、去背 flood fill、FX 頁各種特效繪製（含 3D 方塊的旋轉投影貼圖、煙火的加法混合火花、滿天愛心的貝茲心形、沿輪廓燃燒的火焰、粒子網路的星座連線） |
| Local Font Access API | 「讀取本機字體」：`queryLocalFonts()` 徵求授權後列出系統字體家族（Chrome / Edge 103+，需 HTTPS 或 localhost） |
| 純 HTML/CSS/JS | 無框架、無建置流程 |

---

## 📁 專案結構

```
static/
├── index.html              ← 主頁面（多 tab SPA）
├── README.md
├── LICENSE                 ← MPL-2.0
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
│   ├── app-shell.js        ← 頁籤切換 / Emoji 字牆 / README 載入 / 訪客追蹤
│   ├── apng-frames.js      ← 影格管理：檔案匯入、APNG/GIF 拆格、排序、時間軸與卡片渲染、播放控制
│   ├── frame-offset.js     ← 獨立影格設置：單格上下左右 2px 位移、偏移量輸入、單格還原初始狀態
│   ├── source-frame.js     ← 三個工作框的綠色原圖外框（APNG 以第一張圖尺寸為基準，FX / PNG 貼齊畫布）
│   ├── text-overlay.js     ← 文字疊加：APNG / FX / PNG 三頁共用同一套文字面板（字體、字級、顏色、外框、陰影、顯示格範圍、淡入淡出）
│   ├── apng-encoder.js     ← 編碼輸出：CRC32、acTL 循環次數、UPNG 編碼、GIF 生成、LINE 規範警告
│   ├── png-editor.js       ← PNG 靜態貼圖：去背、橡皮擦、縮放平移、分割線、240×240 與 96×74 輸出
│   ├── fx.js               ← FX 特效頁：各種特效配方（各自帶 params）、參數預覽、影格送出（交接給 apng-frames.js）
│   ├── supabase-config.js  ← Supabase URL / anon key / bucket 設定
│   └── gif.worker.js       ← GIF.js 背景編碼 worker
├── en/ ja/ th/ zh/
│   └── index.html          ← 各語言 thin page（SEO 用）
├── webfonts/
│   ├── EggshellCat.fcp     ← FontCore 原始檔
│   ├── EggshellCat.ttf    ← 彩色 ttf 字型
│   ├── EggshellCat.woff   ← 彩色 woff 字型
│   ├── EggshellCatEmoji.html  ← Emoji 預覽頁
│   ├── LICENSE            ← MIT（Emoji 字型與圖示授權）
│   └── font.css           ← Emoji class 定義
├── images/                 ← 網站圖片資產
└── icon/                   ← favicon / logo / 各尺寸圖示
```

> **`js/` 載入順序（傳統 script，載入順序＝執行順序，不可任意調換）**
> `i18n.js → supabase-config.js → media-utils.js → share.js → meme.js → app-shell.js → source-frame.js → text-overlay.js → apng-frames.js → frame-offset.js → apng-encoder.js → png-editor.js → fx.js`
> `apng-frames.js` 負責宣告全域 DOM 節點與影格狀態（`files` / `frameDelays` 等），必須排在 `apng-encoder.js`、`png-editor.js`、`fx.js` 之前，否則會踩 TDZ。
> `text-overlay.js` 只宣告 `window.TextOverlay`，排在 `apng-frames.js` 之前，因為 APNG 預覽要呼叫它的 `paintOverlay()`。
> `fx.js` 排最後：它要呼叫 `apng-frames.js` 的 `clearAll()` / `addFiles()` 與 `app-shell.js` 的 `switchTab()`，這些函式必須先宣告完成。

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

> 寫法註記：本文件提到特效時一律寫「各種特效」「多種特效」，不寫出數量——之後新增、隱藏或合併特效，文件不用回頭改數字。

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
- **立體特效（3D 方塊旋轉 `cubeSpin`）**：自寫的最小 3D —— 立方體八個角點做 Rodrigues 軸角旋轉、再正交投影回 2D。刻意不做透視：正交投影後每個面還是**平行四邊形**，一個 `setTransform` 就能把貼圖精準鋪滿（切三角形做透視貼圖會留一道對角接縫）；背面剔除後依深度由遠到近畫，角度走整圈（2π × 圈數 × `p`），所以循環頭尾是同一個畫面

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
- 使用者生成 APNG 後點「分享我的圖片」即可一鍵上傳，上傳後為待審狀態，審核通過才會公開

---

## 📜 授權

**程式碼：Mozilla Public License 2.0（MPL-2.0）** — 全文見 [`LICENSE`](LICENSE)，官方版本 <https://mozilla.org/MPL/2.0/>

MPL-2.0 是「**檔案級 copyleft**」，白話講：

- ✅ 可以自由使用、修改（授權條文未限制用途）
- ✅ 可以放進你自己的專案、和自己的閉源程式一起打包（不像 GPL 會傳染整個作品）
- ❗ 只要**動過本專案的檔案**，那些被改動的檔案就必須繼續以 MPL-2.0 公開原始碼
- ❗ **不能整包改成閉源再拿去賣**：散佈時必須提供原始碼（或說明如何取得），而且不得移除原有的版權與授權聲明（第 3.1、3.2、3.4 條）
- ❗ 想額外賣保固／技術支援可以，但只能以自己的名義，不能代表任何 Contributor（第 3.5 條）
- 📄 `js/` 底下每支自家 JS 的檔頭都附了 Exhibit A 短版聲明，等於每一支檔案各自都在告知授權條件（第 3.4 條要求這些聲明不得被移除）

### Emoji 字型與圖示：MIT

`webfonts/` 底下自製的蛋殼喵 Emoji 字型（`EggshellCat.fcp` / `.ttf` / `.woff`），以及 `webfonts/font.css`、`css/apng.css` 裡那 258 個 `.cat-xxx` 圖示定義，**另外以 MIT 授權**（全文見 [`webfonts/LICENSE`](webfonts/LICENSE)）：可自由使用、修改、再散佈，也可以商用，保留版權聲明即可。

### 商標與站內素材保留所有權利

MPL-2.0 第 2.3 條明講「**不授予任何 Contributor 的商標、服務標章或 logo 權利**」。下列項目**保留所有權利（All Rights Reserved）**，不在程式碼授權範圍內：

- 「蛋殼喵 / EggshellCat / EggshellCat APNG Tool」名稱，以及 `icon/` 的 logo 與各尺寸圖示
- `images/` 的示意圖與範例圖（含 `sample/` 那批、Help 頁的示範動畫）

要用這些素材（尤其放進商業產品或做成自己的品牌）請先聯絡作者取得同意。

---

## 💕 關於作者

蛋殼喵DaiEn (EggshellCat DaiEn)

---

## 📝 更新紀錄

### 2026-11-23
- 修正切換語言時 Meme 展示牆整片消失：舊版 sample 清單的渲染還留著，把 `window.renderMemes` 覆寫掉了。已移除那段死碼，Meme 頁統一由 `js/meme.js` 負責
- 修正 Meme 排序鈕被兩處重複綁定，點一下會先閃一次空狀態
- 補齊日文缺少的 5 條翻譯（色帶數量、混合模式、疊加／柔光／濾色），日文介面不會再冒出中文標籤
- 授權由 MIT 改為 **MPL-2.0**：改過的檔案需繼續開源、版權與授權聲明不得移除；商標與站內素材（名稱、`icon/`、`images/`）保留所有權利
- 自製 Emoji 字型與 `.cat-xxx` 圖示改以 **MIT** 授權，另附 `webfonts/LICENSE`
- `js/` 底下 13 支自家 JS 的檔頭加上 MPL-2.0 授權聲明

### 2026-11-13
- 新增特效「粒子網路」：粒點靠近自動連線、三點成面時中間透出淡白；軌跡取整數頻率，一輪剛好繞回起點，循環無縫
- 新增特效「火焰邊緣」：沿圖片輪廓取樣，透明處不冒火苗；內焰被原圖裁切、外焰可燒出輪廓外
- 新增特效「滿天愛心」：軌跡由高度反推的無狀態寫法，趟數取整數讓頭尾接得回去
- 新增特效「煙火」：火花軌跡可反推，拖尾沿同一條軌跡回取舊位置；跨循環點的火花會接著燒
- 新增特效「3D 方塊旋轉」：自寫最小 3D，正交投影讓貼圖用單一 transform 鋪滿六面，旋轉一圈頭尾同一畫面
- 數碼雨改為整條字串下墜，黑底獨立成 0～50% 滑桿；染色／老電視／斜光掃過改為只作用在有圖的像素，去背後不再出現色疤或黑線
- 新增文字面板（APNG／FX／PNG 三頁共用）：字體、字級、顏色、外框、陰影、十字鍵位移、讀取本機字體
- 文字面板新增「顯示格範圍」與「淡入淡出」，並加上 0～360 度旋轉；粗斜底線改用站內圖示字型
- 影格縮圖可整片收合，獨立影格設置面板改為靠右分組

### 2026-11-12
- 新增 FX 動畫特效頁：特效清單、強度與影格數滑桿、影格指示與播放控制；延遲固定 100ms、輸出最長邊 ≤512px、影格數 5～40
- FX 頁全部特效都是自寫的 Canvas 2D 配方，未引入任何新函式庫
- Help 從上方移往頁尾，上方頁籤調整為 APNG／FX／PNG／Meme
- 影格縮圖新增收合鈕（文字隨語言切換），收合後下方面板自動往上頂
- 新增綠色原圖外框（三頁共用）：走 DOM 疊層，縮放平移時線寬固定，也不擋操作
- 新增獨立影格設置面板：十字鍵一次位移 2px、可直接輸入 X／Y；修正「延遲」不跟隨更新的問題
- 影格卡新增「複製此格」鈕
- Help 示意圖支援跟隨語系換圖
- 新增共用的「點一下重新播放」，四處重播行為統一成一份實作
- 修正 Help 頁的標籤漏字與一條失效的樣式選擇器
- 兩支上傳 API 回應正常；Vercel 版補上型別檢查，錯誤訊息改為通用回覆，不再外露內部細節

### 2026-11-11
- 重構：原本近 2000 行的 `js/apng.js` 拆成 `app-shell` / `apng-frames` / `apng-encoder` / `png-editor` 四支，邏輯零改動
- 調整載入順序，`apng-frames.js` 需最先載入（全域狀態在此宣告）
- 維持不引入建置流程，多支傳統 script 直接載入
- Help 頁新增常見問題，五語系共 75 條
- FAQ 內容改寫，移除已刪除功能的描述

### 2026-11-10
- 加入 Supabase 整合：生成 APNG 後可一鍵分享到 Meme 展示牆（需審核通過才顯示）
- 分享改為同頁 Modal，可填標題與暱稱，上傳後自動切到 Meme 頁
- 新增 `js/share.js` 與 `js/meme.js`
- README 補上 PNG 去背與 Emoji 圖標說明、技術棧與專案結構

### 2026-11-08
- 新增「PNG 貼圖製作」頁：吸取顏色、全域刪色、橡皮擦、縮放／撤銷／還原、拖曳平移、容差滑桿

### 2026-11-07
- 加入 GIF 輸出，同時提供 APNG 與 GIF 雙格式下載
- 加入 LINE 動態貼圖規範檢查，生成後以黃色警告提示
- Meme 頁改為動態載入，支援排序與點擊重播
- 切換頁面或重新整理後仍保留在目前頁籤

### 2026-11-06
- 加入泰文，支援五種語言：繁中／簡中／EN／日本語／ไทย
- 下載檔名改為隨機字串，避免每次同名
- 播放控制列改顯示 FPS 與單次循環總時間
- 修正 GIF 解碼殘影與 APNG 匯入時間分母為 0 的解析
- 內建蛋殼喵 Emoji 字型（258 格）
- 字串支援嵌入 HTML，狀態列可顯示貓咪圖示

### 2026-11-05
- 加入多國語言切換（繁中／簡中／EN／日本語），自動跟隨瀏覽器
- 介面改為多頁籤，README 改由 marked 動態渲染
- CSS 向量播放控制列、影格卡片排序與刪除
- 初始專案：HTML + JS + CSS
