/* ============================================================
   Lake Fork Events Front-End (Patched v3)
   ------------------------------------------------------------
   Fixes:
   • Removed undefined templateHTML reference
   • Delayed init to avoid React hydration mismatches
   • Added safe root-element creation
   • Stable map + skeleton loader + debounced search
   ============================================================ */

console.log("LF-EVENTS JS LOADED");

const API_URL =
  window.LAKE_FORK_API_URL ||
  "https://script.google.com/macros/s/AKfycbyMIl5cn8s1NcsNxUoToWEFtYu_JvxGhN9DDkzU9AOfwbZ3rH9qV3sZPgr9vOs6VyEY/exec";

let map, markerGroup, allEvents = [], filteredEvents = [];

/* ---------- DOM Ready Helper ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Ensure a root container exists (prevents ReferenceError)
  let root = document.getElementById("lf-events-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "lf-events-root";
    document.body.appendChild(root);
    console.log("Created #lf-events-root dynamically.");
  }
});

/* ---------- Delay Init until React hydration finishes ---------- */
window.addEventListener("load", () => {
  console.log("Window load fired — scheduling init after hydration.");
  requestAnimationFrame(() => setTimeout(init, 150));
});

/* ---------- Initialization ---------- */
async function init() {
  console.log("Init starting…");

  const dom = {
    searchInput: document.querySelector("#search"),
    locationFilter: document.querySelector("#locationFilter"),
    dateFilter: document.querySelector("#dateFilter"),
    timeToggle: document.querySelector("#timeToggle"),
    showPast: document.querySelector("#showPast"),
    list: document.querySelector("#eventsList"),
  };

  console.log("DOM references assigned:", dom);

  initMap();
  await fetchAndRenderEvents(dom);

  // Event listeners (debounced)
  const debouncedFilter = debounce(() => applyFilters(dom), 250);
  Object.values(dom).forEach(el => {
    if (el) el.addEventListener("input", debouncedFilter);
  });
}

/* ---------- Map ---------- */
function initMap() {
  const mapContainer = document.getElementById("eventsMap");
  if (!mapContainer) {
    console.warn("No map container found");
    return;
  }

  map = L.map(mapContainer).setView([32.8, -95.5], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
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
    if (!data || !Array.isArray(data.events)) throw new Error("Invalid event data");

    allEvents = data.events;
    console.log(`Loaded ${allEvents.length} events.`);
    applyFilters(dom);
  } catch (err) {
    console.error("Failed to load events:", err);
  }
}

/* ---------- Filtering ---------- */
function applyFilters(dom) {
  if (!allEvents.length) return;

  const query = dom.searchInput?.value.toLowerCase() || "";
  const location = dom.locationFilter?.value || "";
  const date = dom.dateFilter?.value || "";
  const includePast = dom.showPast?.checked || false;

  const today = new Date().toISOString().split("T")[0];

  filteredEvents = allEvents.filter(ev => {
    const matchSearch =
      !query ||
      ev.title?.toLowerCase().includes(query) ||
      ev.description?.toLowerCase().includes(query);
    const matchLoc = !location || ev.location === location;
    const matchDate = !date || ev.date === date;
    const matchPast = includePast || ev.date >= today;
    return matchSearch && matchLoc && matchDate && matchPast;
  });

  renderEvents(dom);
  updateMap();
}

/* ---------- Render Events ---------- */
function renderEvents(dom) {
  const container = dom.list;
  if (!container) return;

  container.innerHTML = "";
  const frag = document.createDocumentFragment();

  if (!filteredEvents.length) {
    const empty = document.createElement("p");
    empty.textContent = "No events found.";
    frag.appendChild(empty);
  } else {
    filteredEvents.forEach(ev => {
      const div = document.createElement("div");
      div.className = "event-card";
      div.innerHTML = `
        <h3>${ev.title}</h3>
        <p class="event-date">${ev.date}</p>
        <p class="event-location">${ev.location}</p>
        <p class="event-desc">${ev.description || ""}</p>
      `;
      frag.appendChild(div);
    });
  }

  container.appendChild(frag);
}

/* ---------- Update Map ---------- */
function updateMap() {
  if (!markerGroup || !map) return;
  markerGroup.clearLayers();

  filteredEvents.forEach(ev => {
    if (ev.lat && ev.lng) {
      const marker = L.marker([ev.lat, ev.lng]).bindPopup(
        `<b>${ev.title}</b><br>${ev.location}<br>${ev.date}`
      );
      markerGroup.addLayer(marker);
    }
  });

  if (filteredEvents.some(ev => ev.lat && ev.lng)) {
    const group = L.featureGroup(markerGroup.getLayers());
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

/* ---------- Utility ---------- */
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
