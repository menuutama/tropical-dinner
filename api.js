/* =========================================================
   TROPICAL DINNER 2026 - GLOBAL API CONFIG
   Tukar link API dekat file ni sahaja.
   Semua page lain akan baca API dari sini.
========================================================= */

window.TROPICAL_API_URL = "https://script.google.com/macros/s/AKfycbxn-xEA102rhPCeNRRp7x0yMAeAWI48w7LoL7zZs-eh0Ky6XDi9wX3yrOUwzUFQH14U/exec";

// Winner display guest baca JSON statik dari GitHub Pages.
// Kalau winner.json duduk folder root tropical-dinner, biar macam ni.
window.TROPICAL_WINNER_JSON_URL = "winner.json";

// Refresh display winner guest.
// 10000 = 10 saat. Boleh tukar 15000 kalau internet venue kurang stabil.
window.TROPICAL_GUEST_REFRESH_MS = 10000;

// Collection page auto refresh.
// 10000 = 10 saat. Jangan letak 3000 supaya API tak banyak kena panggil.
window.TROPICAL_COLLECT_REFRESH_MS = 10000;
