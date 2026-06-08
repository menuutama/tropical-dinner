const API_URL = "https://script.google.com/macros/s/AKfycbwh2yJfQRzpp24vNW_O1MrDDYIHuX5sUtlI1ogmwChiQZFZ-YWM22M2ZYNveQmSM3Ys/exec";
const ROWS_PER_PAGE = 10;
const PUBLISH_WORD = "PUBLISH";

let allData = [];
let visibleData = [];
let slideInterval = null;
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
  loadData();
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
  isAdminMode = true;

  const panel = document.getElementById("publishPanel");
  if(panel){
    panel.style.display = "block";
  }

  applyVisibilityRule();
  renderAfterDataChange();
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
  const note = document.getElementById("publishNote");

  const from = Number(fromInput?.value || 0);
  const to = Number(toInput?.value || 0);

  if(!from || !to){
    setPublishNote("Please enter range. Example: 90 to 70.", true);
    return;
  }

  setPublishNote("Publishing...", false);

  try{
    const url = `${API_URL}?action=publishRange&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&time=${Date.now()}`;
    const response = await fetch(url, { cache:"no-store" });
    const result = await response.json();

    if(result.success){
      setPublishNote(`Done. ${result.publishedCount || 0} winner(s) published for place ${from} to ${to}.`, false);
      await loadData(true);
    }else{
      setPublishNote(result.message || "Publish failed.", true);
    }
  }catch(err){
    console.error(err);
    setPublishNote("Publish failed. Check Apps Script deployment / permission.", true);
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

  setPublishNote("Clearing...", false);

  try{
    const response = await fetch(`${API_URL}?action=clearPublish&time=${Date.now()}`, {
      cache:"no-store"
    });

    const result = await response.json();

    if(result.success){
      setPublishNote("Done. Semua word PUBLISH dekat column H sudah dipadam.", false);
      await loadData(true);
    }else{
      setPublishNote(result.message || "Clear failed.", true);
    }
  }catch(err){
    console.error(err);
    setPublishNote("Clear failed. Check Apps Script deployment / permission.", true);
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
    const response = await fetch(API_URL + "?action=getWinners&time=" + Date.now(), {
      cache:"no-store"
    });

    const rawData = await response.json();

    const sortedData = rawData
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
  }
}

function applyVisibilityRule(){
  if(isAdminMode){
    visibleData = allData;
    return;
  }

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

/* =========================
   AUTO REFRESH
========================= */

setInterval(() => loadData(false), 3000);
