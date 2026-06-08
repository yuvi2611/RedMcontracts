# ContractIQ Design System & Component Library
## Complete UI/UX Specification for RedMPS Brand

---

## DESIGN PHILOSOPHY

**Core Principles:**
1. **Progressive Disclosure** — Never overwhelm. One decision per screen.
2. **Intelligent Defaults** — Assume the best, let users adjust
3. **Error Prevention** — Validate early, guide users to success
4. **Visual Hierarchy** — Clear distinction between primary/secondary actions
5. **Accessibility** — WCAG AA compliance minimum
6. **Consistency** — Predictable patterns across the platform
7. **Premium Feel** — Enterprise-grade professionalism

---

## COLOR SYSTEM

### Primary Brand Color (RedMPS Red)
```
Red 50:   #fff5f6  | Use: Very subtle backgrounds
Red 100:  #ffeaed  | Use: Light backgrounds for alerts/info
Red 300:  #f55a72  | Use: Lighter interactions, hovers
Red 400:  #e8234a  | Use: Secondary actions, accents
Red 500:  #d4002a  | Use: PRIMARY - buttons, active states, focus
Red 600:  #c0001a  | Use: Hover states, active navigation
Red 700:  #a80000  | Use: Darker hovers, pressed states
Red 800:  #8b0000  | Use: Gradients, dark backgrounds
Red 900:  #6b0000  | Use: Text on red backgrounds, dark gradients
```

### Neutral Color System (Coal)
```
Coal 50:   #f4f4f8  | Use: Lightest backgrounds, hover states
Coal 100:  #dddde8  | Use: Borders, dividers
Coal 200:  #b0b0c8  | Use: Disabled states, tertiary text
Coal 300:  #7f7f9a  | Use: Muted text, secondary labels
Coal 400:  #5a5a72  | Use: Secondary text, small labels
Coal 500:  #3d3d4e  | Use: Body text, secondary copy
Coal 600:  #2d2d38  | Use: Tertiary headings, strong text
Coal 700:  #22222a  | Use: Secondary headings
Coal 800:  #18181e  | Use: Primary headings, body text
Coal 900:  #111115  | Use: Darkest text, header backgrounds
Coal 950:  #0d0d0f  | Use: Very rare, maximum contrast
```

### Semantic Colors
```
Success (Green):    #0d7a4e  | Approvals, completions, positive actions
Warning (Amber):    #b45309  | Cautions, attention needed, reviews
Error (Red):        #c0001a  | Errors, blocking issues, critical
Info (Blue):        #1a5f8a  | Help, information, neutral notifications
```

### Accent Color
```
Gold Primary:       #c9a227  | Premium feel, special emphasis
Gold Light:         #f0d077  | Subtle highlights, light backgrounds
```

---

## TYPOGRAPHY SYSTEM

### Font Stack
```css
/* Primary Font: Outfit (Google Fonts) */
font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Display Font: Playfair Display (for headings only) */
font-family: 'Playfair Display', Georgia, serif;

/* Fallback */
font-family: system-ui, -apple-system, sans-serif;
```

### Type Scale (15px base)

| Name | Size | Weight | Line-Height | Margin | Usage |
|------|------|--------|------------|--------|-------|
| H1 | 24px | 700 | 1.2 | 0 20px | Page titles, modals |
| H2 | 22px | 700 | 1.2 | 0 16px | Dashboard greeting, section headers |
| H3 | 18px | 700 | 1.3 | 0 14px | Card titles, subsection headers |
| H4 | 16px | 700 | 1.3 | 0 12px | Form section headers |
| H5 | 14px | 600 | 1.4 | 0 10px | Smaller headers |
| Body | 13.5px | 400 | 1.6 | 0 0 | Main paragraph text |
| Label | 12.5px | 600 | 1.4 | 0 0 | Form labels, badges |
| Small | 12px | 500 | 1.5 | 0 0 | Help text, secondary info |
| Tiny | 11px | 500 | 1.5 | 0 0 | Meta data, subtle text |
| XTiny | 10.5px | 600 | 1.4 | 0 0 | Timestamps, indicators |

