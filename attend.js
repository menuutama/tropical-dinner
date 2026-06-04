const API_URL = "https://script.google.com/macros/s/AKfycbxx-J1KEgWzamkAPamCqIw7pMCntgLaY3zMnf4MC1Y-hsKeUEG0w9K6prAWGu0tiJM/exec";

let allAttendData = [];
let selectedRow = null;

/* =========================
   LOAD DATA
========================= */

document.addEventListener("DOMContentLoaded", () => {
  getAttendData();
});

async function getAttendData(){
  try{
    const res = await fetch(`${API_URL}?action=getAttendData&time=${Date.now()}`);
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

    tr.innerHTML = `
      <td>${item.luckyNo || ""}</td>
      <td>${item.employeeName || ""}</td>
      <td>${item.companyName || ""}</td>
      <td>${item.status || ""}</td>
    `;

    tr.onclick = () => openPopup(item);

    if(item.status === "ATTEND"){
      tr.classList.add("attended-row");
    }

    tbody.appendChild(tr);
  });
}

/* =========================
   SEARCH
========================= */

function searchAttendData(){
  const keyword = document.getElementById("searchInput").value.toLowerCase().trim();

  const filtered = allAttendData.filter(item => {
    return (
      String(item.luckyNo).toLowerCase().includes(keyword) ||
      String(item.employeeName).toLowerCase().includes(keyword) ||
      String(item.companyName).toLowerCase().includes(keyword)
    );
  });

  displayAttendData(filtered);

  document.getElementById("clearSearch").style.display = keyword ? "block" : "none";
}

function clearSearch(){
  document.getElementById("searchInput").value = "";
  document.getElementById("clearSearch").style.display = "none";
  displayAttendData(allAttendData);
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
    attendBtn.innerText = "Already Attend";
    attendBtn.disabled = true;
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
   MARK ATTEND
========================= */

async function markAttend(){
  if(!selectedRow) return;

  const attendBtn = document.getElementById("attendBtn");
  attendBtn.disabled = true;
  attendBtn.innerText = "Saving...";

  try{
    const res = await fetch(
      `${API_URL}?action=markAttend&row=${selectedRow.row}`
    );

    const result = await res.json();

    if(result.status === "success"){
      selectedRow.status = "ATTEND";

      const target = allAttendData.find(x => x.row === selectedRow.row);
      if(target){
        target.status = "ATTEND";
      }

      attendBtn.innerText = "Already Attend";

      displayAttendData(allAttendData);

      setTimeout(() => {
        closePopup();
      }, 500);

    }else{
      alert("Failed to update attendance.");
      attendBtn.disabled = false;
      attendBtn.innerText = "Attend";
    }

  }catch(err){
    console.error(err);
    alert("Error update attendance.");
    attendBtn.disabled = false;
    attendBtn.innerText = "Attend";
  }
}
