/**
 * 蛋殼喵 APNG 工具 — Supabase 設定
 * @author [DaiEn]
 * @Date: 2026-11-11
 * @Correction: 3
 *
 * 把下面幾個常數換成你自己 Supabase 專案的值：
 *   - enabled     設 true 才會啟用分享功能（false = 隱藏分享按鈕、不連 Supabase）
 *   - url         從 Supabase後台 → Project Settings → API → Project URL
 *   - anonKey     從 Supabase後台 → Project Settings → API → anon public
 *   - bucket      儲存 bucket 名稱
 *   - shareHosts  只有這些主機（含埠號）才顯示「分享我的圖片」
 *                 用 location.host 比對，所以預設埠（443 / 80）不會出現 :443
 *                 file:// 開啟時 location.host 是空字串，自然不在白名單內
 *
 * 之後若換網域（例如搬到 EdgeOne Pages），記得把新網域加進 shareHosts，
 * 否則分享按鈕會在新站默默消失。
 */
window.SUPABASE_CONFIG = {
  enabled: true,  // ← 分享功能開關：true = 啟用，false = 關閉（不顯示分享按鈕）
  url: 'https://thqqfiqdrjwlcngxlrjt.supabase.co',
  anonKey: 'sb_publishable_SkZTiwPIwUFsEJ6ADn1meQ_XCLIXEHW',
  bucket: 'apng-uploads',
  shareHosts: [
    'apng-murex.vercel.app',   // 正式站
    'localhost:8080',          // 本機 Spring Boot
    '127.0.0.1:8080'           // 本機另一種寫法
  ]
};

/**
 * 分享功能是否允許 —— 只算一次，share.js 與 apng-encoder.js 共用同一個結果，
 * 避免兩邊各自判斷而出現「一邊顯示、一邊不顯示」的不一致。
 *
 * 注意：這只是前端 UI 遮罩，不是安全機制。
 * /api/upload 端點本身仍是公開的，任何人用 curl 都能直接打，
 * 真正的防護要在後端補（大小上限、內容驗證、限流）。
 */
window.SHARE_ALLOWED = (function () {
  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.enabled) return false;
  const hosts = cfg.shareHosts || [];
  return hosts.indexOf(window.location.host) !== -1;
})();
