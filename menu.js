function toggleReportMenu(){

  document
    .getElementById("reportSubmenu")
    .classList
    .toggle("show");

}

document.addEventListener("click", function(e){

  const dropdown =
    document.querySelector(".report-dropdown");

  if(
    dropdown &&
    !dropdown.contains(e.target)
  ){
    document
      .getElementById("reportSubmenu")
      .classList
      .remove("show");
  }

});
