/* UnitedCare â€” shared frontend logic.
   Data is kept in localStorage as a stand-in for the Spring Boot REST API
   described in the synopsis; swap the `Store` functions for fetch() calls. */

const DOCTORS = [
  { id: 1, name: "Dr. Ananya Verma", specialty: "Hematologist", hospital: "SRN Hospital, Prayagraj", exp: 14, rating: 4.9, fee: 800, color: "#b4123a" },
  { id: 2, name: "Dr. Rajeev Srivastava", specialty: "Oncologist", hospital: "Kamla Nehru Memorial Hospital", exp: 18, rating: 4.8, fee: 1200, color: "#101828" },
  { id: 3, name: "Dr. Meera Pandey", specialty: "Hematologist", hospital: "Swaroop Rani Medical Centre", exp: 9, rating: 4.7, fee: 700, color: "#8d0c2c" },
  { id: 4, name: "Dr. Arvind Yadav", specialty: "Oncologist", hospital: "Tata Memorial Satellite Clinic", exp: 21, rating: 4.9, fee: 1500, color: "#334155" },
  { id: 5, name: "Dr. Kavita Mishra", specialty: "Pathologist", hospital: "City Diagnostics Lab", exp: 11, rating: 4.6, fee: 500, color: "#0f8a6a" },
  { id: 6, name: "Dr. Sameer Khan", specialty: "General Physician", hospital: "Phoenix Hospital", exp: 8, rating: 4.5, fee: 400, color: "#c27803" },
  { id: 7, name: "Dr. Pooja Tripathi", specialty: "Pathologist", hospital: "Prayag Path Labs", exp: 7, rating: 4.6, fee: 450, color: "#0e7490" },
  { id: 8, name: "Dr. Nikhil Dubey", specialty: "General Physician", hospital: "Jeevan Jyoti Hospital", exp: 12, rating: 4.7, fee: 500, color: "#6d28d9" },
];

const SLOTS = ["09:30 AM", "10:30 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"];

const SYMPTOMS = [
  { key: "fever", label: "Persistent fever", icon: "bi-thermometer-high", weight: 1.1 },
  { key: "fatigue", label: "Chronic fatigue", icon: "bi-battery-low", weight: 1.0 },
  { key: "weightLoss", label: "Unexplained weight loss", icon: "bi-graph-down-arrow", weight: 1.5 },
  { key: "bonePain", label: "Bone / joint pain", icon: "bi-person-standing", weight: 1.4 },
  { key: "weakness", label: "General weakness", icon: "bi-emoji-dizzy", weight: 0.8 },
  { key: "infections", label: "Frequent infections", icon: "bi-virus", weight: 1.3 },
  { key: "nightSweats", label: "Night sweats", icon: "bi-moon-stars", weight: 1.2 },
  { key: "swollenNodes", label: "Swollen lymph nodes", icon: "bi-circle-half", weight: 1.7 },
  { key: "bruising", label: "Easy bruising / bleeding", icon: "bi-droplet-half", weight: 1.6 },
  { key: "breathless", label: "Shortness of breath", icon: "bi-lungs", weight: 0.9 },
  { key: "paleSkin", label: "Pale skin", icon: "bi-person-bounding-box", weight: 0.9 },
  { key: "abdomen", label: "Abdominal swelling", icon: "bi-bullseye", weight: 1.1 },
];

const Store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem("hc_" + key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem("hc_" + key, JSON.stringify(value)); },
  users() { return this.get("users", []); },
  currentUser() { return this.get("session", null); },
  logout() { localStorage.removeItem("hc_session"); },
  predictions() { return this.get("predictions", []); },
  appointments() { return this.get("appointments", []); },
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function initials(name) {
  return name.replace("Dr. ", "").split(" ").map((p) => p[0]).slice(0, 2).join("");
}

