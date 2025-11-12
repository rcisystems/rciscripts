// ======================================================
// Lake Fork Events — Stable + Diagnostic Build
// ======================================================

console.log("LF-EVENTS JS LOADED");

// ---- GLOBAL CONFIG ----
const BASE_API_URL =
  "https://script.google.com/macros/s/AKfycbyMIl5cn8s1NcsNxUoToWEFtYu_JvxGhN9DDkzU9AOfwbZ3rH9qV3sZPgr9vOs6VyEY/exec";
const EVENTS_API_URL = BASE_API_URL.includes("?")
  ? BASE_API_URL + "&action=getEvents"
  : BASE_API_URL + "?action=getEvents";

let map;

// ---- ON LOAD ----
window.addEventListener("load", () => {
  console.log("Window load fired — initializing...");
  requestAnimationFrame(init);
});

// ---- INIT ----
function init() {
  console.log("Init starting…");

  const root = document.getElementById("events-root");
  const mapContainer = document.getElementById("eventsMap");
  const showPast = document.getElementById("showPast");

  if (!root || !mapContainer) {
    console.error("Missing events container or map container element");
    return;
  }

  console.log("DOM references assigned:", { root, map: mapContainer, showPast });

  // Initialize map
  map = L.map(mapContainer).setView([32.8, -95.55], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://osm.org">OpenStreetMap</a> contributors',
  }).addTo(map);
  console.log("Map initialized.");

  // Fetch and render events
  fetchAndRenderEvents(showPast?.checked || false);

  // Handle past events toggle
  if (showPast) {
    showPast.addEventListener("change", () => {
      fetchAndRenderEvents(showPast.checked);
    });
  }
}

// ---- FETCH + RENDER ----
async function fetchAndRenderEvents(includePast = false) {
  console.log("Fetching events from:", EVENTS_API_URL);
  try {
    const res = await fetch(EVENTS_API_URL);
    const data = await res.json();

    // Store globally for debugging
    window.lastEventsResponse = data;
    console.log("Raw API response:", JSON.stringify(data, null, 2));

    if (!data.success) {
      console.warn("API did not return success:true", data);

      // Auto-retry if we got "Unknown action"
      if (data.error && data.error.includes("Unknown action")) {
        console.log("Retrying with explicit ?action=getEvents URL...");
        const retry = await fetch(BASE_API_URL + "?action=getEvents");
        const retryData = await retry.json();
        window.lastEventsResponse = retryData;
        console.log("Retry response:", JSON.stringify(retryData, null, 2));
        return handleEventsResponse(retryData, includePast);
      }

      renderError(document.getElementById("events-root"), "API Error");
      return;
    }

    handleEventsResponse(data, includePast);
  } catch (err) {
    console.error("Failed to load events:", err);
    renderError(document.getElementById("events-root"), err.message);
  }
}

// ---- HANDLER ----
function handleEventsResponse(data, includePast) {
  const allEvents =
    data?.events?.allEvents ||
    data?.allEvents ||
    data?.events ||
    [];

  if (!Array.isArray(allEvents) || !allEvents.length) {
    console.warn("No events found.");
    renderEmptyState(document.getElementById("events-root"));
    return;
  }

  const now = new Date();
  const upcoming = allEvents.filter(ev => {
    const d = parseDate(ev.date);
    return d && d >= now;
  });
  const past = allEvents.filter(ev => {
    const d = parseDate(ev.date);
    return d && d < now;
  });

  const eventsToShow = includePast ? [...upcoming, ...past] : upcoming;
  renderEvents(document.getElementById("events-root"), eventsToShow);
}

// ---- HELPERS ----
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// ---- RENDERERS ----
function renderEvents(container, events) {
  if (!container) return console.error("No container to render events into.");
  if (!events || !events.length) return renderEmptyState(container);

  container.innerHTML = events
    .map(ev => {
      const date = parseDate(ev.date);
      const dateStr = date
        ? date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "TBD";

      const link = ev.link
        ? `<a href="${ev.link}" target="_blank" rel="noopener">${ev.title}</a>`
        : ev.title;

      return `
        <div class="event-card">
          <h3>${link || "Untitled Event"}</h3>
          <p class="event-date">${dateStr}</p>
          <p class="event-location">${ev.location || ""}</p>
          <p class="event-description">${ev.description || ""}</p>
        </div>
      `;
    })
    .join("");

  // ---- MAP MARKERS ----
  if (map && events.length) {
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    events.forEach(ev => {
      if (ev.lat && ev.lng) {
        L.marker([ev.lat, ev.lng])
          .addTo(map)
          .bindPopup(`<b>${ev.title}</b><br>${ev.location}`);
      }
    });
  }

  console.log(`Rendered ${events.length} events.`);
}

function renderEmptyState(container) {
  container.innerHTML = `
    <div class="event-card empty">
      <p>No events found. Please check back soon!</p>
    </div>
  `;
}

function renderError(container, errorMsg) {
  container.innerHTML = `
    <div class="event-card error">
      <p>⚠️ Error loading events: ${errorMsg}</p>
    </div>
  `;
}
