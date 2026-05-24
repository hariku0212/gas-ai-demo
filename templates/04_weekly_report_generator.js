/**
 * 04_weekly_report_generator.js
 * ============================================================
 * 週次集計レポート 自動生成・HTMLメール送信スクリプト
 * ============================================================
 *
 * 【スプレッドシート構成（「売上データ」シート）】
 *   A: 日付 / B: 案件名 / C: 売上金額 / D: 件数 / E: カテゴリ
 *
 * 【トリガー設定】
 *   sendWeeklyReport / 時間主導型 / 週タイマー / 毎週月曜日 / 朝9時
 * ============================================================
 */

const REPORT_CONFIG = {
  SHEET_NAME: '売上データ',
  HEADER_ROW: 1,
  COL_DATE: 1, COL_NAME: 2, COL_AMOUNT: 3, COL_COUNT: 4, COL_CATEGORY: 5,
  EMAIL_TO: 'manager@example.com',
  EMAIL_CC: '',
  SENDER_NAME: '業務システム',
  CURRENCY: '円',
  COMPANY_NAME: '株式会社サンプル',
};

function sendWeeklyReport() {
  const { startDate, endDate } = getLastWeekRange_();
  const summary = aggregateData_(startDate, endDate);
  const subject = `【週次レポート】${formatDate_(startDate)} 〜 ${formatDate_(endDate)}`;
  const htmlBody = buildHtmlReport_(summary, startDate, endDate);

  const opts = { name: REPORT_CONFIG.SENDER_NAME, htmlBody };
  if (REPORT_CONFIG.EMAIL_CC) opts.cc = REPORT_CONFIG.EMAIL_CC;
  GmailApp.sendEmail(REPORT_CONFIG.EMAIL_TO, subject, '※HTMLメーラーでご確認ください。', opts);
  Logger.log(`週次レポート送信完了 → ${REPORT_CONFIG.EMAIL_TO}`);
}

function getLastWeekRange_() {
  const today = new Date();
  const daysToMonday = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const thisMonday = new Date(today); thisMonday.setDate(today.getDate() + daysToMonday); thisMonday.setHours(0,0,0,0);
  const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday); lastSunday.setDate(thisMonday.getDate() - 1); lastSunday.setHours(23,59,59,999);
  return { startDate: lastMonday, endDate: lastSunday };
}

function aggregateData_(startDate, endDate) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REPORT_CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`シート "${REPORT_CONFIG.SHEET_NAME}" が見つかりません。`);

  const lastRow = sheet.getLastRow();
  if (lastRow <= REPORT_CONFIG.HEADER_ROW) return { totalAmount: 0, totalCount: 0, records: [], byCategory: {} };

  const data = sheet.getRange(REPORT_CONFIG.HEADER_ROW + 1, 1, lastRow - REPORT_CONFIG.HEADER_ROW, REPORT_CONFIG.COL_CATEGORY).getValues();
  const records = []; let totalAmount = 0, totalCount = 0; const byCategory = {};

  data.forEach(row => {
    const dateCell = row[0];
    if (!dateCell) return;
    const rowDate = dateCell instanceof Date ? dateCell : new Date(dateCell);
    if (isNaN(rowDate.getTime()) || rowDate < startDate || rowDate > endDate) return;

    const [, name, amount, count, category] = row.map((v, i) => i > 0 ? v : rowDate);
    const amt = Number(amount) || 0, cnt = Number(count) || 0, cat = category || 'その他';
    records.push({ date: rowDate, name, amount: amt, count: cnt, category: cat });
    totalAmount += amt; totalCount += cnt;
    if (!byCategory[cat]) byCategory[cat] = { amount: 0, count: 0 };
    byCategory[cat].amount += amt; byCategory[cat].count += cnt;
  });

  records.sort((a, b) => a.date - b.date);
  return { totalAmount, totalCount, records, byCategory };
}

function buildHtmlReport_(summary, startDate, endDate) {
  const { totalAmount, totalCount, records, byCategory } = summary;
  const categoryRows = Object.entries(byCategory).sort((a,b) => b[1].amount - a[1].amount)
    .map(([cat, d]) => `<tr><td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml_(cat)}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right">${d.count}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right">${d.amount.toLocaleString()}${REPORT_CONFIG.CURRENCY}</td></tr>`).join('');
  const generatedAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;color:#333;max-width:700px;margin:0 auto;padding:20px"><h2 style="color:#2c5282;border-bottom:2px solid #2c5282;padding-bottom:8px">📊 週次レポート</h2><p>${REPORT_CONFIG.COMPANY_NAME} / ${formatDate_(startDate)} 〜 ${formatDate_(endDate)}</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><tr><td style="background:#ebf8ff;padding:16px;text-align:center;border-radius:4px;width:50%"><div style="font-size:13px;color:#2b6cb0">総売上</div><div style="font-size:28px;font-weight:bold;color:#2c5282">${totalAmount.toLocaleString()}${REPORT_CONFIG.CURRENCY}</div></td><td style="width:20px"></td><td style="background:#f0fff4;padding:16px;text-align:center;border-radius:4px;width:50%"><div style="font-size:13px;color:#276749">総件数</div><div style="font-size:28px;font-weight:bold;color:#22543d">${totalCount.toLocaleString()}件</div></td></tr></table>${categoryRows ? `<h3>カテゴリ別集計</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#2c5282;color:white"><th style="padding:10px 12px;text-align:left">カテゴリ</th><th style="padding:10px 12px;text-align:right">件数</th><th style="padding:10px 12px;text-align:right">売上</th></tr></thead><tbody>${categoryRows}</tbody></table>` : ''}<p style="color:#aaa;font-size:12px;margin-top:30px;border-top:1px solid #eee;padding-top:10px">自動生成 ${generatedAt}</p></body></html>`;
}

function formatDate_(date) { return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd'); }
function escapeHtml_(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
