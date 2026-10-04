// ---------- إعداد الشاشات الثمانية ----------
const SCREENS = [
  { id: "courses", label: "التعليم التفاعلي", type: "table", endpoint: "/api/courses/", department: "courses",
    columns: [
      { key: "date", label: "التاريخ" }, { key: "course_name", label: "اسم الدورة" },
      { key: "enrolled_count", label: "المسجلون" }, { key: "attended_count", label: "الحاضرون" },
      { key: "certificates_issued", label: "الشهادات" }, { key: "rating", label: "التقييم" },
      { key: "teachers_count", label: "المعلمون" }, { key: "notes", label: "ملاحظات إضافية" },
    ] },
  { id: "qna", label: "السؤال والجواب", type: "table", endpoint: "/api/qna/", department: "qna",
    columns: [
      { key: "date", label: "التاريخ" }, { key: "question", label: "السؤال" },
      { key: "status", label: "الحالة" }, { key: "country", label: "الدولة" },
      { key: "notes", label: "ملاحظات إضافية" },
    ] },
  { id: "projects", label: "المشاريع", type: "double", department: "projects",
    tables: [
      { title: "المشاريع", endpoint: "/api/projects/",
        columns: [
          { key: "date", label: "التاريخ" }, { key: "name", label: "اسم المشروع" },
          { key: "target_amount", label: "المستهدف" }, { key: "raised_amount", label: "المجموع" },
          { key: "donors_count", label: "المتبرعون" }, { key: "completion_percent", label: "نسبة الإكتمال" },
          { key: "notes", label: "ملاحظات إضافية" },
        ] },
      { title: "الاشتراكات", endpoint: "/api/subscriptions/",
        columns: [
          { key: "package", label: "الباقة" }, { key: "subscribers_count", label: "المشتركون" },
          { key: "total_amount", label: "إجمالي المبلغ" }, { key: "notes", label: "ملاحظات إضافية" },
        ] },
    ] },
  { id: "communities", label: "المجتمعات الافتراضية", type: "table", endpoint: "/api/communities/", department: "communities",
    columns: [
      { key: "date", label: "التاريخ" }, { key: "community_type", label: "التصنيف" },
      { key: "name", label: "اسم المجتمع" }, { key: "joined_count", label: "المنضمون" },
      { key: "posts_count", label: "المنشورات" }, { key: "notes", label: "ملاحظات إضافية" },
    ] },
  { id: "news", label: "الأخبار والبيانات", type: "table", endpoint: "/api/news/", department: "news",
    columns: [
      { key: "date", label: "التاريخ" }, { key: "news_count", label: "الأخبار" }, { key: "data_count", label: "البيانات" },
      { key: "notes", label: "ملاحظات إضافية" },
    ] },
  { id: "rabita", label: "بيانات موقع الرابطة", type: "metrics", source: "rabita", department: "rabita" },
  { id: "sheikh", label: "بيانات موقع معالي الأمين العام", type: "metrics", source: "sheikh", department: "sheikh" },
  { id: "admin", label: "الإدارة", type: "metrics", source: "admin_metrics", department: "admin_metrics" },
];

const ADMIN_SCREENS = [
  { id: "admin-users", label: "إدارة المستخدمين" },
  { id: "admin-audit", label: "سجل التدقيق" },
];

const loginScreen = document.getElementById("login-screen");
const otpScreen = document.getElementById("otp-screen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const otpForm = document.getElementById("otp-form");
const loginError = document.getElementById("login-error");
const otpError = document.getElementById("otp-error");
const navList = document.getElementById("nav-list");
const screenTitle = document.getElementById("screen-title");
const screenSubtitle = document.getElementById("screen-subtitle");
const screenBody = document.getElementById("screen-body");

let activeScreenId = SCREENS[0].id;
let pendingUsername = "";
let activeCharts = [];
let viewMode = "table";
let currentData = null; // يخزّن آخر بيانات مجلوبة لتفعيل البحث بدون إعادة الطلب من السيرفر
let lastUsersList = [];

// ---------- الصلاحيات على مستوى الواجهة ----------
function currentRole() { return localStorage.getItem("role") || ""; }
function currentDept() { return localStorage.getItem("department") || ""; }
function isSystemAdmin() { return currentRole() === "system_admin"; }

function canWrite(departmentKey) {
  const role = currentRole();
  if (role === "system_admin" || role === "supervisor") return true;
  if (role === "department_editor" && currentDept() === departmentKey) return true;
  return false;
}

function canReview() {
  const role = currentRole();
  return role === "system_admin" || role === "supervisor" || role === "analyst";
}

// ---------- أدوات مساعدة للرسومات ----------
const CHART_COLORS = ["#1B4D3E", "#C9A227", "#75857F", "#C15B4A", "#5B8C7B", "#A88B3E"];

function destroyCharts() {
  activeCharts.forEach((c) => c.destroy());
  activeCharts = [];
}

function makeCanvas(id) {
  return `<div class="chart-box"><canvas id="${id}"></canvas></div>`;
}

function drawChart(canvasId, type, labels, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const chart = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { display: datasets.length > 1 || type === "doughnut" } },
      scales: type === "doughnut" ? {} : { y: { beginAtZero: true } },
    },
  });
  activeCharts.push(chart);
}

