//import { API_URL } from './api.js';
const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";
const ROWS_PER_PAGE = 10;

let allData = [];
// Tambah ini di bahagian atas bersama global variables yang lain
let slideInterval = null; 
let currentPage = 1;
let lastDataHash = "";

/* =========================
   SEARCH HTML INJECT
========================= */

const searchHTML = `
<div class="mobile-search-wrapper">
  <div class="search-box">
    <input 
      type="text"
      id="searchInput"
      placeholder="Search Lucky No / Winner / Company"
    />
    <button class="clear-btn" id="clearBtn">x</button>
  </div>
</div>
`;

document.addEventListener("DOMContentLoaded", () => {

  const liveUpdateEl = document.querySelector(".live-update-badge");

  if (liveUpdateEl) {
    liveUpdateEl.insertAdjacentHTML("afterend", searchHTML);
  } else {
    document.body.insertAdjacentHTML("afterbegin", searchHTML);
  }

  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");

  if (input) {
    input.addEventListener("input", performSearch);

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") performSearch();
    });
  }

  if (clearBtn && input) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      performSearch();
      input.focus();
    });
  }

});

/* =========================
   SEARCH FUNCTION
========================= */

function performSearch() {

  const input = document.getElementById("searchInput");
  if (!input) return;

  const keyword = input.value.trim().toLowerCase();

  if (keyword === "") {
    renderPage();
    renderPagination();
    return;
  }

  const filtered = allData.filter(item => {

    const luckyNo = (item.luckyNo || "").toString().toLowerCase();
    const winner  = (item.winner || "").toString().toLowerCase();
    const company = (item.company || "").toString().toLowerCase();

    return (
      luckyNo.includes(keyword) ||
      winner.includes(keyword) ||
      company.includes(keyword)
    );

  });

  const tbody = document.getElementById("winnerTable");

  if (!tbody) return;

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td><div class="place-badge">${escapeHTML(item.place)}</div></td>
      <td>${escapeHTML(item.luckyNo)}</td>
      <td>${escapeHTML(item.winner)}</td>
      <td>${escapeHTML(item.company)}</td>
      <td>${escapeHTML(item.prize)}</td>
    </tr>
  `).join("");

  document.getElementById("pagination").innerHTML = "";
} 

/* =========================
   SAFE HTML
========================= */

function escapeHTML(text) {
  if (text == null) return "";
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "'");
}

/* =========================
   LOAD DATA
========================= */

async function loadData() {

  try {

    const response = await fetch(API_URL);
    const rawData = await response.json();

    const filteredData = rawData
      .filter(item => (item.luckyNo || "").toString().trim() !== "")
      .sort((a, b) => {
        const numA = parseInt((a.place || "").match(/\d+/)?.[0] || 999);
        const numB = parseInt((b.place || "").match(/\d+/)?.[0] || 999);
        return numA - numB;
      });

    const newHash = JSON.stringify(filteredData);
    if (newHash === lastDataHash) return;

    lastDataHash = newHash;
    allData = filteredData;

    currentPage = Math.min(currentPage, Math.ceil(allData.length / ROWS_PER_PAGE) || 1);

    const input = document.getElementById("searchInput");
    if (input && input.value.trim() !== "") {
      performSearch();
    } else {
      renderPage();
      renderPagination();
    }

  } catch (err) {
    console.error("FETCH ERROR:", err);
  }
}

/* =========================
   RENDER TABLE
========================= */

function renderPage() {

  const tbody = document.getElementById("winnerTable");
  if (!tbody) return;

  const start = (currentPage - 1) * ROWS_PER_PAGE;

  const pageData = allData.slice(start, start + ROWS_PER_PAGE);

  tbody.innerHTML = pageData.map(item => `
    <tr>
      <td><div class="place-badge">${escapeHTML(item.place)}</div></td>
      <td>${escapeHTML(item.luckyNo)}</td>
      <td>${escapeHTML(item.winner)}</td>
      <td>${escapeHTML(item.company)}</td>
      <td>${escapeHTML(item.prize)}</td>
    </tr>
  `).join("");
}

/* =========================
   PAGINATION
========================= */

function renderPagination() {

  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE);

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = "";

  html += `<button onclick="firstPage()" ${currentPage === 1 ? "disabled" : ""}>First Page</button>`;

  let startPage = Math.max(currentPage - 1, 1);
  let endPage = Math.min(startPage + 2, totalPages);

  if (endPage - startPage < 2 && startPage > 1) {
    startPage = Math.max(endPage - 2, 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }

  html += `<button onclick="lastPage()" ${currentPage === totalPages ? "disabled" : ""}>Last Page</button>`;

  pagination.innerHTML = html;
}

/* =========================
   NAVIGATION
========================= */

function goToPage(p) {
  currentPage = p;
  renderPage();
  renderPagination();
}

function firstPage() {
  currentPage = 1;
  renderPage();
  renderPagination();
}

function lastPage() {
  currentPage = Math.ceil(allData.length / ROWS_PER_PAGE);
  renderPage();
  renderPagination();
}

/* ====================================================================
   FULLSCREEN MOD SLAID (SEKAT UNTUK LAPTOP, TV & PROJEKTOR)
==================================================================== */

function openProjectorMode() {
  if (window.innerWidth <= 1024) {
    console.log("Fungsi Fullscreen Slideshow disekat untuk Phone/Tablet.");
    return; 
  }

  const docEl = document.documentElement;

  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(console.error);
    } else if (docEl.webkitRequestFullscreen) { 
      docEl.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function handleFullscreenChange() {
  const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
  document.body.classList.toggle("fullscreen-active", isFullscreen);

  let fsHeader = document.getElementById("fullscreenHeader");
  let fsFooter = document.getElementById("fullscreenFooter");
  
  // Ambil elemen panel kawalan butang
const controlPanel = document.querySelector(".control-buttons");

   const paginationPanel =
document.getElementById("pagination");

if(isFullscreen){

  if(controlPanel)
    controlPanel.style.display="none";

  if(paginationPanel)
    paginationPanel.style.display="none";

}else{

  if(controlPanel)
    controlPanel.style.display="flex";

  if(paginationPanel)
    paginationPanel.style.display="flex";

}
   
  if (isFullscreen) {
    // SEMBUNYIKAN BUTANG KAWALAN SEMASA FULLSCREEN
    if (controlPanel) {
      controlPanel.style.display = "none";
    }

       // MULA SLIDESHOW AUTOMATIK
    playSlide();

  } else {
    // PAPARKAN SEMULA BUTANG KAWALAN SELEPAS TEKAN ESC
    if (controlPanel) {
      controlPanel.style.display = "block"; // atau "flex" mengikut kesesuaian css anda
    }
if (fsHeader) fsHeader.remove();
if (fsFooter) fsFooter.remove();
     // HENTIKAN SLIDESHOW AUTOMATIK
    pauseSlide();
  }
}


document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

/* =========================
   START
========================= */

setInterval(loadData,3000);

loadData();

// Menggerakkan halaman jadual secara automatik
function playSlide() {
  // Padam interval lama jika ada untuk elakkan pertembungan timer
  if (slideInterval) clearInterval(slideInterval); 

  slideInterval = setInterval(() => {
    const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE);
    
    if (totalPages <= 1) return; // Tiada guna tukar page jika data sikit

    if (currentPage < totalPages) {
      currentPage++;
    } else {
      currentPage = 1; // Kembali ke halaman pertama selepas halaman terakhir
    }
    
    renderPage();
    renderPagination();
  }, 7000); // 5000ms = 5 saat untuk setiap halaman. Boleh ubah ikut kesesuaian.
}

// Menghentikan pergerakan halaman automatik
function pauseSlide() {
  if (slideInterval) {
    clearInterval(slideInterval);
    slideInterval = null;
  }
  // Kembali ke halaman 1 apabila mod projektor ditutup
  currentPage = 1;
  renderPage();
  renderPagination();
}

aku xtau nak ubah dekat mana, kalu aku nak bila tekan button fullscreen tu dia akn pop-up new window browser then fullscreen. nnt bila dia dh popup new window browser baru aku manualy tekan  SHIFT + START + ARROW KIRI ATAU KANAN
