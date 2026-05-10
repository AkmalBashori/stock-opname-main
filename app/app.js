const STORAGE_KEY = "stock-opname-count-sheet";
const SESSIONS_KEY = "stock-opname-sessions";
const supabaseConfig = globalThis.STOCK_OPNAME_SUPABASE ?? {};
const supabaseClient =
  supabaseConfig.url && supabaseConfig.anonKey && globalThis.supabase
    ? globalThis.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;

const sampleItems = [
  { time: "08:00", sku: "KP-240501-A", product: "335", productionProcess: "TCRON", systemQty: "1/2", countedQty: 200, status: "berhasil", notes: "" },
  { time: "08:25", sku: "KP-240501-B", product: "335", productionProcess: "TCRON", systemQty: "2/2", countedQty: 200, status: "berhasil", notes: "" },
  { time: "09:10", sku: "KP-240502-A", product: "Navy", productionProcess: "TPS", systemQty: "1/3", countedQty: "", status: "berhasil", notes: "" },
  { time: "09:35", sku: "KP-240503-C", product: "Navy", productionProcess: "RESUL", systemQty: "2/3", countedQty: "", status: "gagal", notes: "" },
];

const PROCESS_OPTIONS = ["TCRON", "TPS", "TOP", "RESUL"];

const state = {
  session: createDefaultSession(),
  items: [],
  search: "",
};

const els = {
  sessionName: document.querySelector("#sessionName"),
  locationName: document.querySelector("#locationName"),
  countDate: document.querySelector("#countDate"),
  endDate: document.querySelector("#endDate"),
  totalItems: document.querySelector("#totalItems"),
  countedItems: document.querySelector("#countedItems"),
  varianceUnits: document.querySelector("#varianceUnits"),
  cloudStatus: document.querySelector("#cloudStatus"),
  searchInput: document.querySelector("#searchInput"),
  sessionPicker: document.querySelector("#sessionPicker"),
  itemRows: document.querySelector("#itemRows"),
  rowTemplate: document.querySelector("#rowTemplate"),
  newSessionBtn: document.querySelector("#newSessionBtn"),
  addRowBtn: document.querySelector("#addRowBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  exportPdfBtn: document.querySelector("#exportPdfBtn"),
  saveDbBtn: document.querySelector("#saveDbBtn"),
  loadDbBtn: document.querySelector("#loadDbBtn"),
  importBtn: document.querySelector("#importBtn"),
  importFile: document.querySelector("#importFile"),
  importPdfBtn: document.querySelector("#importPdfBtn"),
  importPdfFile: document.querySelector("#importPdfFile"),
  importStatus: document.querySelector("#importStatus"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  clearBtn: document.querySelector("#clearBtn"),
};

function createDefaultSession() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    sessionName: today,
    locationName: "Famatex Dayeuhkolot",
    countDate: today,
    endDate: today,
  };
}

function createItem(item = {}) {
  return {
    id: item.id ?? crypto.randomUUID(),
    time: item.time ?? "",
    sku: item.sku ?? "",
    product: item.product ?? "",
    productionProcess: normalizeProductionProcess(item.productionProcess ?? item.proses_produksi),
    systemQty: normalizeParty(item.systemQty),
    countedQty: item.countedQty === "" || item.countedQty === undefined ? "" : normalizeNumber(item.countedQty),
    status: normalizeStatus(item.status),
    notes: item.notes ?? "",
  };
}

