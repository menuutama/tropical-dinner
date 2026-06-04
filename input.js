const API_URL = "https://script.google.com/macros/s/AKfycbxusRPIiXwg1B_39miCIF8Nh6t8qR3guFbLQsBuMGFaknA6tSlTXJ-uVFP0PM-XNb2j/exec";

let allData = [];
let currentPage = 1;
const rowsPerPage = 10;

document.addEventListener("DOMContentLoaded", function(){
  const luckyInput = document.getElementById("luckyNo");
  const clearBtn = document.getElementById("clearInputBtn");
  const addBtn = document.getElementById("addBtn");

  loadData();

  luckyInput.addEventListener("input", function(){
    validateLuckyInput();
    toggleClearBtn();
    filterFromLuckyInput();
    toggleAddButton();
  });

  luckyInput.addEventListener("keypress", function(e){
    if(e.key === "Enter"){
      if(addBtn.style.display !== "none"){
        addItem();
      }
    }
  });

  clearBtn.addEventListener("click", clearInput);
  addBtn.addEventListener("click", addItem);

  toggleAddButton();
});

function escapeHTML(text){
  if(text == null) return "";
  return text.toString()
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function sortData(data){
  return data.sort((a,b)=>{
    const numA = parseInt((a.place || "").match(/\d+/) ? (a.place || "").match(/\d+/)[0] : 999,10);
    const numB = parseInt((b.place || "").match(/\d+/) ? (b.place || "").match(/\d+/)[0] : 999,10);
    return numA - numB;
  });
}

async function loadData(){
  try{
    const res = await fetch(API_URL);
    const data = await res.json();

    allData = sortData(data);
    renderTable();
    toggleAddButton();

  }catch(err){
    console.error("LOAD ERROR:",err);
  }
}

function filterFromLuckyInput(){
  const keyword = document.getElementById("luckyNo").value.trim();

  if(keyword === ""){
    renderTable();
    return;
  }

  const filtered = allData.filter(item=>{
    const luckyNo = (item.luckyNo || "").toString();
    return luckyNo.includes(keyword);
  });

  renderRows(filtered);
  document.getElementById("pagination").innerHTML = "";
}

function toggleAddButton(){
  const luckyNo = document.getElementById("luckyNo").value.trim();
  const addBtn = document.getElementById("addBtn");

  const alreadyAdded = allData.some(item=>{
    return String(item.luckyNo || "").trim() === luckyNo;
  });

  if(luckyNo.length === 4 && !alreadyAdded){
    addBtn.style.display = "inline-block";
  }else{
    addBtn.style.display = "none";
  }
}

function renderTable(){
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedItems = allData.slice(startIndex,endIndex);

  if(paginatedItems.length === 0 && currentPage > 1){
    currentPage--;
    renderTable();
    return;
  }

  renderRows(paginatedItems);
  setupPagination();
}

function renderRows(data){
  const tbody = document.getElementById("winnerTable");

  tbody.innerHTML = data.map(item=>`
    <tr>
      <td>${escapeHTML(item.place || "")}</td>
      <td>${escapeHTML(item.luckyNo || "")}</td>
      <td>${escapeHTML(item.winner || "")}</td>
      <td>${escapeHTML(item.company || "")}</td>
      <td>${escapeHTML(item.prize || "")}</td>
      <td>
        <button class="btn-edit" onclick="editRow('${escapeHTML(item.row || "")}')">Edit</button>
        <button class="btn-danger" onclick="deleteRow('${escapeHTML(item.row || "")}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function setupPagination(){
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  const totalPages = Math.ceil(allData.length / rowsPerPage);
  if(totalPages <= 1) return;

  const firstBtn = document.createElement("button");
  firstBtn.className = "pagination-btn";
  firstBtn.innerText = "First Page";
  firstBtn.disabled = currentPage === 1;
  firstBtn.onclick = function(){
    currentPage = 1;
    renderTable();
  };
  paginationContainer.appendChild(firstBtn);

  let startPage = currentPage - 1;
  let endPage = currentPage + 1;

  if(startPage < 1){
    startPage = 1;
    endPage = Math.min(3,totalPages);
  }

  if(endPage > totalPages){
    endPage = totalPages;
    startPage = Math.max(1,totalPages - 2);
  }

  for(let i = startPage; i <= endPage; i++){
    const pageBtn = document.createElement("button");
    pageBtn.className = `pagination-btn ${currentPage === i ? "active" : ""}`;
    pageBtn.innerText = i;
    pageBtn.onclick = function(){
      currentPage = i;
      renderTable();
    };
    paginationContainer.appendChild(pageBtn);
  }

  const lastBtn = document.createElement("button");
  lastBtn.className = "pagination-btn";
  lastBtn.innerText = "Last Page";
  lastBtn.disabled = currentPage === totalPages;
  lastBtn.onclick = function(){
    currentPage = totalPages;
    renderTable();
  };
  paginationContainer.appendChild(lastBtn);
}

async function addItem(){
  const luckyNoInput = document.getElementById("luckyNo");
  const addBtn = document.getElementById("addBtn");
  const luckyNo = luckyNoInput.value.trim();

  if(!luckyNo) return alert("Enter lucky number");

  if(luckyNo.length !== 4){
    luckyNoInput.classList.add("shake-input");
    setTimeout(()=>{
      luckyNoInput.classList.remove("shake-input");
    },300);
    return;
  }

  addBtn.disabled = true;
  addBtn.innerText = "Adding...";

  try{
    const res = await fetch(`${API_URL}?action=add&luckyNo=${encodeURIComponent(luckyNo)}`);
    const result = await res.json();

    if(result.status === "not_in_winner_table"){
      luckyNoInput.classList.add("shake-input");
      setTimeout(()=>{
        luckyNoInput.classList.remove("shake-input");
      },300);

      alert("Nombor ini tidak tersenarai dalam winnerTable B2:B!");
      clearInput();
    }

    else if(result.status === "not_found"){
      alert("Lucky Draw No. Not Found");
      clearInput();
    }

    else if(result.status === "duplicate"){
      alert("Nombor bertuah ini sudah pun didaftarkan!");
      clearInput();
    }

    else if(result.status === "success"){
      luckyNoInput.value = "";
      toggleClearBtn();

      if(result.data){
        allData = allData.filter(item=>String(item.row) !== String(result.data.row));
        allData.push(result.data);
        allData = sortData(allData);
        renderTable();
      }else{
        await loadData();
      }
    }

    else if(result.status === "error"){
      alert(result.message);
      clearInput();
    }

  }catch(error){
    console.error("Ralat komunikasi API:",error);
  }finally{
    addBtn.disabled = false;
    addBtn.innerText = "Add";
    toggleAddButton();
  }
}

function validateLuckyInput(){
  const inputField = document.getElementById("luckyNo");

  if(inputField.value.length >= 5){
    inputField.classList.add("shake-input");
    inputField.value = inputField.value.slice(0,4);

    setTimeout(()=>{
      inputField.classList.remove("shake-input");
    },300);
  }

  if(/[^\d]/.test(inputField.value)){
    inputField.classList.add("shake-input");
    inputField.value = inputField.value.replace(/[^\d]/g,"");

    setTimeout(()=>{
      inputField.classList.remove("shake-input");
    },300);
  }
}

function toggleClearBtn(){
  const inputVal = document.getElementById("luckyNo").value;
  document.getElementById("clearInputBtn").style.display = inputVal.length > 0 ? "block" : "none";
}

function clearInput(){
  const inputField = document.getElementById("luckyNo");
  inputField.value = "";
  inputField.focus();

  toggleClearBtn();
  toggleAddButton();
  renderTable();
}

async function deleteRow(row){
  if(!confirm("Adakah anda pasti mahu memadam baris ini?")) return;

  try{
    const res = await fetch(`${API_URL}?action=delete&row=${row}`);
    const result = await res.json();

    if(result.status === "success"){
      allData = allData.filter(item=>String(item.row) !== String(row));
      filterFromLuckyInput();
      toggleAddButton();
    }else{
      alert("Gagal memadam data di server.");
    }

  }catch(error){
    console.error("Error deleting:",error);
  }
}

async function editRow(row){
  let modal = document.getElementById("custom-edit-modal");

  if(!modal){
    modal = document.createElement("div");
    modal.id = "custom-edit-modal";
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;";

    modal.innerHTML = `
      <div id="modal-box" style="background:white; padding:20px; border-radius:8px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.2); width:280px;">
        <h4 style="margin-top:0;">New Lucky Number:</h4>
        <input type="text" id="modal-input" style="width:80%; padding:10px; font-size:18px; text-align:center; margin-bottom:15px; border:1px solid #ccc; border-radius:4px; outline:none;">
        <br>
        <button id="modal-submit" style="padding:8px 15px; margin-right:10px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">Simpan</button>
        <button id="modal-cancel" style="padding:8px 15px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Batal</button>
      </div>
    `;

    document.body.appendChild(modal);
  }

  const modalBox = document.getElementById("modal-box");
  const inputField = document.getElementById("modal-input");
  const btnSubmit = document.getElementById("modal-submit");
  const btnCancel = document.getElementById("modal-cancel");

  const currentItem = allData.find(item=>String(item.row) === String(row));

  inputField.value = currentItem ? currentItem.luckyNo : "";
  modal.style.display = "flex";
  inputField.focus();
  inputField.select();

  function triggerModalShake(){
    modalBox.classList.add("shake-input");
    setTimeout(()=>{
      modalBox.classList.remove("shake-input");
    },300);
  }

  inputField.oninput = function(e){
    let value = e.target.value;

    if(/[^\d]/.test(value)){
      triggerModalShake();
      value = value.replace(/[^\d]/g,"");
    }

    if(value.length >= 5){
      triggerModalShake();
      value = value.slice(0,4);
    }

    e.target.value = value;
  };

  return new Promise((resolve)=>{
    const saveData = async function(){
      const newNo = inputField.value.trim();

      if(!newNo){
        triggerModalShake();
        alert("Enter lucky number");
        inputField.focus();
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerText = "Saving...";

      try{
        const res = await fetch(`${API_URL}?action=edit&row=${row}&luckyNo=${encodeURIComponent(newNo)}`);
        const result = await res.json();

        if(result.status === "not_in_winner_table"){
          triggerModalShake();
          alert("Nombor ini tidak tersenarai dalam winnerTable B2:B!");
          inputField.focus();
          inputField.select();
        }

        else if(result.status === "not_found"){
          triggerModalShake();
          alert("Lucky Draw No. Not Found");
          inputField.focus();
          inputField.select();
        }

        else if(result.status === "duplicate"){
          triggerModalShake();
          alert("Nombor bertuah ini sudah pun didaftarkan!");
          inputField.focus();
          inputField.select();
        }

        else if(result.status === "error"){
          triggerModalShake();
          alert(result.message);
          inputField.focus();
          inputField.select();
        }

        else if(result.status === "success"){
          modal.style.display = "none";

          const index = allData.findIndex(item=>String(item.row) === String(row));

          if(index !== -1){
            if(result.data){
              allData[index] = {...allData[index],...result.data};
            }else{
              allData[index].luckyNo = newNo;
            }

            allData = sortData(allData);
            filterFromLuckyInput();
            toggleAddButton();
          }

          resolve();
        }

      }catch(error){
        console.error("Error editing:",error);
      }finally{
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Simpan";
      }
    };

    btnSubmit.onclick = saveData;

    inputField.onkeydown = function(e){
      if(e.key === "Enter"){
        e.preventDefault();
        saveData();
      }
    };

    btnCancel.onclick = function(){
      modal.style.display = "none";
      resolve();
    };
  });
}
