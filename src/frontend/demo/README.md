# ContractIQ Demo App - Component Structure
## Modular HTML/CSS/JS Organization

**Status**: ✅ Separated into Modular Files  
**Date**: June 5, 2026  

---

## 📂 Demo Application Structure

```
src/frontend/
├── demo-index.html                    # Main entry point
├── demo/
│   ├── components/                    # Reusable HTML components
│   │   ├── sidebar.html              # Navigation sidebar
│   │   ├── topbar.html               # Header/toolbar
│   │   ├── pages/
│   │   │   ├── dashboard.html        # Dashboard page
│   │   │   ├── wizard.html           # Contract creation wizard
│   │   │   ├── preview.html          # Contract preview & export
│   │   │   ├── contracts.html        # Contracts list view
│   │   │   ├── analytics.html        # Analytics dashboard
│   │   │   └── employees.html        # Employee management
│   │   └── modals/
│   │       └── welcome-modal.html    # Welcome modal
│   │
│   ├── styles/                        # Organized CSS files
│   │   ├── design-tokens.css         # Color, typography, spacing tokens
│   │   ├── global.css                # Reset, base styles, animations
│   │   ├── components/
│   │   │   ├── buttons.css           # Button styles
│   │   │   ├── forms.css             # Form elements
│   │   │   ├── cards.css             # Card components
│   │   │   ├── sidebar.css           # Sidebar styling
│   │   │   ├── topbar.css            # Topbar styling
│   │   │   └── modals.css            # Modal styling
│   │   └── pages/
│   │       ├── dashboard.css         # Dashboard specific styles
│   │       ├── wizard.css            # Wizard specific styles
│   │       ├── preview.css           # Preview specific styles
│   │       ├── contracts.css         # Contracts list styles
│   │       ├── analytics.css         # Analytics styles
│   │       └── employees.css         # Employees page styles
│   │
│   └── scripts/                       # JavaScript functionality
│       ├── app.js                    # Main app initialization
│       ├── pages.js                  # Page loading/navigation
│       ├── navigation.js             # Navigation handlers
│       ├── wizard.js                 # Wizard step logic
│       ├── modals.js                 # Modal functionality
│       └── utils.js                  # Utility functions
```

---

## 🎯 Main Entry Point

**File**: `src/frontend/demo-index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>RedMPS · ContractIQ</title>
  
  <!-- All CSS files linked -->
  <link rel="stylesheet" href="demo/styles/design-tokens.css">
  <link rel="stylesheet" href="demo/styles/global.css">
  <link rel="stylesheet" href="demo/styles/components/*.css">
  <link rel="stylesheet" href="demo/styles/pages/*.css">
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar"></aside>
    <main class="main">
      <header class="topbar" id="topbar"></header>
      <div id="pages-container"></div>
    </main>
  </div>
  
  <!-- All JS files loaded -->
  <script src="demo/scripts/app.js"></script>
  <script src="demo/scripts/pages.js"></script>
  <script src="demo/scripts/navigation.js"></script>
</body>
</html>
```

---

## 📋 Components Breakdown

### Sidebar Component
**File**: `demo/components/sidebar.html`
- Logo and branding
- Main navigation items
- Management section
- Insights section
- System settings
- User profile card

### Topbar Component
**File**: `demo/components/topbar.html`
- Page title and breadcrumb
- Search bar
- Notification button
- User profile button

### Page Components

#### Dashboard Page
**File**: `demo/components/pages/dashboard.html`
- Greeting and date
- 4 KPI cards (142 contracts, 5 pending, 4.2h avg time, 98.6% compliance)
- Recent contracts table (5 rows)
- Approval queue (3 items)
- Monthly volume chart
- Contract types donut chart
- Recent activity timeline
- Runtime values hydrate from the backend API and PostgreSQL.

