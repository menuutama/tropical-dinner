```js
const API_URL =
"https://script.google.com/macros/s/AKfycbymH8u2HPYuTayguREV8qBlyO1a8zZJzy15QQgScxUpbmL5Y5zA4QwD8BsjSiHg86Di/exec";

const ROWS_PER_PAGE = 10;

let allData = [];
let currentPage = 1;
let autoSlide = null;
let lastDataHash = "";

/* =========================
   SAFE TEXT
========================= */

function escapeHTML(text){

  if(text == null) return "";

  return text
    .toString()
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}

/* =========================
   LOAD DATA
========================= */

async function loadData(){

  try{

    const response = await fetch(API_URL);

    if(!response.ok){
      throw new Error("API ERROR");
    }

    const rawData = await response.json();

    const filteredData = rawData
      .filter(item => {
        return (item.luckyNo || "")
          .toString()
          .trim() !== "";
      })
      .sort((a,b) => {

        const matchA =
          (a.place || "").match(/\d+/);

        const matchB =
          (b.place || "").match(/\d+/);

        const numA =
          parseInt(matchA ? matchA[0] : 999);

        const numB =
          parseInt(matchB ? matchB[0] : 999);

        return numA - numB;

      });

    const newHash =
      JSON.stringify(filteredData);

    if(newHash === lastDataHash){
      return;
    }

    lastDataHash = newHash;

    allData = filteredData;

    const totalPages =
      Math.ceil(allData.length / ROWS_PER_PAGE);

    if(currentPage > totalPages){
      currentPage = totalPages || 1;
    }

    renderPage();
    renderPagination();

  }
  catch(error){

    console.error(
      "FETCH ERROR:",
      error
    );

  }

}

/* =========================
   RENDER TABLE
========================= */

function renderPage(){

  const tbody =
    document.getElementById("winnerTable");

  if(!tbody) return;

  const start =
    (currentPage - 1) * ROWS_PER_PAGE;

  const pageData =
    allData.slice(
      start,
      start + ROWS_PER_PAGE
    );

  tbody.innerHTML = pageData.map(item => `

    <tr>

      <td>
        <div class="place-badge">
          ${escapeHTML(item.place)}
        </div>
      </td>

      <td>
        ${escapeHTML(item.luckyNo)}
      </td>

      <td>
        ${escapeHTML(item.winner)}
      </td>

      <td>
        ${escapeHTML(item.company)}
      </td>

      <td>
        ${escapeHTML(item.prize)}
      </td>

    </tr>

  `).join("");

}

/* =========================
   PAGINATION
========================= */

function renderPagination(){

  const pagination =
    document.getElementById("pagination");

  if(!pagination) return;

  const totalPages =
    Math.ceil(allData.length / ROWS_PER_PAGE);

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

  let startPage =
    Math.max(currentPage - 1, 1);

  let endPage =
    Math.min(startPage + 2, totalPages);

  if(endPage - startPage < 2){

    startPage =
      Math.max(endPage - 2, 1);

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

  currentPage =
    Math.ceil(allData.length / ROWS_PER_PAGE);

  renderPage();
  renderPagination();

}

/* =========================
   AUTO SLIDE
========================= */

function nextAutoPage(){

  const totalPages =
    Math.ceil(allData.length / ROWS_PER_PAGE);

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

    autoSlide = null;

  }

}

/* =========================
   FULLSCREEN
========================= */

function openProjectorMode(){

  if(!document.fullscreenElement){

    document.documentElement
      .requestFullscreen()
      .catch(err => {

        console.error(err);

      });

  }
  else{

    document.exitFullscreen();

  }

}

document.addEventListener(
  "fullscreenchange",
  () => {

    if(document.fullscreenElement){

      document.body.classList.add(
        "fullscreen-active"
      );

    }
    else{

      document.body.classList.remove(
        "fullscreen-active"
      );

    }

  }
);

/* =========================
   START
========================= */

loadData();

playSlide();

/* CHECK UPDATE SETIAP 10 SAAT */
setInterval(loadData, 10000);
```
