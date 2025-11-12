/* ================================
   Lake Fork Events — Patched JS
   ================================ */

console.log("LF-EVENTS JS LOADED");

// ---- CONFIG ----
const API_URL = "https://script.google.com/macros/s/AKfycbyMIl5cn8s1NcsNxUoToWEFtYu_JvxGhN9DDkzU9AOfwbZ3rH9qV3sZPgr9vOs6VyEY/exec";

// ---- ENTRYPOINT ----
window.addEventListener("load", () => {
  console.log("Window load fired — initializing...");
  setTimeout(init, 100);
});

async function init() {
  console.log("Init starting…");

  // DOM References
  const refs = {
    root: document.getElementById("events-root"),
    map: document.getElementById("eventsMap"),
    showPast: document.getElementById("showPast")
  };

  if (!refs.root) {
    console.warn("No #events-root found — retrying...");
    return setTimeout(init, 300);
  }

  console.log("DOM references assigned:", refs);

  try {
    initMap(refs.map);
    await fetchAndRenderEvents(refs);
  } catch (err) {
    console.error("Init failed:", err);
    renderError(refs.root, "Unable to initialize events.");
  }
}

// ---- MAP ----
let map;
function initMap(mapEl) {
  if (!mapEl) {
    console.warn("Map container not found, skipping map initialization");
    return;
  }

  console.log("Map initialized.");
  map = L.map(mapEl).setView([32.794, -95.561], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
}

// ---- FETCH + RENDER ----
async function fetchAndRenderEvents(refs) {
  console.log("Fetching events…", API_URL);
  const root = refs.root;
  const showPastCheckbox = refs.showPast;

  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    const data = await res.json();
    console.log("Raw API response:", data);

    if (!data.success) throw new Error("API did not return success");

    const eventsData = data.events || {};
    const all = eventsData.allEvents || [];
    const upcoming = eventsData.upcoming || [];
    const past = eventsData.past || [];

    if (!all.length && !upcoming.length && !past.length) {
      console.warn("No events found in API response");
      return renderEmptyState(root);
    }

    // Default display: next 5 upcoming
    let eventsToShow = upcoming.length ? upcoming.slice(0, 5) : all.slice(0, 5);
    if (showPastCheckbox && showPastCheckbox.checked) {
      eventsToShow = past.length ? past.slice(0, 5) : [];
    }

    renderEvents(root, eventsToShow);

    // Bind checkbox toggle
    if (showPastCheckbox) {
      showPastCheckbox.addEventListener("change", () => {
        const showingPast = showPastCheckbox.checked;
        const newList = showingPast ? past.slice(0, 5) : upcoming.slice(0, 5);
        renderEvents(root, newList);
      });
    }
  } catch (err) {
    console.error("Failed to load events:", err);
    renderError(root, "Error loading events. Please try again later.");
  }
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

  // Build all event cards
  const html = events
    .map(ev => {
      const date = new Date(ev.date);
      const dateStr = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const safeDesc = ev.description ? ev.description.replace(/\n/g, "<br>") : "";

      // Conditional title linking
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

  // ---- MAP UPDATE ----
  if (map) {
    // Clear existing markers
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

    // Fit to all markers
    if (markers.length) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [30, 30] });
    }

    // ---- INTERACTION SYNC ----
    const cards = container.querySelectorAll(".event-card");
    cards.forEach(card => {
      const lat = parseFloat(card.dataset.lat);
      const lng = parseFloat(card.dataset.lng);

      if (!isNaN(lat) && !isNaN(lng)) {
        card.addEventListener("mouseenter", () => {
          const marker = markers.find(m => {
            const pos = m.getLatLng();
            return pos.lat === lat && pos.lng === lng;
          });
          if (marker) marker.openPopup();
        });

        card.addEventListener("mouseleave", () => {
          map.closePopup();
        });
      }
    });
  }

  console.log(`Rendered ${events.length} events.`);
}


function renderEmptyState(container) {
  container.innerHTML = `
    <div class="empty-state">
      <p>No events found. Check back soon!</p>
    </div>
  `;
}

function renderError(container, msg) {
  container.innerHTML = `
    <div class="error-state">
      <p>${msg}</p>
    </div>
  `;
}
