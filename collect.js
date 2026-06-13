/* =========================================================
   LUCKY DRAW PRIZE COLLECTION SYSTEM
   - Camera photo required before collect
   - Compress photo on phone/tablet 
   - Add watermark before upload
   - Upload photo to Google Drive through Code.gs
   - Save COLLECT status + photo link in Google Sheet
========================================================= */

const API_URL = window.TROPICAL_API_URL;

const PHOTO_MAX_WIDTH = 800;
const PHOTO_JPEG_QUALITY = 0.62;
const WATERMARK_TEXT = "LUCKY DRAW WINNER COLLECTION - TROPICAL DINNER 2026";

let allData = [];
let selectedRow = null;
let compressedPhotoBase64 = "";
let compressedPhotoMimeType = "image/jpeg";
let isSaving = false;

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

const winnerPhotoInput = document.getElementById("winnerPhotoInput");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const winnerPhotoPreview = document.getElementById("winnerPhotoPreview");
const photoStatus = document.getElementById("photoStatus");

document.addEventListener("DOMContentLoaded", function(){
  loadData(true);

  setInterval(function(){
    if(!popup.classList.contains("show") && !isSaving){
      loadData(false);
    }
  }, window.TROPICAL_COLLECT_REFRESH_MS || 10000);
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

takePhotoBtn.addEventListener("click", function(){
  if(isSaving) return;
  winnerPhotoInput.click();
});

winnerPhotoInput.addEventListener("change", handleWinnerPhotoChange);
collectBtn.addEventListener("click", collectPrize);

/* =========================
   LOAD DATA
========================= */

function loadData(showLoading){
  if(showLoading){
    tableBody.innerHTML = `
      <tr>
        <td colspan="4">Loading...</td>
      </tr>
    `;
  }

  fetch(API_URL + "?action=getWinners&time=" + Date.now(), {
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
        <td colspan="4">Failed to load data</td>
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
        <td colspan="4">No data found</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(function(item){
    const isCollected = String(item.status || "").toUpperCase() === "COLLECT";
    const hasPhoto = String(item.collectPhotoUrl || item.photoUrl || "").trim() !== "";
    const index = allData.indexOf(item);

    return `
      <tr
        class="collect-row ${isCollected ? "collected-row-red" : ""}"
        onclick="openPopup(${index})"
      >
        <td>${escapeHTML(item.place || "")}</td>
        <td>${escapeHTML(item.luckyNo || "")}</td>
        <td>${escapeHTML(item.winner || item.employeeName || "")}${hasPhoto ? '<div class="mini-photo-label">📷 Photo Saved</div>' : ''}</td>
        <td>${escapeHTML(item.company || item.companyName || "")}</td>
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

  resetPhotoState();

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
  const oldPhotoUrl = String(selectedRow.collectPhotoUrl || selectedRow.photoUrl || "").trim();

  if(isCollected){
    collectBtn.textContent = "Already Collect";
    collectBtn.disabled = true;
    takePhotoBtn.disabled = true;

    if(oldPhotoUrl){
      winnerPhotoPreview.src = getDriveImagePreviewUrl(oldPhotoUrl);
      winnerPhotoPreview.style.display = "block";
      photoStatus.textContent = "Photo already saved.";
    }else{
      photoStatus.textContent = "Already collected. No photo link found.";
    }
  }else{
    collectBtn.textContent = "Collect";
    collectBtn.disabled = true;
    takePhotoBtn.disabled = false;
    photoStatus.textContent = "Take winner photo before collect.";
  }

  popup.classList.add("show");
}

/* =========================
   CLOSE POPUP
========================= */

function closePopup(){
  if(isSaving) return;
  popup.classList.remove("show");
  selectedRow = null;
  popupImage.src = "";
  resetPhotoState();
}

function resetPhotoState(){
  compressedPhotoBase64 = "";
  compressedPhotoMimeType = "image/jpeg";
  winnerPhotoInput.value = "";
  winnerPhotoPreview.removeAttribute("src");
  winnerPhotoPreview.style.display = "none";
  photoStatus.textContent = "Take winner photo before collect.";
  collectBtn.disabled = true;
  collectBtn.textContent = "Collect";
  takePhotoBtn.disabled = false;
}

/* =========================
   PHOTO COMPRESS + WATERMARK
========================= */

function handleWinnerPhotoChange(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;

  if(!file.type || !file.type.startsWith("image/")){
    alert("Please choose image only.");
    resetPhotoState();
    return;
  }

  takePhotoBtn.disabled = true;
  collectBtn.disabled = true;
  photoStatus.textContent = "Processing photo...";

  compressAndWatermarkPhoto(file)
    .then(function(result){
      compressedPhotoBase64 = result.base64;
      compressedPhotoMimeType = result.mimeType;

      winnerPhotoPreview.src = result.dataUrl;
      winnerPhotoPreview.style.display = "block";

      photoStatus.textContent = "Photo ready. Press Collect to save.";
      takePhotoBtn.disabled = false;
      collectBtn.disabled = false;
    })
    .catch(function(err){
      console.error("PHOTO ERROR:", err);
      alert("Photo cannot be processed. Please take photo again.");
      resetPhotoState();
    });
}

function compressAndWatermarkPhoto(file){
  return new Promise(function(resolve, reject){
    const reader = new FileReader();

    reader.onload = function(){
      const img = new Image();

      img.onload = function(){
        let width = img.width;
        let height = img.height;

        if(width > PHOTO_MAX_WIDTH){
          height = Math.round(height * (PHOTO_MAX_WIDTH / width));
          width = PHOTO_MAX_WIDTH;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        addWatermark(ctx, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1];

        resolve({
          dataUrl: dataUrl,
          base64: base64,
          mimeType: "image/jpeg"
        });
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function addWatermark(ctx, width, height){
  const padding = Math.max(10, Math.round(width * 0.018));
  const barHeight = Math.max(44, Math.round(height * 0.09));
  const y = height - barHeight;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(0, y, width, barHeight);

  const mainFontSize = Math.max(12, Math.round(width * 0.026));
  const subFontSize = Math.max(10, Math.round(width * 0.020));

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 " + mainFontSize + "px Arial, sans-serif";
  ctx.fillText(WATERMARK_TEXT, width / 2, y + barHeight * 0.34, width - padding * 2);

  const details = buildWatermarkDetails();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "500 " + subFontSize + "px Arial, sans-serif";
  ctx.fillText(details, width / 2, y + barHeight * 0.70, width - padding * 2);

  ctx.restore();
}

function buildWatermarkDetails(){
  const place = selectedRow ? String(selectedRow.place || "").trim() : "";
  const luckyNo = selectedRow ? String(selectedRow.luckyNo || "").trim() : "";
  const now = new Date();
  const dateTime = now.toLocaleString("en-MY", {
    year:"numeric",
    month:"2-digit",
    day:"2-digit",
    hour:"2-digit",
    minute:"2-digit",
    hour12:false
  });

  return "Place: " + place + " | Lucky No: " + luckyNo + " | " + dateTime;
}

/* =========================
   COLLECT PRIZE
========================= */

function collectPrize(){
  if(!selectedRow || isSaving) return;

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

  isSaving = true;
  collectBtn.disabled = true;
  takePhotoBtn.disabled = true;
  collectBtn.textContent = "Saving...";
  photoStatus.textContent = "Uploading photo and saving collection...";

  const payload = {
    action: "collectPrizeWithPhoto",
    row: row,
    place: selectedRow.place || "",
    luckyNo: selectedRow.luckyNo || "",
    winner: selectedRow.winner || selectedRow.employeeName || "",
    company: selectedRow.company || selectedRow.companyName || "",
    prize: selectedRow.prize || "",
    photoBase64: compressedPhotoBase64,
    photoMimeType: compressedPhotoMimeType
  };

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store"
  })
  .then(function(res){
    return res.json();
  })
  .then(function(result){
    if(result && result.status === "success"){
      selectedRow.status = "COLLECT";
      selectedRow.collectPhotoUrl = result.photoUrl || "";
      if(selectedRow.collectPhotoUrl){
        winnerPhotoPreview.src = getDriveImagePreviewUrl(selectedRow.collectPhotoUrl);
        winnerPhotoPreview.style.display = "block";
      }

      photoStatus.textContent = "Saved successfully.";
      collectBtn.textContent = "Saved";

      setTimeout(function(){
        isSaving = false;
        closePopup();
        loadData(false);
      }, 650);
    }else{
      throw new Error((result && result.message) ? result.message : "Failed to save collection.");
    }
  })
  .catch(function(err){
    console.error("SAVE ERROR:", err);
    const msg = String(err && err.message ? err.message : "Connection error. Please try again.");
    if(msg.includes("DriveApp") || msg.includes("Required permissions") || msg.includes("permission")){
      alert("Google Drive permission belum settle. Run testDrivePermission() dalam Apps Script, tekan Allow, kemudian Deploy New Version.\n\nDetail: " + msg);
    }else{
      alert(msg);
    }

    isSaving = false;
    collectBtn.disabled = false;
    takePhotoBtn.disabled = false;
    collectBtn.textContent = "Collect";
    photoStatus.textContent = "Photo ready. Please try collect again.";
  });
}


/* =========================
   GOOGLE DRIVE IMAGE PREVIEW FIX
   Convert normal Drive link to image link that works in <img>.
========================= */

function getDriveImagePreviewUrl(url){
  const raw = String(url || "").trim();
  if(!raw) return "";

  if(raw.includes("drive.google.com/thumbnail")){
    return raw;
  }

  let fileId = "";

  let match = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if(match && match[1]){
    fileId = match[1];
  }

  if(!fileId){
    match = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if(match && match[1]){
      fileId = match[1];
    }
  }

  if(fileId){
    return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
  }

  return raw;
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
 
