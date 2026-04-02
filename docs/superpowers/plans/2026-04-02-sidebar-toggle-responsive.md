# Sidebar Toggle & Responsive Overflow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a desktop sidebar hide/show toggle button in the header and fix horizontal content overflow at 1920×1080.

**Architecture:** React state `sidebarCollapsed` lives in `AppShell.js` (same pattern as existing `sidebarOpen` for mobile), persisted to localStorage. A CSS class `.sidebar-collapsed` on `.app-layout` drives all visual changes. Header receives `onSidebarToggle` + `sidebarCollapsed` props and renders a desktop-only toggle button using lucide icons.

**Tech Stack:** Next.js App Router, React 19, CSS (globals.css), lucide-react

---

## File Structure

| File | Change |
|------|--------|
| `app/globals.css` | Add `.sidebar-collapsed` CSS state, transitions on sidebar/main-content/header, `overflow-x: hidden` on `.app-layout`, hide `.sidebar-toggle-btn` on mobile |
| `components/AppShell.js` | Add `sidebarCollapsed` state + localStorage persistence, pass `onSidebarToggle`/`sidebarCollapsed` to `<Header>` |
| `components/Header.js` | Accept two new props, add `PanelLeftClose`/`PanelLeftOpen` toggle button |

---

### Task 1: CSS — collapsed state, transitions, overflow fix

**Files:**
- Modify: `app/globals.css`

Context: `globals.css` is the single stylesheet. Current `.app-layout` is at line ~160, `.main-content` at ~165, `.sidebar` at ~190, `.header` at ~359, the mobile `@media (max-width: 768px)` block starts at ~1963.

- [ ] **Step 1: Add `overflow-x: hidden` to `.app-layout`**

Find this block in `app/globals.css`:
```css
.app-layout {
  display: flex;
  min-height: 100vh;
}
```

Change it to:
```css
.app-layout {
  display: flex;
  min-height: 100vh;
  overflow-x: hidden;
}
```

- [ ] **Step 2: Add transition to `.sidebar`**

Find:
```css
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: linear-gradient(180deg, #234093 0%, #1C3580 60%, #152A6D 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
```

Add `transition: transform 0.25s ease;` after the `display: flex;` line (before `box-shadow`):
```css
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: linear-gradient(180deg, #234093 0%, #1C3580 60%, #152A6D 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: transform 0.25s ease;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
}
```

- [ ] **Step 3: Add transition to `.main-content` and `.header`**

Find:
```css
.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding-top: var(--header-height);
  min-height: 100vh;
}
```

Change to:
```css
.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding-top: var(--header-height);
  min-height: 100vh;
  transition: margin-left 0.25s ease;
}
```

Find the `.header` rule (around line 359):
```css
.header {
  position: fixed;
  top: 0;
  left: var(--sidebar-width);
  right: 0;
  height: var(--header-height);
```

Add `transition: left 0.25s ease;`:
```css
.header {
  position: fixed;
  top: 0;
  left: var(--sidebar-width);
  right: 0;
  height: var(--header-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
  transition: left 0.25s ease;
}
```

- [ ] **Step 4: Add `.app-layout.sidebar-collapsed` CSS rules**

After the `.header` block, add a new comment section and the collapsed state rules:

```css
/* ========================================
   SIDEBAR COLLAPSED STATE
   ======================================== */
.app-layout.sidebar-collapsed .sidebar {
  transform: translateX(-100%);
}

.app-layout.sidebar-collapsed .main-content {
  margin-left: 0;
}

.app-layout.sidebar-collapsed .header {
  left: 0;
}

/* Desktop-only sidebar toggle button */
.sidebar-toggle-btn {
  display: flex;
}
```

- [ ] **Step 5: Hide `.sidebar-toggle-btn` on mobile**

In the existing `@media (max-width: 768px)` block (around line 1963), add:
```css
.sidebar-toggle-btn {
    display: none;
}
```

- [ ] **Step 6: Verify build passes**

```bash
npm run build
```

