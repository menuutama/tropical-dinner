const API_URL = "https://script.google.com/macros/s/AKfycbzQkx9tCL1pfsFB8jWbfdSXLjQOChG9boIY9Ko_XwWVU1SyOSJP9UQvga96bjf6rRfD/exec";

let allData = [];
let selectedRow = null;

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const tableBody = document.getElementById("collectTableBody");

const popup = document.getElementById("collectPopup");
const closePopupBtn = document.getElementById("closePopupBtn");
const collectBtn = document.getElementById("collectBtn");

const popupLuckyNo = document.getElementById("popupLuckyNo");
const popupEmployee = document.getElementById("popupEmployee");
const popupCompany = document.getElementById("popupCompany");

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  setInterval(() => {
    loadData(false);
  }, 3000);
});

searchInput.addEventListener("input", function(){
  clearSearchBtn.style.display = this.value ? "block" : "none";
  renderTable();
});

clearSearchBtn.addEventListener("click", function(){
  searchInput.value = "";
  clearSearchBtn.style.display = "none";
  renderTable();
  searchInput.focus();
});

closePopupBtn.addEventListener("click", closePopup);

popup.addEventListener("click", function(e){
  if(e.target === popup){
    closePopup();
  }
});

collectBtn.addEventListener("click", collectPrize);

function loadData(showLoading = true){
  if(showLoading){
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Loading...</td>
      </tr>
    `;
  }

  fetch(`${API_URL}?action=getCollectionData&t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
      allData = data || [];
      renderTable();
    })
    .catch(err => {
      console.error(err);
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">Failed to load data</td>
        </tr>
      `;
    });
}

function renderTable(){
  const keyword = searchInput.value.toLowerCase().trim();

  let filtered = allData.filter(item => {
    const luckyNo = String(item.luckyNo || "").trim();

    if(luckyNo === "") return false;

    return (
      String(item.place).toLowerCase().includes(keyword) ||
      String(item.luckyNo).toLowerCase().includes(keyword) ||
      String(item.employeeName).toLowerCase().includes(keyword) ||
      String(item.companyName).toLowerCase().includes(keyword) ||
      String(item.prize).toLowerCase().includes(keyword)
    );
  });

  filtered.sort((a, b) => {
    return Number(a.place) - Number(b.place);
  });

  if(filtered.length === 0){
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">No data found</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(item => {
    const isCollected = String(item.status).toUpperCase() === "COLLECT";

    return `
      <tr 
        class="collect-row ${isCollected ? "collected-row-red" : ""}"
        onclick="openPopup(${item.row})"
      >
        <td>${escapeHTML(item.place)}</td>
        <td>${escapeHTML(item.luckyNo)}</td>
        <td>${escapeHTML(item.employeeName)}</td>
        <td>${escapeHTML(item.companyName)}</td>
        <td>${escapeHTML(item.prize)}</td>
      </tr>
    `;
  }).join("");
}

function openPopup(row){
  selectedRow = allData.find(item => Number(item.row) === Number(row));

  if(!selectedRow) return;

  popupLuckyNo.textContent = selectedRow.luckyNo;
  popupEmployee.textContent = selectedRow.employeeName;
  popupCompany.textContent = selectedRow.companyName;

  const isCollected = String(selectedRow.status).toUpperCase() === "COLLECT";

  if(isCollected){
    collectBtn.textContent = "Already Collect";
    collectBtn.disabled = true;
  }else{
    collectBtn.textContent = "Collect";
    collectBtn.disabled = false;
  }

  popup.classList.add("show");
}

function closePopup(){
  popup.classList.remove("show");
  selectedRow = null;
}

function collectPrize(){
  if(!selectedRow) return;

  collectBtn.disabled = true;
  collectBtn.textContent = "Saving...";

  fetch(`${API_URL}?action=collectPrize&row=${selectedRow.row}&t=${Date.now()}`)
    .then(res => res.json())
    .then(result => {
      if(result.status === "success"){
        selectedRow.status = "COLLECT";
        closePopup();
        loadData(false);
      }else{
        alert("Failed to save collection status.");
        collectBtn.disabled = false;
        collectBtn.textContent = "Collect";
      }
    })
    .catch(err => {
      console.error(err);
      alert("Connection error.");
      collectBtn.disabled = false;
      collectBtn.textContent = "Collect";
    });
}

function escapeHTML(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
