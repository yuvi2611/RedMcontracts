# ðŸš€ Quick Start - ContractIQ Demo Application

## Where Everything Is

```
RedMPS_Contract/
â””â”€â”€ src/frontend/
    â”œâ”€â”€ demo-index.html ...................... Main application entry point
    â”œâ”€â”€ redmps-hr-platform.html ............ Original monolithic file (reference)
    â””â”€â”€ demo/
        â”œâ”€â”€ README.md ....................... Full component documentation
        â”‚
        â”œâ”€â”€ components/ ..................... Reusable HTML components
        â”‚   â”œâ”€â”€ sidebar.html ............... Navigation sidebar
        â”‚   â”œâ”€â”€ topbar.html ................ Header/toolbar
        â”‚   â””â”€â”€ pages/
        â”‚       â”œâ”€â”€ dashboard.html ......... Dashboard page
        â”‚       â”œâ”€â”€ wizard.html ........... Contract creation wizard
        â”‚       â”œâ”€â”€ preview.html ........... Document preview
        â”‚       â”œâ”€â”€ contracts.html ........ Contracts list
        â”‚       â””â”€â”€ analytics.html ........ Analytics dashboard
        â”‚
        â”œâ”€â”€ styles/ ......................... CSS organized by concern
        â”‚   â”œâ”€â”€ design-tokens.css ......... Colors, typography, spacing
        â”‚   â”œâ”€â”€ global.css ................ Reset, animations, base
        â”‚   â”œâ”€â”€ components/
        â”‚   â”‚   â”œâ”€â”€ buttons.css
        â”‚   â”‚   â”œâ”€â”€ forms.css
        â”‚   â”‚   â”œâ”€â”€ cards.css
        â”‚   â”‚   â”œâ”€â”€ sidebar.css
        â”‚   â”‚   â”œâ”€â”€ topbar.css
        â”‚   â”‚   â””â”€â”€ modals.css
        â”‚   â””â”€â”€ pages/
        â”‚       â”œâ”€â”€ dashboard.css
        â”‚       â”œâ”€â”€ wizard.css
        â”‚       â”œâ”€â”€ preview.css
        â”‚       â”œâ”€â”€ contracts.css
        â”‚       â””â”€â”€ analytics.css
        â”‚
        â””â”€â”€ scripts/ ........................ JavaScript functionality
            â”œâ”€â”€ app.js ..................... Main app initialization
            â”œâ”€â”€ pages.js ................... Page navigation
            â”œâ”€â”€ navigation.js .............. Navigation handlers
            â”œâ”€â”€ wizard.js .................. Wizard logic
            â”œâ”€â”€ modals.js .................. Modal handling
            â””â”€â”€ utils.js ................... Helper functions
```

---

## ðŸŽ¯ How to Run

### Option 1: Direct Browser Open
```bash
# Simple: Just open the file
src/frontend/demo-index.html

# Works in Chrome, Firefox, Safari
```

### Option 2: Local Server (Recommended)
```bash
# Navigate to frontend directory
cd src/frontend

# Python 3
python -m http.server 8000

# Or Node.js from the repo root
npm run demo

# Then open: http://localhost:8000/demo-index.html
```

---

## âœ¨ What You'll See

### Welcome Modal
- Introductory message
- "Explore Dashboard" button
- "Create First Contract" button

### Dashboard Page
- âœ… 4 KPI cards (contracts, approvals, processing time, compliance)
- âœ… Recent contracts table
- âœ… Approval queue
- âœ… Monthly volume chart
- âœ… Contract types distribution
- âœ… Activity timeline

### Contract Form
- âœ… Single form with 7 required fields
- âœ… Live completion checklist sidebar
- âœ… Fields: name, surname, ID, role, salary, address, probation, notice
- âœ… Generate preview populates contract document

### Contract Preview
- âœ… Document preview (4 pages)
- âœ… Approval workflow pipeline
- âœ… Compliance checks
- âœ… Export options (PDF, DOCX, e-Signature, Email)

### Contracts List
- âœ… Filter by status
- âœ… Department/type filters
- âœ… Contract cards grid
- âœ… Status badges

---

## ðŸ”„ Navigation

### Click These to Navigate:
- **Dashboard** - Sidebar nav item or back button
- **Contracts** - Sidebar nav or "View all â†’" link
- **New Contract** - Sidebar nav or "New Contract" button
- **Preview & Sign** - Sidebar nav or contract card click
- **Analytics** - Sidebar nav item

### Navigation Breadcrumb
Shows current page title in top left

---

## ðŸ“ Key Sections

### Design Tokens
**File**: `demo/styles/design-tokens.css`

Define the brand system:
```css
--red-500: #d4002a;        /* Primary brand red */
--coal-900: #111115;       /* Dark text */
--sidebar-w: 260px;        /* Spacing */
--shadow-lg: ...           /* Shadows */
```

### Components CSS
**Files**: `demo/styles/components/*.css`

Reusable component styles:
- `buttons.css` - Primary, secondary, ghost buttons
- `forms.css` - Inputs, selects, validation
- `cards.css` - Card layouts
- `sidebar.css` - Navigation sidebar
- `topbar.css` - Header bar

### Page Styles
**Files**: `demo/styles/pages/*.css`

