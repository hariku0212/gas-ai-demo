# セットアップガイド

> GAS × Gemini AI 業務レポート自動生成ツール — 詳細セットアップ手順

---

## Step 1: Google AI Studio で Gemini API キーを取得する

1. [Google AI Studio](https://aistudio.google.com/) を開く
2. 「Get API key」ボタンをクリック
3. 「Create API key in new project」または既存プロジェクトを選択
4. 生成された API キーをコピーして安全な場所に一時保存

> **注意**: API キーは第三者に共有しないこと。Google AI Studio の無料枚（1分あたり15リクエスト、１日1500リクエスト）で本ツールは十分動作する。

---

## Step 2: GAS スクリプトプロパティに GEMINI_API_KEY を設定する

1. [Google Apps Script](https://script.google.com) でプロジェクトを開く（または新規作成）
2. 左サイドバーの「プロジェクトの設定」（歯車アイコン）をクリック
3. 下にスクロールして「スクリプト プロパティ」セクションを見つける
4. 「スクリプト プロパティを追加」をクリック
5. 以下の値を入力して「スクリプト プロパティを保存」をクリック：

| プロパティ名 | 値 |
|------------|-----|
| `GEMINI_API_KEY` | Step 1 でコピーした API キー |

> スクリプトプロパティはGASの管理画面にのみ保存され、コードファイルには含まれない。GitHubに公開してもAPIキーは漏れない。

---

## Step 3: スプレッドシートのシート構成を準備する

Google スプレッドシートに以下の2つのシートを用意する。

### データシート（SalesData）

| A | B | C | D | E |
|---|---|---|---|---|
| 日付 | 商品名 | カテゴリ | 売上金額 | 個数 |

### レポートシート（WeeklyReport）

AI分析結果の出力先シート。ツール実行時に自動作成されるため、事前作成は不要。

---

## Step 4: GAS にコードを設置する

1. GAS エディタで `コード.gs`（デフォルトのファイル）を開く
2. 既存のコードをすべて削除する
3. `Code.gs` の内容をコピー＆ペーストする
4. Ctrl+Sで保存

### CONFIG の変更（必要に応じて）

```javascript
const CONFIG = {
  DATA_SHEET_NAME: 'SalesData',       // 実際のデータシート名に変更
  DATA_RANGE: 'A1:E50',               // 実際のデータ範囲に変更
  REPORT_SHEET_NAME: 'WeeklyReport',  // 変更任意
  GEMINI_MODEL: 'gemini-1.5-flash',   // 変更不要
};
```

---

## Step 5: トリガーの設定

1. GAS エディタの左サイドバーから「トリガー」をクリック
2. 「トリガーを追加」をクリック
3. 以下のように設定

| 項目 | 設定値 |
|------|--------|
| 実行する関数 | `runWeeklyReport` |
| イベントのソース | 時間主導型 |
| タイプ | 週ベースのタイマー |
| 曜日 | 毎週月曜日 |
| 時刻 | 午前9時〜10時 |

---

## Step 6: 動作確認（初回手動実行）

1. GAS エディタで関数選択ドロップダウンから `runWeeklyReport` を選択
2. 「実行」ボタンをクリック
3. 初回実行時は「承認が必要です」ダイアログ→「権限を確認」→「許可」
4. 実行完了後、スプレッドシートの `WeeklyReport` シートにレポートが出力されていることを確認

---

## トラブルシューティング

### 「GEMINI_API_KEY が設定されていません」エラー

→ Step 2 の手順でスクリプトプロパティを再確認する。

### Gemini API エラー（HTTP 429）

→ API の利用制限に達している。しばらく待ってから再実行する。

---

## 参考リンク

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API ドキュメント](https://ai.google.dev/docs)
- [GAS PropertiesService](https://developers.google.com/apps-script/reference/properties/properties-service)
