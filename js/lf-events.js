/*******************************************************
 * L A K E   F O R K   E V E N T S
 * Leaflet Version – Full Frontend JS
 * Matches existing HTML, backend, logging, POST, modal,
 * pagination, clustering, and geocoding.
 *******************************************************/

// ------------------------------
// CONFIG
// ------------------------------
const EVENTS_URL =
  "https://script.google.com/macros/s/AKfycbx303zczPC-AcXwbpoZg-NwWo3MoaWxbce_UgeLA_GTEP1sS1B-3HycIZ3re0arA3Yy/exec";

// Map + Event data
let map;
let markersLayer;
let clusterGroup;
let allEvents = [];
let currentPage = 1;
const EVENTS_PER_PAGE = 5;

// DOM elements
const eventsListEl = document.getElementById("events-list");
const paginationEl = document.getElementById("pagination");
const mapSpinner = document.getElementById("map-spinner");
const spinner = document.getElementById("spinner");

// Modal elements
const eventFormModal = document.getElementById("eventFormModal");
const openEventFormBtn = document.getElementById("openEventFormBtn");
const closeEventFormBtn = document.getElementById("closeEventFormBtn");
const eventForm = document.getElementById("eventForm");

// Form fields
const evTitle = document.getElementById("evTitle");
const evStart = document.getElementById("evStart");
const evEnd = document.getElementById("evEnd");
const evLocation = document.getElementById("evLocation");
const evDesc = document.getElementById("evDesc");
const evRegLink = document.getElementById("evRegLink");
const evLogo = document.getElementById("evLogo");
const evEmail = document.getElementById("evEmail");
const evHoney = document.getElementById("evHoney");
const submitEventBtn = document.getElementById("submitEventBtn");


// ------------------------------
// INITIALIZE MAP (Leaflet)
// ------------------------------
function initMap() {
  console.log("[LF EVENTS] Initializing Leaflet map…");

  map = L.map("eventsMap").setView([32.764, -96.802], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap"
  }).addTo(eventsMap);

  clusterGroup = L.markerClusterGroup();
  map.addLayer(clusterGroup);
}


// ------------------------------
// LOAD EVENTS FROM BACKEND
// ------------------------------
async function loadEvents() {
  console.log("[LF EVENTS] Fetching events…");
  spinner.style.display = "block";

  let response;
  try {
    response = await fetch(EVENTS_URL);
  } catch (err) {
    console.error("[LF EVENTS] Network error:", err);
    showFatalError("Network error contacting server.");
    return;
  }

  console.log("[LF EVENTS] Raw response:", response);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error("[LF EVENTS] Invalid JSON:", err);
    showFatalError("Invalid server JSON.");
    return;
  }

  console.log("[LF EVENTS] Parsed response:", data);

  if (!Array.isArray(data)) {
    console.error("[LF EVENTS] Backend returned non-array:", data);
    showFatalError("Server returned an unexpected format.");
    return;
  }

  allEvents = data;
  console.log("[LF EVENTS] Total published events:", allEvents.length);

  renderEvents();
  addMarkers();

  spinner.style.display = "none";
}


// ------------------------------
// RENDER EVENTS (LIST + PAGINATION)
// ------------------------------
function renderEvents() {
  eventsListEl.innerHTML = "";

  const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
  const pageEvents = allEvents.slice(startIndex, startIndex + EVENTS_PER_PAGE);

  if (pageEvents.length === 0) {
    eventsListEl.innerHTML = "<p>No events found.</p>";
    return;
  }

  pageEvents.forEach(ev => {
    const item = document.createElement("div");
    item.className = "event-item";
    item.innerHTML = `
      <h3>${ev.title}</h3>
      <p><strong>Date:</strong> ${ev.start}</p>
      <p><strong>Location:</strong> ${ev.location}</p>
      <p>${ev.description}</p>
      ${ev.regLink ? `<a href="${ev.regLink}" target="_blank">Register</a>` : ""}
    `;
    eventsListEl.appendChild(item);
  });

  renderPagination();
}

