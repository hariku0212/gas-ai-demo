/**
 * 02_sheet_to_pdf.js
 * ============================================================
 * スプレッドシート → PDF 自動生成スクリプト
 * ============================================================
 *
 * 【機能】
 *   指定シートをPDFに変換してGoogleドライブの指定フォルダに保存します。
 *   オプションで、生成したPDFをメールで送付できます。
 *
 * 【事前準備】
 *   保存先フォルダのIDをGoogleドライブのURLから取得してください。
 *   例: https://drive.google.com/drive/folders/XXXXXXXXXX → XXXXXXXXXX
 * ============================================================
 */

const PDF_CONFIG = {
  SHEET_NAME: '請求書',
  FOLDER_ID: 'YOUR_FOLDER_ID_HERE',
  FILE_PREFIX: '請求書_',
  DATE_FORMAT: 'yyyyMMdd',
  SEND_EMAIL: false,
  EMAIL_TO: 'recipient@example.com',
  EMAIL_SUBJECT: '請求書をお送りします',
  EMAIL_BODY: '請求書をPDFで添付いたします。ご確認ください。',
  SENDER_NAME: '株式会社サンプル',
  PDF_OPTIONS: {
    size: 'A4', portrait: true, fitw: true,
    sheetnames: false, printtitle: false, pagenumbers: false,
    gridlines: false, fzr: false,
  },
};

function exportSheetAsPdf() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PDF_CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`シート "${PDF_CONFIG.SHEET_NAME}" が見つかりません。`);

  let folder;
  try {
    folder = DriveApp.getFolderById(PDF_CONFIG.FOLDER_ID);
  } catch (e) {
    throw new Error(`フォルダID "${PDF_CONFIG.FOLDER_ID}" が見つかりません。`);
  }

  const pdfBlob = createPdfBlob_(ss, sheet);
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', PDF_CONFIG.DATE_FORMAT);
  const fileName = `${PDF_CONFIG.FILE_PREFIX}${today}.pdf`;
  pdfBlob.setName(fileName);

  deleteExistingFile_(folder, fileName);
  const savedFile = folder.createFile(pdfBlob);
  Logger.log(`PDF保存完了: ${fileName} / ${savedFile.getUrl()}`);

  if (PDF_CONFIG.SEND_EMAIL) sendPdfByEmail_(pdfBlob, fileName);
  return savedFile;
}

function createPdfBlob_(ss, sheet) {
  const opts = PDF_CONFIG.PDF_OPTIONS;
  const url = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?` +
    `format=pdf&gid=${sheet.getSheetId()}&exportformat=pdf` +
    `&size=${opts.size}&portrait=${opts.portrait}&fitw=${opts.fitw}` +
    `&sheetnames=${opts.sheetnames}&printtitle=${opts.printtitle}` +
    `&pagenumbers=${opts.pagenumbers}&gridlines=${opts.gridlines}&fzr=${opts.fzr}`;

  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200)
    throw new Error(`PDF生成失敗: HTTP ${response.getResponseCode()}`);

  return response.getBlob();
}

function deleteExistingFile_(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  while (files.hasNext()) files.next().setTrashed(true);
}

function sendPdfByEmail_(pdfBlob, fileName) {
  GmailApp.sendEmail(PDF_CONFIG.EMAIL_TO, PDF_CONFIG.EMAIL_SUBJECT, PDF_CONFIG.EMAIL_BODY, {
    name: PDF_CONFIG.SENDER_NAME,
    attachments: [pdfBlob],
  });
  Logger.log(`PDF送付完了 → ${PDF_CONFIG.EMAIL_TO}`);
}
