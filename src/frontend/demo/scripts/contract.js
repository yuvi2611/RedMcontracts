const MONTH_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CONTRACT_DRAFT_KEY = 'contractiq.contractDraft.v3';
let activeDatePickerField = null;
let activeDatePickerMonth = null;

const CONTRACT_SCHEMAS = {
  fixedTerm: {
    label: 'Fixed-Term Employment Agreement',
    intent: 'Fixed-term agreement',
    template: 'RedMPS Fixed-Term Employment Agreement v1',
    recommendation: 'Matched from RedMPS schedule-based fixed-term contract format, BCEA requirements, probation rules, and restraint fields.',
    compliance: 'BCEA, POPIA, fixed-term reason, probation clause, salary band',
    subtitle: '(In compliance with Basic Conditions of Employment Act 1997)',
    employmentTitle: '2. Fixed-Term Employment',
    employmentCopy: 'The Employee is employed for the fixed-term period set out in the schedule. This agreement automatically terminates on the termination date or on occurrence of the specified event recorded above.',
    required: ['contractType', 'name', 'idNumber', 'role', 'salary', 'address', 'fixedTermPeriod', 'startDate', 'endDate', 'probationPeriod', 'workHours', 'noticePeriod'],
    visibleScopes: ['fixed-term']
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
    visibleScopes: []
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
    idType: document.getElementById('idType')?.value.trim() || 'south-african-id',
    idNumber: document.getElementById('idNumber')?.value.trim() || '',
    role: document.getElementById('role')?.value.trim() || '',
    salary: parseFloat(document.getElementById('salary')?.value) || 0,
    address: document.getElementById('address')?.value.trim() || '',
    phoneNumber: document.getElementById('phoneNumber')?.value.trim() || '',
    emailAddress: document.getElementById('emailAddress')?.value.trim() || '',
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
  return 'R' + formatted + ' (' + numberToTitleWords(amount) + ' Rand)';
}

function numberToTitleWords(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const chunk = value => {
    const parts = [];
    if (value >= 100) {
      parts.push(ones[Math.floor(value / 100)] + ' Hundred');
      value %= 100;
    }
    if (value >= 20) {
      const ten = tens[Math.floor(value / 10)];
      const one = value % 10;
      parts.push(one ? ten + '-' + ones[one] : ten);
    } else if (value > 0) {
      parts.push(ones[value]);
    }
    return parts.join(' ');
  };
  const groups = [
    { value: 1000000, label: 'Million' },
    { value: 1000, label: 'Thousand' }
  ];
  let remaining = n;
  const words = [];
  groups.forEach(group => {
    if (remaining >= group.value) {
      words.push(chunk(Math.floor(remaining / group.value)) + ' ' + group.label);
      remaining %= group.value;
    }
  });
  if (remaining) words.push(chunk(remaining));
  return words.join(' ');
}

function formatProbation(months) {
  const num = parseInt(months, 10);
  if (isNaN(num)) return months;
  const word = (MONTH_WORDS[num] || String(num)).replace(/^\w/, char => char.toUpperCase());
  return num + ' (' + word + ') Month' + (num !== 1 ? 's' : '');
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function formatDisplayDate(value) {
  const date = parseIsoDate(value);
  if (!date) return value || '';
  return date.getDate() + ' ' + MONTH_NAMES[date.getMonth()] + ' ' + date.getFullYear();
}

function dateCompare(a, b) {
  const first = parseIsoDate(a);
  const second = parseIsoDate(b);
  if (!first || !second) return null;
  return first.getTime() - second.getTime();
}

function isFieldComplete(field, data) {
  const errors = validateContractData(data);
  if (field === 'name') return !!(data.firstName && data.lastName) && !errors.firstName && !errors.lastName;
  if (field === 'salary') return data.salary > 0 && !errors.salary;
  if (field === 'probationPeriod') return data.probationPeriod !== '' && !errors.probationPeriod;
  if (field === 'idNumber') return validateIdentity(data).valid;
  return !!data[field] && !errors[field];
}

function isRequiredPresent(field, data) {
  if (field === 'name') return !!(data.firstName && data.lastName);
  if (field === 'salary') return data.salary > 0;
  if (field === 'probationPeriod') return data.probationPeriod !== '';
  return !!data[field];
}

function isReasonableText(value, minLength = 2) {
  return (value || '').trim().length >= minLength;
}

function isValidPersonName(value) {
  return /^[A-Za-z][A-Za-z\s'.-]{1,59}$/.test(value || '');
}

function normalizePhone(value) {
  return (value || '').replace(/[\s().-]/g, '');
}

function isValidPhone(value) {
  if (!value) return true;
  const normalized = normalizePhone(value);
  return /^0[1-9]\d{8}$/.test(normalized)
    || /^\+27[1-9]\d{8}$/.test(normalized)
    || /^27[1-9]\d{8}$/.test(normalized);
}

function isValidEmailList(value) {
  if (!value) return true;
  return value
    .split(/[;,/]+/)
    .map(email => email.trim())
    .filter(Boolean)
    .every(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function isValidSouthAfricanId(value) {
  if (!/^\d{13}$/.test(value)) return false;

  const year = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  const currentYear = new Date().getFullYear() % 100;
  const century = year <= currentYear ? 2000 : 1900;
  const date = new Date(century + year, month - 1, day);
  if (date.getFullYear() !== century + year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;

  let sum = 0;
  for (let i = 0; i < value.length; i++) {
    let digit = Number(value[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function isValidPassport(value) {
  return /^[A-Z0-9]{6,20}$/i.test((value || '').replace(/\s/g, ''));
}

function identityLabel(data = getContractData()) {
  return data.idType === 'passport' ? 'Passport Number' : 'Identity Number';
}

function validateIdentity(data) {
  if (!data.idNumber) {
    return { valid: false, message: identityLabel(data) + ' is required.' };
  }
  if (data.idType === 'passport') {
    return isValidPassport(data.idNumber)
      ? { valid: true, message: '' }
      : { valid: false, message: 'Passport number must be 6 to 20 letters/numbers.' };
  }
  return isValidSouthAfricanId(data.idNumber)
    ? { valid: true, message: '' }
    : { valid: false, message: 'South African ID must be a valid 13-digit number.' };
}

function validateContractData(data = getContractData()) {
  const errors = {};
  const schema = getSchema();
  const labels = {
    contractType: 'Document type',
    name: 'Name and surname',
    idNumber: identityLabel(data),
    role: 'Role',
    salary: 'Salary',
    address: 'Address',
    fixedTermPeriod: 'Fixed-term period',
    startDate: 'Commencement date',
    endDate: 'Termination date',
    probationPeriod: 'Probation period',
    workHours: 'Hours of work',
    noticePeriod: 'Notice period'
  };

  schema.required.forEach(field => {
    if (!isRequiredPresent(field, data)) errors[field] = (labels[field] || field) + ' is required.';
  });

  if (data.firstName && !isValidPersonName(data.firstName)) {
    errors.firstName = 'Name must use letters and may include spaces, apostrophes, hyphens, or full stops.';
  }
  if (data.lastName && !isValidPersonName(data.lastName)) {
    errors.lastName = 'Surname must use letters and may include spaces, apostrophes, hyphens, or full stops.';
  }
  const identity = validateIdentity(data);
  if (!identity.valid) errors.idNumber = identity.message;
  if (data.role && !isReasonableText(data.role, 3)) {
    errors.role = 'Role must be at least 3 characters.';
  }
  if (data.address && !isReasonableText(data.address, 5)) {
    errors.address = 'Address must be at least 5 characters.';
  }
  if (data.salary <= 0) {
    errors.salary = 'Monthly salary must be greater than 0.';
  }
  if (data.salary > 1000000) {
    errors.salary = 'Monthly salary looks too high. Please confirm the amount.';
  }
  if (data.fixedTermPeriod && !isReasonableText(data.fixedTermPeriod, 3)) {
    errors.fixedTermPeriod = 'Fixed-term period must be descriptive, e.g. 1 (One) Year.';
  }
  if (data.startDate && !parseIsoDate(data.startDate)) {
    errors.startDate = 'Select a valid commencement date.';
  }
  if (data.endDate && !parseIsoDate(data.endDate)) {
    errors.endDate = 'Select a valid termination date.';
  }
  if (data.startDate && data.endDate && dateCompare(data.endDate, data.startDate) < 0) {
    errors.endDate = 'Termination date cannot be before commencement date.';
  }
  if (data.probationPeriod !== '') {
    const probation = Number(data.probationPeriod);
    if (!Number.isInteger(probation) || probation < 0 || probation > 12) {
      errors.probationPeriod = 'Probation period must be a whole number from 0 to 12.';
    }
  }
  if (data.workHours && !/\d{1,2}[:h]\d{2}|\d{1,2}\s*(am|pm)/i.test(data.workHours)) {
    errors.workHours = 'Hours of work should include a time range, e.g. 08:00 - 17:00.';
  }
  if (data.noticePeriod && !/\d+/.test(data.noticePeriod)) {
    errors.noticePeriod = 'Notice period should include a duration, e.g. 30 (Thirty) Days.';
  }
  if (data.phoneNumber && !isValidPhone(data.phoneNumber)) {
    errors.phoneNumber = 'Phone number must be a valid SA number, e.g. 073 331 7587 or +27 73 331 7587.';
  }
  if (data.emailAddress && !isValidEmailList(data.emailAddress)) {
    errors.emailAddress = 'Use valid email addresses separated by /, comma, or semicolon.';
  }

  return errors;
}

function setFieldError(id, message) {
  const input = document.getElementById(id);
  const dateTrigger = document.querySelector('[data-date-target="' + id + '"]');
  const error = document.getElementById(id + 'Error');
  if (input) {
    input.classList.toggle('is-invalid', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  if (dateTrigger) {
    dateTrigger.classList.toggle('is-invalid', !!message);
    dateTrigger.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  if (error) {
    error.textContent = message || '';
    error.classList.toggle('visible', !!message);
  }
}

function showFieldErrors(errors, options = {}) {
  const showRequired = options.showRequired === true;
  [
    'firstName',
    'lastName',
    'idType',
    'idNumber',
    'address',
    'role',
    'salary',
    'fixedTermPeriod',
    'startDate',
    'endDate',
    'probationPeriod',
    'workHours',
    'noticePeriod',
    'phoneNumber',
    'emailAddress'
  ].forEach(id => {
    const message = errors[id] || '';
    setFieldError(id, !showRequired && message.endsWith(' is required.') ? '' : message);
  });
}

function updateIdentityTypeUI(data = getContractData()) {
  const label = document.getElementById('idNumberLabel');
  const input = document.getElementById('idNumber');
  if (label) label.innerHTML = identityLabel(data).replace('Identity', 'ID') + ' <span class="required">*</span>';
  if (input) {
    input.placeholder = data.idType === 'passport' ? 'Passport number' : '13-digit ID number';
    input.inputMode = data.idType === 'passport' ? 'text' : 'numeric';
  }
}

function updateDateDisplays() {
  ['startDate', 'endDate'].forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Display');
    const trigger = document.querySelector('[data-date-target="' + id + '"]');
    if (!input || !display) return;
    const formatted = formatDisplayDate(input.value);
    display.textContent = formatted || (id === 'startDate' ? 'Select commencement date' : 'Select termination date');
    trigger?.classList.toggle('has-value', !!formatted);
  });
}

function getDatePickerPopover() {
  let popover = document.getElementById('contractDatePicker');
  if (popover) return popover;
  popover = document.createElement('div');
  popover.id = 'contractDatePicker';
  popover.className = 'date-picker-popover hidden';
  document.body.appendChild(popover);
  return popover;
}

function openDatePicker(fieldId) {
  const input = document.getElementById(fieldId);
  const trigger = document.querySelector('[data-date-target="' + fieldId + '"]');
  if (!input || !trigger) return;
  activeDatePickerField = fieldId;
  const selected = parseIsoDate(input.value);
  activeDatePickerMonth = selected || new Date();
  activeDatePickerMonth = new Date(activeDatePickerMonth.getFullYear(), activeDatePickerMonth.getMonth(), 1);
  renderDatePicker();

  const popover = getDatePickerPopover();
  const rect = trigger.getBoundingClientRect();
  popover.style.left = Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - 336) + 'px';
  popover.style.top = rect.bottom + window.scrollY + 8 + 'px';
  popover.classList.remove('hidden');
}

function closeDatePicker() {
  getDatePickerPopover().classList.add('hidden');
  activeDatePickerField = null;
}

function shiftDatePickerMonth(delta) {
  if (!activeDatePickerMonth) return;
  activeDatePickerMonth = new Date(activeDatePickerMonth.getFullYear(), activeDatePickerMonth.getMonth() + delta, 1);
  renderDatePicker();
}

function isDateDisabledForField(fieldId, iso) {
  if (fieldId !== 'endDate') return false;
  const start = document.getElementById('startDate')?.value || '';
  const comparison = dateCompare(iso, start);
  return comparison !== null && comparison < 0;
}

function renderDatePicker() {
  const popover = getDatePickerPopover();
  if (!activeDatePickerField || !activeDatePickerMonth) return;
  const selectedValue = document.getElementById(activeDatePickerField)?.value || '';
  const year = activeDatePickerMonth.getFullYear();
  const month = activeDatePickerMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const blanks = Array.from({ length: firstDay }, () => '<span class="date-cell blank"></span>').join('');
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const iso = toIsoDate(new Date(year, month, day));
    const selected = iso === selectedValue;
    const disabled = isDateDisabledForField(activeDatePickerField, iso);
    return '<button type="button" class="date-cell' + (selected ? ' selected' : '') + (disabled ? ' disabled' : '') + '" data-date-value="' + iso + '"' + (disabled ? ' disabled' : '') + '>' + day + '</button>';
  }).join('');

  popover.innerHTML = ''
    + '<div class="date-picker-head">'
    + '<button type="button" class="date-nav" data-date-nav="-1" aria-label="Previous month">&lt;</button>'
    + '<strong>' + MONTH_NAMES[month] + ' ' + year + '</strong>'
    + '<button type="button" class="date-nav" data-date-nav="1" aria-label="Next month">&gt;</button>'
    + '</div>'
    + '<div class="date-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>'
    + '<div class="date-grid">' + blanks + days + '</div>';
}

function selectDateValue(value) {
  if (!activeDatePickerField || isDateDisabledForField(activeDatePickerField, value)) return;
  const input = document.getElementById(activeDatePickerField);
  if (!input) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  updateDateDisplays();
  closeDatePicker();
  updateFormProgress();
  saveContractDraft({ quiet: true });
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
  updateContractTypeUI();
  updateFormProgress();
  saveContractDraft({ quiet: true });
}

function visibleChecklistItems() {
  return Array.from(document.querySelectorAll('.field-check-item')).filter(item => !item.classList.contains('is-hidden'));
}

function updateFormProgress() {
  updateContractTypeUI();
  const data = getContractData();
  updateIdentityTypeUI(data);
  updateDateDisplays();
  const errors = validateContractData(data);
  showFieldErrors(errors);
  let complete = 0;
  visibleChecklistItems().forEach(item => {
    const field = item.dataset.field;
    const icon = item.querySelector('.field-check-icon');
    const filled = isFieldComplete(field, data);
    if (filled) {
      complete++;
      item.classList.add('done');
      if (icon) icon.textContent = '✓';
    } else {
      item.classList.remove('done');
      if (icon) icon.textContent = '';
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
  updateJourneySteps(data);
  updateGenerateButton(pct === 100 && Object.keys(errors).length === 0);
}

function setStepState(step, complete, active, label) {
  const el = document.querySelector('[data-step="' + step + '"]');
  if (!el) return;
  el.classList.toggle('done', complete);
  el.classList.toggle('active', active && !complete);
  const marker = el.querySelector('span');
  if (marker && !marker.dataset.stepNumber) marker.dataset.stepNumber = marker.textContent;
  if (marker) marker.textContent = complete ? '✓' : marker.dataset.stepNumber;
  const small = el.querySelector('small');
  if (small && label) small.textContent = label;
}

function updateJourneySteps(data) {
  const schema = getSchema();
  const intentDone = isFieldComplete('contractType', data);
  const employeeDone = ['name', 'idNumber', 'address'].every(field => isFieldComplete(field, data));
  const termsDone = schema.required
    .filter(field => ['role', 'salary', 'fixedTermPeriod', 'startDate', 'endDate', 'probationPeriod', 'workHours', 'noticePeriod'].includes(field))
    .every(field => isFieldComplete(field, data));
  const complianceDone = !!(data.duties && data.arbitrationCity && data.restraintArea && data.restraintPeriod);
  const readyDone = schema.required.every(field => isFieldComplete(field, data));

  setStepState('intent', intentDone, !intentDone, intentDone ? schema.intent : 'Select contract type');
  setStepState('employee', employeeDone, intentDone && !employeeDone, employeeDone ? 'Required details complete' : 'Required details pending');
  setStepState('terms', termsDone, employeeDone && !termsDone, termsDone ? 'Employment terms complete' : 'Employment terms pending');
  setStepState('compliance', complianceDone, termsDone && !complianceDone, complianceDone ? 'Schedule details complete' : 'Schedule details optional');
  setStepState('approval', readyDone, readyDone, readyDone ? 'Ready to generate preview' : 'Ready after validation');
}

function updateGenerateButton(enabled) {
  const button = document.getElementById('generatePreviewButton');
  if (!button) return;
  button.disabled = !enabled;
  button.classList.toggle('is-disabled', !enabled);
}

function validateContractForm() {
  const data = getContractData();
  const errors = validateContractData(data);
  const labels = {
    contractType: 'Document Type',
    name: 'Name & Surname',
    idNumber: identityLabel(data),
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

  const msg = document.getElementById('formValidationMsg');
  const text = document.getElementById('formValidationText');
  const messages = Object.entries(errors).map(([field, message]) => {
    if (message.endsWith(' is required.')) return labels[field] || message.replace(' is required.', '');
    return message;
  });
  showFieldErrors(errors, { showRequired: true });
  if (messages.length) {
    if (msg) msg.style.display = 'flex';
    if (text) text.textContent = 'Please fix: ' + messages.join(', ') + '.';
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
  set('doc-id-label', identityLabel(data) + ':');
  set('doc-id-number', data.idNumber);
  set('doc-address', data.address);
  set('doc-postal-address', data.address);
  set('doc-phone-number', data.phoneNumber || ' ');
  set('doc-email-address', data.emailAddress || ' ');
  set('doc-role', data.role);
  set('doc-salary-monthly', formatCurrency(data.salary));
  set('doc-fixed-term', data.fixedTermPeriod);
  set('doc-start-date', formatDisplayDate(data.startDate));
  set('doc-end-date', formatDisplayDate(data.endDate));
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

  setPreviewAccess?.(true);
  routeTo('preview');
}

function getDraftPayload() {
  const fields = Array.from(document.querySelectorAll('.contract-field'));
  return fields.reduce((draft, field) => {
    draft[field.id] = field.value;
    return draft;
  }, {});
}

function setDraftStatus(text) {
  const status = document.getElementById('draftStatus');
  if (status) status.textContent = text;
}

function saveContractDraft(options = {}) {
  try {
    localStorage.setItem(CONTRACT_DRAFT_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      values: getDraftPayload()
    }));
    setDraftStatus(options.quiet ? 'Draft autosaved' : 'Draft saved');
  } catch {
    setDraftStatus('Draft could not be saved');
  }
}

function restoreContractDraft() {
  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem(CONTRACT_DRAFT_KEY) || 'null');
  } catch {
    draft = null;
  }
  if (!draft?.values) {
    setDraftStatus('Draft not saved');
    return;
  }

  Object.entries(draft.values).forEach(([id, value]) => setInputValue(id, value || ''));
  updateDateDisplays();
  setDraftStatus('Draft restored');
}

function clearContractDraft() {
  document.querySelectorAll('.contract-field').forEach(input => {
    input.value = input.id === 'idType' ? 'south-african-id' : '';
  });
  try {
    localStorage.removeItem(CONTRACT_DRAFT_KEY);
  } catch {
    // Storage can be unavailable in hardened browser modes.
  }
  setPreviewAccess?.(false);
  setDraftStatus('Draft cleared');
  updateDateDisplays();
  updateContractTypeUI();
  updateFormProgress();
}

function bindContractForm() {
  const form = document.getElementById('contractForm');
  if (form?.dataset.bound !== 'true') {
    restoreContractDraft();
    if (form) form.dataset.bound = 'true';
  }

  document.querySelectorAll('.contract-field').forEach(input => {
    input.removeEventListener('input', handleContractFieldChange);
    input.addEventListener('input', handleContractFieldChange);
    input.removeEventListener('change', handleContractFieldChange);
    input.addEventListener('change', handleContractFieldChange);
  });

  const contractType = document.getElementById('contractType');
  if (contractType) {
    contractType.removeEventListener('change', applyContractDefaults);
    contractType.addEventListener('change', applyContractDefaults);
  }

  document.querySelectorAll('[data-date-target]').forEach(trigger => {
    trigger.removeEventListener('click', handleDateTriggerClick);
    trigger.addEventListener('click', handleDateTriggerClick);
  });

  updateContractTypeUI();
  updateFormProgress();
}

function handleContractFieldChange() {
  updateFormProgress();
  saveContractDraft({ quiet: true });
}

function handleDateTriggerClick(event) {
  openDatePicker(event.currentTarget.dataset.dateTarget);
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#page-wizard')) bindContractForm();
  const dateTrigger = e.target.closest('[data-date-target]');
  if (dateTrigger) {
    openDatePicker(dateTrigger.dataset.dateTarget);
    return;
  }
  const popover = document.getElementById('contractDatePicker');
  if (popover && !popover.classList.contains('hidden') && !e.target.closest('#contractDatePicker')) closeDatePicker();
  const nav = e.target.closest('[data-date-nav]');
  if (nav) shiftDatePickerMonth(Number(nav.dataset.dateNav));
  const dateCell = e.target.closest('[data-date-value]');
  if (dateCell) selectDateValue(dateCell.dataset.dateValue);
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(bindContractForm, 500);
});