function normalizeParty(value) {
  return formatPartyInput(value);
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function normalizeStatus(value) {
  return value === "gagal" ? "gagal" : "berhasil";
}

function normalizeProductionProcess(value) {
  const process = String(value ?? "").trim().toUpperCase();
  return PROCESS_OPTIONS.includes(process) ? process : PROCESS_OPTIONS[0];
}

function formatTimeInput(value) {
  const text = String(value ?? "").trim();
  const digits = text.replace(/\D/g, "").slice(0, 4);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function formatPartyInput(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  if (text.includes("/")) {
    const [current = "", total = ""] = text.split("/");
    const currentDigits = current.replace(/\D/g, "").slice(0, 2);
    const totalDigits = total.replace(/\D/g, "").slice(0, 2);
    if (!currentDigits) return "";
    if (!totalDigits) return currentDigits.padStart(2, "0");
    return `${currentDigits.padStart(2, "0")}/${totalDigits.padStart(2, "0")}`;
  }

  const digits = text.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function getTimeMinutes(value) {
  const match = String(value ?? "").trim().match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getSortedItems(items = state.items) {
  return [...items]
    .map((item, index) => ({ item, index, minutes: getTimeMinutes(item.time) }))
    .sort((a, b) => {
      if (a.minutes === null && b.minutes === null) return a.index - b.index;
      if (a.minutes === null) return 1;
      if (b.minutes === null) return -1;
      return a.minutes - b.minutes || a.index - b.index;
    })
    .map((entry) => entry.item);
}

function sortItemsByTime() {
  state.items = getSortedItems();
}

function isIncludedItem(item) {
  return item.status === "berhasil" && item.countedQty !== "";
}

function getProductKey(item) {
  return String(item.product || item.sku || item.id).trim().toLowerCase();
}

function getProductTotalYard(item) {
  const key = getProductKey(item);
  return state.items.reduce((total, entry) => {
    if (getProductKey(entry) !== key || !isIncludedItem(entry)) return total;
    return total + Number(entry.countedQty);
  }, 0);
}

function getStatus(item) {
  return item.status === "gagal"
    ? { text: "Gagal", className: "issue" }
    : { text: "Berhasil", className: "done" };
}

function getSavedSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSIONS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSavedSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function upsertSavedSession() {
  const sessions = getSavedSessions();
  const entry = {
    id: state.session.id,
    session: state.session,
    items: state.items,
    updatedAt: new Date().toISOString(),
  };
  const existingIndex = sessions.findIndex((session) => session.id === state.session.id);

  if (existingIndex >= 0) {
    sessions[existingIndex] = entry;
  } else {
    sessions.push(entry);
  }

  setSavedSessions(sessions);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ session: state.session, items: state.items }));
  upsertSavedSession();
}

function setCloudStatus(message) {
  els.cloudStatus.textContent = message;
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    state.items = [createItem()];
    return;
  }

  try {
    const parsed = JSON.parse(stored);
    state.session = { ...state.session, ...parsed.session, id: parsed.session?.id ?? crypto.randomUUID() };
    state.items = Array.isArray(parsed.items) ? parsed.items.map(createItem) : [createItem()];
    sortItemsByTime();
    upsertSavedSession();
  } catch {
    state.items = [createItem()];
  }
}

function getSupabaseOrWarn() {
  if (supabaseClient) return supabaseClient;

  setCloudStatus("Supabase belum dikonfigurasi. Isi app/supabase-config.js dulu.");
  return null;
}

function renderSession() {
  const date = state.session.countDate || state.session.sessionName || new Date().toISOString().slice(0, 10);
  state.session.countDate = date;
  state.session.endDate = date;
  state.session.sessionName = date;
  els.sessionName.value = date;
  els.locationName.value = state.session.locationName;
  els.countDate.value = date;
  if (els.endDate) els.endDate.value = date;
}

function renderSessionPicker() {
  const sessions = getSavedSessions()
    .filter((session) => session.id && session.session)
    .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  const hasCurrent = sessions.some((session) => session.id === state.session.id);
  const pickerSessions = hasCurrent
    ? sessions
    : [{ id: state.session.id, session: state.session, items: state.items, updatedAt: new Date().toISOString() }, ...sessions];

  els.sessionPicker.replaceChildren();

  for (const savedSession of pickerSessions) {
    const option = document.createElement("option");
    const itemCount = Array.isArray(savedSession.items) ? savedSession.items.length : 0;
    option.value = savedSession.id;
    option.textContent = `${savedSession.session.sessionName || "Untitled tanggal"} (${itemCount} item)`;
    els.sessionPicker.append(option);
  }

  els.sessionPicker.value = state.session.id;
}

function renderSummary() {
  const countedItems = state.items.filter(isIncludedItem).length;
  const totalYard = getOverallTotalYard();

  els.totalItems.textContent = state.items.length;
  els.countedItems.textContent = countedItems;
  els.varianceUnits.textContent = formatNumber(totalYard);
}

function getOverallTotalYard() {
  return state.items.reduce((total, item) => {
    return isIncludedItem(item) ? total + Number(item.countedQty) : total;
  }, 0);
}

function getDateRangeText() {
  return state.session.countDate || state.session.sessionName || "-";
}

