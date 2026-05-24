/**
 * 06_gemini_ai_analysis.js
 * ============================================================
 * GAS × Gemini AI - スプレッドシートデータ自動分類スクリプト
 * ============================================================
 *
 * 【機能】
 *   スプレッドシートの「未分類」シートから問い合わせ内容などの
 *   テキストデータを読み込み、Gemini AIが自動で:
 *   - カテゴリに分類
 *   - 優先度（高/中/低）を判定
 *   - 内容を要約
 *   - 推奨アクションを提案
 *
 * 【事前準備】
 *   1. Google AI Studio (aistudio.google.com) でGemini APIキーを取得
 *   2. setupApiKey() を実行してAPIキーを安全に保存
 *   3. スプレッドシートに「未分類」シートを作成
 *      B列に分類したいテキストを入力する
 * ============================================================
 */

const GEMINI_CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  INPUT_SHEET_NAME: '未分類',
  OUTPUT_SHEET_NAME: '分類済み',
  INPUT_COLUMN: 'B',
  START_ROW: 2,
  CATEGORIES: ['問い合わせ', 'クレーム', '注文・購入', '資料請求', '採用・求人', 'その他'],
};

function runAnalysis() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) { SpreadsheetApp.getUi().alert('先にsetupApiKey()を実行してAPIキーを設定してください。'); return; }

  const ss = SpreadsheetApp.openById(GEMINI_CONFIG.SPREADSHEET_ID);
  const inputSheet = ss.getSheetByName(GEMINI_CONFIG.INPUT_SHEET_NAME);
  if (!inputSheet) { SpreadsheetApp.getUi().alert('「未分類」シートが見つかりません。'); return; }

  const outputSheet = getOrCreateOutputSheet_(ss);
  setupOutputHeader_(outputSheet);

  const lastRow = inputSheet.getLastRow();
  if (lastRow < GEMINI_CONFIG.START_ROW) { SpreadsheetApp.getUi().alert('分類するデータがありません。'); return; }

  const data = inputSheet.getRange(GEMINI_CONFIG.START_ROW, 1, lastRow - GEMINI_CONFIG.START_ROW + 1, inputSheet.getLastColumn()).getValues();
  const colIndex = GEMINI_CONFIG.INPUT_COLUMN.toUpperCase().charCodeAt(0) - 65;
  const results = [];
  let processedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const text = String(data[i][colIndex] || '').trim();
    if (!text) continue;
    try {
      const analysis = callGeminiAPI_(text, apiKey);
      results.push([new Date(), text, analysis.category, analysis.priority, analysis.summary, analysis.suggested_action, ...data[i]]);
      processedCount++;
      if (i < data.length - 1) Utilities.sleep(1000);
    } catch (e) {
      results.push([new Date(), text, 'エラー', '-', e.message, '-', ...data[i]]);
    }
  }

  if (results.length > 0) {
    const startRow = outputSheet.getLastRow() + 1;
    outputSheet.getRange(startRow, 1, results.length, results[0].length).setValues(results);
    outputSheet.autoResizeColumns(1, 6);
  }

  SpreadsheetApp.getUi().alert(`✅ 分類完了\n処理件数: ${processedCount}件\n出力先: 「${GEMINI_CONFIG.OUTPUT_SHEET_NAME}」シート`);
}

function callGeminiAPI_(text, apiKey) {
  const prompt = `以下のテキストを分析してJSON形式で回答してください。\nテキスト: """${text}"""\n分類カテゴリ（1つ選択）: ${GEMINI_CONFIG.CATEGORIES.join('、')}\n回答形式（JSONのみ）:\n{"category":"カテゴリ名","priority":"高 or 中 or 低","summary":"要約50文字以内","suggested_action":"推奨アクション50文字以内"}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'POST', contentType: 'application/json',
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 256 } }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200)
    throw new Error(`Gemini API エラー (${response.getResponseCode()})`);

  const generated = JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
  const jsonMatch = generated.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('APIレスポンスのJSON解析に失敗しました');
  return JSON.parse(jsonMatch[0]);
}

function setupApiKey() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt('Gemini APIキー設定', 'Google AI StudioのAPIキーを入力してください:', ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', result.getResponseText().trim());
    ui.alert('✅ APIキーを保存しました。');
  }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🤖 AI分析')
    .addItem('📊 データを分類する', 'runAnalysis')
    .addSeparator()
    .addItem('🔑 APIキーを設定する', 'setupApiKey')
    .addItem('🧪 テスト実行（1件）', 'runTestAnalysis')
    .addToUi();
}

function runTestAnalysis() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) { SpreadsheetApp.getUi().alert('先にsetupApiKey()を実行してください。'); return; }
  const result = callGeminiAPI_('GASを使って在庫管理を自動化してほしいのですが、可能ですか？予算は1〜2万円程度です。', apiKey);
  SpreadsheetApp.getUi().alert(`テスト結果:\n分類: ${result.category}\n優先度: ${result.priority}\n要約: ${result.summary}\n推奨: ${result.suggested_action}`);
}

function getOrCreateOutputSheet_(ss) {
  return ss.getSheetByName(GEMINI_CONFIG.OUTPUT_SHEET_NAME) || ss.insertSheet(GEMINI_CONFIG.OUTPUT_SHEET_NAME);
}

function setupOutputHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = ['処理日時', '元テキスト', 'AI分類', '優先度', 'AI要約', '推奨アクション'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}
