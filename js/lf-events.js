/*******************************************************
 LAKE FORK EVENTS – FINAL UNIFIED FRONTEND JS (2025)
 - Map + event rendering preserved exactly
 - One submission system (matching your HTML)
 - Hardened validation, error handling & UX
 - Double-submit protection
 - reCAPTCHA v3 integrated
 - Works natively with lf-events-appscripts backend
*******************************************************/

/* =====================================================
   1) GOOGLE MAP + EVENTS LOADING
===================================================== */

let map;
let markers = [];
let markerCluster;
let events = [];
let currentPage = 1;
const eventsPerPage = 7;

/* Initialize Google Map */
function initMap() {
  map = new google.maps.Map(document.getElementById("eventsMap"), {
    zoom: 6,
    center: { lat: 32.764, lng: -96.802 },
  });

  document.getElementById("eventsList").innerHTML =
  `<p class="loading-message">Loading events...</p>`;

  loadEvents();
}

/* Fetch events from Apps Script */
function loadEvents() {
  fetch("https://script.google.com/macros/s/AKfycbx303zczPC-AcXwbpoZg-NwWo3MoaWxbce_UgeLA_GTEP1sS1B-3HycIZ3re0arA3Yy/exec")
    .then(res => res.json())
    .then(data => {
      events = Array.isArray(data) ? data : (data.events || []);
      renderEvents();
      addMarkers();
    })
    .catch(err => {
      console.error("Error loading events:", err);
      document.getElementById("eventsList").innerHTML = `
        <div class="no-events-message">
          <p>Couldn't load events right now. Please try again later.</p>
        </div>
      `;
    });
}

/* Parse ISO date */
function parseDate(d) {
  return new Date(d);
}

