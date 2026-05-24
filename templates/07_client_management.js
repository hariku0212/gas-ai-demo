/**
 * クライアント管理システム
 * 副業案件の受注・進捗・請求をスプレッドシートで一元管理する
 *
 * シート構成:
 *   クライアント一覧 - 全クライアントの基本情報
 *   案件管理        - 各案件の進捗・金額・期限
 *   入金記録        - 請求・入金の管理
 *
 * 使い方:
 *   1. このスクリプトを新規スプレッドシートのGASエディタに貼り付ける
 *   2. initializeSheets() を実行してシートを初期化する
 *   3. 以降は案件受注のたびに addNewProjectDialog() を使う
 */

// ===== 設定 =====
const CONFIG = {
  CLIENT_SHEET: 'クライアント一覧',
  PROJECT_SHEET: '案件管理',
  PAYMENT_SHEET: '入金記録',
  NOTIFICATION_EMAIL: PropertiesService.getScriptProperties().getProperty('NOTIFICATION_EMAIL'),
};

// ===== シート初期化 =====

function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  _setupClientSheet(ss);
  _setupProjectSheet(ss);
  _setupPaymentSheet(ss);

  SpreadsheetApp.getUi().alert('✅ 初期化完了！シートが作成されました。');
}

function _setupClientSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.CLIENT_SHEET) || ss.insertSheet(CONFIG.CLIENT_SHEET);
  sheet.clearContents();

  const headers = [
    'クライアントID', '登録日', 'ニックネーム/屋号', 'プラットフォーム',
    '連絡手段', '特記事項', '累計発注金額'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2d3748').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function _setupProjectSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.PROJECT_SHEET) || ss.insertSheet(CONFIG.PROJECT_SHEET);
  sheet.clearContents();

  const headers = [
    '案件ID', '受注日', 'クライアントID', '案件名/内容',
    'プラットフォーム', '金額（税込）', 'ステータス',
    '納品期限', '実納品日', '備考'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2d3748').setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['ヒアリング中', '提案中', '進行中', '納品済み', '完了', 'キャンセル'])
    .build();
  sheet.getRange('G2:G1000').setDataValidation(rule);
}

function _setupPaymentSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.PAYMENT_SHEET) || ss.insertSheet(CONFIG.PAYMENT_SHEET);
  sheet.clearContents();

  const headers = [
    '記録ID', '日付', '案件ID', 'クライアントID',
    '金額', '入金ステータス', '入金日', '確定申告用メモ'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2d3748').setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['請求済み', '入金確認済み', '未請求'])
    .build();
  sheet.getRange('F2:F1000').setDataValidation(rule);
}

// ===== 案件登録 =====

function addNewProjectDialog() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const clientId = ui.prompt('クライアントID（例: C001）\n（新規なら先にクライアント一覧に追加）').getResponseText();
  if (!clientId) return;

  const projectName = ui.prompt('案件名・内容を入力してください').getResponseText();
  if (!projectName) return;

  const platform = ui.prompt('プラットフォーム（coconala / Crowdworks / Menta / 直接）').getResponseText() || 'coconala';
  const amount = ui.prompt('金額（税込）を数字で入力').getResponseText();
  const deadline = ui.prompt('納品期限（例: 2026-06-10）').getResponseText();

  const projectSheet = ss.getSheetByName(CONFIG.PROJECT_SHEET);
  const lastRow = projectSheet.getLastRow();
  const projectId = 'P' + String(lastRow).padStart('3', '0');

  projectSheet.appendRow([
    projectId,
    _today(),
    clientId,
    projectName,
    platform,
    Number(amount) || 0,
    '進行中',
    deadline,
    '',
    ''
  ]);

  const paymentSheet = ss.getSheetByName(CONFIG.PAYMENT_SHEET);
  const payLastRow = paymentSheet.getLastRow();
  paymentSheet.appendRow([
    'R' + String(payLastRow).padStart('3', '0'),
    _today(),
    projectId,
    clientId,
    Number(amount) || 0,
    '未請求',
    '',
    ''
  ]);

  ui.alert(`✅ 案件を登録しました！\n案件ID: ${projectId}`);
  _sendNotification('新規案件登録', `案件ID: ${projectId}\n内容: ${projectName}\n金額: ¥${amount}\n期限: ${deadline}`);
}

