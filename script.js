const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let currentPage = 1;
let autoSlide = null;
let lastDataHash = "";

/* =========================
   DYNAMIC CSS FOR SLIDE MODE
========================= */
const style = document.createElement('style');
style.innerHTML = `
  /* HANYA AKTIF DI LAYAR BESAR (TV / MONITOR / DESKTOP) */
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

    body.fullscreen-active .sub-title {
      font-size: 32px !important; 
      letter-spacing: 4px !important;
      margin-bottom: 5px !important;
    }

    body.fullscreen-active .title {
      font-size: 58px !important; 
      margin-top: 5px !important;
    }

    /* Memperbaiki posisi pembungkus tabel agar benar-benar berada di tengah (Center) TV */
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

    /* Pembagian kolom yang adil agar sisi kanan tidak tumpah/terpotong */
    body.fullscreen-active th:nth-child(1), body.fullscreen-active td:nth-child(1) { width: 10% !important; } 
    body.fullscreen-active th:nth-child(2), body.fullscreen-active td:nth-child(2) { width: 12% !important; } 
    body.fullscreen-active th:nth-child(3), body.fullscreen-active td:nth-child(3) { width: 35% !important; } 
    body.fullscreen-active th:nth-child(4), body.fullscreen-active td:nth-child(4) { width: 15% !important; } 
    body.fullscreen-active th:nth-child(5), body.fullscreen-active td:nth-child(5) { width: 28% !important; } 

    body.fullscreen-active th,
    body.fullscreen-active td {
      padding: 10px 6px !important; 
      font-size: 1.9vh !important;  
      line-height: 1.2 !important;
      white-space: nowrap !important; 
      overflow: hidden !important;
      text-overflow: ellipsis !important; 
      text-transform: uppercase !important; 
    }

    body.fullscreen-active .place-badge {
      width: 3.8vh !important;
      height: 3.8vh !important;
      font-size: 1.6vh !important;
      line-height: 3.8vh !important;
    }

    body.fullscreen-active .notice {
      margin-top: 15px !important;
      font-size: 1.6vh !important;
    }
  }

  /* UTK HANDPHONE & TABLET: Paksa teks melipat ke bawah (Wrapping) agar tidak terlalu kecil */
  @media (max-width: 1024px) {
    table {
      table-layout: auto !important; /* Kembalikan ke mode otomatis agar tidak kaku */
    }
    tbody td, thead th {
      white-space: normal !important;  /* Izinkan teks melipat ke bawah */
      word-wrap: break-word !important; /* Potong kata jika terlalu panjang */
      overflow: visible !important;
      text-overflow: clip !important;
      font-size: 12px !important; /* Ukuran standar yang nyaman dibaca di HP */
      padding: 8px 5px !important;
    }
    body.fullscreen-active {
      overflow: auto !important; /* Izinkan scroll di HP jika data memanjang bawah */
    }
  }
`;
document.head.appendChild(style);

/* =========================
   LOAD DATA
========================= */

async function loadData(){

  try{

    const response = await fetch(API_URL);

    if(!response.ok){
      throw new Error("API Error");
    }

    const rawData = await response.json();

    const filteredData = rawData
    .filter(item => {
      return (item.luckyNo || "").toString().trim() !== "";
    })
    .sort((a,b) => {

      const numA = parseInt(
        (a.place || "").match(/\d+/)?[0] || 999
      );

      const numB = parseInt(
        (b.place || "").match(/\d+/)?[0] || 999
      );

      return numA - numB;

    });

    const newHash = JSON.stringify(filteredData);

    if(newHash === lastDataHash){
      return;
    }

    lastDataHash = newHash;

    allData = filteredData;

    const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE);

    if(currentPage > totalPages){
      currentPage = totalPages || 1;
    }

    renderPage();
    renderPagination();

  }
  catch(error){
    console.error("Fetch Error:", error);
  }

}

/* =========================
   RENDER TABLE
========================= */

function renderPage(){

  const tbody = document.getElementById("winnerTable");

  const start = (currentPage - 1) * ROWS_PER_PAGE;

  const pageData = allData.slice(
    start,
    start + ROWS_PER_PAGE
  );

  tbody.innerHTML = pageData.map(item => `
  
    <tr>

      <td>
        <div class="place-badge">
          ${item.place || ""}
        </div>
      </td>

      <td>${item.luckyNo || ""}</td>

      <td>${item.winner || ""}</td>

      <td>${item.company || ""}</td>

      <td>${item.prize || ""}</td>

    </tr>

  `).join("");

}

/* =========================
   PAGINATION
========================= */

function renderPagination(){

  const pagination = document.getElementById("pagination");

  const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE);

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

  let startPage = Math.max(currentPage - 1, 1);

  let endPage = Math.min(startPage + 2, totalPages);

  if(endPage - startPage < 2){
    startPage = Math.max(endPage - 2, 1);
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
   AUTO SLIDE
========================= */

function nextAutoPage(){

  const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE);

  if(totalPages <= 1){
    return;
  }

  currentPage++;

  if(currentPage > totalPages){
    currentPage = 1;
  }

  renderPage();
  renderPagination();

}

function playSlide(){

  pauseSlide();

  autoSlide = setInterval(() => {
    nextAutoPage();
  }, 10000);

}

function pauseSlide(){

  if(autoSlide){
    clearInterval(autoSlide);
  }

}

/* =========================
   FULLSCREEN MODE
========================= */

function openProjectorMode() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
      .catch((err) => {
        alert(`Gagal aktifkan Fullscreen: ${err.message}`);
      });
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    document.body.classList.add("fullscreen-active");
  } else {
    document.body.classList.remove("fullscreen-active");
  }
});

/* =========================
   START
========================= */

loadData();

playSlide();

setInterval(loadData, 3000);