function renderNav(active) {
  const user = Store.currentUser();
  const links = [
    { href: "index.htm", key: "home", label: "Home" },
    { href: "predict.htm", key: "predict", label: "Risk Prediction" },
    { href: "doctors.htm", key: "doctors", label: "Doctors" },
    { href: "appointments.htm", key: "appointments", label: "My Appointments" },
    { href: "admin.htm", key: "admin", label: "Admin" },
  ];
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  nav.innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-hc sticky-top py-3" aria-label="Main navigation">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2" href="index.htm">
        <span class="brand-mark"><i class="bi bi-droplet-fill" aria-hidden="true"></i></span>
        <span>United<span class="text-primary-hc">Care</span></span>
      </a>
      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu" aria-controls="navMenu" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav mx-auto gap-lg-2">
          ${links.map((l) => `<li class="nav-item"><a class="nav-link ${l.key === active ? "active" : ""}" ${l.key === active ? 'aria-current="page"' : ""} href="${l.href}">${l.label}</a></li>`).join("")}
        </ul>
        <div class="d-flex gap-2 mt-3 mt-lg-0 align-items-center">
          ${user
            ? `<span class="small fw-semibold text-muted-hc d-none d-lg-inline"><i class="bi bi-person-circle me-1" aria-hidden="true"></i>${escapeHtml(user.name.split(" ")[0])}</span>
               <button class="btn btn-outline-primary btn-sm px-3" id="logoutBtn">Log out</button>`
            : `<a href="login.htm" class="btn btn-outline-primary btn-sm px-3">Log in</a>
               <a href="login.htm#register" class="btn btn-primary btn-sm px-3">Register</a>`}
        </div>
      </div>
    </div>
  </nav>`;
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => { Store.logout(); window.location.href = "index.htm"; });
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  el.innerHTML = `
  <footer class="site-footer py-5 mt-5">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-5">
          <a class="navbar-brand d-flex align-items-center gap-2 fs-5 mb-2" href="index.htm">
            <span class="brand-mark"><i class="bi bi-droplet-fill" aria-hidden="true"></i></span>
            <span class="fw-bold">United<span class="text-primary-hc">Care</span></span>
          </a>
          <p class="text-muted-hc small mb-0">AI Based Blood Cancer Prediction &amp; Doctor Recommendation System â€” a major project by the Department of Computer Science &amp; Engineering, United College of Engineering &amp; Research, Prayagraj.</p>
        </div>
        <div class="col-6 col-lg-3">
          <h2 class="h6 fw-bold">Platform</h2>
          <ul class="list-unstyled small d-grid gap-1">
            <li><a class="text-muted-hc text-decoration-none" href="predict.htm">Risk Prediction</a></li>
            <li><a class="text-muted-hc text-decoration-none" href="doctors.htm">Find a Specialist</a></li>
            <li><a class="text-muted-hc text-decoration-none" href="appointments.htm">Appointments</a></li>
            <li><a class="text-muted-hc text-decoration-none" href="admin.htm">Admin Dashboard</a></li>
          </ul>
        </div>
        <div class="col-6 col-lg-4">
          <h2 class="h6 fw-bold">Project Team</h2>
          <ul class="list-unstyled small text-muted-hc d-grid gap-1 mb-0">
            <li>Satwik Tiwari Â· Arpita Mishra</li>
            <li>Saurabh Mishra Â· Saumya Dwivedi</li>
            <li>Supervisor: Mr. Shesh Kumar, Asst. Professor</li>
            <li>Dr. A.P.J. Abdul Kalam Technical University, Lucknow</li>
          </ul>
        </div>
      </div>
      <hr class="my-4">
      <p class="small text-muted-hc mb-0">This tool provides a preliminary risk estimate only and is not a medical diagnosis. Always consult a qualified doctor.</p>
    </div>
  </footer>`;
}

function requireLogin(redirectTo) {
  if (!Store.currentUser()) {
    window.location.href = "login.htm?next=" + encodeURIComponent(redirectTo);
    return false;
  }
  return true;
}

function showToast(message, variant = "success") {
  let holder = document.getElementById("toastHolder");
  if (!holder) {
    holder = document.createElement("div");
    holder.id = "toastHolder";
    holder.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(holder);
  }
  const t = document.createElement("div");
  t.className = `toast align-items-center text-bg-${variant} border-0`;
  t.setAttribute("role", "status");
  t.setAttribute("aria-live", "polite");
  t.innerHTML = `<div class="d-flex"><div class="toast-body fw-semibold">${escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  holder.appendChild(t);
  new bootstrap.Toast(t, { delay: 3000 }).show();
  t.addEventListener("hidden.bs.toast", () => t.remove());
}

document.addEventListener("DOMContentLoaded", () => {
  renderNav(document.body.dataset.page);
  renderFooter();
});

