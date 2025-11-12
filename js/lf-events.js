/* ===============================
   Lake Fork Events – FINAL PATCH
   =============================== */

console.log("LF-EVENTS JS LOADED");

const API_URL =
  "https://script.google.com/macros/s/AKfycbyMIl5cn8s1NcsNxUoToWEFtYu_JvxGhN9DDkzU9AOfwbZ3rH9qV3sZPgr9vOs6VyEY/exec";

let allEvents = [];
let filteredEvents = [];
let map;

window.addEventListener("load", () => {
  console.log("Window load fired — initializing...");
  init();
});

async function init() {
  console.log("Init starting…");

  const refs = {
    root: document.getElementById("events-root"),
    map: document.getElementById("eventsMap"),
    search: document.getElementById("searchInput"),
    location: document.getElementById("locationFilter"),
    showPast: document.getElementById("showPast"),
  };

  if (!refs.root) {
    console.error("Missing #events-root");
    return;
  }

  initMap(refs.map);
  await fetchEvents(refs.root);

  refs.search?.addEventListener("input", () => applyFilters(refs));
  refs.location?.addEventListener("change", () => applyFilters(refs));
  refs.showPast?.addEventListener("change", () => applyFilters(refs));
}

// ---- MAP ----
function initMap(mapEl) {
  if (!mapEl) return;
  map = L.map(mapEl).setView([32.794, -95.561], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  console.log("Map initialized.");
}

// ---- FETCH ----
async function fetchEvents(container) {
  console.log("Fetching events…", API_URL);
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    const data = await res.json();
    console.log("Raw API response:", data);

    const events = data?.events?.allEvents || data?.events || [];
    allEvents = Array.isArray(events) ? events : [];

    if (!allEvents.length) {
      renderEmptyState(container);
      return;
    }

    populateLocationFilter(allEvents);
    filteredEvents = filterAndSearchEvents(allEvents);
    renderEvents(container, filteredEvents);
  } catch (err) {
    console.error("Failed to load events:", err);
    renderError(container, "Error loading events. Please try again later.");
  }
}

// ---- FILTER LOGIC ----
function applyFilters(refs) {
  filteredEvents = filterAndSearchEvents(
    allEvents,
    refs.search.value,
    refs.location.value,
    refs.showPast.checked
  );
  renderEvents(refs.root, filteredEvents);
}

function filterAndSearchEvents(events, searchTerm = "", location = "", includePast = false) {
  const now = new Date();
  const term = searchTerm.toLowerCase().trim();

  return events
    .filter(ev => {
      const evDate = new Date(ev.date);
      const matchesTime = includePast ? true : evDate >= now;
      const matchesSearch =
        !term ||
        (ev.title && ev.title.toLowerCase().includes(term)) ||
        (ev.location && ev.location.toLowerCase().includes(term)) ||
        (ev.description && ev.description.toLowerCase().includes(term));
      const matchesLocation = !location || ev.location === location;
      return matchesTime && matchesSearch && matchesLocation;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 20);
}

function populateLocationFilter(events) {
  const select = document.getElementById("locationFilter");
  if (!select) return;
  const locations = [...new Set(events.map(e => e.location).filter(Boolean))].sort();
  select.innerHTML =
    `<option value="">All Locations</option>` +
    locations.map(loc => `<option value="${loc}">${loc}</option>`).join("");
}

// ---- RENDER ----
function renderEvents(container, events) {
  if (!container) return;
  container.innerHTML = "";

  if (!events || !events.length) {
    renderEmptyState(container);
    return;
  }

  const html = events
    .map(ev => {
      const date = new Date(ev.date);
      const dateStr = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const safeDesc = ev.description ? ev.description.replace(/\n/g, "<br>") : "";
      const titleHTML = ev.link
        ? `<a href="${ev.link}" target="_blank" rel="noopener noreferrer">${ev.title || "Untitled Event"}</a>`
        : ev.title || "Untitled Event";

      return `
        <div class="event-card" data-lat="${ev.lat || ""}" data-lng="${ev.lng || ""}">
          <h3 class="event-title">${titleHTML}</h3>
          <p class="event-date">${dateStr}</p>
          <p class="event-location">${ev.location || ""}</p>
          <p class="event-description">${safeDesc}</p>
        </div>
      `;
    })
    .join("");

  container.innerHTML = html;

  if (!map) return;

  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  const markers = [];
  events.forEach(ev => {
    if (ev.lat && ev.lng) {
      const marker = L.marker([ev.lat, ev.lng])
        .addTo(map)
        .bindPopup(`<b>${ev.title}</b><br>${ev.location || ""}`);
      markers.push(marker);
    }
  });

  if (markers.length) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds(), { padding: [30, 30] });
  }

  console.log(`Rendered ${events.length} events.`);
}

// ---- STATES ----
function renderEmptyState(container) {
  container.innerHTML = `<div class="empty-state">No matching events found.</div>`;
}

function renderError(container, msg) {
  container.innerHTML = `<div class="error-state"><p>${msg}</p></div>`;
}
