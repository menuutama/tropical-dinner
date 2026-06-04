const API_URL = "https://script.google.com/macros/s/AKfycbxusRPIiXwg1B_39miCIF8Nh6t8qR3guFbLQsBuMGFaknA6tSlTXJ-uVFP0PM-XNb2j/exec";

let allData = [];
let currentPage = 1;
const rowsPerPage = 10;

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  document.getElementById("addBtn").addEventListener("click", addItem);
  document.getElementById("clearInputBtn").addEventListener("click", clearInput);

  const luckyInput = document.getElementById("luckyNo");

  luckyInput.addEventListener("input", () => {
    validateLuckyInput();
    filterFromLuckyInput();
    toggleClearBtn();
    toggleAddButton();
  });

  luckyInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const addBtn = document.getElementById("addBtn");
      if (addBtn.style.display !== "none") addItem();
    }
  });

  toggleAddButton();
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

function sortData(data) {
  return data.sort((a, b) => {
    const numA = parseInt((a.place || "").match(/\d+/)?.[0] || 999, 10);
    const numB = parseInt((b.place || "").match(/\d+/)?.[0] || 999, 10);
    return numA - numB;
  });
}

async function loadData() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    allData = sortData(data);
    renderTable();
    toggleAddButton();

  } catch (err) {
    console.error("LOAD ERROR:", err);
  }
}

function filterFromLuckyInput() {
  const keyword = document.getElementById("luckyNo").value.trim();

  if (keyword === "") {
    renderTable();
    return;
  }

  const filtered = allData.filter(item =>
    String(item.luckyNo || "").includes(keyword)
  );

  renderRows(filtered);
  document.getElementById("pagination").innerHTML = "";
}

function toggleAddButton() {
  const luckyNo = document.getElementById("luckyNo").value.trim();
  const addBtn = document.getElementById("addBtn");

  const alreadyAdded = allData.some(item =>
    String(item.luckyNo || "").trim() === luckyNo
  );

  if (luckyNo === "" || alreadyAdded) {
    addBtn.style.display = "none";
  } else {
    addBtn.style.display = "inline-block";
  }
}

function renderTable() {
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = allData.slice(startIndex, startIndex + rowsPerPage);

  if (paginatedItems.length === 0 && currentPage > 1) {
    currentPage--;
    renderTable();
    return;
  }

  renderRows(paginatedItems);
  setupPagination();
}