### Font Weight Usage
```
Light (300):      Decorative, subtle
Regular (400):    Body text, main content
Medium (500):     Secondary labels, form labels
Semibold (600):   Emphasis, important text
Bold (700):       Headers, important emphasis
Extra Bold (800): Large headings, KPI values
```

---

## SPACING SYSTEM

### Base Unit: 4px

```
xs:   4px   | Tight internal spacing
sm:   8px   | Component gaps, small spacing
md:  12px   | Section spacing, moderate gaps
lg:  16px   | Block spacing, standard gap
xl:  20px   | Card padding, larger spacing
2xl: 24px   | Section spacing
3xl: 28px   | Page padding
4xl: 32px   | Large sections
5xl: 40px   | Hero sections
```

### Application

```css
.card { padding: 20px; }              /* xl padding */
.section { margin-bottom: 24px; }     /* 2xl margin */
.input { margin-bottom: 6px; }        /* Between label and input */
.button-group { gap: 8px; }           /* sm gap between buttons */
.page { padding: 28px; }              /* 3xl page padding */
```

---

## BORDER RADIUS SCALE

```
xs (6px):   Small UI elements
  - Buttons, form inputs, small cards, badges
  - CSS: border-radius: 6px;

md (10px):  Standard UI
  - Form groups, standard cards, dropdowns
  - CSS: border-radius: 10px;

lg (16px):  Larger elements
  - Card panels, larger modals, sidebars
  - CSS: border-radius: 16px;

xl (24px):  Major sections
  - Hero sections, large modals, primary containers
  - CSS: border-radius: 24px;

Full (50%): Circular
  - Avatars, status indicators, badges
  - CSS: border-radius: 50%;
```

---

## SHADOW SYSTEM

```
xs (sm):    0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)
            Use: Subtle lift, small cards

md:         0 4px 16px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06)
            Use: Standard cards, modals

lg:         0 12px 40px rgba(0,0,0,.14), 0 4px 12px rgba(0,0,0,.08)
            Use: Hero sections, floating panels

red-glow:   0 8px 32px rgba(212,0,42,.22)
            Use: Primary CTAs, emphasis

hover:      Apply shadow upgrade on hover
            sm → md, md → lg
```

---

## COMPONENT LIBRARY

### 1. BUTTONS

#### Button Types

**Primary Button**
```html
<button class="btn-primary">
  <svg class="btn-icon">...</svg>
  Action Label
</button>
```
Style:
```css
background: linear-gradient(135deg, var(--red-500), var(--red-700));
color: white;
padding: 10px 20px;
border-radius: 10px;
box-shadow: 0 8px 32px rgba(212,0,42,.22);
font-weight: 600;
```
States:
- Hover: Transform up 1px, enhanced shadow
- Active: Pressed appearance
- Disabled: 50% opacity

**Secondary Button**
```html
<button class="btn-secondary">Secondary Action</button>
```
Style:
```css
background: white;
border: 1px solid var(--coal-100);
color: var(--coal-700);
```

**Ghost Button**
```html
<button class="btn-ghost">← Back</button>
```
Style:
```css
background: transparent;
border: 1px solid transparent;
color: var(--coal-500);
padding: 8px 16px;
```
Hover: Background becomes white, border appears

**Icon Button**
```html
<button class="icon-btn">
  <svg>...</svg>
</button>
```
Style:
```css
width: 36px;
height: 36px;
border-radius: 6px;
display: flex;
align-items: center;
justify-content: center;
```
Hover: Subtle background color

### 2. FORM ELEMENTS

#### Input Fields
```html
<div class="form-group">
  <label class="form-label">
    Field Label
    <span class="required">*</span>
  </label>
  <input class="form-input" type="text" placeholder="Placeholder">
  <div class="form-hint">Helper text</div>
</div>
```

Styling:
```css
.form-input {
  padding: 10px 14px;
  border: 1.5px solid var(--coal-100);
  border-radius: 6px;
  font-size: 13.5px;
  transition: all .2s cubic-bezier(.4,0,.2,1);
}

.form-input:focus {
  border-color: var(--red-500);
  box-shadow: 0 0 0 3px rgba(212,0,42,.08);
}
```

States:
- Default: Light border
- Focus: Red border + subtle red glow
- Error: Red 400 border
- Disabled: 50% opacity, gray background
- Filled: Animated label float (optional)

