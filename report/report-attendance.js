const API_URL = "https://script.google.com/macros/s/AKfycbyxQjtzyKoxWmMFkIbvHgiLMZRuROWvSN8vxE1BAApoGp-2FxV6qTa6gT5-Cb-2385s/exec";

let allData = [];
let filteredData = [];
let summaryData = [];

async function loadAttendanceReport() {
  try {
    const res = await fetch(API_URL);
    allData = await res.json();

    loadCompanyDropdown();
    applyFilterAndSort();

  } catch (err) {
    document.getElementById("attendanceBody").innerHTML = `
      <tr>
        <td colspan="4">Failed to load data</td>
      </tr>
    `;
    console.error(err);
  }
}

function isAttend(value) {
  return String(value || "").trim().toLowerCase() === "attend";
}

function getAttendIcon(value) {
  return isAttend(value) ? "✓" : "×";
}

function getAttendanceText(value) {
  return isAttend(value) ? "Attend" : "Not Attend";
}

function cleanText(value) {
  return String(value || "").trim().toUpperCase();
}

function loadCompanyDropdown() {
  const companyFilter = document.getElementById("companyFilter");

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

function applyFilterAndSort() {
  const selectedCompany = document.getElementById("companyFilter").value;
  const selectedAttendance = document.getElementById("attendanceFilter").value;

  filteredData = allData.filter(item => {
    const companyMatch =
      selectedCompany === "ALL" || item.company === selectedCompany;

    let attendanceMatch = true;

    if (selectedAttendance === "ATTEND") {
      attendanceMatch = isAttend(item.attendance);
    }

    if (selectedAttendance === "NOT_ATTEND") {
      attendanceMatch = !isAttend(item.attendance);
    }

    return companyMatch && attendanceMatch;
  });

  sortReportData();
  renderAttendanceTable();
  renderSummaryTable();
}

function sortReportData() {
  const sortField = document.getElementById("sortField").value;
  const sortOrder = document.getElementById("sortOrder").value;

  filteredData.sort((a, b) => {
    const nameCompare =
      cleanText(a.employeeName).localeCompare(cleanText(b.employeeName));

    let compare = 0;

    if (sortField === "name") {
      compare = nameCompare;
      return sortOrder === "za" ? compare * -1 : compare;
    }

    if (sortField === "company") {
      compare = cleanText(a.company).localeCompare(cleanText(b.company));
      if (compare !== 0) return compare;
      return sortOrder === "za" ? nameCompare * -1 : nameCompare;
    }

    if (sortField === "attendance") {
      compare = getAttendanceText(a.attendance).localeCompare(getAttendanceText(b.attendance));
      if (compare !== 0) return compare;
      return sortOrder === "za" ? nameCompare * -1 : nameCompare;
    }

    return compare;
  });
}

function renderAttendanceTable() {
  const tbody = document.getElementById("attendanceBody");
  tbody.innerHTML = "";

  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">No data found</td>
      </tr>
    `;
    return;
  }

  filteredData.forEach((item, index) => {
    tbody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${item.employeeName || ""}</td>
        <td>${item.company || ""}</td>
        <td class="attendance-icon">${getAttendIcon(item.attendance)}</td>
      </tr>
    `;
  });
}