#### Wizard Page
**File**: `demo/components/pages/wizard.html`
- Step sidebar (7 steps)
- Step 2: Employee Details form
- Form sections (personal, contact)
- AI suggestion cards
- Validation alerts
- Navigation buttons
- Progress indicator
- Auto-save indicator

#### Preview Page
**File**: `demo/components/pages/preview.html`
- Document toolbar (edit, find, comment)
- Contract document preview (4 pages)
- Document header with logo
- Sections: Parties, Position, Remuneration, Probation
- Signature lines
- Side panel:
  - AI compliance check
  - Approval workflow pipeline
  - Export options (PDF, DOCX, e-Signature, Email)

#### Contracts List
**File**: `demo/components/pages/contracts.html`
- Filter chips (All, Draft, Under Review, Approved, Signed)
- Department and type filters
- Contract table/grid populated from PostgreSQL
- Pagination controls for multi-page result sets
- Contract rows include:
  - Employee name
  - Position
  - Department
  - Salary info
  - Status badge
  - Date

#### Analytics Page
**File**: `demo/components/pages/analytics.html`
- Hero section with KPIs
- Monthly volume chart
- Contract type distribution
- Approval metrics
- Processing time trends
- Compliance dashboard

#### Employees Page
**File**: `demo/components/pages/employees.html`
- Employee listing
- Filter/search options
- Employee cards with info
- Bulk actions

---

## 🎨 CSS Organization

### Design Tokens (`design-tokens.css`)
```css
:root {
  /* Colors */
  --red-500: #d4002a;    /* Primary brand red */
  --coal-900: #111115;   /* Dark neutral */
  /* ... more color definitions ... */
  
  /* Spacing */
  --sidebar-w: 260px;
  --header-h: 64px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,.08), ...
  --shadow-lg: 0 12px 40px rgba(0,0,0,.14), ...
}
```

### Global Styles (`global.css`)
- Reset and base styles
- Typography defaults
- Animations (fadeInUp, pulse-dot)
- Scrollbar styling
- Responsive breakpoints

### Component Styles
Each component has a dedicated CSS file:
- `buttons.css` - All button variants
- `forms.css` - Form elements and validation
- `cards.css` - Card layouts
- `sidebar.css` - Sidebar styling
- `topbar.css` - Top navigation bar
- `modals.css` - Modal overlays

### Page-Specific Styles
- `dashboard.css` - Dashboard layout and KPIs
- `wizard.css` - Wizard form styling
- `preview.css` - Document preview layout
- `contracts.css` - Contract cards grid
- `analytics.css` - Charts and analytics
- `employees.css` - Employee list

---

## 🔧 JavaScript Organization

### Main App (`app.js`)
```javascript
// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  loadComponents();
  setupEventListeners();
  initializeApp();
});
```

### Pages (`pages.js`)
```javascript
// Page management functions
function showPage(pageName) {
  // Hide current page
  // Load new page component
  // Update navigation
}

function loadPage(pageName) {
  // Fetch and render page HTML
}
```

### Navigation (`navigation.js`)
```javascript
// Navigation handlers
function updateTopbar(title, breadcrumb) { }
function updateActiveNav(itemId) { }
function closeModal() { }
```

### Wizard Logic (`wizard.js`)
```javascript
// Wizard step management
function setWizardStep(stepNumber) { }
function validateStep(stepNumber) { }
function saveWizardDraft() { }
```

### Utilities (`utils.js`)
```javascript
// Helper functions
function formatCurrency(value) { }
function formatDate(date) { }
function showNotification(message, type) { }
```

---

## 🚀 How to Run the Demo

### 1. Open in Browser
```bash
# From the repo root
npm run demo

# Then visit: http://localhost:8000/demo-index.html
```

### 2. File Structure
All files are organized in:
```
RedMPS_Contract/src/frontend/
├── demo-index.html
└── demo/
    ├── components/
    ├── styles/
    └── scripts/
```

