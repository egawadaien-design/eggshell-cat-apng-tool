/**
 * 蛋殼喵 APNG 工具 — FX 特效頁
 * @author [DaiEn]
 * @Date: 2026-11-14
 * @Correction: 63
 * 2026-11-14 修正：粒子網路（第 39 支）先從右側特效清單隱藏——配方、參數與繪製全部保留在 FX_RECIPES，
 *   只加一個 hidden: true 旗標，renderEffectList() 遇到就跳過（清單序號改以「看得見的項數」重編，不會跳號），
 *   初始選取也改成取第一支看得見的配方。改法確定後把旗標拿掉就回來。
 * 2026-11-14 修正：粒子網路的光點與線段改成七色漸變——原本每顆色相只在基色 ±20° 抖動，整片看下去其實是一個顏色；
 *   現在改成沿畫面斜向位置內插的七段調色盤（粉→橙→金→綠→青→藍→紫，色相 345/25/50/135/190/245/300），
 *   色相是連續函式，所以看到的是「漸變」而不是七個色塊；線段兩端各取自己那顆粒子的顏色拉線性漸層，
 *   兩端差不到 6° 時退回純色（避免每格多建幾千個 gradient）。「色相」滑桿改成整組色相一起轉，預設 0。
 *   顏色用軌跡中心算、抖動縮到 ±6°，粒子晃動時顏色不會跟著閃。
 *   三角形面紗從「白 6%」改成跟頂點色相走、濃度壓到 3.5%——白色的話會把底下的彩色線整片蓋成灰白；
 *   線與點的明度依底色切（深底 62%／68% 發光、淺底 45%／52% 才分得出顏色）。
 * 2026-11-13 修正：粒子網路改用真 canvas 渲染比對後，合成方式照黑底濃度切換——黑底 ≥15% 時線與粒子用 lighter 發光，
 *   完全透明底時改用 source-over（加法混合在淺色／亮面上加不上去，線和點會直接消失）。三角形一律 source-over，
 *   透明度由 0.10 降到 0.06，避免簇狀重疊時糊成一片純白。粒子改成「外圈淡暈 + 實心核」兩層畫，淺底也有光感。
 * 2026-11-13 修正：粒子網路看過原作實際畫面後補「聚散」滑桿——原作粒子自由漂移、幾顆撞在一起就形成
 *   「一團密集灰色三角形＋旁邊一大片空白」的簇狀分佈，跟原本均勻灑點的氣質差很多。
 *   現在先定 4 個群集中心，依聚散程度把每顆粒子的中心往群集中心拉（0%＝完全均勻、100%＝縮進 4 團雲裡），
 *   擺幅同時收窄，避免粒子晃出團外。預設 60%。
 * 2026-11-13 修正：粒子網路補上「色相流動」——原作那顆 color.animation 是整片粒子同一個色相同步慢慢轉，
 *   我們要接格無縫，所以一輪只轉整數圈（例：一輪一圈＝p 由 0 到 1 色相剛好繞 360° 回到原點）。
 *   選項：固定色／一輪轉一圈（預設）／一輪轉兩圈（更接近原作那種一直在變的感覺），色相在粒子抖動 ±20° 保留。
 * 2026-11-13 修正：新增第 39 支特效「粒子網路 Particle Net」——仿 tsParticles 那個粒子連線視覺，但自己寫：
 *   每顆粒子走利薩如軌跡（x 用 sin、y 用 cos，兩軸頻率都取 1~3 的整數），整數頻率讓 p=0 與 p=1 同位置，
 *   循環接得回去、跳格也不會錯位；每格重算距離，近的連線（越近越亮）、三顆互連則填 10% 淡白三角形，
 *   三角形用「鄰居清單＋共同鄰居」避開 O(n³)；整層 lighter 疊在深色底上會發亮。
 *   引入 tsParticles 這件事刻意不做：它是 TS 框架、整包 min.js 只為畫點和線，而且狀態累積跟我們每格獨立算相衝。
 *   專屬設定：數量、連線距離、擺動幅度、色相、黑底濃度 0–50%、圖層（粒子在圖前／圖後）
 * 2026-11-13 修正：新增第 38 支特效「火焰邊緣 Burning Edge」——沿著圖片輪廓燒起來，透明區一根火苗都不冒
 *   邊緣點用 alpha 掃描找（自己不透、鄰居透），依火焰間距分格取樣，並用 alpha 梯度算出「往圖片內部」的方向；
 *   火苗貼圖只做一次（暖色光斑從寬到窄往上堆），每一格只縮放旋轉貼上、整層 lighter；
 *   跳動用三條整數頻率正弦疊起來，p=0 與 p=1 完全相同。內焰模式再用 destination-in 打上原圖 alpha，
 *   保證火焰不出輪廓；外焰模式則一律往上衝、可燒出輪廓外。
 *   專屬設定：火焰高度、火焰密度、黑底濃度 0–50%、火焰範圍（內焰／外焰）
 * 2026-11-13 修正：新增第 37 支特效「滿天愛心 Floating Hearts」——把使用者提供的那份 createjs 漂浮愛心
 *   改寫成不載入外部函式庫、也不留狀態的版本：原作每格只做「y 減一點、x 用 cos(y) 算、rotation 用 sin(y) 算」，
 *   全部都是高度的函式，所以只要知道這顆現在在哪個高度，左右位置與傾斜就都算得出來；高度本身只跟 p 有關。
 *   每顆愛心走鋸齒：u = (p × 趟數 + 相位) 的小數部分 → y 從 H+60 升到 −60，跳點落在畫面外，接格無縫。
 *   專屬設定：數量、大小、擺動幅度、上升速度（換算成整數趟）、黑底濃度 0–50%、圖層（愛心在圖前／圖後）
 * 2026-11-13 修正：斜光掃過 Shine Sweep 的光帶改成 source-atop，只畫在有圖的像素上——
 *   去背圖的透明區不再冒出一條白色斜帶（做法與老電視的掃描線一致：只落在已有內容處、保留目的端 alpha）
 * 2026-11-13 修正：新增第 36 支特效「煙火 Fireworks」——把使用者提供的那份滑鼠煙火精簡成無狀態版本：
 *   火花軌跡用解析式反推（飛散 1-(1-age)^2 ＋ 重力 age^2），拖尾就沿同一條軌跡往回取 4 個舊位置連折線，
 *   不必記上一格、不必開離屏畫布；每發煙火有自己的發射時刻，用 (p - p0) mod 1 取時間，
 *   跨循環點的幾發會接著燒，接回第一格不會突然消失。已移除火箭升空段（使用者指定）。
 *   專屬設定：發數、火花數、爆炸半徑、黑底濃度 0–50%、圖層（煙火在圖前／圖後）
 * 2026-11-13 修正：老電視 Old TV 的掃描線與滾動亮帶改成 source-atop，只畫在有圖的像素上——
 *   原本是整片 fillRect，去背後透明區會冒出滿版黑線與亮帶。source-atop 會保留目的端 alpha，
 *   半透明羽邊不會被二次乘 alpha（比 destination-in 遮罩更乾淨，也不用多開一張畫布）
 * 2026-11-13 修正：染色 Color Tint 不再把整張畫布染成一片色——
 *   改成先在離屏畫布做一層「只有原圖不透明處才有色」的色層（填滿色 → destination-in 打上原圖 alpha），
 *   再用 'color' 混合疊回主畫布。透明區完全不上色，去背後不會留下方形色疤；
 *   刻意採「先填滿再挖掉」而不是「複製底圖再染色」，因為後者會讓 alpha 被乘兩次、半透明邊出現暗邊
 * 2026-11-13 修正：數碼雨的黑底改成滑桿「黑底濃度」0~50%（paramBgDensity／param key = bgDark），
 *   預設 0%＝完全不蓋底、原圖透出來；拉高才壓黑。以前黑底是綁在「強度」上的固定算式，
 *   想要透明根本沒辦法，而且壓多黑也不受使用者控制
 * 2026-11-13 修正：數碼雨 Matrix Rain 改成原版那種「整條字串往下掉」的畫法——
 *   之前是每欄一顆亮點往下飄，看起來只是下綠雨；現在每欄是一次掉一整條：
 *   字頭最亮、往上每一列暗一階（殘影），字元用雜湊(欄, 列)固定在原地等字頭壓過來。
 *   因為我們的每一格都是獨立算的（預覽可跳格、送出後 APNG 會重排），
 *   所以不用「上一格蓋半透明黑」的累積作法，而是直接把殘影算式畫出來：每格自給自足、跳格不空白。
 *   字元集換成參考碼那串漢字；流速換算成「每輪掉幾趟」（取整數，接回第一格才無縫）
 * 上次修正：「強度」滑桿下方加一行說明，內容隨目前特效更換——這支滑桿是全域的，
 *   但每支特效拿它做的事情不同（位移幅度／疊圖濃度／粒子數量／六面明暗／根本不吃它），
 *   使用者拉同一格卻看到不同結果會以為壞掉。做法：K_HINT_MAP 只列行為明顯不同的 27 支，
 *   其餘共用預設那句「整體幅度」，五語系各補 12 個 key（fxKHint*）省下 175 條翻譯
 * 上次修正：3D 方塊旋轉的背景參數預設改成「透明」——不再預設把原圖壓暗當底，
 *   方塊獨自浮在透明畫布上（畫面上不會出現原圖重影），送去 APNG 頁後可直接去背、疊到別的底圖；
 *   想看舊效果仍可把選單切回「暗化原圖」
 * 上次修正：新增第 35 支特效「3D 方塊旋轉 Cube Spin」——把輸入圖貼在立方體六個面，
 *   沿指定軸（隨機／X／Y／Z／斜軸）轉整圈。畫法是自己寫的最小 3D：Rodrigues 軸角旋轉＋正交投影，
 *   投影後每個面還是平行四邊形，一次 setTransform 就能把貼圖精準鋪滿（不切三角形、不會留對角接縫）；
 *   背面剔除後依深度由遠到近畫；角度 = 2π × 圈數 × p，p 走完等於整圈，循環頭尾是同一個畫面。
 *   專屬設定：旋轉軸、圈數（整數）、大小、邊線、明暗、背景（暗化原圖／透明）
 * 上次修正：漫畫效果的「精細度」範圍從 1~10 拉大到 1~20（再細一倍），
 *   門檻改成等比下降 `55 × 0.9^(精細度-1)`（1 只剩主輪廓、10 柔和照片也有完整線條、20 連淡漸層都抓得到），預設改 10
 * 上次修正：新增第 34 支特效「漫畫效果 Comic Ink」——原圖慢慢變成只剩線條的線稿，中段停留一下再回到原圖；
 *   專屬設定：精細度（邊緣門檻）、線條粗細、墨色濃度、底色（透明／白色）；
 *   線稿用全解析度的亮度差偵測畫成一張遮罩畫布並快取，每格只做一次 drawImage
 * 上次修正：dissolve（溶解消散）改成「一去一回」的完整循環——崩解 → 畫面全空 → 方塊由少到多拼回完整圖；
 *   包絡 `phase = sin(πp)`（p=0／p=1 都是 0，浮點尾巴壓成 0），密度改成指數 `1/(0.5+密度)` 控制崩解急緩
 * 上次修正：sliceSplit（切割）改成「一去一回」的完整循環——撕開飛散 → 畫面全空 → 原路飛回拼好，
 *   包絡用 sin 的正半波再平方（`q = sin(πp)^(2/速度)`），頭尾都是貼齊狀態，APNG 循環看不到接縫
 * 上次修正：新增第 33 支特效「切割 Slice Split」：切線垂直於移動方向，切片一條往右一條往左飄出畫面；
 *   參數＝切割數量（1~20）、方向（沿用滑入那支 0°~360° 角度滑桿）、速度（1~3，改的是起步衝勁）
 * 上次修正：shadowPulse 的陰影改成「只照不透明輪廓投影」——先把底圖 alpha 抽成黑色輪廓，再偏移＋模糊；
 *   透明區完全不會生出陰影（先前是把底圖連陰影一起丟給 canvas，半透明羽邊會跟著糊進去、濃度也不好抓）
 * 上次修正：kaleidoscope 旋轉圈數只給整數（1~3 圈，預設 1 圈），結尾 360° 等於開頭 0°，循環不再跳格
 * 上次修正：paramText 對 step < 1 的滑桿改成保留小數（流速 0.3、旋轉 0.2 圈不再被四捨五入成 0）
 * 上次修正：reveal 改成「揭開後繼續往同方向移動直到消失」（用一條圖寬的窗口掃過，一圈一次循環）
 * 上次修正：dissolve 的顆粒大小改用專屬 key（paramGrainSize），面板不再顯示籠統的「大小」
 * 2026-11-13 修正：spotlight 加「半徑／繞行幅度」、reveal 加「方向（沿用滑入的角度規格）／速度」、dissolve 改成「完整圖→消散→全空」並加「顆粒大小／密度」
 * 上次修正：swing 加「擺幅／次數」、colorStrobe 加「頻閃次數／色相圈數」、heartbeat 加「幅度／節拍間隔／次數」
 * 上次修正：四支「強度×波形」類特效（sepiaFlash／vignettePulse／invertFlash／contrastPulse）補上強度與次數設定
 * 上次修正：pixelate 改成「原圖 → 馬賽克 → 原圖」的循環（新增循環次數），格線透明度跟著包絡
 * 上次修正：染色 colorTint 加「色相／圈數／強度」、朦朧波動 blurWave 加「模糊／圈數」、馬賽克 pixelate 加「方塊大小／格線」
 * 上次修正：旋轉 rotate 加「圈數／轉向」、放大 zoomIn 加「縮放幅度／循環次數」
 * 上次修正：震動 shake 加上專屬設定（幅度／方向／頻率）
 * 上次修正：向左滑入＋向下滑入合併成「滑入 slideIn」（角度 0~360° + 速度），33 → 32
 * 上次修正：刪掉視覺太接近的四支（呼吸縮放／漣漪／底片顆粒／霓虹光暈），37 → 33
 * 上次修正：特效合併 41 → 37（liquidWobble 併入 waveDistort、chromaticShift 併入 rgbGlitch、
 *           scanLines 併入 oldTV、bounce 併入 float），四支改成參數化後各自保留原有效果
 * 上次修正：rainbowWave 加上四個專屬設定（色帶數量／角度／流動圈數／混合模式），
 *           漸層改成「沿指定角度、長度取畫布投影」以免斜著放時露角
 * 上次修正：狀態列／預覽提示／影格位置文字改成記 key（setStatusKey）＋ refreshLangTexts()，
 *           切語言時一併重翻（原本只有 data-i18n 節點會換，狀態列永遠停在載入時那個語言）
 * 上次修正：特效名稱多語言（effectName()）＋修正英／日／泰介面仍冒出中文名——
 *           原本靠 <html lang> 判斷，但清單在 applyLang() 之前就畫好，改成問 i18n 的 getLang()，
 *           並在 applyLang() 時呼叫 fxRenderEffectList() 重畫清單
 * 上次修正：pulseGlow 加上四個專屬設定（光暈半徑／脈動次數／縮放幅度／光暈顏色），
 *           顏色參數存 #rrggbb，畫的時候用 media-utils.js 的共用 hexToRgba() 補透明度
 * 上次修正：colorCycle 改成「色相走完整整 turns 圈」讓循環頭尾銜接，並加上圈數／轉向兩個專屬設定；
 *           參數機制新增下拉選單（type: select）
 * 上次修正：「特效設定」標題的特效名稱改成獨立 span（.fx-param-name），小字＋淡色當副標
 * 上次修正：「特效設定」標題改成「特效設定 特效名稱」的順序（名稱在後），沒有獨立設定的特效只顯示「特效設定」
 * 上次修正：shineSweep 的角度參數開到 -90°～0°（-90° 光帶完全垂直、0° 完全水平）
 * 上次修正：新增「特效設定」參數機制（recipe.params／paramStore／renderParams）；shineSweep 改成「整張畫布轉到光帶座標系再畫」——光帶長度、寬度都超出畫布，
 *           漸層沿光帶的寬度方向（斜向）淡掉，畫面上不再出現直線斷面
 * 上次修正：fade 的透明度曲線改成「淡入 → 顯現 → 淡出」三段包絡
 *           （舊版 1 - (0.85k)(0.5 - 0.5cos(2πp)) 是「顯現 → 淡出 → 淡入」，順序相反）
 * 上次修正：FX 頁新增「文字」面板，字直接燒進每一格（所見即所送）；
 *           字一改就重新產格，送到 APNG 頁時字已經在圖上
 *
 * 【設計原則】
 * 1. 本頁只做「選特效 → 調參數 → 預覽 → 送出」，不做編輯（編輯交給 APNG 頁）
 * 2. 延遲固定 100ms，不開放使用者調整（避免送出後被 APNG 頁的預設值蓋掉）
 * 3. 輸出最長邊 ≤ 512px、影格數 ≤ 40
 * 4. 送出時呼叫 apng-frames.js 的 clearAll() + addFiles()，採「取代」模式
 * 5. 全部包在 IIFE：狀態不與 APNG 頁的 files / frameDelays 混用
 * 6. 預覽舞台的綠色外框走 js/source-frame.js（框＝canvas 可視邊界）
 *
 * 【特效架構】
 * 每個特效都是同一條管線裡的一個「配方」：
 *   draw(ctx, p, k, i, o)
 *   - ctx : 該格畫布的 2D context（尺寸 = W×H）
 *   - p   : 0~1 的播放進度（i / 影格數）
 *   - k   : 0~1 的強度（使用者的 Intensity）
 *   - i   : 第幾格（給需要穩定隨機的特效當種子）
 *   - o   : 這支特效自己的參數物件（沒宣告 params 時是空物件）
 * 因此新增特效只要往 FX_RECIPES 加一筆，不必改渲染邏輯。
 */