function renderRows(data) {
  const tbody = document.getElementById("winnerTable");

  tbody.innerHTML = data.map(item => `
    <tr>
      <td>${escapeHTML(item.place)}</td>
      <td>${escapeHTML(item.luckyNo)}</td>
      <td>${escapeHTML(item.winner)}</td>
      <td>${escapeHTML(item.company)}</td>
      <td>${escapeHTML(item.prize)}</td>
      <td>
        <button class="btn-edit" onclick="editRow('${item.row}')">Edit</button>
        <button class="btn-danger" onclick="deleteRow('${item.row}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function setupPagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const totalPages = Math.ceil(allData.length / rowsPerPage);
  if (totalPages <= 1) return;

  const firstBtn = document.createElement("button");
  firstBtn.className = "pagination-btn";
  firstBtn.innerText = "First Page";
  firstBtn.disabled = currentPage === 1;
  firstBtn.onclick = () => {
    currentPage = 1;
    renderTable();
  };
  pagination.appendChild(firstBtn);

  let startPage = Math.max(1, currentPage - 1);
  let endPage = Math.min(totalPages, currentPage + 1);

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.className = `pagination-btn ${currentPage === i ? "active" : ""}`;
    btn.innerText = i;
    btn.onclick = () => {
      currentPage = i;
      renderTable();
    };
    pagination.appendChild(btn);
  }

  const lastBtn = document.createElement("button");
  lastBtn.className = "pagination-btn";
  lastBtn.innerText = "Last Page";
  lastBtn.disabled = currentPage === totalPages;
  lastBtn.onclick = () => {
    currentPage = totalPages;
    renderTable();
  };
  pagination.appendChild(lastBtn);
}

async function addItem() {
  const luckyNoInput = document.getElementById("luckyNo");
  const addBtn = document.getElementById("addBtn");
  const luckyNo = luckyNoInput.value.trim();

  if (!luckyNo) return;

  addBtn.disabled = true;
  addBtn.innerText = "Adding...";

  try {
    const res = await fetch(`${API_URL}?action=add&luckyNo=${encodeURIComponent(luckyNo)}`);
    const result = await res.json();

    if (result.status === "success") {
      clearInput();
      await loadData();

    } else if (result.status === "duplicate") {
      alert("Nombor bertuah ini sudah pun didaftarkan!");
      clearInput();

    } else if (result.status === "not_found") {
      alert("Lucky Draw No. Not Found");
      clearInput();

    } else if (result.status === "not_in_winner_table") {
      alert("Nombor ini tidak tersenarai dalam winnerTable B2:B!");
      clearInput();

    } else {
      alert(result.message || "Ralat berlaku");
      clearInput();
    }

  } catch (error) {
    console.error("Ralat API:", error);

  } finally {
    addBtn.disabled = false;
    addBtn.innerText = "Add";
    toggleAddButton();
  }
}

function validateLuckyInput() {
  const input = document.getElementById("luckyNo");

  if (/[^\d]/.test(input.value)) {
    input.classList.add("shake-input");
    input.value = input.value.replace(/[^\d]/g, "");
    setTimeout(() => input.classList.remove("shake-input"), 300);
  }

  if (input.value.length > 4) {
    input.classList.add("shake-input");
    input.value = input.value.slice(0, 4);
    setTimeout(() => input.classList.remove("shake-input"), 300);
  }
}

function toggleClearBtn() {
  const inputVal = document.getElementById("luckyNo").value;
  document.getElementById("clearInputBtn").style.display = inputVal.length > 0 ? "block" : "none";
}

function clearInput() {
  const input = document.getElementById("luckyNo");
  input.value = "";
  input.focus();

  toggleClearBtn();
  toggleAddButton();
  renderTable();
}

async function deleteRow(row) {
  if (!confirm("Adakah anda pasti mahu memadam baris ini?")) return;

  try {
    const res = await fetch(`${API_URL}?action=delete&row=${row}`);
    const result = await res.json();

    if (result.status === "success") {
      allData = allData.filter(item => String(item.row) !== String(row));
      filterFromLuckyInput();
      toggleAddButton();
    } else {
      alert("Gagal memadam data di server.");
    }

  } catch (error) {
    console.error("Error deleting:", error);
  }
}

async function editRow(row) {
  const currentItem = allData.find(item => String(item.row) === String(row));
  const newNo = prompt("New Lucky Number:", currentItem ? currentItem.luckyNo : "");

  if (newNo === null) return;
  if (!newNo.trim()) return alert("Enter lucky number");

  try {
    const res = await fetch(`${API_URL}?action=edit&row=${row}&luckyNo=${encodeURIComponent(newNo.trim())}`);
    const result = await res.json();

    if (result.status === "success") {
      await loadData();
      filterFromLuckyInput();
    } else {
      alert(result.message || "Gagal edit data.");
    }

  } catch (error) {
    console.error("Error editing:", error);
  }
    }    const numA = parseInt((a.place || "").match(/\d+/)?.[0] || 999,10);
    const numB = parseInt((b.place || "").match(/\d+/)?.[0] || 999,10);
    return numA - numB;
  });
}

async function loadData(){
  try{
    const res = await fetch(API_URL);
    const data = await res.json();
    allData = sortData(data);
    renderTable();
  }catch(err){
    console.error("LOAD ERROR:",err);
  }
}

function performSearch(){
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const keyword = input.value.trim().toLowerCase();

  clearBtn.style.display = keyword ? "block" : "none";

  if(keyword === ""){
    renderTable();
    return;
  }

  const filtered = allData.filter(item=>{
    return (
      String(item.luckyNo || "").toLowerCase().includes(keyword) ||
      String(item.winner || "").toLowerCase().includes(keyword) ||
      String(item.company || "").toLowerCase().includes(keyword)
    );
  });

  renderRows(filtered, false);
  document.getElementById("pagination").innerHTML = "";
}

function renderTable(){
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = allData.slice(startIndex, startIndex + rowsPerPage);

  if(paginatedItems.length === 0 && currentPage > 1){
    currentPage--;
    renderTable();
    return;
  }

  renderRows(paginatedItems, true);
  setupPagination();
}

function renderRows(data, showAction){
  const tbody = document.getElementById("winnerTable");

  tbody.innerHTML = data.map(item=>`
    <tr>
      <td>${escapeHTML(item.place)}</td>
      <td>${escapeHTML(item.luckyNo)}</td>
      <td>${escapeHTML(item.winner)}</td>
      <td>${escapeHTML(item.company)}</td>
      <td>${escapeHTML(item.prize)}</td>
      <td>
        ${showAction ? `
          <button class="btn-edit" onclick="editRow('${item.row}')">Edit</button>
          <button class="btn-danger" onclick="deleteRow('${item.row}')">Delete</button>
        ` : ""}
      </td>
    </tr>
  `).join("");
}

function setupPagination(){
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const totalPages = Math.ceil(allData.length / rowsPerPage);
  if(totalPages <= 1) return;

  const firstBtn = document.createElement("button");
  firstBtn.className = "pagination-btn";
  firstBtn.innerText = "First Page";
  firstBtn.disabled = currentPage === 1;
  firstBtn.onclick = () => {
    currentPage = 1;
    renderTable();
  };
  pagination.appendChild(firstBtn);

  let startPage = Math.max(1,currentPage - 1);
  let endPage = Math.min(totalPages,currentPage + 1);

  for(let i = startPage; i <= endPage; i++){
    const btn = document.createElement("button");
    btn.className = `pagination-btn ${currentPage === i ? "active" : ""}`;
    btn.innerText = i;
    btn.onclick = () => {
      currentPage = i;
      renderTable();
    };
    pagination.appendChild(btn);
  }

  const lastBtn = document.createElement("button");
  lastBtn.className = "pagination-btn";
  lastBtn.innerText = "Last Page";
  lastBtn.disabled = currentPage === totalPages;
  lastBtn.onclick = () => {
    currentPage = totalPages;
    renderTable();
  };
  pagination.appendChild(lastBtn);
}

async function addItem(){
  const luckyNoInput = document.getElementById("luckyNo");
  const addBtn = document.getElementById("addBtn");
  const luckyNo = luckyNoInput.value.trim();

  if(!luckyNo) return alert("Enter lucky number");

  addBtn.disabled = true;
  addBtn.innerText = "Adding...";

  try{
    const res = await fetch(`${API_URL}?action=add&luckyNo=${encodeURIComponent(luckyNo)}`);
    const result = await res.json();

    if(result.status === "success"){
      clearInput();
      await loadData();
    }else if(result.status === "duplicate"){
      alert("Nombor bertuah ini sudah pun didaftarkan!");
      clearInput();
    }else if(result.status === "not_found"){
      alert("Lucky Draw No. Not Found");
      clearInput();
    }else{
      alert(result.message || "Ralat berlaku");
      clearInput();
    }
  }catch(error){
    console.error("Ralat API:",error);
  }finally{
    addBtn.disabled = false;
    addBtn.innerText = "Add";
  }
}

function validateLuckyInput(e){
  const input = e.target;

  if(/[^\d]/.test(input.value)){
    input.classList.add("shake-input");
    input.value = input.value.replace(/[^\d]/g,"");
    setTimeout(()=>input.classList.remove("shake-input"),300);
  }

  if(input.value.length > 4){
    input.classList.add("shake-input");
    input.value = input.value.slice(0,4);
    setTimeout(()=>input.classList.remove("shake-input"),300);
  }
}

function toggleClearBtn(){
  const inputVal = document.getElementById("luckyNo").value;
  document.getElementById("clearInputBtn").style.display = inputVal.length > 0 ? "block" : "none";
}

function clearInput(){
  const input = document.getElementById("luckyNo");
  input.value = "";
  input.focus();
  toggleClearBtn();
}

async function deleteRow(row){
  if(!confirm("Adakah anda pasti mahu memadam baris ini?")) return;

  try{
    const res = await fetch(`${API_URL}?action=delete&row=${row}`);
    const result = await res.json();

    if(result.status === "success"){
      allData = allData.filter(item => String(item.row) !== String(row));
      renderTable();
    }else{
      alert("Gagal memadam data di server.");
    }
  }catch(error){
    console.error("Error deleting:",error);
  }
}

async function editRow(row){
  const currentItem = allData.find(item => String(item.row) === String(row));
  const newNo = prompt("New Lucky Number:", currentItem ? currentItem.luckyNo : "");

  if(newNo === null) return;
  if(!newNo.trim()) return alert("Enter lucky number");

  try{
    const res = await fetch(`${API_URL}?action=edit&row=${row}&luckyNo=${encodeURIComponent(newNo.trim())}`);
    const result = await res.json();

    if(result.status === "success"){
      await loadData();
    }else{
      alert(result.message || "Gagal edit data.");
    }
  }catch(error){
    console.error("Error editing:",error);
  }
}