### 3. Key Features
- ✅ Welcome modal on load
- ✅ Navigation between pages
- ✅ Dashboard with KPIs and tables
- ✅ Contract wizard with steps
- ✅ Document preview
- ✅ Contracts listing
- ✅ Responsive design
- ✅ Animations and transitions

---

## 📊 Component Dependencies

### Components Used In Each Page

**Dashboard**
- KPI Cards
- Data Table
- Approval Queue
- Mini Charts
- Activity Timeline
- Donut Chart

**Wizard**
- Sidebar Steps
- Form Groups
- Input Fields
- Select Dropdowns
- Validation Alerts
- AI Suggestions
- Progress Bar

**Preview**
- Document Toolbar
- Document Content
- Approval Pipeline
- Export Buttons
- Compliance Checks

**Contracts**
- Filter Chips
- Contract Cards
- Status Badges
- Pagination (optional)

---

## 🎯 Benefits of This Organization

### ✅ Modularity
- Each component in separate file
- Easy to find and modify
- Reusable across pages

### ✅ Maintainability
- Clear folder structure
- Logical file naming
- Single responsibility principle

### ✅ Scalability
- Easy to add new pages
- Simple to add new components
- CSS organized by concern

### ✅ Performance
- Can lazy-load pages
- Separate CSS for each component
- Minifiable JavaScript modules

### ✅ Developer Experience
- Easy navigation
- Quick file location
- Clear dependencies
- Documentation included

---

## 📝 Component Import Pattern

Each page loads components like this:

```html
<!-- Page: dashboard.html -->
<div class="page" id="page-dashboard">
  <div class="page-content">
    <!-- Component: sidebar (already in main layout) -->
    <!-- Component: topbar (already in main layout) -->
    
    <!-- Dashboard specific content -->
    <div class="dashboard-content">
      <!-- KPI Cards -->
      <!-- Data Tables -->
      <!-- Charts -->
    </div>
  </div>
</div>
```

---

## 🔗 File References

| Component | Location | Purpose |
|-----------|----------|---------|
| Main Page | `demo-index.html` | Application entry point |
| Sidebar | `demo/components/sidebar.html` | Navigation |
| Topbar | `demo/components/topbar.html` | Header |
| Dashboard | `demo/components/pages/dashboard.html` | Home page |
| Wizard | `demo/components/pages/wizard.html` | Contract creation |
| Preview | `demo/components/pages/preview.html` | Document view |
| Contracts | `demo/components/pages/contracts.html` | List view |
| Analytics | `demo/components/pages/analytics.html` | Insights |
| Tokens | `demo/styles/design-tokens.css` | Design system |
| Global | `demo/styles/global.css` | Base styles |
| Scripts | `demo/scripts/*.js` | Functionality |

---

## 🚀 Next Steps

1. **Test the demo**
   ```bash
   cd RedMPS_Contract/src/frontend
   # Open demo-index.html in browser
   ```

2. **Customize pages**
   - Edit individual component files
   - Modify page-specific CSS
   - Add new functionality in scripts

3. **Add new pages**
   - Create `demo/components/pages/newpage.html`
   - Create `demo/styles/pages/newpage.css`
   - Add navigation in `scripts/pages.js`

4. **Connect to backend**
   - Replace mock data with API calls
   - Update API endpoints in JavaScript
   - Add authentication

5. **Responsive design**
   - Add media queries to CSS
   - Test on mobile/tablet
   - Adjust breakpoints

---

## 📦 Summary

Your demo application is now organized into:
- **8+ HTML component files** (modular, reusable)
- **11+ CSS files** (organized by concern)
- **6+ JavaScript files** (clear separation of concerns)
- **4+ Page components** (dashboard, wizard, preview, contracts, analytics)
- **Complete demo workflow** ready to run

Everything is structured for easy maintenance, scalability, and team collaboration.

---

**Version**: 1.0  
**Last Updated**: June 5, 2026  
**Status**: ✅ Component Separation Complete
