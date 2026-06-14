const API_URL = "https://script.google.com/macros/s/AKfycbwo632zOEaTl3_rZavOKpQvKjOjnYGseOzGqCKB2NG7nAfw18JqgvNGK1YY_g-hrmyJ/exec";

let allData = [];
let filteredData = [];
let summaryData = [];

async function loadWinnerReport() { 
  
  try {
    const res = await fetch(API_URL);
    allData = await res.json();

    loadCompanyDropdown();
    applyFilterAndSort();
  } catch (err) {
    document.getElementById("winnerBody").innerHTML = `
      <tr>
        <td colspan="6">Failed to load data</td>
      </tr>
    `;
    console.error(err);
  }
}

function cleanText(value) {
  return String(value || "").trim().toUpperCase();
}

function getPlaceNumberValue(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 999999;
}

function isCollect(value) {
  return cleanText(value) === "COLLECT" || cleanText(value) === "COLLECTED";
}

function getCollectionIcon(value) {
  return isCollect(value) ? "✓" : "";
}

function getCollectionText(value) {
  return isCollect(value) ? "Collect" : "Not Collect";
}

function loadCompanyDropdown() {
  const companyFilter = document.getElementById("companyFilter");
  companyFilter.innerHTML = `<option value="ALL">All Company</option>`;

  const companies = [...new Set(
    allData
      .map(item => item.company || item.companyName || "")
      .filter(company => String(company).trim() !== "")
  )].sort((a, b) => cleanText(a).localeCompare(cleanText(b)));

  companies.forEach(company => {
    const option = document.createElement("option");
    option.value = company;
    option.textContent = company;
    companyFilter.appendChild(option);
  });
}

function applyFilterAndSort() {
  const selectedCompany = document.getElementById("companyFilter").value;
  const selectedCollection = document.getElementById("collectionFilter").value;

  filteredData = allData.filter(item => {
    const company = item.company || item.companyName || "";
    const status = item.collectionStatus || item.statusCollection || "";

    const companyMatch = selectedCompany === "ALL" || company === selectedCompany;

    let collectionMatch = true;

    if (selectedCollection === "COLLECT") {
      collectionMatch = isCollect(status);
    }

    if (selectedCollection === "NOT_COLLECT") {
      collectionMatch = !isCollect(status);
    }

    return companyMatch && collectionMatch;
  });

  sortReportData();
  renderWinnerTable();
  renderSummaryTable();
}

function sortReportData() {
  const sortField = document.getElementById("sortField").value;
  const sortOrder = document.getElementById("sortOrder").value;

  filteredData.sort((a, b) => {
    const placeA = getPlaceNumberValue(a.placeNumber || a.place);
    const placeB = getPlaceNumberValue(b.placeNumber || b.place);
    const nameA = cleanText(a.employeeName);
    const nameB = cleanText(b.employeeName);
    const companyA = cleanText(a.company || a.companyName);
    const companyB = cleanText(b.company || b.companyName);
    const statusA = cleanText(getCollectionText(a.collectionStatus || a.statusCollection));
    const statusB = cleanText(getCollectionText(b.collectionStatus || b.statusCollection));

    let compare = 0;

    if (sortField === "placeNumber") {
      compare = placeA - placeB;
      if (compare === 0) compare = nameA.localeCompare(nameB);
    }

    if (sortField === "employeeName") {
      compare = nameA.localeCompare(nameB);
      if (compare === 0) compare = placeA - placeB;
    }

    if (sortField === "company") {
      compare = companyA.localeCompare(companyB);
      if (compare === 0) compare = placeA - placeB;
    }

    if (sortField === "collectionStatus") {
      compare = statusA.localeCompare(statusB);
      if (compare === 0) compare = placeA - placeB;
    }

    return sortOrder === "desc" ? compare * -1 : compare;
  });
}

