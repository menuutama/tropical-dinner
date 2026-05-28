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
        (a.place || "").match(/\d+/)?. || 999
      );

      const numB = parseInt(
        (b.place || "").match(/\d+/)?. || 999
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
   AUTO-PUSH SKRIN KEDUA + FLOATING BUTTON
========================= */

async function openProjectorMode() {
  if (!("getScreenDetails" in window)) {
    alert("Browser tidak menyokong fungsi ini. Sila gunakan Chrome atau Edge versi terkini.");
    return;
  }

  try {
    const screenDetails = await window.getScreenDetails();
    const secondScreen = screenDetails.screens.find(screen => !screen.isPrimary);

    if (!secondScreen) {
      alert("Skrin kedua / projektor tidak dikesan. Sila set paparan Windows ke mod 'Extend'.");
      return;
    }

    const options = { screen: secondScreen };
    await document.documentElement.requestFullscreen(options);

    // Cipta Floating Button jika belum wujud dalam kod HTML asal
    createFloatingExitButton();

  } catch (error) {
    console.error("Gagal fullscreen skrin kedua:", error);
    alert("Sila benarkan akses kawalan skrin (Window Management) pada browser anda.");
  }
}

/* FUNGSI CIPTA & KAWAL FLOATING BUTTON */
function createFloatingExitButton() {
  // Elak butang dicipta berlapis-lapis jika sudah ada
  if (document.getElementById("floatingExitBtn")) return;

  // 1. Cipta elemen butang baru
  const exitBtn = document.createElement("button");
  exitBtn.id = "floatingExitBtn";
  exitBtn.innerHTML = "❌ Keluar Skrin";
  
  // 2. Masukkan gaya CSS secara langsung (Terapung di kanan bawah skrin)
  Object.assign(exitBtn.style, {
    position: "fixed",
    bottom: "30px",
    right: "30px",
    zIndex: "999999",
    padding: "12px 24px",
    backgroundColor: "rgba(220, 53, 69, 0.4)", // Merah separa lutsinar supaya tidak mengganggu data
    color: "#fff",
    border: "none",
    borderRadius: "30px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
    transition: "all 0.3s ease",
    fontFamily: "sans-serif"
  });

  // Efek hover: Apabila mouse lalu di atas butang, ia akan menyala terang
  exitBtn.onmouseover = () => {
    exitBtn.style.backgroundColor = "rgba(220, 53, 69, 1)"; // Jadi merah terang
    exitBtn.style.transform = "scale(1.05)"; // Membesar sedikit
  };
  
  exitBtn.onmouseout = () => {
    exitBtn.style.backgroundColor = "rgba(220, 53, 69, 0.4)";
    exitBtn.style.transform = "scale(1)";
  };

  // 3. Logik fungsi apabila butang ditekan (Tutup Fullscreen)
  exitBtn.onclick = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  // 4. Masukkan butang ke dalam halaman web
  document.body.appendChild(exitBtn);
}

/* LOGIK PEMBERSIHAN BUTTON APABILA KELUAR FULLSCREEN */
document.addEventListener("fullscreenchange", () => {
  // Jika pengguna keluar dari mod fullscreen (sama ada tekan butang atau tekan butang 'ESC' di keyboard)
  if (!document.fullscreenElement) {
    const exitBtn = document.getElementById("floatingExitBtn");
    if (exitBtn) {
      exitBtn.remove(); // Padam terus butang daripada paparan skrin utama asal
    }
  }
});

/* =========================
   START
========================= */

loadData();

playSlide();

/* Refresh data background */
setInterval(loadData, 3000);

