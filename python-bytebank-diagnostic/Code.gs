const SPREADSHEET_ID = '1zrUoAwahtWzXlfatGsvoAak9OQZvK3hYE0hyroWDYrs';
const SHEET_NAME = 'Результаты';

function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const t = data.topicScores || {};

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.sessionId || '',
    data.startMood || '',
    data.debugReaction || '',
    data.experience || '',
    data.interests || '',
    data.goal || '',
    data.endMood || '',
    data.favoritePart || '',
    data.minutes || '',
    t.basics || '',
    t.conditions || '',
    t.loops || '',
    t.strings || '',
    t.lists || '',
    t.dicts || '',
    t.functions || '',
    t.debugging || '',
    t.reading || '',
    t.writing || '',
    data.total || 0,
    data.max || 40,
    data.percent || 0,
    data.level || '',
    data.strong || '',
    data.growth || '',
    data.code1 || '',
    data.code2 || '',
    data.code3 || '',
    data.answersJson || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ok:true}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput('ByteBank collector is running')
    .setMimeType(ContentService.MimeType.TEXT);
}
