// file: Code.gs
// Cara penggunaan:
// 1. Buka Google Sheets yang ingin dihubungkan.
// 2. Klik Ekstensi -> Apps Script.
// 3. Hapus kode yang ada, lalu tempel kode dari file ini.
// 4. Klik Deploy -> New deployment.
// 5. Pilih tipe "Web app". Setting execute as "Me", Who has access "Anyone".
// 6. Deploy, lalu salin URL Web App yang disediakan, dan masukkan ke dalam `template.html`.

function doGet(e) {
  // Gunakan ID Spreadsheet Roblox: 1nGihCZS3S9moNY2dt7GIzmBESIQ72Jh5J7d90nhZvX0
  var sheetId = "1nGihCZS3S9moNY2dt7GIzmBESIQ72Jh5J7d90nhZvX0";
  // Ambil nama sheet dari URL parameter `sheet`. Default ke B2C_RobloxStudio_Modul jika tidak ada.
  var sheetName =
    e.parameter && e.parameter.sheet
      ? e.parameter.sheet
      : "B2C_RobloxStudio_Modul";

  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Sheet dengan nama '" + sheetName + "' tidak ditemukan.");
    }
    var data = sheet.getDataRange().getValues();

    var headers = data[0];
    var result = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; // Skip baris kosong

      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j] ? headers[j].toString().trim() : "col_" + j;
        obj[headerName] = row[j] !== undefined ? row[j] : "";
      }
      result.push(obj);
    }

    var output = ContentService.createTextOutput(JSON.stringify(result));
    output.setMimeType(ContentService.MimeType.JSON);

    return output;
  } catch (err) {
    var errorOutput = ContentService.createTextOutput(
      JSON.stringify({ error: err.toString() }),
    );
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}
