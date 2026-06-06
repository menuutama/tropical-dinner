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

/* ================= PDF ================= */

function downloadPDF() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72;
  const contentWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 0, 0);
  doc.text("TROPICAL DINNER 2026", pageWidth / 2, margin, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("REPORT ATTENDANCE", pageWidth / 2, margin + 18, { align: "center" });

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
    margin: { top: margin, right: margin, bottom: margin, left: margin },
    tableWidth: contentWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      minCellHeight: 12
    },
    headStyles: {
      fillColor: [232, 232, 232],
      textColor: [0, 0, 0],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { cellWidth: 35, halign: "center" },
      1: { cellWidth: 190, halign: "left" },
      2: { cellWidth: 150, halign: "left" },
      3: { cellWidth: contentWidth - 375, halign: "center" }
    }
  });

  let finalY = doc.lastAutoTable.finalY + 20;

  if (finalY > pageHeight - margin - 120) {
    doc.addPage();
    finalY = margin;
  }

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
    margin: { top: margin, right: margin, bottom: margin, left: margin },
    tableWidth: contentWidth * 0.75,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [232, 232, 232],
      textColor: [0, 0, 0],
      fontStyle: "bold"
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

/* ================= EXCEL ================= */

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

  const summaryTitleRow = data.length + 1;
  data.push(["Attendance Summary", "", "", ""]);

  const summaryHeaderRow = data.length + 1;
  data.push(["Company", "Total Attend", "Total Not Attend", ""]);

  summaryData.forEach(item => {
    data.push([item.company, item.attend, item.notAttend, ""]);
  });

  data.push([
    "GRAND TOTAL",
    document.getElementById("grandAttend").textContent,
    document.getElementById("grandNotAttend").textContent,
    ""
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: summaryTitleRow - 1, c: 0 }, e: { r: summaryTitleRow - 1, c: 2 } }
  ];

  ws["!cols"] = [
    { wch: 8 },
    { wch: 38 },
    { wch: 30 },
    { wch: 14 }
  ];

  applyExcelStyle(ws, data.length, 4);

  ws["A1"].s = excelTitleStyle();
  ws["A2"].s = excelSubtitleStyle();

  ["A4", "B4", "C4", "D4"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  const summaryTitleCell = "A" + summaryTitleRow;
  if (ws[summaryTitleCell]) {
    ws[summaryTitleCell].s = {
      font: { name: "Arial", sz: 10, bold: false, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: excelBorder()
    };
  }

  ["A", "B", "C"].forEach(col => {
    const cell = col + summaryHeaderRow;
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

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
    { wch: 8 },
    { wch: 38 },
    { wch: 30 },
    { wch: 14 }
  ];

  applyExcelStyle(ws, data.length, 4);

  ["A1", "B1", "C1", "D1"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

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

  applyExcelStyle(ws, data.length, 3);

  ["A1", "B1", "C1"].forEach(cell => {
    if (ws[cell]) ws[cell].s = excelHeaderStyle();
  });

  return ws;
}

function applyExcelStyle(ws, rowCount, colCount) {
  Object.keys(ws).forEach(cell => {
    if (cell[0] === "!") return;

    ws[cell].s = {
      font: { name: "Arial", sz: 10, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: excelBorder()
    };
  });

  ws["!rows"] = [];
  for (let r = 0; r < rowCount; r++) {
    ws["!rows"][r] = { hpt: 18 };
  }
}

function excelTitleStyle() {
  return {
    font: { name: "Arial", sz: 18, bold: true, color: { rgb: "FF0000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
}

function excelSubtitleStyle() {
  return {
    font: { name: "Arial", sz: 13, bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
}

function excelHeaderStyle() {
  return {
    font: { name: "Arial", sz: 10, bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "E8E8E8" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
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

/* ================= WORD ================= */

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

loadAttendanceReport();
