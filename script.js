const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let currentPage = 1;
let autoSlide = null;
let lastDataHash = "";

/* =========================
   DYNAMIC CSS FOR SLIDE MODE
   (Membuat tabel Center & Jarak Antar Kolom Rapat)
========================= */
const style = document.createElement('style');
style.innerHTML = `
  /* Membuat seluruh halaman berada di tengah layar secara vertikal & horizontal */
  body.fullscreen-active {
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    overflow: hidden !important; 
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important; /* Center vertikal */
    align-items: center !important;     /* Center horizontal */
    box-sizing: border-box !important;
  }

  /* Menyembunyikan tombol navigasi saat fullscreen */
  body.fullscreen-active button,
  body.fullscreen-active #pagination,
  body.fullscreen-active .control-buttons,
  body.fullscreen-active #projectorBtn {
    display: none !important;
  }

  /* Memperbesar sub-title sesuai permintaan agar seimbang */
  body.fullscreen-active .sub-title {
    font-size: 32px !important; 
    letter-spacing: 4px !important;
    margin-bottom: 5px !important;
  }

  body.fullscreen-active .title {
    font-size: 58px !important; 
    margin-top: 5px !important;
  }

  /* Mengatur lebar pembungkus tabel agar pas di tengah TV dan tidak tumpah ke kanan */
  body.fullscreen-active .table-wrapper {
    width: 86vw !important; 
    max-width: 86vw !important;
    margin: 20px auto 0 auto !important;
    border-radius: 16px !important;
  }

  body.fullscreen-active table {
    width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important; /* Mengunci lebar kolom */
  }

  /* MERAPATKAN GAP <--> (Mengatur persentase lebar kolom agar lebih rapat ke kiri) */
  body.fullscreen-active th:nth-child(1), body.fullscreen-active td:nth-child(1) { width: 10% !important; } /* Place */
  body.fullscreen-active th:nth-child(2), body.fullscreen-active td:nth-child(2) { width: 12% !important; } /* Lucky No */
  body.fullscreen-active th:nth-child(3), body.fullscreen-active td:nth-child(3) { width: 35% !important; } /* Winner */
  body.fullscreen-active th:nth-child(4), body.fullscreen-active td:nth-child(4) { width: 15% !important; } /* Company */
  body.fullscreen-active th:nth-child(5), body.fullscreen-active td:nth-child(5) { width: 28% !important; } /* Prize (Diberi ruang lebih luas agar teks muat) */

  /* Mengecilkan padding bagian dalam sel agar jarak antar teks lebih rapat */
  body.fullscreen-active th,
  body.fullscreen-active td {
    padding: 10px 4px !important; /* Padding kanan-kiri dipersempit */
    font-size: 1.9vh !important;  
    line-height: 1.2 !important;
    white-space: nowrap !important; 
    overflow: hidden !important;
    text-overflow: ellipsis !important; 
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
   LOAD DATA (KEMBALI KE VERSI ASLI ANDA)
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
        (a.place || "").match(/\d+/)?.[0] || 999
      );

      const numB = parseInt(
        (b.place || "").match(/\d+/)?.[0] || 999
      );

      return numA - numB;

    });

    const newHash = JSON.stringify(filteredData);

    /* Elak rerender kalau data sama */
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

/* Refresh data background */
setInterval(loadData, 2000);
