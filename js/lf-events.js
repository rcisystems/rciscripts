// =======================================================
// Lake Fork Events — Front-end logic (optimized, readable)
// =======================================================
console.log("LF-EVENTS JS LOADED");

(function () {
  const API_URL = window.LAKE_FORK_API_URL ||
    "https://script.google.com/macros/s/AKfycbxiOi_KwTuf30pvE6vy4J6hWN1AUKNpxYpyQOkHymjCD7RlxVC4MFxtTe4bos8jVeyQ/exec";

  const refs = {
    searchInput: null,
    locationFilter: null,
    dateFilter: null,
    timeToggle: null,
    showPast: null,
    eventsList: null,
    pagination: null,
    mapSpinner: null,
    mapContainer: null
  };

  let allEvents = [];
  let filteredEvents = [];
  let map = null;
  let markerGroup = null;
  const EVENTS_PER_PAGE = 8;
  let currentPage = 1;

  // Debounce helper
  function debounce(fn, delay = 200) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Utility to wait next frame
  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  // INITIALIZATION: after load and after hydration safe delay
  window.addEventListener("load", () => {
    console.log("Window load fired — initialization starts after frame.");
    requestAnimationFrame(() => {
      setTimeout(init, 50);
    });
  });

  async function init() {
    console.log("Init starting…");

    assignDomRefs();
    showSkeletonLoaders();
    setupEventListeners();

    // Setup map early – but don’t block initial paint
    setupMap();

    // Fetch events in background
    const fetchPromise = fetchEvents();
    // yield one frame so skeleton appears
    await nextFrame();
    await fetchPromise;

    // After events loaded
    fadeOutSkeleton();
    refs.mapSpinner.classList.add("fade-out");
    setTimeout(() => refs.mapSpinner.remove(), 400);
  }

  function assignDomRefs() {
    refs.searchInput     = document.getElementById("search");
    refs.locationFilter  = document.getElementById("locationFilter");
    refs.dateFilter      = document.getElementById("dateFilter");
    refs.timeToggle      = document.getElementById("timeToggle");
    refs.showPast        = document.getElementById("showPast");
    refs.eventsList      = document.getElementById("events-list");
    refs.pagination      = document.getElementById("pagination");
    refs.mapSpinner      = document.getElementById("map-spinner");
    refs.mapContainer    = document.getElementById("eventsMap");

    console.log("DOM references assigned:", refs);
  }

  async function fetchEvents() {
    try {
      const response = await fetch(`${API_URL}?action=getEvents`, {
        method: "GET",
        redirect: "follow"
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || "Unknown error");

      allEvents = json.events || [];
      populateLocationFilter();
      applyFilters();
    } catch (err) {
      console.error("Failed to load events:", err);
      refs.eventsList.innerHTML = "<p>Failed to load events.</p>";
    }
  }

  function setupEventListeners() {
    const commonHandler = debounce(() => {
      currentPage = 1;         // reset to first page on filter change
      applyFilters();
    }, 250);

    refs.searchInput.addEventListener("input", commonHandler);
    refs.locationFilter.addEventListener("change", commonHandler);
    refs.dateFilter.addEventListener("change", commonHandler);
    refs.timeToggle.addEventListener("change", commonHandler);
    refs.showPast.addEventListener("change", commonHandler);
  }

  function applyFilters() {
    const term       = (refs.searchInput.value || "").toLowerCase();
    const loc        = refs.locationFilter.value;
    const date       = refs.dateFilter.value;
    const mode       = refs.timeToggle.value;   // "upcoming" or "past"
    const includePast = refs.showPast.checked;

    const today      = new Date().toISOString().split("T")[0];

    filteredEvents = allEvents.filter(ev => {
      if (term && !(`${ev.title} ${ev.description}`.toLowerCase().includes(term))) {
        return false;
      }
      if (loc && ev.location !== loc) {
        return false;
      }
      if (date && ev.date !== date) {
        return false;
      }
      if (!includePast && ev.date < today) {
        return false;
      }
      if (mode === "upcoming" && ev.date < today) {
        return false;
      }
      if (mode === "past" && ev.date >= today) {
        return false;
      }
      return true;
    });

    // Sort chronologically
    filteredEvents.sort((a, b) => a.date.localeCompare(b.date));

    renderEvents();
    // Use idle callback for map update to avoid blocking main thread
    if (window.requestIdleCallback) {
      requestIdleCallback(updateMapMarkers, { timeout: 500 });
    } else {
      updateMapMarkers();
    }
  }

  function populateLocationFilter() {
    const uniqueLocs = [...new Set(allEvents.map(ev => ev.location).filter(Boolean))];
    refs.locationFilter.innerHTML = `<option value="">All Locations</option>` +
      uniqueLocs.map(loc => `<option value="${loc}">${loc}</option>`).join("");
  }

  function renderEvents() {
    const listEl    = refs.eventsList;
    const pagEl     = refs.pagination;
    const startIdx  = (currentPage - 1) * EVENTS_PER_PAGE;
    const pageSlice = filteredEvents.slice(startIdx, startIdx + EVENTS_PER_PAGE);

    // Clear and render
    if (pageSlice.length === 0) {
      listEl.innerHTML   = "<p>No events found.</p>";
      pagEl.innerHTML    = "";
      return;
    }

    const frag = document.createDocumentFragment();
    for (const ev of pageSlice) {
      const item = document.createElement("div");
      item.className = "event-item";
      item.innerHTML = `
        <h3>${ev.title}</h3>
        <p><strong>Date:</strong> ${ev.date}</p>
        <p><strong>Location:</strong> ${ev.location}</p>
        <p>${ev.description}</p>
      `;
      frag.appendChild(item);
    }

    // Replace children in one operation
    listEl.innerHTML = "";
    listEl.appendChild(frag);

    updatePagination();
  }

  function updatePagination() {
    const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
    const pagEl      = refs.pagination;
    pagEl.innerHTML  = "";

    if (totalPages <= 1) {
      return;
    }

    const frag = document.createDocumentFragment();
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement("button");
      btn.textContent = p;
      btn.className = (p === currentPage) ? "active" : "";
      btn.addEventListener("click", () => {
        if (p === currentPage) return;
        currentPage = p;
        renderEvents();
        updateMapMarkers();
      });
      frag.appendChild(btn);
    }
    pagEl.appendChild(frag);
  }

  function setupMap() {
    const container = refs.mapContainer;
    if (!container) {
      console.error("Map container not found.");
      return;
    }

    // Lazy-initialize map on first view if desired
    map = L.map(container).setView([32.8, -95.5], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    markerGroup = L.markerClusterGroup();
    map.addLayer(markerGroup);

    console.log("Map initialized.");
  }

  function updateMapMarkers() {
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    for (const ev of filteredEvents) {
      if (ev.lat != null && ev.lng != null) {
        const marker = L.marker([ev.lat, ev.lng]).bindPopup(`
          <strong>${ev.title}</strong><br>
          ${ev.date}<br>
          ${ev.location}
        `);
        markerGroup.addLayer(marker);
      }
    }

    // Optionally: adjust map bounds to current markers
    const layerBounds = markerGroup.getBounds();
    if (layerBounds.isValid()) {
      map.fitBounds(layerBounds, { maxZoom: 14, padding: [40, 40] });
    }
  }

  function showSkeletonLoaders() {
    const listEl = refs.eventsList;
    let html = "";
    for (let i = 0; i < 6; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-line skeleton-long"></div>
          <div class="skeleton-line skeleton-medium"></div>
          <div class="skeleton-line skeleton-short"></div>
        </div>
      `;
    }
    listEl.innerHTML = html;
    listEl.classList.remove("hidden");
  }

  function fadeOutSkeleton() {
    const skeletons = refs.eventsList.querySelectorAll(".skeleton-card");
    skeletons.forEach(el => {
      el.classList.add("fade-out");
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    });
  }

})();
