const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let currentPage = 1;
let autoSlide = null;
let lastDataHash = "";

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
   AUTO-PUSH FULLSCREEN TO SECOND SCREEN
========================= */

async function openProjectorMode() {
  // 1. Semak sokongan browser (Sesuai untuk Chrome & Edge terkini)
  if (!("getScreenDetails" in window)) {
    alert("Browser tidak menyokong auto-push skrin kedua. Gunakan Chrome atau Edge versi terkini.");
    return;
  }

  try {
    // 2. Minta kebenaran akses skrin dan dapatkan maklumat semua monitor
    const screenDetails = await window.getScreenDetails();
    
    // 3. Cari monitor yang BUKAN skrin utama (iaitu projector atau monitor kedua)
    const secondScreen = screenDetails.screens.find(screen => !screen.isPrimary);

    if (!secondScreen) {
      alert("Skrin kedua atau projector tidak dikesan. Sila pastikan kabel HDMI disambung dan set ke mod 'Extend'.");
      return;
    }

    // 4. Tetapkan konfigurasi posisi untuk membuka element di skrin kedua
    const options = {
      screen: secondScreen
    };

    // 5. Tolak elemen halaman web semasa terus menjadi fullscreen di skrin kedua
    await document.documentElement.requestFullscreen(options);

  } catch (error) {
    console.error("Gagal melakukan auto-push fullscreen:", error);
    alert("Sila benarkan akses 'Window Management / Skrin' apabila diminta oleh browser.");
  }
}

/* =========================
   START
========================= */

loadData();

playSlide();

/* Refresh data background */
setInterval(loadData, 3000);