Expected: no errors. Warnings about unused vars are fine.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css
git commit -m "feat(css): sidebar collapsed state, transitions, overflow-x fix"
```

---

### Task 2: AppShell — sidebarCollapsed state

**Files:**
- Modify: `components/AppShell.js`

Context: Current file uses `useState`, `useCallback`, imports `Sidebar`, `Header`. Has `sidebarOpen` for mobile. Full file is 57 lines.

- [ ] **Step 1: Add `sidebarCollapsed` state and localStorage persistence**

Replace the entire `components/AppShell.js` with:

```javascript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import GlobalSearch from '@/components/ui/GlobalSearch';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AppShell({ children }) {
    const pathname = usePathname();
    const { status } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved === 'true') setSidebarCollapsed(true);
    }, []);

    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);
    const toggleSidebarCollapsed = useCallback(() => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebarCollapsed', String(next));
            return next;
        });
    }, []);

    // Login page and public pages: no shell
    const noShellPaths = ['/login'];
    const isNoShell = noShellPaths.some(p => pathname.startsWith(p)) || pathname.includes('/pdf');

    if (isNoShell || status === 'unauthenticated') {
        return children;
    }

    // Loading state
    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1C3A6B, #2A5298)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#C9A84C', fontSize: 20, fontWeight: 700 }}>H</div>
                    <p style={{ color: '#666' }}>Đang tải...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
            <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />
            <div className="main-content">
                <Header
                    onMenuToggle={toggleSidebar}
                    onSearchOpen={() => setSearchOpen(true)}
                    onSidebarToggle={toggleSidebarCollapsed}
                    sidebarCollapsed={sidebarCollapsed}
                />
                <main className="page-content">
                    <Breadcrumbs />
                    <ErrorBoundary>{children}</ErrorBoundary>
                </main>
            </div>
            <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            <KeyboardShortcuts />
        </div>
    );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/AppShell.js
git commit -m "feat(appshell): add sidebarCollapsed state with localStorage persistence"
```

---

### Task 3: Header — desktop toggle button

**Files:**
- Modify: `components/Header.js`

Context: Current function signature is `Header({ onMenuToggle, onSearchOpen })`. The `header-left` div contains `.mobile-menu-btn` (☰, only shown on mobile via CSS) then `header-title`. We add a new desktop-only button after `mobile-menu-btn`.

- [ ] **Step 1: Add PanelLeftClose/PanelLeftOpen import**

Find this line in `components/Header.js`:
```javascript
import { Sun, Moon, Settings, LogOut, Search, Menu } from 'lucide-react';
```

Replace with:
```javascript
import { Sun, Moon, Settings, LogOut, Search, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
```

- [ ] **Step 2: Update function signature to accept new props**

Find:
```javascript
export default function Header({ onMenuToggle, onSearchOpen }) {
```

Replace with:
```javascript
export default function Header({ onMenuToggle, onSearchOpen, onSidebarToggle, sidebarCollapsed }) {
```

- [ ] **Step 3: Add toggle button in header-left**

Find:
```jsx
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Mở menu">
                    <Menu size={22} />
                </button>
                <h2 className="header-title">{title}</h2>
```

Replace with:
```jsx
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Mở menu">
                    <Menu size={22} />
                </button>
                <button
                    className="header-btn sidebar-toggle-btn"
                    onClick={onSidebarToggle}
                    title={sidebarCollapsed ? 'Mở sidebar' : 'Ẩn sidebar'}
                    aria-label={sidebarCollapsed ? 'Mở sidebar' : 'Ẩn sidebar'}
                >
                    {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                </button>
                <h2 className="header-title">{title}</h2>
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Run existing tests to confirm nothing broken**

```bash
npm test
```

Expected: all tests pass (tests cover lib utilities only, not components).

- [ ] **Step 6: Manual verification checklist**

Open http://localhost:3000 and verify:
- [ ] Desktop (≥769px): toggle button visible in header, left of page title
- [ ] Click toggle: sidebar slides out (0.25s), content expands to full width, header shifts left
- [ ] Click toggle again: sidebar slides back in
- [ ] Refresh page: collapsed state persists (localStorage)
- [ ] Mobile (≤768px): toggle button hidden, mobile ☰ still works
- [ ] No horizontal scrollbar on any page at 1920×1080

- [ ] **Step 7: Commit**

```bash
git add components/Header.js
git commit -m "feat(header): add desktop sidebar toggle button"
```
