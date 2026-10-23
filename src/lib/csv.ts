/** Robust CSV/TSV parsing for the members import — handles BOM, quotes, and Excel exports. */

export function normalizeDigits(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic ٠-٩
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)); // Persian ۰-۹
}

export function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    const count = headerLine.split(c).length;
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

/** Parse delimited text into rows of cells (quotes, escaped quotes and newlines supported). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) return [];
  const nl = clean.indexOf("\n");
  const delim = detectDelimiter(nl > 0 ? clean.slice(0, nl) : clean);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.length > 1 || (row[0] ?? "").trim() !== "") rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.length > 1 || (row[0] ?? "").trim() !== "") rows.push(row);
  return rows;
}

export function parseTable(text: string): { headers: string[]; rows: string[][] } {
  const grid = parseCsv(text);
  if (grid.length === 0) return { headers: [], rows: [] };
  const first = grid[0] ?? [];
  return {
    headers: first.map((h) => h.trim()),
    rows: grid.slice(1).filter((r) => r.some((c) => c.trim() !== "")),
  };
}

/** Normalize a typed date into ISO yyyy-mm-dd. Accepts ISO or dd/mm/yyyy. */
export function normalizeDate(v: string): string {
  const s = normalizeDigits(v).trim();
  if (!s) return "";
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m && m[1] && m[2] && m[3]) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
  if (m && m[1] && m[2] && m[3]) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

/** Normalize a typed amount into a plain number string (strips currency text and separators). */
export function normalizeAmount(v: string): string {
  let s = normalizeDigits(v).replace(/[^\d.]/g, "");
  // Drop dots that are not decimals (e.g. the dots in the currency abbreviation "ر.ي").
  const parts = s.split(".");
  if (parts.length > 1) {
    const last = parts[parts.length - 1] ?? "";
    const head = parts.slice(0, -1).join("");
    s = last !== "" ? `${head}.${last}` : head;
  }
  return s;
}