function countBy(rows, key) {
  const counts = {};
  rows.forEach((r) => {
    const k = r[key] || "غير محدد";
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

// يحاول يطلع رقم من أي نص (يدعم "٪"، فواصل الآلاف، أرقام عشرية)
function parseLooseNumber(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).replace(/,/g, "").trim();
  const match = str.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  return parseFloat(match[0]);
}

// خاص بعمود نسبة الإكتمال: يدعم "0.0018 %" و 0.0049 (كسر عشري) بنفس الوقت
function parsePercent(value) {
  const num = parseLooseNumber(value);
  if (num === null) return 0;
  const hasPercentSign = String(value).includes("%");
  if (hasPercentSign) return num;
  return num <= 1 ? num * 100 : num;
}

// يطلع عدد النجوم من نص التقييم. الصيغة الحقيقية ببياناتكم: "1 (5 نجوم)"
// حيث الرقم خارج القوس هو التقييم الفعلي، و"5 نجوم" جوه القوس مجرد تسمية ثابتة (من أصل 5)
function parseStars(value) {
  if (!value) return null;
  const str = String(value).trim();

  let match = str.match(/^(\d+)\s*\(/); // "1 (5 نجوم)" -> يلقط الرقم قبل القوس
  if (match) return Math.min(5, Math.max(0, parseInt(match[1], 10)));

  match = str.match(/(\d+)\s*من\s*\d+\s*نجوم/); // احتياطي: "2 من 5 نجوم"
  if (match) return Math.min(5, Math.max(0, parseInt(match[1], 10)));

  match = str.match(/^(\d+)/); // احتياطي أخير: أول رقم بالنص
  if (match) return Math.min(5, Math.max(0, parseInt(match[1], 10)));

  return null;
}

// يفصل مؤشرات الموقع لقسمين: "شهرية" (تدخل بالرسم الخطي) و"سنوية/عامة" (تدخل ببطاقات ملخص)
function splitMetrics(rows) {
  const monthly = [];
  const summary = [];
  rows.forEach((r) => (String(r.label).includes("شهر") ? monthly : summary).push(r));
  return { monthly, summary };
}

// يقصّر تسمية الشهر الطويلة لعرض أنظف على محور الرسم
function shortenMetricLabel(label) {
  const match = String(label).match(/شهر\s+(\S+\s+\d{4})/);
  return match ? match[1] : label;
}

// ---------- خطوة ١: اسم المستخدم + كلمة المرور ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      loginError.textContent = err.detail || "خطأ في تسجيل الدخول";
      return;
    }
    pendingUsername = username;
    loginScreen.classList.add("hidden");
    otpScreen.classList.remove("hidden");
  } catch (err) {
    loginError.textContent = "تعذّر الاتصال بالسيرفر";
  }
});

// ---------- خطوة ٢: رمز التحقق ----------
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  otpError.textContent = "";
  const code = document.getElementById("otp-code").value;

  try {
    const res = await fetch("/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: pendingUsername, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      otpError.textContent = err.detail || "رمز غير صحيح";
      return;
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("department", data.department || "");
    localStorage.setItem("full_name", data.full_name || pendingUsername);
    showDashboard();
  } catch (err) {
    otpError.textContent = "تعذّر الاتصال بالسيرفر";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.clear();
  location.reload();
});

// ---------- تسجيل حساب جديد ----------
const registerScreen = document.getElementById("register-screen");
const registerForm = document.getElementById("register-form");
const registerError = document.getElementById("register-error");

document.getElementById("go-register").addEventListener("click", (e) => {
  e.preventDefault();
  loginScreen.classList.add("hidden");
  registerScreen.classList.remove("hidden");
});
document.getElementById("go-login").addEventListener("click", (e) => {
  e.preventDefault();
  registerScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerError.textContent = "";
  const payload = {
    username: document.getElementById("reg-username").value,
    email: document.getElementById("reg-email").value,
    national_id: document.getElementById("reg-national-id").value || null,
    full_name: document.getElementById("reg-full-name").value,
    password: document.getElementById("reg-password").value,
    requested_department: document.getElementById("reg-department").value || null,
  };
  try {
    const res = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      registerError.textContent = err.detail || "تعذّر إنشاء الحساب";
      return;
    }
    registerScreen.classList.add("hidden");
    document.getElementById("onboarding-modal").classList.remove("hidden");
  } catch (err) {
    registerError.textContent = "تعذّر الاتصال بالسيرفر";
  }
});

document.getElementById("onboarding-close").addEventListener("click", () => {
  document.getElementById("onboarding-modal").classList.add("hidden");
  registerForm.reset();
  loginScreen.classList.remove("hidden");
});

// ---------- الوضع الليلي ----------
const themeToggle = document.getElementById("theme-toggle");
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}
themeToggle.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
});
applyTheme(localStorage.getItem("theme") || "light");

