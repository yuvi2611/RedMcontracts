# 🚀 Quick Start - ContractIQ Demo Application

## Where Everything Is

```
RedMPS_Contract/
└── src/frontend/
    ├── demo-index.html ...................... Main application entry point
    ├── redmps-hr-platform.html ............ Original monolithic file (reference)
    └── demo/
        ├── README.md ....................... Full component documentation
        │
        ├── components/ ..................... Reusable HTML components
        │   ├── sidebar.html ............... Navigation sidebar
        │   ├── topbar.html ................ Header/toolbar
        │   └── pages/
        │       ├── dashboard.html ......... Dashboard page
        │       ├── wizard.html ........... Contract creation wizard
        │       ├── preview.html ........... Document preview
        │       ├── contracts.html ........ Contracts list
        │       └── analytics.html ........ Analytics dashboard
        │
        ├── styles/ ......................... CSS organized by concern
        │   ├── design-tokens.css ......... Colors, typography, spacing
        │   ├── global.css ................ Reset, animations, base
        │   ├── components/
        │   │   ├── buttons.css
        │   │   ├── forms.css
        │   │   ├── cards.css
        │   │   ├── sidebar.css
        │   │   ├── topbar.css
        │   │   └── modals.css
        │   └── pages/
        │       ├── dashboard.css
        │       ├── wizard.css
        │       ├── preview.css
        │       ├── contracts.css
        │       └── analytics.css
        │
        └── scripts/ ........................ JavaScript functionality
            ├── app.js ..................... Main app initialization
            ├── pages.js ................... Page navigation
            ├── navigation.js .............. Navigation handlers
            ├── wizard.js .................. Wizard logic
            ├── modals.js .................. Modal handling
            └── utils.js ................... Helper functions
```

---

## 🎯 How to Run

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

## ✨ What You'll See

### Welcome Modal
- Introductory message
- "Explore Dashboard" button
- "Create First Contract" button

### Dashboard Page
- ✅ 4 KPI cards (contracts, approvals, processing time, compliance)
- ✅ Recent contracts table
- ✅ Approval queue
- ✅ Monthly volume chart
- ✅ Contract types distribution
- ✅ Activity timeline

### Contract Form
- ✅ Single form with 7 required fields
- ✅ Live completion checklist sidebar
- ✅ Fields: name, surname, ID, role, salary, address, probation, notice
- ✅ Generate preview populates contract document

### Contract Preview
- ✅ Document preview (4 pages)
- ✅ Approval workflow pipeline
- ✅ Compliance checks
- ✅ Export options (PDF, DOCX, e-Signature, Email)

### Contracts List
- ✅ Filter by status
- ✅ Department/type filters
- ✅ Contract cards grid
- ✅ Status badges

---

## 🔄 Navigation

### Click These to Navigate:
- **Dashboard** - Sidebar nav item or back button
- **Contracts** - Sidebar nav or "View all →" link
- **New Contract** - Sidebar nav or "New Contract" button
- **Preview & Sign** - Sidebar nav or contract card click
- **Analytics** - Sidebar nav item

### Navigation Breadcrumb
Shows current page title in top left

---

## 📝 Key Sections

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

## 🎨 Customize

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

## 📊 Mock Data

Current demo includes:
- **5 employees** (Thabo, Sizwe, Lerato, Ayanda, Palesa)
- **4 contracts** visible in list
- **142 contracts total** in KPIs
- **5 pending approvals**
- **6 months** of monthly data
- **5 contract types**

All data is hardcoded in HTML for demo purposes.

---

## 🔗 Component Flow

```
demo-index.html (Main)
├── Loads all CSS
├── Loads all JS
└── Containers:
    ├── #sidebar (sidebar.html)
    ├── #topbar (topbar.html)
    └── #pages-container (pages/*.html)
```

---

## ⚡ Features Implemented

- ✅ Multi-page navigation
- ✅ Sidebar with active states
- ✅ Responsive topbar
- ✅ KPI cards with animations
- ✅ Data tables with sorting
- ✅ Form validation alerts
- ✅ Status badge colors
- ✅ Charts and visualizations
- ✅ Approval workflow pipeline
- ✅ Export action buttons
- ✅ Welcome modal
- ✅ Auto-save indicator
- ✅ AI suggestion cards
- ✅ Wizard step progress
- ✅ Document preview
- ✅ Animation effects

---

## 🚀 Next Steps

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

## 📖 Documentation

- Full structure: `demo/README.md`
- Component guide: `docs/PROJECT_STRUCTURE.md`
- Design system: `docs/DESIGN_SYSTEM.md`
- Setup guide: `docs/SETUP_GUIDE.md`

---

## 🎯 File Summary

| File Type | Count | Purpose |
|-----------|-------|---------|
| HTML Components | 8 | Pages and layout |
| CSS Files | 16 | Styling organized |
| JavaScript Files | 6 | Functionality |
| Documentation | 3 | Guides and refs |
| **Total** | **33** | Production demo |

---

## ✅ Testing Checklist

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

## 🆘 Troubleshooting

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

## 💡 Tips

- Use browser DevTools (F12) to inspect elements
- Check the console for any errors
- Use the network tab to see file loading
- Modify HTML directly for quick changes
- Use CSS inspector to test style changes

---

## 📞 Support

For issues with:
- **Structure**: See `demo/README.md`
- **Setup**: See `docs/SETUP_GUIDE.md`
- **Design**: See `docs/DESIGN_SYSTEM.md`
- **Architecture**: See `docs/PROJECT_STRUCTURE.md`

---

**Status**: ✅ Ready to Demo  
**Last Updated**: June 5, 2026  
**Version**: 1.0