#### Select Dropdown
```html
<select class="form-select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

Styling:
```css
.form-select {
  padding: 10px 14px 10px 14px;
  appearance: none;
  background-image: url("data:image/svg+xml,...chevron.svg");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}
```

### 3. BADGES & LABELS

#### Status Badges
```html
<span class="status-badge review">Under Review</span>
```

Style (by type):
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
}

.status-badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.status-badge.draft { background: var(--coal-50); color: var(--coal-500); }
.status-badge.draft::before { background: var(--coal-400); }

.status-badge.review { background: var(--warning-bg); color: var(--warning); }
.status-badge.review::before { background: var(--warning); }

.status-badge.approved { background: var(--success-bg); color: var(--success); }
.status-badge.approved::before { background: var(--success); }

.status-badge.signed { background: var(--info-bg); color: var(--info); }
.status-badge.signed::before { background: var(--info); }
```

### 4. CARDS

#### Standard Card
```html
<div class="card">
  <div class="card-header">
    <div class="card-title">Title</div>
    <span class="card-action">Action</span>
  </div>
  <div class="card-body">Content</div>
</div>
```

Styling:
```css
.card {
  background: white;
  border: 1px solid var(--coal-100);
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
  overflow: hidden;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,.10);
}
```

#### KPI Card
```html
<div class="kpi-card red">
  <div class="kpi-icon red">📄</div>
  <div class="kpi-value">142</div>
  <div class="kpi-label">Contracts Generated · 2026</div>
  <div class="kpi-trend up">↑ 18% vs last quarter</div>
</div>
```

Styling:
```css
.kpi-card {
  background: white;
  border-radius: 16px;
  padding: 22px;
  position: relative;
  overflow: hidden;
}

.kpi-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  border-radius: 0 0 0 80px;
  opacity: .06;
}

.kpi-value {
  font-size: 30px;
  font-weight: 800;
  color: var(--coal-900);
  letter-spacing: -1px;
}
```

### 5. TABLES

```html
<table class="table">
  <thead>
    <tr>
      <th>Column Header</th>
      <th>Column Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cell content</td>
      <td>Cell content</td>
    </tr>
  </tbody>
</table>
```

Styling:
```css
.table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--coal-400);
  padding: 0 0 12px;
  border-bottom: 1px solid var(--coal-100);
}

.table td {
  padding: 13px 0;
  font-size: 13.5px;
  color: var(--coal-700);
  border-bottom: 1px solid var(--coal-50);
}

.table tr:hover td {
  background: var(--coal-50);
}
```

### 6. MODALS

```html
<div class="modal-overlay" id="modal">
  <div class="modal">
    <div class="modal-icon">📋</div>
    <div class="modal-title">Modal Title</div>
    <div class="modal-sub">Subtitle or description</div>
    <div class="modal-actions">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

Styling:
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: white;
  border-radius: 24px;
  padding: 40px;
  width: 520px;
  box-shadow: 0 12px 40px rgba(0,0,0,.14);
  text-align: center;
}
```

### 7. SPINNERS & LOADERS

```html
<!-- Loading spinner -->
<div class="spinner">
  <div class="spinner-track"></div>
  <div class="spinner-fill"></div>
</div>

<!-- Progress bar -->
<div class="progress-bar">
  <div class="progress-fill" style="width: 65%"></div>
</div>
```

---

## INTERACTION PATTERNS

### Loading States
- Use spinner for async operations > 500ms
- Show skeleton screens for cards/content
- Display progress indicators for multi-step processes

### Empty States
- Show friendly icon + message
- Include CTA to create first item
- Avoid generic "No data found"

### Error States
```html
<div class="validation-alert">
  <div class="validation-alert-icon">⚠️</div>
  <div class="validation-alert-text">
    <strong>Error Title:</strong> Detailed explanation of what went wrong.
  </div>
</div>
```

### Success States
```html
<div class="success-message">
  <div class="success-icon">✓</div>
  <div class="success-text">
    <strong>Success!</strong> What was accomplished.
  </div>
</div>
```

### Tooltips
```html
<button class="tooltip">
  <svg>...</svg>
  <span class="tooltip-text">Help text</span>
</button>
```

