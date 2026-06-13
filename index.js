/* =====================================================
   TROPICAL DINNER 2026 - WINNER DISPLAY UPGRADE
   Guest/User mode  : read winner.json from GitHub Pages
   Admin mode       : use GAS API for publish / clear / full data
   Interface        : same as previous version  
===================================================== */

const API_URL = window.TROPICAL_API_URL;
const PUBLIC_JSON_URL = window.TROPICAL_WINNER_JSON_URL; 

const ROWS_PER_PAGE = 10;
const PUBLISH_WORD = "PUBLISH";
const GUEST_REFRESH_MS = window.TROPICAL_GUEST_REFRESH_MS || 10000;   // User biasa: 10 saat, ringan untuk 200 guest
const ADMIN_REFRESH_MS = 3000;    // Admin mode: lebih cepat sikit untuk semak publish

let allData = [];
let visibleData = [];
let slideInterval = null;
let refreshInterval = null;
let currentPage = 1;
let lastDataHash = "";
let isAdminMode = false;

/* ========================= 
   INIT
========================= */ 

document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupModal();
  setupAdminPublishButtons();
  requestAdminStatusFromParent();
  loadData(true);
  startAutoRefresh();
});

window.addEventListener("message", (event) => {
  const data = event.data || {};

  if(data.type === "TROPICAL_ADMIN_STATUS" && data.isAdmin === true){
    enableAdminMode();
  }
});

function requestAdminStatusFromParent(){
  try{
    if(window.parent && window.parent !== window){
      window.parent.postMessage({
        type:"TROPICAL_WINNER_PAGE_READY"
      }, "*");
    }
  }catch(err){
    console.log(err);
  }
}

function enableAdminMode(){
  if(isAdminMode) return;

  isAdminMode = true;

  const panel = document.getElementById("publishPanel");
  if(panel){
    panel.style.display = "block";
  }

  // Admin perlu nampak semua row, jadi admin baca terus dari GAS.
  loadData(true);
  startAutoRefresh();
}

function startAutoRefresh(){
  if(refreshInterval){
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(() => {
    loadData(false);
  }, isAdminMode ? ADMIN_REFRESH_MS : GUEST_REFRESH_MS);
}

/* =========================
   SEARCH / MODAL SETUP
========================= */

function setupSearch(){
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");

  if(input){
    input.addEventListener("input", () => {
      if(clearBtn){
        clearBtn.style.display = input.value.trim() ? "block" : "none";
      }

      performSearch();
    });
  }

  if(clearBtn && input){
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.style.display = "none";
      performSearch();
      input.focus();
    });
  }
}

function setupModal(){
  const modal = document.getElementById("winnerModal");

  if(modal){
    modal.addEventListener("click", function(e){
      if(e.target === modal){
        closeWinnerModal();
      }
    });
  }

  document.addEventListener("keydown", function(e){
    if(e.key === "Escape"){
      closeWinnerModal();
    }
  });
}

/* =========================
   ADMIN PUBLISH
========================= */

function setupAdminPublishButtons(){
  const publishBtn = document.getElementById("publishBtn");
  const clearPublishBtn = document.getElementById("clearPublishBtn");

  publishBtn?.addEventListener("click", publishWinnerRange);
  clearPublishBtn?.addEventListener("click", clearAllPublish);
}

async function publishWinnerRange(){
  if(!isAdminMode){
    return;
  }

  const fromInput = document.getElementById("publishFrom");
  const toInput = document.getElementById("publishTo");

  const from = Number(fromInput?.value || 0);
  const to = Number(toInput?.value || 0);

  if(!from || !to){
    setPublishNote("Please enter range. Example: 90 to 70.", true);
    return;
  }

  setPublishNote("Publishing winner list and updating winner.json...", false);

  try{
    const url = `${API_URL}?action=publishRange&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&time=${Date.now()}`;
    const response = await fetch(url, { cache:"no-store" });
    const result = await response.json();

    if(result.success){
      setPublishNote(`Done. ${result.publishedCount || 0} winner(s) published. winner.json updated for guest display.`, false);
      await loadData(true);
    }else{
      setPublishNote(result.message || "Publish failed.", true);
    }
  }catch(err){
    console.error(err);
    setPublishNote("Publish failed. Check Apps Script deployment, GitHub token or permission.", true);
  }
}

async function clearAllPublish(){
  if(!isAdminMode){
    return;
  }

  const confirmClear = confirm("Clear semua word PUBLISH dekat column H2:H?");
  if(!confirmClear){
    return;
  }

  setPublishNote("Clearing publish status and updating winner.json...", false);

  try{
    const response = await fetch(`${API_URL}?action=clearPublish&time=${Date.now()}`, {
      cache:"no-store"
    });

    const result = await response.json();

    if(result.success){
      setPublishNote("Done. Semua PUBLISH dipadam dan winner.json dikosongkan untuk guest display.", false);
      await loadData(true);
    }else{
      setPublishNote(result.message || "Clear failed.", true);
    }
  }catch(err){
    console.error(err);
    setPublishNote("Clear failed. Check Apps Script deployment, GitHub token or permission.", true);
  }
}

