/**
 * Utility to export speech history records as a downloadable CSV file.
 */

/**
 * Converts an array of speech history objects to a CSV string.
 * @param {Array<{id: string, text: string, voice_id: string, language_code: string, timestamp: number}>} rows
 * @returns {string} CSV-formatted string
 */
function rowsToCsv(rows) {
  const headers = ["id", "text", "voice_id", "language_code", "timestamp"];
  const escape = (val) => {
    const str = val == null ? "" : String(val);
    // Wrap in quotes and escape inner quotes
    return `"${str.replace(/"/g, '""')}"`;
  };

  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\r\n");
}

/**
 * Triggers a browser download of speech history as a .csv file.
 * @param {Array<Object>} rows - speech history rows
 * @param {string} [filename="speech_history.csv"]
 */
export function exportSpeechHistoryCSV(rows, filename = "speech_history.csv") {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("[exportSpeechHistoryCSV] No rows to export.");
    return;
  }
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
