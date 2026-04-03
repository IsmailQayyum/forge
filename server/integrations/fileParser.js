import XLSX from "xlsx";
import { parse as csvParse } from "csv-parse/sync";

export function parseExcel(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let content = `# File: ${filename}\n\n`;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    content += `## Sheet: ${sheetName}\n\`\`\`csv\n${csv}\n\`\`\`\n\n`;
  }

  return content;
}

export function parseCsv(buffer) {
  const text = buffer.toString("utf8");
  const rows = csvParse(text, { skip_empty_lines: true });

  let content = "```csv\n";
  for (const row of rows.slice(0, 500)) {
    content += row.join(",") + "\n";
  }
  content += "```";

  if (rows.length > 500) {
    content += `\n\n_Showing first 500 rows of ${rows.length} total_`;
  }

  return content;
}

export async function parsePdf(buffer) {
  // Dynamic import to avoid issues if pdf-parse has side effects
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const data = await pdfParse(buffer);
  return data.text;
}
