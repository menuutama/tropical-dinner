const REPORT_PASSWORD = "Admin-123";

let reportUnlocked = false;

function toggleReportMenu(){

  const menu = document.getElementById("reportSubmenu");

  if(!menu) return;

  if(!reportUnlocked){

    const pass = prompt("Enter Report Password:");

    if(pass !== REPORT_PASSWORD){
      alert("Wrong password!");
      return;
    }

    reportUnlocked = true;
  }

  menu.classList.toggle("show");
}

document.addEventListener("click", function(e){

  const dropdown = document.querySelector(".report-dropdown");
  const menu = document.getElementById("reportSubmenu");

  if(dropdown && menu && !dropdown.contains(e.target)){
    menu.classList.remove("show");
  }

});
