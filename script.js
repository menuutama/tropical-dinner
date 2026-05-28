const API_URL =
"https://script.google.com/macros/s/AKfycbymH8u2HPYuTayguREV8qBlyO1a8zZJzy15QQgScxUpbmL5Y5zA4QwD8BsjSiHg86Di/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let currentPage = 1;
let autoSlide = null;
let lastDataHash = "";

/* =========================
   DYNAMIC CSS FOR TV & MOBILE 
   (Menyelesaikan masalah kedudukan TV & wrapping mobile)
========================= */
const style = document.createElement('style');
style.innerHTML = `
  /* HANYA AKTIF PADA SKRIN BESAR (TV / MONITOR / PROJECTOR) */
  @media (min-width: 1025px) {
    body.fullscreen-active {
      margin: 0 !important;
      padding: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      overflow: hidden !important; 
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important; 
      align-items: center !important;     
      box-sizing: border-box !important;
    }

    body.fullscreen-active .container {
      width: 100vw !important;
      max-width: 100vw !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
    }

    body.fullscreen-active button,
    body.fullscreen-active #pagination,
    body.fullscreen-active .control-buttons,
    body.fullscreen-active #projectorBtn {
      display: none !important;
    }

    /* Membesarkan sub-title (TROPICAL DINNER 2026) */
    body.fullscreen-active .sub-title {
      font-size: 32px !important; 
      letter-spacing: 4px !important;
      margin-bottom: 5px !important;
    }

    body.fullscreen-active .title {
      font-size: 58px !important; 
      margin-top: 5px !important;
    }

    /* Membetulkan kedudukan jadual agar seimbang tepat di tengah (Center) TV */
    body.fullscreen-active .table-wrapper {
      width: 86vw !important; 
      max-width: 86vw !important;
      margin: 20px auto 0 auto !important;
      border-radius: 16px !important;
      float: none !important;
      clear: both !important;
    }

    body.fullscreen-active table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important; 
    }

    /* Agihan peratus lebar kolum bagi merapatkan gap kosong di kiri */
    body.fullscreen-active th:nth-child(1), body.fullscreen-active td:nth-child(1) { width: 10% !important; } /* Place */
    body.fullscreen-active th:nth-child(2), body.fullscreen-active td:nth-child(2) { width: 12% !important; } /* Lucky No */
    body.fullscreen-active th:nth-child(3), body.fullscreen-active td:nth-child(3) { width: 35% !important; } /* Winner */
    body.fullscreen-active th:nth-child(4), body.fullscreen-active td:nth-child(4) { width: 15% !important; } /* Company */
    body.fullscreen-active th:nth-child(5), body.fullscreen-active td:nth-child(5) { width: 28% !important; } /* Prize */

    body.fullscreen-active th,
    body.fullscreen-active td {
      padding: 10px 6px !important; 
      font-size: 1.9vh !important;  
      line-height: 1.2 !important;
      white-space: nowrap !important; 
      overflow: hidden !important;
      text-overflow: ellipsis !important; 
      text-transform: uppercase !important; /* Kekal Huruf Besar di TV */
    }

    body.fullscreen-active .place-badge {
      width: 3.8vh !important;
      height: 3.8vh !important;
      font-size: 1.6vh !important;
      line-height: 3.8vh !important;
    }
  }

  /* UNTUK TELEFON BIMBIT & TABLET (Teks melipat ke bawah / Wrapping) */
  @media (max-width: 1024px) {
    table {
      table-layout: auto !important; 
    }
    tbody td, thead th {
      white-space: normal !important;  
      word-wrap: break-word !important; 
      overflow: visible !important;
      text-overflow: clip !important;
      font-size: 12px !important; 
      padding: 8px 5px !important;
      text-transform: uppercase !important; /* Kekal Huruf Besar di HP */
    }
    body.fullscreen-active {
      overflow: auto !important; 
    }
  }
`;
document.head.appendChild(style);

/* =========================
   SEARCH BAR (MOBILE & TABLET ONLY)
========================= */

const searchHTML = `
  <div class="mobile-search-wrapper">

    <div class="search-box">

      <input 
        type="text"
        id="searchInput"
        placeholder="Search Lucky No / Winner / Company"
      />

      <button class="clear-btn" id="clearBtn">✕</button>

    </div>

  </div>
`;
window.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");

if(input){

  // LIVE SEARCH
  input.addEventListener("input", performSearch);

  // ENTER SUPPORT
  input.addEventListener("keypress", (e) => {
    if(e.key === "Enter"){
      performSearch();
    }
  });

}

// CLEAR BUTTON
if(clearBtn && input){

  clearBtn.addEventListener("click", () => {
    input.value = "";
    performSearch(); // reset table
    input.focus();
  });

}

  }

  const input =
    document.getElementById("searchInput");

  const btn =
    document.getElementById("searchBtn");

  if(input && btn){

    btn.addEventListener(
      "click",
      performSearch
    );

    input.addEventListener(
      "keypress",
      (e) => {

        if(e.key === "Enter"){
          performSearch();
        }

      }
    );

  }

});

