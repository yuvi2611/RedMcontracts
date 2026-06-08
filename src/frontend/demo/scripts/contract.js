const MONTH_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

const CONTRACT_SCHEMAS = {
  fixedTerm: {
    label: 'Fixed-Term Employment Agreement',
    intent: 'Fixed-term agreement',
    template: 'RedMPS Fixed-Term Employment Agreement v1',
    recommendation: 'Matched from RedMPS schedule-based fixed-term contract format, BCEA requirements, probation rules, and restraint fields.',
    compliance: 'BCEA, POPIA, fixed-term reason, probation clause, salary band',
    subtitle: 'In compliance with the Basic Conditions of Employment Act 1997',
    employmentTitle: '2. Fixed-Term Employment',
    employmentCopy: 'The Employee is employed for the fixed-term period set out in the schedule. This agreement automatically terminates on the termination date or on occurrence of the specified event recorded above.',
    required: ['contractType', 'name', 'idNumber', 'role', 'salary', 'address', 'fixedTermPeriod', 'startDate', 'endDate', 'probationPeriod', 'workHours', 'noticePeriod'],
    visibleScopes: ['fixed-term'],
    defaults: {
      contractType: 'Fixed-Term Employment Agreement',
      fixedTermPeriod: '1 (One) Year',
      startDate: '1 January 2026',
      endDate: '31 December 2026',
      noticePeriod: '30 (Thirty) Days'
    }
  },
  permanent: {
    label: 'Permanent Employment Contract',
    intent: 'Permanent contract',
    template: 'RedMPS Permanent Employment Contract',
    recommendation: 'Matched from permanent employment rules. Termination and fixed-term duration fields are intentionally removed from this workflow.',
    compliance: 'BCEA, POPIA, probation clause, salary band, ongoing employment terms',
    subtitle: 'Permanent / Full-Time Employment',
    employmentTitle: '2. Permanent Employment',
    employmentCopy: 'The Employee is appointed on an indefinite basis from the commencement date, subject to the terms, policies, probation rules, and notice provisions recorded in this agreement.',
    required: ['contractType', 'name', 'idNumber', 'role', 'salary', 'address', 'startDate', 'probationPeriod', 'workHours', 'noticePeriod'],
    visibleScopes: [],
    defaults: {
      contractType: 'Permanent Employment Contract',
      fixedTermPeriod: '',
      startDate: '1 January 2026',
      endDate: '',
      noticePeriod: '30 (Thirty) Days'
    }
  }
};

function getContractKey() {
  const value = document.getElementById('contractType')?.value || '';
  if (value === 'Permanent Employment Contract') return 'permanent';
  return 'fixedTerm';
}