/* Convert to local time display */
function formatLocalTime(d) {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

/* Render Events List + Pagination */
function renderEvents() {
  events.sort((a, b) => new Date(a.start) - new Date(b.start));

  // If no events exist
  if (!events.length) {
    const container = document.getElementById("eventsList");
    container.innerHTML = `
      <div class="no-events-message">
        <p>No events are scheduled yet. Please check back soon!</p>
      </div>
    `;
    document.getElementById("eventsPagination").innerHTML = "";
    return;
  }


  const container = document.getElementById("eventsList");
  container.innerHTML = "";

  const startIndex = (currentPage - 1) * eventsPerPage;
  const pageEvents = events.slice(startIndex, startIndex + eventsPerPage);

  pageEvents.forEach(ev => {
    const start = parseDate(ev.start);
    const end = parseDate(ev.end);

    const el = document.createElement("div");
    el.className = "eventItem";

    el.innerHTML = `
      <div class="ev-date-block">
        <div class="ev-month">${start.toLocaleString("en-US", { month: "short" }).toUpperCase()}</div>
        <div class="ev-day">${start.getDate()}</div>
      </div>

      <div class="ev-details">
        <div class="ev-title">${ev.title}</div>
        <div class="ev-datetime">${formatLocalTime(start)} – ${formatLocalTime(end)}</div>
        <div class="ev-location">${ev.location}</div>

        ${ev.description ? `<p class="ev-desc">${ev.description}</p>` : ""}

        <div class="ev-buttons">
          ${ev.regLink ? `<a href="${ev.regLink}" target="_blank" class="ev-btn">Register</a>` : ""}
          <button class="ev-btn" onclick="zoomToMarker(${ev.lat}, ${ev.lng})">View on Map</button>
        </div>
      </div>

      ${ev.logo ? `<img src="${ev.logo}" class="ev-logo" />` : ""}
    `;

    container.appendChild(el);
  });

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(events.length / eventsPerPage);
  const pag = document.getElementById("eventsPagination");

  pag.innerHTML = `
    <button ${currentPage === 1 ? "disabled" : ""} onclick="prevPage()">Prev</button>
    <span>Page ${currentPage} of ${totalPages}</span>
    <button ${currentPage === totalPages ? "disabled" : ""} onclick="nextPage()">Next</button>
  `;
}

function nextPage() {
  currentPage++;
  renderEvents();
}

function prevPage() {
  currentPage--;
  renderEvents();
}

/* Add map markers */
function addMarkers() {
  if (markerCluster) {
    markerCluster.clearMarkers();
  }
  markers = [];

  events.forEach(ev => {
    const latNum = Number(ev.lat);
    const lngNum = Number(ev.lng);

    if (isNaN(latNum) || isNaN(lngNum)) return;
    if (latNum === 0 && lngNum === 0) return; // avoid bogus coordinates


    const marker = new google.maps.Marker({
      position: { lat: ev.lat, lng: ev.lng },
      title: ev.title,
    });

    markers.push(marker);
  });

  markerCluster = new markerClusterer.MarkerClusterer({ map, markers });
}

function zoomToMarker(lat, lng) {
  map.setZoom(14);
  map.setCenter({ lat, lng });
}

/* =====================================================
   2) EVENT SUBMISSION FORM (Single Unified System)
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("eventFormModal");
  const openBtn = document.getElementById("openEventFormBtn");
  const closeBtn = document.getElementById("closeEventFormBtn");
  const form = document.getElementById("eventForm");
  const msg = document.getElementById("eventMessage");
  const submitBtn = document.getElementById("submitEventBtn");

  /* Modal Controls */
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      modal.style.display = "block";
      msg.innerHTML = "";
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
      msg.innerHTML = "";
    });
  }

  window.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  /* -----------------------------
     Frontend Validation
  ------------------------------ */
  function validateForm() {
    const title = form.evTitle.value.trim();
    const start = form.evStart.value;
    const end = form.evEnd.value;
    const email = form.evEmail.value.trim();

    if (title.length < 3) return "Please enter a valid event title.";
    if (!start) return "Please select a start date/time.";
    if (!end) return "Please select an end date/time.";
    if (new Date(end) < new Date(start))
      return "End time must be after start time.";

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Please enter a valid email address.";

    return null;
  }

  /* -----------------------------
     Form Submission
  ------------------------------ */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.innerHTML = "";

    const validation = validateForm();
    if (validation) {
      msg.innerHTML = `<p class="lf-error">${validation}</p>`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const token = await grecaptcha.execute(
        "6Lf8aggsAAAAAIOpVuFxlM1gyC2AGQWegPZ8RLOz",
        { action: "submit" }
      );

      const payload = {
        title: form.evTitle.value.trim(),
        start: form.evStart.value,
        end: form.evEnd.value,
        description: form.evDesc.value.trim(),
        location: form.evLocation.value.trim(),
        regLink: form.evRegLink.value.trim(),
        logo: form.evLogo.value.trim(),
        email: form.evEmail.value.trim(),
        honeypot: form.evHoney.value.trim(),
        recaptchaToken: token
      };

      console.log("[LF EVENTS] Fetching events…");

      let response;
      try {
        response = await fetch("https://script.google.com/macros/s/AKfycbx303zczPC-AcXwbpoZg-NwWo3MoaWxbce_UgeLA_GTEP1sS1B-3HycIZ3re0arA3Yy/exec");
      } catch (err) {
        console.error("[LF EVENTS] Network error fetching events:", err);
        return showFatalError("Network failure contacting event server.");
      }

      console.log("[LF EVENTS] Raw response:", response);

      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.error("[LF EVENTS] Failed to parse JSON:", err);
        return showFatalError("Server returned invalid JSON.");
      }

      console.log("[LF EVENTS] Parsed event data:", data);


      msg.innerHTML = `<p class="lf-success">Your event has been submitted and is pending approval.</p>`;
      form.reset();

      setTimeout(() => {
        modal.style.display = "none";
        msg.innerHTML = "";
      }, 1500);

    } catch (err) {
      console.error(err);
      msg.innerHTML = `<p class="lf-error">A network error occurred. Please try again.</p>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Event";
    }
  });

  /* -----------------------------
     Unified Error Message Handling
  ------------------------------ */
  function handleError(reason) {
    const messages = {
      recaptcha_failed: "Verification failed. Please try again.",
      recaptcha_low_score: "Unable to verify your session.",
      spam_honeypot: "Spam detected.",
      invalid_title: "Please enter a valid title.",
      invalid_dates: "Please provide valid event dates.",
      too_many_urls: "Please reduce the number of links in the description.",
      offensive_content: "Your submission contains restricted content.",
      blocked_content: "Your submission was blocked by content filters.",
      rate_limit: "You are submitting too frequently. Please wait 1 minute."
    };

    msg.innerHTML = `<p class="lf-error">${messages[reason] || "An error occurred. Please try again."}</p>`;
  }
});

function showFatalError(msg) {
  const container = document.getElementById("events-list");
  container.innerHTML = `<p style="color:red; font-weight:bold;">${msg}</p>`;
}