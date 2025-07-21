const sheetUrl = "https://script.google.com/macros/s/AKfycbx303zczPC-AcXwbpoZg-NwWo3MoaWxbce_UgeLA_GTEP1sS1B-3HycIZ3re0arA3Yy/exec";
  const EVENTS_PER_PAGE = 10;
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  let allEvents = [];
  let filteredEvents = [];
  let currentPage = 1;
  let map, streetLayer, satelliteLayer, baseMaps, markersGroup;
  const locationCache = {}; // Cache geocoded locations

  async function loadEvents() {
    try {
      document.getElementById("spinner").classList.remove("hidden");
      document.getElementById("events-list").classList.add("hidden");

      const res = await fetch(sheetUrl);
      console.log("Fetch response status:", res.status);
      const json = await res.json();
      console.log("Fetched data:", json);
      allEvents = json.map(event => {
        const cleaned = {};
        Object.entries(event).forEach(([key, val]) => {
          cleaned[key.trim()] = val;
        });
        return cleaned;
      });
      allEvents = allEvents
        .filter(e => e["Start Date"])
        .map(e => ({
        ...e,
        dateObj: new Date(e["Start Date"]),
        endDateObj: e["End Date"] ? new Date(e["End Date"]) : null,
      }))
        .sort((a, b) => a.dateObj - b.dateObj);

      init();
    } catch (err) {
      document.getElementById("events-list").innerHTML = "Failed to load events.";
      console.error(err);
    }
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    return `${hours}:${minutes} ${ampm}`;
  }

  function init() {
    populateLocationFilter();
    applyFilters();
  }

  function populateLocationFilter() {
    const locationSet = new Set(allEvents.map(e => e["Location"]).filter(Boolean));
    const select = document.getElementById("locationFilter");
    select.innerHTML = '<option value="">All Locations</option>'; // reset first
    locationSet.forEach(loc => {
      const option = document.createElement("option");
      option.value = loc;
      option.textContent = loc;
      select.appendChild(option);
    });
  }

  function isEventPast(event) {
    const now = new Date();
    return event.endDateObj ? event.endDateObj < now : event.dateObj < now;
  }

  function isToday(event) {
    const today = new Date();
    const eventStart = event.dateObj;
    const eventEnd = event.endDateObj || event.dateObj;
    return today >= eventStart && today <= eventEnd;
  }

  function applyFilters() {
    const query = document.getElementById("search").value.toLowerCase();
    const loc = document.getElementById("locationFilter").value;
    const date = document.getElementById("dateFilter").value;
    const showPast = document.getElementById("showPast").checked;
    const timeToggle = document.getElementById("timeToggle").value;

    filteredEvents = allEvents.filter(e => {
      const textMatch = (
        (e["Title"] || "").toLowerCase().includes(query) ||
        (e["Description"] || "").toLowerCase().includes(query) ||
        (e["Location"] || "").toLowerCase().includes(query)
      );
      const locMatch = !loc || e["Location"] === loc;
      const dateMatch = !date || (e["Start Date"] && e["Start Date"].startsWith(date));
      const pastMatch = showPast || !isEventPast(e);
      const isPast = isEventPast(e);
      const timeMatch = (timeToggle === "past" && isPast) || (timeToggle === "upcoming" && !isPast);

      return textMatch && locMatch && dateMatch && pastMatch && timeMatch;
    });

    currentPage = 1;
    renderEvents();
  }

  function renderEvents() {
    const list = document.getElementById("events-list");
    list.innerHTML = "";

    const start = (currentPage - 1) * EVENTS_PER_PAGE;
    const end = start + EVENTS_PER_PAGE;
    const pageEvents = filteredEvents.slice(start, end);

    if (pageEvents.length === 0) {
      list.innerHTML = "<p>No events found.</p>";
      document.getElementById("pagination").innerHTML = "";
      return;
    }

    pageEvents.forEach(event => {
      const div = document.createElement("div");
      div.className = "event";

      if (isToday(event)) {
        div.classList.add("today-highlight");
      }

      const logo = event["Logo Link"]
      ? `<img src="${event["Logo Link"]}" alt="Logo" class="event-logo">`
      : "";

      const regLink = event["Registration Link"]
      ? `<a class="registration-link" href="${event["Registration Link"]}" target="_blank">Register Here</a>`
      : "";

      const eventLink = event["Event Link"]
      ? `<a class="event-link" href="${event["Event Link"]}" target="_blank">More Info</a>`
      : "";

      // Format date and time
      const startDate = formatDate(event["Start Date"]);
      const endDate = event["End Date"] ? formatDate(event["End Date"]) : startDate;
      const startTime = formatTime(event["Start Date"]);

      // Create date display with conditional formatting
      let dateDisplay = `<div><strong>Date:</strong> ${startDate}`;
      if (startDate !== endDate) {
        dateDisplay += ` - ${endDate}`;
      }
      dateDisplay += `</div>`;

      // Add time display
      const timeDisplay = `<div><strong>Start Time:</strong> ${startTime}</div>`;

      div.innerHTML = `
      ${logo}
      <div class="event-title">${event["Title"]}</div>
      ${dateDisplay}
      ${timeDisplay}
      <div><strong>Location:</strong> ${event["Location"] || "TBD"}</div>
      <div class="event-description">${event["Description"] || ""}</div>
      <div class="event-links">
        ${regLink}
        ${eventLink}
  </div>
    `;

      div.addEventListener("click", () => {
        if (event["Event Link"]) {
          window.open(event["Event Link"], "_blank");
        } else {
          document.getElementById("calendar-iframe").scrollIntoView({ behavior: 'smooth' });
        }
      });

      list.appendChild(div);
    });

    document.getElementById("spinner").classList.add("hidden");
    document.getElementById("events-list").classList.remove("hidden");

    renderPagination();
    updateMapMarkers();
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
    const container = document.getElementById("pagination");
    container.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      if (i === currentPage) btn.style.background = "#0056b3";
      btn.addEventListener("click", () => {
        currentPage = i;
        renderEvents();
      });
      container.appendChild(btn);
    }
  }

  function initializeMap() {
    streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    });

    satelliteLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: '&copy; Google Maps',
    });

    map = L.map("map", {
      center: [32.8, -95.6],
      zoom: 9,
      layers: [streetLayer]
    });

    baseMaps = {
      "Street Map": streetLayer,
      "Satellite": satelliteLayer,
    };

    L.control.layers(baseMaps).addTo(map);

    markersGroup = L.markerClusterGroup();
    map.addLayer(markersGroup);
  }

  function updateMapMarkers() {
  const spinner = document.getElementById("map-spinner");
  if (spinner) {
    spinner.classList.remove("hidden");
  }

  if (!map || !markersGroup) return;

  markersGroup.clearLayers();
  const bounds = L.latLngBounds([]);

  const fishIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/616/616408.png',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  const start = (currentPage - 1) * EVENTS_PER_PAGE;
  const end = start + EVENTS_PER_PAGE;
  const pageEvents = filteredEvents.slice(start, end);

  pageEvents.forEach(event => {
    const lat = parseFloat(event["Latitude"]);
    const lon = parseFloat(event["Longitude"]);
    console.log("Placing marker:", event["Title"], lat, lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      const marker = L.marker([lat, lon], { icon: fishIcon }).bindPopup(event["Title"]);
      marker.on("click", () => {
        document.getElementById("search").value = event["Title"];
        applyFilters();
      });
      markersGroup.addLayer(marker);
      bounds.extend([lat, lon]);
    }
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds);
  }

  if (spinner) {
    spinner.classList.add("hidden");
  }
}

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target); // only load once
        initializeMap(); // move all map logic into this function
      }
    });
  });

  observer.observe(document.getElementById("map"));

  document.getElementById("search").addEventListener("input", applyFilters);
  document.getElementById("locationFilter").addEventListener("change", applyFilters);
  document.getElementById("dateFilter").addEventListener("change", applyFilters);
  document.getElementById("showPast").addEventListener("change", applyFilters);
  document.getElementById("timeToggle").addEventListener("change", applyFilters);

  loadEvents();
  setInterval(loadEvents, REFRESH_INTERVAL);