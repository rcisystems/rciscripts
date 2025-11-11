/******************************************************************
 * LF-EVENTS.JS — Hydration-Safe, Debounced, Animated, Leaflet Map
 ******************************************************************/

console.log("LF-EVENTS JS LOADED");
console.log("Before DOMContentLoaded hook");

// =========================
// Debounce Utility
// =========================
function debounce(fn, delay = 250) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// =========================
// DOM REFERENCES
// =========================
let map;
let markerCluster;

const searchInput = document.getElementById("searchInput");
const locationFilter = document.getElementById("locationFilter");
const dateFilter = document.getElementById("dateFilter");

const eventsList = document.getElementById("events-list");
const pagination = document.getElementById("pagination");

const mapSpinner = document.getElementById("map-spinner");
const spinner = document.getElementById("spinner");

console.log("Is L defined at load?", typeof L !== "undefined" ? L : "NO");

// =====================================================
// SAFE HYDRATION DELAY: Prevent hydration mismatches
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Registering hydration-safe init…");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      console.log("Hydration safe-frame reached — initializing map+events");
      init();
    });
  });
});

function init() {
  console.log("Init running…");
  setupMap();
  loadEvents();

  // Debounced search
  searchInput.addEventListener("input", debounce(applyFilters, 250));
  locationFilter.addEventListener("change", debounce(applyFilters, 250));
  dateFilter.addEventListener("change", debounce(applyFilters, 250));
}

// =====================================================
// MAP SETUP
// =====================================================
function setupMap() {
  console.log("Setting up leaflet map…");

  map = L.map("map", { zoomControl: true }).setView([32.8, -96.8], 6);

  const tileLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  );

  tileLayer.addTo(map);

  // Hide spinner when tiles done
  tileLayer.on("load", () => {
    console.log("Tiles loaded — hiding map spinner");
    mapSpinner.classList.add("hidden");
  });

  markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);
}

// =====================================================
// LOAD EVENTS FROM APPS SCRIPT BACKEND
// =====================================================
async function loadEvents() {
  try {
    console.log("Loading events…");
    spinner.classList.remove("hidden");

    const resp = await fetch(
      "https://script.google.com/macros/s/AKfycbx303zczPC-AcXwbpoZg-NwWo3MoaWxbce_UgeLA_GTEP1sS1B-3HycIZ3re0arA3Yy/exec"
    );

    const data = await resp.json();

    console.log("Events loaded:", data.events.length);

    window.ALL_EVENTS = data.events;
    renderSkeletons(10);
    applyFilters();

    spinner.classList.add("hidden");

    renderMarkers(data.events);
  } catch (err) {
    console.error("Error loading events:", err);
  }
}

// =====================================================
// SKELETON LOADING UI
// =====================================================
function renderSkeletons(count) {
  eventsList.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-card";
    skeleton.innerHTML = `
      <div class="skeleton-title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    `;
    eventsList.appendChild(skeleton);
  }
}

// =====================================================
// FILTER LOGIC
// =====================================================
function applyFilters() {
  if (!window.ALL_EVENTS) return;

  const text = searchInput.value.toLowerCase().trim();
  const location = locationFilter.value;
  const date = dateFilter.value;

  let filtered = window.ALL_EVENTS.filter(evt => {
    const matchText =
      evt.title.toLowerCase().includes(text) ||
      evt.description.toLowerCase().includes(text);

    const matchLocation =
      location === "all" || evt.location === location;

    const matchDate = date === "all" || evt.startDate.startsWith(date);

    return matchText && matchLocation && matchDate;
  });

  renderList(filtered, 1);
}

// =====================================================
// PAGINATED LIST RENDERING
// =====================================================
function renderList(events, page = 1) {
  const perPage = 10;
  const totalPages = Math.ceil(events.length / perPage);

  // Fade-out skeletons first
  const skeletons = eventsList.querySelectorAll(".skeleton-card");
  if (skeletons.length > 0) {
    skeletons.forEach((s, i) => {
      s.style.animationDelay = `${i * 35}ms`;
      s.classList.add("fade-out");
    });

    return setTimeout(() => {
      eventsList.innerHTML = "";
      renderListCore(events, page);
    }, 380);
  }

  renderListCore(events, page);
}

function renderListCore(events, page) {
  const perPage = 10;
  const totalPages = Math.ceil(events.length / perPage);

  eventsList.innerHTML = "";
  pagination.innerHTML = "";

  const start = (page - 1) * perPage;
  const pageEvents = events.slice(start, start + perPage);

  pageEvents.forEach(evt => {
    const card = document.createElement("div");
    card.className = "event-item";
    card.innerHTML = `
      <h3>${evt.title}</h3>
      <p><strong>Date:</strong> ${evt.startDate}</p>
      <p><strong>Location:</strong> ${evt.location}</p>
      <p>${evt.description}</p>
      <a href="${evt.eventLink}" target="_blank">View Event</a>
    `;
    eventsList.appendChild(card);
  });

  // Pagination
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === page) btn.classList.add("active");
    btn.addEventListener("click", () => renderList(events, i));
    pagination.appendChild(btn);
  }
}

// =====================================================
// MAP MARKER RENDERING
// =====================================================
function renderMarkers(events) {
  markerCluster.clearLayers();

  events.forEach(evt => {
    if (!evt.latitude || !evt.longitude) return;

    const marker = L.marker([evt.latitude, evt.longitude]);

    marker.on("add", () => {
      const el = marker.getElement();
      if (el) el.classList.add("drop");
    });

    marker.bindPopup(`
      <strong>${evt.title}</strong><br>
      ${evt.startDate}<br>
      ${evt.location}<br>
      <a href="${evt.eventLink}" target="_blank">View Details</a>
    `);

    markerCluster.addLayer(marker);
  });
}

