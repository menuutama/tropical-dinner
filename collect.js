const API_URL = "https://script.google.com/macros/s/AKfycbwG5oVRt21Eu0xVENkj_OGfr27bfhRSZAP4Pkx-UufnA7G7TbWq0VlJgWquWm2QeXOn/exec";

let allData = [];
let selectedRow = null;
let compressedPhotoBase64 = "";
let compressedPhotoFileName = "";
let compressedPhotoDataUrl = "";

const PHOTO_MAX_WIDTH = 800;
const PHOTO_JPEG_QUALITY = 0.62;
const WATERMARK_TEXT = "LUCKY DRAW WINNER COLLECTION - TROPICAL DINNER 2026";

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

const collectionPhotoInput = document.getElementById("collectionPhotoInput");
const collectionPhotoPreview = document.getElementById("collectionPhotoPreview");
const photoStatusText = document.getElementById("photoStatusText");
const photoUploadLabel = document.getElementById("photoUploadLabel");

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

collectionPhotoInput.addEventListener("change", handleCollectionPhoto);

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

  resetPhotoCapture();

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
  const existingPhoto = String(selectedRow.collectPhotoUrl || selectedRow.photoUrl || "").trim();

  if(isCollected){
    collectBtn.textContent = "Already Collect";
    collectBtn.disabled = true;
    collectionPhotoInput.disabled = true;
    photoUploadLabel.classList.add("disabled");

    if(existingPhoto){
      collectionPhotoPreview.src = existingPhoto;
      collectionPhotoPreview.style.display = "block";
      photoStatusText.textContent = "Photo already saved.";
    }else{
      photoStatusText.textContent = "Already collect. No photo link found.";
    }
  }else{
    collectBtn.textContent = "Collect";
    collectBtn.disabled = true;
    collectionPhotoInput.disabled = false;
    photoUploadLabel.classList.remove("disabled");
    photoStatusText.textContent = "Please take photo before collect.";
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
  resetPhotoCapture();

}

/* =========================
   PHOTO COMPRESS + WATERMARK
========================= */

function handleCollectionPhoto(){

  const file = collectionPhotoInput.files && collectionPhotoInput.files[0];

  if(!file || !selectedRow){
    resetPhotoCapture();
    return;
  }

  if(!file.type || !file.type.startsWith("image/")){
    alert("Please select image file only.");
    resetPhotoCapture();
    return;
  }

  collectBtn.disabled = true;
  photoStatusText.textContent = "Processing photo...";

  compressAndWatermarkPhoto(file, selectedRow)
    .then(function(result){

      compressedPhotoBase64 = result.base64;
      compressedPhotoDataUrl = result.dataUrl;
      compressedPhotoFileName = result.fileName;

      collectionPhotoPreview.src = compressedPhotoDataUrl;
      collectionPhotoPreview.style.display = "block";

      photoStatusText.textContent = "Photo ready. Size: " + formatBytes(result.sizeBytes);
      collectBtn.disabled = false;

    })
    .catch(function(err){

      console.error("PHOTO ERROR:", err);
      alert("Photo processing failed. Please retake photo.");
      resetPhotoCapture();

    });

}

function compressAndWatermarkPhoto(file, rowData){

  return new Promise(function(resolve, reject){

    const reader = new FileReader();

    reader.onload = function(e){

      const img = new Image();

      img.onload = function(){

        try{
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          const scale = Math.min(1, PHOTO_MAX_WIDTH / originalWidth);
          const canvasWidth = Math.round(originalWidth * scale);
          const canvasHeight = Math.round(originalHeight * scale);

          const canvas = document.createElement("canvas");
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

          drawWatermark(ctx, canvasWidth, canvasHeight, rowData);

          const dataUrl = canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY);
          const base64 = dataUrl.split(",")[1] || "";
          const sizeBytes = Math.round((base64.length * 3) / 4);

          resolve({
            dataUrl:dataUrl,
            base64:base64,
            sizeBytes:sizeBytes,
            fileName:buildPhotoFileName(rowData)
          });
        }catch(err){
          reject(err);
        }

      };

      img.onerror = reject;
      img.src = e.target.result;

    };

    reader.onerror = reject;
    reader.readAsDataURL(file);

  });

}