function renderRows() {
  const query = state.search.trim().toLowerCase();
  const items = getSortedItems().filter((item) => {
    return (
      !query ||
      item.sku.toLowerCase().includes(query) ||
      item.product.toLowerCase().includes(query) ||
      item.productionProcess.toLowerCase().includes(query)
    );
  });

  els.itemRows.replaceChildren();

  for (const item of items) {
    const row = els.rowTemplate.content.firstElementChild.cloneNode(true);
    const totalYard = getProductTotalYard(item);
    const status = getStatus(item);

    row.dataset.id = item.id;
    row.querySelector(".time-entry").value = item.time;
    row.querySelector(".sku-input").value = item.sku;
    row.querySelector(".product-input").value = item.product;
    row.querySelector(".process-input").value = item.productionProcess;
    row.querySelector(".system-input").value = item.systemQty;
    row.querySelector(".counted-input").value = item.countedQty;
    row.querySelector(".status-input").value = item.status;
    row.querySelector(".notes-input").value = item.notes;

    const varianceEl = row.querySelector(".variance-pill");
    varianceEl.textContent = formatNumber(totalYard);
    varianceEl.classList.remove("positive", "negative");

    const statusInput = row.querySelector(".status-input");
    statusInput.classList.toggle("done", status.className === "done");
    statusInput.classList.toggle("issue", status.className === "issue");

    els.itemRows.append(row);
  }
}

function render() {
  renderSession();
  renderSessionPicker();
  renderSummary();
  renderRows();
  setCloudStatus(
    supabaseClient
      ? "Supabase connected. Data tetap autosave lokal, gunakan Save DB untuk sync."
      : "Offline mode. Isi Supabase config untuk Save DB / Load DB.",
  );
}

function toDbSession() {
  return {
    id: state.session.id,
    session_name: state.session.sessionName,
    location_name: state.session.locationName,
    count_date: state.session.countDate || null,
    updated_at: new Date().toISOString(),
  };
}

function toDbItem(item, index) {
  return {
    id: item.id,
    session_id: state.session.id,
    kode_produksi: item.sku,
    product: item.product,
    party: item.systemQty,
    yard: item.countedQty === "" ? null : item.countedQty,
    notes: item.notes,
    sort_order: index,
    updated_at: new Date().toISOString(),
  };
}

function fromDbSession(session) {
  return {
    id: session.id,
    sessionName: session.session_name ?? "",
    locationName: session.location_name ?? "",
    countDate: session.count_date ?? new Date().toISOString().slice(0, 10),
    endDate: session.count_date ?? new Date().toISOString().slice(0, 10),
  };
}

function fromDbItem(item) {
  return createItem({
    id: item.id,
    sku: item.kode_produksi,
    product: item.product,
    systemQty: item.party,
    countedQty: item.yard ?? "",
    notes: item.notes,
  });
}

async function saveToSupabase() {
  const client = getSupabaseOrWarn();
  if (!client) return;

  setCloudStatus("Saving to Supabase...");

  const sessionResult = await client.from("stock_sessions").upsert(toDbSession());
  if (sessionResult.error) {
    setCloudStatus(`Save DB gagal: ${sessionResult.error.message}`);
    return;
  }

  const deleteResult = await client.from("stock_items").delete().eq("session_id", state.session.id);
  if (deleteResult.error) {
    setCloudStatus(`Save DB gagal: ${deleteResult.error.message}`);
    return;
  }

  const rows = state.items.map(toDbItem);
  if (rows.length > 0) {
    const itemsResult = await client.from("stock_items").insert(rows);
    if (itemsResult.error) {
      setCloudStatus(`Save DB gagal: ${itemsResult.error.message}`);
      return;
    }
  }

  saveState();
  setCloudStatus("Saved to Supabase.");
}

async function loadFromSupabase() {
  const client = getSupabaseOrWarn();
  if (!client) return;

  setCloudStatus("Loading from Supabase...");

  const sessionResult = await client
    .from("stock_sessions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionResult.error) {
    setCloudStatus(`Load DB gagal: ${sessionResult.error.message}`);
    return;
  }

  if (!sessionResult.data) {
    setCloudStatus("Belum ada data di Supabase.");
    return;
  }

  const itemsResult = await client
    .from("stock_items")
    .select("*")
    .eq("session_id", sessionResult.data.id)
    .order("sort_order", { ascending: true });

  if (itemsResult.error) {
    setCloudStatus(`Load DB gagal: ${itemsResult.error.message}`);
    return;
  }

  state.session = fromDbSession(sessionResult.data);
  state.items = itemsResult.data.length > 0 ? itemsResult.data.map(fromDbItem) : [createItem()];
  sortItemsByTime();
  saveState();
  render();
  setCloudStatus("Loaded from Supabase.");
}

