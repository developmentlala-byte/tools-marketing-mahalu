// Mahalu Spa - Ayu Marketing Workspace
// Static prototype. Text/status data is persisted in Supabase.
// Actual uploaded files are stored in Supabase Storage.

const SOP = {
  feed: [
    {
      time: "10:00",
      platform: "TikTok",
      format: "Video",
      defaultPillar: "Daily ASMR",
    },
    {
      time: "12:00",
      platform: "TikTok",
      format: "Video",
      defaultPillar: "Viral",
    },
    {
      time: "12:00",
      platform: "Instagram",
      format: "Reels/Carousel",
      defaultPillar: "Cinematic / Viral IG / Brand Character",
    },
    {
      time: "14:00",
      platform: "TikTok",
      format: "Video",
      defaultPillar: "KOL / Review",
    },
    {
      time: "16:00",
      platform: "TikTok",
      format: "Carousel",
      defaultPillar: "Viral / Facility",
    },
    {
      time: "17:00",
      platform: "Instagram",
      format: "Reels/Carousel",
      defaultPillar: "Cinematic / Viral IG / Brand Character",
    },
    {
      time: "18:00",
      platform: "TikTok",
      format: "Video",
      defaultPillar: "Viral / Conflict / Plot Twist",
    },
    {
      time: "19:00",
      platform: "TikTok",
      format: "Video",
      defaultPillar: "Review / Viral",
    },
    {
      time: "20:00",
      platform: "TikTok",
      format: "Carousel",
      defaultPillar: "Location / Facility",
    },
  ],
  ttStoryTimes: ["10:00", "12:00", "14:00", "16:00", "18:00", "19:00", "20:00"],
  igStoryCount: 10,
  pillars: {
    TikTok: ["Viral", "Daily ASMR", "KOL", "Review"],
    Instagram: ["Cinematic", "Viral IG", "Brand Character"],
  },
  framings: [
    "Honest Review",
    "Conflict",
    "Hasil Akhir",
    "Plot Twist",
    "Komedi",
    "Fasilitas",
    "Lokasi",
  ],
  storyTypes: [
    "Treatment ambience",
    "Preparation",
    "Dekor",
    "Cleaning",
    "Room tour",
    "Customer order",
    "Repost IG",
    "Repost TikTok",
    "Repost Customer",
    "BTS Therapist",
    "Product Detail",
    "Closing Ambience",
  ],
};

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

// --- SUPABASE ---
const SUPABASE_URL = "https://ljyvpivbglfphluwmtlp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeXZwaXZiZ2xmcGhsdXdtdGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMTA4OTUsImV4cCI6MjEwMjU4Njg5NX0.rTTZX7_9sxXzaNtSNtlVrp8jUhqKbgfk8xOtrekCShA";
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const STATE_ROW_ID = "main";
const BUCKET_NAME = "content-assets";

function isoDate(d) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

function fmtDateShort(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function nowLabel() {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateAssetCode(originalName = "") {
  const extMatch = originalName.match(/\.[a-z0-9]+$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : "";
  const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
  const part2 = Date.now().toString(36).slice(-4).toUpperCase();
  return `AST-${part1}-${part2}${ext}`;
}

function uid() {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-5)
  );
}

function migrateStoryAssetsToArray() {
  let touched = false;
  Object.values(state.weeks || {}).forEach((week) => {
    week.days.forEach((day) => {
      [day.ttStory, day.igStory].forEach((list) => {
        list.forEach((x) => {
          if (!Array.isArray(x.assets)) {
            x.assets = x.assetName
              ? [{ code: x.assetName, name: x.assetName, type: "", size: 0 }]
              : [];
            delete x.assetName;
            touched = true;
          }
        });
      });
    });
  });
  if (touched) saveState();
}

function migrateFeedAssetsToArray() {
  let touched = false;
  Object.values(state.weeks || {}).forEach((week) => {
    week.days.forEach((day) => {
      day.feed.forEach((item) => {
        if (!Array.isArray(item.assets)) {
          item.assets = item.assetName
            ? [
                {
                  code: item.assetName,
                  name: item.assetName,
                  type: item.assetType || "",
                  size: item.assetSize || 0,
                },
              ]
            : [];
          delete item.assetName;
          delete item.assetType;
          delete item.assetSize;
          touched = true;
        }
      });
    });
  });
  if (touched) saveState();
}

function migratePublishedFlag() {
  let touched = false;
  Object.values(state.weeks || {}).forEach((week) => {
    week.days.forEach((day) => {
      [day.feed, day.ttStory, day.igStory].forEach((list) => {
        list.forEach((x) => {
          if (typeof x.published !== "boolean") {
            x.published = false;
            touched = true;
          }
        });
      });
    });
  });
  if (touched) saveState();
}

const localAssetPreviewCache = {};

async function uploadStoryAssetFiles(itemId, fileList) {
  const uploaded = [];
  for (const file of Array.from(fileList)) {
    const code = generateAssetCode(file.name);
    const path = `${itemId}/${code}`;
    if (supabaseClient) {
      const { error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || undefined,
        });
      if (error) throw error;
    }
    localAssetPreviewCache[code] = URL.createObjectURL(file);
    uploaded.push({
      code,
      name: code,
      type: file.type || "",
      size: file.size || 0,
    });
  }
  return uploaded;
}

async function removeStoryAssetFile(itemId, code) {
  try {
    if (supabaseClient) {
      await supabaseClient.storage
        .from(BUCKET_NAME)
        .remove([`${itemId}/${code}`]);
    }
  } catch (e) {
    console.warn("Gagal hapus asset:", e);
  }
  if (localAssetPreviewCache[code]) {
    try {
      URL.revokeObjectURL(localAssetPreviewCache[code]);
    } catch (e) {}
    delete localAssetPreviewCache[code];
  }
}

