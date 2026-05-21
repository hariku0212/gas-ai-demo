/**
 * GAS × Gemini AI 業務レポート自動生成ツール
 *
 * 概要:
 *   Google スプレッドシートの売上・業務データを Gemini API で自動分析し、
 *   サマリーレポートを同じスプレッドシートのレポートシートに書き出す。
 *
 * 事前設定:
 *   GAS スクリプトプロパティに GEMINI_API_KEY を登録すること。
 *   GAS エディタ → プロジェクトの設定 → スクリプトプロパティ → 追加
 */

// ===== 設定値 =====
const CONFIG = {
  DATA_SHEET_NAME: 'SalesData',       // 分析対象データのシート名
  DATA_RANGE: 'A1:E50',               // 取得するデータ範囲
  REPORT_SHEET_NAME: 'WeeklyReport',  // レポート出力先シート名
  GEMINI_MODEL: 'gemini-1.5-flash',   // 使用するGeminiモデル
};

// ===== APIキー取得 =====

/**
 * PropertiesServiceかGemini APIキーを読み込む。
 * APIキーはスクリプトプロパティ 'GEMINI_API_KEY' に事前登録すること。
 *
 * @returns {string} Gemini API キー
 * @throws {Error} APIキーが設定されていない場合
 */
function getGeminiApiKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY がスクリプトプロパティに設定されていません。\n' +
      'GAS エディタ → プロジェクトの設定 → スクリプトプロパティ から登録してください。'
    );
  }
  return apiKey;
}

// ===== データ取得 =====

/**
 * スプレッドシートから分析対象データを取得する。
 *
 * @param {string} sheetName - 取得対象のシート名
 * @param {string} dataRange - 取得するセル範囲（例: 'A1:E50'）
 * @returns {string} CSV形式に変換したデータ文字列
 */
function getDataForAnalysis(sheetName, dataRange) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`シート "${sheetName}" が見つかりません。スプレッドシートにシートを作成してください。`);
  }

  const range = sheet.getRange(dataRange);
  const values = range.getValues();

  const csvRows = values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => row.join(','));

  return csvRows.join('\n');
}

// ===== Gemini API呼び出し =====

/**
 * Gemini APIにデータを送信して分析結果を取得する。
 *
 * @param {string} data - 分析対象データ（CSV形式の文字列）
 * @param {string} prompt - 分析指示プロンプト
 * @returns {string} Geminiの分析結果テキスト
 */
function analyzeWithGemini(data, prompt) {
  const apiKey = getGeminiApiKey();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `${prompt}\n\n以下はデータです（CSV形式）:\n\n${data}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (statusCode !== 200) {
    Logger.log(`Gemini API エラー: HTTP ${statusCode}`);
    throw new Error(`Gemini API リクエスト失敗 (HTTP ${statusCode}): ${responseText}`);
  }

  const responseJson = JSON.parse(responseText);

  if (!responseJson.candidates || responseJson.candidates.length === 0) {
    throw new Error('Gemini API からの応答が空でした。');
  }

  const candidate = responseJson.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('Gemini API のレスポンス形式が想定外です。');
  }

  return candidate.content.parts[0].text;
}

// ===== レポート書き出し =====

/**
 * 分析結果をレポートシートに書き出す。
 *
 * @param {string} result - Geminiの分析結果テキスト
 */
function writeReport(result) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let reportSheet = ss.getSheetByName(CONFIG.REPORT_SHEET_NAME);

  if (!reportSheet) {
    reportSheet = ss.insertSheet(CONFIG.REPORT_SHEET_NAME);
  }

  reportSheet.clearContents();

  const now = new Date();
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');

  reportSheet.getRange('A1').setValue('週次 AI 分析レポート');
  reportSheet.getRange('A2').setValue(`生成日時: ${timestamp}`);
  reportSheet.getRange('A3').setValue('---');

  const lines = result.split('\n');
  lines.forEach((line, index) => {
    reportSheet.getRange(4 + index, 1).setValue(line);
  });

  reportSheet.getRange('A1').setFontSize(14).setFontWeight('bold');
  reportSheet.getRange('A2').setFontColor('#666666');

  Logger.log(`レポートをシート "${CONFIG.REPORT_SHEET_NAME}" に書き出しました（${lines.length}行）。`);
}

// ===== メイン実行関数 =====

/**
 * メインの実行関数。GASトリガーで定期実行できる形式。
 *
 * 処理フロー:
 *   1. データシートからデータを取得
 *   2. Gemini APIで分析
 *   3. レポートシートに書き出し
 */
function runWeeklyReport() {
  Logger.log('===== 週次レポート生成 開始 =====');

  try {
    const data = getDataForAnalysis(CONFIG.DATA_SHEET_NAME, CONFIG.DATA_RANGE);
    Logger.log(`データ取得完了（${data.split('\n').length}行）`);

    const analysisPrompt = `
あなたは優秀なビジネスアナリストです。
以下のスプレッドシートデータを分析し、週次レポートとして以下の内容を日本語でまとめてください：

1. **今週のサマリー**: データ全体の概要を３〜５文で説明する
2. **主要指標**: 重要な数値・KPIを箇条書きでリストアップする
3. **注目ポイント**: 特に目立つ傾向・変化・異常値があれば指摘する
4. **課題・憸念事項**: 改善が必要と思われる点を挙げる
5. **来週への推奨アクション**: 次のステップとして推奨する具体的な行動を提案する

出力は読みやすいMarkdown形式で、経営者が5分で理解できるよう簡潔にまとめてください。
    `.trim();

    const analysisResult = analyzeWithGemini(data, analysisPrompt);
    Logger.log('Gemini 分析完了');

    writeReport(analysisResult);

    Logger.log('===== 週次レポート生成 完了 =====');

  } catch (error) {
    Logger.log(`エラーが発生しました: ${error.message}`);

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let reportSheet = ss.getSheetByName(CONFIG.REPORT_SHEET_NAME);
      if (!reportSheet) {
        reportSheet = ss.insertSheet(CONFIG.REPORT_SHEET_NAME);
      }
      reportSheet.clearContents();
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
      reportSheet.getRange('A1').setValue('レポート生成エラー');
      reportSheet.getRange('A2').setValue(`発生日時: ${timestamp}`);
      reportSheet.getRange('A3').setValue(`エラー内容: ${error.message}`);
      reportSheet.getRange('A1').setFontColor('#cc0000').setFontWeight('bold');
    } catch (writeError) {
      Logger.log(`エラー記録にも失敗: ${writeError.message}`);
    }

    throw error;
  }
}