function drawWatermark(ctx, width, height, rowData){

  const place = String(rowData.place || "").trim();
  const luckyNo = String(rowData.luckyNo || "").trim();
  const nowText = formatDateTime(new Date());
  const detailText = "Place: " + place + " | Lucky No: " + luckyNo + " | " + nowText;

  const boxHeight = Math.max(78, Math.round(height * 0.16));
  const y = height - boxHeight;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, y, width, boxHeight);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const mainFontSize = Math.max(18, Math.round(width * 0.033));
  const detailFontSize = Math.max(14, Math.round(width * 0.024));

  ctx.font = "700 " + mainFontSize + "px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 5;
  ctx.fillText(WATERMARK_TEXT, width / 2, y + boxHeight * 0.36, width - 24);

  ctx.font = "600 " + detailFontSize + "px Arial, sans-serif";
  ctx.fillStyle = "#8bc4ff";
  ctx.fillText(detailText, width / 2, y + boxHeight * 0.70, width - 24);

  ctx.restore();

}

function resetPhotoCapture(){

  compressedPhotoBase64 = "";
  compressedPhotoDataUrl = "";
  compressedPhotoFileName = "";

  if(collectionPhotoInput){
    collectionPhotoInput.value = "";
    collectionPhotoInput.disabled = false;
  }

  if(collectionPhotoPreview){
    collectionPhotoPreview.src = "";
    collectionPhotoPreview.style.display = "none";
  }

  if(photoStatusText){
    photoStatusText.textContent = "Please take photo before collect.";
  }

  if(photoUploadLabel){
    photoUploadLabel.classList.remove("disabled");
  }

}

/* =========================
   COLLECT PRIZE
========================= */

function collectPrize(){

  if(!selectedRow) return;

  const row = selectedRow.row;

  if(!row){
    alert("Row data not found.");
    collectBtn.disabled = false;
    collectBtn.textContent = "Collect";
    return;
  }

  if(!compressedPhotoBase64){
    alert("Please take winner photo first.");
    return;
  }

  collectBtn.disabled = true;
  collectionPhotoInput.disabled = true;
  photoUploadLabel.classList.add("disabled");
  collectBtn.textContent = "Uploading...";
  photoStatusText.textContent = "Uploading photo and saving collection...";

  const payload = new URLSearchParams();
  payload.append("action", "collectPrizeWithPhoto");
  payload.append("row", row);
  payload.append("photoBase64", compressedPhotoBase64);
  payload.append("fileName", compressedPhotoFileName);
  payload.append("mimeType", "image/jpeg");

  fetch(API_URL, {
    method:"POST",
    body:payload,
    cache:"no-store"
  })
  .then(function(res){
    return res.json();
  })
  .then(function(result){

    if(result.status === "success"){

      selectedRow.status = "COLLECT";
      selectedRow.collectPhotoUrl = result.photoUrl || "";

      closePopup();
      loadData(false);
      alert("Prize collection saved with photo.");

    }else{

      alert(result.message || "Failed to save collection status.");
      collectBtn.disabled = false;
      collectionPhotoInput.disabled = false;
      photoUploadLabel.classList.remove("disabled");
      collectBtn.textContent = "Collect";
      photoStatusText.textContent = "Photo ready. Please try collect again.";

    }

  })
  .catch(function(err){

    console.error("SAVE ERROR:", err);

    alert("Connection error. Please try again.");
    collectBtn.disabled = false;
    collectionPhotoInput.disabled = false;
    photoUploadLabel.classList.remove("disabled");
    collectBtn.textContent = "Collect";
    photoStatusText.textContent = "Photo ready. Please try collect again.";

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
   HELPERS
========================= */

function buildPhotoFileName(rowData){

  const place = cleanFileText(rowData.place || "PLACE");
  const luckyNo = cleanFileText(rowData.luckyNo || "LUCKYNO");
  const winner = cleanFileText(rowData.winner || rowData.employeeName || "WINNER");
  const stamp = formatFileDate(new Date());

  return place + "_" + luckyNo + "_" + winner + "_" + stamp + ".jpg";

}

function cleanFileText(value){

  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 45) || "DATA";

}

function formatFileDate(date){

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return y + m + d + "_" + hh + mm + ss;

}

function formatDateTime(date){

  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  return d + "/" + m + "/" + y + " " + hh + ":" + mm;

}

function formatBytes(bytes){

  if(bytes < 1024){
    return bytes + " B";
  }

  if(bytes < 1024 * 1024){
    return Math.round(bytes / 1024) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(2) + " MB";

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
