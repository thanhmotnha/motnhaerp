'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import { CONTRACT_TYPES, PAYMENT_TEMPLATES, CONTRACT_STATUSES, TYPE_ICONS } from '@/lib/contractTemplates';
import { PRESET_CATEGORIES, QUOTATION_TYPES, UNIT_OPTIONS, DEFAULT_UNIT_OPTIONS } from '@/lib/quotation-constants';
import { BUDGET_TEMPLATES_DEFAULT, COST_TYPES, GROUP1_PRESETS } from '@/lib/budgetTemplates';
import BudgetTemplateTab from '@/components/settings/BudgetTemplateTab';
import ScheduleTemplateTab from '@/components/settings/ScheduleTemplateTab';
import UsersTab from '@/components/settings/UsersTab';
import ActivityLogTab from '@/components/settings/ActivityLogTab';
import PdfCoverTab from '@/components/settings/PdfCoverTab';
import QuotationTermsTab from '@/components/settings/QuotationTermsTab';
import ContractTemplateTab from '@/components/settings/ContractTemplateTab';
import AccountingSetupTab from '@/components/settings/AccountingSetupTab';
import IntegrationTab from '@/components/settings/IntegrationTab';
import ExpenseCategoriesTab from '@/components/settings/ExpenseCategoriesTab';
import PartnerTypesTab from '@/components/settings/PartnerTypesTab';
import PartnersPage from '@/app/partners/page';

// ========= Company Settings Keys =========
const SETTING_KEYS = [
    { key: 'company_name', label: 'Tên công ty', type: 'text', default: 'MỘT NHÀ', group: 'company' },
    { key: 'company_address', label: 'Địa chỉ', type: 'text', default: '', group: 'company' },
    { key: 'company_phone', label: 'Số điện thoại', type: 'text', default: '', group: 'company' },
    { key: 'company_email', label: 'Email', type: 'text', default: '', group: 'company' },
    { key: 'company_tax_code', label: 'Mã số thuế', type: 'text', default: '', group: 'company' },
    { key: 'company_bank_account', label: 'Số tài khoản', type: 'text', default: '', group: 'company' },
    { key: 'company_bank_name', label: 'Ngân hàng', type: 'text', default: '', group: 'company' },
    { key: 'default_vat', label: 'VAT mặc định (%)', type: 'number', default: '10', group: 'defaults' },
    { key: 'default_mgmt_fee', label: 'Phí quản lý mặc định (%)', type: 'number', default: '5', group: 'defaults' },
    { key: 'warranty_months', label: 'Bảo hành (tháng)', type: 'number', default: '12', group: 'defaults' },
    { key: 'payment_terms_default', label: 'Điều khoản thanh toán mặc định', type: 'textarea', default: 'Thanh toán theo tiến độ thi công', group: 'defaults' },
    { key: 'email_footer', label: 'Footer email', type: 'textarea', default: 'Trân trọng, MỘT NHÀ Team', group: 'defaults' },
    { key: 'smtp_host', label: 'SMTP Host', type: 'text', default: '', group: 'email' },
    { key: 'smtp_port', label: 'SMTP Port', type: 'number', default: '587', group: 'email' },
    { key: 'smtp_user', label: 'SMTP Username', type: 'text', default: '', group: 'email' },
    { key: 'smtp_pass', label: 'SMTP Password', type: 'password', default: '', group: 'email' },
    { key: 'smtp_from', label: 'Email gửi (From)', type: 'text', default: '', group: 'email' },
    { key: 'smtp_secure', label: 'SSL/TLS', type: 'text', default: 'false', group: 'email' },
];

