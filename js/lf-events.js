/* ============================================================
   Lake Fork Events Frontend – resilient final build
   ============================================================ */
console.log("LF-EVENTS JS LOADED");

const API_URL =
  window.LAKE_FORK_API_URL ||
  "https://script.google.com/macros/s/AKfycbyMIl5cn8s1NcsNxUoToWEFtYu_JvxGhN9DDkzU9AOfwbZ3rH9qV3sZPgr9vOs6VyEY/exec";

let map, markerGroup;
let allEvents = [];
let filteredEvents = [];

/* ---------- Startup ---------- */
window.addEventListener("load", () => {
  console.log("Window load fired — scheduling init after hydration.");
  requestAnimationFrame(() => setTimeout(init, 150));
});

async function init() {
  console.log("Init starting…");
  ensureContainers();

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

  const debounced = debounce(() => applyFilters(dom), 300);
  Object.values(dom).forEach((el) => el && el.addEventListener("input", debounced));
}

/* ---------- Containers ---------- */
function ensureContainers() {
  if (!document.querySelector("#eventsList")) {
    const div = document.createElement("div");
    div.id = "eventsList";
    div.className = "events-list";
    document.body.appendChild(div);
  }
  if (!document.querySelector("#eventsMap")) {
    const div = document.createElement("div");
    div.id = "eventsMap";
    div.className = "events-map";
    document.body.appendChild(div);
  }
}

/* ---------- Map ---------- */
function initMap() {
  const el = document.getElementById("eventsMap");
  if (!el) return console.warn("Missing #eventsMap");
  map = L.map(el).setView([32.8, -95.5], 9);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: "© CartoDB © OpenStreetMap",
  }).addTo(map);
  markerGroup = L.markerClusterGroup();
  map.addLayer(markerGroup);
  console.log("Map initialized.");
}

/* ---------- Fetch ---------- */
async function fetchAndRenderEvents(dom) {
  try {
    console.log("Fetching events…", API_URL);
    const res = await fetch(`${API_URL}?action=getEvents`);
    const data = await res.json();
    console.log("Raw API response:", data);

    // normalize possible shapes
    let arr = [];
    if (Array.isArray(data)) arr = data;
    else if (Array.isArray(data.events)) arr = data.events;
    else if (Array.isArray(data.events?.events)) arr = data.events.events;

    allEvents = arr.map((e) => ({
      title: e.title || e.name || "Untitled Event",
      date: e.date || e.startDate || "",
      location: e.location || e.place || "Lake Fork Area",
      description: e.description || "",
      lat: +e.lat || null,
      lng: +e.lng || null,
    }));

    hideSkeleton(dom.eventsList);

    if (!allEvents.length) {
      console.warn("⚠️ No events returned from API — showing placeholder.");
      renderEmptyState(dom.eventsList);
      return;
    }

    applyFilters(dom);
  } catch (err) {
    console.error("Fetch failed:", err);
    renderError(dom.eventsList, err.message);
  }
}

/* ---------- Filters ---------- */
function applyFilters(dom) {
  if (!allEvents.length) return;

  const q = dom.searchInput?.value.toLowerCase() || "";
  const loc = dom.locationFilter?.value || "";
  const date = dom.dateFilter?.value || "";
  const showPast = dom.showPast?.checked || false;
  const today = new Date();

  filteredEvents = allEvents
    .filter((ev) => {
      const evDate = parseEventDate(ev.date);
      if (!evDate) return false;
      const matchPast = showPast || evDate >= today;
      const matchSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q);
      const matchLoc = !loc || ev.location === loc;
      const matchDate = !date || sameDay(evDate, new Date(date));
      return matchSearch && matchLoc && matchDate && matchPast;
    })
    .sort((a, b) => parseEventDate(a.date) - parseEventDate(b.date));

  // fallback: always show next 5 upcoming events
  if (!filteredEvents.length) {
    filteredEvents = getNextUpcomingEvents(5);
  } else {
    filteredEvents = filteredEvents.slice(0, 5);
  }

  renderEvents(dom.eventsList);
  updateMap();
}

/* ---------- Helpers ---------- */
function parseEventDate(d) {
  if (!d) return null;
  let dt = new Date(d);
  if (!isNaN(dt)) return dt;
  // try US-style MM/DD/YYYY
  const m = d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  // try "Dec 15 2025"
  const alt = Date.parse(d);
  return isNaN(alt) ? null : new Date(alt);
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

function getNextUpcomingEvents(n) {
  const today = new Date();
  return allEvents
    .filter((ev) => {
      const dt = parseEventDate(ev.date);
      return dt && dt >= today;
    })
    .sort((a, b) => parseEventDate(a.date) - parseEventDate(b.date))
    .slice(0, n);
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
  filteredEvents.forEach((ev) => {
    const card = document.createElement("div");
    card.className = "event-item";
    card.innerHTML = `
      <h3>${ev.title}</h3>
      <p class="event-date">${ev.date}</p>
      <p class="event-location">${ev.location}</p>
      <p class="event-desc">${ev.description}</p>
    `;
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

/* ---------- Map Update ---------- */
function updateMap() {
  if (!map || !markerGroup) return;
  markerGroup.clearLayers();
  const pts = [];
  filteredEvents.forEach((ev) => {
    if (ev.lat && ev.lng) {
      const m = L.marker([ev.lat, ev.lng]).bindPopup(
        `<b>${ev.title}</b><br>${ev.location}<br>${ev.date}`
      );
      markerGroup.addLayer(m);
      pts.push([ev.lat, ev.lng]);
    }
  });
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.2));
}

/* ---------- States ---------- */
function showSkeleton(c) {
  if (!c) return;
  c.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("div");
    s.className = "skeleton-card";
    s.innerHTML =
      '<div class="skeleton-line skeleton-long"></div><div class="skeleton-line skeleton-medium"></div><div class="skeleton-line skeleton-short"></div>';
    c.appendChild(s);
  }
}
function hideSkeleton(c) {
  c?.querySelectorAll(".skeleton-card").forEach((el) => el.remove());
}
function renderEmptyState(c) {
  if (!c) return;
  c.innerHTML = `<p class="empty-msg">No upcoming events — check back soon!</p>`;
}
function renderError(c, msg) {
  if (!c) return;
  c.innerHTML = `<p class="error-msg">⚠️ Error loading events: ${msg}</p>`;
}
function debounce(fn, d) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), d);
  };
}