function renderSummaryTable() {
  const summary = {};
  let grandAttend = 0;
  let grandNotAttend = 0;

  filteredData.forEach(item => {
    const company = item.company || "Unknown Company";

    if (!summary[company]) {
      summary[company] = {
        company: company,
        attend: 0,
        notAttend: 0
      };
    }

    if (isAttend(item.attendance)) {
      summary[company].attend++;
      grandAttend++;
    } else {
      summary[company].notAttend++;
      grandNotAttend++;
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
        <td>${item.attend}</td>
        <td>${item.notAttend}</td>
      </tr>
    `;
  });

  document.getElementById("grandAttend").textContent = grandAttend;
  document.getElementById("grandNotAttend").textContent = grandNotAttend;
}

/* =====================================================
   PDF DIRECT DOWNLOAD - A4 PORTRAIT + 1 INCH MARGIN
===================================================== */

function downloadPDF() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 72; // 1 inch
  const contentWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 0, 0);
  doc.text("TROPICAL DINNER 2026", pageWidth / 2, margin, {
    align: "center"
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("REPORT ATTENDANCE", pageWidth / 2, margin + 18, {
    align: "center"
  });

  const tableBody = filteredData.map((item, index) => [
    index + 1,
    item.employeeName || "",
    item.company || "",
    getAttendIcon(item.attendance)
  ]);

  doc.autoTable({
    startY: margin + 42,
    head: [["No.", "Employee Name", "Company", "Attendance"]],
    body: tableBody,
    margin: {
      top: margin,
      right: margin,
      bottom: margin,
      left: margin
    },
    tableWidth: contentWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      minCellHeight: 12,
      valign: "middle",
      overflow: "linebreak"
    },
    headStyles: {
      fillColor: [232, 232, 232],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center"
    },
    columnStyles: {
      0: { cellWidth: 35, halign: "center" },
      1: { cellWidth: 190, halign: "left" },
      2: { cellWidth: 150, halign: "left" },
      3: { cellWidth: contentWidth - 35 - 190 - 150, halign: "center" }
    },
    didDrawPage: function () {
      const pageNumber = doc.internal.getNumberOfPages();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);

      doc.text(
        `Page ${pageNumber}`,
        pageWidth / 2,
        pageHeight - 30,
        { align: "center" }
      );
    }
  });

  let finalY = doc.lastAutoTable.finalY + 20;

  if (finalY > pageHeight - margin - 100) {
    doc.addPage();
    finalY = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Attendance Summary", margin, finalY);

  const summaryBody = summaryData.map(item => [
    item.company,
    item.attend,
    item.notAttend
  ]);

  summaryBody.push([
    "GRAND TOTAL",
    document.getElementById("grandAttend").textContent,
    document.getElementById("grandNotAttend").textContent
  ]);

  doc.autoTable({
    startY: finalY + 8,
    head: [["Company", "Total Attend", "Total Not Attend"]],
    body: summaryBody,
    margin: {
      top: margin,
      right: margin,
      bottom: margin,
      left: margin
    },
    tableWidth: contentWidth * 0.75,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      valign: "middle"
    },
    headStyles: {
      fillColor: [232, 232, 232],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center"
    },
    columnStyles: {
      0: { cellWidth: 180, halign: "left" },
      1: { cellWidth: 90, halign: "center" },
      2: { cellWidth: 110, halign: "center" }
    },
    didParseCell: function (data) {
      if (data.row.index === summaryBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [217, 217, 217];
      }
    }
  });

  doc.save("Report_Attendance_Tropical_Dinner_2026.pdf");
}

/* =====================================================
   WORD
===================================================== */

function downloadWord() {
  const reportHTML = document.getElementById("reportArea").innerHTML;

  const content = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 portrait; margin: 1in; }
        body { font-family: Arial, sans-serif; color:#000; }
        h1 { color:red; text-align:center; font-size:24px; margin:0; }
        h2 { text-align:center; font-size:16px; margin:6px 0 18px; }
        table { width:100%; border-collapse:collapse; table-layout:fixed; }
        th, td { border:1px solid #000; padding:4px 6px; font-size:10px; color:#000; }
        th { background:#e8e8e8; font-weight:bold; text-align:center; }
        td:nth-child(2), td:nth-child(3) { text-align:left; }
        td:nth-child(1), td:nth-child(4) { text-align:center; }
        .summary-title { font-size:13px; margin-top:18px; }
        .summary-table { width:70%; }
      </style>
    </head>
    <body>${reportHTML}</body>
    </html>
  `;

  const blob = new Blob(["\ufeff", content], {
    type: "application/msword"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "Report_Attendance_Tropical_Dinner_2026.doc";
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =====================================================
   EXCEL - 3 SHEET
===================================================== */

function downloadExcel() {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildAllReportSheet(), "All Report");
  XLSX.utils.book_append_sheet(wb, buildListSheet(), "List Attendance");
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(), "Summary");

  XLSX.writeFile(wb, "Report_Attendance_Tropical_Dinner_2026.xlsx");
}

function buildAllReportSheet() {
  const data = [];

  data.push(["TROPICAL DINNER 2026", "", "", ""]);
  data.push(["REPORT ATTENDANCE", "", "", ""]);
  data.push([]);
  data.push(["No.", "Employee Name", "Company", "Attendance"]);

  filteredData.forEach((item, index) => {
    data.push([
      index + 1,
      item.employeeName || "",
      item.company || "",
      getAttendIcon(item.attendance)
    ]);
  });

  data.push([]);
  data.push(["Attendance Summary", "", ""]);
  data.push(["Company", "Total Attend", "Total Not Attend"]);

  summaryData.forEach(item => {
    data.push([item.company, item.attend, item.notAttend]);
  });

  data.push([
    "GRAND TOTAL",
    document.getElementById("grandAttend").textContent,
    document.getElementById("grandNotAttend").textContent
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  const summaryTitleRowIndex = filteredData.length + 5;

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: summaryTitleRowIndex, c: 0 }, e: { r: summaryTitleRowIndex, c: 2 } }
  ];

  ws["!cols"] = [
    { wch: 7 },
    { wch: 36 },
    { wch: 30 },
    { wch: 14 }
  ];

  applyExcelStyle(ws, data.length, 4, true);
  return ws;
}

function buildListSheet() {
  const data = [];

  data.push(["No.", "Employee Name", "Company", "Attendance"]);

  filteredData.forEach((item, index) => {
    data.push([
      index + 1,
      item.employeeName || "",
      item.company || "",
      getAttendIcon(item.attendance)
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws["!cols"] = [
    { wch: 7 },
    { wch: 36 },
    { wch: 30 },
    { wch: 14 }
  ];

  applyExcelStyle(ws, data.length, 4, false);
  return ws;
}

function buildSummarySheet() {
  const data = [];

  data.push(["Company", "Total Attend", "Total Not Attend"]);

  summaryData.forEach(item => {
    data.push([item.company, item.attend, item.notAttend]);
  });

  data.push([
    "GRAND TOTAL",
    document.getElementById("grandAttend").textContent,
    document.getElementById("grandNotAttend").textContent
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws["!cols"] = [
    { wch: 32 },
    { wch: 16 },
    { wch: 18 }
  ];

  applyExcelStyle(ws, data.length, 3, false);
  return ws;
}

function applyExcelStyle(ws, rowCount, colCount, hasLetterHead) {
  Object.keys(ws).forEach(cell => {
    if (cell[0] === "!") return;

    ws[cell].s = {
      font: {
        name: "Arial",
        sz: 10,
        color: { rgb: "000000" }
      },
      alignment: {
        vertical: "center",
        horizontal: "center",
        wrapText: true
      },
      border: getExcelBorder()
    };
  });

  if (hasLetterHead) {
    ws["A1"].s = {
      font: { name: "Arial", sz: 18, bold: true, color: { rgb: "FF0000" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    ws["A2"].s = {
      font: { name: "Arial", sz: 13, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    ["A4", "B4", "C4", "D4"].forEach(cell => {
      if (ws[cell]) ws[cell].s = getExcelHeaderStyle();
    });

    const summaryTitleRow = filteredData.length + 6;
    const summaryTitleCell = "A" + summaryTitleRow;

    if (ws[summaryTitleCell]) {
      ws[summaryTitleCell].s = {
        font: { name: "Arial", sz: 10, bold: false, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: getExcelBorder()
      };
    }

    const summaryHeaderRow = filteredData.length + 7;
    ["A", "B", "C"].forEach(col => {
      const cell = col + summaryHeaderRow;
      if (ws[cell]) ws[cell].s = getExcelHeaderStyle();
    });

  } else {
    const letters = ["A", "B", "C", "D"];
    for (let i = 0; i < colCount; i++) {
      const cell = letters[i] + "1";
      if (ws[cell]) ws[cell].s = getExcelHeaderStyle();
    }
  }

  ws["!rows"] = [];
  for (let r = 0; r < rowCount; r++) {
    ws["!rows"][r] = { hpt: 18 };
  }
}

function getExcelHeaderStyle() {
  return {
    font: { name: "Arial", sz: 10, bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "E8E8E8" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: getExcelBorder()
  };
}

function getExcelBorder() {
  return {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  };
}

loadAttendanceReport();