function openSavedSession(sessionId) {
  const savedSession = getSavedSessions().find((session) => session.id === sessionId);
  if (!savedSession) return;

  state.session = { ...createDefaultSession(), ...savedSession.session, id: savedSession.id };
  state.items = Array.isArray(savedSession.items) && savedSession.items.length > 0
    ? savedSession.items.map(createItem)
    : [createItem()];
  sortItemsByTime();
  state.search = "";
  els.searchInput.value = "";
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ session: state.session, items: state.items }));
  render();
}

function startNewSession() {
  saveState();
  state.session = createDefaultSession();
  state.items = [createItem()];
  state.search = "";
  els.searchInput.value = "";
  saveState();
  render();
  els.sessionName.focus();
}

function updateItem(id, field, value) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  if (field === "systemQty") {
    item[field] = normalizeParty(value);
  } else if (field === "countedQty") {
    item[field] = value === "" ? "" : normalizeNumber(value);
  } else if (field === "status") {
    item[field] = normalizeStatus(value);
  } else if (field === "productionProcess") {
    item[field] = normalizeProductionProcess(value);
  } else if (field === "time") {
    item[field] = formatTimeInput(value);
  } else {
    item[field] = value;
  }

  saveState();
  renderSummary();
}

function refreshRow(row, item) {
  const totalYard = getProductTotalYard(item);
  const status = getStatus(item);
  const varianceEl = row.querySelector(".variance-pill");
  const statusInput = row.querySelector(".status-input");

  varianceEl.textContent = formatNumber(totalYard);
  varianceEl.classList.remove("positive", "negative");
  statusInput.classList.toggle("done", status.className === "done");
  statusInput.classList.toggle("issue", status.className === "issue");
}

function refreshVisibleRows() {
  for (const row of els.itemRows.querySelectorAll("tr")) {
    const item = state.items.find((entry) => entry.id === row.dataset.id);
    if (item) refreshRow(row, item);
  }
}

