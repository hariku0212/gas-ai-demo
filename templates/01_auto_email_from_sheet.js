/**
 * 01_auto_email_from_sheet.js
 * ============================================================
 * スプレッドシートから一括メール送信スクリプト
 * ============================================================
 *
 * 【機能】
 *   スプレッドシートに記載された宛先リストに対して、
 *   個別メールを一括送信します。
 *   送信済みフラグで二重送信を防止します。
 *
 * 【スプレッドシートの列構成（1行目はヘッダー）】
 *   A列: 名前
 *   B列: メールアドレス
 *   C列: 件名
 *   D列: 本文（テンプレート。{{name}} を名前に自動置換）
 *   E列: 送信日時（送信後に自動記入）
 *   F列: ステータス（送信済み / エラー）
 *
 * 【使い方】
 *   1. このスクリプトをGASエディタに貼り付ける
 *   2. SHEET_NAME を対象シート名に変更する
 *   3. sendBulkEmails() を実行する
 *
 * 【注意】
 *   Gmailの1日あたりの送信上限: 無料100件 / G Suite 1500件
 * ============================================================
 */

// ============================================================
// 設定定数（ここを環境に合わせて変更してください）
// ============================================================
const CONFIG = {
  SHEET_NAME: 'メールリスト',       // 対象シート名
  HEADER_ROW: 1,                    // ヘッダー行数
  COL_NAME: 1,                      // A列: 名前
  COL_EMAIL: 2,                     // B列: メールアドレス
  COL_SUBJECT: 3,                   // C列: 件名
  COL_BODY: 4,                      // D列: 本文
  COL_SENT_AT: 5,                   // E列: 送信日時
  COL_STATUS: 6,                    // F列: ステータス
  SENDER_NAME: '株式会社サンプル',  // 送信者名（Fromに表示される）
};

/**
 * メイン関数: スプレッドシートから一括メール送信
 */
function sendBulkEmails() {
  const sheet = getSheet_(CONFIG.SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROW) {
    Logger.log('送信対象のデータがありません。');
    return;
  }

  const startRow = CONFIG.HEADER_ROW + 1;
  const numRows = lastRow - CONFIG.HEADER_ROW;
  const data = sheet.getRange(startRow, 1, numRows, CONFIG.COL_STATUS).getValues();

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  data.forEach((row, index) => {
    const actualRow = startRow + index;
    const name    = row[CONFIG.COL_NAME - 1];
    const email   = row[CONFIG.COL_EMAIL - 1];
    const subject = row[CONFIG.COL_SUBJECT - 1];
    const body    = row[CONFIG.COL_BODY - 1];
    const status  = row[CONFIG.COL_STATUS - 1];

    if (status === '送信済み') { skipCount++; return; }

    if (!email || !subject || !body) {
      sheet.getRange(actualRow, CONFIG.COL_STATUS).setValue('エラー: 必須項目不足');
      errorCount++;
      return;
    }

    if (!isValidEmail_(email)) {
      sheet.getRange(actualRow, CONFIG.COL_STATUS).setValue('エラー: 無効なメールアドレス');
      errorCount++;
      return;
    }

    const personalizedBody = body.toString().replace(/\{\{name\}\}/g, name || '');

    try {
      GmailApp.sendEmail(email, subject, personalizedBody, { name: CONFIG.SENDER_NAME });
      const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
      sheet.getRange(actualRow, CONFIG.COL_SENT_AT).setValue(now);
      sheet.getRange(actualRow, CONFIG.COL_STATUS).setValue('送信済み');
      successCount++;
    } catch (e) {
      sheet.getRange(actualRow, CONFIG.COL_STATUS).setValue(`エラー: ${e.message}`);
      errorCount++;
    }

    Utilities.sleep(500);
  });

  Logger.log(`=== 送信完了 === 成功: ${successCount}件 / スキップ: ${skipCount}件 / エラー: ${errorCount}件`);
}

function getSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) Logger.log(`シート "${sheetName}" が見つかりません。`);
  return sheet || null;
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}
