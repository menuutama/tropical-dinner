const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";
const ROWS_PER_PAGE = 10;

let allData = [];
let slideInterval = null;
let currentPage = 1;
let lastDataHash = "";

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");

  input.addEventListener("input", () => {
    clearBtn.style.display = input.value.trim() ? "block" : "none";
    performSearch();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    performSearch();
    input.focus();
  });

  loadData();
});

function escapeHTML(text) {
  if (text == null) return "";
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

function performSearch() {
  const input = document.getElementById("searchInput");
  const keyword = input.value.trim().toLowerCase();

  if (keyword === "") {
    renderPage();
    renderPagination();
    return;
  }

  const filtered = allData.filter(item => {
    return (
      (item.luckyNo || "").toString().toLowerCase().includes(keyword) ||
      (item.winner || "").toString().toLowerCase().includes(keyword) ||
      (item.company || "").toString().toLowerCase().includes(keyword)
    );
  });

  renderTable(filtered);
  document.getElementById("pagination").innerHTML = "";
}

function renderPage() {
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageData = allData.slice(start, start + ROWS_PER_PAGE);
  renderTable(pageData);
}

function renderTable(data) {
  const tbody = document.getElementById("winnerTable");

  tbody.innerHTML = data.map((item, index) => {
    const realIndex = allData.indexOf(item);

    return `
      <tr onclick="openWinnerModal(${realIndex})">
        <td><div class="place-badge">${escapeHTML(item.place)}</div></td>
        <td>${escapeHTML(item.luckyNo)}</td>
        <td class="winner-name">${escapeHTML(item.winner)}</td>
        <td>${escapeHTML(item.company)}</td>
      </tr>
    `;
  }).join("");
}

function renderPagination() {
  const pagination = document.getElementById("pagination");
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

function openWinnerModal(index) {
  const item = allData[index];
  if (!item) return;

  document.getElementById("modalPlace").textContent = item.place || "";
  document.getElementById("modalWinner").textContent = item.winner || "";
  document.getElementById("modalLuckyNo").textContent = "Lucky No: " + (item.luckyNo || "");
  document.getElementById("modalCompany").textContent = "Company: " + (item.company || "");
  document.getElementById("modalPrize").textContent = "Prize: " + (item.prize || "");

  const img = document.getElementById("modalImage");

  if (item.imageUrl && item.imageUrl.trim() !== "") {
    img.src = item.imageUrl;
    img.style.display = "block";
  } else {
    img.src = "";
    img.style.display = "none";
  }

  document.getElementById("winnerModal").classList.add("show");
}

function closeWinnerModal() {
  document.getElementById("winnerModal").classList.remove("show");
}

document.getElementById("winnerModal").addEventListener("click", function(e) {
  if (e.target === this) closeWinnerModal();
});

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") closeWinnerModal();
});

function playSlide() {
  if (slideInterval) clearInterval(slideInterval);

  slideInterval = setInterval(() => {
    const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE);
    if (totalPages <= 1) return;

    currentPage = currentPage < totalPages ? currentPage + 1 : 1;

    renderPage();
    renderPagination();
  }, 7000);
}

function pauseSlide() {
  if (slideInterval) {
    clearInterval(slideInterval);
    slideInterval = null;
  }

  currentPage = 1;
  renderPage();
  renderPagination();
}

function handleFullscreenChange() {
  const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
  document.body.classList.toggle("fullscreen-active", isFullscreen);

  if (isFullscreen) {
    playSlide();
  } else {
    pauseSlide();
  }
}

document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

setInterval(loadData, 3000);
