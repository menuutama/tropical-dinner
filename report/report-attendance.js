const API_URL = "https://script.google.com/macros/s/AKfycbyxQjtzyKoxWmMFkIbvHgiLMZRuROWvSN8vxE1BAApoGp-2FxV6qTa6gT5-Cb-2385s/exec";

let allData = [];
let filteredData = [];
let summaryData = [];

async function loadAttendanceReport() {
  try {
    const res = await fetch(API_URL);
    allData = await res.json();

    filteredData = [...allData];

    loadCompanyDropdown();
    renderAttendanceTable();
    renderSummaryTable();

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

function loadCompanyDropdown() {
  const companyFilter = document.getElementById("companyFilter");

  const companies = [...new Set(
    allData
      .map(item => item.company || "")
      .filter(company => company.trim() !== "")
  )].sort();

  companies.forEach(company => {
    const option = document.createElement("option");
    option.value = company;
    option.textContent = company;
    companyFilter.appendChild(option);
  });
}

function applyFilter() {
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

  renderAttendanceTable();
  renderSummaryTable();
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
    const attendIcon = isAttend(item.attendance) ? "✔️" : "✖️";

    tbody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${item.employeeName || ""}</td>
        <td>${item.company || ""}</td>
        <td class="attendance-icon">${attendIcon}</td>
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

  summaryData = Object.values(summary);

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

  sheetData.push(["TROPICAL DINNER 2026"]);
  sheetData.push(["REPORT ATTENDANCE"]);
  sheetData.push([]);
  sheetData.push(["No.", "Employee Name", "Company", "Attendance"]);

  filteredData.forEach((item, index) => {
    sheetData.push([
      index + 1,
      item.employeeName || "",
      item.company || "",
      isAttend(item.attendance) ? "✔️" : "✖️"
    ]);
  });

  sheetData.push([]);
  sheetData.push(["Attendance Summary"]);
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

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
  ];

  ws["!cols"] = [
    { wch: 8 },
    { wch: 35 },
    { wch: 30 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
  XLSX.writeFile(wb, "Report_Attendance_Tropical_Dinner_2026.xlsx");
}

function downloadPDF() {
  const element = document.getElementById("reportArea");

  const opt = {
    margin: [0.35, 0.35, 0.35, 0.35],
    filename: "Report_Attendance_Tropical_Dinner_2026.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: {
      unit: "in",
      format: "a4",
      orientation: "portrait"
    },
    pagebreak: {
      mode: ["avoid-all", "css", "legacy"]
    }
  };

  html2pdf().set(opt).from(element).save();
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
        h1 { color: red; text-align: center; }
        h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 7px; text-align: center; font-size: 12px; }
        th { background: #eee; }
        td:nth-child(2), td:nth-child(3) { text-align: left; }
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
