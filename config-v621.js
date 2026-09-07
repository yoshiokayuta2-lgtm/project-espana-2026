// GUCHIの歴史添削隊 - 接続設定
//
// GitHub Pagesに置く公開設定です。
// ここに入れてよいのは Supabase の Project URL と Publishable key だけです。
// Secret key / service_role key / OpenAI API key は絶対に入れないでください。
window.HISTORY_APP_CONFIG = {
  supabaseUrl: "https://kacfozgubzqijfuglpmg.supabase.co",
  supabasePublishableKey: "sb_publishable_jJH9eGsRgE4rv9kA--8sww_DC2ZmekL",

  // OpenAI API契約後に使います。
  // 未設定の間は、手書きOCR / PDF自動課題化はデモ動作です。
  ocrEndpoint: "",
  worksheetParseEndpoint: ""
};
