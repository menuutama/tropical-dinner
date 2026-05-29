const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";

// Sediakan saluran komunikasi antara tab browser
const bc = new BroadcastChannel("lucky_draw_channel");

let allData = [];
let lastDataHash = "";
let currentPage = 1;
const ROWS_PER_PAGE = 10; // Sila sesuaikan mengikut keperluan asal anda
let slideInterval = null;

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
    if (newHash === lastDataHash) {
      // Walaupun tiada data baharu dari API, hantar isyarat "ping" berkala ke tab projektor yang baru dibuka
      bc.postMessage({ type: "DATA_UPDATE", data: allData });
      return;
    }

    lastDataHash = newHash;
    allData = filteredData;

    // HANTAR DATA TERKINI KE TAB FULLSCREENLIVE.HTML
    bc.postMessage({ type: "DATA_UPDATE", data: allData });

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

function renderPagination() {
  // Kekalkan fungsi renderPagination asal anda di sini jika ada
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Fungsi membuka halaman baharu apabila butang ditekan
function openProjectorMode() {
  if (window.innerWidth <= 1024) {
    console.log("Fungsi Fullscreen Slideshow disekat untuk Phone/Tablet.");
    return; 
  }
  // Buka fail projektor di tab baharu
  window.open("fullscreenLive.html", "_blank");
}

/* =========================
   START
========================= */
setInterval(loadData, 5000);
loadData();
