/* ============================================================
   Lake Fork Events Frontend v7 (Final)
   ------------------------------------------------------------
   - Handles nested event JSON
   - Auto-creates map & list containers
   - Shows next 5 upcoming events minimum
   - Robust date parsing & sorting
   - Resilient to GHL React hydration
   ============================================================ */

console.log("LF-EVENTS JS LOADED");

const API_URL =
  window.LAKE_FORK_API_URL ||
  "https://script.google.com/macros/s/AKfycbyMIl5cn8s1NcsNxUoToWEFtYu_JvxGhN9DDkzU9AOfwbZ3rH9qV3sZPgr9vOs6VyEY/exec";

let map, markerGroup;
let allEvents = [];
let filteredEvents = [];

/* ---------- DOM ready ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("lf-events-root")) {
    const root = document.createElement("div");
    root.id = "lf-events-root";
    document.body.appendChild(root);
    console.log("Created #lf-events-root dynamically.");
  }
});

/* ---------- Post-hydration init ---------- */
window.addEventListener("load", () => {
  console.log("Window load fired — scheduling init after hydration.");
  requestAnimationFrame(() => setTimeout(init, 150));
});

/* ---------- Init ---------- */
async function init() {
  console.log("Init starting…");
  ensureContainers();

  const dom = {
    searchInput: document.querySelector("#search"),
    locationFilter: document.querySelector("#locationFilter"),
    dateFilter: document.querySelector("#dateFilter"),
    timeToggle: document.querySelector("#timeToggle"),
    showPast: document.querySelector("#showPast"),
    eventsList: document.querySelector("#eventsList"),
  };
  console.log("DOM references assigned:", dom);

  initMap();
  showSkeleton(dom.eventsList);
  await fetchAndRenderEvents(dom);

  const debounced = debounce(() => applyFilters(dom), 250);
  Object.values(dom).forEach((el) => {
    if (el) el.addEventListener("input", debounced);
  });
}

/* ---------- Ensure Containers ---------- */
function ensureContainers() {
  if (!document.querySelector("#eventsList")) {
    const listDiv = document.createElement("div");
    listDiv.id = "eventsList";
    listDiv.className = "events-list";
    document.body.appendChild(listDiv);
    console.warn("Auto-created #eventsList container.");
  }

  if (!document.querySelector("#eventsMap")) {
    const mapDiv = document.createElement("div");
    mapDiv.id = "eventsMap";
    mapDiv.className = "events-map";
    document.body.appendChild(mapDiv);
    console.warn("Auto-created #eventsMap container.");
  }
}

/* ---------- Map ---------- */
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

/* ---------- Fetch & Render ---------- */
async function fetchAndRenderEvents(dom) {
  try {
    console.log("Fetching events…", API_URL);
    const res = await fetch(`${API_URL}?action=getEvents`);
    const data = await res.json();
    console.log("Raw API response:", data);

    let eventsArray = [];
    if (Array.isArray(data.events)) {
      eventsArray = data.events;
    } else if (Array.isArray(data.events?.events)) {
      eventsArray = data.events.events;
    } else if (Array.isArray(data)) {
      eventsArray = data;
    }

    if (!Array.isArray(eventsArray)) throw new Error("Invalid event data");

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

/* ---------- Filtering & Fallback ---------- */
function applyFilters(dom) {
  if (!allEvents.length) return;

  const q = dom.searchInput?.value.toLowerCase() || "";
  const loc = dom.locationFilter?.value || "";
  const date = dom.dateFilter?.value || "";
  const showPast = dom.showPast?.checked || false;
  const today = new Date();

  filteredEvents = allEvents
    .filter((ev) => {
      const title = ev.title?.toLowerCase() || "";
      const desc = ev.description?.toLowerCase() || "";
      const evDate = parseEventDate(ev.date);

      const matchSearch = !q || title.includes(q) || desc.includes(q);
      const matchLoc = !loc || ev.location === loc;
      const matchDate = !date || sameDay(evDate, new Date(date));
      const matchPast = showPast || (evDate && evDate >= today);

      return matchSearch && matchLoc && matchDate && matchPast;
    })
    .sort((a, b) => parseEventDate(a.date) - parseEventDate(b.date))
    .slice(0, 5);

  if (!filteredEvents.length) {
    console.warn("No filtered events, showing next 5 upcoming fallback.");
    filteredEvents = getNextUpcomingEvents(5);
  }

  renderEvents(dom.eventsList);
  updateMap();
}

/* ---------- Date Helpers ---------- */
function parseEventDate(d) {
  if (!d) return null;
  const iso = new Date(d);
  if (!isNaN(iso)) return iso;
  const m = d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) return new Date(+m[3], m[1] - 1, +m[2]);
  return null;
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getNextUpcomingEvents(count) {
  const today = new Date();
  return allEvents
    .filter((ev) => {
      const evDate = parseEventDate(ev.date);
      return evDate && evDate >= today;
    })
    .sort((a, b) => parseEventDate(a.date) - parseEventDate(b.date))
    .slice(0, count);
}

/* ---------- Render ---------- */
function renderEvents(container) {
  if (!container) return;
  container.innerHTML = "";

  if (!filteredEvents.length) {
    renderEmptyState(container);
    return;
  }

  const frag = document.createDocumentFragment();
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

/* ---------- Map Update ---------- */
function updateMap() {
  if (!map || !markerGroup) return;
  markerGroup.clearLayers();

  const points = [];
  for (const ev of filteredEvents) {
    if (ev.lat && ev.lng) {
      const marker = L.marker([ev.lat, ev.lng]).bindPopup(
        `<b>${ev.title}</b><br>${ev.location}<br>${ev.date}`
      );
      markerGroup.addLayer(marker);
      points.push([ev.lat, ev.lng]);
    }
  }

  if (points.length) {
    const group = L.featureGroup(markerGroup.getLayers());
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

/* ---------- Skeleton + States ---------- */
function showSkeleton(container) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const c = document.createElement("div");
    c.className = "skeleton-card";
    c.innerHTML = `
      <div class="skeleton-line skeleton-long"></div>
      <div class="skeleton-line skeleton-medium"></div>
      <div class="skeleton-line skeleton-short"></div>
    `;
    container.appendChild(c);
  }
}

function hideSkeleton(container) {
  container?.querySelectorAll(".skeleton-card")?.forEach((el) => el.remove());
}

function renderEmptyState(container) {
  if (!container) return;
  container.innerHTML = `<p class="empty-msg">No events found — check back soon!</p>`;
}

function renderError(container, msg) {
  if (!container) return;
  container.innerHTML = `<p class="error-msg">⚠️ Error loading events: ${msg}</p>`;
}

/* ---------- Utils ---------- */
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
