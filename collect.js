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

document.addEventListener("DOMContentLoaded", function(){

  loadData(true);

  setInterval(function(){
    loadData(false);
  }, 3000);

});

searchInput.addEventListener("input", function(){

  clearSearchBtn.style.display = searchInput.value.trim() ? "block" : "none";
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

/* =========================
   LOAD DATA
========================= */

function loadData(showLoading){

  if(showLoading){
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Loading...</td>
      </tr>
    `;
  }

  fetch(API_URL + "?time=" + Date.now(), {
    cache:"no-store"
  })
  .then(function(res){
    return res.json();
  })
  .then(function(data){

    allData = (data || [])
      .filter(function(item){
        return String(item.luckyNo || "").trim() !== "";
      })
      .sort(function(a, b){
        return getPlaceNumber(a.place) - getPlaceNumber(b.place);
      });

    renderTable();

  })
  .catch(function(err){

    console.error("FETCH ERROR:", err);

    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Failed to load data</td>
      </tr>
    `;

  });

}

/* =========================
   RENDER TABLE
========================= */

function renderTable(){

  const keyword = searchInput.value.trim().toLowerCase();

  let filtered = allData.filter(function(item){

    return (
      String(item.place || "").toLowerCase().includes(keyword) ||
      String(item.luckyNo || "").toLowerCase().includes(keyword) ||
      String(item.winner || item.employeeName || "").toLowerCase().includes(keyword) ||
      String(item.company || item.companyName || "").toLowerCase().includes(keyword) ||
      String(item.prize || "").toLowerCase().includes(keyword)
    );

  });

  filtered.sort(function(a, b){
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

  tableBody.innerHTML = filtered.map(function(item){

    const isCollected = String(item.status || "").toUpperCase() === "COLLECT";

    const index = allData.indexOf(item);

    return `
      <tr
        class="collect-row ${isCollected ? "collected-row-red" : ""}"
        onclick="openPopup(${index})"
      >
        <td>${escapeHTML(item.place || "")}</td>
        <td>${escapeHTML(item.luckyNo || "")}</td>
        <td>${escapeHTML(item.winner || item.employeeName || "")}</td>
        <td>${escapeHTML(item.company || item.companyName || "")}</td>
        <td>${escapeHTML(item.prize || "")}</td>
      </tr>
    `;

  }).join("");

}

/* =========================
   OPEN POPUP
========================= */

function openPopup(index){

  selectedRow = allData[index];

  if(!selectedRow) return;

  popupPlace.textContent = selectedRow.place || "";
  popupEmployee.textContent = selectedRow.winner || selectedRow.employeeName || "";
  popupLuckyNo.textContent = selectedRow.luckyNo || "";
  popupCompany.textContent = selectedRow.company || selectedRow.companyName || "";
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

/* =========================
   CLOSE POPUP
========================= */

function closePopup(){

  popup.classList.remove("show");
  selectedRow = null;

  popupImage.src = "";

}

/* =========================
   COLLECT PRIZE
========================= */

function collectPrize(){

  if(!selectedRow) return;

  collectBtn.disabled = true;
  collectBtn.textContent = "Saving...";

  const row = selectedRow.row;

  if(!row){
    alert("Row data not found.");
    collectBtn.disabled = false;
    collectBtn.textContent = "Collect";
    return;
  }

  fetch(API_URL + "?action=collectPrize&row=" + encodeURIComponent(row) + "&time=" + Date.now(), {
    cache:"no-store"
  })
  .then(function(res){
    return res.json();
  })
  .then(function(result){

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
  .catch(function(err){

    console.error("SAVE ERROR:", err);

    alert("Connection error.");

    collectBtn.disabled = false;
    collectBtn.textContent = "Collect";

  });

}

/* =========================
   SORT PLACE
   1st, 2nd, 3rd, 10th
========================= */

function getPlaceNumber(place){

  const match = String(place || "").match(/\d+/);

  return match ? Number(match[0]) : 999999;

}

/* =========================
   SAFE HTML
========================= */

function escapeHTML(value){

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}
