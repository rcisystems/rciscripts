/* ============================================================
   Lake Fork Events Frontend v4 (Patched)
   ============================================================ */

console.log("LF-EVENTS JS LOADED");

const API_URL =
  window.LAKE_FORK_API_URL ||
  "https://script.google.com/macros/s/AKfycbyMIl5cn8s1NcsNxUoToWEFtYu_JvxGhN9DDkzU9AOfwbZ3rH9qV3sZPgr9vOs6VyEY/exec";

let map, markerGroup;
let allEvents = [];
let filteredEvents = [];

/* -------------------------------
   Wait for DOM safely
------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("Before DOMContentLoaded hook");

  if (!document.getElementById("lf-events-root")) {
    const root = document.createElement("div");
    root.id = "lf-events-root";
    document.body.appendChild(root);
    console.log("Created #lf-events-root dynamically.");
  }
});

/* -------------------------------
   Delay init until hydration finishes
------------------------------- */
window.addEventListener("load", () => {
  console.log("Window load fired — React hydration finished.");
  requestAnimationFrame(() => setTimeout(init, 100));
});

/* -------------------------------
   Init
------------------------------- */
async function init() {
  console.log("Init starting…");

  const dom = {
    searchInput: document.querySelector("#search"),
    locationFilter: document.querySelector("#locationFilter"),
    dateFilter: document.querySelector("#dateFilter"),
    showPast: document.querySelector("#showPast"),
    eventsList: document.querySelector("#eventsList"),
  };

  console.log("DOM references assigned:", dom);

  initMap();
  showSkeleton(dom.eventsList);

  await fetchAndRenderEvents(dom);

  // Debounced filtering
  const debounced = debounce(() => applyFilters(dom), 250);
  Object.values(dom).forEach((el) => {
    if (el) el.addEventListener("input", debounced);
  });
}

/* -------------------------------
   Map
------------------------------- */
function initMap() {
  const container = document.getElementById("eventsMap");
  if (!container) {
    console.warn("No #eventsMap container found.");
    return;
  }

  map = L.map(container).setView([32.8, -95.5], 9);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: "© CartoDB © OpenStreetMap",
  }).addTo(map);

  markerGroup = L.markerClusterGroup();
  map.addLayer(markerGroup);
  console.log("Map initialized.");
}

/* -------------------------------
   Fetch Events
------------------------------- */
async function fetchAndRenderEvents(dom) {
  try {
    console.log("Fetching events…");
    const res = await fetch(`${API_URL}?action=getEvents`);
    const data = await res.json();
    console.log("Raw response:", data);

    // Handle nested structure
    const eventsArray = Array.isArray(data.events)
      ? data.events
      : Array.isArray(data.events?.events)
      ? data.events.events
      : [];

    allEvents = eventsArray;
    console.log(`Loaded ${allEvents.length} events.`);

    hideSkeleton(dom.eventsList);

    if (!allEvents.length) {
      renderEmptyState(dom.eventsList);
      return;
    }

    applyFilters(dom);
  } catch (err) {
    console.error("Failed to load events:", err);
    renderError(dom.eventsList, err.message);
  }
}

/* -------------------------------
   Filtering
------------------------------- */
function applyFilters(dom) {
  if (!allEvents.length) return;

  const q = dom.searchInput?.value.toLowerCase() || "";
  const loc = dom.locationFilter?.value || "";
  const date = dom.dateFilter?.value || "";
  const showPast = dom.showPast?.checked || false;

  const today = new Date().toISOString().split("T")[0];

  filteredEvents = allEvents.filter((ev) => {
    const title = ev.title?.toLowerCase() || "";
    const desc = ev.description?.toLowerCase() || "";
    const matchSearch = !q || title.includes(q) || desc.includes(q);
    const matchLoc = !loc || ev.location === loc;
    const matchDate = !date || ev.date === date;
    const matchPast = showPast || ev.date >= today;
    return matchSearch && matchLoc && matchDate && matchPast;
  });

  renderEvents(dom.eventsList);
  updateMap();
}

/* -------------------------------
   Render Event Cards
------------------------------- */
function renderEvents(container) {
  if (!container) return;
  container.innerHTML = "";

  const frag = document.createDocumentFragment();

  if (!filteredEvents.length) {
    renderEmptyState(container);
    return;
  }

  for (const ev of filteredEvents) {
    const card = document.createElement("div");
    card.className = "event-item";
    card.innerHTML = `
      <h3>${ev.title}</h3>
      <p class="event-date">${ev.date}</p>
      <p class="event-location">${ev.location}</p>
      <p class="event-desc">${ev.description || ""}</p>
    `;
    frag.appendChild(card);
  }

  container.appendChild(frag);
}

/* -------------------------------
   Map Update
------------------------------- */
function updateMap() {
  if (!map || !markerGroup) return;
  markerGroup.clearLayers();

  const points = [];

  filteredEvents.forEach((ev) => {
    if (ev.lat && ev.lng) {
      const marker = L.marker([ev.lat, ev.lng], { className: "drop" }).bindPopup(
        `<strong>${ev.title}</strong><br>${ev.location}<br>${ev.date}`
      );
      markerGroup.addLayer(marker);
      points.push([ev.lat, ev.lng]);
    }
  });

  if (points.length) {
    const group = L.featureGroup(markerGroup.getLayers());
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

/* -------------------------------
   Skeleton + States
------------------------------- */
function showSkeleton(container) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML = `
      <div class="skeleton-line skeleton-long"></div>
      <div class="skeleton-line skeleton-medium"></div>
      <div class="skeleton-line skeleton-short"></div>
    `;
    container.appendChild(card);
  }
}

function hideSkeleton(container) {
  const skels = container?.querySelectorAll(".skeleton-card");
  if (skels?.length) {
    skels.forEach((el) => (el.style.display = "none"));
  }
}

function renderEmptyState(container) {
  container.innerHTML = `<p class="empty-msg">No events yet — check back soon!</p>`;
}

function renderError(container, msg) {
  container.innerHTML = `<p class="error-msg">⚠️ Error loading events: ${msg}</p>`;
}

/* -------------------------------
   Utils
------------------------------- */
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