function exportCsv() {
  const header = ["Tanggal", "Mesin", "Jam", "Kode Produksi", "Warna", "Proses Produksi", "Party", "Yard", "Total Yard", "Status", "Notes"];
  const rows = getSortedItems().map((item) => {
    const status = getStatus(item);
    return [
      getDateRangeText(),
      state.session.locationName,
      item.time,
      item.sku,
      item.product,
      item.productionProcess,
      item.systemQty,
      item.countedQty,
      getProductTotalYard(item),
      status.text,
      item.notes,
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.session.sessionName)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stock-opname";
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function drawPdfText(doc, text, x, y, options = {}) {
  doc.text(String(text ?? ""), x, y, options);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function exportPdf() {
  const jsPDF = globalThis.jspdf?.jsPDF;
  if (!jsPDF) {
    const message = "Export PDF belum siap. Cek koneksi internet lalu refresh halaman.";
    setImportStatus(message);
    alert(message);
    return;
  }

  setImportStatus("Membuat PDF...");

  try {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const columns = [
      { title: "Jam", width: 18 },
      { title: "Kode Produksi", width: 30 },
      { title: "Warna", width: 38 },
      { title: "Proses Produksi", width: 34 },
      { title: "Party", width: 22 },
      { title: "Yard", width: 22 },
      { title: "Total Yard", width: 23 },
      { title: "Status", width: 22 },
      { title: "Notes", width: 50 },
    ];
    const rowHeight = 8;
    let y = 16;

    doc.setProperties({
      title: state.session.sessionName || "Stock Opname",
      subject: "Stock opname count sheet",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    drawPdfText(doc, "Stock Opname", margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y += 7;
    drawPdfText(doc, `Tanggal: ${getDateRangeText()}`, margin, y);
    drawPdfText(doc, `Items: ${state.items.length}`, 100, y);
    y += 5;
    drawPdfText(doc, `Mesin: ${state.session.locationName || "-"}`, margin, y);
    drawPdfText(doc, `Total Yard: ${formatNumber(getOverallTotalYard())}`, 100, y);
    drawPdfText(doc, `Exported: ${new Date().toLocaleString("en-US")}`, 190, y);

    y += 8;
    doc.setFillColor(23, 33, 27);
    doc.setTextColor(255, 253, 246);
    doc.rect(margin, y - 5, pageWidth - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    let x = margin + 2;
    for (const column of columns) {
      drawPdfText(doc, column.title, x, y);
      x += column.width;
    }

    y += 6;
    doc.setTextColor(23, 33, 27);
    doc.setFont("helvetica", "normal");

    for (const item of getSortedItems()) {
      if (y > pageHeight - 14) {
        doc.addPage();
        y = 16;
      }

      const status = getStatus(item);
      const cells = [
        item.time,
        item.sku,
        item.product,
        item.productionProcess,
        item.systemQty,
        item.countedQty === "" ? "" : formatNumber(item.countedQty),
        formatNumber(getProductTotalYard(item)),
        status.text,
        item.notes,
      ];

      doc.setDrawColor(217, 209, 189);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);

      x = margin + 2;
      cells.forEach((cell, index) => {
        const maxWidth = columns[index].width - 3;
        const text = doc.splitTextToSize(String(cell ?? ""), maxWidth)[0] ?? "";
        drawPdfText(doc, text, x, y);
        x += columns[index].width;
      });

      y += rowHeight;
    }

    const blob = doc.output("blob");
    const fileName = `${slugify(state.session.sessionName)}.pdf`;

    const canUseSavePicker = globalThis.showSaveFilePicker && globalThis.location.protocol !== "file:";

    if (!canUseSavePicker) {
      downloadBlob(blob, fileName);
      setImportStatus("PDF berhasil dibuat.");
      return;
    }

    try {
      const handle = await globalThis.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "PDF file",
            accept: { "application/pdf": [".pdf"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (saveError) {
      if (saveError.name === "AbortError") {
        setImportStatus("Export PDF dibatalkan.");
        return;
      }

      downloadBlob(blob, fileName);
      setImportStatus("Browser tidak mengizinkan pilih folder, PDF didownload biasa.");
      return;
    }

    setImportStatus("PDF berhasil dibuat.");
  } catch (error) {
    const message = `Export PDF gagal: ${error.message}`;
    setImportStatus(message);
    alert(message);
  }
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function setImportStatus(message) {
  els.importStatus.textContent = message;
}

function getCsvCell(header, cells, names, fallbackIndex = -1) {
  const keys = Array.isArray(names) ? names : [names];
  const index = keys.map((name) => header.indexOf(name)).find((entry) => entry >= 0);
  return index === undefined ? cells[fallbackIndex] : cells[index];
}

function importCsv(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const lines = String(reader.result)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const header = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
    const exportedFormat =
      (header.includes("session") || header.includes("produksi") || header.includes("tanggal")) &&
      (header.includes("party") || header.includes("system qty"));
    const imported = lines.slice(1).map(parseCsvLine).map((cells) => {
      if (exportedFormat) {
        return createItem({
          time: getCsvCell(header, cells, "jam", ""),
          sku: getCsvCell(header, cells, "kode produksi", 3),
          product: getCsvCell(header, cells, ["warna", "product", "produk"], 4),
          productionProcess: getCsvCell(header, cells, ["proses produksi", "process"], -1) ?? "",
          systemQty: getCsvCell(header, cells, ["party", "system qty"], 6),
          countedQty: getCsvCell(header, cells, "yard", 7) ?? "",
          status: String(getCsvCell(header, cells, "status", "") ?? "").toLowerCase() === "gagal" ? "gagal" : "berhasil",
          notes: getCsvCell(header, cells, "notes", 10) ?? "",
        });
      }

      return createItem({
        sku: cells[0],
        product: cells[1],
        systemQty: cells[2],
        countedQty: cells[3] ?? "",
        notes: cells[4] ?? "",
      });
    });

    if (imported.length > 0) {
      state.items = imported;
      sortItemsByTime();
      saveState();
      render();
    }
  });
  reader.readAsText(file);
}

function parsePdfItems(text) {
  const ignoredWords = new Set([
    "kode",
    "produksi",
    "tanggal",
    "warna",
    "product",
    "produk",
    "barang",
    "party",
    "yard",
    "total",
    "variance",
    "status",
    "notes",
    "catatan",
  ]);

  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((line) => {
      const lower = line.toLowerCase();
      const hasIgnoredHeader = [...ignoredWords].some((word) => lower === word || lower.includes(`${word} ${word}`));
      if (hasIgnoredHeader) return null;

      const match = line.match(/^(\S+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*(\d+(?:[.,]\d+)?)?$/);
      if (!match) return null;

      return createItem({
        sku: match[1],
        product: match[2],
        systemQty: match[3].replace(",", "."),
        countedQty: match[4] ? match[4].replace(",", ".") : "",
      });
    })
    .filter(Boolean);
}

async function importPdf(file) {
  setImportStatus("Membaca PDF...");

  try {
    const pdfjsLib = globalThis.pdfjsLib;
    if (!pdfjsLib) {
      setImportStatus("Import PDF belum siap. Cek koneksi internet lalu refresh halaman.");
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pageTexts = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = new Map();

      for (const item of content.items) {
        const y = Math.round(item.transform[5]);
        const existing = lines.get(y) ?? [];
        existing.push({ x: item.transform[4], text: item.str });
        lines.set(y, existing);
      }

      const text = [...lines.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(" "))
        .join("\n");

      pageTexts.push(text);
    }

    const imported = parsePdfItems(pageTexts.join("\n"));
    if (imported.length === 0) {
      setImportStatus("Tidak ada item terbaca. PDF harus berisi teks tabel, bukan hasil scan gambar.");
      return;
    }

    state.items = imported;
    sortItemsByTime();
    saveState();
    render();
    setImportStatus(`${imported.length} item berhasil diimport dari PDF.`);
  } catch (error) {
    setImportStatus(`Import PDF gagal: ${error.message}`);
  }
}

function bindEvents() {
  els.locationName.addEventListener("input", (event) => {
    state.session.locationName = event.target.value;
    saveState();
    renderSessionPicker();
  });

  els.countDate.addEventListener("input", (event) => {
    state.session.countDate = event.target.value;
    state.session.endDate = event.target.value;
    state.session.sessionName = event.target.value;
    saveState();
    renderSession();
    renderSessionPicker();
  });

  els.sessionPicker.addEventListener("change", (event) => {
    openSavedSession(event.target.value);
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderRows();
  });

  els.addRowBtn.addEventListener("click", () => {
    const item = createItem();
    state.items.unshift(item);
    saveState();
    render();
    els.itemRows.querySelector(`tr[data-id="${item.id}"] .time-entry`)?.focus();
  });

  els.itemRows.addEventListener("input", (event) => {
    const row = event.target.closest("tr");
    const id = row?.dataset.id;
    if (!id) return;

    const fieldMap = {
      "time-entry": "time",
      "sku-input": "sku",
      "product-input": "product",
      "process-input": "productionProcess",
      "system-input": "systemQty",
      "counted-input": "countedQty",
      "status-input": "status",
      "notes-input": "notes",
    };

    const matchedClass = Object.keys(fieldMap).find((className) => event.target.classList.contains(className));
    if (matchedClass) {
      const field = fieldMap[matchedClass];
      updateItem(id, field, event.target.value);
      if (field === "time") {
        const item = state.items.find((entry) => entry.id === id);
        event.target.value = item?.time ?? "";
      }
      if (field === "systemQty") {
        const item = state.items.find((entry) => entry.id === id);
        event.target.value = item?.systemQty ?? "";
      }
      if (field === "time" && getTimeMinutes(event.target.value) !== null) {
        sortItemsByTime();
        saveState();
        renderRows();
        return;
      }
      refreshVisibleRows();
    }
  });

  els.itemRows.addEventListener("click", (event) => {
    const button = event.target.closest(".delete-row");
    if (!button) return;

    const id = button.closest("tr")?.dataset.id;
    state.items = state.items.filter((item) => item.id !== id);
    if (state.items.length === 0) state.items.push(createItem());
    saveState();
    render();
  });

  els.exportBtn.addEventListener("click", exportCsv);
  els.exportPdfBtn.addEventListener("click", exportPdf);
  els.saveDbBtn.addEventListener("click", saveToSupabase);
  els.loadDbBtn.addEventListener("click", loadFromSupabase);
  els.newSessionBtn.addEventListener("click", startNewSession);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importCsv(file);
    event.target.value = "";
  });
  els.importPdfBtn.addEventListener("click", () => els.importPdfFile.click());
  els.importPdfFile.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importPdf(file);
    event.target.value = "";
  });

  els.loadSampleBtn.addEventListener("click", () => {
    state.items = sampleItems.map(createItem);
    sortItemsByTime();
    saveState();
    render();
  });

  els.clearBtn.addEventListener("click", () => {
    state.items = [createItem()];
    saveState();
    render();
  });
}

loadState();
render();
bindEvents();
