// 1. Selecția elementelor
const titluPagina = document.getElementById("titlu");
const butonActiune = document.getElementById("btn-interactiv");
const paragrafMesaj = document.getElementById("mesaj");

// 2. Definirea funcției de execuție
function schimbaContinutul() {
  titluPagina.textContent = "JavaScript a fost activat!";
  titluPagina.style.color = "#2ecc71"; // Schimbă culoarea în verde
  paragrafMesaj.textContent =
    "Acest text a fost modificat dinamic fără refresh.";

  console.log("Interacțiune detectată: Conținutul a fost actualizat.");
}

// 3. Atașarea evenimentului
butonActiune.addEventListener("click", schimbaContinutul);
