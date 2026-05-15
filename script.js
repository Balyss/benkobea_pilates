/* ====================================================
   BEA PILATES – Fő JavaScript fájl
   ==================================================== */


/* ====================================================
   1. IDŐPONTOK SZERKESZTÉSE
   ==================================================== */

const SESSIONS = [
  {
    id: 1,
    location: "Pilates Nyírpazony",
    date: "2027-05-15",
    startTime: "09:00",
    durationMin: 60,
    priceHuf: 2500,
    maxSpots: 15,
    bookedSpots: 0,
  },
  {
    id: 2,
    location: "Pilates Human-Net Ház",
    date: "2027-05-10",
    startTime: "10:00",
    durationMin: 60,
    priceHuf: 2500,
    maxSpots: 22,
    bookedSpots: 5,
  },
  {
    id: 3,
    location: "Pilates Rozsrétszőlő",
    date: "2027-05-09",
    startTime: "17:30",
    durationMin: 60,
    priceHuf: 2500,
    maxSpots: 15,
    bookedSpots: 3,
  },
  {
    id: 4,
    location: "Pilates Mentorállás",
    date: "2027-05-09",
    startTime: "17:00",
    durationMin: 60,
    priceHuf: 2500,
    maxSpots: 12,
    bookedSpots: 4,
  },
];

/*
   BARION FIZETÉSI LINKEK
   Ha megvan a Barion fiókod, ide írd be az egyes
   időpontokhoz tartozó fizetési linkeket.
   Ha még nincs, hagyd üresen ("") – ilyenkor csak
   a készpénzes opció jelenik meg.
*/
const BARION_LINKS = {
  1: "", // Nyírpazony – pl. "https://secure.barion.com/Pay?Id=xxx"
  2: "", // Human-Net Ház
  3: "", // Rozsrétszőlő
  4: "", // Mentorállás
};


/* ====================================================
   2. SZABAD HELYEK (localStorage)
   ==================================================== */

function getExtraBooked(sessionId) {
  const data = JSON.parse(localStorage.getItem("bea_bookings") || "{}");
  return data[sessionId] || 0;
}

function addBooking(sessionId, participants) {
  const data = JSON.parse(localStorage.getItem("bea_bookings") || "{}");
  data[sessionId] = (data[sessionId] || 0) + parseInt(participants);
  localStorage.setItem("bea_bookings", JSON.stringify(data));
}

function getFreeSpots(session) {
  return session.maxSpots - session.bookedSpots - getExtraBooked(session.id);
}


/* ====================================================
   3. ÓRAREND MEGJELENÍTÉS + SZŰRÉS
   ==================================================== */

let activeFilter = "all";
let selectedSession = null;

