const API_URL = "https://script.google.com/macros/s/AKfycbyxQjtzyKoxWmMFkIbvHgiLMZRuROWvSN8vxE1BAApoGp-2FxV6qTa6gT5-Cb-2385s/exec";

let allData = [];
let filteredData = [];
let summaryData = [];

async function loadWinnerReport() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();

    allData = normalizeWinnerData(json);

    loadCompanyDropdown();
    loadStatusDropdown();
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

function normalizeWinnerData(data) {
  const list = Array.isArray(data) ? data : (data.winnerTable || data.winners || data.data || []);

  return list.map(item => {
    if (Array.isArray(item)) {
      return {
        placeNumber: item[0] || "",
        luckyNo: item[1] || "",
        employeeName: item[2] || "",
        company: item[3] || "",
        prize: item[4] || "",
        statusCollection: item[5] || ""
      };
    }

    return {
      placeNumber: item.placeNumber || item.place || item.placeNo || item["Place Number"] || item["Place"] || "",
      luckyNo: item.luckyNo || item.luckyNumber || item["Lucky No."] || item["Lucky No"] || "",
      employeeName: item.employeeName || item.name || item["Employee Name"] || "",
      company: item.company || item.companyName || item["Company Name"] || item["Company"] || "",
      prize: item.prize || item["Prize"] || "",
      statusCollection: item.statusCollection || item.collectionStatus || item.status || item["Status Collection"] || ""
    };
  }).filter(item => {
    return String(item.placeNumber || item.luckyNo || item.employeeName || item.company || item.prize || item.statusCollection).trim() !== "";
  });
}

function cleanText(value) {
  return String(value || "").trim().toUpperCase();
}

function isCollected(value) {
  const text = cleanText(value);
  return text === "COLLECTED" || text === "COLLECT" || text === "YES" || text === "DONE" || text === "RECEIVED";
}

function loadCompanyDropdown() {
  const companyFilter = document.getElementById("companyFilter");
  companyFilter.innerHTML = `<option value="ALL">All Company</option>`;

  const companies = [...new Set(
    allData
      .map(item => item.company || "")
      .filter(company => company.trim() !== "")
  )].sort((a, b) => a.localeCompare(b));

  companies.forEach(company => {
    const option = document.createElement("option");
    option.value = company;
    option.textContent = company;
    companyFilter.appendChild(option);
  });
}

function loadStatusDropdown() {
  const statusFilter = document.getElementById("statusFilter");
  statusFilter.innerHTML = `<option value="ALL">All Collection Status</option>`;

  const statuses = [...new Set(
    allData
      .map(item => item.statusCollection || "")
      .filter(status => status.trim() !== "")
  )].sort((a, b) => a.localeCompare(b));

  statuses.forEach(status => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    statusFilter.appendChild(option);
  });
}

function applyFilterAndSort() {
  const selectedCompany = document.getElementById("companyFilter").value;
  const selectedStatus = document.getElementById("statusFilter").value;

  filteredData = allData.filter(item => {
    const companyMatch = selectedCompany === "ALL" || item.company === selectedCompany;
    const statusMatch = selectedStatus === "ALL" || item.statusCollection === selectedStatus;

    return companyMatch && statusMatch;
  });

  sortReportData();
  renderWinnerTable();
  renderSummaryTable();
}

function sortReportData() {
  const sortField = document.getElementById("sortField").value;
  const sortOrder = document.getElementById("sortOrder").value;

  filteredData.sort((a, b) => {
    const nameCompare = cleanText(a.employeeName).localeCompare(cleanText(b.employeeName));
    let compare = 0;

    if (sortField === "employeeName") {
      compare = nameCompare;
    }

    if (sortField === "company") {
      compare = cleanText(a.company).localeCompare(cleanText(b.company));
      if (compare === 0) compare = nameCompare;
    }

    if (sortField === "status") {
      compare = cleanText(a.statusCollection).localeCompare(cleanText(b.statusCollection));
      if (compare === 0) compare = nameCompare;
    }

    return sortOrder === "za" ? compare * -1 : compare;
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
    tbody.innerHTML += `
      <tr>
        <td>${item.placeNumber || ""}</td>
        <td>${item.luckyNo || ""}</td>
        <td>${item.employeeName || ""}</td>
        <td>${item.company || ""}</td>
        <td>${item.prize || ""}</td>
        <td>${item.statusCollection || ""}</td>
      </tr>
    `;
  });
}

