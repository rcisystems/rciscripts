console.log("LF-EVENTS JS LOADED");
console.log("Before DOMContentLoaded hook");


/************************************************************
 * LAKE FORK EVENTS — FRONTEND JS (FULLY PATCHED, 2025)
 * Matches 13-column backend + Leaflet map + event rendering
 *
 * Backend event object (matching new schema):
 * {
 *   start, end, title, description, location,
 *   regLink, logo, eventLink, status,
 *   eventId, lat, lng, email
 * }
 ************************************************************/

/*********************
 * GLOBALS
 *********************/
const EVENTS_URL =
  "https://script.google.com/macros/s/AKfycbx303zczPC-AcXwbpoZg-NwWo3MoaWxbce_UgeLA_GTEP1sS1B-3HycIZ3re0arA3Yy/exec";

let map;
let clusterGroup;
let allEvents = [];
let currentPage = 1;
const EVENTS_PER_PAGE = 5;

// DOM elements
const eventsListEl = document.getElementById("events-list");
const paginationEl = document.getElementById("pagination");
const spinner = document.getElementById("spinner");
const mapSpinner = document.getElementById("map-spinner");

// Modal + Form
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
const evEventLink = document.getElementById("evEventLink");
const evEmail = document.getElementById("evEmail");
const evHoney = document.getElementById("evHoney");
const submitEventBtn = document.getElementById("submitEventBtn");


/************************************************************
 * MAP INITIALIZATION
 ************************************************************/
function initMap() {
  try {
    map = L.map("eventsMap").setView([32.764, -96.802], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(map);

    clusterGroup = L.markerClusterGroup();
    map.addLayer(clusterGroup);
  } catch (err) {
    console.error("MAP INIT ERROR:", err);
  }
}


/************************************************************
 * LOAD EVENTS (GET)
 ************************************************************/
async function loadEvents() {
  spinner.style.display = "block";

  try {
    const resp = await fetch(EVENTS_URL);
    const data = await resp.json();

    if (!Array.isArray(data)) {
      console.error("Invalid GET response:", data);
      spinner.style.display = "none";
      return;
    }

    allEvents = data;
    renderEvents();
    addMarkers();

  } catch (err) {
    console.error("GET request error:", err);
  }

  spinner.style.display = "none";
}


/************************************************************
 * RENDER EVENT LIST + PAGINATION
 ************************************************************/
function renderEvents() {
  eventsListEl.classList.remove("hidden");
  eventsListEl.innerHTML = "";

  if (allEvents.length === 0) {
    eventsListEl.innerHTML = `<p>No events found.</p>`;
    paginationEl.innerHTML = "";
    return;
  }

  const startIdx = (currentPage - 1) * EVENTS_PER_PAGE;
  const pageEvents = allEvents.slice(startIdx, startIdx + EVENTS_PER_PAGE);

  pageEvents.forEach(ev => {
    const div = document.createElement("div");
    div.className = "event-item";
    div.innerHTML = `
      <h3>${ev.title}</h3>
      <p><strong>Date:</strong> ${ev.start}</p>
      <p><strong>Location:</strong> ${ev.location}</p>
      <p>${ev.description || ""}</p>
      ${ev.regLink ? `<a href="${ev.regLink}" target="_blank">Register</a>` : ""}
      ${ev.eventLink ? `<br><a href="${ev.eventLink}" target="_blank">Event Link</a>` : ""}
    `;
    eventsListEl.appendChild(div);
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
    if (p === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => {
      currentPage = p;
      renderEvents();
    });
    paginationEl.appendChild(btn);
  }
}


/************************************************************
 * ADD MARKERS TO MAP
 ************************************************************/
function addMarkers() {
  mapSpinner.classList.remove("hidden");
  clusterGroup.clearLayers();

  allEvents.forEach(ev => {
    // lat/lng must match backend schema exactly
    if (ev.lat == null || ev.lng == null) return;

    const marker = L.marker([ev.lat, ev.lng]);
    const popupHTML = `
      <strong>${ev.title}</strong><br>
      ${ev.location}<br>
      ${ev.start}<br><br>
      ${ev.regLink ? `<a href="${ev.regLink}" target="_blank">Register</a><br>` : ""}
      ${ev.eventLink ? `<a href="${ev.eventLink}" target="_blank">Event Page</a>` : ""}
    `;

    marker.bindPopup(popupHTML);
    clusterGroup.addLayer(marker);
  });

  mapSpinner.classList.add("hidden");
}


/************************************************************
 * MODAL FORM HANDLERS
 ************************************************************/
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


/************************************************************
 * POST — SUBMIT NEW EVENT
 ************************************************************/
eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (evHoney.value.trim() !== "") {
    alert("Spam detected.");
    return;
  }

  if (!evTitle.value.trim() || !evStart.value || !evEnd.value) {
    alert("Please fill out Title, Start, and End date.");
    return;
  }

  submitEventBtn.disabled = true;
  submitEventBtn.textContent = "Submitting…";

  let token;
  try {
    token = await grecaptcha.execute("6Lf8aggsAAAAAIOpVuFxlM1gyC2AGQWegPZ8RLOz", {
      action: "submit"
    });
  } catch (err) {
    console.error("reCAPTCHA error:", err);
    alert("reCAPTCHA failed. Reload the page and try again.");
    submitEventBtn.disabled = false;
    submitEventBtn.textContent = "Submit Event";
    return;
  }

  const payload = {
    title: evTitle.value.trim(),
    start: evStart.value,
    end: evEnd.value,
    location: evLocation.value.trim(),
    description: evDesc.value.trim(),
    regLink: evRegLink.value.trim(),
    logo: evLogo.value.trim(),
    eventLink: evEventLink.value.trim(),
    email: evEmail.value.trim(),
    honeypot: evHoney.value,
    recaptchaToken: token
  };

  try {
    const resp = await fetch(EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();
    if (result.success) {
      alert("Event submitted for approval!");
      eventForm.reset();
      eventFormModal.classList.add("hidden");
    } else {
      alert("Submission failed: " + result.reason);
    }

  } catch (err) {
    console.error("POST error:", err);
    alert("Submission failed due to a network error.");
  }

  submitEventBtn.disabled = false;
  submitEventBtn.textContent = "Submit Event";
});


/************************************************************
 * INIT APP
 ************************************************************/
window.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded entered");
  console.log("Calling loadEvents()");
  initMap();
  await loadEvents();
});