async function fetchStoryAssetBlob(itemId, code) {
  if (!supabaseClient) return null;
  const path = `${itemId}/${code}`;
  const { data, error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .download(path);
  if (error || !data) return null;
  return data;
}

const today = new Date();
let state = defaultState();
let currentDate = isoDate(today);
let selectedWeekStart = mondayOf(today);
let selectedPlanDay = 0;
let selectedApprovalDay = 0;

function defaultState() {
  return {
    role: "ayu",
    weeks: {},
    approvalHistory: [],
  };
}

async function loadState() {
  try {
    if (!supabaseClient) return defaultState();
    const { data, error } = await supabaseClient
      .from("app_state")
      .select("data")
      .eq("id", STATE_ROW_ID)
      .maybeSingle();
    if (error) throw error;
    return data && data.data && Object.keys(data.data).length
      ? data.data
      : defaultState();
  } catch (e) {
    console.error("Gagal load state dari Supabase:", e);
    return defaultState();
  }
}

let saveStateTimer = null;
function saveState() {
  clearTimeout(saveStateTimer);
  saveStateTimer = setTimeout(async () => {
    try {
      if (!supabaseClient) return;
      const { error } = await supabaseClient.from("app_state").upsert({
        id: STATE_ROW_ID,
        data: state,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch (e) {
      console.error("Gagal simpan state ke Supabase:", e);
    }
  }, 600);
}

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(start) {
  return isoDate(start);
}

function weekDates(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });
}

function emptyPlanItem(slot) {
  return {
    id: uid(),
    ...slot,
    pillar: "",
    framing: "",
    hook: "",
    idea: "",
    treatment: "",
    assets: [],
    published: false,
    approval: "draft",
    ceoComment: "",
  };
}

function getWeekForDate(dateStr) {
  const monday = mondayOf(new Date(dateStr + "T00:00:00"));
  return ensureWeek(monday);
}

function ensureWeek(start) {
  const key = weekKey(start);
  if (!state.weeks[key]) {
    const dates = weekDates(start);
    state.weeks[key] = {
      start: key,
      status: "draft",
      submittedAt: "",
      objective: "",
      focus: "",
      campaign: "",
      notes: "",
      days: dates.map((date) => ({
        date,
        feed: SOP.feed.map(emptyPlanItem),
        ttStory: SOP.ttStoryTimes.map((time, i) => ({
          id: uid(),
          time,
          idea: "",
          type: "Original",
          assets: [],
          published: false,
        })),
        igStory: Array.from({ length: 10 }, (_, i) => ({
          id: uid(),
          slide: i + 1,
          idea: "",
          type: SOP.storyTypes[i % SOP.storyTypes.length],
          assets: [],
          published: false,
        })),
      })),
    };
    saveState();
  }
  return state.weeks[key];
}

function getCurrentWeek() {
  return ensureWeek(selectedWeekStart);
}

function migrateOldApprovalStatuses() {
  let touched = false;
  Object.values(state.weeks || {}).forEach((week) => {
    week.days.forEach((day) => {
      day.feed.forEach((item) => {
        if (item.approval === "approved") {
          item.approval = "waiting approval";
          touched = true;
        }
      });
    });
    syncWeekApprovalStatus(week);
  });
  if (touched) saveState();
}

function renderAll() {
  renderDaily();
  renderWeekly();
  renderApproval();
}

function setRole(role) {
  state.role = role;
  saveState();
  document.body.dataset.role = role;
  const roleSelect = document.getElementById("roleSelect");
  if (roleSelect) roleSelect.value = role;
  const isCEO = role === "ceo";
  document
    .querySelectorAll(".ayu-only")
    .forEach((el) => (el.style.display = isCEO ? "none" : ""));
  document
    .querySelectorAll(".ceo-only-controls")
    .forEach((el) => (el.style.display = isCEO ? "flex" : "none"));
  document
    .querySelectorAll(".ayu-input")
    .forEach((el) => (el.disabled = isCEO));
  if (isCEO) {
    const approvalNav = document.querySelector('[data-view="approval"]');
    if (approvalNav) approvalNav.style.display = "";
  }
  renderAll();
}

function navigate(view) {
  if (view === "approval" && state.role !== "ceo") {
    setRole("ceo");
  }
  if (["weekly", "today"].includes(view) && state.role !== "ayu") {
    setRole("ayu");
  }

  document
    .querySelectorAll(".nav-item")
    .forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  document
    .querySelectorAll(".view")
    .forEach((x) => x.classList.toggle("active", x.id === view));

  if (view === "weekly" || view === "approval") {
    const week = getCurrentWeek();
    const idx = week.days.findIndex((d) => d.date === currentDate);
    if (idx !== -1) {
      if (view === "weekly") selectedPlanDay = idx;
      if (view === "approval") selectedApprovalDay = idx;
    }
  }

  if (view === "weekly") renderWeekly();
  if (view === "approval") renderApproval();
  if (view === "today") renderDaily();
}

function normalizeApprovalForWeek(week) {
  let touched = false;
  week.days.forEach((day) => {
    day.feed.forEach((item) => {
      if (item.published && item.approval !== "approved") {
        item.approval = "approved";
        touched = true;
      }
    });
  });
  if (touched) {
    syncWeekApprovalStatus(week);
    saveState();
  }
  return touched;
}

function renderDaily() {
  const week = getWeekForDate(currentDate);
  normalizeApprovalForWeek(week);
  const planDay = week.days.find((d) => d.date === currentDate);
  const curDateEl = document.getElementById("currentDate");
  if (curDateEl) curDateEl.value = currentDate;
  const canConfirm = state.role === "ayu";

  const root = document.getElementById("feedChecklist");
  if (root) {
    root.innerHTML = "";
    planDay.feed.forEach((item, idx) => {
      if (!Array.isArray(item.assets)) item.assets = [];
      if (typeof item.published !== "boolean") item.published = false;
      const hasAssets = item.assets.length > 0;
      const row = document.createElement("div");
      row.className = "task-row";
      row.innerHTML = `
        <div class="time">${item.time}</div>
        <div class="platform"><strong>${item.platform}</strong></div>
        <div class="format">${item.format}</div>
        <div class="title-wrap">
          <div class="title">${escapeHtml(item.hook || item.pillar || "Belum ada hook")}</div>
          <div class="meta">${hasAssets ? `${item.assets.length} file terupload` : "Belum ada file diupload"}</div>
        </div>
        <div class="status-wrap">
          ${hasAssets ? `<button class="preview-icon-btn" data-daily-preview="${idx}" title="Preview">👁</button>` : ""}
          <button class="upload-switch ${item.published ? "on" : ""}" data-daily-switch="${idx}" ${canConfirm ? "" : "disabled"}>
            <span class="switch-track"><span class="switch-thumb"></span></span>
            <span class="switch-label">${item.published ? "Sudah upload" : "Belum upload"}</span>
          </button>
        </div>`;
      root.appendChild(row);
    });

    root.querySelectorAll("[data-daily-switch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = planDay.feed[Number(btn.dataset.dailySwitch)];
        item.published = !item.published;
        if (item.published) {
          item.approval = "approved";
        }
        syncWeekApprovalStatus(week);
        saveState();
        renderDaily();
      });
    });

    root.querySelectorAll("[data-daily-preview]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = planDay.feed[Number(btn.dataset.dailyPreview)];
        openAssetCarousel(
          "Preview Hasil Konten",
          `${item.platform} • ${item.time} • ${item.format}`,
          item.id,
          item.assets,
          0,
          null,
          [
            { label: "Hook / Judul", value: item.hook },
            { label: "Pillar", value: item.pillar },
            { label: "Winning Framing", value: item.framing },
            { label: "Treatment", value: item.treatment },
            { label: "Status", value: approvalLabel(item.approval) },
          ],
        );
      });
    });
  }

  // TIKTOK STORY TILES (ELEVATED & TOUCH-FRIENDLY)
  const ttRoot = document.getElementById("ttStoryGrid");
  if (ttRoot) {
    ttRoot.innerHTML = "";
    planDay.ttStory.forEach((s, i) => {
      if (!Array.isArray(s.assets)) s.assets = [];
      if (typeof s.published !== "boolean") s.published = false;
      const hasAssets = s.assets.length > 0;
      const el = document.createElement("div");
      el.className = `story-check ${s.published ? "published" : ""}`;
      el.innerHTML = `
        <div class="story-check-top">
          <strong class="story-time">${s.time}</strong>
          <div class="story-check-controls">
            ${hasAssets ? `<button class="preview-icon-btn" data-tt-preview="${i}" title="Preview">👁</button>` : ""}
            <button class="upload-switch small ${s.published ? "on" : ""}" data-tt-switch="${i}" ${canConfirm ? "" : "disabled"}>
              <span class="switch-track"><span class="switch-thumb"></span></span>
            </button>
          </div>
        </div>
        <div class="story-check-sub">
          <span class="story-status-text">${s.published ? "Sudah upload" : "Belum upload"}</span>
        </div>`;
      ttRoot.appendChild(el);
    });

    ttRoot.querySelectorAll("[data-tt-switch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = planDay.ttStory[Number(btn.dataset.ttSwitch)];
        item.published = !item.published;
        saveState();
        renderDaily();
      });
    });

    ttRoot.querySelectorAll("[data-tt-preview]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = planDay.ttStory[Number(btn.dataset.ttPreview)];
        openAssetCarousel(
          "Preview Asset",
          `${item.idea || "Belum ada ide"} • ${item.assets.length} file`,
          item.id,
          item.assets,
          0,
        );
      });
    });
  }

  // INSTAGRAM STORY TILES (ELEVATED & TOUCH-FRIENDLY)
  const igRoot = document.getElementById("igStoryGrid");
  if (igRoot) {
    igRoot.innerHTML = "";
    planDay.igStory.forEach((s, i) => {
      if (!Array.isArray(s.assets)) s.assets = [];
      if (typeof s.published !== "boolean") s.published = false;
      const hasAssets = s.assets.length > 0;
      const el = document.createElement("div");
      el.className = `story-check ${s.published ? "published" : ""}`;
      el.innerHTML = `
        <div class="story-check-top">
          <strong class="story-time">Slide ${String(i + 1).padStart(2, "0")}</strong>
          <div class="story-check-controls">
            ${hasAssets ? `<button class="preview-icon-btn" data-ig-preview="${i}" title="Preview">👁</button>` : ""}
            <button class="upload-switch small ${s.published ? "on" : ""}" data-ig-switch="${i}" ${canConfirm ? "" : "disabled"}>
              <span class="switch-track"><span class="switch-thumb"></span></span>
            </button>
          </div>
        </div>
        <div class="story-check-sub">
          <span class="story-type-text">${escapeHtml(s.type || "Story")}</span>
        </div>`;
      igRoot.appendChild(el);
    });

    igRoot.querySelectorAll("[data-ig-switch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = planDay.igStory[Number(btn.dataset.igSwitch)];
        item.published = !item.published;
        saveState();
        renderDaily();
      });
    });

    igRoot.querySelectorAll("[data-ig-preview]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = planDay.igStory[Number(btn.dataset.igPreview)];
        openAssetCarousel(
          "Preview Asset",
          `${item.idea || "Belum ada ide"} • ${item.assets.length} file`,
          item.id,
          item.assets,
          0,
        );
      });
    });
  }

  updateDailyMetrics(planDay);
}