// ===== 月次レポート =====

function sendMonthlyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const projectSheet = ss.getSheetByName(CONFIG.PROJECT_SHEET);
  const data = projectSheet.getDataRange().getValues();

  const thisMonth = _thisMonthPrefix();
  let totalRevenue = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  const details = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const receivedDate = String(row[1]);
    if (!receivedDate.startsWith(thisMonth)) continue;

    const amount = Number(row[5]) || 0;
    const status = row[6];

    if (status === '完了') {
      totalRevenue += amount;
      completedCount++;
    } else if (status === '進行中' || status === '納品済み') {
      inProgressCount++;
    }

    details.push(`- [${row[0]}] ${row[3]}（${status}）: ¥${amount.toLocaleString()}`);
  }

  const subject = `[副業] ${thisMonth} 月次レポート`;
  const body = [
    `■ ${thisMonth} 月次サマリー`,
    `確定収益: ¥${totalRevenue.toLocaleString()}`,
    `完了案件: ${completedCount}件`,
    `進行中案件: ${inProgressCount}件`,
    '',
    '■ 案件詳細',
    ...details
  ].join('\n');

  _sendNotification(subject, body);
  SpreadsheetApp.getUi().alert('✅ 月次レポートをメールで送信しました');
}

// ===== 期限アラート =====

function checkDeadlineAlerts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const projectSheet = ss.getSheetByName(CONFIG.PROJECT_SHEET);
  const data = projectSheet.getDataRange().getValues();

  const today = new Date();
  const alertDays = 3;
  const alerts = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const status = row[6];
    if (status === '完了' || status === 'キャンセル') continue;

    const deadline = new Date(row[7]);
    if (isNaN(deadline.getTime())) continue;

    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= alertDays && daysLeft >= 0) {
      alerts.push(`⚠️ ${row[3]}（${row[0]}）: 残り${daysLeft}日（${row[7]}）`);
    }
  }

  if (alerts.length === 0) return;

  _sendNotification(
    `[副業] 納品期限アラート（${alerts.length}件）`,
    alerts.join('\n')
  );
}

// ===== ダッシュボード更新 =====

function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const projectSheet = ss.getSheetByName(CONFIG.PROJECT_SHEET);
  const data = projectSheet.getDataRange().getValues();

  let totalRevenue = 0;
  let completedCount = 0;
  let inProgressCount = 0;

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const status = data[i][6];
    const amount = Number(data[i][5]) || 0;

    if (status === '完了') { totalRevenue += amount; completedCount++; }
    else if (status === '進行中' || status === '納品済み') inProgressCount++;
  }

  Logger.log(`累計収益: ¥${totalRevenue.toLocaleString()}`);
  Logger.log(`完了案件: ${completedCount}件`);
  Logger.log(`進行中: ${inProgressCount}件`);
  Logger.log(`レビュー対象: ${completedCount}件`);
}

// ===== メニュー設定 =====

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📋 案件管理')
    .addItem('新規案件を登録', 'addNewProjectDialog')
    .addSeparator()
    .addItem('月次レポートを送信', 'sendMonthlyReport')
    .addItem('期限アラートを今すぐチェック', 'checkDeadlineAlerts')
    .addItem('ダッシュボードを更新', 'updateDashboard')
    .addSeparator()
    .addItem('シートを初期化（初回のみ）', 'initializeSheets')
    .addToUi();
}

// ===== ユーティリティ =====

function _today() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
}

function _thisMonthPrefix() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM');
}

function _sendNotification(subject, body) {
  const email = CONFIG.NOTIFICATION_EMAIL;
  if (!email) return;
  GmailApp.sendEmail(email, subject, body);
}
