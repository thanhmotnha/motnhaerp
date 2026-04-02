# Sidebar Toggle & Responsive Overflow Fix Design

## Goal

Fix two linked problems:
1. Horizontal content overflow at 1920×1080 (content clipped, no scrollbar)
2. No way to hide the sidebar on desktop — users on wider monitors want full-width content

---

## Architecture

### Approach

React state in `AppShell.js` (matches existing pattern for mobile `sidebarOpen`). State persisted in `localStorage`. CSS class on `.app-layout` drives all visual changes — no inline styles.

No new components needed. Three files change.

---

## Components

### 1. AppShell.js

Add `sidebarCollapsed` boolean state, initialized from `localStorage('sidebarCollapsed')`.

```js
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setSidebarCollapsed(true);
}, []);

const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('sidebarCollapsed', String(next));
        return next;
    });
}, []);
```

Apply class to `.app-layout`:
```jsx
<div className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
```

Pass `onSidebarToggle={toggleSidebarCollapsed}` and `sidebarCollapsed={sidebarCollapsed}` to `<Header>`.

### 2. Header.js

Accept two new props: `onSidebarToggle` and `sidebarCollapsed`.

Add a desktop-only toggle button immediately left of `.header-title`, using `PanelLeftClose` / `PanelLeftOpen` icons from lucide-react:

```jsx
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

// In header-left, before header-title:
<button
    className="header-btn sidebar-toggle-btn"
    onClick={onSidebarToggle}
    title={sidebarCollapsed ? 'Mở sidebar' : 'Ẩn sidebar'}
    aria-label={sidebarCollapsed ? 'Mở sidebar' : 'Ẩn sidebar'}
>
    {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
</button>
```

The existing `mobile-menu-btn` (☰) is unchanged — still only visible on mobile via CSS.

`.sidebar-toggle-btn` is hidden on mobile (`display: none` at ≤768px) and visible on desktop.

### 3. globals.css

**Sidebar collapsed state:**

```css
/* Sidebar toggle — desktop */
.sidebar-toggle-btn {
    display: flex; /* visible on desktop */
}

.app-layout.sidebar-collapsed .sidebar {
    transform: translateX(-100%);
}

.app-layout.sidebar-collapsed .main-content {
    margin-left: 0;
    transition: margin-left 0.25s ease;
}

.app-layout.sidebar-collapsed .header {
    left: 0;
    transition: left 0.25s ease;
}

/* Add transition to sidebar itself */
.sidebar {
    /* existing styles + */
    transition: transform 0.25s ease;
}

.main-content {
    /* existing styles + */
    transition: margin-left 0.25s ease;
}

.header {
    /* existing styles + */
    transition: left 0.25s ease;
}
```

**Overflow fix:**

```css
.app-layout {
    overflow-x: hidden;
}
```

This prevents the page-level horizontal scrollbar from appearing when any inner element exceeds the viewport width. Combined with the sidebar hide feature (which recovers 260px), this resolves the 1920×1080 clipping issue.

**Hide sidebar-toggle-btn on mobile:**

```css
@media (max-width: 768px) {
    .sidebar-toggle-btn {
        display: none;
    }
}
```

---

## Behavior Summary

| State | Sidebar | main-content margin | Header left |
|-------|---------|--------------------|----|
| Default (expanded) | visible | 260px | 260px |
| Collapsed | hidden (translateX -100%) | 0 | 0 |

- Toggle persists across page navigation and refresh (localStorage)
- Smooth 0.25s transition on all three elements
- Mobile unaffected — mobile uses existing `sidebarOpen` overlay pattern

---

## Files to Change

| File | Change |
|------|--------|
| `components/AppShell.js` | Add `sidebarCollapsed` state + localStorage + pass props to Header |
| `components/Header.js` | Add `PanelLeftClose`/`PanelLeftOpen` toggle button (desktop only) |
| `app/globals.css` | Collapsed CSS state, transitions, overflow-x: hidden on .app-layout, hide toggle on mobile |

---

## Out of Scope

- Icon-only collapsed mode (show icons without labels)
- Sidebar width resize / drag
- Per-page sidebar state
