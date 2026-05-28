const API_URL =
"https://script.google.com/macros/s/AKfycbymH8u2HPYuTayguREV8qBlyO1a8zZJzy15QQgScxUpbmL5Y5zA4QwD8BsjSiHg86Di/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let currentPage = 1;
let lastDataHash = "";

/* =========================
   SEARCH HTML INJECT
========================= */

// Padding 10px ditambah terus pada style inline wrapper untuk memastikan ketetapan jarak
const searchHTML = `
<div class="mobile-search-wrapper" style="padding: 10px; width: 100%; box-sizing: border-box;">
  <div class="search-box" style="position: relative; width: 100%;">
    <input 
      type="text"
      id="searchInput"
      placeholder="Search Lucky No / Winner / Company"
      style="width: 100%; box-sizing: border-box;"
    />
    <button class="clear-btn" id="clearBtn" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">✕</button>
  </div>
</div>
`;

document.addEventListener("DOMContentLoaded", () => {

  // Mencari elemen live update. Sila pastikan elemen "LIVE UPDATING" anda mempunyai class atau ID ini.
  // Jika menggunakan element center/div, anda boleh tambah class="live-update-badge" pada HTML tersebut.
  const liveUpdateEl = document.querySelector(".live-update-badge") || document.querySelector(".live-updating-badge");

  if (liveUpdateEl) {
    // Membawa search bar turun ke bawah elemen live update
    liveUpdateEl.insertAdjacentHTML("afterend", searchHTML);
  } else {
    // Jika tidak dijumpai, ia akan kekal di atas sebagai pelindung ralat
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

// Komen telah dibuka dan dibetulkan supaya fungsi carian kembali aktif
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
    .replace(/'/g, "&#39;"); // Dibaiki entiti karakter escape untuk keselamatan tanda '
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

    // Memastikan jika user sedang menaip carian, data tidak terpadam secara mengejut apabila live update berlaku
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

  html += `<button onclick="firstPage()" ${currentPage === 1 ? "disabled" : ""}>First</button>`;

  let startPage = Math.max(currentPage - 1, 1);
  let endPage = Math.min(startPage + 2, totalPages);

  // Menyelaraskan butang navigasi sekiranya berada di halaman-halaman akhir
  if (endPage - startPage < 2 && startPage > 1) {
    startPage = Math.max(endPage - 2, 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }

  html += `<button onclick="lastPage()" ${currentPage === totalPages ? "disabled" : ""}>Last</button>`;

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

/* =========================
   FULLSCREEN MODE
========================= */

function openProjectorMode() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.error);
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener("fullscreenchange", () => {
  document.body.classList.toggle(
    "fullscreen-active",
    !!document.fullscreenElement
  );
});

/* =========================
   START
========================= */

// Mengaktifkan auto-refresh data setiap 5 saat untuk menyokong ciri "LIVE UPDATING"
setInterval(loadData, 5000);

loadData();

// sementara
function playSlide(){}