function updateDailyMetrics(planDay) {
  const feedDone = planDay.feed.filter((x) => x.published).length;
  const ttDone = planDay.ttStory.filter((x) => x.published).length;
  const igDone = planDay.igStory.filter((x) => x.published).length;
  const total = 9 + 7 + 10;
  const done = feedDone + ttDone + igDone;
  const pct = Math.round((done / total) * 100);

  const elDailyTotal = document.getElementById("dailyTotal");
  const elDailyDone = document.getElementById("dailyDone");
  const elDailyDonePct = document.getElementById("dailyDonePct");
  const elDailyOnTime = document.getElementById("dailyOnTime");
  const elDailyIssue = document.getElementById("dailyIssue");
  const elDailyCompliance = document.getElementById("dailyCompliance");
  const elDailyProgress = document.getElementById("dailyProgress");
  const elTtStoryCounter = document.getElementById("ttStoryCounter");
  const elIgStoryCounter = document.getElementById("igStoryCounter");

  if (elDailyTotal) elDailyTotal.textContent = total;
  if (elDailyDone) elDailyDone.textContent = done;
  if (elDailyDonePct) elDailyDonePct.textContent = pct + "%";
  if (elDailyOnTime) elDailyOnTime.textContent = feedDone;
  if (elDailyIssue) elDailyIssue.textContent = planDay.feed.length - feedDone;
  if (elDailyCompliance) elDailyCompliance.textContent = pct + "%";
  if (elDailyProgress) elDailyProgress.style.width = pct + "%";
  if (elTtStoryCounter) elTtStoryCounter.textContent = `${ttDone}/7`;
  if (elIgStoryCounter) elIgStoryCounter.textContent = `${igDone}/10`;
}

function renderWeekly() {
  const week = getCurrentWeek();
  normalizeApprovalForWeek(week);
  const dates = week.days.map((x) => x.date);

  const elWeekRange = document.getElementById("weekRange");
  const elWeekStatus = document.getElementById("weekStatus");
  const elWeekObj = document.getElementById("weekObjective");
  const elWeekFocus = document.getElementById("weekFocus");
  const elWeekCamp = document.getElementById("weekCampaign");
  const elWeekNotes = document.getElementById("weekNotes");
  const elPlanComp = document.getElementById("planCompletion");

  if (elWeekRange)
    elWeekRange.textContent = `${fmtDateShort(dates[0])} – ${fmtDateShort(dates)}`;
  if (elWeekStatus) {
    elWeekStatus.textContent = week.status.toUpperCase();
    elWeekStatus.className = "status-pill " + statusClassFor(week.status);
  }
  if (elWeekObj) elWeekObj.value = week.objective;
  if (elWeekFocus) elWeekFocus.value = week.focus;
  if (elWeekCamp) elWeekCamp.value = week.campaign;
  if (elWeekNotes) elWeekNotes.value = week.notes;

  const pct = weekCompletion(week);
  if (elPlanComp) elPlanComp.textContent = pct + "%";

  const stickySubmitHint = document.getElementById("stickySubmitHint");
  let hintText = "";
  if (week.submittedAt && week.status !== "draft") {
    hintText = `Sudah disubmit ${week.submittedAt}. Status: ${approvalLabel(week.status)}.`;
  } else if (!week.objective || !week.focus || !week.campaign) {
    hintText =
      "Weekly Strategy belum lengkap. Isi Objective, Treatment Focus, dan Campaign.";
  } else {
    hintText = `Plan ${pct}% terisi. Klik Submit ke CEO untuk mengaktifkan review.`;
  }
  if (stickySubmitHint) stickySubmitHint.textContent = hintText;

  renderDayTabs("dayTabs", selectedPlanDay, (idx) => {
    selectedPlanDay = idx;
    renderWeekly();
  });
  renderPlanDay();
}

