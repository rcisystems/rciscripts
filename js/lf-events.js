// ======================================================
// Lake Fork Events — Diagnostic & Stable Build
// ======================================================

console.log("LF-EVENTS JS LOADED");

// ---- GLOBAL CONFIG ----
const EVENTS_API_URL =
  "https://script.google.com/macros/s/AKfycbx6D4Z-P-fN66SbRH0H8p_aQXL22cSIBslJEGk9-49OvNJanrJjXi3MMH_x_4PBuX1h/exec";
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
  console.log("Fetching events…", EVENTS_API_URL);
  try {
    const res = await fetch(EVENTS_API_URL);
    const data = await res.json();

    // Store globally for debugging
    window.lastEventsResponse = data;
    console.log("Raw API response:", JSON.stringify(data, null, 2));

    // Adapt to any response shape
    const allEvents =
      data?.events?.allEvents ||
      data?.allEvents ||
      data?.events ||
      [];

    if (!data.success) {
      console.warn("API did not return success:true", data);
      renderError(document.getElementById("events-root"), "API Error");
      return;
    }

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
  } catch (err) {
    console.error("Failed to load events:", err);
    renderError(document.getElementById("events-root"), err.message);
  }
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

      const link = ev.link ? `<a href="${ev.link}" target="_blank">${ev.title}</a>` : ev.title;

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
