# Supabase設定ガイド

この順で進めます。OpenAI APIはまだ不要です。

## 1. Supabase Projectを作る

1. Supabase Dashboardを開く
2. `New project` を押す
3. Project name：例 `guchi-history`
4. Database password：自動生成でもOK。必ず安全な場所に保存
5. Region：日本から近いリージョンを選択
6. Projectを作成

## 2. DB / RLS / Storageを一括作成

1. 左メニュー `SQL Editor`
2. `New query`
3. このZIP内の `supabase-schema.sql` を全部貼り付ける
4. `Run`
5. エラーが出なければOK

これで以下ができます。

- assignments
- students
- student_secrets
- student_devices
- submissions
- answer-images Storage
- worksheet-pdfs Storage
- RLS

## 3. Auth設定

### 生徒用：Anonymous Sign-InsをON

Authenticationの設定画面で：

- `Allow anonymous sign-ins` → ON

### 匿名生徒ログインに必要な設定

- `Allow new users to sign up` → ON
- `Allow anonymous sign-ins` → ON

匿名サインインもAuth上は新しいユーザー作成になるため、両方ONが必要です。
先生アカウントはサイト側に新規登録画面を置かず、Dashboardから作成します。

## 4. 先生アカウントを作る

Authentication → Users から、先生本人のメールでユーザーを作成します。

このアプリでは、通常のメール認証ユーザーを先生として扱います。
匿名ユーザーは生徒扱いです。

## 5. student-login Edge Functionを作る

### Dashboardから行う場合

1. 左メニュー `Edge Functions`
2. 新しいFunctionを作成
3. 名前を必ず `student-login` にする
4. ZIP内の `supabase/functions/student-login/index.ts` の中身を貼り付ける
5. Deploy
6. Function Settingsで `Verify JWT with legacy secret` をOFF

このFunctionは：

- 生徒名
- ログインコード
- 匿名Authユーザー

を安全に紐付けます。

## 6. Project URL / Publishable keyを取得

Supabase DashboardのAPI設定から次の2つを確認します。

- Project URL
- Publishable key

Secret keyは使いません。

## 7. config.jsへ入力

```js
window.HISTORY_APP_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabasePublishableKey: "sb_publishable_xxxxxxxxx",
  ocrEndpoint: "",
  worksheetParseEndpoint: ""
};
```

## 8. GitHubへconfig.jsを反映

変更した `config.js` をGitHubへアップロードしてコミットします。
GitHub Pagesの更新後、サイトを再読み込みします。

ログイン画面に

`Supabase共有モードです。先生・生徒が別端末から使えます。`

と出れば接続済みです。

## 9. 最初の動作確認

### 先生PC

1. 先生メール / パスワードでログイン
2. `生徒管理`
3. 生徒を1人登録
4. ログインコードを確認
5. 日本史 / 世界史を選択

### 生徒スマホ

1. GitHub PagesのURLを開く
2. 名前を入力
3. ログインコードを入力
4. 生徒としてログイン

### 先生PC

1. 課題を公開

### 生徒スマホ

1. 課題が表示されることを確認
2. 写真を提出

### 先生PC

1. 提出が表示されることを確認
2. 添削して返却

ここまで通れば、OpenAI API以外の基盤は完成です。