(function () {
	'use strict';

	// ============================================================
	// 常數
	// ============================================================
	const MAX_SIDE = 512;      // 輸出最長邊上限
	const MAX_FRAMES = 40;     // 影格數上限
	const MIN_FRAMES = 5;      // 影格數下限
	const FIXED_DELAY = 100;   // 固定延遲（ms）
	const TAU = Math.PI * 2;

	// ============================================================
	// DOM（沒有 FX 頁就直接退出，避免在其他頁面報錯）
	// ============================================================
	const dropZone = document.getElementById('fxDropZone');
	if (!dropZone) return;

	const fileInput = document.getElementById('fxFileInput');
	const previewArea = document.getElementById('fxPreviewArea');
	const previewStage = document.getElementById('fxPreviewStage');
	const previewInfo = document.getElementById('fxPreviewInfo');
	const canvas = document.getElementById('fxCanvas');
	const ctx = canvas.getContext('2d');
	const timelineBox = document.getElementById('fxTimeline');
	const statusBox = document.getElementById('fxStatus');
	const infoBox = document.getElementById('fxInfo');
	const sendBtn = document.getElementById('fxSendBtn');
	const clearBtn = document.getElementById('fxClearBtn');
	const playBtn = document.getElementById('fxPlayBtn');
	const firstBtn = document.getElementById('fxFirstBtn');
	const prevBtn = document.getElementById('fxPrevBtn');
	const nextBtn = document.getElementById('fxNextBtn');
	const lastBtn = document.getElementById('fxLastBtn');
	const framePosText = document.getElementById('fxFramePosText');
	const frameCountInput = document.getElementById('fxFrameCount');
	const frameCountVal = document.getElementById('fxFrameCountVal');
	const intensityInput = document.getElementById('fxIntensity');
	const intensityVal = document.getElementById('fxIntensityVal');
	const kHintBox = document.getElementById('fxKHint');   // 「強度」下方那行說明，內容隨特效換
	const effectList = document.getElementById('fxEffectList');
	const paramGroup = document.getElementById('fxParamGroup');
	const paramBody = document.getElementById('fxParamBody');
	const paramTitle = document.getElementById('fxParamTitle');

	// ============================================================
	// 狀態（全部關在這個 IIFE 裡，不外洩到全域）
	// ============================================================
	let sourceImg = null;     // 原始圖片
	let baseCanvas = null;    // 依輸出尺寸縮放後的基準畫布
	let W = 0, H = 0;         // 輸出尺寸
	let frames = [];          // 每格 canvas
	let currentIndex = 0;
	let playing = false;
	let playTimer = null;
	let selectedId = 'shineSweep';   // 預設特效，初始化時再依 FX_RECIPES 校正
	let genToken = 0;         // 打斷舊的生成流程用
	let genTimer = null;      // 參數變更的 debounce
	let genPromise = null;    // 目前這輪生成的 promise（送出前要等它收斂）
	let sending = false;

	// ============================================================
	// 小工具
	// ============================================================
	// 翻譯：優先走全域 t()，key 缺失時回退繁中內建字串
	function tr(key, vars) {
		let s = key;
		if (typeof t === 'function') {
			s = t(key, vars);
			if (s === key) s = key;
		}
		if (vars) {
			for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
		}
		return s;
	}

	// 特效名稱：中文語系優先取 i18n 的 fxName_*，其他語系（英／日／泰）直接顯示英文原名。
	//
	// 【踩過的坑 2026-11-13】一開始是用 <html lang> 判斷，結果英／日／泰介面還是冒出中文名。
	// 原因是清單在「fx.js 載入當下」就畫好了，那時 applyLang() 還沒跑（html lang 還是 index.html
	// 寫死的 zh-TW），等語言套用上去時清單早就定版了。所以改成直接問 i18n 目前語言
	// （window.getLang()），並且在 applyLang() 結束時叫 window.fxRenderEffectList() 重畫一次清單。
	// 退一萬步，只有在連 getLang 都拿不到時（例如單獨拿這支檔案測試）才回頭讀 html lang。
	function effectName(recipe) {
		if (!recipe) return '';
		let lang = '';
		if (typeof window.getLang === 'function') lang = String(window.getLang() || '');
		if (!lang && document.documentElement) lang = String(document.documentElement.lang || '');
		lang = lang.toLowerCase();
		// 只有 zh / zh-tw / zh-cn 這類才顯示中文名，其餘一律英文原名
		if (lang.indexOf('zh') !== 0) return recipe.name;
		const key = 'fxName_' + recipe.id;
		const s = tr(key);
		return (s && s !== key) ? s : recipe.name;
	}

	// 記住「目前狀態列是哪一條訊息（key ＋ 變數）」。
	// 狀態列的內容是程式寫進去的，沒有 data-i18n，切語言時只重掃 DOM 不會動到它，
	// 所以要留一份 key，切語言時再翻一次（見 refreshLangTexts）
	let statusSpec = null;

	/**
	 * 設定狀態列，並記住對應的 i18n key 以便切語言時重翻。
	 * @param {string} key i18n key，傳空字串等於清空狀態列
	 * @param {Object} [vars] {變數} 插值用
	 */
	function setStatusKey(key, vars) {
		statusSpec = key ? { key: key, vars: vars || null } : null;
		if (statusBox) statusBox.textContent = key ? tr(key, vars) : '';
	}

	function setInfo(msg) {
		if (infoBox) infoBox.textContent = msg || '';
	}

	// 開一張離線畫布
	function mkCanvas(w, h) {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	}

	// 極簡 LCG 隨機（同一 seed 每次都得到同樣序列，避免每格亂跳）
	function rnd(seed) {
		let s = (seed * 9301 + 49297) % 233280;
		return function () {
			s = (s * 9301 + 49297) % 233280;
			return s / 233280;
		};
	}

	// 把基準圖置中縮放繪製（scale > 1 會超出畫布，剛好給旋轉／放大類特效補邊）
	function centerScale(c, scale) {
		const w = W * scale, h = H * scale;
		c.drawImage(baseCanvas, (W - w) / 2, (H - h) / 2, w, h);
	}

	// 立方體六個面（cubeSpin 用）：n = 面朝外的法向量，u / v = 面內的兩條邊方向
	// 慣例是 u × v = n（右手系），貼圖才會以「從外面看」的方向正確擺正、不會左右鏡像
	// 面上的四個角 = n ± u ± v，邊長 2（半徑 1，之後再依畫面尺寸換算）
	const CUBE_FACES = [
		{ n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },    // 右面
		{ n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },    // 左面
		{ n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },    // 上面
		{ n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },    // 下面
		{ n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },     // 正面
		{ n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] }    // 背面
	];


	// 漫畫特效用：把底圖掃一遍，先把「線稿」畫成一張跟輸出同尺寸的遮罩畫布（只算一次，之後每一格共用）
	// 原理是最簡單的邊緣偵測：每個像素跟左右鄰居比亮度差、跟上下的鄰居比亮度差，
	// 差距夠大就當成「這裡有條線」，差越大線越黑（所以對比強的輪廓會比淡邊更明顯）
	// threshold 由「精細度」決定：越大只留越明顯的大輪廓，越小連細碎的花紋都會變線
	function comicInkMask(lineWidth, threshold) {
		const mask = mkCanvas(W, H);
		const mctx = mask.getContext('2d');
		let src;
		try {
			src = baseCanvas.getContext('2d').getImageData(0, 0, W, H).data;
		} catch (e) {
			return mask;
		}
		// 亮度（含 alpha 加權）：全透明的地方當成 0，才不會把「透明的邊界」也畫成一條線
		function lum(x, y) {
			if (x < 0 || y < 0 || x >= W || y >= H) return 0;
			const i = (y * W + x) * 4;
			return ((src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) * src[i + 3]) / 255;
		}
		const half = lineWidth / 2;
		mctx.fillStyle = '#000000';
		// 邊界那一圈不比對（沒有鄰居），直接跳過
		for (let y = 1; y < H - 1; y++) {
			for (let x = 1; x < W - 1; x++) {
				const gx = lum(x + 1, y) - lum(x - 1, y);
				const gy = lum(x, y + 1) - lum(x, y - 1);
				const mag = Math.sqrt(gx * gx + gy * gy);
				if (mag < threshold) continue;
				// 線條粗細的做法：以這一像素為中心畫一個 lineWidth 大小的方塊，相鄰的點自然連成筆畫
				mctx.globalAlpha = Math.min(1, mag / 150);
				mctx.fillRect(x - half, y - half, lineWidth, lineWidth);
			}
		}
		return mask;
	}

	// 火焰特效用（一）：沿著圖片輪廓取樣「要從哪裡冒火」
	// 判定方式：自己不透明、但四個鄰居裡有一個是透明的（或超出畫布）就算邊緣點。
	// 同一個格子只留一個點（格子大小＝火焰間距），否則一條直邊會冒出幾百根一模一樣的火苗、
	// 而且越密的邊越亮，看起來會像整條邊被塗白。
	// 回傳 { x, y, nx, ny }：nx/ny 是「往圖片內部」的方向（拿 alpha 梯度算，邊界處天然指向不透明那側）
	function flameEdgePoints(spacing) {
		const pts = [];
		let src = null;
		try {
			src = baseCanvas.getContext('2d').getImageData(0, 0, W, H).data;
		} catch (e) {
			src = null;   // 跨網域圖讀不到像素時，底下會退化成「沿畫面邊框燒」
		}
		const step = Math.max(3, Math.round(spacing));
		const alphaAt = function (x, y) {
			if (x < 0 || y < 0 || x >= W || y >= H) return 0;
			return src[(y * W + x) * 4 + 3];
		};
		const seen = {};
		if (src) {
			const limit = 40;   // alpha 低於這個值就當成透明（去背圖的羽邊不會被當成邊界）
			for (let y = 0; y < H; y++) {
				for (let x = 0; x < W; x++) {
					if (alphaAt(x, y) < limit) continue;
					// 四鄰居都不透明 → 這是圖片內部，不冒火
					if (alphaAt(x - 1, y) >= limit && alphaAt(x + 1, y) >= limit &&
						alphaAt(x, y - 1) >= limit && alphaAt(x, y + 1) >= limit) continue;
					const cell = Math.floor(x / step) + ',' + Math.floor(y / step);
					if (seen[cell]) continue;
					seen[cell] = 1;
					// 往內的方向：用 ±2 的 alpha 差算梯度（只用 ±1 遇到柔和羽邊會抖）
					let dx = alphaAt(x + 2, y) - alphaAt(x - 2, y);
					let dy = alphaAt(x, y + 2) - alphaAt(x, y - 2);
					const dlen = Math.sqrt(dx * dx + dy * dy);
					if (dlen < 1) { dx = 0; dy = 1; }   // 梯度退化（例如剛好是轉角）就當成往下
					else { dx /= dlen; dy /= dlen; }
					pts.push({ x: x, y: y, nx: dx, ny: dy });
				}
			}
		}
		// 幾乎找不到邊（例如整張不透明的滿版圖、或讀不到像素）→ 退化成沿畫面四邊冒火
		if (pts.length < 8) {
			pts.length = 0;
			for (let x = step; x < W; x += step) {
				pts.push({ x: x, y: 1, nx: 0, ny: 1 });
				pts.push({ x: x, y: H - 1, nx: 0, ny: -1 });
			}
			for (let y = step; y < H; y += step) {
				pts.push({ x: 1, y: y, nx: 1, ny: 0 });
				pts.push({ x: W - 1, y: y, nx: -1, ny: 0 });
			}
		}
		return pts;
	}

	// 火焰特效用（二）：先做一朵「火苗」貼圖，之後每一格只是把它縮放貼上去
	// 做法是拿一顆暖色光斑當筆刷，沿著火焰舌頭的骨架從寬到窄、從亮到淡往上堆，
	// 疊出來就是一朵有芯、有焰身、邊緣柔軟的火苗；比每格現畫幾十個漸層便宜得多
	function flameSprite() {
		const sp = mkCanvas(64, 128);
		const sx = sp.getContext('2d');
		const blob = mkCanvas(64, 64);
		const bx = blob.getContext('2d');
		const g = bx.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, 'rgba(255,246,210,1)');      // 芯：白黃
		g.addColorStop(0.22, 'rgba(255,216,120,0.95)');
		g.addColorStop(0.5, 'rgba(255,140,30,0.75)');   // 焰身：橘
		g.addColorStop(0.8, 'rgba(220,60,0,0.32)');
		g.addColorStop(1, 'rgba(180,20,0,0)');
		bx.fillStyle = g;
		bx.fillRect(0, 0, 64, 64);
		sx.globalCompositeOperation = 'lighter';
		const N = 16;
		for (let t = 0; t < N; t++) {
			const q = t / (N - 1);
			const y = 128 - q * 116;              // 從底部往上堆
			const w = 0.62 - 0.45 * q;            // 越上面越窄
			const dw = 64 * w;
			const dh = 64 * w * 0.85;
			sx.globalAlpha = 1 - 0.7 * q;         // 越上面越淡
			sx.drawImage(blob, 32 - dw / 2, y - dh / 2, dw, dh);
		}
		return sp;
	}

	// 等一個 animation frame（生成多格時讓 UI 有機會更新）
	function nextFrame() {
		return new Promise(function (resolve) {
			requestAnimationFrame(function () { resolve(); });
		});
	}

	// ============================================================