function renderSummaryTable() {
  const summary = {};
  let grandWinner = 0;
  let grandCollected = 0;
  let grandNotCollected = 0;

  filteredData.forEach(item => {
    const company = item.company || "Unknown Company";

    if (!summary[company]) {
      summary[company] = {
        company: company,
        totalWinner: 0,
        collected: 0,
        notCollected: 0
      };
    }

    summary[company].totalWinner++;
    grandWinner++;

    if (isCollected(item.statusCollection)) {
      summary[company].collected++;
      grandCollected++;
    } else {
      summary[company].notCollected++;
      grandNotCollected++;
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
        <td>${item.totalWinner}</td>
        <td>${item.collected}</td>
        <td>${item.notCollected}</td>
      </tr>
    `;
  });

  document.getElementById("grandWinner").textContent = grandWinner;
  document.getElementById("grandCollected").textContent = grandCollected;
  document.getElementById("grandNotCollected").textContent = grandNotCollected;
}

/* =====================================================
   PDF DIRECT DOWNLOAD
===================================================== */

function downloadPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF library not loaded. Check jsPDF script link.");
    return;
  }

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "landscape",
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

  const placeWidth = 55;
  const luckyWidth = 70;
  const nameWidth = 170;
  const companyWidth = 120;
  const statusWidth = 105;
  const prizeWidth = contentWidth - placeWidth - luckyWidth - nameWidth - companyWidth - statusWidth;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 0, 0);
  doc.text("TROPICAL DINNER 2026", pageWidth / 2, margin + 10, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("REPORT LUCKY DRAW WINNER", pageWidth / 2, margin + 34, { align: "center" });

  const tableBody = filteredData.map(item => [
    item.placeNumber || "",
    item.luckyNo || "",
    item.employeeName || "",
    item.company || "",
    item.prize || "",
    item.statusCollection || ""
  ]);

  doc.autoTable({
    startY: margin + 58,
    head: [["Place No.", "Lucky No.", "Employee Name", "Company", "Prize", "Status Collection"]],
    body: tableBody,
    margin: { top: margin, right: margin, bottom: margin, left: margin },
    tableWidth: contentWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      minCellHeight: 20,
      valign: "middle",
      overflow: "ellipsize"
    },
    headStyles: {
      fillColor: [217, 217, 217],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle"
    },
    columnStyles: {
      0: { cellWidth: placeWidth, halign: "center" },
      1: { cellWidth: luckyWidth, halign: "center" },
      2: { cellWidth: nameWidth, halign: "left" },
      3: { cellWidth: companyWidth, halign: "center" },
      4: { cellWidth: prizeWidth, halign: "left" },
      5: { cellWidth: statusWidth, halign: "center" }
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
  doc.text("Winner Summary", margin, finalY);

  const summaryBody = summaryData.map(item => [
    item.company || "",
    item.totalWinner,
    item.collected,
    item.notCollected
  ]);

  summaryBody.push([
    "GRAND TOTAL",
    document.getElementById("grandWinner").textContent,
    document.getElementById("grandCollected").textContent,
    document.getElementById("grandNotCollected").textContent
  ]);

  doc.autoTable({
    startY: finalY + 8,
    head: [["Company", "Total Winner", "Total Collected", "Total Not Collected"]],
    body: summaryBody,
    margin: { top: margin, right: margin, bottom: margin, left: margin },
    tableWidth: contentWidth * 0.70,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      minCellHeight: 20,
      valign: "middle",
      overflow: "ellipsize"
    },
    headStyles: {
      fillColor: [217, 217, 217],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle"
    },
    columnStyles: {
      0: { cellWidth: 180, halign: "left" },
      1: { cellWidth: 90, halign: "center" },
      2: { cellWidth: 100, halign: "center" },
      3: { cellWidth: 120, halign: "center" }
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.row.index === summaryBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [217, 217, 217];
      }
    }
  });

  doc.save("Report_Winner_Lucky_Draw_Tropical_Dinner_2026.pdf");
}

/* =====================================================
   EXCEL - 3 SHEETS
===================================================== */

function downloadExcel() {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildAllReportSheet(), "All Report");
  XLSX.utils.book_append_sheet(wb, buildListSheet(), "List Winner");
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(), "Summary");

  XLSX.writeFile(wb, "Report_Winner_Lucky_Draw_Tropical_Dinner_2026.xlsx");
}

function buildAllReportSheet() {
  const data = [];

  data.push(["TROPICAL DINNER 2026", "", "", "", "", ""]);
  data.push(["REPORT LUCKY DRAW WINNER", "", "", "", "", ""]);
  data.push([]);
  data.push(["Place No.", "Lucky No.", "Employee Name", "Company", "Prize", "Status Collection"]);

  filteredData.forEach(item => {
    data.push([
      item.placeNumber || "",
      item.luckyNo || "",
      item.employeeName || "",
      item.company || "",
      item.prize || "",
      item.statusCollection || ""
    ]);
  });

  data.push([]);

  const summaryTitleRow = data.length + 1;
  data.push(["Winner Summary", "", "", "", "", ""]);

  const summaryHeaderRow = data.length + 1;
  data.push(["Company", "Total Winner", "Total Collected", "Total Not Collected", "", ""]);

  summaryData.forEach(item => {
    data.push([
      item.company,
      item.totalWinner,
      item.collected,
      item.notCollected,
      "",
      ""
    ]);
  });

  data.push([
    "GRAND TOTAL",
    document.getElementById("grandWinner").textContent,
    document.getElementById("grandCollected").textContent,
    document.getElementById("grandNotCollected").textContent,
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

  ws["!cols"] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 42 },
    { wch: 22 },
    { wch: 42 },
    { wch: 22 }
  ];

  applyExcelStyle(ws, data.length);

  ws["A1"].s = excelTitleStyle();
  ws["A2"].s = excelSubtitleStyle();

  ["A4", "B4", "C4", "D4", "E4", "F4"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  const summaryTitleCell = "A" + summaryTitleRow;
  if (ws[summaryTitleCell]) ws[summaryTitleCell].s = excelSummaryTitleStyle();

  ["A", "B", "C", "D"].forEach(col => {
    const cell = col + summaryHeaderRow;
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  return ws;
}

function buildListSheet() {
  const data = [];

  data.push(["Place No.", "Lucky No.", "Employee Name", "Company", "Prize", "Status Collection"]);

  filteredData.forEach(item => {
    data.push([
      item.placeNumber || "",
      item.luckyNo || "",
      item.employeeName || "",
      item.company || "",
      item.prize || "",
      item.statusCollection || ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!ref"] = `A1:F${data.length}`;

  ws["!cols"] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 42 },
    { wch: 22 },
    { wch: 42 },
    { wch: 22 }
  ];

  applyExcelStyle(ws, data.length);

  ["A1", "B1", "C1", "D1", "E1", "F1"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  return ws;
}

function buildSummarySheet() {
  const data = [];

  data.push(["Company", "Total Winner", "Total Collected", "Total Not Collected"]);

  summaryData.forEach(item => {
    data.push([
      item.company,
      item.totalWinner,
      item.collected,
      item.notCollected
    ]);
  });

  data.push([
    "GRAND TOTAL",
    document.getElementById("grandWinner").textContent,
    document.getElementById("grandCollected").textContent,
    document.getElementById("grandNotCollected").textContent
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!ref"] = `A1:D${data.length}`;

  ws["!cols"] = [
    { wch: 25 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 }
  ];

  applyExcelStyle(ws, data.length);

  ["A1", "B1", "C1", "D1"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  return ws;
}

function applyExcelStyle(ws, rowCount) {
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
    ws["!rows"][r] = { hpt: 26 };
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
    return `
      <tr>
        <td class="col-place">${item.placeNumber || ""}</td>
        <td class="col-lucky">${item.luckyNo || ""}</td>
        <td class="col-name">${item.employeeName || ""}</td>
        <td class="col-company">${item.company || ""}</td>
        <td class="col-prize">${item.prize || ""}</td>
        <td class="col-status">${item.statusCollection || ""}</td>
      </tr>
    `;
  }).join("");

  const summaryRowsHTML = summaryData.map(item => {
    return `
      <tr>
        <td>${item.company || ""}</td>
        <td>${item.totalWinner}</td>
        <td>${item.collected}</td>
        <td>${item.notCollected}</td>
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
          size: A4 landscape;
          margin: 0.5in;
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
          font-size: 10px;
          color: #000;
          line-height: 1.1;
          height: 22px;
          vertical-align: middle;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
        }

        th {
          background: #d9d9d9;
          font-weight: bold;
          text-align: center;
        }

        .col-place { width: 55px; text-align: center; }
        .col-lucky { width: 70px; text-align: center; }
        .col-name { width: 170px; text-align: left; }
        .col-company { width: 115px; text-align: center; }
        .col-prize { width: 240px; text-align: left; }
        .col-status { width: 105px; text-align: center; }

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
          font-size: 10px;
          height: 22px;
          white-space: nowrap;
          overflow: hidden;
        }

        .summary-table td:first-child {
          text-align: left;
          width: 180px;
        }

        .summary-table td:nth-child(2),
        .summary-table td:nth-child(3),
        .summary-table td:nth-child(4) {
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
            <th class="col-status">Status Collection</th>
          </tr>
        </thead>

        <tbody>
          ${rowsHTML}
        </tbody>
      </table>

      <div class="summary-title">Winner Summary</div>

      <table class="summary-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Total Winner</th>
            <th>Total Collected</th>
            <th>Total Not Collected</th>
          </tr>
        </thead>

        <tbody>
          ${summaryRowsHTML}

          <tr class="grand-total">
            <td>GRAND TOTAL</td>
            <td>${document.getElementById("grandWinner").textContent}</td>
            <td>${document.getElementById("grandCollected").textContent}</td>
            <td>${document.getElementById("grandNotCollected").textContent}</td>
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
  a.download = "Report_Winner_Lucky_Draw_Tropical_Dinner_2026.doc";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

loadWinnerReport();
