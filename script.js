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
   PROJECTOR FULLSCREEN MODE
========================= */

async function openProjectorMode(){

  /* Browser support check */
  if(!("getScreenDetails" in window)){

    alert(
      "Browser tak support automatic projector fullscreen.\n\n" +
      "Sila guna Google Chrome / Microsoft Edge terbaru."
    );

    return;

  }

  try{

    /* Detect screens */
    const screenDetails = await window.getScreenDetails();

    /* Cari second screen */
    const secondScreen = screenDetails.screens.find(
      screen => !screen.isPrimary
    );

    if(!secondScreen){

      alert("Second screen / projector tak dikesan.");
      return;

    }

    /* Window position dekat second screen */
    const features = `
      left=${secondScreen.availLeft},
      top=${secondScreen.availTop},
      width=${secondScreen.availWidth},
      height=${secondScreen.availHeight},
      menubar=no,
      toolbar=no,
      location=no,
      status=no,
      resizable=yes
    `.replace(/\s+/g, "");

    /* Open new window */
    const projectorWindow = window.open(
      "",
      "_blank",
      features
    );

    if(!projectorWindow){

      alert(
        "Popup blocked.\n\n" +
        "Please allow popup untuk website ni."
      );

      return;

    }

    /* Copy current HTML */
    projectorWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        ${document.head.innerHTML}

        <style>

          html,
          body{
            width:100%;
            height:100%;
            overflow:hidden !important;
            margin:0 !important;
            padding:0 !important;
            background:#000814 !important;
          }

          #projectorBtn,
          .control-buttons{
            display:none !important;
          }

          .container{
            max-width:100% !important;
            padding:25px !important;
          }

          .title{
            font-size:70px !important;
          }

          .sub-title{
            font-size:28px !important;
          }

          table{
            width:100% !important;
          }

          thead th{
            font-size:24px !important;
            padding:20px !important;
          }

          tbody td{
            font-size:22px !important;
            padding:18px !important;
          }

          .place-badge{
            width:60px !important;
            height:60px !important;
            font-size:20px !important;
          }

          .notice{
            font-size:24px !important;
          }

        </style>

      </head>

      <body>

        ${document.body.innerHTML}

      </body>
      </html>
    `);

    projectorWindow.document.close();

    /* Tunggu window fully loaded */
    projectorWindow.onload = async () => {

      try{

        /* TRUE FULLSCREEN */
        if(projectorWindow.document.documentElement.requestFullscreen){

          await projectorWindow.document.documentElement.requestFullscreen({
            screen: secondScreen
          });

        }

      }
      catch(err){

        console.log("Fullscreen blocked:", err);

      }

    };

  }
  catch(error){

    console.error(error);

    alert("Failed buka projector mode.");

  }

}

/* =========================
   CHECK SECOND SCREEN
========================= */

async function checkSecondScreen(){

  const projectorBtn = document.getElementById("projectorBtn");

  if(!projectorBtn){
    return;
  }

  /* Mobile / Tablet */
  if(window.innerWidth <= 1024){

    projectorBtn.style.display = "none";
    return;

  }

  /* Browser tak support */
  if(!('getScreenDetails' in window)){

    projectorBtn.style.display = "none";
    return;

  }

  try{

    const screenDetails = await window.getScreenDetails();

    const hasSecondScreen = screenDetails.screens.some(
      screen => !screen.isPrimary
    );

    projectorBtn.style.display =
      hasSecondScreen ? "inline-flex" : "none";

  }
  catch(error){

    projectorBtn.style.display = "none";

  }

}

/* =========================
   START
========================= */

loadData();

playSlide();

/* Refresh data background */
setInterval(loadData, 3000);