function setPublishNote(message, isError){
  const note = document.getElementById("publishNote");
  if(!note) return;

  note.textContent = message;
  note.classList.toggle("error", !!isError);
}

/* =========================
   SAFE HTML
========================= */

function escapeHTML(text){
  if(text == null) return "";

  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
   LOAD DATA
========================= */

async function loadData(forceRender = false){
  try{
    const rawData = isAdminMode
      ? await fetchAdminWinners()
      : await fetchGuestWinnerJson();

    const sortedData = normalizeWinnerData(rawData)
      .filter(item => (item.luckyNo || "").toString().trim() !== "")
      .sort((a, b) => extractPlaceNumber(a.place) - extractPlaceNumber(b.place));

    const newHash = JSON.stringify(sortedData) + "|admin:" + isAdminMode;

    if(newHash === lastDataHash && !forceRender){
      return;
    }

    lastDataHash = newHash;
    allData = sortedData;

    applyVisibilityRule();
    renderAfterDataChange();

  }catch(err){
    console.error("FETCH ERROR:", err);

    if(!isAdminMode){
      showLoadError("Winner list is not available yet. Please refresh again.");
    }
  }
}

async function fetchGuestWinnerJson(){
  // Guest baca fail statik dari GitHub Pages. Timestamp kecil bantu elak browser simpan data lama.
  const response = await fetch(`${PUBLIC_JSON_URL}?v=${Date.now()}`, {
    cache:"no-store"
  });

  if(!response.ok){
    throw new Error("Cannot load winner.json");
  }

  return await response.json();
}

async function fetchAdminWinners(){
  const response = await fetch(API_URL + "?action=getWinners&time=" + Date.now(), {
    cache:"no-store"
  });

  if(!response.ok){
    throw new Error("Cannot load admin winner data");
  }

  return await response.json();
}

function normalizeWinnerData(data){
  if(!Array.isArray(data)) return [];

  return data.map(item => ({
    place: item.place || item.Place || "",
    luckyNo: item.luckyNo || item.luckyNumber || item["Lucky No"] || "",
    winner: item.winner || item.employeeName || item["Employee Name"] || "",
    company: item.company || item["Company"] || "",
    prize: item.prize || item["Prize"] || "",
    collection: item.collection || item["Collection"] || "",
    imageUrl: item.imageUrl || item.picturePrize || item["Picture Prize"] || "",
    rangeOutput: item.rangeOutput || item.publish || item["Publish"] || ""
  }));
}

function showLoadError(message){
  const tbody = document.getElementById("winnerTable");
  if(!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="no-data">
        ${escapeHTML(message)}
      </td>
    </tr>
  `;
}

function applyVisibilityRule(){
  if(isAdminMode){
    visibleData = allData;
    return;
  }

  // Guest winner.json memang hanya published data, tapi filter ni dikekalkan untuk keselamatan.
  visibleData = allData.filter(item => {
    return (item.rangeOutput || "").toString().trim().toUpperCase() === PUBLISH_WORD;
  });
}

function renderAfterDataChange(){
  currentPage = Math.min(
    currentPage,
    Math.ceil(visibleData.length / ROWS_PER_PAGE) || 1
  );

  const input = document.getElementById("searchInput");

  if(input && input.value.trim() !== ""){
    performSearch();
  }else{
    renderPage();
    renderPagination();
  }
}

function extractPlaceNumber(place){
  const match = (place || "").toString().match(/\d+/);
  return match ? Number(match[0]) : 999999;
}

/* =========================
   SEARCH FUNCTION
========================= */

function performSearch(){
  const input = document.getElementById("searchInput");
  if(!input) return;

  const keyword = input.value.trim().toLowerCase();

  if(keyword === ""){
    renderPage();
    renderPagination();
    return;
  }

  const filtered = visibleData.filter(item => {
    const luckyNo = (item.luckyNo || "").toString().toLowerCase();
    const winner = (item.winner || "").toString().toLowerCase();
    const company = (item.company || "").toString().toLowerCase();
    const place = (item.place || "").toString().toLowerCase();

    return (
      place.includes(keyword) ||
      luckyNo.includes(keyword) ||
      winner.includes(keyword) ||
      company.includes(keyword)
    );
  });

  renderTable(filtered);

  const pagination = document.getElementById("pagination");
  if(pagination){
    pagination.innerHTML = "";
  }
}

/* =========================
   RENDER PAGE
========================= */

function renderPage(){
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageData = visibleData.slice(start, start + ROWS_PER_PAGE);
  renderTable(pageData);
}

/* =========================
   RENDER TABLE
========================= */

function renderTable(data){
  const tbody = document.getElementById("winnerTable");
  if(!tbody) return;

  if(!data || data.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="no-data">
          Winner not published yet
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const index = allData.indexOf(item);

    return `
      <tr onclick="openWinnerModal(${index})">
        <td>
          <div class="place-badge">
            ${escapeHTML(item.place)}
          </div>
        </td>

        <td>${escapeHTML(item.luckyNo)}</td>

        <td class="winner-name">
          ${escapeHTML(item.winner)}
        </td>

        <td>${escapeHTML(item.company)}</td>
      </tr>
    `;
  }).join("");
}

/* =========================
   PAGINATION
========================= */

function renderPagination(){
  const pagination = document.getElementById("pagination");
  if(!pagination) return;

  const totalPages = Math.ceil(visibleData.length / ROWS_PER_PAGE);

  if(totalPages <= 1){
    pagination.innerHTML = "";
    return;
  }

  let html = "";

  html += `
    <button onclick="firstPage()" ${currentPage === 1 ? "disabled" : ""}>
      First Page
    </button>
  `;

  let startPage = Math.max(currentPage - 1, 1);
  let endPage = Math.min(startPage + 2, totalPages);

  if(endPage - startPage < 2 && startPage > 1){
    startPage = Math.max(endPage - 2, 1);
  }

  for(let i = startPage; i <= endPage; i++){
    html += `
      <button class="${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button onclick="lastPage()" ${currentPage === totalPages ? "disabled" : ""}>
      Last Page
    </button>
  `;

  pagination.innerHTML = html;
}

function goToPage(page){
  currentPage = page;
  renderPage();
  renderPagination();
}

function firstPage(){
  currentPage = 1;
  renderPage();
  renderPagination();
}

function lastPage(){
  currentPage = Math.ceil(visibleData.length / ROWS_PER_PAGE) || 1;
  renderPage();
  renderPagination();
}

/* =========================
   WINNER MODAL POPUP
========================= */

function openWinnerModal(index){
  const item = allData[index];
  if(!item) return;

  document.getElementById("modalPlace").textContent = item.place || "";
  document.getElementById("modalWinner").textContent = item.winner || "";
  document.getElementById("modalLuckyNo").textContent = "Lucky No : " + (item.luckyNo || "");
  document.getElementById("modalCompany").textContent = "Company : " + (item.company || "");
  document.getElementById("modalPrize").textContent = item.prize || "";

  const modalImage = document.getElementById("modalImage");

  if(modalImage){
    if(item.imageUrl && item.imageUrl.toString().trim() !== ""){
      modalImage.src = item.imageUrl;
      modalImage.style.display = "block";
    }else{
      modalImage.src = "";
      modalImage.style.display = "none";
    }
  }

  const modal = document.getElementById("winnerModal");
  if(modal){
    modal.classList.add("show");
  }
}

function closeWinnerModal(){
  const modal = document.getElementById("winnerModal");
  const img = document.getElementById("modalImage");

  if(modal){
    modal.classList.remove("show");
  }

  if(img){
    img.src = "";
  }
}

/* =========================
   SLIDESHOW
========================= */

function playSlide(){
  if(slideInterval){
    clearInterval(slideInterval);
  }

  slideInterval = setInterval(() => {
    const input = document.getElementById("searchInput");
    if(input && input.value.trim() !== "") return;

    const totalPages = Math.ceil(visibleData.length / ROWS_PER_PAGE);
    if(totalPages <= 1) return;

    if(currentPage < totalPages){
      currentPage++;
    }else{
      currentPage = 1;
    }

    renderPage();
    renderPagination();
  }, 7000);
}

function pauseSlide(){
  if(slideInterval){
    clearInterval(slideInterval);
    slideInterval = null;
  }

  currentPage = 1;
  renderPage();
  renderPagination();
}

/* =========================
   FULLSCREEN / PROJECTOR
========================= */

function openProjectorMode(){
  if(window.innerWidth <= 1024){
    console.log("Fullscreen blocked for phone/tablet.");
    return;
  }

  const docEl = document.documentElement;

  if(!document.fullscreenElement && !document.webkitFullscreenElement){
    if(docEl.requestFullscreen){
      docEl.requestFullscreen().catch(console.error);
    }else if(docEl.webkitRequestFullscreen){
      docEl.webkitRequestFullscreen();
    }
  }else{
    if(document.exitFullscreen){
      document.exitFullscreen();
    }else if(document.webkitExitFullscreen){
      document.webkitExitFullscreen();
    }
  }
}

function handleFullscreenChange(){
  const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);

  document.body.classList.toggle("fullscreen-active", isFullscreen);

  if(isFullscreen){
    playSlide();
  }else{
    pauseSlide();
  }
}

document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