const HU_DAYS   = ["vasárnap","hétfő","kedd","szerda","csütörtök","péntek","szombat"];
const HU_MONTHS = ["január","február","március","április","május","június","július","augusztus","szeptember","október","november","december"];

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}. ${HU_MONTHS[d.getMonth()]} ${d.getDate()}., ${HU_DAYS[d.getDay()]}`;
}

function formatHUF(amount) {
  return amount.toLocaleString("hu-HU") + " Ft";
}

function buildFilterButtons() {
  const row = document.getElementById("filterRow");
  if (!row) return;
  const locations = [
    "Pilates Human-Net Ház",
    "Pilates Nyírpazony",
    "Pilates Rozsrétszőlő",
    "Pilates Mentorállás",
  ].filter(loc => SESSIONS.some(s => s.location === loc));

  locations.forEach(loc => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.textContent = loc;
    btn.onclick = () => filterSessions(loc, btn);
    row.appendChild(btn);
  });
}

function filterSessions(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderSessions();
}

function renderSessions() {
  const wrap = document.getElementById("sessionsList");
  if (!wrap) return;

  const now = new Date();
  const filtered = SESSIONS
    .filter(s => {
      const sessionDate = new Date(s.date + "T" + s.startTime);
      return sessionDate >= now && (activeFilter === "all" || s.location === activeFilter);
    })
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="empty-state">Jelenleg nincs meghirdetett óra.</div>';
    return;
  }

  const grouped = {};
  filtered.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });

  wrap.innerHTML = "";
  Object.entries(grouped).forEach(([date, sessions]) => {
    const group = document.createElement("div");
    group.className = "day-group";
    group.innerHTML = `<div class="day-label">${formatDate(date)}</div>`;

    sessions.forEach(s => {
      const freeSpots = getFreeSpots(s);
      const isFull = freeSpots <= 0;
      const row = document.createElement("div");
      row.className = "session-row";
      row.innerHTML = `
        <div class="session-time">${s.startTime}</div>
        <div class="session-info">
          <div class="session-loc">${s.location}</div>
          <div class="session-meta">${s.durationMin} perc · ${formatHUF(s.priceHuf)}</div>
        </div>
        <div class="session-right">
          <span class="badge ${isFull ? "badge-full" : "badge-free"}" id="badge-${s.id}">
            ${isFull ? "Megtelt" : freeSpots + " szabad hely"}
          </span>
          ${!isFull ? `<button class="btn btn-primary btn-sm" onclick="openModal(${s.id})">Foglalás</button>` : ""}
        </div>
      `;
      group.appendChild(row);
    });

    wrap.appendChild(group);
  });
}

if (document.getElementById("sessionsList")) {
  buildFilterButtons();
  const params = new URLSearchParams(window.location.search);
  const preFilter = params.get("helyszin");
  if (preFilter) {
    activeFilter = preFilter;
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.classList.toggle("active", btn.textContent === preFilter);
    });
  }
  renderSessions();
}


/* ====================================================
   4. FOGLALÁSI MODAL
   ==================================================== */

function openModal(sessionId) {
  selectedSession = SESSIONS.find(s => s.id === sessionId);
  if (!selectedSession) return;

  const freeSpots = getFreeSpots(selectedSession);
  document.getElementById("modalSessionName").textContent = selectedSession.location;
  document.getElementById("modalSessionDetails").textContent =
    `${formatDate(selectedSession.date)} · ${selectedSession.startTime} · ${freeSpots} szabad hely · ${formatHUF(selectedSession.priceHuf)}`;

  // Kártyás fizetés csak ha van Barion link
  const hasBarion = !!BARION_LINKS[selectedSession.id];
  document.getElementById("paymentCard").style.display = hasBarion ? "flex" : "none";
  document.getElementById("paymentCash").checked = true;

  // Form reset
  ["fName","fEmail","fPhone","fNote"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("fParticipants").value = "1";
  document.getElementById("successBox").style.display = "none";
  document.getElementById("submitBtn").disabled = false;
  document.getElementById("submitBtn").textContent = "Foglalás küldése →";

  document.getElementById("modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
  selectedSession = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
}

document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });


/* ====================================================
   5. EMAIL KÜLDÉS + FOGLALÁS MENTÉSE
   ==================================================== */

const EMAILJS_SERVICE_ID  = "service_jvwyshj";
const EMAILJS_TEMPLATE_ID = "template_hxxoxsj";
const EMAILJS_PUBLIC_KEY  = "NzZH14UcrzzI98jCD";

(function() {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
  script.onload = () => emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  document.head.appendChild(script);
})();

async function submitBooking() {
  const name         = document.getElementById("fName").value.trim();
  const email        = document.getElementById("fEmail").value.trim();
  const participants = parseInt(document.getElementById("fParticipants").value);
  const paymentCash  = document.getElementById("paymentCash").checked;
  const paymentMethod = paymentCash ? "Helyszínen készpénz" : "Online kártyás fizetés";

  if (!name || !email) {
    alert("Kérlek add meg a neved és email címed!");
    return;
  }

  const freeSpots = getFreeSpots(selectedSession);
  if (participants > freeSpots) {
    alert(`Sajnos csak ${freeSpots} szabad hely maradt!`);
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Küldés...";

  const params = {
    from_name:       name,
    from_email:      email,
    phone:           document.getElementById("fPhone").value.trim() || "—",
    session_name:    selectedSession.location,
    session_details: document.getElementById("modalSessionDetails").textContent,
    participants:    participants,
    payment_method:  paymentMethod,
    note:            document.getElementById("fNote").value.trim() || "—",
    to_email:        "balazsibalint2020@gmail.com",
  };

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
    addBooking(selectedSession.id, participants);
    renderSessions();
    document.getElementById("successBox").style.display = "block";
    btn.textContent = "Elküldve ✓";

    // Ha kártyás fizetést választott → nyisd meg a Barion linket
    if (!paymentCash && BARION_LINKS[selectedSession.id]) {
      window.open(BARION_LINKS[selectedSession.id], "_blank");
    }
  } catch (err) {
    console.error("EmailJS hiba:", err);
    btn.disabled = false;
    btn.textContent = "Foglalás küldése →";
    alert("Hiba történt. Kérlek próbáld újra!");
  }
}


/* ====================================================
   6. NAVIGÁCIÓ
   ==================================================== */

function toggleMenu() {
  document.getElementById("navLinks").classList.toggle("open");
}

document.addEventListener("click", e => {
  const nav = document.querySelector(".nav");
  if (nav && !nav.contains(e.target)) {
    const links = document.getElementById("navLinks");
    if (links) links.classList.remove("open");
  }
});