const MAIN_TABS = [
    { key: 'company', label: '🏢 Công ty' },
    { key: 'templates', label: '📋 Mẫu biểu' },
    { key: 'pdf_covers', label: '📎 PDF Bìa' },
    { key: 'users', label: '👥 Tài khoản' },
    { key: 'contract_templates', label: '📝 Mẫu HĐ' },
    { key: 'activity', label: '📝 Nhật ký' },
    { key: 'accounting', label: '📒 Kế toán' },
    { key: 'expense_categories', label: '🗂️ Hạng mục chi' },
    { key: 'integration', label: '🔌 Tích hợp' },
    { key: 'partners', label: '🤝 Đối tác' },
    { key: 'partner_types', label: '🗂️ Loại NCC & Thầu' },
];

const SUB_TABS = [
    { key: 'payment', label: '💵 Thanh toán', icon: '💵' },
    { key: 'budget', label: '🧱 Dự toán', icon: '🧱' },
    { key: 'quotation', label: '📋 Báo giá', icon: '📋' },
    { key: 'terms', label: '📜 Điều khoản', icon: '📜' },
    { key: 'schedule', label: '📅 Tiến độ', icon: '📅' },
];

export default function SettingsPage() {
    const { role } = useRole();
    const router = useRouter();
    const toast = useToast();
    const [tab, setTab] = useState('company');
    const [subTab, setSubTab] = useState('payment');
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [paymentTemplates, setPaymentTemplates] = useState({});
    const [quotationDefaults, setQuotationDefaults] = useState({
        vat: 10, managementFeeRate: 5, designFeeRate: 0, warranty: '12 tháng',
        terms: 'Thanh toán theo tiến độ thi công',
    });
    const [quotationCategories, setQuotationCategories] = useState([]);
    const [budgetTemplates, setBudgetTemplates] = useState({});
    const [unitOptions, setUnitOptions] = useState([...DEFAULT_UNIT_OPTIONS]);
    const [pdfCovers, setPdfCovers] = useState({ top: {}, bottom: {} });
    const [quotationTerms, setQuotationTerms] = useState({});

    useEffect(() => {
        if (role && role !== 'giam_doc' && role !== 'ke_toan') { router.replace('/'); return; }
        if (role === 'ke_toan') setTab('accounting');
        loadAll();
    }, [role]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/admin/settings');
            setSettings(data || {});
            if (data?.payment_templates) {
                try { setPaymentTemplates(JSON.parse(data.payment_templates)); } catch { setPaymentTemplates({ ...PAYMENT_TEMPLATES }); }
            } else { setPaymentTemplates({ ...PAYMENT_TEMPLATES }); }
            if (data?.quotation_defaults) {
                try { setQuotationDefaults(JSON.parse(data.quotation_defaults)); } catch { }
            }
            if (data?.quotation_categories) {
                try { setQuotationCategories(JSON.parse(data.quotation_categories)); } catch { setQuotationCategories([...PRESET_CATEGORIES]); }
            } else { setQuotationCategories([...PRESET_CATEGORIES]); }
            if (data?.budget_templates) {
                try { setBudgetTemplates(JSON.parse(data.budget_templates)); } catch { setBudgetTemplates({ ...BUDGET_TEMPLATES_DEFAULT }); }
            } else { setBudgetTemplates({ ...BUDGET_TEMPLATES_DEFAULT }); }
            if (data?.unit_options) {
                try { const parsed = JSON.parse(data.unit_options); if (Array.isArray(parsed) && parsed.length) setUnitOptions(parsed); } catch { }
            }
            if (data?.pdf_covers) {
                try { setPdfCovers(JSON.parse(data.pdf_covers)); } catch { setPdfCovers({ top: {}, bottom: {} }); }
            }
            if (data?.quotation_terms) {
                try { const parsed = JSON.parse(data.quotation_terms); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) setQuotationTerms(parsed); } catch { }
            }
        } catch {
            const defaults = {};
            SETTING_KEYS.forEach(s => { defaults[s.key] = s.default; });
            setSettings(defaults);
            setPaymentTemplates({ ...PAYMENT_TEMPLATES });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saveData = {
                ...settings,
                payment_templates: JSON.stringify(paymentTemplates),
                quotation_defaults: JSON.stringify(quotationDefaults),
                quotation_categories: JSON.stringify(quotationCategories),
                budget_templates: JSON.stringify(budgetTemplates),
                unit_options: JSON.stringify(unitOptions),
                pdf_covers: JSON.stringify(pdfCovers),
                quotation_terms: JSON.stringify(quotationTerms),
            };
            await apiFetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saveData),
            });
            toast.success('Đã lưu cài đặt');
        } catch (e) {
            toast.error(e.message || 'Lỗi lưu cài đặt');
        }
        setSaving(false);
    };

    // Payment Template helpers
    const addPhase = (type) => {
        setPaymentTemplates(prev => ({
            ...prev,
            [type]: [...(prev[type] || []), { phase: '', pct: 0, category: type.includes('Thiết kế') ? 'Thiết kế' : type.includes('nội thất') ? 'Nội thất' : 'Thi công' }],
        }));
    };
    const removePhase = (type, idx) => {
        setPaymentTemplates(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
    };
    const updatePhase = (type, idx, field, value) => {
        setPaymentTemplates(prev => ({
            ...prev,
            [type]: prev[type].map((p, i) => i === idx ? { ...p, [field]: field === 'pct' ? Number(value) : value } : p),
        }));
    };
    const addContractType = () => {
        const name = prompt('Nhập tên loại hợp đồng mới:');
        if (!name || paymentTemplates[name]) return;
        setPaymentTemplates(prev => ({ ...prev, [name]: [{ phase: 'Đặt cọc', pct: 30, category: 'Khác' }, { phase: 'Nghiệm thu', pct: 70, category: 'Khác' }] }));
    };
    const removeContractType = (type) => {
        if (!confirm(`Xoá loại HĐ "${type}" và tất cả đợt thanh toán?`)) return;
        setPaymentTemplates(prev => { const copy = { ...prev }; delete copy[type]; return copy; });
    };
    const renameContractType = (oldName) => {
        const newName = prompt(`Đổi tên loại HĐ "${oldName}":`, oldName);
        if (!newName || newName === oldName) return;
        if (paymentTemplates[newName]) { toast.error('Tên đã tồn tại'); return; }
        setPaymentTemplates(prev => {
            const copy = {};
            Object.entries(prev).forEach(([k, v]) => { copy[k === oldName ? newName : k] = v; });
            return copy;
        });
    };

    if (role && role !== 'giam_doc' && role !== 'ke_toan') return null;
    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h3>⚙️ Cài đặt & Mẫu biểu</h3>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt'}
                    </button>
                </div>

                {/* Main Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    {MAIN_TABS.filter(t => role === 'ke_toan' ? t.key === 'accounting' : true).map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{
                                padding: '12px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                border: 'none', background: tab === t.key ? 'var(--bg-primary)' : 'transparent',
                                color: tab === t.key ? 'var(--text-accent)' : 'var(--text-muted)',
                                borderBottom: tab === t.key ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                transition: 'all 0.15s',
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: 20 }}>
                    {/* ========== TAB: Company ========== */}
                    {tab === 'company' && (
                        <>
                            <SectionTitle icon="🏢" title="Thông tin công ty" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                {SETTING_KEYS.filter(s => s.group === 'company').map(s => (
                                    <div key={s.key} className="form-group">
                                        <label className="form-label">{s.label}</label>
                                        <input className="form-input" value={settings[s.key] || ''} onChange={e => setSettings({ ...settings, [s.key]: e.target.value })} />
                                    </div>
                                ))}
                            </div>

                            <SectionTitle icon="📋" title="Giá trị mặc định" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                                {SETTING_KEYS.filter(s => s.type === 'number').map(s => (
                                    <div key={s.key} className="form-group">
                                        <label className="form-label">{s.label}</label>
                                        <input className="form-input" type="number" value={settings[s.key] || ''} onChange={e => setSettings({ ...settings, [s.key]: e.target.value })} />
                                    </div>
                                ))}
                            </div>

                            <SectionTitle icon="📝" title="Template văn bản" />
                            {SETTING_KEYS.filter(s => s.type === 'textarea').map(s => (
                                <div key={s.key} className="form-group" style={{ marginBottom: 16 }}>
                                    <label className="form-label">{s.label}</label>
                                    <textarea className="form-input" rows={3} value={settings[s.key] || ''} onChange={e => setSettings({ ...settings, [s.key]: e.target.value })} style={{ resize: 'vertical' }} />
                                </div>
                            ))}

                            <SectionTitle icon="📧" title="Cấu hình Email (SMTP)" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                                {SETTING_KEYS.filter(s => s.group === 'email').map(s => (
                                    <div key={s.key} className="form-group">
                                        <label className="form-label">{s.label}</label>
                                        <input className="form-input" type={s.type === 'password' ? 'password' : s.type === 'number' ? 'number' : 'text'}
                                            value={settings[s.key] || ''} onChange={e => setSettings({ ...settings, [s.key]: e.target.value })}
                                            placeholder={s.key === 'smtp_host' ? 'smtp.gmail.com' : s.key === 'smtp_from' ? 'noreply@motnha.vn' : ''} />
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                💡 Gmail: Host=smtp.gmail.com, Port=587, SSL=false, dùng App Password. Zoho: smtp.zoho.com, Port=465, SSL=true.
                            </div>

                            <GeminiStatusWidget />
                        </>
                    )}

                    {/* ========== TAB: Templates ========== */}
                    {tab === 'templates' && (
                        <>
                            {/* Sub-tab pills */}
                            <div style={{
                                display: 'flex', gap: 0, marginBottom: 20,
                                border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
                                background: 'var(--bg-secondary)',
                            }}>
                                {SUB_TABS.map((st, i) => (
                                    <button key={st.key} onClick={() => setSubTab(st.key)}
                                        style={{
                                            flex: 1, padding: '12px 16px', fontWeight: 600, fontSize: 13,
                                            cursor: 'pointer', border: 'none', borderRight: i < SUB_TABS.length - 1 ? '1px solid var(--border)' : 'none',
                                            background: subTab === st.key ? 'var(--accent-primary)' : 'transparent',
                                            color: subTab === st.key ? '#fff' : 'var(--text-secondary)',
                                            transition: 'all 0.15s',
                                        }}>
                                        {st.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sub-tab content */}
                            {subTab === 'payment' && (
                                <PaymentTemplateContent
                                    paymentTemplates={paymentTemplates}
                                    addPhase={addPhase} removePhase={removePhase} updatePhase={updatePhase}
                                    addContractType={addContractType} removeContractType={removeContractType} renameContractType={renameContractType}
                                />
                            )}

                            {subTab === 'budget' && (
                                <BudgetTemplateTab
                                    budgetTemplates={budgetTemplates}
                                    setBudgetTemplates={setBudgetTemplates}
                                    toast={toast}
                                />
                            )}

                            {subTab === 'quotation' && (
                                <QuotationTemplateContent
                                    quotationDefaults={quotationDefaults}
                                    setQuotationDefaults={setQuotationDefaults}
                                    quotationCategories={quotationCategories}
                                    setQuotationCategories={setQuotationCategories}
                                    unitOptions={unitOptions}
                                    setUnitOptions={setUnitOptions}
                                />
                            )}

                            {subTab === 'terms' && (
                                <QuotationTermsTab value={quotationTerms} onChange={setQuotationTerms} />
                            )}

                            {subTab === 'schedule' && (
                                <ScheduleTemplateTab toast={toast} />
                            )}
                        </>
                    )}

                    {tab === 'users' && (
                        <div style={{ padding: 20 }}>
                            <UsersTab />
                        </div>
                    )}

                    {tab === 'pdf_covers' && (
                        <div style={{ padding: 20 }}>
                            <PdfCoverTab pdfCovers={pdfCovers} setPdfCovers={setPdfCovers} toast={toast} />
                        </div>
                    )}

                    {tab === 'contract_templates' && (
                        <div style={{ padding: 20 }}>
                            <ContractTemplateTab />
                        </div>
                    )}

                    {tab === 'activity' && (
                        <div style={{ padding: 20 }}>
                            <ActivityLogTab />
                        </div>
                    )}
                    {tab === 'accounting' && <AccountingSetupTab />}
                    {tab === 'expense_categories' && <ExpenseCategoriesTab />}
                    {tab === 'integration' && <IntegrationTab />}
                    {tab === 'partners' && <PartnersPage />}
                    {tab === 'partner_types' && <PartnerTypesTab />}
                </div>
            </div>
        </div>
    );
}

// ====== Payment sub-tab ======
function PaymentTemplateContent({ paymentTemplates, addPhase, removePhase, updatePhase, addContractType, removeContractType, renameContractType }) {
    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <SectionTitle icon="💵" title="Mẫu đợt thanh toán theo loại HĐ" />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-8px 0 0 0' }}>Mỗi loại hợp đồng có các đợt thanh toán mặc định. Khi tạo HĐ mới, hệ thống tự tạo đợt TT theo mẫu.</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addContractType}>➕ Thêm loại HĐ</button>
            </div>

            {Object.entries(paymentTemplates).map(([type, phases]) => {
                const total = phases.reduce((s, p) => s + (p.pct || 0), 0);
                const icon = TYPE_ICONS[type] || '📄';
                return (
                    <div key={type} style={{ marginBottom: 20, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{icon} {type}
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px', color: 'var(--text-muted)' }} onClick={() => renameContractType(type)} title="Đổi tên">✏️</button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: total === 100 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600 }}>
                                    Tổng: {total}% {total !== 100 && '⚠️'}
                                </span>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => removeContractType(type)}>🗑️</button>
                            </div>
                        </div>
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead><tr><th style={{ width: 40 }}>#</th><th>Tên đợt</th><th style={{ width: 90 }}>% Giá trị</th><th style={{ width: 120 }}>Phân loại</th><th style={{ width: 50 }}></th></tr></thead>
                            <tbody>
                                {phases.map((p, i) => (
                                    <tr key={i}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                                        <td><input className="form-input" value={p.phase} onChange={e => updatePhase(type, i, 'phase', e.target.value)} style={{ fontSize: 13 }} /></td>
                                        <td><input className="form-input" type="number" min={0} max={100} value={p.pct} onChange={e => updatePhase(type, i, 'pct', e.target.value)} style={{ fontSize: 13, textAlign: 'center' }} /></td>
                                        <td><input className="form-input" value={p.category} onChange={e => updatePhase(type, i, 'category', e.target.value)} style={{ fontSize: 12 }} /></td>
                                        <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 12 }} onClick={() => removePhase(type, i)}>✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => addPhase(type)}>➕ Thêm đợt</button>
                        </div>
                    </div>
                );
            })}
        </>
    );
}

// ====== Quotation sub-tab ======
function QuotationTemplateContent({ quotationDefaults, setQuotationDefaults, quotationCategories, setQuotationCategories, unitOptions, setUnitOptions }) {
    return (
        <>
            <SectionTitle icon="📋" title="Giá trị mặc định báo giá" />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Khi tạo báo giá mới, hệ thống sẽ dùng các giá trị này làm mặc định.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                    <label className="form-label">VAT (%)</label>
                    <input className="form-input" type="number" value={quotationDefaults.vat || ''} onChange={e => setQuotationDefaults({ ...quotationDefaults, vat: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                    <label className="form-label">Phí quản lý (%)</label>
                    <input className="form-input" type="number" value={quotationDefaults.managementFeeRate || ''} onChange={e => setQuotationDefaults({ ...quotationDefaults, managementFeeRate: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                    <label className="form-label">Phí thiết kế (%)</label>
                    <input className="form-input" type="number" value={quotationDefaults.designFeeRate || ''} onChange={e => setQuotationDefaults({ ...quotationDefaults, designFeeRate: Number(e.target.value) })} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                    <label className="form-label">Bảo hành mặc định</label>
                    <input className="form-input" value={quotationDefaults.warranty || ''} onChange={e => setQuotationDefaults({ ...quotationDefaults, warranty: e.target.value })} />
                </div>
                <div className="form-group">
                    <label className="form-label">Điều khoản thanh toán</label>
                    <input className="form-input" value={quotationDefaults.terms || ''} onChange={e => setQuotationDefaults({ ...quotationDefaults, terms: e.target.value })} />
                </div>
            </div>

            {/* Quotation Category Templates */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <SectionTitle icon="🗂️" title="Mẫu hạng mục báo giá" />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-8px 0 0 0' }}>Cây hạng mục mặc định khi tạo báo giá mới. Gồm Nhóm chính → Phân nhóm con.</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setQuotationCategories([...PRESET_CATEGORIES])}>🔄 Reset mặc định</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setQuotationCategories(prev => [...prev, { name: 'Nhóm mới', subcategories: ['Phân nhóm 1'] }])}>
                        ➕ Thêm nhóm
                    </button>
                </div>
            </div>

            {quotationCategories.map((cat, ci) => (
                <div key={ci} style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <span style={{ fontSize: 16 }}>📁</span>
                            <input className="form-input" value={cat.name}
                                onChange={e => setQuotationCategories(prev => prev.map((c, i) => i === ci ? { ...c, name: e.target.value } : c))}
                                style={{ fontSize: 14, fontWeight: 700, border: 'none', background: 'transparent', padding: '4px 8px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <span className="badge muted" style={{ fontSize: 10 }}>{cat.subcategories?.length || 0} phân nhóm</span>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 11 }}
                                onClick={() => { if (confirm(`Xoá nhóm "${cat.name}"?`)) setQuotationCategories(prev => prev.filter((_, i) => i !== ci)); }}>
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div style={{ padding: '8px 16px 12px' }}>
                        {(cat.subcategories || []).map((sub, si) => (
                            <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, width: 20, textAlign: 'center' }}>{si + 1}</span>
                                <span style={{ fontSize: 12 }}>📄</span>
                                <input className="form-input" value={sub}
                                    onChange={e => setQuotationCategories(prev => prev.map((c, i) => i === ci ? { ...c, subcategories: c.subcategories.map((s, j) => j === si ? e.target.value : s) } : c))}
                                    style={{ fontSize: 13, flex: 1 }} />
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 11, padding: '2px 6px' }}
                                    onClick={() => setQuotationCategories(prev => prev.map((c, i) => i === ci ? { ...c, subcategories: c.subcategories.filter((_, j) => j !== si) } : c))}>
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, marginTop: 4 }}
                            onClick={() => setQuotationCategories(prev => prev.map((c, i) => i === ci ? { ...c, subcategories: [...(c.subcategories || []), ''] } : c))}>
                            ➕ Thêm phân nhóm
                        </button>
                    </div>
                </div>
            ))}

            {/* ĐVT Management */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 24 }}>
                <div>
                    <SectionTitle icon="📏" title="Đơn vị tính (ĐVT)" />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-8px 0 0 0' }}>Danh sách ĐVT hiển thị trong dropdown khi tạo báo giá.</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setUnitOptions([...DEFAULT_UNIT_OPTIONS])}>🔄 Reset mặc định</button>
                </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {unitOptions.map((u, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12 }}>
                        {u}
                        <button onClick={() => setUnitOptions(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}>✕</button>
                    </span>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
                <input id="new-unit-input" className="form-input" placeholder="Thêm ĐVT mới..." style={{ maxWidth: 200, fontSize: 13 }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                            const v = e.target.value.trim();
                            if (!unitOptions.includes(v)) setUnitOptions(prev => [...prev, v]);
                            e.target.value = '';
                        }
                    }} />
                <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }} onClick={() => {
                    const inp = document.getElementById('new-unit-input');
                    if (inp && inp.value.trim()) {
                        const v = inp.value.trim();
                        if (!unitOptions.includes(v)) setUnitOptions(prev => [...prev, v]);
                        inp.value = '';
                    }
                }}>➕ Thêm</button>
            </div>

            <SectionTitle icon="📐" title="Loại báo giá" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUOTATION_TYPES.map(t => <span key={t} className="badge info" style={{ fontSize: 12 }}>{t}</span>)}
            </div>
        </>
    );
}

function SectionTitle({ icon, title }) {
    return (
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {icon} {title}
        </h4>
    );
}

function GeminiStatusWidget() {
    const [status, setStatus] = useState(null);
    const [checking, setChecking] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [savingKey, setSavingKey] = useState(false);
    const [keyLoaded, setKeyLoaded] = useState(false);

    useEffect(() => {
        apiFetch('/api/admin/settings').then(data => {
            if (data?.gemini_api_key) { setApiKey(data.gemini_api_key); setKeyLoaded(true); }
        }).catch(() => { });
    }, []);

    const checkStatus = async () => {
        setChecking(true);
        try {
            const data = await apiFetch('/api/admin/gemini-status');
            setStatus(data);
        } catch (e) {
            setStatus({ configured: false, status: 'error', message: e.message });
        }
        setChecking(false);
    };

    const saveKey = async () => {
        if (!apiKey.trim()) return;
        setSavingKey(true);
        try {
            await apiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ gemini_api_key: apiKey.trim() }) });
            setKeyLoaded(true);
            checkStatus();
        } catch (e) { alert('Lỗi lưu: ' + e.message); }
        setSavingKey(false);
    };

    const statusColor = !status ? 'var(--text-muted)' : status.status === 'active' ? 'var(--status-success)' : status.status === 'error' ? 'var(--status-danger)' : 'var(--status-warning)';
    const statusIcon = !status ? '❓' : status.status === 'active' ? '✅' : status.status === 'error' ? '❌' : '⚠️';

    return (
        <div style={{ marginTop: 24 }}>
            <SectionTitle icon="🤖" title="AI / Gemini API" />
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Google Gemini API</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Dùng cho: OCR ảnh dự toán, nhận dạng chuyển khoản, phân tích nhật ký
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={checkStatus} disabled={checking} style={{ fontSize: 11 }}>
                        {checking ? '⏳ Đang kiểm tra...' : '🔍 Kiểm tra kết nối'}
                    </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>API Key</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input className="form-input" type={showKey ? 'text' : 'password'} value={apiKey}
                                onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..."
                                style={{ fontSize: 12, paddingRight: 36 }} />
                            <button onClick={() => setShowKey(!showKey)}
                                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}>
                                {showKey ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={saveKey} disabled={savingKey || !apiKey.trim()} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                            {savingKey ? '⏳' : '💾 Lưu key'}
                        </button>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        Lấy key tại <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style={{ color: 'var(--accent-primary)' }}>Google AI Studio</a> → tạo free
                    </div>
                </div>

                {status && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        borderRadius: 8, fontSize: 12,
                        background: status.status === 'active' ? 'rgba(34,197,94,0.08)' : status.status === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    }}>
                        <span style={{ fontSize: 16 }}>{statusIcon}</span>
                        <div>
                            <div style={{ fontWeight: 600, color: statusColor }}>{status.message}</div>
                            {status.model && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Model: {status.model}</div>}
                            {status.keyPreview && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Key: {status.keyPreview}</div>}
                        </div>
                    </div>
                )}

                {!status && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Nhập API Key rồi bấm "Kiểm tra kết nối" để verify
                    </div>
                )}
            </div>
        </div>
    );
}
