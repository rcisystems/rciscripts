console.log("LF-EVENTS JS LOADED");
console.log("Before DOMContentLoaded hook");
console.log("Is L defined at load?", typeof L);

const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbxOi_KwTuf30pvE6vy4J6hWN1AUKNpxYpyQ0kHymjCD7RlxVC4MFxtTe4bos8jVeyQ/exec";

let map;
let markerCluster;
let eventsData = [];
let currentPage = 1;
const pageSize = 10;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded entered");
  setupMap();
  loadEvents();

  const formBtn = document.getElementById("openFormBtn");
  if (formBtn) {
    formBtn.addEventListener("click", () => {
      window.open(
        "https://docs.google.com/forms/d/e/1FAIpQLScvDuNqETs20kd0o0w3dhJrA-2Ek9bV8vD5QNJFfxPqzVyF9w/viewform?usp=dialog",
        "_blank"
      );
    });
  }
});

function setupMap() {
  map = L.map("map").setView([33.092, -95.484], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);

  document.getElementById("map-spinner").classList.add("hidden");
}

async function loadEvents() {
  try {
    document.getElementById("spinner").classList.remove("hidden");

    const res = await fetch(BACKEND_URL);
    const json = await res.json();

    eventsData = json?.events || [];
    console.log("Events loaded:", eventsData);

    renderPage(1);
    renderMarkers(eventsData);

    document.getElementById("spinner").classList.add("hidden");
  } catch (err) {
    console.error("Error loading events:", err);
  }
}

function renderMarkers(events) {
  markerCluster.clearLayers();

  events.forEach((ev) => {
    if (!ev.lat || !ev.lng) return;

    const marker = L.marker([ev.lat, ev.lng]);
    marker.bindPopup(`<strong>${ev.title}</strong><br>${ev.location}`);
    markerCluster.addLayer(marker);
  });
}

function renderPage(page) {
  currentPage = page;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = eventsData.slice(start, end);

  const listEl = document.getElementById("events-list");
  listEl.innerHTML = "";
  listEl.classList.remove("hidden");

  for (const ev of items) {
    const div = document.createElement("div");
    div.className = "event-card";
    div.innerHTML = `
      <h3>${ev.title}</h3>
      <p><strong>Date:</strong> ${ev.start} – ${ev.end}</p>
      <p><strong>Location:</strong> ${ev.location}</p>
      <p>${ev.description}</p>
      ${ev.registration ? `<a href="${ev.registration}" target="_blank">Register</a>` : ""}
    `;
    listEl.appendChild(div);
  }

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(eventsData.length / pageSize);
  const pag = document.getElementById("pagination");
  pag.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
