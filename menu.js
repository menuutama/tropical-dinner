const REPORT_PASSWORD = "Admin-123";

let reportUnlocked = false;

function initReportMenu(){

  const btn = document.getElementById("reportBtn");
  const menu = document.getElementById("reportSubmenu");
  const dropdown = document.querySelector(".report-dropdown");

  const modal = document.getElementById("reportPasswordModal");
  const passwordInput = document.getElementById("reportPasswordInput");
  const loginBtn = document.getElementById("reportLoginBtn");
  const cancelBtn = document.getElementById("reportCancelBtn");
  const errorText = document.getElementById("reportPasswordError");

  if(!btn || !menu || !dropdown) return;

  btn.addEventListener("click", function(e){

    e.stopPropagation();

    if(!reportUnlocked){
      openPasswordModal();
      return;
    }

    menu.classList.toggle("show");

  });

  function openPasswordModal(){

    modal.classList.add("show");
    passwordInput.value = "";
    errorText.textContent = "";

    setTimeout(function(){
      passwordInput.focus();
    },100);

  }

  function closePasswordModal(){

    modal.classList.remove("show");
    passwordInput.value = "";
    errorText.textContent = "";

  }

  function checkPassword(){

    const pass = passwordInput.value.trim();

    if(pass !== REPORT_PASSWORD){
      errorText.textContent = "Wrong password!";
      passwordInput.value = "";
      passwordInput.focus();
      return;
    }

    reportUnlocked = true;

    closePasswordModal();

    menu.classList.add("show");

  }

  loginBtn.addEventListener("click", function(e){
    e.stopPropagation();
    checkPassword();
  });

  passwordInput.addEventListener("keydown", function(e){
    if(e.key === "Enter"){
      checkPassword();
    }
  });

  cancelBtn.addEventListener("click", function(e){
    e.stopPropagation();
    closePasswordModal();
  });

  modal.addEventListener("click", function(e){
    if(e.target === modal){
      closePasswordModal();
    }
  });

  const links = menu.querySelectorAll("a[data-url]");

  links.forEach(function(link){

    link.addEventListener("click", function(e){

      e.preventDefault();
      e.stopPropagation();

      const url = this.getAttribute("data-url");

      openReportWindow(url);

      menu.classList.remove("show");

    });

  });

  document.addEventListener("click", function(e){

    if(!dropdown.contains(e.target)){
      menu.classList.remove("show");
    }

  });

}

function openReportWindow(url){

  const w = screen.availWidth - 100;
  const h = screen.availHeight - 100;

  const popup = window.open(
    "about:blank",
    "_blank",
    `width=${w},height=${h},left=50,top=20,resizable=yes,scrollbars=yes`
  );

  if(!popup){
    alert("Popup blocked. Please allow popup for this website.");
    return;
  }

  popup.document.open();
  popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report</title>
      <style>
        html,body{
          margin:0;
          padding:0;
          width:100%;
          height:100%;
          overflow:hidden;
          background:#fff;
        }

        iframe{
          width:100%;
          height:100%;
          border:none;
        }
      </style>
    </head>
    <body>
      <iframe src="${url}"></iframe>
    </body>
    </html>
  `);
  popup.document.close();

}

initReportMenu();
