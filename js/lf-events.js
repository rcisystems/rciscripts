// === LAKE FORK EVENTS ===
console.log("LF-EVENTS JS LOADED");

let map;
let allEvents = [];

// === INITIALIZATION ===
function init() {
  console.log("Init starting…");

  const root = document.getElementById("events-root");
  const mapContainer = document.getElementById("eventsMap");
  const showPast = document.getElementById("showPast");
  const searchInput = document.getElementById("eventSearch");

  if (!root) {
    console.error("Missing events-root element");
    return;
  }

  const dom = { root, map: mapContainer, showPast, searchInput };
  console.log("DOM references assigned:", dom);

  // Initialize map
  if (mapContainer) initMap();

  // Fetch and render events
  fetchAndRenderEvents(dom);

  // Listeners
  if (showPast) {
    showPast.addEventListener("change", () => renderFiltered(dom));
  }
  if (searchInput) {
    searchInput.addEventListener("input", () => renderFiltered(dom));
  }
}

window.addEventListener("load", () => {
  console.log("Window load fired — initializing...");
  setTimeout(() => init(), 800); // ✅ Delay allows GHL hydration to finish
});

// === MAP ===
function initMap() {
  const mapElement = document.getElementById("eventsMap");
  if (!mapElement) return;

  map = L.map(mapElement).setView([32.83, -95.58], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  console.log("Map initialized.");

  // Force redraw
  setTimeout(() => map.invalidateSize(), 500);
  window.addEventListener("resize", () => map.invalidateSize());
}

// === FETCH EVENTS ===
async function fetchAndRenderEvents(dom) {
  try {
    const url =
      "https://script.google.com/macros/s/AKfycbx6D4Z-P-fN66SbRH0H8p_aQXL22cSIBslJEGk9-49OvNJanrJjXi3MMH_x_4PBuX1h/exec?action=getEvents";
    console.log("Fetching events…", url);

    const res = await fetch(url);
    const data = await res.json();
    console.log("Raw API response:", data);

    if (data.success && data.events && data.events.allEvents) {
      allEvents = data.events.allEvents.filter(ev => ev.status?.toLowerCase() === "publish");
      renderFiltered(dom);
    } else {
      console.warn("API did not return success:true", data);
      renderEmptyState(dom.root);
    }
  } catch (err) {
    console.error("Failed to load events:", err);
    renderError(dom.root);
  }
}

// === FILTER & SEARCH ===
function renderFiltered(dom) {
  const showPast = dom.showPast?.checked;
  const searchTerm = dom.searchInput?.value?.toLowerCase() || "";
  const now = new Date();

  const filtered = allEvents.filter(ev => {
    const isPast = new Date(ev.endDate) < now;
    const matchesPast = showPast || !isPast;
    const matchesSearch =
      ev.title?.toLowerCase().includes(searchTerm) ||
      ev.description?.toLowerCase().includes(searchTerm) ||
      ev.location?.toLowerCase().includes(searchTerm);
    return matchesPast && matchesSearch;
  });

  renderEvents(dom.root, filtered);
}

// === RENDERERS ===
function renderEvents(container, events) {
  if (!container) return;
  if (!events || !events.length) return renderEmptyState(container);

  container.innerHTML = events
    .map(ev => {
      const dateStart = new Date(ev.startDate);
      const dateEnd = ev.endDate ? new Date(ev.endDate) : null;
      const dateStr = dateEnd
        ? `${dateStart.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })} - ${dateEnd.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}`
        : dateStart.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

      const linkHTML = ev.link
        ? `<a href="${ev.link}" target="_blank" class="event-link">${ev.title}</a>`
        : ev.title;

      const logoHTML = ev.logo
        ? `<img src="${ev.logo}" alt="${ev.title}" class="event-logo" loading="lazy" />`
        : "";

      return `
        <div class="event-card">
          ${logoHTML}
          <div class="event-content">
            <h3>${linkHTML}</h3>
            <p class="event-date">${dateStr}</p>
            <p class="event-location">${ev.location || ""}</p>
            <p class="event-description">${ev.description || ""}</p>
          </div>
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
    <div class="no-events">
      <p>No events found. Please check back soon!</p>
    </div>`;
}

function renderError(container) {
  container.innerHTML = `
    <div class="error-state">
      <p>There was a problem loading events. Please try again later.</p>
    </div>`;
}

// === OBSERVE DOM FOR LAYOUT CHANGES ===
const observer = new MutationObserver(() => {
  if (map && map._loaded) {
    map.invalidateSize();
  }
});
observer.observe(document.body, { attributes: true, childList: true, subtree: true });

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && map) map.invalidateSize();
});
