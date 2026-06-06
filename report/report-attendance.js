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
  return isAttend(value) ? "✓" : "✕";
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
    let firstCompare = 0;

    if (sortField === "name") {
      firstCompare = cleanText(a.employeeName).localeCompare(cleanText(b.employeeName));
    }

    if (sortField === "company") {
      firstCompare = cleanText(a.company).localeCompare(cleanText(b.company));

      if (firstCompare === 0) {
        firstCompare = cleanText(a.employeeName).localeCompare(cleanText(b.employeeName));
      }
    }

    if (sortField === "attendance") {
      firstCompare = getAttendanceText(a.attendance).localeCompare(getAttendanceText(b.attendance));

      if (firstCompare === 0) {
        firstCompare = cleanText(a.employeeName).localeCompare(cleanText(b.employeeName));
      }
    }

    if (sortOrder === "za") {
      return firstCompare * -1;
    }

    return firstCompare;
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

  summaryData = Object.values(summary).sort((a, b) => {
    return cleanText(a.company).localeCompare(cleanText(b.company));
  });

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

function downloadExcel() {
  const wb = XLSX.utils.book_new();

  const sheetData = [];

  sheetData.push(["TROPICAL DINNER 2026", "", "", ""]);
  sheetData.push(["REPORT ATTENDANCE", "", "", ""]);
  sheetData.push([]);
  sheetData.push(["No.", "Employee Name", "Company", "Attendance"]);

  filteredData.forEach((item, index) => {
    sheetData.push([
      index + 1,
      item.employeeName || "",
      item.company || "",
      getAttendIcon(item.attendance)
    ]);
  });

  sheetData.push([]);
  sheetData.push(["Attendance Summary", "", ""]);
  sheetData.push(["Company", "Total Attend", "Total Not Attend"]);

  summaryData.forEach(item => {
    sheetData.push([
      item.company,
      item.attend,
      item.notAttend
    ]);
  });

  sheetData.push([
    "GRAND TOTAL",
    document.getElementById("grandAttend").textContent,
    document.getElementById("grandNotAttend").textContent
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const summaryTitleRow = 5 + filteredData.length + 1;

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: summaryTitleRow, c: 0 }, e: { r: summaryTitleRow, c: 2 } }
  ];

  ws["!cols"] = [
    { wch: 8 },
    { wch: 38 },
    { wch: 32 },
    { wch: 16 }
  ];

  Object.keys(ws).forEach(cell => {
    if (cell[0] === "!") return;

    ws[cell].s = {
      font: {
        name: "Arial",
        sz: 11,
        color: { rgb: "000000" }
      },
      alignment: {
        vertical: "center",
        horizontal: "center",
        wrapText: true
      },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
  });

  ws["A1"].s = {
    font: { name: "Arial", sz: 18, bold: true, color: { rgb: "FF0000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  ws["A2"].s = {
    font: { name: "Arial", sz: 14, bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  ["A4", "B4", "C4", "D4"].forEach(cell => {
    ws[cell].s = getHeaderStyle();
  });

  const summaryHeaderRow = summaryTitleRow + 2;
  ["A", "B", "C"].forEach(col => {
    const cell = col + (summaryHeaderRow + 1);
    if (ws[cell]) ws[cell].s = getHeaderStyle();
  });

  XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
  XLSX.writeFile(wb, "Report_Attendance_Tropical_Dinner_2026.xlsx");
}

function getHeaderStyle() {
  return {
    font: { name: "Arial", sz: 11, bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "E8E8E8" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };
}

function downloadPDF() {
  const element = document.getElementById("reportArea");

  element.classList.add("pdf-mode");

  const opt = {
    margin: [8, 8, 8, 8],
    filename: "Report_Attendance_Tropical_Dinner_2026.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait"
    },
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: ["tr", ".letter-head", ".summary-table"]
    }
  };

  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      element.classList.remove("pdf-mode");
    });
}

function downloadWord() {
  const reportHTML = document.getElementById("reportArea").innerHTML;

  const content = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; color:#000; }
        h1 { color: red; text-align: center; font-size: 28px; }
        h2 { text-align: center; font-size: 21px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 7px; text-align: center; font-size: 12px; color:#000; }
        th { background: #eee; }
        td:nth-child(2), td:nth-child(3) { text-align: left; }
        .attendance-icon { color:#000; font-weight:bold; }
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
