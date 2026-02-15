# FlutterFlow & Supabase 設定ガイド

このガイドでは、ハイブリッドアクセス制御（FlutterFlowアプリからNext.jsアプリへの自動ログインと権限管理）を実現するための設定手順を説明します。

## 0. 事前準備: FlutterFlowプロジェクトの作成

まず、FlutterFlow側でアプリを作成し、Supabaseと接続する必要があります。

### 0-1. プロジェクト作成
1. [FlutterFlow](https://app.flutterflow.io/) にログインします。
2. **Create New** をクリックし、プロジェクト名（例: `TestAppTakingPhoto`）を入力して **Create Blank** を選択します。
3. **Setup Firebase** の画面が出たら、今回はSupabaseを使うので **Skip** しても構いません（後で設定も可能です）。

### 0-2. Supabaseとの連携
1. FlutterFlowの画面左側にある **Settings** (歯車アイコン) をクリックします。
2. **Integrations** > **Supabase** を選択します。
3. **Enable Supabase** をオンにします。
4. 以下の情報を入力します（Supabaseダッシュボードの Project Settings > API で確認できます）：
    *   **API URL**: あなたのSupabaseプロジェクトのURL
    *   **Anon Key**: あなたのSupabaseプロジェクトの `anon` key
5. **Get Schema** ボタンをクリックし、Supabaseのテーブル情報が読み込まれることを確認します。

### 0-3. 認証 (Authentication) の有効化
1. **Settings** > **Authentication** を選択します。
2. **Enable Authentication** をオンにします。
3. **Authentication Type** で **Supabase** を選択します。
4. **Login Page** と **Home Page** を作成（または指定）します（FlutterFlowが自動作成してくれるテンプレートを使ってもOKです）。
   *   これを行わないと、アクション設定時に `Authenticated User` 変数が選択できません。

---

## 1. Supabase の設定

Supabase側では、**「どのアプリからアクセスされたか」**を識別し、それに基づいてデータを保護する設定を行います。

### 1-1. マイグレーションの実行

Supabaseのダッシュボードにある **SQL Editor** を開き、以下のSQLを実行してください。これにより、アクセス元判別関数とセキュリティポリシー（RLS）が作成されます。

> **注意**: `https://your-nextjs-app.com` の部分は、実際のNext.jsアプリのドメイン（Vercel等のURL）に書き換えてください。テスト段階ではそのままでも `localhost:3000` が許可されているため動作します。

```sql
-- 1. アクセス元判別関数の作成
CREATE OR REPLACE FUNCTION public.is_restricted_origin()
RETURNS boolean AS $$
BEGIN
  -- OriginヘッダーがNext.jsのドメインと一致するかチェック
  RETURN (
    current_setting('request.headers', true)::json->>'origin' = 'https://testapptakingphoto.web.app' -- 本番ドメイン
    OR current_setting('request.headers', true)::json->>'origin' = 'http://localhost:3000' -- テスト用
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. テーブルの作成 (まだ存在しない場合)
-- これはテスト用のテーブル定義です。既存のテーブルがある場合は読み替えてください。
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  updated_at timestamp with time zone,
  username text,
  full_name text,
  avatar_url text,
  website text,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- 3. テーブルへのRLS有効化 (例: user_profiles テーブル)
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. 読み取りポリシー (SELECT)
-- Next.js (制限されたオリジン) からのアクセスは拒否し、アプリ版からのみ許可する
CREATE POLICY "Allow select for mobile only"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  AND public.is_restricted_origin() = false 
);

-- 5. 書き込みポリシー (UPDATE)
-- どのアプリからでも、本人であれば更新を許可する
CREATE POLICY "Allow update for all apps"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

## 2. FlutterFlow の設定

FlutterFlow側では、ボタンを押した際に **「認証トークンを持った状態でNext.jsのページを開く」** アクションを設定します。

### 2-1. Custom Function の作成

FlutterFlowの標準機能では「リフレッシュトークン」を直接取得できない場合があるため、小さなカスタム関数を作成します。

1. 左側メニューの **Custom Functions** を開く。
2. **+ Create** をクリック。
3. 名前: `getRefreshToken`
4. 戻り値の型 (Return Type): `String` (Nullable にチェックを入れる)
5. **Code** タブに以下を入力:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

String? getRefreshToken() {
  final session = Supabase.instance.client.auth.currentSession;
  return session?.refreshToken;
}
```

6. 依存関係の追加などは不要です（Supabaseはデフォルトで入っています）。
7. **Save** してエラーがないか確認します。

### 2-2. アクションの設定 (Launch URL)

Webビューを開きたいボタン（例: 「Webで編集する」ボタン）を選択し、**Actions** パネルで設定を行います。

1. **Add Action** -> **Launch URL** を選択。
2. **URL** の設定で `Combine Text` を選択します。
3. 以下の5つの要素を順番に追加して、URLを組み立てます。

| 順序 | 種類 | 値 / 設定 | 説明 |
| :--- | :--- | :--- | :--- |
| **1** | Text | `https://testapptakingphoto.web.app/sync#access_token=` | ベースURL (テスト時は `http://localhost:3000/sync`...) |
| **2** | Variable | `Authenticated User` -> `Id Token` | アクセストークン (JWT) |
| **3** | Text | `&refresh_token=` | つなぎの文字 |
| **4** | Custom Function | `getRefreshToken` | さきほど作った関数 |
| **5** | Text | `&token_type=bearer` | おまじない |

これにより、生成されるURLは以下のようになります：
`https://testapptakingphoto.web.app/sync#access_token=eyJ...&refresh_token=Ro2...&token_type=bearer`

### 2-3. 動作確認

1. Next.jsを起動 (`npm run dev`)。
2. FlutterFlowを **Test Mode** または **Local Run** で起動。
3. アプリでログインする。
4. ボタンを押す。
5. ブラウザが立ち上がり、Next.jsの画面に遷移した後、自動的にログイン状態になることを確認する。
