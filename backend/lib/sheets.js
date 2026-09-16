/* =========================================
   Google Sheets storage.
   Appends rows to named tabs in one spreadsheet so orders, contact
   messages, and newsletter signups are all visible/exportable without
   a database. Each function lazily builds its own client so the
   server can still boot (e.g. for /api/health) even if Sheets
   credentials aren't configured yet.
   ========================================= */
const { google } = require('googleapis');

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error('Google Sheets is not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY missing in .env)');
  }
  return new google.auth.JWT(email, null, key, ['https://www.googleapis.com/auth/spreadsheets']);
}

async function appendRow(tabName, row) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID is not set in .env');
  }
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

/* Finds the first row in a tab whose column A matches `key` and
   overwrites the given columns (used to flip an order from
   "pending" to "paid" after Razorpay verification). */
async function updateRowByKey(tabName, key, updates) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A:A`,
  });
  const rows = data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === key);
  if (rowIndex === -1) return false;

  const requests = Object.entries(updates).map(([col, value]) => ({
    range: `${tabName}!${col}${rowIndex + 1}`,
    values: [[value]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { valueInputOption: 'USER_ENTERED', data: requests },
  });
  return true;
}

module.exports = { appendRow, updateRowByKey };
