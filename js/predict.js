/* Client-side simulation of the ML prediction engine.
   In production, POST the payload to the Spring Boot API (e.g. /api/predict),
   which calls the trained scikit-learn models. */

const grid = document.getElementById("symptomGrid");
grid.innerHTML = SYMPTOMS.map((s) => `
  <div class="col-sm-6 col-md-4 symptom-check">
    <input type="checkbox" id="sym-${s.key}" name="symptoms" value="${s.key}">
    <label for="sym-${s.key}"><i class="bi ${s.icon}" aria-hidden="true"></i>${s.label}</label>
  </div>`).join("");

const form = document.getElementById("predictForm");
const symCount = document.getElementById("symCount");
const user = Store.currentUser();
if (user) {
  document.getElementById("age").value = user.age || "";
  document.getElementById("gender").value = user.gender || "";
}

form.addEventListener("change", () => {
  const n = form.querySelectorAll('input[name="symptoms"]:checked').length;
  symCount.textContent = `${n} selected`;
});
form.addEventListener("reset", () => {
  setTimeout(() => { symCount.textContent = "0 selected"; form.classList.remove("was-validated"); }, 0);
});

function preprocess() {
  const num = (id) => {
    const v = document.getElementById(id).value;
    return v === "" ? null : Number(v);
  };
  const selected = [...form.querySelectorAll('input[name="symptoms"]:checked')].map((i) => i.value);
  return {
    age: num("age"),
    gender: document.getElementById("gender").value,
    duration: Number(document.getElementById("duration").value),
    smoking: Number(document.getElementById("smoking").value),
    familyHistory: document.getElementById("familyHistory").checked,
    exposure: document.getElementById("exposure").checked,
    symptoms: selected,
    hb: num("hb"),
    wbc: num("wbc"),
    platelets: num("platelets"),
  };
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const clamp = (v) => Math.max(0.02, Math.min(0.98, v));

function predict(d) {
  const symScore = d.symptoms.reduce((acc, k) => acc + SYMPTOMS.find((s) => s.key === k).weight, 0);
  let riskFactors = 0;
  if (d.age >= 60) riskFactors += 0.9; else if (d.age >= 45) riskFactors += 0.4; else if (d.age <= 15) riskFactors += 0.5;
  if (d.familyHistory) riskFactors += 1.1;
  if (d.exposure) riskFactors += 0.9;
  riskFactors += d.smoking * 0.25;
  riskFactors += d.duration * 0.45;

  let lab = 0;
  const hbLow = d.gender === "Female" ? 12 : 13;
  if (d.hb !== null && d.hb < hbLow) lab += d.hb < hbLow - 3 ? 1.4 : 0.7;
  if (d.wbc !== null && (d.wbc > 11 || d.wbc < 4)) lab += d.wbc > 30 || d.wbc < 2 ? 2 : 1.1;
  if (d.platelets !== null && d.platelets < 150) lab += d.platelets < 80 ? 1.5 : 0.8;

  const total = symScore + riskFactors + lab;
  const lr = sigmoid(-4.2 + 0.62 * total);
  const nb = clamp(sigmoid(-3.6 + 0.55 * symScore + 0.5 * riskFactors + 0.7 * lab));
  const severeCount = d.symptoms.filter((k) => ["swollenNodes", "bruising", "weightLoss", "bonePain"].includes(k)).length;
  const rf = clamp(sigmoid(-4 + 0.5 * total + 0.45 * severeCount));
  const ensemble = 0.25 * nb + 0.3 * lr + 0.45 * rf;

  const pct = Math.round(ensemble * 100);
  const level = pct >= 65 ? "High" : pct >= 35 ? "Medium" : "Low";
  return {
    pct,
    level,
    models: [
      { name: "Naive Bayes", pct: Math.round(nb * 100) },
      { name: "Logistic Regression", pct: Math.round(lr * 100) },
      { name: "Random Forest", pct: Math.round(rf * 100) },
    ],
  };
}

const RECOMMENDATION = {
  High: {
    specialties: ["Oncologist", "Hematologist"],
    advice: "Your inputs show multiple strong indicators. Please consult an Oncologist or Hematologist as soon as possible for a bone marrow / CBC evaluation.",
  },
  Medium: {
    specialties: ["Hematologist", "Pathologist"],
    advice: "Some indicators are present. We recommend a Hematologist consultation and a complete blood count test with a Pathologist.",
  },
  Low: {
    specialties: ["General Physician"],
    advice: "Your risk appears low. If symptoms persist, a routine check-up with a General Physician is advised.",
  },
};

function renderResult(d, result) {
  const rec = RECOMMENDATION[result.level];
  const docs = DOCTORS.filter((doc) => rec.specialties.includes(doc.specialty)).sort((a, b) => b.rating - a.rating).slice(0, 2);
  const cls = "risk-" + result.level.toLowerCase();
  document.getElementById("resultContent").innerHTML = `
    <div class="${cls}">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h6 fw-bold mb-0">Prediction result</h2>
        <span class="risk-pill small">${result.level} Risk</span>
      </div>
      <div class="risk-gauge mb-3" style="--pct:${result.pct}" role="img" aria-label="Estimated probability ${result.pct} percent">
        <div class="risk-gauge-inner">
          <div><div class="display-6 fw-bold mb-0">${result.pct}%</div><div class="small text-muted-hc">probability</div></div>
        </div>
      </div>
      <div class="d-grid gap-2 mb-4">
        ${result.models.map((m) => `
          <div>
            <div class="d-flex justify-content-between small fw-semibold"><span>${m.name}</span><span>${m.pct}%</span></div>
            <div class="progress" role="progressbar" aria-label="${m.name}" aria-valuenow="${m.pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${m.pct}%; background: var(--risk)"></div></div>
          </div>`).join("")}
      </div>
      <p class="small mb-3">${rec.advice}</p>
      <h3 class="h6 fw-bold">Recommended specialists</h3>
      <div class="d-grid gap-2 mb-3">
        ${docs.map((doc) => `
          <a href="doctors.htm?book=${doc.id}" class="d-flex align-items-center gap-3 p-2 border rounded-3 text-decoration-none text-reset">
            <span class="avatar" style="width:44px;height:44px;background:${doc.color}">${initials(doc.name)}</span>
            <span class="flex-grow-1">
              <span class="d-block fw-bold small">${doc.name}</span>
              <span class="d-block small text-muted-hc">${doc.specialty} Â· <i class="bi bi-star-fill text-warning" aria-hidden="true"></i> ${doc.rating}</span>
            </span>
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </a>`).join("")}
      </div>
      <a href="doctors.htm?specialty=${encodeURIComponent(rec.specialties[0])}" class="btn btn-primary w-100">Book an appointment</a>
      <p class="small text-muted-hc mt-3 mb-0">Symptoms considered: ${d.symptoms.length}. ${user ? "Saved to your records." : '<a href="login.htm?next=predict.htm">Log in</a> to save results.'}</p>
    </div>`;
}

const STEPS = ["Cleaning & handling missing values", "Encoding categorical fields", "Scaling features", "Running Naive Bayes, LR & Random Forest", "Combining ensemble output"];

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("formError");
  errorEl.classList.add("d-none");
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;
  const data = preprocess();
  if (data.symptoms.length === 0 && data.hb === null && data.wbc === null && data.platelets === null) {
    errorEl.textContent = "Select at least one symptom or enter a blood report value.";
    errorEl.classList.remove("d-none");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  document.getElementById("resultEmpty").classList.add("d-none");
  document.getElementById("resultContent").classList.add("d-none");
  const loading = document.getElementById("resultLoading");
  const list = document.getElementById("loadingSteps");
  loading.classList.remove("d-none");
  list.innerHTML = "";
  if (window.innerWidth < 992) document.getElementById("resultPanel").scrollIntoView({ behavior: "smooth" });

  STEPS.forEach((step, i) => {
    setTimeout(() => {
      list.insertAdjacentHTML("beforeend", `<li class="d-flex gap-2 align-items-center"><i class="bi bi-check-circle-fill text-success" aria-hidden="true"></i>${step}</li>`);
    }, i * 280);
  });

  setTimeout(() => {
    const result = predict(data);
    renderResult(data, result);
    loading.classList.add("d-none");
    document.getElementById("resultContent").classList.remove("d-none");
    btn.disabled = false;

    const record = {
      id: Date.now(),
      patient: user ? user.name : "Guest",
      email: user ? user.email : null,
      age: data.age,
      gender: data.gender,
      symptoms: data.symptoms.length,
      pct: result.pct,
      level: result.level,
      date: new Date().toISOString(),
    };
    const all = Store.predictions();
    all.unshift(record);
    Store.set("predictions", all.slice(0, 200));
  }, STEPS.length * 280 + 300);
});

