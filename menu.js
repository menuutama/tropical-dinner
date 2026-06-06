function toggleReportMenu(){
  const menu = document.getElementById("reportSubmenu");

  if(menu){
    menu.classList.toggle("show");
  }
}

document.addEventListener("click", function(e){
  const dropdown = document.querySelector(".report-dropdown");
  const menu = document.getElementById("reportSubmenu");

  if(dropdown && menu && !dropdown.contains(e.target)){
    menu.classList.remove("show");
  }
});
