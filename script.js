const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let currentPage = 1;
let autoSlide = null;
let lastDataFingerprint = "";

/* =========================
   DYNAMIC CSS FOR SLIDE MODE
   (Dioptimumkan untuk mengelakkan column terpotong di TV)
========================= */
const style = document.createElement('style');
style.innerHTML = `
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

  body.fullscreen-active button,
  body.fullscreen-active #pagination,
  body.fullscreen-active .control-buttons,
  body.fullscreen-active #projectorBtn {
    display: none !important;
  }

  /* Besarkan tulisan sub-title (TROPICAL DINNER 2026) */
  body.fullscreen-active .sub-title {
    font-size: 32px !important; /* Diperbesarkan agar seimbang */
    letter-spacing: 4px !important;
    margin-bottom: 5px !important;
  }

  /* Tulisan tajuk utama dikekalkan saiz asal */
  body.fullscreen-active .title {
    font-size: 58px !important; 
    margin-top: 5px !important;
  }

  /* Kecilkan lebar tabel keseluruhan (88vw) supaya tidak terpotong di tepi TV */
  body.fullscreen-active .table-wrapper,
  body.fullscreen-active table {
    width: 88vw !important; 
    max-width: 88vw !important;
    height: auto !important;
    max-height: 72vh !important;
    margin: 0 auto !important;
    border-collapse: collapse !important;
    table-layout: fixed !important; /* Mengunci saiz column */
  }

  /* Agihan jarak column yang rapat dan sekata */
  body.fullscreen-active th:nth-child(1), body.fullscreen-active td:nth-child(1) { width: 12% !important; } /* Place */
  body.fullscreen-active th:nth-child(2), body.fullscreen-active td:nth-child(2) { width: 15% !important; } /* Lucky No */
  body.fullscreen-active th:nth-child(3), body.fullscreen-active td:nth-child(3) { width: 38% !important; } /* Winner */
  body.fullscreen-active th:nth-child(4), body.fullscreen-active td:nth-child(4) { width: 15% !important; } /* Company */
  body.fullscreen-active th:nth-child(5), body.fullscreen-active td:nth-child(5) { width: 20% !important; } /* Prize */

  body.fullscreen-active th,
  body.fullscreen-active td {
    padding: 8px 6px !important; /* Jarak padding dirapatkan */
    font-size: 1.9vh !important;  
    line-height: 1.2 !important;
    white-space: nowrap !important; /* Elak teks turun ke bawah */
    overflow: hidden !important;
    text-overflow: ellipsis !important; /* Letak ... jika teks syarikat/nama terlampau panjang */
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

    const filteredData = rawData.filter(item => item && item.luckyNo && item.luckyNo.toString().trim() !== "");

    let newFingerprint = "len:" + filteredData.length;
    if (filteredData.length > 0) {
      newFingerprint += "_" + filteredData[0].luckyNo + "_" + filteredData[filteredData.length - 1].luckyNo;
    }

    if(newFingerprint === lastDataFingerprint){
      return;
    }

    lastDataFingerprint = newFingerprint;

    filteredData.sort((a, b) => {
      const numA = parseInt((a.place || "").match(/\d+/)?[0] || 999);
      const numB = parseInt((b.place || "").match(/\d+/)?[0] || 999);
      return numA - numB;
    });

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

function tbodyMapper(item) {
  return `
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
  `;
}

function renderPage(){

  const tbody = document.getElementById("winnerTable");
  if (!tbody) return;

  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageData = allData.slice(start, start + ROWS_PER_PAGE);

  tbody.innerHTML = pageData.map(tbodyMapper).join("");

}

/* =========================
   PAGINATION
========================= */

function renderPagination(){

  const pagination = document.getElementById("pagination");
  if (!pagination) return;

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
   FULLSCREEN SKRIN UTAMA (SKRIN 1)
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
