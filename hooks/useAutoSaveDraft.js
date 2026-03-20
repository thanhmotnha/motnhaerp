'use client';
import { useEffect, useRef, useState } from 'react';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEBOUNCE_MS = 3000;
const SERVER_DEBOUNCE_MS = 10000; // server save every 10s

export default function useAutoSaveDraft({ key, data, onRestore, enabled = true, serverSync = false }) {
    const [restored, setRestored] = useState(false);
    const timerRef = useRef(null);
    const serverTimerRef = useRef(null);
    const initialRef = useRef(true);

    // On mount: check for draft and offer restore (server first, then localStorage fallback)
    useEffect(() => {
        if (!key || restored) return;

        const restoreDraft = async () => {
            let draft = null;

            // Try server first
            if (serverSync) {
                try {
                    const res = await fetch(`/api/drafts/${encodeURIComponent(key)}`);
                    if (res.ok) {
                        const serverDraft = await res.json();
                        if (serverDraft && serverDraft._savedAt) {
                            if (Date.now() - serverDraft._savedAt <= EXPIRY_MS) {
                                draft = serverDraft;
                            }
                        }
                    }
                } catch { /* server unavailable, fallback to localStorage */ }
            }

            // Fallback to localStorage
            if (!draft) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const localDraft = JSON.parse(raw);
                        if (localDraft?._savedAt && Date.now() - localDraft._savedAt <= EXPIRY_MS) {
                            draft = localDraft;
                        } else {
                            localStorage.removeItem(key);
                        }
                    }
                } catch { /* ignore parse errors */ }
            }

            // Pick the most recent draft
            if (draft) {
                const { _savedAt, ...draftData } = draft;
                onRestore(draftData);
            }
            setRestored(true);
        };

        restoreDraft();
    }, [key]);

    // Debounced save to localStorage
    useEffect(() => {
        if (!key || !enabled || !restored) return;
        if (initialRef.current) {
            initialRef.current = false;
            return;
        }
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify({ ...data, _savedAt: Date.now() }));
            } catch { /* quota exceeded */ }
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [key, data, enabled, restored]);

    // Debounced save to server (less frequent)
    useEffect(() => {
        if (!key || !enabled || !restored || !serverSync) return;
        if (initialRef.current) return;
        if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
        serverTimerRef.current = setTimeout(() => {
            fetch(`/api/drafts/${encodeURIComponent(key)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }).catch(() => { /* silently ignore server save failures */ });
        }, SERVER_DEBOUNCE_MS);

        return () => {
            if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
        };
    }, [key, data, enabled, restored, serverSync]);

    const clearDraft = () => {
        try { localStorage.removeItem(key); } catch {}
        if (serverSync) {
            fetch(`/api/drafts/${encodeURIComponent(key)}`, { method: 'DELETE' }).catch(() => {});
        }
    };

    return { clearDraft };
}
