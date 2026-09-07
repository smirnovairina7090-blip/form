/**
 * Google Apps Script для сохранения ответов рабочего листа в Google Таблицу.
 * 1. Создайте Google Таблицу.
 * 2. Расширения -> Apps Script.
 * 3. Замените код на этот.
 * 4. Развернуть -> Новое развертывание -> Веб-приложение.
 * 5. Выполнять от имени: Я. Кто имеет доступ: Все.
 * 6. Скопируйте URL /exec и вставьте его в SUBMIT_URL файла script.js.
 */

const SHEET_NAME = 'Ответы';

function doGet() {
  return ContentService.createTextOutput('Quadratic equations workbook endpoint is running.');
}

function doPost(e) {
  try {
    const payloadText = e && e.parameter && e.parameter.payload
      ? e.parameter.payload
      : (e && e.postData && e.postData.contents ? e.postData.contents : '{}');
    const data = JSON.parse(payloadText);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Дата и время', 'Ученик', 'Класс / группа', 'Вариант',
        'Баллы', 'Максимум', 'Тест', 'Время, сек',
        'Ответы теста', 'Виета', 'Дискриминант', 'Страница', 'User Agent'
      ]);
      sheet.getRange(1,1,1,13).setFontWeight('bold').setBackground('#e9e7ff');
      sheet.setFrozenRows(1);
    }

    const answers = data.answers || {};
    sheet.appendRow([
      data.submittedAt ? new Date(data.submittedAt) : new Date(),
      data.studentName || '',
      data.studentClass || '',
      data.variant || '',
      data.score ?? '',
      data.maxScore ?? '',
      data.testScore ?? '',
      data.durationSeconds ?? '',
      JSON.stringify(answers.test || []),
      JSON.stringify(answers.vieta || {}),
      JSON.stringify(answers.discriminant || {}),
      data.page || '',
      data.userAgent || ''
    ]);

    const row = sheet.getLastRow();
    sheet.getRange(row,1).setNumberFormat('dd.mm.yyyy hh:mm:ss');
    sheet.autoResizeColumns(1,8);

    return ContentService
      .createTextOutput(JSON.stringify({ok:true,row}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ok:false,error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
