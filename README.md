# GAS × Gemini AI 業務レポート自動生成ツール

> **ポートフォリオ資料です。GASとGemini APIを組み合わせた業務効率化ツールの実装例です。**

---

## プロジェクト概要

Google スプレッドシートに蓄積された売上・業務データを Gemini API で自動分析し、サマリーレポートを同じスプレッドシートのレポートシートに書き出す Google Apps Script ツールです。

毎週月曜日の朝にトリガーで自動実行することで、週次レポートを人手をかけずに生成できます。

---

## 技術スタック

| 技術 | 用途 |
|------|------|
| Google Apps Script (GAS) | バックエンド実行環境（サーバーレス） |
| Gemini API (Google AI Studio) | AIによるデータ分析・サマリー生成 |
| Google スプレッドシート | データ入力・レポート出力の両方 |
| GAS PropertiesService | APIキーの安全な管理 |

---

## 機能一覧

1. **データ取得**: スプレッドシートの指定シート・指定範囲からデータを読み込む
2. **AI分析**: 取得したデータと分析プロンプトを Gemini API に送信する
3. **レポート出力**: Gemini の分析結果をレポートシートに自動書き出しする
4. **定期実行**: GASトリガーで毎週月曜日朝9時に自動実行

---

## セットアップ手順

### 1. Google AI Studio で Gemini API キーを取得する

詳細は [docs/setup.md](docs/setup.md) を参照。

### 2. GAS スクリプトプロパティに API キーを設定する

GAS エディタ → プロジェクトの設定 → スクリプトプロパティ に以下を追加：

| プロパティ名 | 値 |
|------------|-----|
| `GEMINI_API_KEY` | 取得した API キー |

**API キーは絶対にコードに直書きしないこと。**

### 3. スプレッドシートを準備する

- **データシート**（例: `SalesData`）: 分析対象の売上・業務データを入力
- **レポートシート**（例: `WeeklyReport`）: AI分析結果の出力先

シート構成の詳細は [docs/setup.md](docs/setup.md) を参照。

### 4. GAS プロジェクトにコードを設置する

`Code.gs` の内容を GAS エディタにコピーして保存する。

### 5. トリガーを設定する

GAS エディタ → トリガー → トリガーを追加 で `runWeeklyReport` を毎週月曜日朝9時に設定。

---

## GAS テンプレート集（`templates/` フォルダ）

業務自動化でよく使うGASスクリプトを6本まとめています。各ファイルをそのままGASエディタにコピーして使えます。

| ファイル | 機能 | 主な用途 |
|---------|------|--------|
| [01_auto_email_from_sheet.js](templates/01_auto_email_from_sheet.js) | スプレッドシートから一括メール送信 | 顧客リストへのお知らせ・通知 |
| [02_sheet_to_pdf.js](templates/02_sheet_to_pdf.js) | スプレッドシート → PDF自動生成 | 請求書・見積書のPDF化 |
| [03_form_to_line_notify.js](templates/03_form_to_line_notify.js) | Googleフォーム → LINE即時通知 | 問い合わせ・申込みリアルタイム通知 |
| [04_weekly_report_generator.js](templates/04_weekly_report_generator.js) | 週次レポート自動生成・HTMLメール送信 | 売上集計・週次サマリー配信 |
| [05_slack_notification.js](templates/05_slack_notification.js) | シート更新 → Slack通知 | 閾値超えアラート・ステータス変更通知 |
| [06_gemini_ai_analysis.js](templates/06_gemini_ai_analysis.js) | GAS × Gemini AI データ自動分類 | 問い合わせ分類・優先度付け |

### 全テンプレート共通のポイント

- **APIキーはコードに書かない**: `PropertiesService.getScriptProperties()` で安全に管理
- **設定値は `CONFIG` オブジェクトにまとめる**: シート名・メールアドレス等を一か所で変更できる
- **エラーハンドリング実装済み**: 本番投入してもクラッシュしにくい設計
- **コメント充実**: GAS初心者でも読めるよう丁寧に解説

---

## こだわりポイント（スキルアピール）

### 1. AIを活用した実践的な業務自動化
単なるデータ集計ではなく、Gemini AIによる自然言語での分析・洞察抽出を実装。「数字を見る」から「意味を読む」へのシフトを自動化した。

### 2. セキュアなAPIキー管理
APIキーを `PropertiesService` で管理し、コードへのハードコードを完全排除。GitHubに公開しても機密情報が漏れない設計。

### 3. ゼロコストで運用可能なアーキテクチャ
GAS（無料）+ Google スプレッドシート（無料）+ Gemini API（無料枠あり）の組み合わせで、インフラコスト0で業務自動化を実現。

### 4. 再利用可能なモジュール設計
データ取得・API呼び出し・レポート書き出しを関数単位で分離しており、別のデータ・別のプロンプトにも容易に流用できる。

---

## 作者

- **GitHub**: [@hariku0212](https://github.com/hariku0212)
- **バックグラウンド**: 大手メーカー勤務（エンジニア）
- **資格**: 基本情報技術者 / 応用情報技術者
- **得意領域**: GAS業務自動化 / LINE Bot / AI連携 / Google Workspace
