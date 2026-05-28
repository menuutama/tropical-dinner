const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let currentPage = 1;
let autoSlide = null;
let lastDataFingerprint = ""; // Ditukar daripada simpan string JSON penuh kepada cap jari data ringkas

/* =========================
   DYNAMIC CSS FOR SLIDE MODE
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
  body.fullscreen-active table {
    width: 95vw !important;
    height: auto !important;
    max-height: 85vh !important;
    margin: auto !important;
    border-collapse: collapse !important;
  }
  body.fullscreen-active th,
  body.fullscreen-active td {
    padding: 6px 12px !important; 
    font-size: 2.2vh !important;  
    line-height: 1.2 !important;
  }
  body.fullscreen-active .place-badge {
    width: 4vh !important;
    height: 4vh !important;
    font-size: 1.8vh !important;
    line-height: 4vh !important;
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

    // 1. FILTERING: Loop dipendekkan & diringkaskan terus
    const filteredData = rawData.filter(item => item && item.luckyNo && item.luckyNo.toString().trim() !== "");

    // 2. FINGERPRINTING (PENGGANTI JSON.STRINGIFY):
    // Kita bina kod ringkas berasaskan jumlah baris dan nilai item pertama/terakhir untuk kesan perubahan.
    // Cara ini 99% lebih laju daripada menukar keseluruhan array menjadi string teks JSON yang panjang.
    let newFingerprint = "len:" + filteredData.length;
    if (filteredData.length > 0) {
      newFingerprint += "_" + filteredData[0].luckyNo + "_" + filteredData[filteredData.length - 1].luckyNo;
    }

    /* Elak rerender kalau data dikesan sama */
    if(newFingerprint === lastDataFingerprint){
      return;
    }

    lastDataFingerprint = newFingerprint;

    // 3. SORTING: Hanya dijalankan sekiranya data sah berubah sahaja
    filteredData.sort((a, b) => {
      const numA = parseInt((a.place || "").match(/\d+/)?.[0] || 999);
      const numB = parseInt((b.place || "").match(/\d+/)?.[0] || 999);
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
  // Dipisahkan ke fungsi luar supaya engine V8 browser boleh buat pra-kompilasi (lebih laju)
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

  // Menggunakan map dengan rujukan fungsi luar untuk elak cipta skrip fungsi berulang kali di memori
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

/* Memantau perubahan fullscreen untuk on/off kelas gaya */
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

/* Refresh data background */
setInterval(loadData, 3000);
