console.log("LF-EVENTS JS LOADED");

// =============================
// Debounce Utility
// =============================
function debounce(fn, delay = 250) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}


// =============================
// CONFIG
// =============================
const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbx303zczPC-AcXwbpoZg-NwWo3MoaWxbce_UgeLA_GTEP1sS1B-3HycIZ3re0arA3Yy/exec";

let eventsData = [];
let filtered = [];
let map = null;
let markerCluster = null;

// =============================
// DOM ELEMENTS
// =============================
const searchInput = document.getElementById("search");
const locationFilter = document.getElementById("locationFilter");
const dateFilter = document.getElementById("dateFilter");
const timeToggle = document.getElementById("timeToggle");
const showPast = document.getElementById("showPast");
const eventsList = document.getElementById("events-list");
const pagination = document.getElementById("pagination");
const mapSpinner = document.getElementById("map-spinner");

// =============================
// MAP INITIALIZATION
// =============================
function setupMap() {
  console.log("Init map…");

  map = L.map("eventsMap").setView([33.092, -95.484], 11);

  const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  });

  tileLayer.on("load", () => {
    mapSpinner.classList.add("hidden");
  });

  tileLayer.addTo(map);

  markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);
}

// =============================
// SKELETON LOADING
// =============================
function showSkeletons() {
  eventsList.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const c = document.createElement("div");
    c.className = "skeleton-card";
    c.innerHTML = `
      <div class="skeleton-line skeleton-long"></div>
      <div class="skeleton-line skeleton-medium"></div>
      <div class="skeleton-line skeleton-short"></div>
    `;
    eventsList.appendChild(c);
  }
  eventsList.classList.remove("hidden");
}

// =============================
// LOAD EVENTS
// =============================
async function loadEvents() {
  showSkeletons();

  try {
    const res = await fetch(BACKEND_URL);
    const json = await res.json();
    eventsData = json.events || [];

    populateLocations();
    applyFilters();
    renderMarkers(filtered);

  } catch (err) {
    console.error("Error loading events:", err);
    eventsList.innerHTML = "<p>Error loading events</p>";
  }
}

// =============================
// FILTER LOGIC
// =============================
function applyFilters() {
  const text = searchInput.value.toLowerCase();
  const loc = locationFilter.value.toLowerCase();
  const d = dateFilter.value;
  const showPastEvents = showPast.checked;
  const mode = timeToggle.value;
  const today = new Date();

  filtered = eventsData.filter(ev => {
    const titleMatch = ev.title.toLowerCase().includes(text);
    const locationMatch = loc === "" || ev.location.toLowerCase().includes(loc);

    let dateMatch = true;
    if (d) {
      const evDate = new Date(ev.start).toISOString().split("T")[0];
      dateMatch = evDate === d;
    }

    const evDate = new Date(ev.start);
    const isPast = evDate < today;

    if (!showPastEvents) {
      if (mode === "upcoming" && isPast) return false;
      if (mode === "past" && !isPast) return false;
    }

    return titleMatch && locationMatch && dateMatch;
  });

  renderList(filtered, 1);
}

// =============================
// POPULATE LOCATION DROPDOWN
// =============================
function populateLocations() {
  const unique = [...new Set(eventsData.map(ev => ev.location))].sort();
  locationFilter.innerHTML = `<option value="">All Locations</option>`;
  unique.forEach(loc => {
    locationFilter.innerHTML += `<option value="${loc}">${loc}</option>`;
  });
}

// =============================
// RENDER MARKERS
// =============================
function renderMarkers(events) {
  markerCluster.clearLayers();

  events.forEach(ev => {
    if (!ev.lat || !ev.lng) return;

    const marker = L.marker([ev.lat, ev.lng]);
    marker.bindPopup(`
      <b>${ev.title}</b><br>
      ${ev.location}<br>
      <small>${ev.start}</small>
    `);
    marker.on('add', () => {
      const el = marker.getElement();
      if (el) el.classList.add("drop");
    });
    markerCluster.addLayer(marker);
      });
}

// =============================
// RENDER LIST + PAGINATION
// =============================
function renderList(events, page = 1) {
  const perPage = 10;
  const pages = Math.ceil(events.length / perPage);

  // Fade out skeletons
  const skeletons = eventsList.querySelectorAll(".skeleton-card");
  if (skeletons.length > 0) {
    skeletons.forEach((s, i) => {
      s.style.animationDelay = `${i * 40}ms`; // Staggered (Option C)
      s.classList.add("fade-out");
    });

    // Delay real rendering until fade-out finishes
    return setTimeout(() => {
      eventsList.innerHTML = "";
      renderListCore(events, page); // extracted core renderer
    }, 380); // matches fade length
  }

  // Normal render if no skeletons
  renderListCore(events, page);

  pagination.innerHTML = "";

  if (events.length === 0) {
    eventsList.innerHTML = "<p>No events found.</p>";
    return;
  }

  // Pagination buttons
  for (let p = 1; p <= pages; p++) {
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.className = p === page ? "active" : "";
    btn.onclick = () => renderList(events, p);
    pagination.appendChild(btn);
  }

  // List items
  const start = (page - 1) * perPage;
  const slice = events.slice(start, start + perPage);

  slice.forEach(ev => {
    const div = document.createElement("div");
    div.className = "event-item";
    div.innerHTML = `
      <h3>${ev.title}</h3>
      <p>${ev.start}</p>
      <p>${ev.location}</p>
    `;
    eventsList.appendChild(div);
  });
}



// =============================
// EVENT LISTENERS
// =============================
searchInput.addEventListener("input", debounce(applyFilters, 250));
locationFilter.addEventListener("change", debounce(applyFilters, 250));
dateFilter.addEventListener("change", debounce(applyFilters, 250));
timeToggle.addEventListener("change", applyFilters);
showPast.addEventListener("change", applyFilters);

// =============================
// INIT
// =============================
document.addEventListener("DOMContentLoaded", () => {
  setupMap();
  loadEvents();
});