function performSearch(){

  const keyword =
    document
      .getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();

  if(keyword === ""){

    loadData();
    return;

  }

  const filtered =
    allData.filter(item => {

      const luckyNo =
        (item.luckyNo || "")
          .toString()
          .toLowerCase();

      const winner =
        (item.winner || "")
          .toString()
          .toLowerCase();

      const company =
        (item.company || "")
          .toString()
          .toLowerCase();

      return (
        luckyNo.includes(keyword) ||
        winner.includes(keyword) ||
        company.includes(keyword)
      );

    });

  const tbody =
    document.getElementById("winnerTable");

  tbody.innerHTML = filtered.map(item => `

    <tr>

      <td>
        <div class="place-badge">
          ${escapeHTML(item.place)}
        </div>
      </td>

      <td>
        ${escapeHTML(item.luckyNo)}
      </td>

      <td>
        ${escapeHTML(item.winner)}
      </td>

      <td>
        ${escapeHTML(item.company)}
      </td>

      <td>
        ${escapeHTML(item.prize)}
      </td>

    </tr>

  `).join("");

  document.getElementById(
    "pagination"
  ).innerHTML = "";

}

/* =========================
   SAFE TEXT
========================= */

function escapeHTML(text){

  if(text == null) return "";

  return text
    .toString()
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"'");

}

/* =========================
   LOAD DATA
========================= */

async function loadData(){

  try{

    const response = await fetch(API_URL);

    if(!response.ok){
      throw new Error("API ERROR");
    }

    const rawData = await response.json();

    const filteredData = rawData
      .filter(item => {
        return (item.luckyNo || "")
          .toString()
          .trim() !== "";
      })
      .sort((a,b) => {

        const matchA =
          (a.place || "").match(/\d+/);

        const matchB =
          (b.place || "").match(/\d+/);

        const numA =
          parseInt(matchA ? matchA[0] : 999);

        const numB =
          parseInt(matchB ? matchB[0] : 999);

        return numA - numB;

      });

    const newHash =
      JSON.stringify(filteredData);

    if(newHash === lastDataHash){
      return;
    }

    lastDataHash = newHash;

    allData = filteredData;

    const totalPages =
      Math.ceil(allData.length / ROWS_PER_PAGE);

    if(currentPage > totalPages){
      currentPage = totalPages || 1;
    }

    renderPage();
    renderPagination();

  }
  catch(error){

    console.error(
      "FETCH ERROR:",
      error
    );

  }

}

/* =========================
   RENDER TABLE
========================= */

function renderPage(){

  const tbody =
    document.getElementById("winnerTable");

  if(!tbody) return;

  const start =
    (currentPage - 1) * ROWS_PER_PAGE;

  const pageData =
    allData.slice(
      start,
      start + ROWS_PER_PAGE
    );

  tbody.innerHTML = pageData.map(item => `

    <tr>

      <td>
        <div class="place-badge">
          ${escapeHTML(item.place)}
        </div>
      </td>

      <td>
        ${escapeHTML(item.luckyNo)}
      </td>

      <td>
        ${escapeHTML(item.winner)}
      </td>

      <td>
        ${escapeHTML(item.company)}
      </td>

      <td>
        ${escapeHTML(item.prize)}
      </td>

    </tr>

  `).join("");

}

/* =========================
   PAGINATION
========================= */

function renderPagination(){

  const pagination =
    document.getElementById("pagination");

  if(!pagination) return;

  const totalPages =
    Math.ceil(allData.length / ROWS_PER_PAGE);

  if(totalPages <= 1){

    pagination.innerHTML = "";
    return;

  }

  let html = "";

  html += `
    <button
      onclick="firstPage()"
      ${currentPage === 1 ? "disabled" : ""}
    >
      First
    </button>
  `;

  let startPage =
    Math.max(currentPage - 1, 1);

  let endPage =
    Math.min(startPage + 2, totalPages);

  if(endPage - startPage < 2){

    startPage =
      Math.max(endPage - 2, 1);

  }

  for(let i = startPage; i <= endPage; i++){

    html += `
      <button
        class="${i === currentPage ? "active" : ""}"
        onclick="goToPage(${i})"
      >
        ${i}
      </button>
    `;

  }

  html += `
    <button
      onclick="lastPage()"
      ${currentPage === totalPages ? "disabled" : ""}
    >
      Last
    </button>
  `;

  pagination.innerHTML = html;

}

/* Kod sambungan fungsi navigasi asal anda kekal di bawah */
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
  currentPage = Math.ceil(allData.length / ROWS_PER_PAGE);
  renderPage();
  renderPagination();
}

/* =========================
   FULLSCREEN
========================= */

function openProjectorMode(){
  if(!document.fullscreenElement){
    document.documentElement
      .requestFullscreen()
      .catch(err => {
        console.error(err);
      });
  }
  else{
    document.exitFullscreen();
  }
}

document.addEventListener(
  "fullscreenchange",
  () => {
    if(document.fullscreenElement){
      document.body.classList.add("fullscreen-active");
    }
    else{
      document.body.classList.remove("fullscreen-active");
    }
  }
);


/* =========================
   START
========================= */
loadData();
playSlide();
