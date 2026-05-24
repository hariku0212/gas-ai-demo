/**
 * 03_form_to_line_notify.js
 * ============================================================
 * Googleフォーム回答 → LINE Notify 通知スクリプト
 * ============================================================
 *
 * 【事前準備】
 *   1. notify-bot.line.me/my/ でLINE Notifyのトークンを取得
 *   2. GASエディタ → プロジェクトの設定 → スクリプトプロパティ
 *      キー: LINE_NOTIFY_TOKEN / 値: 取得したトークン
 *   3. トリガー: notifyOnFormSubmit / フォームの送信時
 * ============================================================
 */

const LINE_CONFIG = {
  USE_SCRIPT_PROPERTY: true,
  TOKEN_PROPERTY_KEY: 'LINE_NOTIFY_TOKEN',
  LINE_NOTIFY_URL: 'https://notify-api.line.me/api/notify',
  NOTIFICATION_TITLE: '【フォーム回答通知】',
  MAX_MESSAGE_LENGTH: 1000,
};

function notifyOnFormSubmit(e) {
  try {
    const token = getLineToken_();
    if (!token) throw new Error('LINE Notifyのトークンが設定されていません。');
    sendLineNotify_(token, buildNotificationMessage_(e));
    Logger.log('LINE通知を送信しました。');
  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
  }
}

function getLineToken_() {
  if (LINE_CONFIG.USE_SCRIPT_PROPERTY)
    return PropertiesService.getScriptProperties().getProperty(LINE_CONFIG.TOKEN_PROPERTY_KEY);
  return null;
}

function buildNotificationMessage_(e) {
  const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  let lines = [LINE_CONFIG.NOTIFICATION_TITLE, `受信日時: ${timestamp}`, '─────────────────'];

  for (const [question, answers] of Object.entries(e.namedValues)) {
    if (question === 'タイムスタンプ') continue;
    lines.push(`■ ${question}`);
    lines.push(`  ${answers[0] || '（回答なし）'}`);
  }

  let message = '\n' + lines.join('\n');
  if (message.length > LINE_CONFIG.MAX_MESSAGE_LENGTH)
    message = message.substring(0, LINE_CONFIG.MAX_MESSAGE_LENGTH - 20) + '\n…（以下省略）';

  return message;
}

function sendLineNotify_(token, message) {
  const response = UrlFetchApp.fetch(LINE_CONFIG.LINE_NOTIFY_URL, {
    method: 'post',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    payload: { message },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200)
    throw new Error(`LINE API エラー (${response.getResponseCode()})`);
}

function testLineNotify() {
  const token = getLineToken_();
  if (!token) { Logger.log('トークンが設定されていません。'); return; }
  const msg = '\n【テスト送信】\nLINE Notify連携のテストです。設定が正しければこのメッセージが届いています。';
  try {
    sendLineNotify_(token, msg);
    Logger.log('テスト送信成功！LINEを確認してください。');
  } catch (e) {
    Logger.log(`テスト送信失敗: ${e.message}`);
  }
}
