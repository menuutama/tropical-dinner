const API_URL = "https://script.google.com/macros/s/AKfycbxVV1y2G7WHYMUMDJEexju4p_lO-Kfblx5he4RLw54RQ9Mlq17YGEK2wv0Y6yWGrXTL/exec";

let allData = [];
let selectedRow = null;

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const tableBody = document.getElementById("collectTableBody");

const popup = document.getElementById("collectPopup");
const closePopupBtn = document.getElementById("closePopupBtn");
const collectBtn = document.getElementById("collectBtn");

const popupPlace = document.getElementById("popupPlace");
const popupLuckyNo = document.getElementById("popupLuckyNo");
const popupEmployee = document.getElementById("popupEmployee");
const popupCompany = document.getElementById("popupCompany");
const popupPrize = document.getElementById("popupPrize");
const popupImage = document.getElementById("popupImage");

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

document.addEventListener("keydown", function(e){
  if(e.key === "Escape"){
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

  fetch(`${API_URL}?action=getCollectionData&t=${Date.now()}`, {
    cache: "no-store"
  })
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
      String(item.place || "").toLowerCase().includes(keyword) ||
      String(item.luckyNo || "").toLowerCase().includes(keyword) ||
      String(item.employeeName || item.winner || "").toLowerCase().includes(keyword) ||
      String(item.companyName || item.company || "").toLowerCase().includes(keyword) ||
      String(item.prize || "").toLowerCase().includes(keyword)
    );
  });

  filtered.sort((a, b) => {
    return getPlaceNumber(a.place) - getPlaceNumber(b.place);
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
    const isCollected = String(item.status || "").toUpperCase() === "COLLECT";

    return `
      <tr 
        class="collect-row ${isCollected ? "collected-row-red" : ""}"
        onclick="openPopup(${Number(item.row || 0)})"
      >
        <td>${escapeHTML(item.place || "")}</td>
        <td>${escapeHTML(item.luckyNo || "")}</td>
        <td>${escapeHTML(item.employeeName || item.winner || "")}</td>
        <td>${escapeHTML(item.companyName || item.company || "")}</td>
        <td>${escapeHTML(item.prize || "")}</td>
      </tr>
    `;
  }).join("");
}

function getPlaceNumber(place){
  const match = String(place || "").match(/\d+/);
  return match ? Number(match[0]) : 999999;
}

function openPopup(row){
  selectedRow = allData.find(item => Number(item.row) === Number(row));

  if(!selectedRow) return;

  popupPlace.textContent = selectedRow.place || "";
  popupLuckyNo.textContent = selectedRow.luckyNo || "";
  popupEmployee.textContent = selectedRow.employeeName || selectedRow.winner || "";
  popupCompany.textContent = selectedRow.companyName || selectedRow.company || "";
  popupPrize.textContent = selectedRow.prize || "";

  const imageUrl = String(selectedRow.imageUrl || selectedRow.image || "").trim();

  if(imageUrl !== ""){
    popupImage.src = imageUrl;
    popupImage.style.display = "block";
  }else{
    popupImage.src = "";
    popupImage.style.display = "none";
  }

  const isCollected = String(selectedRow.status || "").toUpperCase() === "COLLECT";

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

  if(popupImage){
    popupImage.src = "";
  }
}

function collectPrize(){
  if(!selectedRow) return;

  collectBtn.disabled = true;
  collectBtn.textContent = "Saving...";

  fetch(`${API_URL}?action=collectPrize&row=${selectedRow.row}&t=${Date.now()}`, {
    cache: "no-store"
  })
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
