/**
 * 05_slack_notification.js
 * ============================================================
 * スプレッドシート更新 → Slack通知スクリプト
 * ============================================================
 *
 * 【事前準備】
 *   1. api.slack.com/messaging/webhooks でIncoming Webhook URLを取得
 *   2. スクリプトプロパティ: SLACK_WEBHOOK_URL にURLを設定
 *   3. トリガー: onSheetEdit / スプレッドシートから / 編集時
 * ============================================================
 */

const SLACK_CONFIG = {
  USE_SCRIPT_PROPERTY: true,
  WEBHOOK_PROPERTY_KEY: 'SLACK_WEBHOOK_URL',
  WATCH_SHEET_NAME: '売上管理',
  WATCH_COL_DATE: 1, WATCH_COL_ITEM: 2, WATCH_COL_AMOUNT: 3, WATCH_COL_STATUS: 4,
  ALERT_THRESHOLD_AMOUNT: 1000000,
  GOAL_AMOUNT: 5000000,
  GOAL_ALERT_PERCENT: 80,
  COMPLETE_STATUS: '完了',
  BOT_NAME: '業務通知Bot',
  BOT_ICON_EMOJI: ':bar_chart:',
};

function onSheetEdit(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== SLACK_CONFIG.WATCH_SHEET_NAME) return;
    const row = e.range.getRow(), col = e.range.getColumn();
    if (row <= 1) return;

    const webhookUrl = getWebhookUrl_();
    if (!webhookUrl) { Logger.log('Webhook URLが設定されていません。'); return; }

    if (col === SLACK_CONFIG.WATCH_COL_AMOUNT) checkAmountThreshold_(sheet, row, Number(e.value), webhookUrl);
    if (col === SLACK_CONFIG.WATCH_COL_STATUS && e.value === SLACK_CONFIG.COMPLETE_STATUS) notifyStatusCompleted_(sheet, row, webhookUrl);
  } catch (error) {
    Logger.log(`Slack通知エラー: ${error.message}`);
  }
}

function checkAmountThreshold_(sheet, row, amount, webhookUrl) {
  if (amount < SLACK_CONFIG.ALERT_THRESHOLD_AMOUNT) return;
  const itemName = sheet.getRange(row, SLACK_CONFIG.WATCH_COL_ITEM).getValue();
  const monthlyTotal = calcMonthlyTotal_(sheet);
  const achievementRate = Math.round((monthlyTotal / SLACK_CONFIG.GOAL_AMOUNT) * 100);
  postToSlack_(webhookUrl, {
    username: SLACK_CONFIG.BOT_NAME, icon_emoji: SLACK_CONFIG.BOT_ICON_EMOJI,
    attachments: [{ color: '#36a64f', pretext: '🎉 大型案件が登録されました！',
      fields: [
        { title: '案件名', value: itemName, short: true },
        { title: '売上金額', value: `${amount.toLocaleString()}円`, short: true },
        { title: '月間累計', value: `${monthlyTotal.toLocaleString()}円`, short: true },
        { title: '目標達成率', value: `${achievementRate}%`, short: true },
      ], footer: formatNow_() }] });
}

function notifyStatusCompleted_(sheet, row, webhookUrl) {
  const itemName = sheet.getRange(row, SLACK_CONFIG.WATCH_COL_ITEM).getValue();
  const amount = sheet.getRange(row, SLACK_CONFIG.WATCH_COL_AMOUNT).getValue();
  postToSlack_(webhookUrl, {
    username: SLACK_CONFIG.BOT_NAME, icon_emoji: ':white_check_mark:',
    attachments: [{ color: '#2196F3', pretext: '✅ 案件が完了しました',
      fields: [
        { title: '案件名', value: itemName, short: true },
        { title: '売上', value: `${Number(amount).toLocaleString()}円`, short: true },
      ], footer: formatNow_() }] });
}

function calcMonthlyTotal_(sheet) {
  const now = new Date(), thisYear = now.getFullYear(), thisMonth = now.getMonth();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  return sheet.getRange(2, 1, lastRow - 1, SLACK_CONFIG.WATCH_COL_AMOUNT).getValues()
    .reduce((total, row) => {
      const d = row[0] instanceof Date ? row[0] : new Date(row[0]);
      return (d.getFullYear() === thisYear && d.getMonth() === thisMonth)
        ? total + (Number(row[SLACK_CONFIG.WATCH_COL_AMOUNT - 1]) || 0) : total;
    }, 0);
}

function postToSlack_(webhookUrl, message) {
  const response = UrlFetchApp.fetch(webhookUrl, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(message), muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200)
    throw new Error(`Slack API エラー (${response.getResponseCode()})`);
}

function getWebhookUrl_() {
  return SLACK_CONFIG.USE_SCRIPT_PROPERTY
    ? PropertiesService.getScriptProperties().getProperty(SLACK_CONFIG.WEBHOOK_PROPERTY_KEY)
    : null;
}

function formatNow_() { return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'); }

function testSlackNotification() {
  const webhookUrl = getWebhookUrl_();
  if (!webhookUrl) { Logger.log('Webhook URLが設定されていません。'); return; }
  try {
    postToSlack_(webhookUrl, { username: SLACK_CONFIG.BOT_NAME, icon_emoji: SLACK_CONFIG.BOT_ICON_EMOJI,
      text: `✅ *テスト送信成功*\n送信日時: ${formatNow_()}` });
    Logger.log('テスト送信成功！');
  } catch (e) { Logger.log(`失敗: ${e.message}`); }
}