---

## RESPONSIVE DESIGN

### Breakpoints
```css
Mobile:      < 640px
Tablet:      640px - 1024px
Desktop:     1024px - 1440px
Wide:        > 1440px
```

### Grid Adjustments
```css
/* Dashboard */
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .dashboard-header { flex-direction: column; }
  .kpi-grid { grid-template-columns: 1fr; }
  .card-grid { grid-template-columns: 1fr; }
  .sidebar { position: fixed; transform: translateX(-100%); }
}
```

### Touch Targets
- Minimum 44x44px for interactive elements
- Larger spacing on mobile for touch accuracy

---

## ANIMATIONS & TRANSITIONS

### Transition Easing
```css
--transition: all .2s cubic-bezier(.4,0,.2,1);
/* Standard easing for UI transitions */
```

### Animations

**Fade In Up**
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeInUp .35s ease both;
}
```

**Delays for Staggering**
```css
.animate-delay-1 { animation-delay: .05s; }
.animate-delay-2 { animation-delay: .1s; }
.animate-delay-3 { animation-delay: .15s; }
```

### Interaction Animations
- Hover: 0.2s smooth color/shadow transitions
- Active: Immediate visual feedback
- Transitions: Use cubic-bezier(.4,0,.2,1) for natural motion

---

## ACCESSIBILITY STANDARDS

### WCAG AA Compliance

**Color Contrast:**
- Body text on background: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

**Focus Indicators:**
```css
*:focus-visible {
  outline: 2px solid var(--red-500);
  outline-offset: 2px;
}
```

**Keyboard Navigation:**
- All interactive elements accessible via Tab
- Logical tab order (top-left to bottom-right)
- Focus traps in modals
- Escape key closes modals/dropdowns

**ARIA Labels:**
```html
<button aria-label="Close modal">✕</button>
<div role="alert">Important message</div>
<nav aria-label="Main navigation">...</nav>
```

**Semantic HTML:**
```html
<!-- Good -->
<button>Action</button>
<nav>...</nav>
<main>...</main>
<section>...</section>

<!-- Avoid -->
<div role="button">...</div>
<div role="navigation">...</div>
```

---

## MOTION GUIDELINES

### Micro-interactions
- Button: 100-200ms response
- Hover states: 150ms smooth transition
- Checkbox: 200ms fill animation
- Modal: 200-300ms entrance

### Principles
- Motion serves purpose (feedback, guidance)
- Avoid gratuitous animations
- Reduce motion for users who prefer it
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}
```

---

## USAGE GUIDELINES

### When to Use Each Component

| Component | Best For | Avoid For |
|-----------|----------|-----------|
| Primary Button | Main CTA per section | Secondary actions |
| Secondary Button | Alternative actions | Primary calls to action |
| Ghost Button | Tertiary actions | Important actions |
| Status Badge | Current status | Multiple states on one element |
| Card | Content grouping | Single text line |
| Modal | Confirmations | Large forms or navigation |
| Alert | Messages | Critical errors (use modal) |

---

## THEMING & CUSTOMIZATION

### Dark Mode (Future Enhancement)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --coal-50: #1a1a20;
    --coal-100: #2a2a33;
    /* ... adjust for dark theme ... */
  }
}
```

### Brand Customization

The design system is built to be flexible. Core customization points:

```css
:root {
  /* Brand Colors */
  --primary-color: #d4002a;
  --primary-dark: #8b0000;
  
  /* Neutrals */
  --text-color: #111115;
  --bg-color: #ffffff;
  
  /* Sizes */
  --sidebar-width: 260px;
  --header-height: 64px;
}
```

---

## IMPLEMENTATION CHECKLIST

- ✅ Color tokens defined in CSS
- ✅ Typography scale implemented
- ✅ Spacing utilities created
- ✅ All components built and tested
- ✅ Responsive variants verified
- ✅ Accessibility compliance checked
- ✅ Interactive states implemented
- ✅ Animation easing applied
- ✅ Dark mode prepared (if needed)
- ✅ Documentation for developers

---

*Design System Version: 1.0*  
*Last Updated: June 5, 2026*  
*Status: Production-Ready*