function weekCompletion(week) {
  let total = 0,
    filled = 0;
  week.days.forEach((day) =>
    day.feed.forEach((item) => {
      total += 4;
      if (item.pillar) filled++;
      if (item.framing) filled++;
      if (item.hook) filled++;
      if (item.idea) filled++;
    }),
  );
  return Math.round((filled / total) * 100);
}

function renderDayTabs(rootId, selected, callback) {
  const week = getCurrentWeek();
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = "";
  week.days.forEach((day, idx) => {
    const complete = dayCompletion(day);
    const btn = document.createElement("button");
    btn.className = "day-tab " + (idx === selected ? "active" : "");
    btn.innerHTML = `
      <div class="day-tab-info">
        <strong>${DAY_NAMES[new Date(day.date + "T00:00:00").getDay()]}</strong>
        <span class="day-tab-date">${fmtDateShort(day.date)}</span>
      </div>
      <span class="day-tab-badge ${complete === 100 ? "complete" : ""}">${complete}%</span>
    `;
    btn.addEventListener("click", () => callback(idx));
    root.appendChild(btn);
  });
}

function dayCompletion(day) {
  let total = 0,
    filled = 0;
  day.feed.forEach((item) => {
    total += 4;
    if (item.pillar) filled++;
    if (item.framing) filled++;
    if (item.hook) filled++;
    if (item.idea) filled++;
  });
  return Math.round((filled / total) * 100);
}

