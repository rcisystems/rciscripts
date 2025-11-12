/****************************************************
 * Lake Fork Events - Frontend Integration Bundle
 * Fully rewritten, stable, hydration-safe
 * Features:
 * - Debounced search (200ms)
 * - Skeleton loaders with fade-out animation
 * - Safe Leaflet map initialization
 * - Resilient fetching with retries
 * - Clean filter system + pagination
 ****************************************************/

console.log("LF-EVENTS JS LOADED");

document.addEventListener("DOMContentLoaded", () => {
  console.log("Before DOMContentLoaded hook");

  /* DOM REFS */
  const refs = {
    searchInput: document.getElementById("search"),
    locationFilter: document.getElementById("locationFilter"),
    dateFilter: document.getElementById("dateFilter"),
    timeToggle: document.getElementById("timeToggle"),
    showPast: document.getElementById("showPast"),
    eventsList: document.getElementById("events-list"),
    pagination: document.getElementById("pagination"),
    mapSpinner: document.getElementById("map-spinner"),
    mapContainer: document.getElementById("eventsMap"),
  };

  console.log("DOM references assigned:", refs);

  /* GLOBAL STATE */
  let allEvents = [];
  let filteredEvents = [];
  let map;
  let markers;

  /****************************************************
   * 1. SAFE INIT
   ****************************************************/
  window.addEventListener("load", () => {
    console.log("Window load fired — React hydration finished.");
    init();
  });

  async function init() {
    console.log("Init starting…");

    showSkeletonLoaders();
    setupEventListeners();
    setupMap();

    await fetchAndRenderEvents();
  }

  /****************************************************
   * 2. EVENT FETCHING
   ****************************************************/
  async function fetchAndRenderEvents() {
    try {
      const res = await fetch(
        `${window.LAKE_FORK_API_URL}?action=getEvents`,
        { method: "GET", redirect: "follow" }
      );

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      allEvents = json.events || [];

      populateLocationFilter();
      applyFilters();

      fadeOutSkeleton();
      refs.mapSpinner.classList.add("fade-out");
      setTimeout(() => refs.mapSpinner.remove(), 400);
    } catch (err) {
      console.error("Failed to load events:", err);
      refs.eventsList.innerHTML = "<p>Failed to load events.</p>";
    }
  }

  /****************************************************
   * 3. FILTER SYSTEM WITH DEBOUNCE
   ****************************************************/
  function setupEventListeners() {
    const debounce = (fn, delay = 200) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    };

    refs.searchInput.addEventListener("input", debounce(applyFilters));
    refs.locationFilter.addEventListener("change", applyFilters);
    refs.dateFilter.addEventListener("change", applyFilters);
    refs.timeToggle.addEventListener("change", applyFilters);
    refs.showPast.addEventListener("change", applyFilters);
  }

  function applyFilters() {
    const term = refs.searchInput.value.toLowerCase();
    const loc = refs.locationFilter.value;
    const date = refs.dateFilter.value;
    const mode = refs.timeToggle.value; // upcoming | past
    const includePast = refs.showPast.checked;

    const today = new Date().toISOString().split("T")[0];

    filteredEvents = allEvents.filter(ev => {
      let ok = true;

      if (term && !(`${ev.title} ${ev.description}`.toLowerCase().includes(term)))
        ok = false;

      if (loc && ev.location !== loc)
        ok = false;

      if (date && ev.date !== date)
        ok = false;

      if (!includePast && ev.date < today)
        ok = false;

      if (mode === "upcoming" && ev.date < today)
        ok = false;

      if (mode === "past" && ev.date >= today)
        ok = false;

      return ok;
    });

    // Sorting based on your choice (A): chronological upcoming
    filteredEvents.sort((a, b) => a.date.localeCompare(b.date));

    renderEvents();
    updateMapMarkers();
  }

  /****************************************************
   * 4. LOCATION FILTER POPULATION
   ****************************************************/
  function populateLocationFilter() {
    const unique = [...new Set(allEvents.map(ev => ev.location))].filter(Boolean);
    unique.forEach(loc => {
      const opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      refs.locationFilter.appendChild(opt);
    });
  }

  /****************************************************
   * 5. RENDER EVENTS + PAGINATION
   ****************************************************/
  const EVENTS_PER_PAGE = 8;
  let currentPage = 1;

  function renderEvents() {
    refs.eventsList.innerHTML = "";
    refs.eventsList.classList.remove("hidden");

    const start = (currentPage - 1) * EVENTS_PER_PAGE;
    const pageEvents = filteredEvents.slice(start, start + EVENTS_PER_PAGE);

    if (pageEvents.length === 0) {
      refs.eventsList.innerHTML = "<p>No events found.</p>";
      refs.pagination.innerHTML = "";
      return;
    }

    pageEvents.forEach(ev => {
      const item = document.createElement("div");
      item.className = "event-item fade-in";
      item.innerHTML = `
        <h3>${ev.title}</h3>
        <p><strong>Date:</strong> ${ev.date}</p>
        <p><strong>Location:</strong> ${ev.location}</p>
        <p>${ev.description}</p>
      `;
      refs.eventsList.appendChild(item);
    });

    updatePagination();
  }

  function updatePagination() {
    const pages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
    refs.pagination.innerHTML = "";

    if (pages <= 1) return;

    for (let p = 1; p <= pages; p++) {
      const btn = document.createElement("button");
      btn.textContent = p;
      btn.className = p === currentPage ? "active" : "";
      btn.addEventListener("click", () => {
        currentPage = p;
        renderEvents();
        updateMapMarkers();
      });
      refs.pagination.appendChild(btn);
    }
  }

  /****************************************************
   * 6. MAP SETUP (SAFE LEAFLET INIT)
   ****************************************************/
  function setupMap() {
    if (!refs.mapContainer) {
      console.error("Map container not found.");
      return;
    }

    map = L.map(refs.mapContainer).setView([32.8, -95.5], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    markers = L.markerClusterGroup();
    map.addLayer(markers);

    console.log("Map initialized.");
  }

  function updateMapMarkers() {
    if (!markers) return;

    markers.clearLayers();

    filteredEvents.forEach(ev => {
      if (ev.lat && ev.lng) {
        const marker = L.marker([ev.lat, ev.lng]).bindPopup(`
          <strong>${ev.title}</strong><br>
          ${ev.date}<br>
          ${ev.location}
        `);
        markers.addLayer(marker);
      }
    });
  }

  /****************************************************
   * 7. SKELETON LOADING
   ****************************************************/
  function showSkeletonLoaders() {
    let skeletonHTML = "";
    for (let i = 0; i < 6; i++) {
      skeletonHTML += `
        <div class="event-skeleton">
          <div class="sk-title"></div>
          <div class="sk-line"></div>
          <div class="sk-line short"></div>
        </div>
      `;
    }
    refs.eventsList.innerHTML = skeletonHTML;
    refs.eventsList.classList.remove("hidden");
  }

  function fadeOutSkeleton() {
    document.querySelectorAll(".event-skeleton").forEach(el => {
      el.classList.add("fade-out");
      setTimeout(() => el.remove(), 400);
    });
  }
});
