/**
 * 蛋殼喵 APNG 工具 — Supabase 設定
 * @author [DaiEn]
 * @Date: 2026-11-10
 * @Correction: 2
 *
 * 把下面三個常數換成你自己 Supabase 專案的值：
 *   - enabled     設 true 才會啟用分享功能（false = 隱藏分享按鈕、不連 Supabase）
 *   - url         從 Supabase後台 → Project Settings → API → Project URL
 *   - anonKey     從 Supabase後台 → Project Settings → API → anon public
 *   - bucket      儲存 bucket 名稱
 */
window.SUPABASE_CONFIG = {
  enabled: true,  // ← 分享功能開關：true = 啟用，false = 關閉（不顯示分享按鈕）
  url: 'https://thqqfiqdrjwlcngxlrjt.supabase.co',
  anonKey: 'sb_publishable_SkZTiwPIwUFsEJ6ADn1meQ_XCLIXEHW',
  bucket: 'apng-uploads'
};
