const API_URL = "https://script.google.com/macros/s/AKfycbwyHlDqGumNenEhW6w5iAcA2984E1AbnXOfemzaxPOgk8pqXKD-pg6zw4Rw6U3sk-tY/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let slideInterval = null;
let currentPage = 1;
let lastDataHash = "";

document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const modal = document.getElementById("winnerModal");

  if (input) {
    input.addEventListener("input", () => {
      clearBtn.style.display = input.value.trim() ? "block" : "none";
      performSearch();
    });
  }

  if (clearBtn && input) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.style.display = "none";
      performSearch();
      input.focus();
    });
  }

  if (modal) {
    modal.addEventListener("click", function(e) {
      if (e.target === modal) {
        closeWinnerModal();
      }
    });
  }

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      closeWinnerModal();
    }
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

    const response = await fetch(API_URL + "?time=" + Date.now(), {
      cache: "no-store"
    });

    const rawData = await response.json();

    const filteredData = rawData
      .filter(item => (item.luckyNo || "").toString().trim() !== "")
      .sort((a, b) => {
        const numA = parseInt((a.place || "").toString().match(/\d+/)?.[0] || 999);
        const numB = parseInt((b.place || "").toString().match(/\d+/)?.[0] || 999);
        return numA - numB;
      });

    const newHash = JSON.stringify(filteredData);

    if (newHash === lastDataHash) return;

    lastDataHash = newHash;
    allData = filteredData;

    currentPage = Math.min(
      currentPage,
      Math.ceil(allData.length / ROWS_PER_PAGE) || 1
    );

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
  if (!input) return;

  const keyword = input.value.trim().toLowerCase();

  if (keyword === "") {
    renderPage();
    renderPagination();
    return;
  }

  const filtered = allData.filter(item => {

    const luckyNo = (item.luckyNo || "").toString().toLowerCase();
    const winner = (item.winner || "").toString().toLowerCase();
    const company = (item.company || "").toString().toLowerCase();

    return (
      luckyNo.includes(keyword) ||
      winner.includes(keyword) ||
      company.includes(keyword)
    );

  });

  renderTable(filtered);

  const pagination = document.getElementById("pagination");
  if (pagination) pagination.innerHTML = "";
}

function renderPage() {

  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageData = allData.slice(start, start + ROWS_PER_PAGE);

  renderTable(pageData);
}

function renderTable(data) {

  const tbody = document.getElementById("winnerTable");
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="no-data">
          No data found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(item => {

    const index = allData.indexOf(item);

    return `
      <tr onclick="openWinnerModal(${index})">
        <td>
          <div class="place-badge">
            ${escapeHTML(item.place)}
          </div>
        </td>

        <td>
          ${escapeHTML(item.luckyNo)}
        </td>

        <td class="winner-name">
          ${escapeHTML(item.winner)}
        </td>

        <td>
          ${escapeHTML(item.company)}
        </td>
      </tr>
    `;

  }).join("");
}

function renderPagination() {

  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE);

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = "";

  html += `
    <button
      onclick="firstPage()"
      ${currentPage === 1 ? "disabled" : ""}>
      First Page
    </button>
  `;

  let startPage = Math.max(currentPage - 1, 1);
  let endPage = Math.min(startPage + 2, totalPages);

  if (endPage - startPage < 2 && startPage > 1) {
    startPage = Math.max(endPage - 2, 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button
        class="${i === currentPage ? "active" : ""}"
        onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button
      onclick="lastPage()"
      ${currentPage === totalPages ? "disabled" : ""}>
      Last Page
    </button>
  `;

  pagination.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderPage();
  renderPagination();
}

function firstPage() {
  currentPage = 1;
  renderPage();
  renderPagination();
}

function lastPage() {
  currentPage = Math.ceil(allData.length / ROWS_PER_PAGE) || 1;
  renderPage();
  renderPagination();
}

function openWinnerModal(index) {

  const item = allData[index];
  if (!item) return;

  const modalPlace = document.getElementById("modalPlace");
  const modalWinner = document.getElementById("modalWinner");
  const modalLuckyNo = document.getElementById("modalLuckyNo");
  const modalCompany = document.getElementById("modalCompany");
  const modalPrize = document.getElementById("modalPrize");
  const modalImage = document.getElementById("modalImage");

  modalPlace.textContent = item.place || "";
  modalWinner.textContent = item.winner || "";
  modalLuckyNo.textContent = "Lucky No : " + (item.luckyNo || "");
  modalCompany.textContent = "Company : " + (item.company || "");

  modalPrize.innerHTML =
    `<span class="prize-label">Prize :</span> ${escapeHTML(item.prize || "")}`;

  if (item.imageUrl && item.imageUrl.toString().trim() !== "") {
    modalImage.src = item.imageUrl;
    modalImage.style.display = "block";
  } else {
    modalImage.src = "";
    modalImage.style.display = "none";
  }

  document.getElementById("winnerModal").classList.add("show");
}

function closeWinnerModal() {

  const modal = document.getElementById("winnerModal");
  const img = document.getElementById("modalImage");

  if (modal) modal.classList.remove("show");

  if (img) {
    img.src = "";
  }
}

function playSlide() {

  if (slideInterval) clearInterval(slideInterval);

  slideInterval = setInterval(() => {

    const input = document.getElementById("searchInput");

    if (input && input.value.trim() !== "") return;

    const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE);

    if (totalPages <= 1) return;

    if (currentPage < totalPages) {
      currentPage++;
    } else {
      currentPage = 1;
    }

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

function openProjectorMode() {

  if (window.innerWidth <= 1024) {
    console.log("Fullscreen blocked for phone/tablet.");
    return;
  }

  const docEl = document.documentElement;

  if (!document.fullscreenElement && !document.webkitFullscreenElement) {

    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(console.error);
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    }

  } else {

    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }

  }
}

function handleFullscreenChange() {

  const isFullscreen =
    !!(document.fullscreenElement || document.webkitFullscreenElement);

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
