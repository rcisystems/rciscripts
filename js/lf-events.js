/* ==========================
   Lake Fork Events (Force Init)
   ========================== */
console.log("LF-EVENTS JS LOADED");

// Fire immediately if DOM is ready, otherwise on load
if (document.readyState === "complete" || document.readyState === "interactive") {
  console.log("DOM ready — starting init immediately.");
  setTimeout(init, 200);
} else {
  window.addEventListener("load", () => {
    console.log("Window load fired — initializing after hydration...");
    setTimeout(init, 200);
  });
}

window.addEventListener("load", () => {
  console.log("Window load fired — initializing...");
  setTimeout(init, 100);
});

async function init() {
  console.log("Init starting…");

  // DOM references
  const refs = {
    eventsContainer: document.getElementById("eventsContainer"),
    mapContainer: document.getElementById("map"),
    showPastCheckbox: document.getElementById("showPast"),
  };

  if (!refs.eventsContainer) {
    console.error("Missing events container element");
    return;
  }

  const apiUrl =
    "https://script.google.com/macros/s/AKfycbyMIl5cn8s1NcsNxUoToWEFtYu_JvxGhN9DDkzU9AOfwbZ3rH9qV3sZPgr9vOs6VyEY/exec";

  let map, markers = [];

  // Init map
  if (refs.mapContainer) {
    map = L.map(refs.mapContainer).setView([32.794, -95.561], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    console.log("Map initialized.");
  }

  // Fetch and render
  await fetchAndRenderEvents(apiUrl, refs, map, markers);

  // Toggle for past events
  if (refs.showPastCheckbox) {
    refs.showPastCheckbox.addEventListener("change", async () => {
      await fetchAndRenderEvents(apiUrl, refs, map, markers);
    });
  }
}

async function fetchAndRenderEvents(apiUrl, refs, map, markers) {
  console.log("Fetching events…", apiUrl);
  refs.eventsContainer.innerHTML = `<p class="loading">Loading events…</p>`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();
    console.log("API response:", data);

    if (!data.success) throw new Error(data.error || "Unknown API error");

    const showPast = refs.showPastCheckbox?.checked;
    const all = data.events?.allEvents || [];
    const upcoming = data.events?.upcoming || [];
    const past = data.events?.past || [];

    let eventsToRender = showPast ? all : upcoming.length ? upcoming : all;
    eventsToRender = eventsToRender
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5); // Limit to next 5

    if (!eventsToRender.length) {
      renderEmptyState(refs.eventsContainer, showPast);
      return;
    }

    // Clear map markers
    markers.forEach((m) => m.remove());
    markers.length = 0;

    // Render event cards
    refs.eventsContainer.innerHTML = "";
    eventsToRender.forEach((ev) => {
      const card = document.createElement("div");
      card.className = "event-card";

      const dateRange = ev.endDate && ev.endDate !== ev.date
        ? `${formatDate(ev.date)} – ${formatDate(ev.endDate)}`
        : formatDate(ev.date);

      card.innerHTML = `
        <div class="event-header">
          ${ev.logo ? `<img src="${ev.logo}" alt="${ev.title}" class="event-logo" />` : ""}
          <div>
            <h3>${ev.title}</h3>
            <p class="event-date">${dateRange}</p>
          </div>
        </div>
        <p class="event-location"><strong>📍 ${ev.location}</strong></p>
        <p class="event-description">${ev.description || ""}</p>
        <div class="event-links">
          ${ev.registration ? `<a href="${ev.registration}" target="_blank">Register</a>` : ""}
          ${ev.link ? `<a href="${ev.link}" target="_blank">Event Page</a>` : ""}
        </div>
      `;
      refs.eventsContainer.appendChild(card);

      // Add marker
      if (map && ev.lat && ev.lng) {
        const marker = L.marker([ev.lat, ev.lng])
          .addTo(map)
          .bindPopup(`<strong>${ev.title}</strong><br>${dateRange}<br>${ev.location}`);
        markers.push(marker);
      }
    });

    if (map && markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.3));
    }

    console.log(`Rendered ${eventsToRender.length} events.`);
  } catch (err) {
    console.error("Failed to load events:", err);
    renderError(refs.eventsContainer, err);
  }
}

/* ---------- Helpers ---------- */

function renderEmptyState(container, showPast) {
  container.innerHTML = `
    <div class="empty-state">
      <p>No ${showPast ? "past" : "upcoming"} events found.</p>
    </div>`;
}

function renderError(container, err) {
  container.innerHTML = `
    <div class="error">
      <p>⚠️ Failed to load events: ${err.message}</p>
    </div>`;
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
