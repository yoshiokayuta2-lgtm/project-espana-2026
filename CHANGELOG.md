# v6.2.1

- GitHub Pages/ブラウザキャッシュ対策として JS/CSS/config のファイル名を変更
- フッターを v6.2.1 表示に変更
- v6.2 のUI修正内容はそのまま維持

# v6.2

- ログイン画面の「出題 → 手書き提出 → …」説明行を削除
- 丸い「添」「書」を廃止し、先生=添削クリップボード / 生徒=ノートの線画アイコンへ変更
- iPhoneの入力フォーカス時の自動拡大対策として、モバイル入力欄を16px以上に固定
- スマホのログインカード余白・ボタン・見出しサイズを最適化
- `student-login` Edge Function用 `service_role` 権限をSQLへ反映
- Supabase手順書のAnonymous Auth設定を実運用結果に合わせて修正

# v6.1

- GitHub PagesでSupabase共有モードに切り替わらない場合の対策を追加
- Supabase JSのCDN読み込みを jsDelivr → unpkg の順でフォールバック
- config.js / app.js / styles.css にキャッシュバスターを追加
- 「設定不足」と「SDK読み込み失敗」を画面上で区別して表示
- フッターに v6.1 を表示し、公開版の判別を容易に

# CHANGELOG

## v6
- Supabase Project URL / Publishable key を接続済みに変更
- GitHub Pagesへそのまま公開できる共有運用版に更新
- DashboardへDeployした `student-login` Edge Functionコードを同梱版にも反映
- メイン画像は上端が切れない `object-fit: contain; object-position: center top` 表示を維持
- 日本史 / 世界史の科目表示、生徒管理、課題PDF、答案写真、添削返却フローを維持

## v5
- GitHub Pages公開向け構成へ整理
- Supabase schema / Edge Function / setup guideを追加
- メイン画像の上切れを修正