// ---------- تبديل رسومي / جدول ----------
document.getElementById("toggle-visual").addEventListener("click", () => setViewMode("visual"));
document.getElementById("toggle-table").addEventListener("click", () => setViewMode("table"));

function setViewMode(mode) {
  viewMode = mode;
  document.getElementById("toggle-visual").classList.toggle("active", mode === "visual");
  document.getElementById("toggle-table").classList.toggle("active", mode === "table");
  document.getElementById("search-box").classList.toggle("hidden", mode === "visual");
  openScreen(activeScreenId);
}

// ---------- البحث وفلتر التاريخ داخل الجدول المفتوح حاليًا ----------
document.getElementById("search-box").addEventListener("input", () => applyFilters());
document.getElementById("filter-date-text").addEventListener("input", () => applyFilters());
document.getElementById("filter-clear-btn").addEventListener("click", () => {
  document.getElementById("filter-date-text").value = "";
  applyFilters();
});

function rowMatches(row, term) {
  if (!term) return true;
  return Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(term));
}

function rowMatchesDate(row, dateTerm) {
  if (!dateTerm) return true;
  return String(row.date ?? "").toLowerCase().includes(dateTerm);
}

function applyFilters() {
  const term = document.getElementById("search-box").value.trim().toLowerCase();
  const dateTerm = document.getElementById("filter-date-text").value.trim().toLowerCase();
  applySearch(term, dateTerm);
}

function applySearch(term, dateTerm) {
  if (!currentData || viewMode !== "table") return; // الفلاتر تشتغل بوضع الجدول فقط حاليًا
  const matches = (r) => rowMatches(r, term) && rowMatchesDate(r, dateTerm);

  if (currentData.type === "table") {
    const filtered = currentData.rows.filter(matches);
    screenBody.innerHTML = renderTable(currentData.columns, filtered, currentData.endpoint, canWrite(currentData.department));
  } else if (currentData.type === "double") {
    const p = currentData.projectRows.filter(matches);
    const s = currentData.subRows.filter(matches);
    const editable = canWrite(currentData.department);
    screenBody.innerHTML =
      `<h3>${currentData.projectTitle}</h3>` + renderTable(currentData.projectColumns, p, currentData.projectEndpoint, editable) +
      `<h3>${currentData.subTitle}</h3>` + renderTable(currentData.subColumns, s, currentData.subEndpoint, editable);
  } else if (currentData.type === "metrics") {
    const filtered = currentData.rows.filter((r) => rowMatches(r, term));
    screenBody.innerHTML = renderMetrics(filtered);
  }
}

