const API_URL = "https://script.google.com/macros/s/AKfycbxQsB2UjnTrEio-c2LRG8VdwLVIIAydz-C4XqrVWxeC_Fe_qit5uhkvRbBTxiisRdwD/exec";

let allAttendData = [];
let selectedRow = null;

/* =========================
   API URL HELPER
========================= */

function apiUrl(params){
  const joiner = API_URL.includes("?") ? "&" : "?";
  return `${API_URL}${joiner}${params}`;
}

/* =========================
   LOAD DATA
========================= */

document.addEventListener("DOMContentLoaded", () => {
  getAttendData();
});

async function getAttendData(){
  try{
    const res = await fetch(apiUrl(`action=getAttendData&time=${Date.now()}`));
    const data = await res.json();

    allAttendData = data;
    displayAttendData(allAttendData);

  }catch(err){
    console.error(err);

    document.getElementById("attendTableBody").innerHTML = `
      <tr>
        <td colspan="4">Failed to load data</td>
      </tr>
    `;
  }
}

/* =========================
   DISPLAY TABLE
========================= */

function displayAttendData(data){
  const tbody = document.getElementById("attendTableBody");
  tbody.innerHTML = "";

  if(!data || data.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="4">No data found</td>
      </tr>
    `;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement("tr");

    tr.classList.add("attend-row");

    if(item.status === "ATTEND"){
      tr.classList.add("attended-row");
    }

    tr.innerHTML = `
      <td>${item.luckyNo || ""}</td>
      <td>${item.employeeName || ""}</td>
      <td>${item.companyName || ""}</td>
      <td class="${item.status === "ATTEND" ? "status-attend" : ""}">
        ${item.status || ""}
      </td>
    `;

    tr.onclick = () => openPopup(item);

    tbody.appendChild(tr);
  });
}

/* =========================
   SEARCH
========================= */

function searchAttendData(){
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearchBtn");

  const keyword = input.value.toLowerCase().trim();

  clearBtn.style.display = keyword ? "block" : "none";

  const filtered = allAttendData.filter(item => {
    return (
      String(item.luckyNo || "").toLowerCase().includes(keyword) ||
      String(item.employeeName || "").toLowerCase().includes(keyword) ||
      String(item.companyName || "").toLowerCase().includes(keyword)
    );
  });

  displayAttendData(filtered);
}

function clearSearch(){
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearchBtn");

  input.value = "";
  clearBtn.style.display = "none";

  displayAttendData(allAttendData);
  input.focus();
}

/* =========================
   POPUP
========================= */

function openPopup(item){
  selectedRow = item;

  document.getElementById("popupLuckyNo").innerText = item.luckyNo || "";
  document.getElementById("popupEmployee").innerText = item.employeeName || "";
  document.getElementById("popupCompany").innerText = item.companyName || "";

  const attendBtn = document.getElementById("attendBtn");

  if(item.status === "ATTEND"){
    attendBtn.innerText = "Edit Attendance";
    attendBtn.disabled = false;
  }else{
    attendBtn.innerText = "Attend";
    attendBtn.disabled = false;
  }

  document.getElementById("attendPopup").classList.add("show");
}

function closePopup(){
  document.getElementById("attendPopup").classList.remove("show");
  selectedRow = null;
}

/* =========================
   ATTEND / EDIT ATTEND
========================= */

async function markAttend(){
  if(!selectedRow) return;

  if(selectedRow.status === "ATTEND"){
    const pass = prompt("Enter password to edit attendance:");

    if(pass !== "abc123" && pass !== "ABC123"){
      alert("Wrong password.");
      return;
    }

    const confirmEdit = confirm("Remove ATTEND status for this person?");
    if(!confirmEdit) return;

    await updateAttendance("");
    return;
  }

  await updateAttendance("ATTEND");
}

async function updateAttendance(status){
  const attendBtn = document.getElementById("attendBtn");

  attendBtn.disabled = true;
  attendBtn.innerText = "Saving...";

  try{
    const res = await fetch(apiUrl(
      `action=updateAttend&row=${selectedRow.row}&status=${encodeURIComponent(status)}`
    ));

    const result = await res.json();

    if(result.status === "success"){
      selectedRow.status = status;

      const target = allAttendData.find(x => x.row === selectedRow.row);
      if(target){
        target.status = status;
      }

      displayAttendData(allAttendData);
      closePopup();

    }else{
      alert("Failed to update attendance.");
      attendBtn.disabled = false;
      attendBtn.innerText = selectedRow.status === "ATTEND" ? "Edit Attendance" : "Attend";
    }

  }catch(err){
    console.error(err);
    alert("Error update attendance.");
    attendBtn.disabled = false;
    attendBtn.innerText = selectedRow.status === "ATTEND" ? "Edit Attendance" : "Attend";
  }
}