Page-specific styling:
- `dashboard.css` - Dashboard layout
- `wizard.css` - Form wizard
- `preview.css` - Document preview
- `contracts.css` - List view
- `analytics.css` - Charts and KPIs

### JavaScript
**Files**: `demo/scripts/*.js`

Functionality and interactivity:
- `app.js` - Initialize
- `pages.js` - Load pages
- `navigation.js` - Handle navigation
- `wizard.js` - Wizard steps
- `modals.js` - Modal dialogs
- `utils.js` - Helpers

---

## ðŸŽ¨ Customize

### Change Colors
Edit `demo/styles/design-tokens.css`:
```css
--red-500: #your-color;
```

### Modify Buttons
Edit `demo/styles/components/buttons.css`:
```css
.btn-primary {
  background: var(--red-500);
  padding: 10px 20px;
  /* ... */
}
```

### Update Content
Edit component files in `demo/components/pages/`:
```html
<!-- Change text directly -->
<!-- Modify form fields -->
<!-- Update data in tables -->
```

### Add New Page
1. Create `demo/components/pages/newpage.html`
2. Create `demo/styles/pages/newpage.css`
3. Add function in `demo/scripts/pages.js`
4. Add nav item in sidebar

---

## Live Data

The app reads operational data from the backend API and PostgreSQL:
- Dashboard KPIs are loaded from `/api/dashboard`
- Contracts, employees, approvals, and audit logs use paginated API endpoints
- Authentication, password resets, and user creation require database-backed users
- Email/notification requests require explicit recipient and contract context

If the API is unavailable, pages show an explicit offline/error state instead of treating static markup as live data.

---

## ðŸ”— Component Flow

```
demo-index.html (Main)
â”œâ”€â”€ Loads all CSS
â”œâ”€â”€ Loads all JS
â””â”€â”€ Containers:
    â”œâ”€â”€ #sidebar (sidebar.html)
    â”œâ”€â”€ #topbar (topbar.html)
    â””â”€â”€ #pages-container (pages/*.html)
```

---

## âš¡ Features Implemented

- âœ… Multi-page navigation
- âœ… Sidebar with active states
- âœ… Responsive topbar
- âœ… KPI cards with animations
- âœ… Data tables with sorting
- âœ… Form validation alerts
- âœ… Status badge colors
- âœ… Charts and visualizations
- âœ… Approval workflow pipeline
- âœ… Export action buttons
- âœ… Welcome modal
- âœ… Auto-save indicator
- âœ… AI suggestion cards
- âœ… Wizard step progress
- âœ… Document preview
- âœ… Animation effects

---

## ðŸš€ Next Steps

### To Connect to Real Backend:
1. Open `demo/scripts/app.js`
2. Replace mock data with API calls
3. Update endpoints to your backend
4. Add authentication

### To Add More Pages:
1. Create HTML component in `demo/components/pages/`
2. Create CSS in `demo/styles/pages/`
3. Add navigation in `demo/scripts/pages.js`
4. Add sidebar item in `components/sidebar.html`

### To Customize Styling:
1. Edit `demo/styles/design-tokens.css` for colors
2. Edit component CSS for styling
3. Edit page CSS for layouts

### To Add Functionality:
1. Add JavaScript in `demo/scripts/`
2. Call from HTML with onclick handlers
3. Use utility functions from `utils.js`

---

## ðŸ“– Documentation

- Full structure: `demo/README.md`
- Component guide: `docs/PROJECT_STRUCTURE.md`
- Design system: `docs/DESIGN_SYSTEM.md`
- Setup guide: `docs/SETUP_GUIDE.md`

---

## ðŸŽ¯ File Summary

| File Type | Count | Purpose |
|-----------|-------|---------|
| HTML Components | 8 | Pages and layout |
| CSS Files | 16 | Styling organized |
| JavaScript Files | 6 | Functionality |
| Documentation | 3 | Guides and refs |
| **Total** | **33** | Production demo |

---

## âœ… Testing Checklist

- [ ] Demo opens in browser
- [ ] Sidebar navigation works
- [ ] All pages load correctly
- [ ] Buttons respond to clicks
- [ ] Forms display properly
- [ ] Tables show data
- [ ] Charts render
- [ ] Colors match brand
- [ ] Responsive on mobile
- [ ] No console errors

---

## ðŸ†˜ Troubleshooting

### "File not found" error
- Make sure you're in correct directory
- Check file paths are relative
- Use local server instead of file:// protocol

### Styles not loading
- Clear browser cache
- Check CSS file paths
- Verify design-tokens.css loads first

### JavaScript not working
- Open browser console (F12)
- Check for errors
- Verify scripts folder exists
- Check script file paths

### Images not showing
- Use emoji instead (already done)
- Or add images to demo/assets/ folder

---

## ðŸ’¡ Tips

- Use browser DevTools (F12) to inspect elements
- Check the console for any errors
- Use the network tab to see file loading
- Modify HTML directly for quick changes
- Use CSS inspector to test style changes

---

## ðŸ“ž Support

For issues with:
- **Structure**: See `demo/README.md`
- **Setup**: See `docs/SETUP_GUIDE.md`
- **Design**: See `docs/DESIGN_SYSTEM.md`
- **Architecture**: See `docs/PROJECT_STRUCTURE.md`

---

**Status**: âœ… Ready to Demo  
**Last Updated**: June 5, 2026  
**Version**: 1.0