function renderPlanDay() {
  const week = getCurrentWeek();
  const day = week.days[selectedPlanDay];

  const selDayTitle = document.getElementById("selectedDayTitle");
  if (selDayTitle) {
    selDayTitle.textContent = `${DAY_NAMES[new Date(day.date + "T00:00:00").getDay()]} • ${fmtDateShort(day.date)}`;
  }

  const complete = dayCompletion(day);
  const ds = document.getElementById("selectedDayStatus");
  if (ds) {
    ds.textContent = complete === 100 ? "LENGKAP" : `${complete}% TERISI`;
    ds.className = "status-pill " + (complete === 100 ? "success" : "warning");
  }

  const body = document.getElementById("weeklyPlanBody");
  if (!body) return;
  body.innerHTML = "";
  const canEdit = state.role === "ayu";

  day.feed.forEach((item, idx) => {
    if (!Array.isArray(item.assets)) item.assets = [];
    const tr = document.createElement("tr");
    const pillars = SOP.pillars[item.platform];

    const thumbsHtml = item.assets
      .slice(0, 4)
      .map((a, ai) => {
        const localUrl = localAssetPreviewCache[a.code];
        const isImage = (a.type || "").startsWith("image/");
        const isVideo = (a.type || "").startsWith("video/");
        const showMore = ai === 3 && item.assets.length > 4;
        const inner =
          localUrl && isImage
            ? `<img src="${localUrl}" alt="thumb">`
            : `<span class="thumb-icon">${isVideo ? "🎬" : isImage ? "🖼️" : "📄"}</span>`;
        return `<div class="asset-thumb" data-feed-open="${idx}" data-feed-start="${ai}">
          ${inner}
          ${showMore ? `<div class="thumb-more">+${item.assets.length - 4}</div>` : ""}
          ${canEdit ? `<button class="thumb-remove" data-feed-remove="${a.code}" data-feed-item="${idx}" title="Hapus">×</button>` : ""}
        </div>`;
      })
      .join("");

    tr.innerHTML = `
      <td class="cell-time"><strong>${item.time}</strong></td>
      <td class="cell-platform"><span class="badge-platform">${item.platform}</span></td>
      <td class="cell-format"><span class="badge-format">${item.format}</span></td>
      <td class="cell-status">
        <span class="status-pill ${statusClassFor(item.approval)}">${approvalLabel(item.approval)}</span>
        ${item.ceoComment ? `<div class="ceo-comment-box"><small>Catatan CEO:</small><span>${escapeHtml(item.ceoComment)}</span></div>` : ""}
      </td>
      <td class="cell-pillar"><label class="cell-label">Pillar</label><select data-field="pillar" data-index="${idx}" class="plan-input ayu-input"><option value="">Pilih</option>${pillars.map((p) => `<option ${item.pillar === p ? "selected" : ""}>${p}</option>`).join("")}</select></td>
      <td class="cell-framing"><label class="cell-label">Winning Framing</label><select data-field="framing" data-index="${idx}" class="plan-input ayu-input"><option value="">Pilih</option>${SOP.framings.map((p) => `<option ${item.framing === p ? "selected" : ""}>${p}</option>`).join("")}</select></td>
      <td class="cell-hook"><label class="cell-label">Hook / Judul</label><textarea data-field="hook" data-index="${idx}" class="plan-input ayu-input" placeholder="Hook / judul">${escapeHtml(item.hook)}</textarea></td>
      <td class="cell-idea"><label class="cell-label">Storyline / Detail Ide</label><textarea data-field="idea" data-index="${idx}" class="plan-input ayu-input" placeholder="Storyline / ide">${escapeHtml(item.idea)}</textarea></td>
      <td class="cell-treatment"><label class="cell-label">Treatment</label><input data-field="treatment" data-index="${idx}" class="plan-input ayu-input" value="${escapeAttr(item.treatment)}" placeholder="Treatment"></td>
      <td class="cell-asset">
        <label class="cell-label">Asset</label>
        <div class="feed-asset-cell">
          <div class="story-asset-thumbs">${thumbsHtml || `<div class="asset-thumb-empty">Belum ada file</div>`}</div>
          ${
            canEdit
              ? `<label class="story-asset-add">
            <input type="file" data-feed-upload="${idx}" accept="image/*,video/*,.pdf" multiple>
            <span>+ Tambah</span>
          </label>`
              : ""
          }
        </div>
      </td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll(".plan-input").forEach((el) => {
    el.disabled = state.role === "ceo";
    el.addEventListener("input", () => {
      const i = Number(el.dataset.index);
      day.feed[i][el.dataset.field] = el.value;
      saveState();
      const planComp = document.getElementById("planCompletion");
      if (planComp) planComp.textContent = weekCompletion(week) + "%";
    });
    el.addEventListener("change", () => {
      const i = Number(el.dataset.index);
      day.feed[i][el.dataset.field] = el.value;
      saveState();
    });
  });

  body.querySelectorAll("[data-feed-upload]").forEach((input) => {
    input.addEventListener("change", async () => {
      const idx = Number(input.dataset.feedUpload);
      const item = day.feed[idx];
      const files = input.files;
      if (!files || !files.length) return;
      try {
        const uploaded = await uploadStoryAssetFiles(item.id, files);
        item.assets = item.assets.concat(uploaded);
      } catch (err) {
        console.error(err);
        alert("Ada file yang gagal diupload, coba lagi.");
      }
      saveState();
      renderPlanDay();
    });
  });

  body.querySelectorAll("[data-feed-remove]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.feedItem);
      const item = day.feed[idx];
      const code = btn.dataset.feedRemove;
      await removeStoryAssetFile(item.id, code);
      item.assets = item.assets.filter((a) => a.code !== code);
      saveState();
      renderPlanDay();
    });
  });

  body.querySelectorAll("[data-feed-open]").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.feedOpen);
      const item = day.feed[idx];
      const startIndex = Number(el.dataset.feedStart || 0);
      if (!item.assets.length) return;
      openAssetCarousel(
        "Preview Hasil Konten",
        `${item.platform} • ${item.time} • ${item.format}`,
        item.id,
        item.assets,
        startIndex,
        null,
        [
          { label: "Hook / Judul", value: item.hook },
          { label: "Pillar", value: item.pillar },
          { label: "Winning Framing", value: item.framing },
          { label: "Treatment", value: item.treatment },
          { label: "Status", value: approvalLabel(item.approval) },
        ],
      );
    });
  });

  renderStoryPlans(day);
}

function renderStoryPlans(day) {
  day.ttStory.forEach((x) => {
    if (typeof x.idea !== "string") x.idea = "";
    if (typeof x.type !== "string") x.type = "Original";
    if (!Array.isArray(x.assets)) x.assets = [];
  });
  day.igStory.forEach((x) => {
    if (typeof x.idea !== "string") x.idea = "";
    if (typeof x.type !== "string") x.type = "";
    if (!Array.isArray(x.assets)) x.assets = [];
  });

  renderStoryList("ttStoryPlan", day.ttStory, {
    label: (x) => x.time,
    typeOptions: ["Original", "Mixed", "Repost"],
    ideaPlaceholder: "Isi ide TikTok Story",
    kind: "tt",
  });
  renderStoryList("igStoryPlan", day.igStory, {
    label: (x, i) => String(i + 1).padStart(2, "0"),
    typeOptions: SOP.storyTypes,
    ideaPlaceholder: "Isi detail Instagram Story",
    kind: "ig",
  });

  const refresh = () => {
    saveState();
    renderStoryPlans(day);
  };

  ["ttStoryPlan", "igStoryPlan"].forEach((rootId) => {
    const root = document.getElementById(rootId);
    if (!root) return;

    root.querySelectorAll("[data-idea]").forEach((input) =>
      input.addEventListener("input", () => {
        const list = rootId === "ttStoryPlan" ? day.ttStory : day.igStory;
        list[Number(input.dataset.idea)].idea = input.value;
        saveState();
        updateStoryPlanCounters(day);
      }),
    );
    root.querySelectorAll("[data-type]").forEach((input) =>
      input.addEventListener("change", () => {
        const list = rootId === "ttStoryPlan" ? day.ttStory : day.igStory;
        list[Number(input.dataset.type)].type = input.value;
        saveState();
      }),
    );
    root.querySelectorAll("[data-upload]").forEach((input) =>
      input.addEventListener("change", async () => {
        const list = rootId === "ttStoryPlan" ? day.ttStory : day.igStory;
        const item = list[Number(input.dataset.upload)];
        const files = input.files;
        if (!files || !files.length) return;
        try {
          const uploaded = await uploadStoryAssetFiles(item.id, files);
          item.assets = item.assets.concat(uploaded);
        } catch (err) {
          console.error(err);
          alert("Ada file yang gagal diupload, coba lagi.");
        }
        refresh();
      }),
    );
    root.querySelectorAll("[data-remove-asset]").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const list = rootId === "ttStoryPlan" ? day.ttStory : day.igStory;
        const item = list[Number(btn.dataset.itemIndex)];
        const code = btn.dataset.removeAsset;
        await removeStoryAssetFile(item.id, code);
        item.assets = item.assets.filter((a) => a.code !== code);
        refresh();
      }),
    );
    root.querySelectorAll("[data-open-preview]").forEach((el) =>
      el.addEventListener("click", () => {
        const list = rootId === "ttStoryPlan" ? day.ttStory : day.igStory;
        const item = list[Number(el.dataset.itemIndex)];
        const startIndex = Number(el.dataset.startIndex || 0);
        if (!item.assets.length) return;
        openAssetCarousel(
          "Preview Asset",
          `${item.idea || "Belum ada ide"} • ${item.assets.length} file`,
          item.id,
          item.assets,
          startIndex,
          null,
          [
            { label: "Idea", value: item.idea },
            { label: "Type", value: item.type },
          ],
        );
      }),
    );
  });

  updateStoryPlanCounters(day);
}

function renderStoryList(rootId, list, opts) {
  const canEdit = state.role === "ayu";
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = "";

  list.forEach((x, i) => {
    const row = document.createElement("div");
    row.className = "story-plan-card";

    const typeOptionsHtml = opts.typeOptions
      .map((t) => `<option ${x.type === t ? "selected" : ""}>${t}</option>`)
      .join("");

    const thumbsHtml = x.assets
      .slice(0, 4)
      .map((a, idx) => {
        const localUrl = localAssetPreviewCache[a.code];
        const isImage = (a.type || "").startsWith("image/");
        const isVideo = (a.type || "").startsWith("video/");
        const showMore = idx === 3 && x.assets.length > 4;
        const inner =
          localUrl && isImage
            ? `<img src="${localUrl}" alt="thumb">`
            : `<span class="thumb-icon">${isVideo ? "🎬" : isImage ? "🖼️" : "📄"}</span>`;
        return `<div class="asset-thumb" data-open-preview data-item-index="${i}" data-start-index="${idx}">
          ${inner}
          ${showMore ? `<div class="thumb-more">+${x.assets.length - 4}</div>` : ""}
          ${canEdit ? `<button class="thumb-remove" data-remove-asset="${a.code}" data-item-index="${i}" title="Hapus">×</button>` : ""}
        </div>`;
      })
      .join("");

    row.innerHTML = `
      <div class="story-plan-card-head">
        <span class="story-slot-badge">${opts.label(x, i)}</span>
        <select ${canEdit ? "" : "disabled"} data-type="${i}" class="story-type-select">${typeOptionsHtml}</select>
      </div>
      <input ${canEdit ? "" : "disabled"} data-idea="${i}" class="story-idea-input" value="${escapeAttr(x.idea)}" placeholder="${opts.ideaPlaceholder}">
      <div class="story-asset-zone">
        <div class="story-asset-thumbs">${thumbsHtml || `<div class="asset-thumb-empty">Belum ada file</div>`}</div>
        ${
          canEdit
            ? `<label class="story-asset-add">
          <input type="file" data-upload="${i}" accept="image/*,video/*,.pdf" multiple>
          <span>+ Tambah</span>
        </label>`
            : ""
        }
      </div>`;
    root.appendChild(row);
  });
}

function updateStoryPlanCounters(day) {
  const ttFilled = day.ttStory.filter((x) =>
    String(x.idea || "").trim(),
  ).length;
  const igFilled = day.igStory.filter((x) =>
    String(x.idea || "").trim(),
  ).length;
  const ttCounter = document.getElementById("ttStoryPlanCounter");
  const igCounter = document.getElementById("igStoryPlanCounter");
  if (ttCounter) ttCounter.textContent = `${ttFilled}/7 terisi`;
  if (igCounter) igCounter.textContent = `${igFilled}/10 terisi`;
}

function renderApproval() {
  const week = getCurrentWeek();
  normalizeApprovalForWeek(week);

  if (week.status === "waiting approval") {
    week.days.forEach((day) =>
      day.feed.forEach((item) => {
        if (item.approval === "draft") item.approval = "waiting approval";
      }),
    );
    saveState();
  }

  const hasBeenSubmitted = Boolean(week.submittedAt) && week.status !== "draft";
  const gate = document.getElementById("approvalGate");
  if (gate) gate.classList.toggle("hidden", hasBeenSubmitted);

  document.querySelectorAll(".ceo-only-controls button").forEach((btn) => {
    btn.disabled = !hasBeenSubmitted;
    btn.style.opacity = hasBeenSubmitted ? "1" : ".45";
    btn.title = hasBeenSubmitted
      ? ""
      : "Menunggu Ayu submit content plan ke CEO.";
  });

  const appWeekRange = document.getElementById("approvalWeekRange");
  const subAt = document.getElementById("submittedAt");
  const appOverall = document.getElementById("approvalOverall");
  const appStrat = document.getElementById("approvalStrategy");

  if (appWeekRange)
    appWeekRange.textContent = `${fmtDateShort(week.days[0].date)} – ${fmtDateShort(week.days.date)}`;
  if (subAt) subAt.textContent = week.submittedAt || "Belum submit";
  if (appOverall) {
    appOverall.textContent = week.status.toUpperCase();
    appOverall.className = "status-pill " + statusClassFor(week.status);
  }
  if (appStrat) {
    appStrat.innerHTML = `
      <div class="summary-card"><span class="summary-label">Objective</span><strong>${escapeHtml(week.objective || "—")}</strong></div>
      <div class="summary-card"><span class="summary-label">Treatment Focus</span><strong>${escapeHtml(week.focus || "—")}</strong></div>
      <div class="summary-card"><span class="summary-label">Campaign</span><strong>${escapeHtml(week.campaign || "—")}</strong></div>
      <div class="summary-card"><span class="summary-label">Notes</span><strong>${escapeHtml(week.notes || "—")}</strong></div>`;
  }

  renderDayTabs("approvalDayTabs", selectedApprovalDay, (idx) => {
    selectedApprovalDay = idx;
    renderApproval();
  });

  const day = week.days[selectedApprovalDay];
  const root = document.getElementById("approvalList");
  if (!root) return;
  root.innerHTML = "";
  day.feed.forEach((item, idx) => {
    if (!Array.isArray(item.assets)) item.assets = [];
    const hasAssets = item.assets.length > 0;
    const el = document.createElement("div");
    el.className = "approval-item";
    el.innerHTML = `
    <div class="approval-item-top">
      <div><strong>${item.time}</strong><div class="detail">${item.format}</div></div>
      <div><strong>${item.platform}</strong><div class="detail">${escapeHtml(item.pillar || "Belum pillar")}</div></div>
      <div>
        <div class="hook">${escapeHtml(item.hook || "Belum ada hook")}</div>
        <div class="detail">${escapeHtml(item.framing || "Belum framing")} • ${escapeHtml(item.treatment || "—")}</div>
        <div style="margin-top:7px"><span class="status-pill ${statusClassFor(item.approval)}">${approvalLabel(item.approval)}</span></div>
        ${item.ceoComment ? `<div class="ceo-comment-box" style="margin-top:8px"><small>Catatan CEO:</small><span>${escapeHtml(item.ceoComment)}</span></div>` : ""}
      </div>
      <div class="approval-controls">
        <button class="preview-btn" data-preview-index="${idx}" ${hasAssets ? "" : "disabled"}>${hasAssets ? `Preview (${item.assets.length})` : "No Asset"}</button>
        <button class="revise-btn" data-review="revision" data-index="${idx}">Revisi</button>
        <button class="decline-btn" data-review="declined" data-index="${idx}">Decline</button>
      </div>
    </div>
    ${hasAssets ? `<div class="asset-preview-meta"><span class="asset-dot"></span><span>${item.assets.length} file terupload</span></div>` : `<div class="asset-preview-meta"><span>Belum ada hasil konten yang di-upload.</span></div>`}
    `;
    root.appendChild(el);
  });

  root.querySelectorAll("[data-review]").forEach((btn) => {
    const canReview =
      state.role === "ceo" &&
      Boolean(week.submittedAt) &&
      week.status !== "draft";
    btn.disabled = !canReview;
    btn.style.opacity = canReview ? "1" : ".45";
    btn.title = canReview ? "" : "Menunggu Ayu submit content plan ke CEO.";
    btn.addEventListener("click", () =>
      openApprovalModal(
        selectedApprovalDay,
        Number(btn.dataset.index),
        btn.dataset.review,
      ),
    );
  });

  root.querySelectorAll("[data-preview-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.previewIndex);
      const item = day.feed[idx];
      if (!item.assets || !item.assets.length) return;
      openAssetCarousel(
        "Preview Hasil Konten",
        `${item.platform} • ${item.time} • ${item.format}`,
        item.id,
        item.assets,
        0,
        {
          onRevise: () =>
            openApprovalModal(selectedApprovalDay, idx, "revision"),
          onDecline: () =>
            openApprovalModal(selectedApprovalDay, idx, "declined"),
        },
        [
          { label: "Hook / Judul", value: item.hook },
          { label: "Pillar", value: item.pillar },
          { label: "Winning Framing", value: item.framing },
          { label: "Treatment", value: item.treatment },
          { label: "Status", value: approvalLabel(item.approval) },
        ],
      );
    });
  });

  renderApprovalHistory();
}

function syncWeekApprovalStatus(week) {
  const items = week.days.flatMap((day) => day.feed);
  const statuses = items.map((item) => item.approval);

  if (statuses.some((s) => s === "revision")) {
    week.status = "revision";
    return;
  }

  if (statuses.some((s) => s === "declined")) {
    week.status = "declined";
    return;
  }

  if (statuses.some((s) => s === "waiting approval")) {
    week.status = "waiting approval";
    return;
  }

  week.status = "draft";
}

async function openAssetCarousel(
  title,
  subtitle,
  itemId,
  assets,
  startIndex = 0,
  actions = null,
  details = null,
) {
  let current = Math.min(startIndex, assets.length - 1);
  const sessionUrls = {};

  async function resolveUrl(asset) {
    if (localAssetPreviewCache[asset.code])
      return localAssetPreviewCache[asset.code];
    if (sessionUrls[asset.code]) return sessionUrls[asset.code];
    const blob = await fetchStoryAssetBlob(itemId, asset.code);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    sessionUrls[asset.code] = url;
    return url;
  }

  async function renderSlide() {
    const asset = assets[current];
    const stage = document.getElementById("carouselStage");
    if (!stage) return;
    stage.innerHTML = `<div class="preview-empty">Memuat...</div>`;
    const url = await resolveUrl(asset);
    const type = asset.type || "";
    if (!url) {
      stage.innerHTML = `<div class="preview-empty">Preview tidak tersedia.<br><strong>${escapeHtml(asset.name)}</strong></div>`;
    } else if (type.startsWith("image/")) {
      stage.innerHTML = `<img src="${url}" alt="Preview asset">`;
    } else if (type.startsWith("video/")) {
      stage.innerHTML = `<video src="${url}" controls playsinline></video>`;
    } else if (
      type === "application/pdf" ||
      asset.name.toLowerCase().endsWith(".pdf")
    ) {
      stage.innerHTML = `<iframe src="${url}" title="Preview PDF"></iframe>`;
    } else {
      stage.innerHTML = `<div class="preview-empty">Format belum bisa dipreview.<br><strong>${escapeHtml(asset.name)}</strong></div>`;
    }
    const cCount = document.getElementById("carouselCounter");
    const cPrev = document.getElementById("carouselPrev");
    const cNext = document.getElementById("carouselNext");
    if (cCount) cCount.textContent = `${current + 1} / ${assets.length}`;
    if (cPrev) cPrev.style.visibility = current === 0 ? "hidden" : "visible";
    if (cNext)
      cNext.style.visibility =
        current === assets.length - 1 ? "hidden" : "visible";
  }

  const detailsHtml = details
    ? `<div class="preview-details">
        ${details.map((d) => `<div><span>${escapeHtml(d.label)}</span><strong>${escapeHtml(d.value || "—")}</strong></div>`).join("")}
      </div>`
    : "";

  showModal(
    title,
    subtitle,
    `<div class="preview-shell">
      <div class="carousel-wrap">
        <button class="carousel-nav" id="carouselPrev">‹</button>
        <div class="preview-stage" id="carouselStage"></div>
        <button class="carousel-nav" id="carouselNext">›</button>
      </div>
      <div class="carousel-meta"><span id="carouselCounter"></span></div>
      ${detailsHtml}
      ${
        actions
          ? `<div class="modal-actions" style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button class="decline-btn" id="carouselDecline">Decline</button>
        <button class="revise-btn" id="carouselRevise">Revisi</button>
      </div>`
          : ""
      }
    </div>`,
    () => {
      document.getElementById("carouselPrev")?.addEventListener("click", () => {
        if (current > 0) {
          current--;
          renderSlide();
        }
      });
      document.getElementById("carouselNext")?.addEventListener("click", () => {
        if (current < assets.length - 1) {
          current++;
          renderSlide();
        }
      });
      if (actions) {
        document
          .getElementById("carouselRevise")
          ?.addEventListener("click", () => {
            closeModal();
            actions.onRevise();
          });
        document
          .getElementById("carouselDecline")
          ?.addEventListener("click", () => {
            closeModal();
            actions.onDecline();
          });
      }
      renderSlide();
      document.getElementById("closeModal")?.addEventListener(
        "click",
        () =>
          Object.values(sessionUrls).forEach((u) => {
            try {
              URL.revokeObjectURL(u);
            } catch (e) {}
          }),
        { once: true },
      );
    },
  );
}

function openApprovalModal(dayIdx, itemIdx, decision) {
  if (state.role !== "ceo") {
    alert("Mode CEO diperlukan untuk melakukan review.");
    return;
  }
  const week = getCurrentWeek();
  if (!week.submittedAt || week.status === "draft") {
    alert(
      "Content plan belum disubmit oleh Ayu. Kembali ke Content Plan Mingguan lalu klik Submit ke CEO.",
    );
    return;
  }
  const item = week.days[dayIdx].feed[itemIdx];
  const label = decision === "revision" ? "Request Revisi" : "Decline";
  showModal(
    label,
    `${item.platform} • ${item.time}`,
    `<div class="review-form">
      <label><span>Keputusan</span><select id="decisionSelect">
        <option value="revision" ${decision === "revision" ? "selected" : ""}>Revisi</option>
        <option value="declined" ${decision === "declined" ? "selected" : ""}>Decline</option>
      </select></label>
      <label><span>Catatan CEO ${decision !== "approved" ? "(wajib)" : ""}</span><textarea id="decisionComment" rows="4">${escapeHtml(item.ceoComment || "")}</textarea></label>
      <div class="modal-actions"><button id="saveDecision" class="primary-btn">Simpan Keputusan</button></div>
    </div>`,
    () => {
      document.getElementById("saveDecision")?.addEventListener("click", () => {
        const dec = document.getElementById("decisionSelect").value;
        const comment = document.getElementById("decisionComment").value.trim();
        if (!comment) {
          alert("Catatan CEO wajib untuk Revisi/Decline.");
          return;
        }
        item.approval = dec;
        item.ceoComment = comment;
        syncWeekApprovalStatus(week);

        state.approvalHistory.unshift({
          id: uid(),
          at: nowLabel(),
          action: approvalLabel(dec),
          detail: `${item.platform} ${item.time}`,
          comment,
        });

        saveState();
        closeModal();
        renderApproval();
        renderWeekly();
      });
    },
  );
}

function renderApprovalHistory() {
  const root = document.getElementById("approvalHistory");
  if (!root) return;
  const rows = state.approvalHistory.slice(0, 15);
  root.innerHTML = rows.length
    ? rows
        .map(
          (x) =>
            `<div class="history-row"><div><strong>${escapeHtml(x.action)}</strong><br><span>${escapeHtml(x.detail)}${x.comment ? " • " + escapeHtml(x.comment) : ""}</span></div><strong>${escapeHtml(x.at)}</strong></div>`,
        )
        .join("")
    : `<div class="history-row"><span>Belum ada approval history.</span></div>`;
}

function saveWeekFields() {
  const w = getCurrentWeek();
  const elObj = document.getElementById("weekObjective");
  const elFocus = document.getElementById("weekFocus");
  const elCamp = document.getElementById("weekCampaign");
  const elNotes = document.getElementById("weekNotes");

  if (elObj) w.objective = elObj.value;
  if (elFocus) w.focus = elFocus.value.trim();
  if (elCamp) w.campaign = elCamp.value.trim();
  if (elNotes) w.notes = elNotes.value.trim();
  saveState();
}

function submitWeek() {
  const w = getCurrentWeek();
  saveWeekFields();
  if (!w.objective || !w.focus || !w.campaign) {
    alert("Weekly Strategy wajib diisi sebelum submit.");
    return;
  }

  w.days.forEach((day) => {
    day.feed.forEach((item) => {
      if (item.approval === "draft") {
        item.approval = "waiting approval";
      }
    });
  });

  w.status = "waiting approval";
  w.submittedAt = nowLabel();

  state.approvalHistory.unshift({
    id: uid(),
    at: w.submittedAt,
    action: "Submit Week",
    detail: `${fmtDateShort(w.days[0].date)}–${fmtDateShort(w.days.date)}`,
    comment: "Ayu submit content plan ke CEO",
  });

  saveState();
  renderWeekly();
  renderApproval();
  alert(
    "Content plan sudah disubmit ke CEO. Status konten berubah menjadi WAITING REVIEW CEO.",
  );
}

function weekDecision(decision) {
  if (state.role !== "ceo") {
    alert("Hanya mode CEO yang dapat memberi keputusan.");
    return;
  }
  const w = getCurrentWeek();
  if (!w.submittedAt || w.status === "draft") {
    alert("Content plan belum disubmit oleh Ayu.");
    return;
  }
  const requiresComment = true;
  const label = decision === "revision" ? "Revisi Mingguan" : "Decline Week";
  showModal(
    label,
    "Keputusan untuk seluruh content plan minggu ini",
    `<div class="review-form">
      <label><span>Catatan CEO ${requiresComment ? "(wajib)" : ""}</span><textarea id="weekDecisionComment" rows="4"></textarea></label>
      <div class="modal-actions"><button id="saveWeekDecision" class="primary-btn">Simpan</button></div>
    </div>`,
    () => {
      document
        .getElementById("saveWeekDecision")
        ?.addEventListener("click", () => {
          const c = document.getElementById("weekDecisionComment").value.trim();
          if (requiresComment && !c) {
            alert("Catatan wajib.");
            return;
          }
          w.status = decision;
          if (decision === "revision")
            w.days.forEach((d) =>
              d.feed.forEach((i) => {
                if (i.approval === "draft") i.approval = "revision";
              }),
            );
          if (decision === "declined")
            w.days.forEach((d) =>
              d.feed.forEach((i) => {
                if (i.approval === "draft") i.approval = "declined";
              }),
            );
          state.approvalHistory.unshift({
            id: uid(),
            at: nowLabel(),
            action: label,
            detail: "Whole Week",
            comment: c,
          });
          saveState();
          closeModal();
          renderApproval();
          renderWeekly();
        });
    },
  );
}

function showModal(title, subtitle, body, onReady) {
  const elTitle = document.getElementById("modalTitle");
  const elSub = document.getElementById("modalSubtitle");
  const elBody = document.getElementById("modalBody");
  const elBackdrop = document.getElementById("modalBackdrop");

  if (elTitle) elTitle.textContent = title;
  if (elSub) elSub.textContent = subtitle || "";
  if (elBody) elBody.innerHTML = body;
  if (elBackdrop) elBackdrop.classList.remove("hidden");
  if (onReady) onReady();
}

function closeModal() {
  const elBackdrop = document.getElementById("modalBackdrop");
  if (elBackdrop) elBackdrop.classList.add("hidden");
}

function approvalLabel(v) {
  return (
    {
      draft: "DRAFT",
      "waiting approval": "WAITING REVIEW CEO",
      revision: "REVISION",
      declined: "DECLINED",
      approved: "APPROVED",
    }[v] || String(v).toUpperCase()
  );
}

function statusClassFor(v) {
  if (v === "approved" || v === "done") return "success";
  if (
    v === "revision" ||
    v === "waiting approval" ||
    v === "partial review" ||
    v === "late"
  )
    return "warning";
  if (v === "declined" || v === "missed") return "danger";
  return "draft";
}

function escapeHtml(v = "") {
  return String(v).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
}

function escapeAttr(v = "") {
  return escapeHtml(v).replace(/`/g, "&#096;");
}

document
  .querySelectorAll(".nav-item")
  .forEach((btn) =>
    btn.addEventListener("click", () => navigate(btn.dataset.view)),
  );
document
  .getElementById("roleSelect")
  ?.addEventListener("change", (e) => setRole(e.target.value));
document.getElementById("currentDate")?.addEventListener("change", (e) => {
  currentDate = e.target.value;
  renderDaily();
});
document.getElementById("prevDay")?.addEventListener("click", () => {
  const d = new Date(currentDate + "T00:00:00");
  d.setDate(d.getDate() - 1);
  currentDate = isoDate(d);
  renderDaily();
});
document.getElementById("nextDay")?.addEventListener("click", () => {
  const d = new Date(currentDate + "T00:00:00");
  d.setDate(d.getDate() + 1);
  currentDate = isoDate(d);
  renderDaily();
});
document
  .getElementById("weekObjective")
  ?.addEventListener("change", saveWeekFields);
document.getElementById("weekFocus")?.addEventListener("input", saveWeekFields);
document
  .getElementById("weekCampaign")
  ?.addEventListener("input", saveWeekFields);
document.getElementById("weekNotes")?.addEventListener("input", saveWeekFields);
document.getElementById("saveWeek")?.addEventListener("click", () => {
  saveWeekFields();
  alert("Draft tersimpan di browser prototype.");
});
document.getElementById("submitWeek")?.addEventListener("click", submitWeek);
document
  .getElementById("submitWeekSticky")
  ?.addEventListener("click", submitWeek);
document.getElementById("saveWeekSticky")?.addEventListener("click", () => {
  saveWeekFields();
  alert("Draft tersimpan di browser prototype.");
});
document.getElementById("goToWeekly")?.addEventListener("click", () => {
  setRole("ayu");
  navigate("weekly");
});

document
  .getElementById("reviseWeek")
  ?.addEventListener("click", () => weekDecision("revision"));
document
  .getElementById("declineWeek")
  ?.addEventListener("click", () => weekDecision("declined"));
document.getElementById("closeModal")?.addEventListener("click", closeModal);
document.getElementById("modalBackdrop")?.addEventListener("click", (e) => {
  if (e.target.id === "modalBackdrop") closeModal();
});

(async function init() {
  state = await loadState();
  migrateOldApprovalStatuses();
  migrateStoryAssetsToArray();
  migrateFeedAssetsToArray();
  migratePublishedFlag();
  setRole(state.role || "ayu");
  ensureWeek(selectedWeekStart);
  renderDaily();
  renderWeekly();
  renderApproval();
})();