function renderWinnerTable() {
  const tbody = document.getElementById("winnerBody");
  tbody.innerHTML = "";

  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No data found</td>
      </tr>
    `;
    return;
  }

  filteredData.forEach(item => {
    const placeNumber = item.placeNumber || item.place || "";
    const luckyNo = item.luckyNo || "";
    const employeeName = item.employeeName || "";
    const company = item.company || item.companyName || "";
    const prize = item.prize || "";
    const status = item.collectionStatus || item.statusCollection || "";

    tbody.innerHTML += `
      <tr>
        <td>${placeNumber}</td>
        <td>${luckyNo}</td>
        <td>${employeeName}</td>
        <td>${company}</td>
        <td>${prize}</td>
        <td class="collection-icon">${getCollectionIcon(status)}</td>
      </tr>
    `;
  });

  setTimeout(equalizeWinnerRowHeights, 50);
}

function equalizeWinnerRowHeights() {
  const rows = [...document.querySelectorAll("#winnerBody tr")];
  if (rows.length === 0) return;

  rows.forEach(row => {
    row.style.height = "auto";
    [...row.children].forEach(cell => cell.style.height = "auto");
  });

  let maxHeight = 22;

  rows.forEach(row => {
    maxHeight = Math.max(maxHeight, Math.ceil(row.getBoundingClientRect().height));
  });

  rows.forEach(row => {
    row.style.height = maxHeight + "px";
    [...row.children].forEach(cell => cell.style.height = maxHeight + "px");
  });
}

function renderSummaryTable() {
  const summary = {};
  let grandCollect = 0;
  let grandNotCollect = 0;

  filteredData.forEach(item => {
    const company = item.company || item.companyName || "Unknown Company";
    const status = item.collectionStatus || item.statusCollection || "";

    if (!summary[company]) {
      summary[company] = {
        company: company,
        collect: 0,
        notCollect: 0
      };
    }

    if (isCollect(status)) {
      summary[company].collect++;
      grandCollect++;
    } else {
      summary[company].notCollect++;
      grandNotCollect++;
    }
  });

  summaryData = Object.values(summary).sort((a, b) =>
    cleanText(a.company).localeCompare(cleanText(b.company))
  );

  const tbody = document.getElementById("summaryBody");
  tbody.innerHTML = "";

  summaryData.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td>${item.company}</td>
        <td>${item.collect}</td>
        <td>${item.notCollect}</td>
      </tr>
    `;
  });

  document.getElementById("grandCollect").textContent = grandCollect;
  document.getElementById("grandNotCollect").textContent = grandNotCollect;
}

/* =====================================================
   PDF DIRECT DOWNLOAD
===================================================== */

function downloadPDF() {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF library not loaded. Check jsPDF script link.");
      return;
    }

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    });

    if (typeof doc.autoTable !== "function") {
      alert("PDF table library not loaded. Check jspdf-autotable script link.");
      return;
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;

    const placeWidth = 42;
    const luckyWidth = 48;
    const nameWidth = 115;
    const companyWidth = 80;
    const collectionWidth = 58;
    const prizeWidth = contentWidth - placeWidth - luckyWidth - nameWidth - companyWidth - collectionWidth;

    const pdfRows = filteredData.map(item => ({
      placeNumber: item.placeNumber || item.place || "",
      luckyNo: item.luckyNo || "",
      employeeName: item.employeeName || "",
      company: item.company || item.companyName || "",
      prize: item.prize || "",
      status: item.collectionStatus || item.statusCollection || ""
    }));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 0, 0);
    doc.text("TROPICAL DINNER 2026", pageWidth / 2, margin + 18, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("REPORT LUCKY DRAW WINNER", pageWidth / 2, margin + 42, { align: "center" });

    const tableBody = pdfRows.map(item => [
      item.placeNumber,
      item.luckyNo,
      item.employeeName,
      item.company,
      item.prize,
      ""
    ]);

    doc.autoTable({
      startY: margin + 68,
      head: [["Place No.", "Lucky No.", "Employee Name", "Company", "Prize", "Collection"]],
      body: tableBody,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
      tableWidth: contentWidth,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        minCellHeight: 20,
        valign: "middle",
        overflow: "linebreak"
      },
      headStyles: {
        fillColor: [217, 217, 217],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
        valign: "middle"
      },
      columnStyles: {
        0: { cellWidth: placeWidth, halign: "center", overflow: "hidden" },
        1: { cellWidth: luckyWidth, halign: "center", overflow: "hidden" },
        2: { cellWidth: nameWidth, halign: "left", overflow: "linebreak" },
        3: { cellWidth: companyWidth, halign: "center", overflow: "hidden" },
        4: { cellWidth: prizeWidth, halign: "left", overflow: "linebreak" },
        5: { cellWidth: collectionWidth, halign: "center", overflow: "hidden" }
      },
      didDrawCell: function (data) {
        if (data.section !== "body" || data.column.index !== 5) return;

        const item = pdfRows[data.row.index];
        if (!item) return;

        if (isCollect(item.status)) {
          const x = data.cell.x + data.cell.width / 2;
          const y = data.cell.y + data.cell.height / 2;

          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1.4);
          doc.line(x - 6, y, x - 2, y + 5);
          doc.line(x - 2, y + 5, x + 8, y - 7);
        }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 22;

    if (finalY > pageHeight - margin - 130) {
      doc.addPage();
      finalY = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Collection Summary", margin, finalY);

    const summaryBody = summaryData.map(item => [
      item.company || "",
      item.collect,
      item.notCollect
    ]);

    summaryBody.push([
      "GRAND TOTAL",
      document.getElementById("grandCollect").textContent,
      document.getElementById("grandNotCollect").textContent
    ]);

    doc.autoTable({
      startY: finalY + 8,
      head: [["Company", "Total Collect", "Total Not Collect"]],
      body: summaryBody,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
      tableWidth: contentWidth * 0.75,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 4,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        minCellHeight: 22,
        valign: "middle",
        overflow: "hidden"
      },
      headStyles: {
        fillColor: [217, 217, 217],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
        valign: "middle"
      },
      columnStyles: {
        0: { cellWidth: 170, halign: "left" },
        1: { cellWidth: 100, halign: "center" },
        2: { cellWidth: 120, halign: "center" }
      },
      didParseCell: function (data) {
        if (data.section === "body" && data.row.index === summaryBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [217, 217, 217];
        }
      }
    });

    doc.save("Report_Lucky_Draw_Winner_Tropical_Dinner_2026.pdf");

  } catch (err) {
    console.error(err);
    alert("PDF failed to download. Error: " + (err && err.message ? err.message : err));
  }
}

