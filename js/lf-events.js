// === Lake Fork Events ===
// Updated to support flexible API structure and improved rendering
console.log("LF-EVENTS JS LOADED");

window.addEventListener("load", () => {
  console.log("Window load fired — initializing...");
  init();
});

// ---- GLOBALS ----
let map;

// ---- INIT ----
function init() {
  console.log("Init starting…");

  const root = document.querySelector("#events-root");
  const mapContainer = document.querySelector("#eventsMap");
  const showPastCheckbox = document.querySelector("#showPast");

  if (!root) {
    console.error("Missing #events-root");
    return;
  }

  console.log("DOM references assigned:", { root, map: mapContainer, showPast: showPastCheckbox });

  // Initialize map
  map = L.map(mapContainer).setView([32.8, -95.6], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  console.log("Map initialized.");

  // Fetch and render
  fetchAndRenderEvents(root);

  // Hook up toggle
  if (showPastCheckbox) {
    showPastCheckbox.addEventListener("change", () => fetchAndRenderEvents(root, showPastCheckbox.checked));
  }
}

// ---- FETCH ----
async function fetchAndRenderEvents(container, showPast = false) {
  const url =
    "https://script.google.com/macros/s/AKfycbx6D4Z-P-fN66SbRH0H8p_aQXL22cSIBslJEGk9-49OvNJanrJjXi3MMH_x_4PBuX1h/exec?action=getEvents";
  console.log("Fetching events…", url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Raw API response:", data);

    if (data.success && data.events) {
      const evtData =
        data.events.allEvents || data.events.events || [];
      handleEventsResponse({ allEvents: evtData, showPast });
    } else {
      console.warn("No events found in API response", data);
      renderEmptyState(container);
    }
  } catch (err) {
    console.error("Error fetching events:", err);
    renderEmptyState(container);
  }
}

// ---- RENDER ----
function handleEventsResponse({ allEvents, showPast }) {
  const container = document.querySelector("#events-root");
  if (!container) return;

  if (!allEvents || !allEvents.length) {
    console.warn("No events found.");
    renderEmptyState(container);
    return;
  }

  const now = new Date();
  let filtered = allEvents.filter(ev => {
    const start = new Date(ev.startDate);
    return showPast ? start < now : start >= now;
  });

  filtered = filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  renderEvents(container, filtered);
}

// ---- EMPTY STATE ----
function renderEmptyState(container) {
  container.innerHTML = `
    <div class="no-events">
      <p>No events found. Please check back soon!</p>
    </div>
  `;
}

// ---- RENDERERS ----
function renderEvents(container, events) {
  if (!container) {
    console.error("No container to render events into.");
    return;
  }

  if (!events || !events.length) {
    return renderEmptyState(container);
  }

  container.innerHTML = events
    .map(ev => {
      const start = new Date(ev.startDate);
      const end = ev.endDate ? new Date(ev.endDate) : null;
      const dateStr = start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const endStr = end
        ? end.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "";

      const title = ev.link
        ? `<a href="${ev.link}" target="_blank" rel="noopener">${ev.title}</a>`
        : ev.title;

      const logo = ev.logo
        ? `<div class="event-logo"><img src="${ev.logo}" alt="${ev.title} logo"></div>`
        : "";

     return `
      <div class="event-card">
        ${ev.logo ? `<img src="${ev.logo}" alt="Event Logo" class="event-logo" loading="lazy">` : ""}
        <h3>${ev.link ? `<a href="${ev.link}" target="_blank" rel="noopener">${ev.title}</a>` : ev.title}</h3>
        <p class="event-date">${dateStr}</p>
        <p class="event-location">${ev.location || ""}</p>
        <p class="event-description">${ev.description || ""}</p>
      </div>
    `;
    })
    .join("");

  // Update map markers
  if (map && events.length) {
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    events.forEach(ev => {
      if (ev.lat && ev.lng) {
        const marker = L.marker([ev.lat, ev.lng]).addTo(map);
        const popup = `<b>${ev.title}</b><br>${ev.location || ""}`;
        marker.bindPopup(popup);
      }
    });
  }

  console.log(`Rendered ${events.length} events.`);
}
