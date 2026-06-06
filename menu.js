const REPORT_PASSWORD = "Admin-123";

let reportUnlocked = false;

function initReportMenu(){

  const btn = document.getElementById("reportBtn");
  const menu = document.getElementById("reportSubmenu");
  const dropdown = document.querySelector(".report-dropdown");

  if(!btn || !menu || !dropdown) return;

  btn.addEventListener("click", function(e){

    e.stopPropagation();

    if(!reportUnlocked){

      const pass = prompt("Enter Report Password:");

      if(pass !== REPORT_PASSWORD){
        alert("Wrong password!");
        return;
      }

      reportUnlocked = true;
    }

    menu.classList.toggle("show");

  });

  document.addEventListener("click", function(e){

    if(!dropdown.contains(e.target)){
      menu.classList.remove("show");
    }

  });
}

initReportMenu();