// 特效配方表（39 個）
// ============================================================
	const FX_RECIPES = [
		{
			id: 'shineSweep', name: 'Shine Sweep',
			// 斜光掃過：把整張畫布轉到光帶自己的座標系再畫
			//   局部 x ＝ 光帶長軸（左下 → 右上）
			//   局部 y ＝ 光帶的寬度方向 ＝ 漸層方向（跟光帶垂直，也就是斜著淡掉）
			// 舊版是「平行四邊形 clip ＋ 一條方向對不齊的斜漸層」，光帶的側邊在畫布中間
			// 會留下直線斷面；這裡光帶長度、寬度都刻意超出畫布，畫面上只會看到柔和的漸層。
			// 參數：角度（0° = 光帶水平、-90° = 光帶垂直，中間就是斜的）、光帶寬度
			params: [
				{ key: 'angle', i18n: 'paramAngle', min: -90, max: 0, step: 1, def: -63, unit: '°' },
				{ key: 'band', i18n: 'paramBandWidth', min: 15, max: 55, step: 1, def: 28, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);

				const diag = Math.sqrt(W * W + H * H);
				const bandPct = (o && typeof o.band === 'number') ? o.band : 28;
				const bandW = Math.max(90, diag * bandPct / 100);   // 光帶寬度：預設 28% 對角線
				const angle = (((o && typeof o.angle === 'number') ? o.angle : -63) * Math.PI) / 180;
				const cos = Math.cos(angle), sin = Math.sin(angle);

				// 光帶中心沿「寬度方向」掃過：起點在畫面外，終點也在畫面外
				const reach = Math.abs(sin) * W / 2 + Math.abs(cos) * H / 2 + bandW / 2 + 2;
				const offset = -reach + p * reach * 2;

				// 光帶沿長軸要夠長，讓兩端都落在畫布外
				const halfLen = Math.abs(cos) * W / 2 + Math.abs(sin) * H / 2 + bandW;

				c.save();
				// 只畫在有圖的像素上：source-atop 的規則是「只落在畫布已有內容的地方，
				// 而且保留目的端原本的 alpha」。去背圖的透明區就不會冒出一條白色斜帶。
				// 這裡刻意不用離屏遮罩＋destination-in，是因為那樣 alpha 會被乘兩次，
				// 半透明的羽邊會浮出一圈暗暗的接縫；source-atop 沒這個問題，也不必多開一張畫布。
				c.globalCompositeOperation = 'source-atop';
				c.translate(W / 2, H / 2);
				c.rotate(angle);
				c.translate(0, offset);

				const g = c.createLinearGradient(0, -bandW / 2, 0, bandW / 2);
				g.addColorStop(0, 'rgba(255,255,255,0)');
				g.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 * k) + ')');
				g.addColorStop(1, 'rgba(255,255,255,0)');
				c.fillStyle = g;
				c.fillRect(-halfLen, -bandW / 2, halfLen * 2, bandW);
				c.restore();
			}
		},
		{
			id: 'colorCycle', name: 'Color Cycle',
			// 專屬設定：每輪繞幾圈（只收整數，才會跟第一格接得順）、轉向
			params: [
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{
					key: 'dir', i18n: 'paramDirection', type: 'select', def: 1,
					options: [
						{ v: 1, i18n: 'dirCW' },
						{ v: -1, i18n: 'dirCCW' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const dir = (o && o.dir === -1) ? -1 : 1;
				// 色相走完整整 turns 圈：每一格的間隔固定是 360*turns/格數，
				// 最後一格剛好差一步回到原色，所以循環播放時頭尾接得順。
				// 舊版把圈數乘上強度 k（hue = 360*p*k），k 不是整數時會停在半途，
				// 一循環顏色就突然跳回原色，看起來就是頭尾沒有接在一起。
				const hue = 360 * turns * dir * p;
				c.drawImage(baseCanvas, 0, 0);
				if (k > 0) {
					// 強度改成「上色比重」：疊一層色相偏移的圖，k 越大越明顯；
					// 色相本身永遠走整圈，所以任何 k 都不會破壞頭尾銜接
					c.save();
					c.globalAlpha = Math.min(1, k);
					c.filter = 'hue-rotate(' + hue + 'deg)';
					c.drawImage(baseCanvas, 0, 0);
					c.restore();
				}
			}
		},
		{
			id: 'pulseGlow', name: 'Pulse Glow',
			// 專屬設定：光暈半徑、脈動次數、縮放幅度、光暈顏色
			params: [
				{ key: 'glow', i18n: 'paramGlowRadius', min: 10, max: 90, step: 2, def: 40, unit: 'px' },
				{ key: 'pulses', i18n: 'paramPulses', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'breathe', i18n: 'paramZoom', min: 0, max: 8, step: 1, def: 2, unit: '%' },
				{
					key: 'color', i18n: 'paramColor', type: 'select', def: '#ffffff',
					options: [
						{ v: '#ffffff', i18n: 'colorWhite' },
						{ v: '#ff9ec4', i18n: 'colorPink' },
						{ v: '#ffd479', i18n: 'colorGold' },
						{ v: '#9fd8ff', i18n: 'colorBlue' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				// 脈動次數取整數：整數圈才會每格間隔一致，循環播放頭尾不會突然跳一下
				const pulses = Math.round((o && typeof o.pulses === 'number') ? o.pulses : 1);
				const glow = (o && typeof o.glow === 'number') ? o.glow : 40;
				const breathe = (o && typeof o.breathe === 'number') ? o.breathe : 2;
				const color = (o && o.color) ? o.color : '#ffffff';
				const amt = 0.5 - 0.5 * Math.cos(p * TAU * pulses);   // 0 → 1 → 0
				c.save();
				c.shadowColor = hexToRgba ? hexToRgba(color, 0.85 * amt * k) : color;
				c.shadowBlur = glow * amt * k;                        // 半徑由使用者決定，亮度仍跟強度走
				centerScale(c, 1 + (breathe / 100) * Math.sin(p * TAU * pulses));
				c.restore();
			}
		},
		{
			id: 'sparkle', name: 'Sparkle',
			// 專屬設定：星點數量、星點大小、閃爍速度、星點顏色
			params: [
				{ key: 'count', i18n: 'paramCount', min: 10, max: 120, step: 2, def: 60 },
				{ key: 'size', i18n: 'paramSize', min: 2, max: 8, step: 1, def: 4, unit: 'px' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 4, step: 1, def: 1 },
				{
					key: 'color', i18n: 'paramColor', type: 'select', def: '#ffffff',
					options: [
						{ v: '#ffffff', i18n: 'colorWhite' },
						{ v: '#ff9ec4', i18n: 'colorPink' },
						{ v: '#ffd479', i18n: 'colorGold' },
						{ v: '#9fd8ff', i18n: 'colorBlue' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const count = (o && typeof o.count === 'number') ? o.count : 60;
				const size = (o && typeof o.size === 'number') ? o.size : 4;
				// 閃爍速度取整數：整數圈頭尾才接得上，半圈的話最後一格會跟第一格差一截
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				const color = (o && o.color) ? o.color : '#ffffff';
				// 數量仍然跟強度走（k=0 時只剩約四成五），不然低強度也滿天星、看不出差別
				const n = Math.round(count * (0.45 + 0.55 * k));
				const r = rnd(i * 37 + 11);
				c.save();
				c.globalCompositeOperation = 'lighter';
				for (let j = 0; j < n; j++) {
					const x = r() * W;
					const y = r() * H;
					// 大小：1px 起跳，往上抽到使用者設的上限（舊版寫死 1 + r()*3，等於上限 4）
					const s = 1 + r() * (size - 1);
					// 每一顆星給一個固定相位，再乘上速度跑幾個整圈 → 閃爍頻率可調又不會亂跳
					const tw = 0.4 + 0.6 * Math.abs(Math.sin(p * TAU * speed + r() * TAU));
					const alpha = 0.25 + 0.6 * tw;
					c.fillStyle = hexToRgba ? hexToRgba(color, alpha) : 'rgba(255,255,255,' + alpha + ')';
					c.fillRect(x, y, s, s);
				}
				c.restore();
			}
		},
		{
			id: 'rainbowWave', name: 'Rainbow Wave',
			// 專屬設定：色帶數量、角度、流動圈數、混合模式
			params: [
				{ key: 'bands', i18n: 'paramBands', min: 2, max: 8, step: 1, def: 6 },
				{ key: 'angle', i18n: 'paramAngle', min: -90, max: 90, step: 1, def: 45, unit: '°' },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{
					key: 'blend', i18n: 'paramBlend', type: 'select', def: 'overlay',
					options: [
						{ v: 'overlay', i18n: 'blendOverlay' },
						{ v: 'soft-light', i18n: 'blendSoftLight' },
						{ v: 'screen', i18n: 'blendScreen' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const bands = Math.round((o && typeof o.bands === 'number') ? o.bands : 6);
				// 圈數取整數：色相要走完整圈，循環播放頭尾才接得上（跟 colorCycle 同一個道理）
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const blend = (o && o.blend) ? o.blend : 'overlay';
				// 角度：0° 由左往右、90° 由上往下、45° 就是舊版的左上→右下
				const angle = (o && typeof o.angle === 'number') ? o.angle : 45;
				const rad = angle * Math.PI / 180;
				const dx = Math.cos(rad);
				const dy = Math.sin(rad);
				// 漸層要蓋滿整張畫布：取方向在畫布上的投影長度，短邊那側也不會露出一角沒上色
				const len = Math.abs(W * dx) + Math.abs(H * dy);
				const cx = W / 2;
				const cy = H / 2;
				const g = c.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
				// 色帶：bands 段，每段轉 360/bands 度，湊起來剛好一整圈彩虹
				for (let s = 0; s <= bands; s++) {
					const hue = (p * 360 * turns + (s * 360) / bands) % 360;
					g.addColorStop(s / bands, 'hsla(' + hue + ',100%,60%,' + (0.55 * k) + ')');
				}
				c.save();
				c.globalCompositeOperation = blend;
				c.fillStyle = g;
				c.fillRect(0, 0, W, H);
				c.restore();
			}
		},
		{
			id: 'fade', name: 'Fade',
			// 淡入 → 顯現 → 淡出（三段包絡）
			// 前 30% 從透明淡到全顯、中段維持全顯、後 30% 再淡回透明，
			// 這樣第一格是「空的」、最後一格也淡掉，循環播放時不會突然跳出來
			// 舊版用 1 - (0.85k)(0.5-0.5cos) 是「顯現 → 淡出 → 淡入」，順序相反，已改掉
			params: [
				{ key: 'fadeLen', i18n: 'paramFadeLength', min: 15, max: 50, step: 1, def: 30, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const fadeLen = ((o && typeof o.fadeLen === 'number') ? o.fadeLen : 30) / 100;   // 淡入／淡出各佔整段的比例
				const floor = 1 - Math.min(1, Math.max(0, k));   // k=0 完全不淡、k=1 淡到全透明
				let env;                          // 包絡：0 = 全透明，1 = 全顯
				if (p < fadeLen) {
					env = p / fadeLen;                        // 淡入：0 → 1
				} else if (p > 1 - fadeLen) {
					env = (1 - p) / fadeLen;                  // 淡出：1 → 0
				} else {
					env = 1;                                  // 中段：全顯
				}
				c.globalAlpha = floor + (1 - floor) * env;
				c.drawImage(baseCanvas, 0, 0);
				c.globalAlpha = 1;
			}
		},
		{
			id: 'shake', name: 'Shake',
			// 專屬設定：幅度、方向（水平／垂直／雙向）、頻率
			// 舊版固定是「雙向 3%、每一格都換位置」；預設值刻意保留同樣的長相，
			// 想收斂成單一方向或讓它頓一下再跳，就調方向與頻率
			params: [
				{ key: 'amp', i18n: 'paramAmplitude', min: 1, max: 10, step: 1, def: 3, unit: '%' },
				{
					key: 'axis', i18n: 'paramAxis', type: 'select', def: 'both',
					options: [
						{ v: 'h', i18n: 'dirHorizontal' },
						{ v: 'v', i18n: 'dirVertical' },
						{ v: 'both', i18n: 'dirBoth' }
					]
				},
				// 頻率不掛「次」這種中文單位，否則英／日／泰語系會露出中文，只留純數字
				{ key: 'freq', i18n: 'paramFrequency', min: 4, max: 40, step: 1, def: 40 }
			],
			draw: function (c, p, k, i, o) {
				const amp = ((o && typeof o.amp === 'number') ? o.amp : 3) / 100;
				const axis = (o && o.axis) ? o.axis : 'both';
				// 頻率 = 一整圈之內換幾次位置；取整數段的種子，頻率低時相鄰影格會停在同一處
				const freq = Math.round((o && typeof o.freq === 'number') ? o.freq : 40);
				const seg = Math.floor(p * freq);
				const r = rnd(seg * 131 + 17);
				const dx = (axis === 'v') ? 0 : (r() * 2 - 1) * W * amp * k;
				const dy = (axis === 'h') ? 0 : (r() * 2 - 1) * H * amp * k;
				c.drawImage(baseCanvas, dx, dy);
			}
		},
		{
			id: 'rotate', name: 'Rotate',
			// 專屬設定：圈數（整圈才接得順）、轉向（順時針／逆時針）
			params: [
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{
					key: 'dir', i18n: 'paramDirection', type: 'select', def: 1,
					options: [
						{ v: 1, i18n: 'dirCW' },
						{ v: -1, i18n: 'dirCCW' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const dir = (o && o.dir === -1) ? -1 : 1;
				// 放大到 √2 倍，旋轉時四角才不會在轉動中露出空白
				const s = Math.sqrt(2);
				c.save();
				c.translate(W / 2, H / 2);
				// 角度 = 轉向 × 進度 × 整圈 × 圈數：整數圈讓最後一格剛好轉回原角度，循環不看接縫
				c.rotate(dir * p * TAU * turns);
				c.drawImage(baseCanvas, -W * s / 2, -H * s / 2, W * s, H * s);
				c.restore();
			}
		},
		{
			id: 'colorTint', name: 'Color Tint',
			// 專屬設定：色相（從哪個顏色開始跑）、流動圈數、染色強度
			params: [
				{ key: 'hue', i18n: 'paramHue', min: 0, max: 360, step: 10, def: 0, unit: '°' },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 85, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const hue = (o && typeof o.hue === 'number') ? o.hue : 0;
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 85) / 100;
				c.drawImage(baseCanvas, 0, 0);
				// 色相 = 起始色相 + 進度 × 整圈 × 圈數，取 360 餘數繞回 0，循環時顏色接得順
				const tintColor = 'hsl(' + Math.round((hue + p * 360 * turns) % 360) + ',90%,55%)';

				// 【為什麼要先做一張「有圖才有色」的色層】
				// 直接在主畫布上用 'color' 填滿整張畫布，透明區也會被填成一片色塊——
				// 那塊色在 APNG 頁去背後就是一個方形的色疤。所以先開一張同尺寸的離屏畫布：
				//   1. 整張填滿色（alpha 1）
				//   2. 用 destination-in 把「原圖的 alpha」打上去 → 只有圖不透明的地方留下顏色，
				//      透明區 alpha 直接變 0（半透明的羽邊也會跟著漸淡，不會出現硬邊）
				// 再把這張色層用 'color' 疊回主畫布，明暗層次照樣保留，但只染圖、不染空白。
				// 這裡刻意「先填滿再挖掉」而不是「複製底圖再染色」：
				// 複製底圖的做法會讓 alpha 被乘兩次（半透明邊會變得更透、出現一圈暗邊），
				// 先填滿（alpha=1）再 destination-in 只乘一次，邊緣才會跟原圖一模一樣。
				let tint = this._tint;
				if (!tint || tint.width !== W || tint.height !== H) {
					tint = mkCanvas(W, H);
					this._tint = tint;
				}
				const tc = tint.getContext('2d');
				tc.globalCompositeOperation = 'source-over';
				tc.globalAlpha = 1;
				tc.fillStyle = tintColor;
				tc.fillRect(0, 0, W, H);
				tc.globalCompositeOperation = 'destination-in';
				tc.drawImage(baseCanvas, 0, 0);
				tc.globalCompositeOperation = 'source-over';   // 還原，下一格才不會沿用上一次的合成模式

				c.save();
				// 'color' 混合只吃色相與飽和度，畫面原本的明暗層次會留著，看起來像「換色」而不是「蓋色」
				c.globalCompositeOperation = 'color';
				c.globalAlpha = strength * k;
				c.drawImage(tint, 0, 0);
				c.restore();
			}
		},
		{
			id: 'blurWave', name: 'Blur Wave',
			// 專屬設定：模糊大小、波動圈數
			params: [
				{ key: 'blur', i18n: 'paramBlur', min: 2, max: 24, step: 1, def: 12, unit: 'px' },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const blur = (o && typeof o.blur === 'number') ? o.blur : 12;
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				// 清晰 → 模糊 → 清晰：cos 波形頭尾都是 0，所以起點與終點都是原圖，循環看不到跳動
				const b = blur * k * (0.5 - 0.5 * Math.cos(p * TAU * turns));
				c.filter = 'blur(' + b.toFixed(2) + 'px)';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'pixelate', name: 'Pixelate',
			// 專屬設定：方塊大小（馬賽克最重時的格子邊長）、循環次數、格線
			// 走法：原圖 → 格子慢慢變大（越糊）→ 縮回細格（回到原圖），一整段是一個循環
			// 波形用 cos，p=0 與 p=1 都停在 1px（等於沒馬賽克），所以循環頭尾都是乾淨的原圖
			params: [
				{ key: 'size', i18n: 'paramSize', min: 3, max: 30, step: 1, def: 15, unit: 'px' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'grid', i18n: 'paramGrid', min: 0, max: 50, step: 1, def: 0, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const size = Math.round((o && typeof o.size === 'number') ? o.size : 15);
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const grid = ((o && typeof o.grid === 'number') ? o.grid : 0) / 100;
				// 包絡 0 → 1 → 0：0 的時候格子 1px（原圖）、1 的時候格子等於設定的方塊大小
				const wave = 0.5 - 0.5 * Math.cos(p * TAU * cycles);
				const block = Math.round(1 + (size - 1) * k * wave);
				if (block < 2) {
					c.drawImage(baseCanvas, 0, 0);
					return;
				}
				const tw = Math.max(1, Math.round(W / block));
				const th = Math.max(1, Math.round(H / block));
				const tmp = mkCanvas(tw, th);
				tmp.getContext('2d').drawImage(baseCanvas, 0, 0, tw, th);
				c.imageSmoothingEnabled = false;
				c.drawImage(tmp, 0, 0, tw, th, 0, 0, W, H);
				c.imageSmoothingEnabled = true;
				if (grid > 0) {
					// 每一格畫一條線：格寬不一定剛好整除，所以直接用 W/tw、H/th 算實際格距
					const bw = W / tw;
					const bh = H / th;
					c.save();
					c.strokeStyle = 'rgba(0,0,0,' + (0.55 * grid * wave).toFixed(3) + ')';
					c.lineWidth = 1;
					c.beginPath();
					for (let x = bw; x < W; x += bw) { c.moveTo(x, 0); c.lineTo(x, H); }
					for (let y = bh; y < H; y += bh) { c.moveTo(0, y); c.lineTo(W, y); }
					c.stroke();
					c.restore();
				}
			}
		},
		{
			id: 'sepiaFlash', name: 'Sepia Flash',
			// 專屬設定：褐色強度、閃光次數
			params: [
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 100, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 100) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const wave = 0.5 - 0.5 * Math.cos(p * TAU * cycles);
				// 0.4 是「泛黃底」：最淡的那一格也留一點褐色，不會完全回到原色（舊版就是這個長相）
				const s = (0.4 + 0.6 * wave) * strength * k;
				c.filter = 'sepia(' + s.toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'vignettePulse', name: 'Vignette Pulse',
			// 專屬設定：暗角強度、暗角範圍（內圈半徑）、脈動次數
			params: [
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 100, unit: '%' },
				{ key: 'size', i18n: 'paramVignette', min: 0, max: 60, step: 5, def: 28, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 100) / 100;
				const inner = ((o && typeof o.size === 'number') ? o.size : 28) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const wave = 0.5 - 0.5 * Math.cos(p * TAU * cycles);
				const amt = (0.35 + 0.4 * wave) * strength * k;
				const g = c.createRadialGradient(
					W / 2, H / 2, Math.min(W, H) * inner,
					W / 2, H / 2, Math.max(W, H) * 0.75
				);
				g.addColorStop(0, 'rgba(0,0,0,0)');
				g.addColorStop(1, 'rgba(0,0,0,' + amt.toFixed(3) + ')');
				c.fillStyle = g;
				c.fillRect(0, 0, W, H);
			}
		},
		{
			id: 'waveDistort', name: 'Wave Distort',
			// 專屬設定：方向、頻率、幅度、速度
			// 原 liquidWobble 已併進來（它其實就是同一支切條位移，只差頻率 6→8 與幅度 5%→4%），
			// 現在靠「方向＋頻率」就能調出兩種原本的長相，不必留兩支幾乎一樣的配方
			params: [
				{
					key: 'axis', i18n: 'paramAxis', type: 'select', def: 'h',
					options: [
						{ v: 'h', i18n: 'dirHorizontal' },
						{ v: 'v', i18n: 'dirVertical' }
					]
				},
				{ key: 'freq', i18n: 'paramFrequency', min: 2, max: 12, step: 1, def: 8 },
				{ key: 'amp', i18n: 'paramAmplitude', min: 1, max: 12, step: 1, def: 4, unit: '%' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const axis = (o && o.axis) ? o.axis : 'h';
				const freq = Math.round((o && typeof o.freq === 'number') ? o.freq : 8);
				const ampPct = ((o && typeof o.amp === 'number') ? o.amp : 4) / 100;
				// 速度取整數圈，頭尾相位才接得上（否則最後一格會突然跳回起點）
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				if (axis === 'v') {
					// 縱向：切直條，左右不動、每條上下錯位（原 liquidWobble 的方向）
					const amp = H * ampPct * k;
					for (let x = 0; x < W; x += 4) {
						const dy = Math.sin((x / W) * freq + p * TAU * speed) * amp;
						c.drawImage(baseCanvas, x, 0, 4, H, x, dy, 4, H);
					}
				} else {
					// 橫向：切橫條，每條左右錯位（原 waveDistort 的方向）
					const amp = W * ampPct * k;
					for (let y = 0; y < H; y += 4) {
						const dx = Math.sin((y / H) * freq + p * TAU * speed) * amp;
						c.drawImage(baseCanvas, 0, y, W, 4, dx, y, W, 4);
					}
				}
			}
		},
		{
			id: 'invertFlash', name: 'Invert Flash',
			// 專屬設定：反色強度、閃爍次數（原本寫死 3 次）
			params: [
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 100, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 6, step: 1, def: 3 }
			],
			draw: function (c, p, k, i, o) {
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 100) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 3);
				// sin 取正值再平方：一閃一閃（暗→亮→暗），負半邊直接壓成 0，所以不會「反兩次」
				const v = Math.pow(Math.max(0, Math.sin(p * TAU * cycles)), 2) * strength * k;
				c.filter = 'invert(' + v.toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
			c.filter = 'none';
			}
		},
		{
			id: 'float', name: 'Float',
			// 專屬設定：幅度、模式（平滑漂浮／往上彈跳）、循環次數（paramCycles，不用 paramPulses 是因為這裡是「來回幾趟」）
			// 原 bounce 已併進來：彈跳只是把 sin 換成 |sin|（貼地只往上跳），共用同一支配方
			params: [
				{ key: 'amp', i18n: 'paramAmplitude', min: 2, max: 15, step: 1, def: 5, unit: '%' },
				{
					key: 'mode', i18n: 'paramMode', type: 'select', def: 'float',
					options: [
						{ v: 'float', i18n: 'modeFloat' },
						{ v: 'bounce', i18n: 'modeBounce' }
					]
				},
				{ key: 'pulses', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const amp = ((o && typeof o.amp === 'number') ? o.amp : 5) / 100;
				const mode = (o && o.mode) ? o.mode : 'float';
				// 來回次數取整數，循環播放頭尾才接得上
				const pulses = Math.round((o && typeof o.pulses === 'number') ? o.pulses : 1);
				const dy = (mode === 'bounce')
					? -Math.abs(Math.sin(p * TAU * pulses)) * H * amp * k
					: Math.sin(p * TAU * pulses) * H * amp * k;
				c.drawImage(baseCanvas, 0, dy);
			}
		},
		{
			id: 'contrastPulse', name: 'Contrast Pulse',
			// 專屬設定：對比強度、脈動次數
			params: [
				{ key: 'strength', i18n: 'paramStrength', min: 20, max: 100, step: 5, def: 100, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 100) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const v = (0.5 - 0.5 * Math.cos(p * TAU * cycles)) * k * strength;
				// 對比拉高時飽和度一起推一點（0.8 : 0.2 的比例跟舊版一致），畫面才不會「只變硬不變豔」
				c.filter = 'contrast(' + (1 + 0.8 * v).toFixed(3) + ') saturate(' + (1 + 0.2 * v).toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.filter = 'none';
			}
		},
		{
			id: 'rgbGlitch', name: 'RGB Glitch',
			// 專屬設定：色差位移、抖動速度、撕裂機率
			// 原 chromaticShift 已併進來（它就是這支的溫和版：色相偏移少一點、沒有撕裂），
			// 現在把「撕裂」關掉就等於原本的色差偏移
			params: [
				{ key: 'split', i18n: 'paramSplit', min: 2, max: 20, step: 1, def: 12, unit: 'px' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 4, step: 1, def: 2 },
				{
					key: 'tear', i18n: 'paramTear', type: 'select', def: 'sometimes',
					options: [
						{ v: 'off', i18n: 'tearOff' },
						{ v: 'sometimes', i18n: 'tearSometimes' },
						{ v: 'often', i18n: 'tearOften' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const split = (o && typeof o.split === 'number') ? o.split : 12;
				// 速度取整數圈，色差來回才不會在接點突然換方向
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 2);
				const tear = (o && o.tear) ? o.tear : 'sometimes';
				const dx = split * k * Math.sin(p * TAU * speed);
				c.save();
				c.globalCompositeOperation = 'screen';
				c.globalAlpha = 0.35;
				c.filter = 'hue-rotate(120deg)';
				c.drawImage(baseCanvas, dx, 0);
				c.filter = 'hue-rotate(-120deg)';
				c.drawImage(baseCanvas, -dx, 0);
				c.restore();
				// 撕裂：機率由參數決定；關掉就完全不畫，等於溫和版色差偏移
				if (tear === 'off') return;
				const r = rnd(i * 29 + 7);
				const gate = tear === 'often' ? 0.3 : 0.6;   // 門檻越低越常出現
				if (r() > gate) {
					const sh = Math.round(H * (0.03 + 0.1 * r()));
					const sy = Math.round(r() * Math.max(1, H - sh));
					const off = (r() * 2 - 1) * W * 0.06 * k;
					c.drawImage(baseCanvas, 0, sy, W, sh, off, sy, W, sh);
				}
			}
		},
		{
			id: 'zoomIn', name: 'Zoom In',
			// 專屬設定：縮放幅度、循環次數
			params: [
				{ key: 'zoom', i18n: 'paramZoom', min: 5, max: 50, step: 1, def: 18, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const zoom = ((o && typeof o.zoom === 'number') ? o.zoom : 18) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				// 一個 cos 波形：起點 1 倍 → 中段最大 → 尾端回到 1 倍，循環頭尾才接得上
				const wave = 0.5 - 0.5 * Math.cos(p * TAU * cycles);
				const s = 1 + zoom * k * wave;
				centerScale(c, s);
			}
		},
		{
			id: 'slideIn', name: 'Slide In',
			// 專屬設定：滑入角度、速度
			// 原 slideLeft（向左）與 slideDown（向下）已併成這支：角度 180° 就是原本的向左滑入、90° 是向下滑入，
			// 其他角度則是兩者的斜向混合（0° 向右、270° 向上）
			params: [
				{ key: 'angle', i18n: 'paramAngle', min: 0, max: 360, step: 15, def: 180, unit: '°' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const deg = (o && typeof o.angle === 'number') ? o.angle : 180;
				// 速度取整數圈：p 從 0 走到 1 剛好位移「整數趟」，循環時才不會看到接縫
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				const rad = (deg * Math.PI) / 180;
				const dx = Math.cos(rad);
				const dy = Math.sin(rad);
				// 沿這個方向要移動多遠，才能把整張畫布完全換掉一輪（斜向時取兩軸投影相加）
				const span = Math.abs(dx) * W + Math.abs(dy) * H;
				const travel = p * speed * span;
				c.save();
				c.translate(dx * travel, dy * travel);
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
				// 第二張貼在「後方 span」的位置，第一張離開畫布時留下的空隙由它補上
				c.save();
				c.translate(dx * (travel - span), dy * (travel - span));
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
			}
		},
		{
			id: 'swing', name: 'Swing',
			// 專屬設定：擺幅角度、擺盪次數
			// 擺點在上方中央，所以像掛著晃；角度 7° 約等於舊版的 0.12 弧度
			params: [
				{ key: 'angle', i18n: 'paramAngle', min: 2, max: 20, step: 1, def: 7, unit: '°' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const ampDeg = (o && typeof o.angle === 'number') ? o.angle : 7;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				// sin 走整數圈：p=0 與 p=1 都是 0°，循環時不會有一格突然歪掉
				const rad = Math.sin(p * TAU * cycles) * (ampDeg * Math.PI / 180) * k;
				c.save();
				c.translate(W / 2, 0);
				c.rotate(rad);
				c.drawImage(baseCanvas, -W / 2, 0);
				c.restore();
			}
		},
		{
			id: 'colorStrobe', name: 'Color Strobe',
			// 專屬設定：頻閃次數、色相圈數（一整段裡換幾輪顏色）
			params: [
				{ key: 'freq', i18n: 'paramFrequency', min: 2, max: 12, step: 1, def: 6 },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 2 }
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const freq = Math.round((o && typeof o.freq === 'number') ? o.freq : 6);
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 2);
				// sin 只取正半邊：一半時間亮、一半時間暗，所以「閃」的次數就是 freq
				const f = Math.sin(p * TAU * freq);
				if (f > 0) {
					c.save();
					c.globalCompositeOperation = 'overlay';
					c.globalAlpha = 0.5 * f * k;
					c.fillStyle = 'hsl(' + Math.round((p * 360 * turns) % 360) + ',100%,55%)';
					c.fillRect(0, 0, W, H);
					c.restore();
				}
			}
		},
		{
			id: 'shadowPulse', name: 'Shadow Pulse',
			// 專屬設定：陰影距離（往下沉多少）、模糊（散得多開）、脈動次數
			// 舊版寫死距離 4px、模糊 10px 起跳、一圈脈動一次，預設值就是舊版
			params: [
				{ key: 'offset', i18n: 'paramShadowOffset', min: 0, max: 20, step: 1, def: 4, unit: 'px' },
				{ key: 'blur', i18n: 'paramBlur', min: 0, max: 40, step: 1, def: 10, unit: 'px' },
				{ key: 'pulses', i18n: 'paramPulses', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const offset = (o && typeof o.offset === 'number') ? o.offset : 4;
				const blurBase = (o && typeof o.blur === 'number') ? o.blur : 10;
				const pulses = Math.round((o && typeof o.pulses === 'number') ? o.pulses : 1);
				// 脈動次數直接乘進 cos 的週期，整數圈才會頭尾接得回 0
				const amt = 0.5 - 0.5 * Math.cos(p * TAU * pulses);
				const alpha = (0.45 + 0.35 * amt) * k;          // 陰影濃度（沿用舊版公式）
				const radius = (blurBase + 22 * amt * k) / 2;    // 模糊半徑（內建 shadowBlur 約等於 2 倍半徑）
				const scale = 0.94;
				const dw = W * scale;
				const dh = H * scale;
				// 只讓「不透明的地方」投影：先取出底圖的 alpha 輪廓，再用 source-in 整片塗黑。
				// 輪廓裡全透明的像素是 0，所以透明區不會生出任何陰影（含半透明的羽邊也不會亂撒）
				const mask = mkCanvas(W, H);
				const m = mask.getContext('2d');
				m.drawImage(baseCanvas, (W - dw) / 2, (H - dh) / 2, dw, dh);
				m.globalCompositeOperation = 'source-in';
				m.fillStyle = '#000';
				m.fillRect(0, 0, W, H);
				c.save();
				if (typeof c.filter === 'string') {
					// 有 filter 的環境：把輪廓偏移後直接模糊，濃度與柔化程度都能準確控制；
					// 模糊會把 alpha 攤開，所以濃度要補回來（1.9 倍是實測接得近舊版觀感的值）
					c.globalAlpha = Math.min(1, alpha * 1.9);
					c.filter = 'blur(' + radius.toFixed(1) + 'px)';
					c.drawImage(mask, 0, offset * k);
				} else {
					// 沒有 filter（舊一點的 Safari）：退回 canvas 內建陰影，也是照輪廓算，
					// 只是濃度會被攤薄一些（補 1.4 倍）
					c.shadowColor = 'rgba(0,0,0,' + Math.min(1, alpha * 1.4) + ')';
					c.shadowBlur = radius * 2;
					c.shadowOffsetX = W * 2;   // 輪廓本體畫到畫面外，靠 offset 把影子拉回原位
					c.shadowOffsetY = offset * k;
					c.drawImage(mask, -W * 2, 0);
				}
				c.restore();
				centerScale(c, scale);
			}
		},
		{
			id: 'flipAnim', name: 'Flip Anim',
			// 專屬設定：翻轉軸（水平／垂直）、圈數
			// 舊版只有水平翻、一圈翻一次，預設值就是舊版；垂直是新增的（改成縮放 y 軸）
			params: [
				{ key: 'axis', i18n: 'paramAxis', type: 'select', def: 'h', options: [{ v: 'h', i18n: 'dirHorizontal' }, { v: 'v', i18n: 'dirVertical' }] },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const axis = (o && typeof o.axis === 'string') ? o.axis : 'h';
				const turns = Math.round((o && typeof o.turns === 'number') ? o.turns : 1);
				const sx = Math.cos(p * TAU * turns);
				// 薄到 0 會讓 drawImage 整個消失，留 0.03 的邊，看起來才像翻到側面
				const ax = Math.abs(sx) < 0.03 ? 0.03 : Math.abs(sx);
				c.save();
				c.translate(W / 2, H / 2);
				if (axis === 'v') {
					c.scale(1, sx < 0 ? -ax : ax);
				} else {
					c.scale(sx < 0 ? -ax : ax, 1);
				}
				c.drawImage(baseCanvas, -W / 2, -H / 2);
				c.restore();
			}
		},
		{
			id: 'spotlight', name: 'Spotlight',
			// 專屬設定：光圈半徑、繞行幅度（0 就固定在正中央）
			params: [
				{ key: 'radius', i18n: 'paramRadius', min: 5, max: 60, step: 1, def: 30, unit: '%' },
				{ key: 'orbit', i18n: 'paramOrbit', min: 0, max: 50, step: 1, def: 28, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				c.drawImage(baseCanvas, 0, 0);
				const radius = ((o && typeof o.radius === 'number') ? o.radius : 30) / 100;
				const orbit = ((o && typeof o.orbit === 'number') ? o.orbit : 28) / 100;
				// 用一張遮罩畫布做「挖洞」，避免 destination-out 把底圖也挖掉
				const mask = mkCanvas(W, H);
				const m = mask.getContext('2d');
				m.fillStyle = 'rgba(0,0,0,' + (0.78 * k) + ')';
				m.fillRect(0, 0, W, H);
				// 繞行幅度 0 時 cos／sin 乘 0，光圈就停在正中央
				const cx = W / 2 + Math.cos(p * TAU) * W * orbit;
				const cy = H / 2 + Math.sin(p * TAU) * H * orbit * 0.8;
				const r = Math.min(W, H) * radius;
				m.globalCompositeOperation = 'destination-out';
				const g = m.createRadialGradient(cx, cy, 0, cx, cy, r);
				g.addColorStop(0, 'rgba(0,0,0,1)');
				g.addColorStop(1, 'rgba(0,0,0,0)');
				m.fillStyle = g;
				m.beginPath();
				m.arc(cx, cy, r, 0, TAU);
				m.fill();
				c.drawImage(mask, 0, 0);
			}
		},
		{
			id: 'reveal', name: 'Reveal',
			// 專屬設定：揭幕方向（0~360°）、速度（一圈內走幾趟）
			// 走法：窗口從畫面外掃進來把圖揭開 → 繼續往同方向掃出去，直到整張圖消失（一圈剛好一次循環）
			// 方向沿用滑入 slideIn 的規格（每 15° 一格）：0° 從左往右、90° 由上往下、180° 由右往左、
			// 270° 由下往上，其餘角度是斜向
			params: [
				{ key: 'angle', i18n: 'paramAngle', min: 0, max: 360, step: 15, def: 0, unit: '°' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const deg = (o && typeof o.angle === 'number') ? o.angle : 0;
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				const rad = (deg * Math.PI) / 180;
				const dx = Math.cos(rad);
				const dy = Math.sin(rad);
				// n 是方向轉 90°，拿它把邊線兩端拉到畫面外，clip 的多邊形才夠大
				const nx = -dy;
				const ny = dx;
				// 整張圖沿這個方向的投影範圍 [a, b]：a 是投影起點、b 是投影終點，b-a = span
				const span = Math.abs(dx) * W + Math.abs(dy) * H;
				const a = (W / 2 * dx + H / 2 * dy) - span / 2;
				const b = a + span;
				const raw = p * speed;
				let t = raw - Math.floor(raw);
				// 速度 1 且走到最後一格時要停在「已滑出」，否則 p=1 會被取餘數拉回 0
				if (speed === 1 && p >= 1) t = 1;
				// 一條跟圖一樣寬的「窗口」從畫面外掃進來、掃出去：
				// t=0 窗口還在外面（全空）→ t=0.5 窗口正好蓋住整張圖（全滿）→ t=1 窗口已掃出（全空）
				// 所以前半段是「揭幕進場」，後半段就是「繼續往同方向移動直到消失」
				const lo = a - span + t * span * 2;
				const hi = lo + span;
				const far = W + H;
				const q1x = lo * dx + nx * far, q1y = lo * dy + ny * far;
				const q2x = lo * dx - nx * far, q2y = lo * dy - ny * far;
				const q3x = hi * dx - nx * far, q3y = hi * dy - ny * far;
				const q4x = hi * dx + nx * far, q4y = hi * dy + ny * far;
				// 只畫窗口內的那一條（內容用 clip 裁掉窗外）
				c.save();
				c.beginPath();
				c.moveTo(q1x, q1y);
				c.lineTo(q2x, q2y);
				c.lineTo(q3x, q3y);
				c.lineTo(q4x, q4y);
				c.closePath();
				c.clip();
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
				// 正在移動的那一條邊（前半段是入口線、後半段是出口線）畫淡粉色
				c.save();
				c.strokeStyle = 'rgba(212,112,138,0.9)';
				c.lineWidth = 2;
				[[lo, q1x, q1y, q2x, q2y], [hi, q4x, q4y, q3x, q3y]].forEach(function (e) {
					// 邊線跑到圖外面就不用畫了，否則會在空白處多出一條粉線
					if (e[0] <= a || e[0] >= b) return;
					c.beginPath();
					c.moveTo(e[1], e[2]);
					c.lineTo(e[3], e[4]);
					c.stroke();
				});
				c.restore();
			}
		},
		{
			id: 'matrixRain', name: 'Matrix Rain',
			// 專屬設定：字元大小、流速、密度（有字的欄位比例）、黑底濃度
			// 【這支在模仿什麼】經典「數碼雨」：每欄是一條往下掉的字串，
			//   字頭最亮、往上每一列都比下一列暗一階，字元停在自己那一列等新字頭壓過去。
			//   所以「殘影」是這支特效的靈魂——只畫一顆亮點往下飄，看起來就只是下綠雨，不像數碼雨。
			// 【為什麼不用「上一格蓋半透明黑」的累積寫法】原始做法（也最像）要記住上一格的畫面，
			//   可是我們每一格都是獨立算出來的：預覽可以隨便跳格、送出後 APNG 也會重排播放，
			//   一旦某格沒接到前一格，殘影就會整條消失。所以改成「用算式直接把殘影畫出來」：
			//   每一列（螢幕上的字行）都畫字，亮度依它離字頭幾列衰減，字元用雜湊(欄, 列)固定住，
			//   看起來跟累積一模一樣，但每一格都自給自足，跳格也不會突然空白。
			params: [
				{ key: 'size', i18n: 'paramSize', min: 6, max: 36, step: 2, def: 16, unit: 'px' },
				{ key: 'speed', i18n: 'paramSpeed', min: 0.3, max: 2, step: 0.1, def: 1 },
				{ key: 'density', i18n: 'paramDensity', min: 10, max: 100, step: 5, def: 100, unit: '%' },
				// 黑底濃度：0% = 完全透明（原圖整張透出來），50% = 壓暗一半
				// 預設 0，跟其他特效的「預設不蓋底」一致；要經典那種黑底自己往上拉
				{ key: 'bgDark', i18n: 'paramBgDensity', min: 0, max: 50, step: 5, def: 0, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const fs = Math.max(6, Math.round((o && typeof o.size === 'number') ? o.size : 16));
				const speedMul = (o && typeof o.speed === 'number') ? o.speed : 1;
				const density = ((o && typeof o.density === 'number') ? o.density : 100) / 100;
				const bgDark = ((o && typeof o.bgDark === 'number') ? o.bgDark : 0) / 100;
				c.drawImage(baseCanvas, 0, 0);
				// 黑底是可選的：拉 0 就是完全不蓋（原圖清楚、綠字浮在上面），
				// 拉高才把那層黑壓上去，綠字才有「自己會發光」的錯覺
				if (bgDark > 0) {
					c.fillStyle = 'rgba(0,0,0,' + bgDark.toFixed(3) + ')';
					c.fillRect(0, 0, W, H);
				}

				// 字距就是一格字的大小（參考碼也是拿 font_size 當欄寬、行高）
				const lineH = Math.max(6, fs * 1.05);
				const rows = Math.ceil(H / lineH) + 1;          // 畫面能容納幾列字
				const cols = Math.max(1, Math.floor(W / fs));    // 幾欄雨
				// 尾巴長度＝畫面上過半的列數（至少 8 列）。太短就只是一串綠點，
				// 拉長到這種程度才會有原版「整條字串往下掉、上面還留著舊字」的厚度
				const tail = Math.max(8, Math.round(rows * 0.55));
				// 流速：p 從 0 走到 1 要掉完幾趟。圈數取整數，接回第一格時才不會跳格
				const cycles = Math.max(1, Math.round(speedMul * 2));
				// 字元集沿用參考碼那串漢字；找不到漢字的機器會退回系統字型，不會變豆腐塊之外的東西
				const CHARS = '田由甲申甴电甶男甸甹町画甼甽甾甿畀畁畂畃畄畅畆畇畈畉畊畋界畍畎畏畐畑';
				c.font = fs + 'px monospace';
				c.textBaseline = 'top';

				for (let col = 0; col < cols; col++) {
					// 密度：用欄號當雜湊抽掉整欄（抽掉的欄不消耗亂數，調密度時別欄不會跟著亂跳）
					if (((col * 37) % 100) / 100 >= density) continue;

					// 每欄的起始相位用欄號打散，看起來才是滿天雨、而不是整排一起掉
					const phase = ((col * 61) % 100) / 100;
					const headF = (phase + p * cycles) % 1;                 // 0→1 ＝ 從頂掉到底
					const headRow = Math.floor(headF * (rows + tail)) - tail;  // 字頭在第幾列（負值＝還在畫面上方）
					const headX = col * fs;

					for (let d = 0; d < tail; d++) {
						const row = headRow - d;
						if (row < 0 || row > rows) continue;
						const y = row * lineH;
						// d = 0 是字頭：最亮；往上每一列少一點亮度，尾端留一點微光＝殘影
						const fade = 1 - d / tail;
						const a = (0.16 + 0.84 * fade) * (0.45 + 0.55 * k);
						if (d === 0) {
							// 字頭偏白綠，像剛被寫上去、還沒暗掉的那一顆
							c.fillStyle = 'rgba(224,255,228,' + Math.min(1, 0.7 + 0.3 * k).toFixed(3) + ')';
						} else {
							c.fillStyle = 'rgba(64,255,136,' + a.toFixed(3) + ')';
						}
						// 字元用 (欄, 列) 當種子：字會穩穩停在那一列等字頭壓過來，這才是殘影該有的樣子
						let s = (col * 92821 + row * 68917) % 233280;
						s = (s * 9301 + 49297) % 233280;
						c.fillText(CHARS.charAt(Math.floor((s / 233280) * CHARS.length)), headX, y);
					}
				}
			}
		},
		{
			id: 'kaleidoscope', name: 'Kaleidoscope',
			// 專屬設定：切片數、旋轉圈數（整圈，1 圈才接得回開頭）、強度（疊得透不透）
			// 舊版固定 6 片、轉 0.2 圈（0.2 圈結尾會停在 72°，接不回第一格），
			// 所以圈數只給整數：1 圈＝結尾 360°＝開頭 0°，循環無縫
			params: [
				{ key: 'slices', i18n: 'paramSlices', min: 2, max: 12, step: 1, def: 6 },
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'strength', i18n: 'paramStrength', min: 30, max: 100, step: 5, def: 90, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const slices = Math.round((o && typeof o.slices === 'number') ? o.slices : 6);
				// 圈數取整，避免 0.2 圈那種「結尾差 72°」的跳格
				const turns = Math.max(1, Math.round((o && typeof o.turns === 'number') ? o.turns : 1));
				const strength = ((o && typeof o.strength === 'number') ? o.strength : 90) / 100;
				c.save();
				c.translate(W / 2, H / 2);
				c.rotate(p * TAU * turns);
				const n = Math.max(2, slices);
				// 強度 90 等於舊版的 0.55~0.9（k=0 偏淡、k=1 疊到最滿）
				c.globalAlpha = strength * (0.6 + 0.4 * k);
				for (let j = 0; j < n; j++) {
					c.save();
					c.rotate(j * TAU / n);
					c.scale(1, j % 2 ? -1 : 1);
					c.drawImage(baseCanvas, -W / 2, -H / 2);
					c.restore();
				}
				c.restore();
			}
		},
		{
			id: 'dissolve', name: 'Dissolve',
			// 專屬設定：顆粒大小、消散密度
			// 一輪是「完整圖 → 方塊一塊塊崩解 → 畫面全空 → 方塊由少到多拼回來 → 完整圖」，
			// 頭尾都是完整圖，APNG 循環時看不到接縫
			params: [
				{ key: 'size', i18n: 'paramGrainSize', min: 4, max: 40, step: 2, def: 16, unit: 'px' },
				{ key: 'density', i18n: 'paramDensity', min: 10, max: 100, step: 5, def: 50, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const block = Math.max(2, Math.round((o && typeof o.size === 'number') ? o.size : 16));
				const density = ((o && typeof o.density === 'number') ? o.density : 50) / 100;
				// 一去一回：sin 正半波 p=0 是 0、p=0.5 是 1（全空）、p=1 又回到 0，頭尾接得回完整圖
				const phase = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
				// 密度改的是「崩解得急不急」：密度低 → 指數大 → 前期慢慢掉、後期才成片消失；
				// 密度高 → 指數小 → 一下子就崩掉大半。phase = 1 時任何密度都會剛好全空
				// （p 剛好是 0 或 1 時 sin 會留下 1e-16 的浮點尾巴，先壓成 0，頭尾才會是完整圖）
				const gone = phase < 1e-6 ? 0 : Math.pow(phase, 1 / (0.5 + density));
				// 用座標雜湊當順序（不用每格亂數），方塊才會穩定消失而不是閃爍
				for (let y = 0; y < H; y += block) {
					for (let x = 0; x < W; x += block) {
						const v = ((Math.floor(x / block) * 73 + Math.floor(y / block) * 151) % 997) / 997;
						if (v >= gone) {
							const bw = Math.min(block, W - x);
							const bh = Math.min(block, H - y);
							c.drawImage(baseCanvas, x, y, bw, bh, x, y, bw, bh);
						}
					}
				}
			}
		},
		{
			id: 'heartbeat', name: 'Heartbeat',
			// 專屬設定：幅度、節拍間隔（兩下之間的距離）、循環次數
			// 每輪兩下（第二下比較輕，跟真的心跳一樣「咚—咚」），位置固定在週期開頭的 12%
			params: [
				{ key: 'amp', i18n: 'paramAmplitude', min: 2, max: 20, step: 1, def: 9, unit: '%' },
				{ key: 'gap', i18n: 'paramBeatGap', min: 10, max: 40, step: 2, def: 24, unit: '%' },
				{ key: 'cycles', i18n: 'paramCycles', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const amp = ((o && typeof o.amp === 'number') ? o.amp : 9) / 100;
				const gap = ((o && typeof o.gap === 'number') ? o.gap : 24) / 100;
				const cycles = Math.round((o && typeof o.cycles === 'number') ? o.cycles : 1);
				const cycLen = 1 / cycles;
				// 換算成「這一輪內的進度」，高斯才知道每一拍落在哪裡（多圈時每圈都會重播同一個節拍）
				const t = (((p % cycLen) + cycLen) % cycLen) / cycLen;
				const beat = function (frac) {
					const d = t - frac;
					return Math.exp(-(d * d) / 0.006);
				};
				// 第一下全力、第二下 0.6 倍，間隔可調
				const pulse = Math.max(beat(0.12), 0) + 0.6 * Math.max(beat(0.12 + gap), 0);
				centerScale(c, 1 + amp * k * pulse);
			}
		},
		{
			id: 'oldTV', name: 'Old TV',
			// 專屬設定：掃描線強度、滾動亮帶、畫面抖動、降飽和
			// 原 scanLines 已併進來（掃描線＋滾動亮帶本來就是這支的一部分），
			// 把抖動與降飽和調到 0 就幾乎等於原本的掃描線
			params: [
				{ key: 'scan', i18n: 'paramScanStrength', min: 0, max: 40, step: 1, def: 25, unit: '%' },
				{ key: 'roll', i18n: 'paramRollBand', min: 0, max: 30, step: 1, def: 12, unit: '%' },
				{ key: 'jitter', i18n: 'paramJitter', min: 0, max: 6, step: 1, def: 2, unit: 'px' },
				{ key: 'desat', i18n: 'paramDesat', min: 0, max: 50, step: 1, def: 25, unit: '%' }
			],
			draw: function (c, p, k, i, o) {
				const scan = ((o && typeof o.scan === 'number') ? o.scan : 25) / 100;
				const rollPct = ((o && typeof o.roll === 'number') ? o.roll : 12) / 100;
				const jitter = (o && typeof o.jitter === 'number') ? o.jitter : 2;
				const desat = ((o && typeof o.desat === 'number') ? o.desat : 25) / 100;
				const r = rnd(i * 31 + 17);
				c.save();
				c.translate((r() * 2 - 1) * jitter * k, 0);
				c.filter = 'saturate(' + (1 - desat * k).toFixed(3) + ') brightness(' + (1 + 0.05 * k).toFixed(3) + ')';
				c.drawImage(baseCanvas, 0, 0);
				c.restore();
				// 掃描線與滾動亮帶都是「貼在畫面上」的一層，跟原圖的透明區無關；
				// 直接畫上去的話，去背後的空白處會多出滿版黑線、亮帶也會在空白處閃。
				// source-atop = 只畫在「畫布已經有東西」的像素上（這裡就是底圖的不透明處），
				// 而且它會保留目的端的 alpha（不像 destination-in 會把 alpha 乘第二次、
				// 讓半透明的羽邊變得更透），所以邊緣跟原圖一模一樣，也不必另外開遮罩畫布。
				c.save();
				c.globalCompositeOperation = 'source-atop';
				// 掃描線（強度 0 就不畫，整片留給底圖）
				if (scan > 0) {
					c.fillStyle = 'rgba(0,0,0,' + (scan * k).toFixed(3) + ')';
					for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
				}
				// 滾動亮帶（強度 0 就不畫）
				if (rollPct > 0) {
					const roll = ((p * 1.2) % 1) * H;
					const g = c.createLinearGradient(0, roll - 20, 0, roll + 20);
					g.addColorStop(0, 'rgba(255,255,255,0)');
					g.addColorStop(0.5, 'rgba(255,255,255,' + (rollPct * k).toFixed(3) + ')');
					g.addColorStop(1, 'rgba(255,255,255,0)');
					c.fillStyle = g;
					c.fillRect(0, roll - 20, W, 40);
				}
				c.restore();
			}
		},
		{
			id: 'confettiBurst', name: 'Confetti Burst',
			// 專屬設定：紙片數量、紙片大小、落下速度
			// 舊版是 24~60 片、寬 4~10px 高 3~8px、速度 0.5~1.7，預設值就是舊版（強度 k 會再微調片數）
			params: [
				{ key: 'count', i18n: 'paramCount', min: 10, max: 90, step: 5, def: 60 },
				{ key: 'size', i18n: 'paramSize', min: 3, max: 14, step: 1, def: 6, unit: 'px' },
				{ key: 'speed', i18n: 'paramSpeed', min: 0.4, max: 2, step: 0.1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const count = Math.round((o && typeof o.count === 'number') ? o.count : 60);
				const size = (o && typeof o.size === 'number') ? o.size : 6;
				const speedMul = (o && typeof o.speed === 'number') ? o.speed : 1;
				c.drawImage(baseCanvas, 0, 0);
				const palette = ['#ff5c8a', '#ffd166', '#43d9ad', '#4d96ff', '#c77dff', '#ff8fab'];
				// 強度越高片數越多（k=0 是六成、k=1 是全部）
				const n = Math.max(4, Math.round(count * (0.6 + 0.4 * k)));
				for (let j = 0; j < n; j++) {
					const r = rnd(j * 97 + 5);
					const x0 = r() * W;
					const speed = (0.5 + r() * 1.2) * speedMul;
					const y = ((r() * 0.6 + p * speed) % 1.2) * H - H * 0.1;
					// 大小 6px 是基準，換算成倍率去縮放每片的長寬
					const sc = size / 6;
					const w = (4 + r() * 6) * sc;
					const h = (3 + r() * 5) * sc;
					const rot = p * TAU * (1 + r() * 2) + r() * TAU;
					c.save();
					c.translate(x0 + Math.sin(p * TAU + r() * 6) * W * 0.02, y);
					c.rotate(rot);
					c.fillStyle = palette[j % palette.length];
					c.globalAlpha = 0.9;
					c.fillRect(-w / 2, -h / 2, w, h);
					c.restore();
				}
			}
		},
		{
			id: 'sliceSplit', name: 'Slice Split',
			// 專屬設定：切割數量、切割方向（跟滑入共用同一支角度滑桿）、移動速度
			// 切線一律「垂直於移動方向」，所以方向 0°（向右）時就是橫向切成一條條、
			// 一條往右一條往左各自飄出畫面；90°（向下）則變成直向切片往上／下分開。
			// 一輪是「完整圖 → 撕開飛散 → 畫面全空 → 各自原路飛回 → 拼回完整圖」，
			// 所以頭尾都是貼齊的狀態，APNG 循環時看不到接縫
			params: [
				{ key: 'cuts', i18n: 'paramCuts', min: 1, max: 20, step: 1, def: 8 },
				{ key: 'angle', i18n: 'paramAngle', min: 0, max: 360, step: 15, def: 0, unit: '°' },
				{ key: 'speed', i18n: 'paramSpeed', min: 1, max: 3, step: 1, def: 1 }
			],
			draw: function (c, p, k, i, o) {
				const cuts = Math.max(1, Math.round((o && typeof o.cuts === 'number') ? o.cuts : 8));
				const deg = (o && typeof o.angle === 'number') ? o.angle : 0;
				const speed = Math.round((o && typeof o.speed === 'number') ? o.speed : 1);
				const rad = (deg * Math.PI) / 180;
				const dx = Math.cos(rad);
				const dy = Math.sin(rad);
				// 一去一回的包絡：p=0 貼齊 → p=0.5 全部飛散（畫面全空）→ p=1 拼回原位。
				// 先取 sin 的正半波（頭尾都剛好是 0），再平方讓「完整圖」的時間多一點、
				// 飛散的時間集中在中段；速度越大指數越小 → 起步衝、中段停留短
				const base = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
				const q = Math.pow(base, 2 / speed);
				// 沿這個方向要移動多遠才算完全離開畫布（斜向時取兩軸投影相加）
				const span = Math.abs(dx) * W + Math.abs(dy) * H;
				const travel = span * 1.12 + 8;
				c.save();
				// 先把移動方向轉到 +x：轉完之後「沿 y 疊起來的橫帶」就是切片，
				// 每一條再各自沿 x 往正／負兩邊推出去
				c.translate(W / 2, H / 2);
				c.rotate(Math.atan2(dy, dx));
				c.translate(-W / 2, -H / 2);
				for (let s = 0; s < cuts; s++) {
					// 用取整的邊界切，避免分數像素在切片之間留一條透明縫
					const y0 = Math.round((s * H) / cuts);
					const y1 = Math.round(((s + 1) * H) / cuts);
					const bandH = y1 - y0;
					if (bandH <= 0) continue;
					const off = (s % 2 === 0 ? 1 : -1) * q * travel;
					c.save();
					c.beginPath();
					c.rect(0, y0, W, bandH);
					c.clip();
					c.drawImage(baseCanvas, off, 0);
					c.restore();
				}
				c.restore();
			}
		},
		{
			id: 'comic', name: 'Comic Ink',
			// 專屬設定：精細度（取樣多密＝線條多細）、線條粗細、墨色濃度、底色
			// 走法是一去一回：原圖 → 慢慢只剩線稿 → 停留一下 → 慢慢回到原圖，
			// 中段會有一段「完全是漫畫線稿」的停留，循環頭尾都是原圖所以看不到接縫
			params: [
				{ key: 'detail', i18n: 'paramDetail', min: 1, max: 20, step: 1, def: 10 },
				{ key: 'lineWidth', i18n: 'paramLineWidth', min: 1, max: 8, step: 1, def: 2, unit: 'px' },
				{ key: 'ink', i18n: 'paramInk', min: 30, max: 100, step: 5, def: 100, unit: '%' },
				{
					key: 'paper', i18n: 'paramPaper', type: 'select', def: 'transparent',
					options: [{ v: 'transparent', i18n: 'paperTransparent' }, { v: 'white', i18n: 'paperWhite' }]
				}
			],
			draw: function (c, p, k, i, o) {
				const detail = Math.max(1, Math.round((o && typeof o.detail === 'number') ? o.detail : 10));
				const lw = Math.max(1, Math.round((o && typeof o.lineWidth === 'number') ? o.lineWidth : 2));
				const ink = ((o && typeof o.ink === 'number') ? o.ink : 100) / 100;
				const paper = (o && o.paper === 'white') ? 'white' : 'transparent';
				// 精細度越高 → 門檻越低 → 越多淡邊也被抓成線（細節多）；1 只留最明顯的大輪廓
				// 範圍 1~20（等於把原本 1~10 再細一倍），門檻每格 ×0.9 等比下降（55 → 21 → 7）
				// 55 剛好只留主輪廓、10（預設）連柔和照片都會出一組完整線條、20 連很淡的漸層都抓得到
				const threshold = 55 * Math.pow(0.9, detail - 1);
				// 一去一回，放大 1.6 倍後夾在 1 以內：中段（大約 p=0.2~0.8）整段停在「純線稿」
				// （p 剛好 0／1 時 sin 會留 1e-16 的浮點尾巴，先壓成 0，頭尾才是乾淨的原圖）
				let q = Math.min(1, Math.sin(Math.PI * Math.min(1, Math.max(0, p))) * 1.6);
				if (q < 1e-6) q = 0;
				// 白紙：只在「已經開始變漫畫」之後才鋪，並且跟著進度淡入，開頭才不會突然一片白
				if (paper === 'white' && q > 0) {
					c.save();
					c.globalAlpha = q;
					c.fillStyle = '#ffffff';
					c.fillRect(0, 0, W, H);
					c.restore();
				}
				// 原圖慢慢淡出（q=0 是完整的原圖，q=1 完全不見）
				if (q < 1) {
					c.save();
					c.globalAlpha = 1 - q;
					c.drawImage(baseCanvas, 0, 0);
					c.restore();
				}
				// 線稿遮罩只算一次，之後每一格只做一次 drawImage（記在配方物件上，
				// 換圖、換尺寸、換線條粗細或精細度才重算）
				const key = W + 'x' + H + '#' + lw + '@' + threshold;
				if (!this._inkMask || this._inkKey !== key || this._inkSrc !== baseCanvas) {
					this._inkMask = comicInkMask(lw, threshold);
					this._inkKey = key;
					this._inkSrc = baseCanvas;
				}
				if (q > 0 && ink > 0) {
					c.save();
					c.globalAlpha = q * ink;
					c.drawImage(this._inkMask, 0, 0);
					c.restore();
				}
			}
		},
		{
			id: 'cubeSpin', name: 'Cube Spin',
			// 3D 方塊旋轉：把輸入圖貼在立方體六個面，整顆方塊沿指定軸轉整圈
			// ・畫法是自己寫的最小 3D：八個角點做 Rodrigues 軸角旋轉，再正交投影回 2D。
			// 　刻意不做透視——正交投影後每個面都還是「平行四邊形」，一個仿射矩陣
			// 　（setTransform）就能把整張正方形貼圖精準鋪滿，不必切成兩顆三角形慢慢拼
			// 　（切三角形做透視貼圖會在對角線留一道接縫，1px 的縫在 40 格循環裡很明顯）
			// ・頭尾相接：角度 = 2π × 圈數 × p，p 走到 1 剛好是整圈，
			// 　所以下一輪的第 0 格與這一輪的第 0 格是同一個畫面，APNG 循環播放看不到接縫。
			// 　圈數只收整數就是為了這個（1.5 圈會停在背面，一循環就跳回正面）
			// ・背面剔除：旋轉後法向量的 z ≤ 0 一律不畫（畫了會蓋在正面上面），
			// 　剩下面再依深度由遠到近排，交疊處才會是近的壓在遠的上面
			// ・貼圖：六面都是正方形，所以先把原圖置中裁成正方形再貼，寬圖不會被壓扁
			params: [
				{
					key: 'axis', i18n: 'paramSpinAxis', type: 'select', def: 'random',
					options: [
						{ v: 'random', i18n: 'axisRandom' },
						{ v: 'x', i18n: 'axisX' },
						{ v: 'y', i18n: 'axisY' },
						{ v: 'z', i18n: 'axisZ' },
						{ v: 'tilt', i18n: 'axisTilt' }
					]
				},
				{ key: 'turns', i18n: 'paramTurns', min: 1, max: 3, step: 1, def: 1 },
				{ key: 'size', i18n: 'paramSize', min: 30, max: 90, step: 5, def: 70, unit: '%' },
				{ key: 'edge', i18n: 'paramEdge', min: 0, max: 4, step: 0.5, def: 2, unit: 'px' },
				{ key: 'shade', i18n: 'paramShade', min: 0, max: 100, step: 5, def: 70, unit: '%' },
				{
					key: 'bg', i18n: 'paramBg', type: 'select', def: 'transparent',   // 預設不畫底，保留透明
					options: [{ v: 'transparent', i18n: 'bgTransparent' }, { v: 'dim', i18n: 'bgDim' }]
				}
			],
			draw: function (c, p, k, i, o) {
				const axisMode = (o && o.axis) || 'random';
				const turns = Math.max(1, Math.round((o && typeof o.turns === 'number') ? o.turns : 1));
				const sizePct = Math.max(10, Math.min(95, (o && typeof o.size === 'number') ? o.size : 70));
				const edgeW = Math.max(0, (o && typeof o.edge === 'number') ? o.edge : 2);
				const shadePct = Math.max(0, Math.min(100, (o && typeof o.shade === 'number') ? o.shade : 70));
				const bg = (o && o.bg === 'transparent') ? 'transparent' : 'dim';

				// 背景：預設「透明」——完全不畫底，畫面上只有方塊本身，
				// 不會出現原圖被壓暗後的重影，送去 APNG 頁也方便去背、疊別的底圖；
				// 需要「方塊浮在原圖上」的舊感覺時，把選單切回「暗化原圖」即可
				if (bg === 'dim') {
					c.save();
					c.globalAlpha = 0.85;
					c.drawImage(baseCanvas, 0, 0);
					c.restore();
					c.save();
					c.fillStyle = 'rgba(16,10,20,0.58)';
					c.fillRect(0, 0, W, H);
					c.restore();
				}

				// 貼圖：置中裁成正方形，換圖或換輸出尺寸才重做一次，之後每格只做六次 drawImage
				const texSize = Math.min(W, H);
				const texKey = W + 'x' + H;
				if (!this._tex || this._texKey !== texKey || this._texSrc !== baseCanvas) {
					const tex = mkCanvas(texSize, texSize);
					tex.getContext('2d').drawImage(
						baseCanvas,
						(W - texSize) / 2, (H - texSize) / 2, texSize, texSize,   // 來源：中央正方形
						0, 0, texSize, texSize                                     // 目的：整張貼圖
					);
					this._tex = tex;
					this._texKey = texKey;
					this._texSrc = baseCanvas;
				}
				const tex = this._tex;

				// 轉軸（單位向量）：整段動畫必須共用同一支軸。
				// 「隨機」只在參數變動時抽一次並記在配方物件上——如果每格重抽，
				// 雖然頭尾角度都回到 0°，但整段路徑會前後不一致，看起來像畫面在亂抖
				let ax = 0, ay = 1, az = 0;
				if (axisMode === 'x') { ax = 1; ay = 0; az = 0; }
				else if (axisMode === 'y') { ax = 0; ay = 1; az = 0; }
				else if (axisMode === 'z') { ax = 0; ay = 0; az = 1; }
				else if (axisMode === 'tilt') { ax = 0.5773; ay = 0.5773; az = 0.5773; }
				else {
					const sig = turns + '#' + sizePct + '#' + edgeW + '#' + (o && o.bg);
					if (!this._cubeAxis || this._cubeSig !== sig) {
						const r = rnd((Date.now() % 233280) + turns * 37 + sizePct);
						let x = r() * 2 - 1, y = r() * 2 - 1, z = r() * 2 - 1;
						let len = Math.sqrt(x * x + y * y + z * z);
						// 抽到太短的向量（幾乎貼著原點）就換一支固定斜軸，免得旋轉軸退化
						if (len < 0.25) { x = 0.72; y = 0.45; z = 0.53; len = Math.sqrt(x * x + y * y + z * z); }
						this._cubeAxis = [x / len, y / len, z / len];
						this._cubeSig = sig;
					}
					ax = this._cubeAxis[0]; ay = this._cubeAxis[1]; az = this._cubeAxis[2];
				}

				// 整圈：p=0 是 0°、p=1 是 360°×圈數（等同 0°），所以循環頭尾同一個畫面
				const angle = Math.PI * 2 * turns * p;
				const ct = Math.cos(angle), st = Math.sin(angle), om = 1 - ct;

				// 縮放：立方體八個角點離中心 √3（半徑 1 的方塊對角線的一半），
				// 最壞情況是某個角點剛好躺在畫面平面上（z=0），投影距離就是滿滿的 √3。
				// 除上 2√3 之後，任何角度、任何圈數都不會超出「大小」設定的框（不會被畫布切掉）
				const s = (sizePct / 100) * Math.min(W, H) / (2 * Math.sqrt(3));
				const ox = W / 2, oy = H / 2;

				// Rodrigues 軸角旋轉：v' = v cosθ + (k × v) sinθ + k(k·v)(1-cosθ)
				function spinVector(vx, vy, vz) {
					const dot = ax * vx + ay * vy + az * vz;
					const crossX = ay * vz - az * vy;
					const crossY = az * vx - ax * vz;
					const crossZ = ax * vy - ay * vx;
					return [
						vx * ct + crossX * st + ax * dot * om,
						vy * ct + crossY * st + ay * dot * om,
						vz * ct + crossZ * st + az * dot * om
					];
				}

				// 收面：跳過背面、算四個角的螢幕座標（y 軸要反過來，3D 的 +y 是往上）
				const faces = [];
				const quadrant = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
				for (let f = 0; f < CUBE_FACES.length; f++) {
					const fc = CUBE_FACES[f];
					const rn = spinVector(fc.n[0], fc.n[1], fc.n[2]);
					if (rn[2] <= 0.01) continue;   // 背對觀眾（或側到幾乎成一直線）的面不畫

					const pts = [];
					let depth = 0;
					for (let q = 0; q < 4; q++) {
						const su = quadrant[q][0], sv = quadrant[q][1];
						const vx = fc.n[0] + su * fc.u[0] + sv * fc.v[0];
						const vy = fc.n[1] + su * fc.u[1] + sv * fc.v[1];
						const vz = fc.n[2] + su * fc.u[2] + sv * fc.v[2];
						const rv = spinVector(vx, vy, vz);
						pts.push([ox + rv[0] * s, oy - rv[1] * s]);
						depth += rv[2];
					}
					faces.push({ pts: pts, n: rn, depth: depth / 4 });
				}
				faces.sort(function (a, b) { return a.depth - b.depth; });   // 遠的先畫

				// 光源（左上偏前）：讓三個面有亮暗差，方塊的立體感才會出來
				const LX = -0.48, LY = 0.56, LZ = 0.67;

				for (let f = 0; f < faces.length; f++) {
					const face = faces[f];
					const p0 = face.pts[0], p1 = face.pts[1], p3 = face.pts[3];

					// 貼圖：p0 是原點，p0→p1 是貼圖的 x 方向、p0→p3 是 y 方向，
					// 除以 texSize 就是把「0～texSize 的像素座標」對到這個平行四邊形
					const ux = p1[0] - p0[0], uy = p1[1] - p0[1];
					const vx = p3[0] - p0[0], vy = p3[1] - p0[1];
					c.save();
					c.setTransform(ux / texSize, uy / texSize, vx / texSize, vy / texSize, p0[0], p0[1]);
					c.drawImage(tex, 0, 0);
					c.restore();

					// 明暗：面越背光越暗。強度滑桿決定陰影的輕重，拉到 0 就是六面同亮
					if (shadePct > 0 && k > 0) {
						const lum = face.n[0] * LX + face.n[1] * LY + face.n[2] * LZ;
						const dark = Math.min(0.85, (shadePct / 100) * k * 0.62 * (1 - (lum * 0.5 + 0.5)));
						if (dark > 0.008) {
							c.save();
							c.beginPath();
							c.moveTo(p0[0], p0[1]);
							c.lineTo(p1[0], p1[1]);
							c.lineTo(face.pts[2][0], face.pts[2][1]);
							c.lineTo(p3[0], p3[1]);
							c.closePath();
							c.fillStyle = 'rgba(0,0,0,' + dark.toFixed(3) + ')';
							c.fill();
							c.restore();
						}
					}

					// 邊線：深色底上一圈細白線，三個面的交界才看得出來是一顆方塊
					if (edgeW > 0) {
						c.save();
						c.beginPath();
						c.moveTo(p0[0], p0[1]);
						c.lineTo(p1[0], p1[1]);
						c.lineTo(face.pts[2][0], face.pts[2][1]);
						c.lineTo(p3[0], p3[1]);
						c.closePath();
						c.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * k).toFixed(3) + ')';
						c.lineWidth = edgeW;
						c.lineJoin = 'round';
						c.stroke();
						c.restore();
					}
				}
			}
		},
		{
			id: 'fireworks', name: 'Fireworks',
			// 煙火：把使用者提供的那份「滑鼠煙火」精簡成「不需互動、不靠上一格」的版本
			// 【為什麼可以不留狀態】原作靠 destination-out 每格擦一層半透明黑來留殘影，是因為它要一直跑下去；
			//   我們只需要跑一輪，而每顆火花從出生那一刻起，軌跡就是固定的（方向＋初速＋摩擦＋重力），
			//   所以「這一瞬間它在哪、前幾步又在哪」全部可以反推出來——拖尾就是沿著自己的軌跡
			//   往回取幾個舊位置連成折線。於是每一格都自給自足：預覽可以亂跳格，
			//   送去 APNG 頁重排播放時也不會出現「殘影突然斷掉」的格子。
			// 【循環怎麼接得上】每一發煙火有自己的發射時刻 p0，看的是 u = (p - p0) mod 1；
			//   超出壽命的就跳過。這樣「尾端才出生的那幾發」會跨過循環點繼續燒，
			//   播到最後一格接回第一格時不會整片突然消失。
			// 【升空段已移除】使用者指定只保留爆炸，所以沒有火箭從底部衝上去、
			//   也沒有原作那個脈動的目標小圈（改成爆炸瞬間往外擴的細光環）。
			params: [
				{ key: 'bursts', i18n: 'paramBursts', min: 3, max: 12, step: 1, def: 6 },
				{ key: 'sparks', i18n: 'paramSparks', min: 10, max: 60, step: 5, def: 30 },
				{ key: 'radius', i18n: 'paramRadius', min: 10, max: 60, step: 5, def: 30, unit: '%' },
				{ key: 'bgDark', i18n: 'paramBgDensity', min: 0, max: 50, step: 5, def: 0, unit: '%' },
				{
					key: 'layer', i18n: 'paramLayer', type: 'select', def: 'front',
					options: [
						{ v: 'front', i18n: 'fwFront' },
						{ v: 'back', i18n: 'fwBack' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				const bursts = Math.round((o && typeof o.bursts === 'number') ? o.bursts : 6);
				const sparkN = Math.round((o && typeof o.sparks === 'number') ? o.sparks : 30);
				const radPct = ((o && typeof o.radius === 'number') ? o.radius : 30) / 100;
				const bgDark = ((o && typeof o.bgDark === 'number') ? o.bgDark : 0) / 100;
				const layer = (o && o.layer) ? o.layer : 'front';
				const R = Math.min(W, H) * radPct;   // 火花最遠能飛多遠（＝爆炸半徑）
				const LIFE = 0.55;                   // 一發煙火活多久（佔一輪的比例）
				const TAIL = 4;                      // 拖尾往回取幾個舊位置（連頭共 5 個點）

				// 畫煙火本體：整層用加法混合（lighter），火花重疊的地方會自己變亮，這才是煙火的感覺
				// （用一般的 source-over 疊上去只會一顆顆平貼在畫面上，沒有光）
				const paintFireworks = function () {
					c.save();
					c.globalCompositeOperation = 'lighter';
					c.lineCap = 'round';
					for (let b = 0; b < bursts; b++) {
						// 每一發的中心點與發射時刻都用「固定種子」算：同一輪每一格都一樣，循環時也一樣
						const g = rnd(b * 101 + 17);
						const cx = W * (0.2 + 0.6 * g());
						const cy = H * (0.24 + 0.48 * g());
						// 色相：每一發錯開一圈（137 是為了不要剛好繞回同一個角度），
						// 一整輪看下來是彩虹色，而不是每發都同一種綠
						const hue = Math.round((b * 137) % 360);
						const p0 = (b + 0.15 + 0.25 * g()) / bursts;   // 這一發在第幾成的一輪時間點炸開
						let u = (p - p0) % 1;
						if (u < 0) u += 1;    // p 還沒走到 p0 時，看到的其實是「上一輪」的那一發
						if (u > LIFE) continue;   // 這一發已經燒完，這一格不畫
						const age = u / LIFE;     // 0 = 剛炸開、1 = 燒完

						// 炸開瞬間往外擴的細光環（原作是目標小圈，這裡改成爆炸的衝擊環）
						if (age < 0.22) {
							const ring = Math.max(1, R * 0.14 * (age / 0.22));
							const ra = 0.55 * (1 - age / 0.22) * (0.4 + 0.6 * k);
							c.strokeStyle = 'hsla(' + hue + ',100%,80%,' + ra.toFixed(3) + ')';
							c.lineWidth = 1;
							c.beginPath();
							c.arc(cx, cy, ring, 0, TAU);
							c.stroke();
						}

						for (let s = 0; s < sparkN; s++) {
							// 每顆火花的方向、初速、色相抖動、亮度都用固定種子，所以每一格的軌跡都是同一條
							const gs = rnd(b * 613 + s * 37 + 5);
							const ang = TAU * gs();               // 往哪個方向飛
							const spd = 0.45 + 0.55 * gs();       // 飛多遠（相對最大半徑）
							const hueJ = hue + (gs() * 36 - 18);  // 色相抖一點，才不會整顆同一個顏色
							const bright = 55 + 25 * gs();        // 亮度（%）

							// 飛散距離用 1-(1-age)^2：剛炸開衝得很快、後面越來越慢，
							// 這個形狀剛好等於原作的「每格速度乘上 friction」
							// 重力另外加上去（age^2 往下掉），火花最後會垂頭、不是筆直飛出去
							const fly = R * spd * (1 - (1 - age) * (1 - age));
							const drop = R * 0.5 * spd * age * age;
							const dx = Math.cos(ang);
							const dy = Math.sin(ang);
							const hx = cx + dx * fly;
							const hy = cy + dy * fly + drop;

							// 拖尾：同一條軌跡往回取幾個舊位置，一段一段畫（越舊越暗、越細）
							// 這是「反推過去」而不是「記住上一格」，所以跳格也不會斷
							let px = hx, py = hy;
							for (let t = 1; t <= TAIL; t++) {
								const a2 = age - t * 0.06;
								if (a2 <= 0) break;   // 這顆火花還沒飛那麼久，尾巴就到頭為止
								const f2 = R * spd * (1 - (1 - a2) * (1 - a2));
								const d2 = R * 0.5 * spd * a2 * a2;
								const qx = cx + dx * f2;
								const qy = cy + dy * f2 + d2;
								const al = Math.max(0, (1 - age) * (0.5 - t * 0.09) * (0.35 + 0.65 * k));
								c.strokeStyle = 'hsla(' + hueJ + ',100%,' + bright + '%,' + al.toFixed(3) + ')';
								c.lineWidth = Math.max(1, 2.4 - t * 0.4);
								c.beginPath();
								c.moveTo(qx, qy);
								c.lineTo(px, py);
								c.stroke();
								px = qx;
								py = qy;
							}
							// 火花頭：比尾巴再亮一階的 2×2 小方點，才有「點」的感覺
							c.fillStyle = 'hsla(' + hueJ + ',100%,' + (bright + 15) + '%,'
								+ ((1 - age) * (0.6 + 0.4 * k)).toFixed(3) + ')';
							c.fillRect(hx - 1, hy - 1, 2, 2);
						}
					}
					c.restore();
				};

				// 【誰在前、誰在後】
				//   front（預設）＝原圖在下、煙火在上面。一般照片是不透明的，煙火壓在上面才看得到。
				//   back ＝煙火先畫、原圖再壓上去，等於「煙火在圖後面」；
				//          這只有圖本身有透明區（去背貼圖）才看得出來，正好是「人物站在煙火前」的用法。
				//   黑底那層永遠墊在最底下：不透明的話被圖蓋掉（等於看不到），
				//   圖有透明區時才會透出黑，所以它只在 back 模式真的有用。
				if (layer === 'back') {
					if (bgDark > 0) {
						c.fillStyle = 'rgba(0,0,0,' + bgDark.toFixed(3) + ')';
						c.fillRect(0, 0, W, H);
					}
					paintFireworks();
					c.drawImage(baseCanvas, 0, 0);
				} else {
					c.drawImage(baseCanvas, 0, 0);
					if (bgDark > 0) {
						c.fillStyle = 'rgba(0,0,0,' + bgDark.toFixed(3) + ')';
						c.fillRect(0, 0, W, H);
					}
					paintFireworks();
				}
			}
		},
		{
			id: 'hearts', name: 'Floating Hearts',
			// 滿天愛心：使用者提供的那份（createjs 版）漂浮愛心改寫——不載入任何外部函式庫、也不留狀態
			// 【原作在做什麼】一百顆愛心從畫面下方各自往上飄：y 每格減一點（速度依大小不同），
			//   x 用 cos 在起始位置左右擺盪，rotation 用 sin 給 ±30° 的傾斜，
			//   約三分之一用 lighter 混合，飄出上緣之後重新丟回下方繼續飄。
			// 【為什麼可以不留狀態】原作每格對每顆愛心做的事情只有三件：
			//   y 往下減、x 用 cos(y) 算、rotation 用 sin(y) 算。也就是說——
			//   只要知道「這顆愛心現在在哪個高度」，它的左右位置和傾斜角度全部算得出來，
			//   而高度只跟 p 有關。既然整段軌跡都是解析式，就不必記住上一格，
			//   預覽可以亂跳格、送去 APNG 頁重排播放也不會錯位。
			// 【循環怎麼接】每顆愛心走的是「從畫面下方一路升到上方」的鋸齒：
			//   u = (p × 趟數 + 相位) 的小數部分，y 就從 H+60 一路線性升到 −60。
			//   趟數只取整數，所以 p=1 的 u 剛好等於 p=0；而鋸齒的跳點落在
			//   「畫面下方外」與「畫面上方外」，兩端都看不見，接格時不會有肉眼可見的瞬移。
			// 【為什麼沒有那行文字】原作中間那句 "the longer I'm with you" 是示範用的，
			//   這裡不畫——要加字請用右側的「文字」面板，那邊的字會跟著影格燒進去。
			params: [
				{ key: 'count', i18n: 'paramCount', min: 20, max: 120, step: 10, def: 60 },
				{ key: 'size', i18n: 'paramSize', min: 40, max: 160, step: 10, def: 100, unit: '%' },
				{ key: 'wobble', i18n: 'paramWobble', min: 0, max: 40, step: 5, def: 15, unit: '%' },
				{ key: 'speed', i18n: 'paramSpeed', min: 10, max: 100, step: 10, def: 30, unit: '%' },
				{ key: 'bgDark', i18n: 'paramBgDensity', min: 0, max: 50, step: 5, def: 0, unit: '%' },
				{
					key: 'layer', i18n: 'paramLayer', type: 'select', def: 'front',
					options: [
						{ v: 'front', i18n: 'hzFront' },
						{ v: 'back', i18n: 'hzBack' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				const count = Math.round((o && typeof o.count === 'number') ? o.count : 60);
				const sizePct = ((o && typeof o.size === 'number') ? o.size : 100) / 100;
				const wobPct = ((o && typeof o.wobble === 'number') ? o.wobble : 15) / 100;
				const speedPct = ((o && typeof o.speed === 'number') ? o.speed : 30) / 100;
				const bgDark = ((o && typeof o.bgDark === 'number') ? o.bgDark : 0) / 100;
				const layer = (o && o.layer) ? o.layer : 'front';
				// 一輪裡總共升幾趟：只取整數，否則 p=1 接不回 p=0
				const passes = Math.max(1, Math.round(speedPct * 3));
				const span = H + 120;              // 從「下方 60px 外」升到「上方 60px 外」的總距離
				const S = (Math.min(W, H) / 384) * sizePct;   // 愛心基準大小（384 高的畫面上就是 1 倍）

				// 畫愛心：整層逐顆畫，約三分之一的愛心用加法混合，重疊處會微微發亮
				const paintHearts = function () {
					for (let n = 0; n < count; n++) {
						// 每一顆的起始位置、相位、大小、顏色、透明度都用固定種子算：
						// 同一輪的每一格都是同一顆愛心，循環時也是同一組，不會亂跳
						const g = rnd(n * 97 + 31);
						const baseX = g() * W;                      // 起始水平位置
						const phase = g();                          // 相位（讓每顆的高度錯開）
						const sc = 0.5 + 1.3 * g();                 // 這顆多大（0.5～1.8 倍）
						const hue = 312 + 44 * g();                 // 色相：粉 → 桃紅 → 紅
						const light = 55 + 25 * g();                // 亮度
						const alpha0 = 0.12 + 0.7 * g();            // 這顆多透
						const wobAmp = W * wobPct * (0.4 + 0.6 * g());   // 左右擺盪的幅度
						const waves = 1 + 2 * g();                  // 整個高度上擺幾個波
						const rot0 = -20 + 40 * g();                // 基礎傾斜角（度）
						const ph0 = g() * TAU;                      // 擺盪的相位偏移
						const lighter = g() < 0.33;                 // 約三分之一走加法混合

						// 高度：鋸齒上升。u=0 在畫面下方外、u=1 在畫面上方外
						let uu = (p * passes + phase) % 1;
						if (uu < 0) uu += 1;
						const y = (H + 60) - uu * span;

						// 左右位置與傾斜：兩者都是「高度」的函式（原作就是這樣算的）
						const ph = TAU * (y / H) * waves + ph0;
						const x = baseX + Math.cos(ph) * wobAmp;

						// 進出畫面時淡入淡出，避免愛心半顆卡在邊線上突然出現
						const edge = Math.min(1, (H + 60 - y) / 60, (y + 60) / 60);
						const al = alpha0 * (0.35 + 0.65 * k) * Math.max(0, edge);
						if (al <= 0.01) continue;

						c.save();
						if (lighter) c.globalCompositeOperation = 'lighter';
						c.globalAlpha = Math.min(1, al);
						c.translate(x, y);
						c.rotate((rot0 + Math.sin(ph) * 20) * Math.PI / 180);
						c.scale(S * sc, S * sc);
						c.fillStyle = 'hsl(' + hue.toFixed(1) + ',100%,' + light.toFixed(1) + '%)';
						// 心形：原作那八段二次貝茲，左右對稱
						c.beginPath();
						c.moveTo(0, -12);
						c.quadraticCurveTo(1, -20, 8, -20);
						c.quadraticCurveTo(16, -20, 16, -10);
						c.quadraticCurveTo(16, 0, 0, 12);
						c.quadraticCurveTo(-16, 0, -16, -10);
						c.quadraticCurveTo(-16, -20, -8, -20);
						c.quadraticCurveTo(-1, -20, 0, -12);
						c.closePath();
						c.fill();
						c.restore();
					}
				};

				// 【誰在前、誰在後】跟煙火同一套規矩：
				//   front（預設）＝原圖在下、愛心飄在上面；back ＝愛心在圖後面，
				//   只有圖本身有透明區（去背貼圖）才看得出來。
				//   黑底永遠墊在最底下：不透明的話被圖蓋掉，圖有透明區時才透出黑。
				if (layer === 'back') {
					if (bgDark > 0) {
						c.fillStyle = 'rgba(0,0,0,' + bgDark.toFixed(3) + ')';
						c.fillRect(0, 0, W, H);
					}
					paintHearts();
					c.drawImage(baseCanvas, 0, 0);
				} else {
					c.drawImage(baseCanvas, 0, 0);
					if (bgDark > 0) {
						c.fillStyle = 'rgba(0,0,0,' + bgDark.toFixed(3) + ')';
						c.fillRect(0, 0, W, H);
					}
					paintHearts();
				}
			}
		},
		{
			id: 'flameEdge', name: 'Burning Edge',
			// 火焰邊緣：沿著圖片的輪廓燒起來，透明的地方一根火苗都不冒
			// 【邊緣怎麼找】見 flameEdgePoints：把 alpha 掃一遍，找出「自己不透、鄰居透」的像素，
			//   依火焰間距分格取樣，順便把「往圖片內部」的方向（alpha 梯度）一起算好。
			//   換圖、換尺寸、換密度才重算一次，其餘每一格只是拿現成的點去貼火苗。
			// 【火苗怎麼畫】一次做一朵貼圖（flameSprite：暖色光斑從寬到窄往上堆），
			//   每一格只做縮放＋旋轉貼上、整層 lighter 疊。火焰的跳動則是三條整數頻率正弦疊起來，
			//   所以 p=0 與 p=1 算出來一模一樣，循環接得回去。
			// 【兩個範圍】內焰＝火苗朝圖片內部舔，整層用 destination-in 打上原圖 alpha，
			//   保證「一根都不跑到透明區」（去背圖貼在深色底上時最乾淨）；
			//   外焰＝火苗一律往上衝，可以燒出輪廓外，適合滿版照片做「整張在燒」的氣氛。
			params: [
				{ key: 'length', i18n: 'paramFlameLength', min: 10, max: 50, step: 5, def: 25, unit: '%' },
				{ key: 'density', i18n: 'paramFlameDensity', min: 20, max: 100, step: 10, def: 70, unit: '%' },
				{ key: 'bgDark', i18n: 'paramBgDensity', min: 0, max: 50, step: 5, def: 0, unit: '%' },
				{
					key: 'scope', i18n: 'paramFlameScope', type: 'select', def: 'inside',
					options: [
						{ v: 'inside', i18n: 'flameInside' },
						{ v: 'outside', i18n: 'flameOutside' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				const lenPct = ((o && typeof o.length === 'number') ? o.length : 25) / 100;
				const densityPct = ((o && typeof o.density === 'number') ? o.density : 70) / 100;
				const bgDark = ((o && typeof o.bgDark === 'number') ? o.bgDark : 0) / 100;
				const scope = (o && o.scope === 'outside') ? 'outside' : 'inside';

				// 邊緣點與火苗貼圖都只做一次（換圖／換尺寸／換密度才重算）
				const key = W + 'x' + H + '#' + Math.round(densityPct * 100);
				if (!this._flamePts || this._flameKey !== key || this._flameSrc !== baseCanvas) {
					// 密度 100% → 每 4px 一根；20% → 每 16px 一根
					const spacing = Math.max(4, Math.round(20 - 16 * densityPct));
					this._flamePts = flameEdgePoints(spacing);
					this._flameKey = key;
					this._flameSrc = baseCanvas;
				}
				if (!this._flameArt) this._flameArt = flameSprite();

				const pts = this._flamePts;
				// 火苗最長能多長：以短邊為基準，強度 k 再放大一點（0 太短不好看，所以下限留 0.6）
				const maxLen = Math.min(W, H) * lenPct * (0.6 + 0.6 * k);
				// 跳動：三條整數頻率的正弦疊起來 → 週期一定是一輪，p=0 與 p=1 完全相同
				const flick = function (a, b, d, pp) {
					const v = 0.55 * Math.sin(TAU * (pp + a))
						+ 0.30 * Math.sin(TAU * (3 * pp + b))
						+ 0.15 * Math.sin(TAU * (5 * pp + d));
					return 0.5 + 0.45 * v;
				};

				// 原圖與黑底先鋪好，火焰一律疊在上面
				c.drawImage(baseCanvas, 0, 0);
				if (bgDark > 0) {
					c.fillStyle = 'rgba(0,0,0,' + bgDark.toFixed(3) + ')';
					c.fillRect(0, 0, W, H);
				}

				// 內焰要先畫在離屏圖層上，再用原圖的 alpha 挖一次，才不會有火舌伸出輪廓
				let target = c;
				let layerCtx = null;
				if (scope === 'inside') {
					if (!this._flameLayer || this._flameLayer.width !== W || this._flameLayer.height !== H) {
						this._flameLayer = mkCanvas(W, H);
						this._flameLayerCtx = this._flameLayer.getContext('2d');
					}
					layerCtx = this._flameLayerCtx;
					layerCtx.clearRect(0, 0, W, H);
					target = layerCtx;
				}

				target.save();
				target.globalCompositeOperation = 'lighter';
				for (let n = 0; n < pts.length; n++) {
					const pt = pts[n];
					// 每根火苗的相位、大小、方向抖動都由固定種子決定 → 每一格都是同一根，循環也同一根
					const g = rnd(n * 131 + 7);
					const ph1 = g(), ph2 = g(), ph3 = g();
					const sizeJ = 0.75 + 0.55 * g();       // 這根多高
					const spray = (g() - 0.5) * 0.3;       // 方向再偏一點，火苗才不會排得像柵欄
					const fl = flick(ph1, ph2, ph3, p);    // 0～1 的呼吸
					const hgt = maxLen * sizeJ * (0.55 + 0.75 * fl);
					if (hgt < 4) continue;
					const wid = hgt * 0.55;

					// 方向：內焰往圖片裡舔、外焰一律往上；兩種都再往上一點點，火才有上升感
					let dx = 0, dy = -1;
					if (scope === 'inside') { dx = pt.nx + spray * 0.15; dy = pt.ny + 0.25; }
					else { dx = spray; dy = -1; }
					const dl = Math.sqrt(dx * dx + dy * dy) || 1;
					dx /= dl; dy /= dl;

					// 貼圖本身是「往正上方」畫的，旋轉角把它的上方對到 (dx, dy)
					target.save();
					target.globalAlpha = Math.min(1, (0.55 + 0.45 * fl) * (0.45 + 0.55 * k) * 0.9);
					target.translate(pt.x, pt.y);
					target.rotate(Math.atan2(dx, -dy));
					target.drawImage(this._flameArt, -wid / 2, -hgt * 0.92, wid, hgt);
					target.restore();
				}
				target.restore();

				if (scope === 'inside') {
					// destination-in：只留「原圖有像素」的地方（alpha 一起被乘上，羽邊不會硬切）
					layerCtx.globalCompositeOperation = 'destination-in';
					layerCtx.drawImage(baseCanvas, 0, 0);
					layerCtx.globalCompositeOperation = 'source-over';
					c.drawImage(this._flameLayer, 0, 0);
				}
			}
		},
		{
			id: 'particleNet', name: 'Particle Net',
			// 【目前先藏起來】使用者還沒決定這個七色漸變版本要留哪一種做法，
			//   所以配方本體、參數、繪製全部保留在 FX_RECIPES 裡（程式照樣跑得動），
			//   只是不在右側清單出現。決定好之後把下面這行 hidden 拿掉就會回到選單。
			hidden: true,
			// 粒子網路（星座連線）：仿 tsParticles 那個「粒子 + 距離內連線 + 三顆互連填三角形」的視覺
			// 【為什麼不用那個套件】它是 TypeScript 寫的框架，整包 min.js 只為了畫幾個點和線；
			//   而且它的動態是「上一格的位置加上速度」累積出來的，跟我們「每格獨立算、預覽可跳格」相反。
			//   這裡用八十行自己畫，行為更好掌握。
			// 【粒子怎麼動】每顆走一條利薩如軌跡：x 用 sin、y 用 cos，兩軸的頻率都取整數
			//   （1～3 次／輪）。整數頻率是關鍵——p 走完一輪剛好繞回原點，
			//   所以 p=0 與 p=1 的位置完全相同，循環接得回去，也不會像原作那樣
            //   中途被邊界彈來彈去（那種寫法一旦跳格就會錯位）。
			// 【連線與三角形】每格重算距離：距離小於「連線距離」就畫線（越近越亮）；
			//   三顆彼此都在連線距離內，就把中間那塊三角形填上淡白（原作 10% 白）。
			//   三角形成對檢查會爆掉，所以先建「鄰居清單」，只在共同鄰居裡找第三點。
			// 【密度要注意】原作是 1920×1080 上放 80 顆、連線 100px，等於幾乎不連線（很空靈）；
			//   我們的畫布最長邊只有 512，同樣 80 顆＋同樣距離會擠成一團、三角形多到糊成一片。
			//   所以預設改成 50 顆＋連線 15%（在小畫面上大約是「每顆兩三個鄰居」的疏度）。
			params: [
				{ key: 'count', i18n: 'paramCount', min: 20, max: 150, step: 10, def: 50 },
				{ key: 'link', i18n: 'paramLink', min: 5, max: 30, step: 5, def: 15, unit: '%' },
				{ key: 'wobble', i18n: 'paramWobble', min: 10, max: 60, step: 5, def: 25, unit: '%' },
				{ key: 'cluster', i18n: 'paramCluster', min: 0, max: 100, step: 10, def: 60, unit: '%' },
				// 【色相】改成「整組色相旋轉」：真正的顏色由下面的七色調色盤依位置內插決定，
				//   這支滑桿只是把整圈色相一起轉，預設 0 就是調色盤原本的顏色
				{ key: 'hue', i18n: 'paramHue', min: 0, max: 360, step: 10, def: 0, unit: '°' },
				{ key: 'bgDark', i18n: 'paramBgDensity', min: 0, max: 50, step: 5, def: 0, unit: '%' },
				{
					key: 'flow', i18n: 'paramHueFlow', type: 'select', def: '1',
					options: [
						{ v: '0', i18n: 'flowOff' },
						{ v: '1', i18n: 'flowOne' },
						{ v: '2', i18n: 'flowTwo' }
					]
				},
				{
					key: 'layer', i18n: 'paramLayer', type: 'select', def: 'front',
					options: [
						{ v: 'front', i18n: 'pnFront' },
						{ v: 'back', i18n: 'pnBack' }
					]
				}
			],
			draw: function (c, p, k, i, o) {
				const count = Math.round((o && typeof o.count === 'number') ? o.count : 50);
				const linkPct = ((o && typeof o.link === 'number') ? o.link : 15) / 100;
				const ampPct = ((o && typeof o.wobble === 'number') ? o.wobble : 25) / 100;
				const hueBase = (o && typeof o.hue === 'number') ? o.hue : 350;
				// 【色相流動】原作是 color.animation（sync:true）：整片粒子同一個色相一起慢慢轉。
				// 我們要接格無縫，所以「一輪」只能轉「整數圈」——p 走完一圈，色相剛好回到起點。
				// 0＝固定色相；1＝一輪轉一圈色相；2＝一輪轉兩圈（更快、更像原作那個一直在變的感覺）
				const flowTurns = parseInt((o && o.flow), 10) || 0;
				const hueShift = 360 * flowTurns * p;
				const bgDark = ((o && typeof o.bgDark === 'number') ? o.bgDark : 0) / 100;
				const layer = (o && o.layer) ? o.layer : 'front';
				// 【明度跟著底色走】深底發光時線要亮（62%）才有光暈；淺底是 source-over 疊上去的，
				//   62% 的亮線會整片洗白、顏色全糊掉，所以淺底改用深一階（45%），粉橙青藍紫才分得出來。
				//   三角形也用同一套：它是 6% 的半透明面紗，白色的話會把底下的彩色線整片蓋成灰白
				const triL = (bgDark >= 0.15) ? 70 : 50;
				const lineL = (bgDark >= 0.15) ? 62 : 45;
				const dotL = (bgDark >= 0.15) ? 68 : 52;
				const linkDist = Math.min(W, H) * linkPct;
				// 【聚散】這是實際看了原作畫面之後才加的參數。原作粒子是自由漂移，
				//   幾顆撞在一起就形成「一團密集的灰色三角形、旁邊一大片空白」的簇狀分佈；
				//   我原本那種「軌跡中心平均灑在畫面上」的版本，看起來是均勻的格子網，氣質差很多。
				//   所以這裡先定 4 個「群集中心」，再依聚散程度把每顆粒子的中心往群集中心拉：
				//   0% ＝ 完全均勻（原本的樣子）、100% ＝ 全部縮進 4 團小小的雲裡。
				const cluster = ((o && typeof o.cluster === 'number') ? o.cluster : 60) / 100;
				const minWH = Math.min(W, H);

				// 【七色調色盤】光點與線段不再是「一個色相抖 ±20°」（那看起來其實只有一個顏色），
				//   改成沿畫面斜向位置內插的七段色相：粉 → 橙 → 金 → 綠 → 青 → 藍 → 紫。
				//   用位置而不是每顆亂抽顏色，相鄰粒子的色相才會接近，線段拉兩端漸層也才自然；
				//   而且色相是連續函式，畫面本身就看得出「漸變」，不是七個色塊拼起來。
				const PALETTE = [345, 25, 50, 135, 190, 245, 300];
				const normHue = function (h) { h = h % 360; return h < 0 ? h + 360 : h; };
				const hueAt = function (t) {
					const seg = t * PALETTE.length;
					const i0 = Math.floor(seg) % PALETTE.length;
					const fr = seg - Math.floor(seg);
					const h0 = PALETTE[i0];
					let h1 = PALETTE[(i0 + 1) % PALETTE.length];
					if (h1 < h0) h1 += 360;     // 跨過 0 度時往上繞，避免內插往回跑
					return normHue(h0 + (h1 - h0) * fr);
				};
				const ccx = [], ccy = [];
				for (let ci = 0; ci < 4; ci++) {
					const gc = rnd(ci * 997 + 3);
					ccx.push(W * (0.2 + 0.6 * gc()));
					ccy.push(H * (0.2 + 0.6 * gc()));
				}

				// 1. 算這一格所有粒子的位置（純函式，不依賴上一格）
				const px = [], py = [], pr = [], ph = [], pa = [];
				for (let n = 0; n < count; n++) {
					const g = rnd(n * 57 + 13);
					let cx = W * (0.12 + 0.76 * g());           // 軌跡中心（均勻版）
					let cy = H * (0.12 + 0.76 * g());
					const ci = Math.floor(g() * 4);
					if (cluster > 0) {
						// 這顆粒子自己在那團雲裡的位置（抖動半徑約畫布短邊的 11%）
						const jx = ccx[ci] + (g() - 0.5) * minWH * 0.22;
						const jy = ccy[ci] + (g() - 0.5) * minWH * 0.22;
						cx = cx * (1 - cluster) + jx * cluster;  // 聚散 ＝ 往群集中心拉的比例
						cy = cy * (1 - cluster) + jy * cluster;
					}
					// 聚起來之後擺幅也要收，不然粒子還是會晃出團外
					const ax = W * ampPct * (0.3 + 0.5 * g()) * (1 - 0.5 * cluster);
					const ay = H * ampPct * (0.3 + 0.5 * g()) * (1 - 0.5 * cluster);
					const fx = 1 + Math.floor(g() * 3);         // 頻率只取整數（1~3 次／輪）
					const fy = 1 + Math.floor(g() * 3);
					const phx = g(), phy = g();                 // 相位
					const size = 1.2 + 1.8 * g();               // 半徑 1.2~3.0
					// 【這顆的顏色】用軌跡中心（不是即時位置）算漸變位置：粒子晃動時顏色不會跟著閃。
					//   位置佔 6 成、粒子序佔 4 成——只用位置的話，聚散拉高時「一團雲」會整片同一個顏色
					//   （實測渲染出來就是綠油油一坨）；混進序號之後，同一團裡也有粉→橙→紫的流動。
					//   抖動只剩 ±6°，免得把漸層打散
					const u = Math.max(0, Math.min(0.999,
						0.6 * (0.65 * (cx / W) + 0.35 * (cy / H)) + 0.4 * (n / Math.max(1, count))));
					const hue = hueAt(u) + hueBase + hueShift + (g() * 12 - 6);
					const alpha = 0.55 + 0.35 * g();            // 這顆多亮（最後再乘強度）
					px.push(cx + ax * Math.sin(TAU * (fx * p + phx)));
					py.push(cy + ay * Math.cos(TAU * (fy * p + phy)));
					pr.push(size);
					ph.push(hue);
					pa.push(alpha);
				}

				// 2. 鋪底：原圖 →（黑底）→ 粒子；layer=back 時粒子先畫、原圖再壓上去
				// 【為什麼三角形不能用 lighter】原作那張畫面是黑底的，白 0.1 疊在黑上＝一片淡灰；
				//   但我們底下壓的是一張亮的照片，lighter 會一直往上加，三角形一疊就變成純白，
				//   把原圖整片吃掉（實際渲染出來確認過）。所以三角形改成 source-over 的薄面紗，
				//   只有線和粒子留在 lighter 裡——這樣才同時有「發亮」和「不毀原圖」。
				const paintTri = function () {
					c.save();
					c.globalCompositeOperation = 'source-over';
					// 三角形：三顆彼此都在連線距離內就填淡白（原作 10% 白），疊起來像一層薄紗
					const nb = [];
					for (let a = 0; a < count; a++) {
						const set = new Set();
						for (let b = 0; b < count; b++) {
							if (a === b) continue;
							const dx = px[a] - px[b], dy = py[a] - py[b];
							if (dx * dx + dy * dy <= linkDist * linkDist) set.add(b);
						}
						nb.push(set);
					}
					// 原作 0.1，但我們小畫面上簇狀重疊很兇，0.1 會在中間糊成純白；
					// 上色之後同樣會「疊成一整片實色」，所以壓到 0.035，讓彩色點與漸層線還是主角
					const triA = 0.035 * (0.5 + 0.5 * k);
					// 面紗的顏色跟著三角形頂點走（同一片三角形的三顆本來就相鄰、色相幾乎一樣，
					// 直接取第一顆當代表，比算三顆平均省事，也不會踩到色相繞 0 度的平均陷阱）
					// 密度拉到極限時三角形會上千片（每片都要一段路徑，跑 20 格會明顯卡），
					// 所以留一個上限：超過就停止填色。反正疊在那麼密的地方，後面幾百片肉眼也分不出來
					let triUsed = 0;
					for (let a = 0; a < count; a++) {
						const triHue = normHue(ph[a]).toFixed(0);
						const na = nb[a];
						na.forEach(function (b) {
							if (b <= a || triUsed >= 1200) return;              // 每組三角形只畫一次
							const nbn = nb[b];
							na.forEach(function (cc) {
								if (cc <= b || triUsed >= 1200) return;
								if (!nbn.has(cc)) return;
								c.fillStyle = 'hsla(' + triHue + ',85%,' + triL + '%,' + triA.toFixed(3) + ')';
								c.beginPath();
								c.moveTo(px[a], py[a]);
								c.lineTo(px[b], py[b]);
								c.lineTo(px[cc], py[cc]);
								c.closePath();
								c.fill();
								triUsed++;
							});
						});
					}
					c.restore();
				};

				const paintNet = function () {
					paintTri();                              // 先鋪三角形的面紗（不發光，只壓一層淡白）
					c.save();
					// 【合成方式看底有多暗】實際渲染比對過兩種：
					//   lighter 疊在深色處很漂亮（線會發亮、越疊越亮），但壓在淺色／亮面上完全加不上去，
					//   線和點直接消失（漫畫圖常常是淺底）；source-over 則是深淺都看得見，但少了光感。
					//   所以照「黑底濃度」決定：有壓黑底（≥15%）就用 lighter 發光，完全透明底就用實色。
					c.globalCompositeOperation = (bgDark >= 0.15) ? 'lighter' : 'source-over';
					c.lineWidth = 1;

					// 2-1 連線：每對粒子算一次距離（粒子不多，直接雙迴圈就好）
					for (let a = 0; a < count; a++) {
						for (let b = a + 1; b < count; b++) {
							const dx = px[a] - px[b], dy = py[a] - py[b];
							const d2 = dx * dx + dy * dy;
							if (d2 > linkDist * linkDist) continue;
							const d = Math.sqrt(d2);
							// 越近越亮：距離 0 時最亮、剛好碰到連線距離時完全淡出
							// （0.45 是照原作 line_linked.opacity 0.4 抓的，原作那張截圖的線條其實很暗）
							const al = (1 - d / linkDist) * 0.45 * (0.4 + 0.6 * k);
							if (al <= 0.01) continue;
							// 【線段漸變】線的兩端各用自己那顆粒子的顏色，中間就是一段漸層——
							//   這樣整片網路的線條會跟光點同色系，跨過兩個色區時也接得順。
							//   兩端色相幾乎一樣（<6°）就不建漸層物件，直接純色，省一點每格的重算成本
							const ha = normHue(ph[a]), hb = normHue(ph[b]);
							const dh = Math.abs(ha - hb);
							if (dh > 6 && dh < 354) {
								const grd = c.createLinearGradient(px[a], py[a], px[b], py[b]);
								grd.addColorStop(0, 'hsla(' + ha.toFixed(0) + ',92%,' + lineL + '%,' + al.toFixed(3) + ')');
								grd.addColorStop(1, 'hsla(' + hb.toFixed(0) + ',92%,' + lineL + '%,' + al.toFixed(3) + ')');
								c.strokeStyle = grd;
							} else {
								// 差不到 6°，或剛好跨過 0 度（差 >354°，其實是同一種顏色）→ 直接沿用前端色，
								// 取平均反而會被 (350+20)/2 = 185 這種算法帶到完全不相干的青色去
								c.strokeStyle = 'hsla(' + ha.toFixed(0) + ',92%,' + lineL + '%,' + al.toFixed(3) + ')';
							}
							c.beginPath();
							c.moveTo(px[a], py[a]);
							c.lineTo(px[b], py[b]);
							c.stroke();
						}
					}

					// 2-2 粒子本體：畫在線上面，才有「節點」的感覺
					for (let n = 0; n < count; n++) {
						const al = Math.min(1, pa[n] * (0.45 + 0.55 * k));
						if (al <= 0.01) continue;
						// 先畫一圈淡淡的外暈（半徑 ×1.9、透明度 ×0.2），再畫實心核；
						// 兩層都用 source-over，所以淺色底不會被吃掉，深色底又有光的感覺
						const hueN = normHue(ph[n]).toFixed(0);
						c.fillStyle = 'hsla(' + hueN + ',95%,' + (dotL + 4) + '%,' + (al * 0.2).toFixed(3) + ')';
						c.beginPath();
						c.arc(px[n], py[n], pr[n] * 1.9, 0, TAU);
						c.fill();
						c.fillStyle = 'hsla(' + hueN + ',95%,' + dotL + '%,' + al.toFixed(3) + ')';
						c.beginPath();
						c.arc(px[n], py[n], pr[n], 0, TAU);
						c.fill();
					}
					c.restore();
				};

				// 【誰在前、誰在後】跟煙火、愛心同一套規矩：
				//   front（預設）＝原圖在下、網路上面；back ＝網路在圖後面，
				//   只有圖本身有透明區（去背貼圖）才看得出來。
				if (layer === 'back') {
					if (bgDark > 0) {
						c.fillStyle = 'rgba(0,0,0,' + bgDark.toFixed(3) + ')';
						c.fillRect(0, 0, W, H);
					}
					paintNet();
					c.drawImage(baseCanvas, 0, 0);
				} else {
					c.drawImage(baseCanvas, 0, 0);
					if (bgDark > 0) {
						c.fillStyle = 'rgba(0,0,0,' + bgDark.toFixed(3) + ')';
						c.fillRect(0, 0, W, H);
					}
					paintNet();
				}
			}
		}
	];

	// ============================================================
	// 特效自己的參數
	// 參數是「宣告在配方上」的：recipe.params 一寫，右側的「特效設定」就會
	// 自動長出對應的滑桿，不必再到 DOM 或 CSS 補一份。沒有宣告的特效只會
	// 顯示一行說明，不會整格消失（避免使用者以為壞掉）。
	// 值存在 paramStore[特效 id] 裡，切換特效再切回來不會把調過的值洗掉。
	// ============================================================
	const paramStore = Object.create(null);

	// ============================================================
	// 「強度」那支滑桿的說明
	// 它是全域的（0~100% 換算成 k 丟進每支特效），但每支特效拿它做的事情不一樣：
	//   有的當位移幅度、有的當疊圖濃度、有的當粒子數量、有的去壓六面明暗，
	//   也有幾支根本不吃它（自己靠圈數／角度在跑）。
	// 使用者拉同一格卻看到不同結果，很容易以為滑桿壞掉，所以面板下方跟著換一句話。
	// 這裡只列「行為明顯不同」的，其餘一律用預設那句（整體幅度），
	// 不然 39 支各寫一句、五語系要翻 195 條，維護成本不划算。
	// ============================================================
	const K_HINT_MAP = {
		// 亮度類：k 調的是「亮不亮」
		shineSweep: 'fxKHintBright',
		colorStrobe: 'fxKHintBright',
		fireworks: 'fxKHintBright',   // 煙火：k 調的是火花亮度（不是數量）
		particleNet: 'fxKHintBright', // 粒子網路：k 調的是線與粒子的亮度（不影響粒子數量與距離）
		pulseGlow: 'fxKHintGlow',
		// 疊圖濃度類：k 調的是那一層的透明度
		colorCycle: 'fxKHintAlpha',
		rainbowWave: 'fxKHintAlpha',
		spotlight: 'fxKHintAlpha',
		matrixRain: 'fxKHintAlpha',
		hearts: 'fxKHintAlpha',       // 滿天愛心：k 調的是愛心的透明度（不是數量也不是速度）
		oldTV: 'fxKHintAlpha',
		// 自己有「專屬強度」滑桿的：全域 k 是再乘上去，要講清楚免得拉爆或看起來沒反應
		colorTint: 'fxKHintMultiply',
		kaleidoscope: 'fxKHintMultiply',
		sepiaFlash: 'fxKHintMultiply',
		vignettePulse: 'fxKHintMultiply',
		invertFlash: 'fxKHintMultiply',
		contrastPulse: 'fxKHintMultiply',
		// 數量類：k 調的是「幾個」
		sparkle: 'fxKHintCount',
		confettiBurst: 'fxKHintCount',
		// 其他專屬行為
		shadowPulse: 'fxKHintShadow',
		fade: 'fxKHintFade',
		cubeSpin: 'fxKHintShade',
		pixelate: 'fxKHintSize',
		flameEdge: 'fxKHintSize',   // 火焰邊緣：k 調的是火苗長度（不是火焰數量）
		// 完全不看這支滑桿的（靠自己的圈數／角度／速度在跑）
		rotate: 'fxKHintNone',
		slideIn: 'fxKHintNone',
		flipAnim: 'fxKHintNone',
		reveal: 'fxKHintNone',
		dissolve: 'fxKHintNone',
		sliceSplit: 'fxKHintNone',
		comic: 'fxKHintNone'
	};

	// 重寫「強度」下方那行說明（切特效、切語言時各叫一次）
	function updateKHint() {
		if (!kHintBox) return;
		kHintBox.textContent = tr('fxKHintPrefix') + tr(K_HINT_MAP[selectedId] || 'fxKHintDefault');
	}

	function recipeOf(id) {
		return FX_RECIPES.find(function (r) { return r.id === id; }) || null;
	}

	// 取某個特效目前的參數值（沒調過就用宣告的預設值）
	// 值的型別照預設值走：預設是數字就存數字，預設是字串就存字串（下拉選單用得到）
	function paramValues(recipe) {
		if (!recipe || !recipe.params) return {};
		const store = paramStore[recipe.id] || (paramStore[recipe.id] = {});
		const out = {};
		recipe.params.forEach(function (p) {
			out[p.key] = Object.prototype.hasOwnProperty.call(store, p.key) ? store[p.key] : p.def;
		});
		return out;
	}

	// 把滑桿／下拉選單拿到的原始字串轉成型別正確的值
	function paramRead(p, raw) {
		if (p.type === 'select') {
			return (typeof p.def === 'number') ? Number(raw) : String(raw);
		}
		const v = parseFloat(raw);
		return isNaN(v) ? p.def : v;
	}

	// 顏色轉換走 media-utils.js 的共用版（其他頁面要上色也用同一支，不在各檔各寫一份）
	// 取不到就退回「直接用原本的顏色」，至少不會讓整個特效爆掉
	const hexToRgba = window.hexToRgba || null;

	// 滑桿數值 → 顯示字串（乘上 scale 再補單位）
	function paramText(p, v) {
		const n = Number(v) * (p.scale || 1);
		// 有小數格（step < 1，例如流速 0.3、旋轉 0.2 圈）就保留到小數第二位，
		// 否則四捨五入會被吃成 0，使用者拉了半天還以為沒反應
		const txt = (p.step && p.step < 1) ? String(Math.round(n * 100) / 100) : String(Math.round(n));
		return txt + (p.unit || '');
	}

	function renderParams() {
		if (!paramGroup || !paramBody) return;
		const recipe = recipeOf(selectedId);
		const list = (recipe && recipe.params) || [];
		// 標題：主要文字固定是「特效設定」，後面再接目前特效的名字；
		// 名字用小字＋淡色（.fx-param-name）當副標，視覺上不會跟主標搶
		// 沒有設定時只留「特效設定」，下方再補一行說明
		if (paramTitle) {
			paramTitle.textContent = '';
			const mainSpan = document.createElement('span');
			mainSpan.textContent = tr('fxParams');
			paramTitle.appendChild(mainSpan);
			if (list.length && recipe) {
				const nameSpan = document.createElement('span');
				nameSpan.className = 'fx-param-name';
				nameSpan.textContent = effectName(recipe);
				paramTitle.appendChild(nameSpan);
			}
		}
		paramBody.innerHTML = '';
		if (!list.length) {
			const tip = document.createElement('small');
			tip.className = 'fx-params-empty';
			tip.textContent = tr('paramNone');
			paramBody.appendChild(tip);
			return;
		}
		const vals = paramValues(recipe);
		list.forEach(function (p) {
			const row = document.createElement('div');
			row.className = 'fx-row fx-param-row';
			const label = document.createElement('label');
			label.textContent = tr(p.i18n || p.key);
			const input = document.createElement(p.type === 'select' ? 'select' : 'input');
			let valEl = null;
			if (p.type === 'select') {
				// 下拉選單：選項文字也走 i18n，切語言時由 fxRenderParams() 重畫整個面板
				(p.options || []).forEach(function (opt) {
					const op = document.createElement('option');
					op.value = String(opt.v);
					op.textContent = tr(opt.i18n || String(opt.v));
					if (String(opt.v) === String(vals[p.key])) op.selected = true;
					input.appendChild(op);
				});
			} else {
				input.type = 'range';
				input.min = p.min;
				input.max = p.max;
				input.step = p.step || 1;
				input.value = vals[p.key];
				valEl = document.createElement('span');
				valEl.textContent = paramText(p, vals[p.key]);
			}
			const commit = function () {
				const v = paramRead(p, input.value);
				paramStore[recipe.id][p.key] = v;
				if (valEl) valEl.textContent = paramText(p, v);
				// 拖動／選取時即時重畫（scheduleGenerate 自己有 debounce，不會每個像素都產一輪）
				if (sourceImg) scheduleGenerate(120);
			};
			// 滑桿要邊拖邊看，選單只要最後選定的值
			if (p.type === 'select') {
				input.addEventListener('change', commit);
			} else {
				input.addEventListener('input', commit);
			}
			row.appendChild(label);
			row.appendChild(input);
			if (valEl) row.appendChild(valEl);
			paramBody.appendChild(row);
		});
	}

	// ============================================================
	// 特效清單（右側，可上下滑動）
	// ============================================================
	function renderEffectList() {
		effectList.innerHTML = '';
		let shown = 0;   // 清單上看到的序號（跳過 hidden 的配方，號碼才不會中斷）
		FX_RECIPES.forEach(function (r) {
			// hidden: true 的配方只是「暫時不出現在選單」，配方本身仍留在 FX_RECIPES，
			// 之後把旗標拿掉就會回來，不用重寫任何繪製程式
			if (r.hidden) return;
			shown++;
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'fx-effect-item' + (r.id === selectedId ? ' active' : '');
			btn.dataset.id = r.id;
			const nameEl = document.createElement('span');
			nameEl.className = 'fx-name';
			const label = effectName(r);
			nameEl.textContent = label;
			if (label !== r.name) {
				// 主標已經是中文時，把英文原名用小字淡色放在後面，方便對照競品與程式
				const enEl = document.createElement('span');
				enEl.className = 'fx-name-en';
				enEl.textContent = r.name;
				nameEl.appendChild(enEl);
			}
			const idxEl = document.createElement('span');
			idxEl.className = 'fx-idx';
			idxEl.textContent = String(shown);
			btn.appendChild(nameEl);
			btn.appendChild(idxEl);
			btn.addEventListener('click', function () {
				selectEffect(r.id);
			});
			effectList.appendChild(btn);
		});
	}

	function selectEffect(id) {
		selectedId = id;
		effectList.querySelectorAll('.fx-effect-item').forEach(function (b) {
			b.classList.toggle('active', b.dataset.id === id);
		});
		renderParams();   // 換特效 → 右側「特效設定」換成這個特效的參數
		updateKHint();    // 「強度」下方那行說明也跟著換（每支特效對強度的用法不同）
		if (sourceImg) scheduleGenerate(0);
	}

	// ============================================================
	// 綠色原圖外框（js/source-frame.js）
	// FX 的畫布尺寸就是「這張圖縮到 ≤512 之後的輸出邊界」，
	// 所以框貼著 canvas 的可視矩形即可，不需要另外算比例
	// ============================================================
	function drawSourceFrame() {
		if (!window.SourceFrame) return;
		if (canvas.style.display === 'none' || !W || !H) {
			window.SourceFrame.hide(previewStage);
			return;
		}
		window.SourceFrame.aroundTarget(previewStage, canvas);
	}

	// ============================================================
	// 讀圖：算輸出尺寸（最長邊 ≤ MAX_SIDE）並建立基準畫布
	// ============================================================
	function loadFile(file) {
		if (!file) return;
		if (!/^image\//.test(file.type || '')) {
			setStatusKey('fxUnsupported');
			return;
		}
		setStatusKey('');
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = function () {
			URL.revokeObjectURL(url);
			sourceImg = img;
			const longSide = Math.max(img.naturalWidth, img.naturalHeight);
			const scale = Math.min(1, MAX_SIDE / longSide);
			W = Math.max(1, Math.round(img.naturalWidth * scale));
			H = Math.max(1, Math.round(img.naturalHeight * scale));
			baseCanvas = mkCanvas(W, H);
			baseCanvas.getContext('2d').drawImage(img, 0, 0, W, H);

			canvas.width = W;
			canvas.height = H;
			canvas.style.display = 'block';
			previewInfo.style.display = 'none';
			previewArea.style.display = 'block';
			sendBtn.disabled = false;
			// 綠色原圖外框：FX 的畫布就是「這張圖的輸出邊界」，
			// 所以框直接貼著 canvas 的可視矩形（js/source-frame.js）
			drawSourceFrame();

			scheduleGenerate(0);
		};
		img.onerror = function () {
			URL.revokeObjectURL(url);
			setStatusKey('fxUnsupported');
		};
		img.src = url;
	}

	// ============================================================
	// 產生影格（非同步分批，避免卡住 UI）
	// ============================================================
	function scheduleGenerate(delay) {
		if (genTimer) clearTimeout(genTimer);
		genTimer = setTimeout(function () {
			genTimer = null;
			genPromise = generate();
		}, typeof delay === 'number' ? delay : 150);
	}

	async function generate() {
		if (!sourceImg) {
			setStatusKey('fxNeedImage');
			return;
		}
		const token = ++genToken;
		stopPlay();

		const recipe = FX_RECIPES.find(function (r) { return r.id === selectedId; });
		const n = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, parseInt(frameCountInput.value, 10) || 20));
		const k = Math.max(0, Math.min(100, parseInt(intensityInput.value, 10) || 0)) / 100;
		const opts = paramValues(recipe);   // 這個特效自己的參數

		const list = [];
		for (let i = 0; i < n; i++) {
			if (token !== genToken) return;  // 中途被新的請求取代
			const cvs = mkCanvas(W, H);
			const cx = cvs.getContext('2d');
			if (recipe) {
				try {
					recipe.draw(cx, i / n, k, i, opts);
				} catch (e) {
					console.error('[FX] 特效繪製失敗:', recipe.id, e);
				}
			} else {
				cx.drawImage(baseCanvas, 0, 0);
			}
			// 文字燒進這一格（fxText 還沒建好時不會有東西）
			if (fxText && fxText.state.text && window.TextOverlay) {
				window.TextOverlay.render(cx, W, H, fxText.state, i + 1, n);
			}
			list.push(cvs);
			if (i % 4 === 0) {
				setStatusKey('fxGenerating', { n: Math.round((i / n) * 100) });
				await nextFrame();
			}
		}
		if (token !== genToken) return;

		// 舊影格換掉（canvas 沒有 revoke 問題，交給 GC）
		frames = list;
		buildTimeline();
		showFrame(0);
		stopPlay();   // 預設停在第一格，不自動播放（要看得自己按播放鍵）
		setStatusKey('');
		setInfo(tr('fxReady', { n: frames.length, w: W, h: H }));
	}

	// ============================================================
	// 影格指示點與播放
	// ============================================================
	function buildTimeline() {
		timelineBox.innerHTML = '';
		if (frames.length === 0) return;
		for (let i = 0; i < frames.length; i++) {
			const dot = document.createElement('div');
			dot.className = 'fx-dot' + (i === 0 ? ' active' : '');
			dot.textContent = String(i + 1);   // 方形塊只顯示影格編號，不畫縮圖
			dot.addEventListener('click', function () {
				stopPlay();
				showFrame(i);
			});
			timelineBox.appendChild(dot);
		}
	}

	function showFrame(i) {
		if (frames.length === 0) return;
		currentIndex = ((i % frames.length) + frames.length) % frames.length;
		ctx.clearRect(0, 0, W, H);
		ctx.drawImage(frames[currentIndex], 0, 0);
		if (framePosText) framePosText.textContent = tr('fxFramePos', { i: currentIndex + 1, n: frames.length });
		timelineBox.querySelectorAll('.fx-dot').forEach(function (d, idx) {
			d.classList.toggle('active', idx === currentIndex);
		});
	}

	// 播放圖示切換（比照 APNG 頁：cat-083 播放、cat-080 暫停）
	function setPlayIcon(isPlaying) {
		if (!playBtn) return;
		playBtn.innerHTML = isPlaying
			? '<small class="cat cat-080 cat-2x cat-color03"></small>'
			: '<small class="cat cat-083 cat-2x cat-color03"></small>';
	}

	function play() {
		if (frames.length === 0) return;
		playing = true;
		setPlayIcon(true);
		tick();
	}

	function tick() {
		if (playTimer) clearTimeout(playTimer);
		playTimer = setTimeout(function () {
			if (!playing) return;
			showFrame(currentIndex + 1);
			tick();
		}, FIXED_DELAY);
	}

	function stopPlay() {
		playing = false;
		setPlayIcon(false);
		if (playTimer) {
			clearTimeout(playTimer);
			playTimer = null;
		}
	}

	// ============================================================
	// 送出到 APNG 頁（取代模式）
	// ============================================================
	async function sendToApng() {
		if (sending) return;
		if (!frames.length) {
			setStatusKey('fxNeedImage');
			return;
		}
		// 檢查 APNG 頁的函式是否都在（避免外掛式載入失敗）
		if (typeof clearAll !== 'function' || typeof addFiles !== 'function') {
			setStatusKey('fxSendFail', { msg: 'APNG functions not found' });
			return;
		}

		// 先把還在等待／執行中的生成收斂掉，避免送出前一組影格
		if (genTimer) {
			clearTimeout(genTimer);
			genTimer = null;
			genPromise = generate();
		}
		if (genPromise) {
			try { await genPromise; } catch (e) { /* generate 內部已自行處理 */ }
		}

		// APNG 頁已有影格 → 先確認（本頁固定為「取代」）
		let existing = 0;
		try { existing = files.length; } catch (e) { existing = 0; }
		if (existing > 0 && !window.confirm(tr('fxReplaceConfirm'))) return;

		sending = true;
		sendBtn.disabled = true;
		stopPlay();
		setStatusKey('');

		try {
			// 逐格轉 PNG（File 型態，addFiles() 只認 image/png 的 File）
			const newFiles = [];
			for (let i = 0; i < frames.length; i++) {
				const blob = await new Promise(function (resolve) {
					frames[i].toBlob(resolve, 'image/png');
				});
				if (!blob) throw new Error('toBlob failed');
				newFiles.push(new File(
					[blob],
					'fx-' + String(i + 1).padStart(3, '0') + '.png',
					{ type: 'image/png' }
				));
			}

			clearAll();
			await addFiles(newFiles);

			// addFiles → rebuildPreviews 會把不足的延遲補成 100ms，
			// 這裡再明確覆寫一次，確保「固定 100ms」不被其他預設值影響
			try {
				for (let i = 0; i < frameDelays.length; i++) frameDelays[i] = FIXED_DELAY;
				
			} catch (e) { /* 忽略：萬一 frameDelays 不在全域 */ }

			if (typeof renderTimeline === 'function') renderTimeline();
			if (typeof showFrame === 'function') showFrame(0);
			if (typeof updatePlaybackInfo === 'function') updatePlaybackInfo();
			if (typeof switchTab === 'function') switchTab('tab-app');

			setStatusKey('fxSent', { n: newFiles.length });
		} catch (e) {
			console.error('[FX] 送出失敗:', e);
			setStatusKey('fxSendFail', { msg: e.message || e });
			
		} finally {
			sending = false;
			sendBtn.disabled = frames.length === 0;
		}
	}

	// ============================================================
	// 清空
	// ============================================================
	function clearFx() {
		stopPlay();
		genToken++;
		frames = [];
		currentIndex = 0;
		W = H = 0;
		sourceImg = null;
		baseCanvas = null;
		canvas.width = canvas.height = 0;
		canvas.style.display = 'none';
		// 沒有圖就沒有外框，一起收掉
		if (window.SourceFrame) window.SourceFrame.hide(previewStage);
		previewInfo.style.display = '';
		previewInfo.textContent = tr('fxPreviewEmpty');
		previewArea.style.display = 'none';
		timelineBox.innerHTML = '';
		sendBtn.disabled = true;
		fileInput.value = '';
		setStatusKey('');
		setInfo('');
	}

	// ============================================================
	// 事件綁定
	// ============================================================
	// 點擊／拖曳上傳
	dropZone.addEventListener('click', function () { fileInput.click(); });
	fileInput.addEventListener('change', function () {
		if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
	});
	['dragover', 'dragenter'].forEach(function (ev) {
		dropZone.addEventListener(ev, function (e) {
			e.preventDefault();
			dropZone.classList.add('dragover');
		});
	});
	['dragleave', 'drop'].forEach(function (ev) {
		dropZone.addEventListener(ev, function (e) {
			e.preventDefault();
			dropZone.classList.remove('dragover');
		});
	});
	dropZone.addEventListener('drop', function (e) {
		const dt = e.dataTransfer;
		if (dt && dt.files && dt.files[0]) loadFile(dt.files[0]);
	});

	// 參數滑桿
	frameCountInput.addEventListener('input', function () {
		frameCountVal.textContent = frameCountInput.value;
		scheduleGenerate(200);
	});
	intensityInput.addEventListener('input', function () {
		intensityVal.textContent = intensityInput.value + '%';
		scheduleGenerate(200);
	});

	// 視窗尺寸改變時 CSS 的 max-width / max-height 會改變顯示比例，綠色外框要重算
	window.addEventListener('resize', drawSourceFrame);

	// 播放控制（FX 頁自己的播放器）
	if (playBtn) {
		playBtn.addEventListener('click', function () {
			if (frames.length === 0) return;
			if (playing) stopPlay(); else play();
		});
	}
	if (firstBtn) {
		firstBtn.addEventListener('click', function () {
			stopPlay();
			showFrame(0);
		});
	}
	if (prevBtn) {
		prevBtn.addEventListener('click', function () {
			stopPlay();
			showFrame(currentIndex - 1);
		});
	}
	if (nextBtn) {
		nextBtn.addEventListener('click', function () {
			stopPlay();
			showFrame(currentIndex + 1);
		});
	}
	if (lastBtn) {
		lastBtn.addEventListener('click', function () {
			stopPlay();
			showFrame(frames.length - 1);
		});
	}

	// 送出／清空
	sendBtn.addEventListener('click', sendToApng);
	clearBtn.addEventListener('click', clearFx);

	// 切到別的 Tab 就暫停 FX 播放，避免背景一直跑 timer
	document.querySelectorAll('[data-tab]').forEach(function (btn) {
		btn.addEventListener('click', function () {
			if (btn.dataset.tab !== 'tab-fx') stopPlay();
		});
	});

	// ============================================================
	// 文字（FX 頁）
	// 這一頁的字是「燒進影格」而不是另外疊一層：
	// 預覽看到什麼，送到 APNG 頁就是什麼，不會有用戶以為有字、結果送出卻沒字的落差。
	// APNG 頁自己的文字面板是另一層後製（兩者要分開，因為一個是特效畫面、一個是事後加字）
	// ============================================================
	let fxText = null;
	(function mountFxTextPanel() {
		const host = document.getElementById('textHostFx');
		if (!host || !window.TextOverlay) return;
		fxText = window.TextOverlay.mount(host, {
			prefix: 'fx',
			// 字一改就要重新產格，否則預覽還是舊的畫面
			onChange: function () { scheduleGenerate(150); }
		});
	})();

	// ============================================================
	// 初始化
	// ============================================================
	// 預設特效取「清單上看得到的第一支」——第一支若剛好被 hidden 掉，才不會出現
	// 「預覽在跑、右側卻沒有任何一項亮著」的怪畫面
	selectedId = (FX_RECIPES.find(function (r) { return !r.hidden; }) || FX_RECIPES[0]).id;
	renderEffectList();
	selectEffect(selectedId);
	frameCountVal.textContent = frameCountInput.value;
	intensityVal.textContent = intensityInput.value + '%';
	setStatusKey('fxNeedImage');

	// 切換語言時把「程式寫死的動態文字」重新翻一次：
	//   1. 狀態列（例如「請先選一張圖片」）——它不在 data-i18n 掃描範圍內
	//   2. 沒有圖時的預覽提示
	//   3. 影格位置文字（第 i／n 格）——重畫目前影格最省事，畫面也一致
	function refreshLangTexts() {
		if (statusBox) statusBox.textContent = statusSpec ? tr(statusSpec.key, statusSpec.vars) : '';
		updateKHint();   // 4. 強度說明（也是程式寫進去的，切語言要重翻）
		if (!sourceImg && previewInfo && previewInfo.style.display !== 'none') {
			previewInfo.textContent = tr('fxPreviewEmpty');
		}
		if (frames.length) showFrame(currentIndex);
	}

	// 切換語言時，i18n 會叫這支把參數滑桿的標籤重畫一次（標籤是動態產生的，沒有 data-i18n）
	window.fxRenderParams = renderParams;
	// 同上，特效清單的名稱也是程式產生的，切語言要整個重畫（不然會停在切換前那個語言）
	window.fxRenderEffectList = renderEffectList;
	// 狀態列／預覽提示／影格位置文字（同樣是程式寫進去的，切語言要重翻）
	window.fxRefreshLangTexts = refreshLangTexts;
})();