// ---------- تصدير Excel ----------
document.getElementById("export-btn").addEventListener("click", async () => {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("/api/export/excel", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      alert(`تعذّر تصدير الملف (رمز الخطأ: ${res.status}). لو استمرت المشكلة، أرسل هذا الرقم.`);
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `بيانات_النظام_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("تعذّر الاتصال بالسيرفر");
  }
});

// ---------- لوحة التحكم ----------
function showDashboard() {
  loginScreen.classList.add("hidden");
  otpScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  document.getElementById("user-name").textContent = localStorage.getItem("full_name") || "مستخدم";
  document.getElementById("user-role").textContent = roleLabel(localStorage.getItem("role"));
  buildNav();
  openScreen(activeScreenId);
}

function roleLabel(role) {
  const map = {
    system_admin: "مدير النظام", officer: "مسؤول إداري",
    analyst: "محلل بيانات", supervisor: "مشرف بيانات", department_editor: "مسؤول قسم",
    pending: "قيد التفعيل",
  };
  return map[role] || role || "";
}

function buildNav() {
  navList.innerHTML = "";
  const allScreens = isSystemAdmin() ? [...SCREENS, ...ADMIN_SCREENS] : SCREENS;
  allScreens.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "nav-item" + (s.id === activeScreenId ? " active" : "");
    btn.textContent = s.label;
    btn.onclick = () => openScreen(s.id);
    navList.appendChild(btn);
  });
}

function screenHasDateColumn(screen) {
  if (screen.type === "table") return screen.columns.some((c) => c.key === "date");
  if (screen.type === "double") return screen.tables.some((t) => t.columns.some((c) => c.key === "date"));
  return false;
}

async function openScreen(id) {
  activeScreenId = id;
  buildNav();
  destroyCharts();
  closeForm();
  document.getElementById("search-box").value = "";
  document.getElementById("filter-date-text").value = "";
  document.getElementById("date-filter-row").classList.add("hidden");

  if (id === "admin-users") return openUsersScreen();
  if (id === "admin-audit") return openAuditScreen();

  const screen = SCREENS.find((s) => s.id === id);
  screenTitle.textContent = screen.label;
  screenSubtitle.textContent = "";
  screenBody.innerHTML = '<p class="loading">جارٍ التحميل...</p>';

  if (viewMode === "table" && screenHasDateColumn(screen)) {
    document.getElementById("date-filter-row").classList.remove("hidden");
  }

  try {
    if (screen.type === "table") {
      const rows = await apiGet(screen.endpoint);
      currentData = { type: "table", rows, columns: screen.columns, endpoint: screen.endpoint, department: screen.department };
      const editable = canWrite(screen.department);
      if (viewMode === "visual") {
        screenBody.innerHTML =
          buildKpiHtml(id, rows) + buildChartsOrFallback(id, rows) +
          (id === "courses" ? buildStarsListHtml(rows) : "");
        drawChartsForScreen(id, rows);
      } else {
        screenBody.innerHTML =
          (editable ? '<div class="add-row"><button class="add-btn" onclick="openAddForm()">+ إضافة سجل</button></div>' : "") +
          renderTable(screen.columns, rows, screen.endpoint, editable);
      }
    } else if (screen.type === "double") {
      const projectRows = await apiGet(screen.tables[0].endpoint);
      const subRows = await apiGet(screen.tables[1].endpoint);
      currentData = {
        type: "double", projectRows, subRows, department: screen.department,
        projectTitle: screen.tables[0].title, projectColumns: screen.tables[0].columns, projectEndpoint: screen.tables[0].endpoint,
        subTitle: screen.tables[1].title, subColumns: screen.tables[1].columns, subEndpoint: screen.tables[1].endpoint,
      };
      const editable = canWrite(screen.department);

      if (viewMode === "visual") {
        screenBody.innerHTML =
          buildKpiHtml("projects", projectRows) +
          buildChartsOrFallback("projects", projectRows) +
          buildChartsOrFallback("subscriptions", subRows);
        drawChartsForScreen("projects", projectRows);
        drawChartsForScreen("subscriptions", subRows);
      } else {
        screenBody.innerHTML =
          (editable ? `<div class="add-row"><button class="add-btn" onclick="openAddFormFor('${screen.tables[0].endpoint}')">+ إضافة ${screen.tables[0].title}</button></div>` : "") +
          `<h3>${screen.tables[0].title}</h3>` + renderTable(screen.tables[0].columns, projectRows, screen.tables[0].endpoint, editable) +
          (editable ? `<div class="add-row"><button class="add-btn" onclick="openAddFormFor('${screen.tables[1].endpoint}')">+ إضافة ${screen.tables[1].title}</button></div>` : "") +
          `<h3>${screen.tables[1].title}</h3>` + renderTable(screen.tables[1].columns, subRows, screen.tables[1].endpoint, editable);
      }
    } else if (screen.type === "metrics") {
      const rows = await apiGet(`/api/site-metrics/`);
      const filtered = rows.filter((r) => r.source === screen.source);
      const metricColumns = [
        { key: "label", label: "المؤشر" }, { key: "value", label: "القيمة" },
        { key: "notes", label: "ملاحظات إضافية" },
      ];
      const editable = canWrite(screen.department);
      currentData = {
        type: "table", rows: filtered, columns: metricColumns, endpoint: "/api/site-metrics/",
        department: screen.department, fixedFields: { source: screen.source },
      };
      if (viewMode === "visual") {
        screenBody.innerHTML = buildKpiHtml("metrics", filtered) + buildChartsOrFallback("metrics", filtered);
        drawChartsForScreen("metrics", filtered);
      } else {
        screenBody.innerHTML =
          (editable ? '<div class="add-row"><button class="add-btn" onclick="openAddForm()">+ إضافة مؤشر</button></div>' : "") +
          renderTable(metricColumns, filtered, "/api/site-metrics/", editable);
      }
    }
  } catch (err) {
    if (err.status === 401) {
      localStorage.clear();
      location.reload();
      return;
    }
    screenBody.innerHTML = `<p class="empty-msg">تعذّر تحميل البيانات: ${err.message}</p>`;
  }
}

// ---------- شاشة إدارة المستخدمين (لمدير النظام فقط) ----------
async function openUsersScreen() {
  screenTitle.textContent = "إدارة المستخدمين";
  screenSubtitle.textContent = "";
  screenBody.innerHTML = '<p class="loading">جارٍ التحميل...</p>';
  try {
    lastUsersList = await apiGet("/api/users/");
    screenBody.innerHTML = renderUsersTable(lastUsersList);
  } catch (err) {
    screenBody.innerHTML = `<p class="empty-msg">تعذّر تحميل المستخدمين: ${err.message}</p>`;
  }
}

function renderUsersTable(usersList) {
  if (!usersList.length) return '<p class="empty-msg">لا يوجد مستخدمون</p>';
  const rows = usersList.map((u) => `
    <tr>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${u.full_name ?? "—"}</td>
      <td><span class="role-badge">${roleLabel(u.role)}</span></td>
      <td>${u.department ?? "—"}</td>
      <td><button class="icon-btn" onclick="openUserEdit(${u.id})">تعديل</button></td>
    </tr>`).join("");
  return `<table><thead><tr><th>اسم المستخدم</th><th>البريد</th><th>الاسم</th><th>الدور</th><th>القسم</th><th>إجراءات</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const ROLE_OPTIONS = ["pending", "system_admin", "officer", "analyst", "supervisor", "department_editor"];
const DEPARTMENT_OPTIONS = ["courses", "qna", "projects", "communities", "news", "rabita", "sheikh", "admin_metrics"];

function openUserEdit(id) {
  const u = lastUsersList.find((x) => x.id === id);
  if (!u) return;
  const container = document.getElementById("form-container");
  container.innerHTML = `
    <div class="form-box">
      <h3>تعديل المستخدم: ${u.username}</h3>
      <div class="form-field"><label>البريد الإلكتروني</label><input type="text" id="user-email" value="${String(u.email || "").replace(/"/g, "&quot;")}"></div>
      <div class="form-field"><label>الاسم الكامل</label><input type="text" id="user-fullname" value="${String(u.full_name || "").replace(/"/g, "&quot;")}"></div>
      <div class="form-field">
        <label>الدور</label>
        <select id="user-role" class="dept-select">
          ${ROLE_OPTIONS.map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${roleLabel(r)}</option>`).join("")}
        </select>
      </div>
      <div class="form-field">
        <label>القسم (لمسؤول قسم فقط)</label>
        <select id="user-department" class="dept-select">
          <option value="">بدون</option>
          ${DEPARTMENT_OPTIONS.map((d) => `<option value="${d}" ${d === u.department ? "selected" : ""}>${d}</option>`).join("")}
        </select>
      </div>
      <div class="form-actions">
        <button onclick="saveUserEdit(${id})">حفظ</button>
        <button onclick="closeForm()" class="cancel-btn">إلغاء</button>
      </div>
      <p id="form-error" class="error-msg"></p>
    </div>`;
  container.classList.remove("hidden");
  container.scrollIntoView({ behavior: "smooth" });
}

async function saveUserEdit(id) {
  const payload = {
    email: document.getElementById("user-email").value,
    full_name: document.getElementById("user-fullname").value,
    role: document.getElementById("user-role").value,
    department: document.getElementById("user-department").value || null,
  };
  const token = localStorage.getItem("token");
  const errorEl = document.getElementById("form-error");
  try {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errorEl.textContent = (err.detail && String(err.detail)) || `تعذّر الحفظ (${res.status})`;
      return;
    }
    closeForm();
    openUsersScreen();
  } catch (err) {
    errorEl.textContent = "تعذّر الاتصال بالسيرفر";
  }
}
window.openUserEdit = openUserEdit;
window.saveUserEdit = saveUserEdit;

// ---------- شاشة سجل التدقيق (لمدير النظام فقط) ----------
async function openAuditScreen() {
  screenTitle.textContent = "سجل التدقيق";
  screenSubtitle.textContent = "يُحتفظ بالسجلات لمدة 14 يوم";
  screenBody.innerHTML = '<p class="loading">جارٍ التحميل...</p>';
  try {
    const entries = await apiGet("/api/audit-log/");
    screenBody.innerHTML =
      `<div class="add-row">
         <button class="add-btn" onclick="downloadAuditLog()">⬇ تنزيل السجل</button>
         <button class="icon-btn danger" onclick="cleanupAuditLog()">تنظيف السجلات الأقدم من 14 يوم</button>
       </div>` + renderAuditTable(entries);
  } catch (err) {
    screenBody.innerHTML = `<p class="empty-msg">تعذّر تحميل السجل: ${err.message}</p>`;
  }
}

function renderAuditTable(entries) {
  if (!entries.length) return '<p class="empty-msg">لا توجد سجلات</p>';
  const rows = entries.map((e) => `
    <tr>
      <td>${e.timestamp ? new Date(e.timestamp).toLocaleString("ar-SA") : "—"}</td>
      <td>${e.username ?? "—"}</td>
      <td>${e.action}</td>
      <td>${e.table_name}</td>
      <td>${e.record_id ?? "—"}</td>
      <td>${e.details ?? "—"}</td>
    </tr>`).join("");
  return `<table><thead><tr><th>التاريخ والوقت</th><th>المستخدم</th><th>الإجراء</th><th>الجدول</th><th>رقم السجل</th><th>التفاصيل</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function downloadAuditLog() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("/api/audit-log/export", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { alert(`تعذّر التنزيل (رمز الخطأ: ${res.status})`); return; }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `سجل_التدقيق_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("تعذّر الاتصال بالسيرفر");
  }
}

async function cleanupAuditLog() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffText = cutoff.toISOString().slice(0, 10);
  if (!confirm(`سيتم حذف كل سجلات التدقيق الأقدم من ${cutoffText} نهائيًا، ولا يمكن التراجع عن هذا الإجراء. متأكد إنك تبي تكمل؟`)) return;

  const token = localStorage.getItem("token");
  try {
    const res = await fetch("/api/audit-log/cleanup", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { alert(`تعذّر التنظيف (رمز الخطأ: ${res.status})`); return; }
    const data = await res.json();
    alert(`تم حذف ${data.deleted} سجل بنجاح`);
    openAuditScreen();
  } catch (err) {
    alert("تعذّر الاتصال بالسيرفر");
  }
}
window.downloadAuditLog = downloadAuditLog;
window.cleanupAuditLog = cleanupAuditLog;

// ---------- بطاقات مؤشرات مختصرة لأعلى الوضع الرسومي ----------
function buildKpiHtml(screenKey, rows) {
  if (!rows || !rows.length) return "";
  const card = (label, value) =>
    `<div class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div></div>`;

  let cards = [];

  if (screenKey === "metrics") {
    const { summary } = splitMetrics(rows);
    summary.forEach((r) => cards.push(card(r.label, r.value ?? "—")));
    if (!cards.length) cards.push(card("عدد المؤشرات", rows.length.toLocaleString()));
    return `<div class="kpi-row">${cards.join("")}</div>`;
  }

  cards.push(card("عدد السجلات", rows.length.toLocaleString()));

  if (screenKey === "courses") {
    const enrolled = rows.reduce((s, r) => s + (r.enrolled_count || 0), 0);
    const certs = rows.reduce((s, r) => s + (r.certificates_issued || 0), 0);
    cards.push(card("إجمالي المسجلين", enrolled.toLocaleString()));
    cards.push(card("إجمالي الشهادات", certs.toLocaleString()));
  } else if (screenKey === "projects") {
    const raised = rows.reduce((s, r) => s + (r.raised_amount || 0), 0);
    const donors = rows.reduce((s, r) => s + (r.donors_count || 0), 0);
    cards.push(card("إجمالي المبلغ المجموع", raised.toLocaleString()));
    cards.push(card("إجمالي المتبرعين", donors.toLocaleString()));
  } else if (screenKey === "communities") {
    const joined = rows.reduce((s, r) => s + (r.joined_count || 0), 0);
    cards.push(card("إجمالي المنضمين", joined.toLocaleString()));
  } else if (screenKey === "news") {
    const news = rows.reduce((s, r) => s + (r.news_count || 0), 0);
    const data = rows.reduce((s, r) => s + (r.data_count || 0), 0);
    cards.push(card("إجمالي الأخبار", news.toLocaleString()));
    cards.push(card("إجمالي البيانات", data.toLocaleString()));
  }

  return `<div class="kpi-row">${cards.join("")}</div>`;
}

// ---------- يرجّع الرسم، أو رسالة بديلة لو المكتبة ما تحمّلت ----------
function buildChartsOrFallback(screenKey, rows) {
  if (!rows || !rows.length) return "";
  if (typeof Chart === "undefined") {
    return '<div class="chart-fallback">تعذّر تحميل مكتبة الرسومات حاليًا. البيانات نفسها سليمة — جرّب "عرض الجدول" لرؤيتها، أو أعد تحميل الصفحة.</div>';
  }
  return buildChartsHtml(screenKey, rows);
}

// ---------- تجهيز مكان الرسم لكل شاشة (يرجّع HTML فاضي فيه canvas) ----------
function buildChartsHtml(screenKey, rows) {
  if (typeof Chart === "undefined") return ""; // مكتبة الرسومات ما تحمّلت - نتجاهلها بأمان
  if (!rows || !rows.length) return "";
  switch (screenKey) {
    case "courses":
      return `<div class="charts-row">${makeCanvas("chart-courses")}</div>`;
    case "qna":
      return `<div class="charts-row">${makeCanvas("chart-qna")}${makeCanvas("chart-qna-country")}</div>`;
    case "projects":
      return `<div class="charts-row">${makeCanvas("chart-projects")}</div>`;
    case "subscriptions":
      return `<div class="charts-row">${makeCanvas("chart-subscriptions")}</div>`;
    case "communities":
      return `<div class="charts-row">${makeCanvas("chart-communities")}</div>`;
    case "news":
      return `<div class="charts-row">${makeCanvas("chart-news")}</div>`;
    case "metrics":
      return `<div class="charts-row">${makeCanvas("chart-metrics")}</div>`;
    default:
      return "";
  }
}

// ---------- رسم كل رسم فعليًا حسب البيانات المجلوبة ----------
function drawChartsForScreen(screenKey, rows) {
  if (typeof Chart === "undefined") return; // مكتبة الرسومات ما تحمّلت - نتجاهلها بأمان، الجدول يبقى شغّال
  if (!rows || !rows.length) return;

  if (screenKey === "courses") {
    const recent = rows.slice(0, 10).reverse();
    drawChart("chart-courses", "bar",
      recent.map((r) => r.course_name),
      [
        { label: "المسجلون", data: recent.map((r) => r.enrolled_count), backgroundColor: CHART_COLORS[0] },
        { label: "الحاضرون", data: recent.map((r) => r.attended_count), backgroundColor: CHART_COLORS[1] },
      ]);
  }

  if (screenKey === "qna") {
    const counts = countBy(rows, "status");
    drawChart("chart-qna", "doughnut", Object.keys(counts),
      [{ data: Object.values(counts), backgroundColor: CHART_COLORS }]);

    const byCountry = Object.entries(countBy(rows, "country"))
      .sort((a, b) => b[1] - a[1]).slice(0, 8);
    drawChart("chart-qna-country", "bar", byCountry.map((x) => x[0]),
      [{ label: "الأسئلة حسب الدولة", data: byCountry.map((x) => x[1]), backgroundColor: CHART_COLORS[1] }]);
  }

  if (screenKey === "projects") {
    const top = rows.slice(0, 10).reverse();
    drawChart("chart-projects", "bar",
      top.map((r) => r.name),
      [{ label: "نسبة الإكتمال %", data: top.map((r) => parsePercent(r.completion_percent)), backgroundColor: CHART_COLORS[0] }]);
  }

  if (screenKey === "subscriptions") {
    drawChart("chart-subscriptions", "bar",
      rows.map((r) => r.package),
      [{ label: "عدد المشتركين", data: rows.map((r) => r.subscribers_count), backgroundColor: CHART_COLORS[1] }]);
  }

  if (screenKey === "communities") {
    const counts = countBy(rows, "community_type");
    drawChart("chart-communities", "bar", Object.keys(counts),
      [{ label: "عدد المجتمعات", data: Object.values(counts), backgroundColor: CHART_COLORS[0] }]);
  }

  if (screenKey === "news") {
    const recent = rows.slice(0, 10).reverse();
    drawChart("chart-news", "bar",
      recent.map((r) => r.date),
      [
        { label: "الأخبار", data: recent.map((r) => r.news_count), backgroundColor: CHART_COLORS[0] },
        { label: "البيانات", data: recent.map((r) => r.data_count), backgroundColor: CHART_COLORS[1] },
      ]);
  }

  if (screenKey === "metrics") {
    const { monthly } = splitMetrics(rows);
    const withNumbers = monthly
      .slice().reverse() // rows تجي الأحدث أول، نرجّعها للترتيب الزمني الصحيح (الأقدم أول)
      .map((r) => ({ label: shortenMetricLabel(r.label), value: parseLooseNumber(r.value) }))
      .filter((r) => r.value !== null);
    if (withNumbers.length) {
      drawChart("chart-metrics", "line",
        withNumbers.map((r) => r.label),
        [{
          label: "الزيارات الشهرية", data: withNumbers.map((r) => r.value),
          borderColor: CHART_COLORS[0], backgroundColor: CHART_COLORS[0],
          tension: 0.3, fill: false, pointRadius: 4,
        }]);
    }
  }
}

// ---------- عرض تقييمات النجوم لأحدث الدورات ----------
function buildStarsListHtml(rows) {
  const withRatings = rows.filter((r) => parseStars(r.rating) !== null).slice(0, 8);
  if (!withRatings.length) return "";
  const rowsHtml = withRatings.map((r) => {
    const stars = parseStars(r.rating);
    const starsHtml = "★".repeat(stars) + "☆".repeat(5 - stars);
    return `<div class="star-row"><span class="star-course-name">${r.course_name}</span><span class="star-icons">${starsHtml}</span></div>`;
  }).join("");
  return `<div class="chart-box"><h3>أحدث تقييمات الدورات</h3>${rowsHtml}</div>`;
}

async function apiGet(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const e = new Error("فشل الطلب");
    e.status = res.status;
    throw e;
  }
  return res.json();
}

function renderTable(columns, rows, endpoint, canEdit) {
  if (!rows.length) return '<p class="empty-msg">لا توجد بيانات</p>';
  const head = columns.map((c) => `<th>${c.label}</th>`).join("") + "<th>المراجعة</th>" + (canEdit ? "<th>إجراءات</th>" : "");
  const body = rows.map((r) => {
    const cells = columns.map((c) => `<td>${r[c.key] ?? "—"}</td>`).join("");
    let reviewCell;
    if (r.reviewed) {
      reviewCell = '<td class="reviewed-yes">✔ معتمد</td>';
    } else if (canReview()) {
      reviewCell = `<td><button class="review-btn" onclick="handleReview('${endpoint}', ${r.id})">اعتماد</button></td>`;
    } else {
      reviewCell = '<td class="reviewed-no">قيد المراجعة</td>';
    }
    const actionsCell = canEdit
      ? `<td class="actions-cell">
           <button class="icon-btn" onclick="openEditRow('${endpoint}', ${r.id})">تعديل</button>
           <button class="icon-btn danger" onclick="handleDelete('${endpoint}', ${r.id})">حذف</button>
         </td>`
      : "";
    return `<tr>${cells}${reviewCell}${actionsCell}</tr>`;
  }).join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// ---------- بناء وإدارة نموذج الإضافة/التعديل ----------
let formContext = null;

function buildFormFieldsHtml(columns, existingRow) {
  return columns.map((c) => {
    const raw = existingRow ? existingRow[c.key] : "";
    const val = String(raw ?? "").replace(/"/g, "&quot;");
    return `<div class="form-field"><label>${c.label}</label><input type="text" id="field-${c.key}" value="${val}"></div>`;
  }).join("");
}

function openForm(columns, endpoint, existingRow, fixedFields) {
  formContext = { columns, endpoint, id: existingRow ? existingRow.id : null, fixedFields: fixedFields || {} };
  const container = document.getElementById("form-container");
  container.innerHTML = `
    <div class="form-box">
      <h3>${existingRow ? "تعديل السجل" : "إضافة سجل جديد"}</h3>
      ${buildFormFieldsHtml(columns, existingRow)}
      <div class="form-actions">
        <button onclick="saveForm()">حفظ</button>
        <button onclick="closeForm()" class="cancel-btn">إلغاء</button>
      </div>
      <p id="form-error" class="error-msg"></p>
    </div>`;
  container.classList.remove("hidden");
  container.scrollIntoView({ behavior: "smooth" });
}

function closeForm() {
  document.getElementById("form-container").classList.add("hidden");
  document.getElementById("form-container").innerHTML = "";
  formContext = null;
}

const NUMERIC_FIELDS = [
  "enrolled_count", "attended_count", "certificates_issued",
  "target_amount", "raised_amount", "donors_count",
  "joined_count", "posts_count", "news_count", "data_count",
  "subscribers_count", "total_amount",
];

async function saveForm() {
  if (!formContext) return;
  const payload = { ...formContext.fixedFields };
  formContext.columns.forEach((c) => {
    let v = document.getElementById(`field-${c.key}`).value;
    if (NUMERIC_FIELDS.includes(c.key)) {
      v = v === "" ? 0 : Number(v);
    }
    payload[c.key] = v === "" ? null : v;
  });

  const token = localStorage.getItem("token");
  const url = formContext.id ? `${formContext.endpoint}${formContext.id}` : formContext.endpoint;
  const method = formContext.id ? "PUT" : "POST";
  const errorEl = document.getElementById("form-error");

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errorEl.textContent = (err.detail && String(err.detail)) || `تعذّر الحفظ (رمز الخطأ: ${res.status})`;
      return;
    }
    closeForm();
    openScreen(activeScreenId);
  } catch (err) {
    errorEl.textContent = "تعذّر الاتصال بالسيرفر";
  }
}

// يفتح نموذج تعديل لسجل موجود، بالبحث عنه داخل آخر بيانات مجلوبة (بدون طلب إضافي للسيرفر)
function openEditRow(endpoint, id) {
  if (!currentData) return;
  let row = null, columns = null;

  if (currentData.type === "table" && currentData.endpoint === endpoint) {
    row = currentData.rows.find((r) => r.id === id);
    columns = currentData.columns;
  } else if (currentData.type === "double") {
    if (currentData.projectEndpoint === endpoint) {
      row = currentData.projectRows.find((r) => r.id === id);
      columns = currentData.projectColumns;
    } else if (currentData.subEndpoint === endpoint) {
      row = currentData.subRows.find((r) => r.id === id);
      columns = currentData.subColumns;
    }
  }

  if (!row || !columns) { alert("تعذّر إيجاد السجل"); return; }
  openForm(columns, endpoint, row, row.source ? { source: row.source } : {});
}

function openAddForm() {
  if (!currentData || currentData.type !== "table") return;
  openForm(currentData.columns, currentData.endpoint, null, currentData.fixedFields);
}

function openAddFormFor(endpoint) {
  if (!currentData || currentData.type !== "double") return;
  const columns = currentData.projectEndpoint === endpoint ? currentData.projectColumns : currentData.subColumns;
  openForm(columns, endpoint, null);
}

async function handleDelete(endpoint, id) {
  if (!confirm("متأكد تبي تحذف هذا السجل؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${endpoint}${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      alert((err.detail && String(err.detail)) || `تعذّر الحذف (رمز الخطأ: ${res.status})`);
      return;
    }
    openScreen(activeScreenId);
  } catch (err) {
    alert("تعذّر الاتصال بالسيرفر");
  }
}

window.openEditRow = openEditRow;
window.openAddForm = openAddForm;
window.openAddFormFor = openAddFormFor;
window.handleDelete = handleDelete;
window.saveForm = saveForm;
window.closeForm = closeForm;

// ---------- تنفيذ الاعتماد فعليًا (يستدعيها زر "اعتماد" داخل الجدول) ----------
async function handleReview(endpointBase, id) {
  if (!confirm("متأكد إنك راجعت هذا السجل وتبي تعتمده؟ بعد الاعتماد ما يقدر يتغيّر وضعه.")) return;
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${endpointBase}${id}/review`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "ما عندك صلاحية اعتماد هذا السجل");
      return;
    }
    openScreen(activeScreenId); // نعيد تحميل الشاشة عشان يظهر التحديث
  } catch (err) {
    alert("تعذّر الاتصال بالسيرفر");
  }
}
window.handleReview = handleReview; // لازم يكون متاح عالميًا لأن الزر مضمّن داخل HTML مباشرة

function renderMetrics(rows) {
  if (!rows.length) return '<p class="empty-msg">لا توجد بيانات</p>';
  return rows.map((r) =>
    `<div class="metric-card"><span class="metric-label">${r.label}</span><span class="metric-value">${r.value ?? "—"}</span></div>`
  ).join("");
}

if (localStorage.getItem("token")) {
  showDashboard();
}
