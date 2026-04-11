# HR Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow uploading the company handbook (Word file) to R2, display a download link in HR page for all staff.

**Architecture:** Upload to R2 as `hr/handbook.docx` (fixed key, overwritten on re-upload). Store nothing in DB — just check R2 for existence. Simple upload UI + download link.

**Tech Stack:** Next.js App Router, Cloudflare R2 (`lib/r2.js`), withAuth

---

### Task 1: Create handbook API route

**Files:**
- Create: `app/api/hr/handbook/route.js`

- [ ] **Step 1: Create route**

```javascript
// app/api/hr/handbook/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import { uploadToR2, isR2Configured } from '@/lib/r2.js';

const HANDBOOK_KEY = 'hr/handbook.docx';

export const GET = withAuth(async () => {
    if (!isR2Configured) return NextResponse.json({ url: null, configured: false });
    const publicBase = process.env.R2_PUBLIC_URL || `https://${process.env.R2_BUCKET_NAME}.r2.dev`;
    const url = `${publicBase.replace(/\/$/, '')}/${HANDBOOK_KEY}`;
    return NextResponse.json({ url, configured: true });
});

export const POST = withAuth(async (request) => {
    if (!isR2Configured) return NextResponse.json({ error: 'R2 chưa cấu hình' }, { status: 500 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(buffer, HANDBOOK_KEY, file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    return NextResponse.json({ url, success: true });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hr/handbook/route.js
git commit -m "feat(hr): add handbook upload/download API"
```

---

### Task 2: Create `HandbookTab` component

**Files:**
- Create: `components/hr/HandbookTab.js`

- [ ] **Step 1: Create component**

```javascript
'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

export default function HandbookTab() {
    const [handbookUrl, setHandbookUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();
    const toast = useToast();

    const load = async () => {
        try {
            const d = await apiFetch('/api/hr/handbook');
            setHandbookUrl(d.url);
        } catch { /* R2 not configured or no file */ }
    };

    useEffect(() => { load(); }, []);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
            return toast.error('Chỉ hỗ trợ file .docx hoặc .doc');
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/hr/handbook', { method: 'POST', body: formData });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi upload');
            setHandbookUrl(d.url);
            toast.success('Đã cập nhật sổ tay nhân sự');
        } catch (err) { toast.error(err.message); }
        finally { setUploading(false); }
    };

    return (
        <div>
            <div className="card-header" style={{ marginBottom: 24 }}>
                <span className="card-title">📖 Sổ tay nhân sự</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={fileRef} type="file" accept=".docx,.doc" style={{ display: 'none' }} onChange={handleUpload} />
                    <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? 'Đang tải lên...' : '⬆ Cập nhật file'}
                    </button>
                </div>
            </div>

            {handbookUrl ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>📘</div>
                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Sổ tay nhân sự công ty</p>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
                        Tài liệu nội bộ — Vui lòng đọc kỹ và tuân thủ các quy định của công ty
                    </p>
                    <a
                        href={handbookUrl}
                        download="SoTayNhanSu.docx"
                        className="btn btn-primary"
                        target="_blank"
                        rel="noreferrer"
                    >
                        ⬇ Tải về sổ tay nhân sự
                    </a>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                    <p>Chưa có sổ tay nhân sự</p>
                    <p style={{ fontSize: 13 }}>Giám đốc/Kế toán có thể tải lên file Word</p>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hr/HandbookTab.js
git commit -m "feat(hr): add HandbookTab component for handbook upload/download"
```

---

### Task 3: Add Handbook tab to HR page

**Files:**
- Modify: `app/hr/page.js`

- [ ] **Step 1: Add dynamic import**

Find existing dynamic imports and add:

```javascript
const HandbookTab = dynamic(() => import('@/components/hr/HandbookTab'), { ssr: false });
```

- [ ] **Step 2: Add tab button**

Find the tab switcher and add:

```javascript
{ key: 'handbook', label: '📖 Sổ tay' },
```

- [ ] **Step 3: Add render case**

```javascript
{activeTab === 'handbook' && <HandbookTab />}
```

- [ ] **Step 4: Commit**

```bash
git add app/hr/page.js
git commit -m "feat(hr): add Handbook tab to HR page"
```
