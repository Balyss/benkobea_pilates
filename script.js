/* ====================================================
   BEA PILATES – Fő JavaScript fájl
   ====================================================

   TARTALOM:
   1. IDŐPONTOK – itt tudod szerkeszteni az órákat
   2. Órarend megjelenítés + szűrés
   3. Foglalási modal
   4. EmailJS – email értesítő
   5. Navigáció (hamburger menü)

   ==================================================== */


/* ====================================================
   1. IDŐPONTOK SZERKESZTÉSE
   ----------------------------------------------------
   Ide vedd fel az órákat. Minden időpont egy objektum:

   {
     id: egyedi szám (ne változtasd),
     location: "helyszín neve" (pontosan ahogy a filterben megjelenik),
     date: "ÉÉÉÉ-HH-NN",
     startTime: "ÓÓ:PP",
     durationMin: perc (pl. 60),
     priceHuf: ár forintban,
     maxSpots: max létszám,
     bookedSpots: már foglalt helyek száma (növeld ha valaki foglal),
   }

   ==================================================== */

const SESSIONS = [
  {
  id: 5,
  location: "Pilates Nyírpazony",
  date: "2026-05-15",
  startTime: "09:00",
  durationMin: 60,
  priceHuf: 2500,
  maxSpots: 15,
  bookedSpots: 0,
  },
  {
    id: 1,
    location: "Pilates Human-Net Ház",
    date: "2026-05-08",
    startTime: "17:30",
    durationMin: 60,
    priceHuf: 2500,
    maxSpots: 15,
    bookedSpots: 3,
  },
  {
    id: 2,
    location: "Pilates Rozsrétszőlő",
    date: "2026-05-09",
    startTime: "10:00",
    durationMin: 60,
    priceHuf: 2500,
    maxSpots: 22,
    bookedSpots: 10,
  },
  {
    id: 3,
    location: "Pilates Mentorállás",
    date: "2026-05-09",
    startTime: "17:00",
    durationMin: 60,
    priceHuf: 2500,
    maxSpots: 12,
    bookedSpots: 12, // telt ház példa
  },
  {
    id: 4,
    location: "Pilates Human-Net Ház",
    date: "2026-05-13",
    startTime: "10:00",
    durationMin: 60,
    priceHuf: 2500,
    maxSpots: 22,
    bookedSpots: 5,
  },
  // ← IDE VEGYÉL FEL ÚJABB IDŐPONTOKAT UGYANÍGY
];


/* ====================================================
   2. ÓRAREND MEGJELENÍTÉS
   ==================================================== */

let activeFilter = "all";
let selectedSession = null;

// Magyar napok és hónapok
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
  const locations = [...new Set(SESSIONS.map(s => s.location))];
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

  // Csoportosítás dátum szerint
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
      const freeSpots = s.maxSpots - s.bookedSpots;
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
          <span class="badge ${isFull ? "badge-full" : "badge-free"}">
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

// Oldal betöltésekor – ha van ?helyszin= a linkben, automatikusan szűr
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
   3. FOGLALÁSI MODAL
   ==================================================== */

function openModal(sessionId) {
  selectedSession = SESSIONS.find(s => s.id === sessionId);
  if (!selectedSession) return;

  const freeSpots = selectedSession.maxSpots - selectedSession.bookedSpots;
  document.getElementById("modalSessionName").textContent = selectedSession.location;
  document.getElementById("modalSessionDetails").textContent =
    `${formatDate(selectedSession.date)} · ${selectedSession.startTime} · ${freeSpots} szabad hely · ${formatHUF(selectedSession.priceHuf)}`;

  // Reset
  ["fName","fEmail","fPhone","fNote"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("fParticipants").value = "1";
  document.getElementById("successBox").style.display = "none";
  document.getElementById("submitBtn").disabled = false;

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

// ESC gomb
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });


/* ====================================================
   4. EMAIL KÜLDÉS – EmailJS
   ----------------------------------------------------
   BEÁLLÍTÁS:
   a) Regisztrálj: https://www.emailjs.com (ingyenes)
   b) Hozz létre egy "Email Service"-t (Gmail-lel)
   c) Hozz létre egy "Email Template"-t ezekkel a változókkal:
      {{from_name}}, {{from_email}}, {{phone}},
      {{session_name}}, {{session_details}}, {{participants}}, {{note}}
   d) Cseréld le az alábbi három értéket:

   ==================================================== */

const EMAILJS_SERVICE_ID  = "service_jvwyshj";     // pl. "service_abc123"
const EMAILJS_TEMPLATE_ID = "template_9pd2y7i";    // pl. "template_xyz789"
const EMAILJS_PUBLIC_KEY  = "NzZH14UcrzzI98jCD";     // pl. "abcDEFghiJKL"

// EmailJS betöltése
(function() {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
  script.onload = () => emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  document.head.appendChild(script);
})();

async function submitBooking() {
  const name  = document.getElementById("fName").value.trim();
  const email = document.getElementById("fEmail").value.trim();

  if (!name || !email) {
    alert("Kérlek add meg a neved és email címed!");
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
    participants:    document.getElementById("fParticipants").value,
    note:            document.getElementById("fNote").value.trim() || "—",
    to_email:        "balazsibalint2020@gmail.com", // ← EZT ÁTÍRHATOD BÁRMIKOR
  };

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
    document.getElementById("successBox").style.display = "block";
    btn.textContent = "Elküldve ✓";
  } catch (err) {
    console.error("EmailJS hiba:", err);
    btn.disabled = false;
    btn.textContent = "Foglalás küldése →";
    alert("Hiba történt a küldés során. Kérlek próbáld újra, vagy írj emailt: balazsibalint2020@gmail.com");
  }
}


/* ====================================================
   5. NAVIGÁCIÓ – hamburger menü (mobilon)
   ==================================================== */

function toggleMenu() {
  const links = document.getElementById("navLinks");
  links.classList.toggle("open");
}

// Kívülre kattintásra bezárul
document.addEventListener("click", e => {
  const nav = document.querySelector(".nav");
  if (nav && !nav.contains(e.target)) {
    const links = document.getElementById("navLinks");
    if (links) links.classList.remove("open");
  }
});