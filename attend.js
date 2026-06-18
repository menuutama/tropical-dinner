const API_URL = window.TROPICAL_API_URL;

let allAttendData = [];
let selectedRow = null;

function apiUrl(params){
  const joiner = API_URL.includes("?") ? "&" : "?";
  return `${API_URL}${joiner}${params}`;
}

document.addEventListener("DOMContentLoaded", () => {
  getAttendData();
});

async function getAttendData(){
  try{
    const res = await fetch(apiUrl(`action=getAttendData&time=${Date.now()}`));
    const data = await res.json();

    allAttendData = data;

    loadCompanyDropdown();
    restoreCompanyFilter();
    filterAttendData();

  }catch(err){
    console.error(err);
    document.getElementById("attendTableBody").innerHTML = `
      <tr>
        <td colspan="3">Failed to load data</td>
      </tr>
    `;
  }
}

/* =========================
   COMPANY DROPDOWN
========================= */

function loadCompanyDropdown(){
  const companyFilter = document.getElementById("companyFilter");

  const currentValue =
    localStorage.getItem("attendanceCompanyFilter") || "ALL";

  companyFilter.innerHTML = `<option value="ALL">All Company</option>`;

  const companies = [...new Set(
    allAttendData
      .map(item => String(item.companyName || "").trim())
      .filter(name => name !== "")
  )].sort();

  companies.forEach(company => {
    const option = document.createElement("option");
    option.value = company;
    option.textContent = company;
    companyFilter.appendChild(option);
  });

  companyFilter.value =
    companies.includes(currentValue)
      ? currentValue
      : "ALL";
}

function restoreCompanyFilter(){
  const savedCompany =
    localStorage.getItem("attendanceCompanyFilter");

  const companyFilter =
    document.getElementById("companyFilter");

  if(savedCompany){
    companyFilter.value = savedCompany;
  }
}

/* =========================
   FILTER + SEARCH
========================= */

function filterAttendData(){

  const input =
    document.getElementById("searchInput");

  const clearBtn =
    document.getElementById("clearSearchBtn");

  const companyFilter =
    document.getElementById("companyFilter");

  const keyword =
    input.value.toLowerCase().trim();

  const selectedCompany =
    companyFilter.value;

  localStorage.setItem(
    "attendanceCompanyFilter",
    selectedCompany
  );

  clearBtn.style.display =
    keyword ? "block" : "none";

  const filtered = allAttendData.filter(item => {

    const luckyNo =
      String(item.luckyNo || "").toLowerCase();

    const employeeName =
      String(item.employeeName || "").toLowerCase();

    const companyName =
      String(item.companyName || "").toLowerCase();

    const matchSearch =
      luckyNo.includes(keyword) ||
      employeeName.includes(keyword) ||
      companyName.includes(keyword);

    const matchCompany =
      selectedCompany === "ALL" ||
      String(item.companyName || "").trim() === selectedCompany;

    return matchSearch && matchCompany;
  });

  displayAttendData(filtered);
}

function clearSearch(){

  const input =
    document.getElementById("searchInput");

  const clearBtn =
    document.getElementById("clearSearchBtn");

  input.value = "";
  clearBtn.style.display = "none";

  filterAttendData();
  input.focus();
}

/* =========================
   DISPLAY TABLE
========================= */

function displayAttendData(data){

  const tbody =
    document.getElementById("attendTableBody");

  tbody.innerHTML = "";

  if(!data || data.length === 0){

    tbody.innerHTML = `
      <tr>
        <td colspan="3">No data found</td>
      </tr>
    `;

    return;
  }

  data.forEach(item => {

    const tr = document.createElement("tr");

    tr.classList.add("attend-row");

    if(item.status === "ATTEND"){
      tr.classList.add("attended-row-green");
    }

    tr.innerHTML = `
      <td>${item.luckyNo || ""}</td>
      <td>${item.employeeName || ""}</td>
      <td>${item.companyName || ""}</td>
    `;

    tr.onclick = () => openPopup(item);

    tbody.appendChild(tr);
  });
}

/* =========================
   POPUP
========================= */

function openPopup(item){

  selectedRow = item;

  document.getElementById("popupLuckyNo").innerText =
    item.luckyNo || "";

  document.getElementById("popupEmployee").innerText =
    item.employeeName || "";

  document.getElementById("popupCompany").innerText =
    item.companyName || "";

  const attendBtn =
    document.getElementById("attendBtn");

  if(item.status === "ATTEND"){

    attendBtn.innerText = "Cancel Attendance";
    attendBtn.disabled = false;

    attendBtn.classList.add("cancel-btn");

  }else{

    attendBtn.innerText = "Attend";
    attendBtn.disabled = false;

    attendBtn.classList.remove("cancel-btn");
  }

  document
    .getElementById("attendPopup")
    .classList.add("show");
}

function closePopup(){

  document
    .getElementById("attendPopup")
    .classList.remove("show");

  selectedRow = null;
}

/* =========================
   ATTEND / CANCEL ATTEND
========================= */

async function markAttend(){

  if(!selectedRow) return;

  if(selectedRow.status === "ATTEND"){

    const confirmEdit = confirm(
      "Cancel attendance for this person?"
    );

    if(!confirmEdit) return;

    await updateAttendance("");
    return;
  }

  await updateAttendance("ATTEND");
}

async function updateAttendance(status){

  const attendBtn =
    document.getElementById("attendBtn");

  attendBtn.disabled = true;
  attendBtn.innerText = "Saving...";

  try{

    const res = await fetch(
      apiUrl(
        `action=updateAttend&row=${selectedRow.row}&status=${encodeURIComponent(status)}`
      )
    );

    const result = await res.json();

    if(result.status === "success"){

      selectedRow.status = status;

      const target =
        allAttendData.find(
          x => x.row === selectedRow.row
        );

      if(target){
        target.status = status;
      }

      closePopup();
      filterAttendData();

    }else{

      alert("Failed to update attendance.");

      attendBtn.disabled = false;

      if(selectedRow.status === "ATTEND"){

        attendBtn.innerText =
          "Cancel Attendance";

        attendBtn.classList.add(
          "cancel-btn"
        );

      }else{

        attendBtn.innerText =
          "Attend";

        attendBtn.classList.remove(
          "cancel-btn"
        );
      }
    }

  }catch(err){

    console.error(err);

    alert("Error update attendance.");

    attendBtn.disabled = false;

    if(selectedRow.status === "ATTEND"){

      attendBtn.innerText =
        "Cancel Attendance";

      attendBtn.classList.add(
        "cancel-btn"
      );

    }else{

      attendBtn.innerText =
        "Attend";

      attendBtn.classList.remove(
        "cancel-btn"
      );
    }
  }
}
