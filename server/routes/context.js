import { Router } from "express";
import { parseExcel, parseCsv, parsePdf } from "../integrations/fileParser.js";

export const contextRouter = Router();

// Parse uploaded file and return text content
contextRouter.post("/parse", async (req, res) => {
  try {
    const { name, type, data } = req.body; // base64 encoded file
    const buffer = Buffer.from(data, "base64");

    let content = "";

    if (type.includes("spreadsheet") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
      content = parseExcel(buffer, name);
    } else if (type.includes("csv") || name.endsWith(".csv")) {
      content = await parseCsv(buffer);
    } else if (type.includes("pdf") || name.endsWith(".pdf")) {
      content = await parsePdf(buffer);
    } else {
      // Plain text, markdown, code files
      content = buffer.toString("utf8");
    }

    res.json({ content, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
