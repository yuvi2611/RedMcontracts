const MONTH_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

function getContractData() {
  return {
    firstName: document.getElementById('firstName')?.value.trim() || '',
    lastName: document.getElementById('lastName')?.value.trim() || '',
    idNumber: document.getElementById('idNumber')?.value.trim() || '',
    role: document.getElementById('role')?.value.trim() || '',
    salary: parseFloat(document.getElementById('salary')?.value) || 0,
    address: document.getElementById('address')?.value.trim() || '',
    probationPeriod: document.getElementById('probationPeriod')?.value.trim() || '',
    noticePeriod: document.getElementById('noticePeriod')?.value.trim() || ''
  };
}

function formatCurrency(amount) {
  return 'R ' + amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatProbation(months) {
  const num = parseInt(months, 10);
  if (isNaN(num)) return months;
  const word = MONTH_WORDS[num] || String(num);
  return num + ' (' + word + ') month' + (num !== 1 ? 's' : '');
}

function isFieldComplete(field, data) {
  if (field === 'name') return !!(data.firstName && data.lastName);
  if (field === 'salary') return data.salary > 0;
  if (field === 'probationPeriod') return data.probationPeriod !== '';
  return !!data[field];
}

function updateFormProgress() {
  const data = getContractData();
  let complete = 0;
  document.querySelectorAll('.field-check-item').forEach(item => {
    const field = item.dataset.field;
    const icon = item.querySelector('.field-check-icon');
    const filled = isFieldComplete(field, data);
    if (filled) {
      complete++;
      item.classList.add('done');
      if (icon) icon.textContent = '✓';
    } else {
      item.classList.remove('done');
      if (icon) icon.textContent = '○';
    }
  });
  const pct = Math.round((complete / 7) * 100);
  const fill = document.getElementById('formProgressFill');
  if (fill) fill.style.width = pct + '%';
  const label = document.getElementById('formProgressLabel');
  if (label) label.textContent = complete + ' of 7 complete';
  const pctEl = document.getElementById('formProgressPct');
  if (pctEl) pctEl.textContent = pct + '%';
}

function validateContractForm() {
  const data = getContractData();
  const missing = [];
  if (!data.firstName || !data.lastName) missing.push('Name & Surname');
  if (!data.idNumber) missing.push('ID Number');
  if (!data.role) missing.push('Role');
  if (!data.salary || data.salary <= 0) missing.push('Salary');
  if (!data.address) missing.push('Address');
  if (!data.probationPeriod && data.probationPeriod !== '0') missing.push('Probation Period');
  if (!data.noticePeriod) missing.push('Notice Period');

  const msg = document.getElementById('formValidationMsg');
  const text = document.getElementById('formValidationText');
  if (missing.length) {
    if (msg) msg.style.display = 'flex';
    if (text) text.textContent = 'Please complete: ' + missing.join(', ') + '.';
    return false;
  }
  if (msg) msg.style.display = 'none';
  return true;
}

function generateContractPreview() {
  if (!validateContractForm()) return;
  const data = getContractData();
  const fullName = data.firstName + ' ' + data.lastName;
  const annual = data.salary * 12;
  const ref = 'RMP-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100);

  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set('doc-employee-name', fullName);
  set('doc-id-number', data.idNumber);
  set('doc-address', data.address);
  set('doc-role', data.role);
  set('doc-salary-monthly', formatCurrency(data.salary));
  set('doc-salary-annual', formatCurrency(annual));
  set('doc-probation', formatProbation(data.probationPeriod));
  set('doc-notice', data.noticePeriod);
  set('doc-sig-employee-name', fullName);
  set('preview-subtitle', fullName + ' · Permanent Employment Contract · REF: ' + ref);

  showPage('preview');
}

function bindContractForm() {
  document.querySelectorAll('.contract-field').forEach(input => {
    input.removeEventListener('input', updateFormProgress);
    input.addEventListener('input', updateFormProgress);
    input.removeEventListener('change', updateFormProgress);
    input.addEventListener('change', updateFormProgress);
  });
  updateFormProgress();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#page-wizard')) bindContractForm();
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(bindContractForm, 500);
});
