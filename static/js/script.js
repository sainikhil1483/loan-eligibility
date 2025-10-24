// Wizard behavior + animations + inputs sync + AJAX predict (result shown below form)
document.addEventListener('DOMContentLoaded', function() {

  const steps = Array.from(document.querySelectorAll('.form-step'));
  const stepItems = Array.from(document.querySelectorAll('.step-item'));
  const btnNext = Array.from(document.querySelectorAll('.btn-next'));
  const btnPrev = Array.from(document.querySelectorAll('.btn-prev'));
  const btnReview = document.getElementById('btnReview');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnAgain = document.getElementById('btnAgain');

  let current = 0;
  showStep(current);

  function showStep(i) {
    steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
    stepItems.forEach((it, idx) => {
      it.classList.remove('active', 'completed');
      if (idx < i) it.classList.add('completed');
      if (idx === i) it.classList.add('active');
    });
    document.querySelector('#predict').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  btnNext.forEach(b => b.addEventListener('click', () => {
    if (validateStep(current)) {
      current = Math.min(current + 1, steps.length - 1);
      showStep(current);
    }
  }));

  btnPrev.forEach(b => b.addEventListener('click', () => {
    current = Math.max(current - 1, 0);
    showStep(current);
  }));

  btnReview.addEventListener('click', () => {
    if (!validateStep(2)) return;
    populateReview();
    current = 3;
    showStep(current);
  });

  btnSubmit.addEventListener('click', async () => {
    const data = collectData();

    if (!data.Loan_Amount_Term || data.Credit_History === '' || data.Credit_History === null || isNaN(data.Credit_History)) {
      alert('Please select loan term and credit history');
      return;
    }

    const pred = document.getElementById('predictionResult');
    const body = pred.querySelector('.card-body');
    pred.style.display = 'block';
    body.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-primary"></div>
        <div class="mt-2">Analyzing your application...</div>
      </div>`;
    pred.scrollIntoView({ behavior: 'smooth' });

    try {
      const res = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.error) {
        body.innerHTML = `<div class="text-danger">Error: ${json.error}</div>`;
        return;
      }
      renderResult(json);
    } catch (err) {
      body.innerHTML = `<div class="text-danger">Server error: ${err}</div>`;
    }
  });

  if (btnAgain) btnAgain.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    location.reload();
  });

  function validateStep(idx) {
    const step = steps[idx];
    const req = Array.from(step.querySelectorAll('[required]'));
    let ok = true;
    req.forEach(el => {
      if (!el.value || el.value.trim() === '') {
        el.classList.add('is-invalid');
        ok = false;
      } else el.classList.remove('is-invalid');
    });

    if (idx === 2) {
      const ch = document.querySelector('select[name="Credit_History"]').value;
      if (ch === '') {
        alert('Please select credit history.');
        ok = false;
      }
    }
    return ok;
  }

  function collectData() {
    const form = document.getElementById('wizardForm');
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = v;
    obj.Years_of_Experience = parseFloat(obj.Years_of_Experience || document.getElementById('expRange').value);
    obj.ApplicantIncome = parseFloat(obj.ApplicantIncome || document.getElementById('appInput').value || 0);
    obj.CoapplicantIncome = parseFloat(obj.CoapplicantIncome || 0);
    obj.LoanAmount = parseFloat(obj.LoanAmount || document.getElementById('loanInput').value || 0);
    obj.Loan_Amount_Term = parseInt(obj.Loan_Amount_Term || 0);
    obj.Interest_Rate = parseFloat(obj.Interest_Rate || document.getElementById('rateRange').value || 0);
    obj.Credit_History = obj.Credit_History === '' ? '' : parseInt(obj.Credit_History);
    return obj;
  }

  function populateReview() {
    const data = collectData();
    const format = v => '₹' + Number(v || 0).toLocaleString('en-IN');
    let html = `
      <div class="summary-row"><div>Gender</div><div><strong>${data.Gender || '-'}</strong></div></div>
      <div class="summary-row"><div>Married</div><div><strong>${data.Married || '-'}</strong></div></div>
      <div class="summary-row"><div>Dependents</div><div><strong>${data.Dependents || '-'}</strong></div></div>
      <div class="summary-row"><div>Education</div><div><strong>${data.Education || '-'}</strong></div></div>
      <div class="summary-row"><div>Employment Type</div><div><strong>${data.Employment_Type || '-'}</strong></div></div>
      <div class="summary-row"><div>Domain</div><div><strong>${data.Domain || '-'}</strong></div></div>
      <div class="summary-row"><div>Experience</div><div><strong>${(data.Years_of_Experience || 0).toFixed(1)} years</strong></div></div>
      <div class="summary-row"><div>Applicant Income</div><div><strong>${format(data.ApplicantIncome)}</strong></div></div>
      <div class="summary-row"><div>Co-applicant Income</div><div><strong>${format(data.CoapplicantIncome)}</strong></div></div>
      <div class="summary-row"><div>Loan Amount</div><div><strong>${format(data.LoanAmount)}</strong></div></div>
      <div class="summary-row"><div>Loan Term</div><div><strong>${data.Loan_Amount_Term || '-'} months</strong></div></div>
      <div class="summary-row"><div>Interest Rate</div><div><strong>${data.Interest_Rate}%</strong></div></div>
      <div class="summary-row"><div>Property Area</div><div><strong>${data.Property_Area || '-'}</strong></div></div>
      <div class="summary-row"><div>Credit History</div><div><strong>${data.Credit_History || '-'}</strong></div></div>`;
    document.getElementById('reviewSummary').innerHTML = html;
  }

  // ✅ Enhanced renderResult to show EMI & Ratio
  function renderResult(json) {
    const pred = document.getElementById('predictionResult');
    const body = pred.querySelector('.card-body');
    const approved = json.result && json.result.toLowerCase().includes('approved');

    let html = `
      <h4 class="${approved ? 'text-success' : 'text-danger'}">${json.result}</h4>
      <p class="text-muted">${json.intro || ''}</p>`;


    html += `<h6 class="mt-3">${approved ? 'Key Factors:' : 'Model Insights (Why not approved):'}</h6>`;
    json.reasons.forEach(r => html += `<div class="reason-block">${r}</div>`);

    html += `<h6 class="mt-3">${approved ? 'Next steps:' : 'How to improve:'}</h6>`;
    json.improvements.forEach(i => html += `<div class="reason-block">${i}</div>`);

    html += `<div class="text-center mt-3"><button id="predictAgain" class="btn btn-outline-primary">Predict Again</button></div>`;

    body.innerHTML = html;
    pred.style.display = 'block';
    pred.scrollIntoView({ behavior: 'smooth' });

    const again = document.getElementById('predictAgain');
    if (again) again.addEventListener('click', () => location.reload());
  }

  // Slider input sync
  const expRange = document.getElementById('expRange');
  const expValue = document.getElementById('expValue');
  if (expRange) expRange.addEventListener('input', () => expValue.textContent = parseFloat(expRange.value).toFixed(1) + ' years');

  const appRange = document.getElementById('appRange');
  const appInput = document.getElementById('appInput');
  const appDisplay = document.getElementById('appDisplay');
  if (appRange && appInput) {
    appRange.addEventListener('input', () => {
      appInput.value = appRange.value;
      appDisplay.textContent = '₹' + Number(appRange.value).toLocaleString('en-IN');
    });
    appInput.addEventListener('input', () => {
      let v = appInput.value.replace(/[^0-9]/g, '') || 0;
      appInput.value = v;
      appRange.value = v;
      appDisplay.textContent = '₹' + Number(v).toLocaleString('en-IN');
    });
  }

  const loanRange = document.getElementById('loanRange');
  const loanInput = document.getElementById('loanInput');
  const loanDisplay = document.getElementById('loanDisplay');
  if (loanRange && loanInput) {
    loanRange.addEventListener('input', () => {
      loanInput.value = loanRange.value;
      loanDisplay.textContent = '₹' + Number(loanRange.value).toLocaleString('en-IN');
    });
    loanInput.addEventListener('input', () => {
      let v = loanInput.value.replace(/[^0-9]/g, '') || 0;
      loanInput.value = v;
      loanRange.value = v;
      loanDisplay.textContent = '₹' + Number(v).toLocaleString('en-IN');
    });
  }

  const rateRange = document.getElementById('rateRange');
  const rateDisplay = document.getElementById('rateDisplay');
  if (rateRange) rateRange.addEventListener('input', () => rateDisplay.textContent = parseFloat(rateRange.value).toFixed(1) + '%');

});