function getSchema() {
  return CONTRACT_SCHEMAS[getContractKey()];
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function getContractData() {
  return {
    contractType: document.getElementById('contractType')?.value.trim() || '',
    firstName: document.getElementById('firstName')?.value.trim() || '',
    lastName: document.getElementById('lastName')?.value.trim() || '',
    idNumber: document.getElementById('idNumber')?.value.trim() || '',
    role: document.getElementById('role')?.value.trim() || '',
    salary: parseFloat(document.getElementById('salary')?.value) || 0,
    address: document.getElementById('address')?.value.trim() || '',
    fixedTermPeriod: document.getElementById('fixedTermPeriod')?.value.trim() || '',
    startDate: document.getElementById('startDate')?.value.trim() || '',
    endDate: document.getElementById('endDate')?.value.trim() || '',
    probationPeriod: document.getElementById('probationPeriod')?.value.trim() || '',
    workHours: document.getElementById('workHours')?.value.trim() || '',
    noticePeriod: document.getElementById('noticePeriod')?.value.trim() || '',
    duties: document.getElementById('duties')?.value.trim() || '',
    arbitrationCity: document.getElementById('arbitrationCity')?.value.trim() || '',
    restraintArea: document.getElementById('restraintArea')?.value.trim() || '',
    restraintPeriod: document.getElementById('restraintPeriod')?.value.trim() || ''
  };
}

function formatCurrency(amount) {
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
  return 'R' + formatted;
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

function updateContractTypeUI() {
  const schema = getSchema();
  const showScope = scope => !scope || schema.visibleScopes.includes(scope);

  document.querySelectorAll('[data-contract-scope]').forEach(el => {
    const hidden = !showScope(el.dataset.contractScope);
    el.classList.toggle('is-hidden', hidden);
    el.querySelectorAll('input, select, textarea').forEach(control => {
      if (control.dataset.originalRequired === undefined) {
        control.dataset.originalRequired = control.required ? 'true' : 'false';
      }
      control.disabled = hidden;
      control.required = hidden ? false : control.dataset.originalRequired === 'true';
    });
  });

  const textMap = {
    journeyIntentLabel: schema.intent,
    recommendationTitle: schema.label,
    recommendationText: schema.recommendation,
    templateMatchText: schema.template,
    complianceCheckText: schema.compliance
  };

  Object.entries(textMap).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function applyContractDefaults() {
  const schema = getSchema();
  Object.entries(schema.defaults).forEach(([id, value]) => {
    if (id !== 'contractType') setInputValue(id, value);
  });
  updateContractTypeUI();
  updateFormProgress();
}

function visibleChecklistItems() {
  return Array.from(document.querySelectorAll('.field-check-item')).filter(item => !item.classList.contains('is-hidden'));
}

function updateFormProgress() {
  updateContractTypeUI();
  const data = getContractData();
  let complete = 0;
  visibleChecklistItems().forEach(item => {
    const field = item.dataset.field;
    const icon = item.querySelector('.field-check-icon');
    const filled = isFieldComplete(field, data);
    if (filled) {
      complete++;
      item.classList.add('done');
      if (icon) icon.textContent = 'ok';
    } else {
      item.classList.remove('done');
      if (icon) icon.textContent = 'o';
    }
  });

  const total = visibleChecklistItems().length || 1;
  const pct = Math.round((complete / total) * 100);
  const fill = document.getElementById('formProgressFill');
  if (fill) fill.style.width = pct + '%';
  const label = document.getElementById('formProgressLabel');
  if (label) label.textContent = complete + ' of ' + total + ' complete';
  const pctEl = document.getElementById('formProgressPct');
  if (pctEl) pctEl.textContent = pct + '%';
  const score = document.getElementById('readinessScore');
  if (score) score.textContent = pct + '%';
}

function validateContractForm() {
  const data = getContractData();
  const missing = [];
  const labels = {
    contractType: 'Document Type',
    name: 'Name & Surname',
    idNumber: 'ID Number',
    role: 'Role',
    salary: 'Salary',
    address: 'Address',
    fixedTermPeriod: 'Fixed-Term Period',
    startDate: 'Commencement Date',
    endDate: 'Termination Date',
    probationPeriod: 'Probation Period',
    workHours: 'Hours of Work',
    noticePeriod: 'Notice Period'
  };

  getSchema().required.forEach(field => {
    if (!isFieldComplete(field, data)) missing.push(labels[field] || field);
  });

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

function updatePreviewForSchema(schema) {
  document.querySelectorAll('[data-preview-scope]').forEach(el => {
    el.classList.toggle('is-hidden', !schema.visibleScopes.includes(el.dataset.previewScope));
  });

  const map = {
    'doc-contract-title': schema.label,
    'doc-contract-subtitle': schema.subtitle,
    'doc-employment-section-title': schema.employmentTitle,
    'doc-employment-section-copy': schema.employmentCopy
  };

  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function generateContractPreview() {
  updateContractTypeUI();
  if (!validateContractForm()) return;

  const schema = getSchema();
  const data = getContractData();
  const fullName = data.firstName + ' ' + data.lastName;
  const ref = 'RMP-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100);

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('doc-employee-name', fullName);
  set('doc-id-number', data.idNumber);
  set('doc-address', data.address);
  set('doc-role', data.role);
  set('doc-salary-monthly', formatCurrency(data.salary));
  set('doc-fixed-term', data.fixedTermPeriod);
  set('doc-start-date', data.startDate);
  set('doc-end-date', data.endDate);
  set('doc-probation', formatProbation(data.probationPeriod));
  set('doc-work-hours', data.workHours);
  set('doc-notice', data.noticePeriod);
  set('doc-duties', data.duties || 'As per job description');
  set('doc-arbitration-city', data.arbitrationCity || 'Gauteng');
  set('doc-restraint-area', data.restraintArea || 'Gauteng');
  set('doc-restraint-period', data.restraintPeriod || '12 (Twelve) Months');
  set('doc-sig-employee-name', fullName);
  set('preview-subtitle', fullName + ' - ' + schema.label + ' - REF: ' + ref);
  updatePreviewForSchema(schema);

  routeTo('preview');
}

function bindContractForm() {
  document.querySelectorAll('.contract-field').forEach(input => {
    input.removeEventListener('input', updateFormProgress);
    input.addEventListener('input', updateFormProgress);
    input.removeEventListener('change', updateFormProgress);
    input.addEventListener('change', updateFormProgress);
  });

  const contractType = document.getElementById('contractType');
  if (contractType) {
    contractType.removeEventListener('change', applyContractDefaults);
    contractType.addEventListener('change', applyContractDefaults);
  }

  updateContractTypeUI();
  updateFormProgress();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#page-wizard')) bindContractForm();
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(bindContractForm, 500);
});