/* =====================================================
   EXCEL - 3 SHEETS
===================================================== */

function downloadExcel() {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildAllReportSheet(), "All Report");
  XLSX.utils.book_append_sheet(wb, buildListSheet(), "List Winner");
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(), "Summary");

  XLSX.writeFile(wb, "Report_Lucky_Draw_Winner_Tropical_Dinner_2026.xlsx");
}

function buildAllReportSheet() {
  const data = [];

  data.push(["TROPICAL DINNER 2026", "", "", "", "", ""]);
  data.push(["REPORT LUCKY DRAW WINNER", "", "", "", "", ""]);
  data.push([]);
  data.push(["Place No.", "Lucky No.", "Employee Name", "Company", "Prize", "Collection"]);

  filteredData.forEach(item => {
    data.push([
      item.placeNumber || item.place || "",
      item.luckyNo || "",
      item.employeeName || "",
      item.company || item.companyName || "",
      item.prize || "",
      getCollectionIcon(item.collectionStatus || item.statusCollection)
    ]);
  });

  data.push([]);

  const summaryTitleRow = data.length + 1;
  data.push(["Collection Summary", "", "", "", "", ""]);

  const summaryHeaderRow = data.length + 1;
  data.push(["Company", "", "Total Collect", "Total Not Collect", "", ""]);

  summaryData.forEach(item => {
    data.push([item.company, "", item.collect, item.notCollect, "", ""]);
  });

  data.push([
    "GRAND TOTAL",
    "",
    document.getElementById("grandCollect").textContent,
    document.getElementById("grandNotCollect").textContent,
    "",
    ""
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!ref"] = `A1:F${data.length}`;

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: summaryTitleRow - 1, c: 0 }, e: { r: summaryTitleRow - 1, c: 5 } }
  ];

  const summaryStartRow = summaryHeaderRow;
  const summaryEndRow = summaryHeaderRow + summaryData.length + 1;

  for (let r = summaryStartRow; r <= summaryEndRow; r++) {
    ws["!merges"].push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 1 } });
    ws["!merges"].push({ s: { r: r - 1, c: 3 }, e: { r: r - 1, c: 5 } });
  }

  ws["!cols"] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
    { wch: 18 },
    { wch: 38 },
    { wch: 14 }
  ];

  applyExcelStyle(ws, data.length, true);

  ws["A1"].s = excelTitleStyle();
  ws["A2"].s = excelSubtitleStyle();

  ["A4", "B4", "C4", "D4", "E4", "F4"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  const summaryTitleCell = "A" + summaryTitleRow;
  if (ws[summaryTitleCell]) ws[summaryTitleCell].s = excelSummaryTitleStyle();

  ["A", "C", "D"].forEach(col => {
    const cell = col + summaryHeaderRow;
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  applyCollectionExcelStyle(ws, 5, 4 + filteredData.length);
  applyWrapExcelStyle(ws, 5, 4 + filteredData.length, ["C", "E"]);

  return ws;
}

function buildListSheet() {
  const data = [];

  data.push(["Place No.", "Lucky No.", "Employee Name", "Company", "Prize", "Collection"]);

  filteredData.forEach(item => {
    data.push([
      item.placeNumber || item.place || "",
      item.luckyNo || "",
      item.employeeName || "",
      item.company || item.companyName || "",
      item.prize || "",
      getCollectionIcon(item.collectionStatus || item.statusCollection)
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!ref"] = `A1:F${data.length}`;

  ws["!cols"] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
    { wch: 18 },
    { wch: 38 },
    { wch: 14 }
  ];

  applyExcelStyle(ws, data.length, true);

  ["A1", "B1", "C1", "D1", "E1", "F1"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  applyCollectionExcelStyle(ws, 2, data.length);
  applyWrapExcelStyle(ws, 2, data.length, ["C", "E"]);

  return ws;
}

function buildSummarySheet() {
  const data = [];

  data.push(["Company", "", "Total Collect", "Total Not Collect"]);

  summaryData.forEach(item => {
    data.push([item.company, "", item.collect, item.notCollect]);
  });

  data.push([
    "GRAND TOTAL",
    "",
    document.getElementById("grandCollect").textContent,
    document.getElementById("grandNotCollect").textContent
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!ref"] = `A1:D${data.length}`;

  ws["!merges"] = [];

  for (let r = 1; r <= data.length; r++) {
    ws["!merges"].push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 1 } });
  }

  ws["!cols"] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 }
  ];

  applyExcelStyle(ws, data.length, false);

  ["A1", "C1", "D1"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  return ws;
}

function applyExcelStyle(ws, rowCount, fixedWinnerRowHeight) {
  Object.keys(ws).forEach(cell => {
    if (cell[0] === "!") return;

    ws[cell].s = {
      font: { name: "Arial", sz: 11, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: false },
      border: excelBorder()
    };
  });

  ws["!rows"] = [];

  for (let r = 0; r < rowCount; r++) {
    ws["!rows"][r] = { hpt: fixedWinnerRowHeight ? 42 : 26 };
  }
}

function applyWrapExcelStyle(ws, startRow, endRow, columns) {
  for (let r = startRow; r <= endRow; r++) {
    columns.forEach(col => {
      const cell = col + r;

      if (ws[cell]) {
        ws[cell].s = {
          ...ws[cell].s,
          alignment: {
            horizontal: col === "C" || col === "E" ? "left" : "center",
            vertical: "center",
            wrapText: true
          }
        };
      }
    });
  }
}

function applyCollectionExcelStyle(ws, startRow, endRow) {
  for (let r = startRow; r <= endRow; r++) {
    const cell = "F" + r;

    if (ws[cell]) {
      ws[cell].s = {
        font: { name: "Arial", sz: 16, bold: true, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: false },
        border: excelBorder()
      };
    }
  }
}

function excelTitleStyle() {
  return {
    font: { name: "Arial", sz: 24, bold: true, color: { rgb: "FF0000" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: false },
    border: excelBorder()
  };
}

function excelSubtitleStyle() {
  return {
    font: { name: "Arial", sz: 16, bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: false },
    border: excelBorder()
  };
}

function excelHeaderStyle() {
  return {
    font: { name: "Arial", sz: 11, bold: true, color: { rgb: "000000" } },
    fill: { patternType: "solid", fgColor: { rgb: "D9D9D9" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: false },
    border: excelBorder()
  };
}

function excelSummaryTitleStyle() {
  return {
    font: { name: "Arial", sz: 11, bold: false, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: false },
    border: excelBorder()
  };
}

function excelBorder() {
  return {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  };
}

/* =====================================================
   DOCUMENT / WORD
===================================================== */

function downloadWord() {
  const rowsHTML = filteredData.map(item => {
    const status = item.collectionStatus || item.statusCollection || "";

    return `
      <tr>
        <td class="col-place">${item.placeNumber || item.place || ""}</td>
        <td class="col-lucky">${item.luckyNo || ""}</td>
        <td class="col-name">${item.employeeName || ""}</td>
        <td class="col-company">${item.company || item.companyName || ""}</td>
        <td class="col-prize">${item.prize || ""}</td>
        <td class="col-collection">${getCollectionIcon(status)}</td>
      </tr>
    `;
  }).join("");

  const summaryRowsHTML = summaryData.map(item => {
    return `
      <tr>
        <td>${item.company || ""}</td>
        <td>${item.collect}</td>
        <td>${item.notCollect}</td>
      </tr>
    `;
  }).join("");

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">

      <style>
        @page {
          size: A4 portrait;
          margin: 0.4in;
        }

        body {
          font-family: Arial, sans-serif;
          color: #000;
          margin: 0;
          padding: 0;
        }

        .letter-head {
          text-align: center;
          margin-bottom: 18px;
        }

        h1 {
          color: red;
          text-align: center;
          font-family: Arial, sans-serif;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          line-height: 1.1;
        }

        h2 {
          text-align: center;
          font-family: Arial, sans-serif;
          font-size: 16px;
          font-weight: bold;
          margin: 6px 0 18px;
          line-height: 1.1;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-family: Arial, sans-serif;
        }

        th,
        td {
          border: 1px solid #000;
          padding: 4px 5px;
          font-family: Arial, sans-serif;
          font-size: 9.5px;
          color: #000;
          line-height: 1.15;
          height: 42px;
          vertical-align: middle;
        }

        th {
          background: #d9d9d9;
          font-weight: bold;
          text-align: center;
          height: 22px;
        }

        .col-place {
          width: 45px;
          text-align: center;
          white-space: nowrap;
        }

        .col-lucky {
          width: 52px;
          text-align: center;
          white-space: nowrap;
        }

        .col-name {
          width: 120px;
          text-align: left;
          white-space: normal;
        }

        .col-company {
          width: 85px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
        }

        .col-prize {
          width: 170px;
          text-align: left;
          white-space: normal;
        }

        .col-collection {
          width: 60px;
          text-align: center;
          white-space: nowrap;
          font-size: 13px;
          font-weight: bold;
        }

        .summary-title {
          margin-top: 18px;
          margin-bottom: 6px;
          font-family: Arial, sans-serif;
          font-size: 11px;
          font-weight: bold;
        }

        .summary-table {
          width: 70%;
          table-layout: fixed;
        }

        .summary-table th,
        .summary-table td {
          font-size: 11px;
          height: 22px;
          white-space: nowrap;
          overflow: hidden;
        }

        .summary-table td:first-child {
          text-align: left;
          width: 180px;
        }

        .summary-table td:nth-child(2),
        .summary-table td:nth-child(3) {
          text-align: center;
          width: 100px;
        }

        .grand-total td {
          font-weight: bold;
          background: #d9d9d9;
        }
      </style>
    </head>

    <body>

      <div class="letter-head">
        <h1>TROPICAL DINNER 2026</h1>
        <h2>REPORT LUCKY DRAW WINNER</h2>
      </div>

      <table>
        <thead>
          <tr>
            <th class="col-place">Place No.</th>
            <th class="col-lucky">Lucky No.</th>
            <th class="col-name">Employee Name</th>
            <th class="col-company">Company</th>
            <th class="col-prize">Prize</th>
            <th class="col-collection">Collection</th>
          </tr>
        </thead>

        <tbody>
          ${rowsHTML}
        </tbody>
      </table>

      <div class="summary-title">Collection Summary</div>

      <table class="summary-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Total Collect</th>
            <th>Total Not Collect</th>
          </tr>
        </thead>

        <tbody>
          ${summaryRowsHTML}

          <tr class="grand-total">
            <td>GRAND TOTAL</td>
            <td>${document.getElementById("grandCollect").textContent}</td>
            <td>${document.getElementById("grandNotCollect").textContent}</td>
          </tr>
        </tbody>
      </table>

    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", content], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "Report_Lucky_Draw_Winner_Tropical_Dinner_2026.doc";

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.addEventListener("resize", equalizeWinnerRowHeights);
loadWinnerReport();