function renderPagination() {
  paginationEl.innerHTML = "";

  const totalPages = Math.ceil(allEvents.length / EVENTS_PER_PAGE);
  if (totalPages <= 1) return;

  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.className = p === currentPage ? "active" : "";
    btn.addEventListener("click", () => {
      currentPage = p;
      renderEvents();
    });
    paginationEl.appendChild(btn);
  }
}


// ------------------------------
// ADD MARKERS TO MAP (Leaflet)
// ------------------------------
function addMarkers() {
  console.log("[LF EVENTS] Adding markers to map…");
  mapSpinner.style.display = "block";
  clusterGroup.clearLayers();

  allEvents.forEach(ev => {
    if (!ev.lat || !ev.lng) return;

    const marker = L.marker([ev.lat, ev.lng]);

    const popupHTML = `
      <strong>${ev.title}</strong><br>
      ${ev.location}<br>
      ${ev.start}<br><br>
      ${ev.regLink ? `<a href="${ev.regLink}" target="_blank">Register</a>` : ""}
    `;

    marker.bindPopup(popupHTML);
    clusterGroup.addLayer(marker);
  });

  mapSpinner.style.display = "none";
}


// ------------------------------
// FORM MODAL HANDLERS
// ------------------------------
openEventFormBtn.addEventListener("click", () => {
  eventFormModal.classList.remove("hidden");
});

closeEventFormBtn.addEventListener("click", () => {
  eventFormModal.classList.add("hidden");
});

window.addEventListener("click", e => {
  if (e.target === eventFormModal) {
    eventFormModal.classList.add("hidden");
  }
});


// ------------------------------
// FORM SUBMISSION (POST → Apps Script)
// ------------------------------
eventForm.addEventListener("submit", async e => {
  e.preventDefault();

  console.log("[LF EVENTS] Submitting event…");

  // Honeypot detection
  if (evHoney.value.trim() !== "") {
    alert("Spam detected.");
    return;
  }

  // Validate fields
  if (!evTitle.value.trim()) {
    alert("Title is required.");
    return;
  }
  if (!evStart.value || !evEnd.value) {
    alert("Start and end date are required.");
    return;
  }

  submitEventBtn.disabled = true;
  submitEventBtn.innerText = "Submitting…";

  let token;
  try {
    token = await grecaptcha.execute("6Lf8aggsAAAAAIOpVuFxlM1gyC2AGQWegPZ8RLOz", { action: "submit" });
  } catch (err) {
    console.error("[LF EVENTS] reCAPTCHA error:", err);
    alert("reCAPTCHA failed.");
    submitEventBtn.disabled = false;
    submitEventBtn.innerText = "Submit Event";
    return;
  }

  const payload = {
    title: evTitle.value.trim(),
    start: evStart.value,
    end: evEnd.value,
    description: evDesc.value.trim(),
    location: evLocation.value.trim(),
    regLink: evRegLink.value.trim(),
    logo: evLogo.value.trim(),
    email: evEmail.value.trim(),
    honeypot: evHoney.value,
    recaptchaToken: token
  };

  console.log("[LF EVENTS] Payload:", payload);

  try {
    const response = await fetch(EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("[LF EVENTS] POST result:", result);

    if (result.success) {
      alert("Event submitted for approval!");
      eventFormModal.classList.add("hidden");
      eventForm.reset();
    } else {
      alert("Failed: " + (result.reason || result.error));
    }
  } catch (err) {
    console.error("[LF EVENTS] POST error:", err);
    alert("Submission failed.");
  }

  submitEventBtn.disabled = false;
  submitEventBtn.innerText = "Submit Event";
});


// ------------------------------
// ERROR FALLBACK
// ------------------------------
function showFatalError(msg) {
  eventsListEl.innerHTML = `<p style="color:red;font-weight:bold;">${msg}</p>`;
}


// ------------------------------
// START APP
// ------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[LF EVENTS] App starting…");
  initMap();
  await loadEvents();
});
