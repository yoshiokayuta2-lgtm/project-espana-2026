# GUCHIの歴史添削隊 v6.2.1

日本史・世界史の記述添削を、先生と少人数の生徒で共有運用するためのGitHub Pages向けWebアプリです。

## 現在の状態

- Supabase共有モード：接続設定済み
- 先生ログイン：Supabase Auth（メール＋パスワード）
- 生徒ログイン：先生が登録した生徒名＋4桁コード
- 生徒登録：先生画面から可能
- 日本史 / 世界史：科目を明示して課題管理
- PDF課題化：画面フロー実装済み。AI解析はAPI契約後に接続
- 答案写真提出：実装済み
- 手書き文字起こし：画面フロー実装済み。AI OCRはAPI契約後に接続
- 先生添削・返却・書き直し：実装済み
- Private Storage：答案画像 / 課題PDF用

## GitHub Pagesへの公開

このZIPを展開し、中身をGitHubリポジトリのルートにアップロードします。

必要ファイル：

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `favicon.svg`
- `assets/`
- `.nojekyll`

`supabase-schema.sql` と `supabase/` はバックアップ・再設定用なので、同じリポジトリに置いて問題ありません。

GitHubで `Settings` → `Pages` → `Deploy from a branch` → `main / root` を選べば公開できます。

## セキュリティ

`config.js` に入っているのは公開前提の Supabase Project URL と Publishable key だけです。

次の値はGitHubへ絶対に入れないでください。

- Supabase Secret key
- `service_role` key
- OpenAI API key
- Database password

## Supabase側で済ませておく設定

- `supabase-schema.sql` をSQL Editorで実行
- Anonymous sign-ins：ON
- `Allow new users to sign up`：ON（匿名Auth作成に必要）
- 先生ユーザー：Dashboardから作成しAuto confirm
- Edge Function `student-login`：Deploy
- `Verify JWT with legacy secret`：OFF

## 最初の実機テスト

1. GitHub Pagesを開く
2. 先生メール / パスワードでログイン
3. 生徒管理で1人登録
4. 4桁コードを確認
5. 別端末またはシークレットウィンドウで生徒ログイン
6. 課題の表示・提出・返却を確認

AI機能を除く共有運用がここまで通れば基盤完成です。


## v6.2 接続診断

公開ページで次の表示を確認してください。

- `Supabase共有モードです。` → 接続準備OK
- `Supabaseの接続設定は入っていますが…ライブラリを読み込めませんでした` → CDN/ネットワーク読み込み問題
- `現在はブラウザ内デモモードです。` → config.js が未反映

フッターに `v6.2.1` と表示されれば最新ファイルがGitHub Pagesに反映されています。


## v6.2 UI調整

- ログイン画面の説明文「出題 → …」を削除
- 先生 / 生徒の丸い「添」「書」アイコンを、シンプルな線画アイコンに変更
- iPhoneなどで入力欄フォーカス時に拡大されにくいよう、モバイル入力を16px以上に固定
- モバイル時の余白・カード・ボタンサイズを調整
- `student-login` 用 `service_role` 権限を `supabase-schema.sql` に反映


## v6.2.1 キャッシュ対策

GitHub Pages / ブラウザの古いJS・CSSキャッシュを確実に避けるため、`app-v621.js` / `styles-v621.css` / `config-v621.js` の固定別名ファイルに変更しました。
