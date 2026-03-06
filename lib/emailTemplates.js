/**
 * Email notification templates for the system.
 * These return HTML strings for use with any email service (Resend, SendGrid, etc).
 */

const BRAND_COLOR = '#234093';
const GOLD = '#DBB35E';

function baseTemplate(content) {
    return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:${BRAND_COLOR};padding:20px 24px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px">MỘT NHÀ ERP</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px">Hệ thống quản lý</div>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
        ${content}
    </div>
    <div style="text-align:center;padding:16px;font-size:11px;color:#94a3b8">
        © ${new Date().getFullYear()} MỘT NHÀ. Email tự động, vui lòng không trả lời.
    </div>
</div>
</body></html>`;
}

/**
 * Payment reminder email
 */
export function paymentReminderEmail({ customerName, projectName, phase, amount, dueDate, contractCode }) {
    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');

    return {
        subject: `[MỘT NHÀ] Nhắc thanh toán — ${phase} — ${contractCode}`,
        html: baseTemplate(`
            <h2 style="margin:0 0 16px;font-size:18px;color:${BRAND_COLOR}">Nhắc nhở thanh toán</h2>
            <p style="font-size:14px;color:#475569;margin-bottom:20px">
                Kính gửi <strong>${customerName}</strong>,
            </p>
            <p style="font-size:14px;color:#475569;margin-bottom:16px">
                Chúng tôi xin nhắc nhở về đợt thanh toán sắp đến hạn:
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px">
                <table style="width:100%;font-size:13px;color:#334155">
                    <tr><td style="padding:6px 0;color:#94a3b8">Dự án</td><td style="padding:6px 0;text-align:right;font-weight:600">${projectName}</td></tr>
                    <tr><td style="padding:6px 0;color:#94a3b8">Hợp đồng</td><td style="padding:6px 0;text-align:right;font-weight:600">${contractCode}</td></tr>
                    <tr><td style="padding:6px 0;color:#94a3b8">Đợt</td><td style="padding:6px 0;text-align:right;font-weight:600">${phase}</td></tr>
                    <tr><td style="padding:6px 0;color:#94a3b8">Số tiền</td><td style="padding:6px 0;text-align:right;font-weight:700;color:${BRAND_COLOR};font-size:16px">${fmt(amount)}</td></tr>
                    <tr><td style="padding:6px 0;color:#94a3b8">Hạn thanh toán</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#DC2626">${fmtDate(dueDate)}</td></tr>
                </table>
            </div>
            <p style="font-size:13px;color:#64748b">
                Vui lòng thanh toán đúng hạn để đảm bảo tiến độ dự án. Nếu đã thanh toán, xin bỏ qua email này.
            </p>
            <p style="font-size:13px;color:#64748b;margin-top:16px">
                Trân trọng,<br><strong style="color:${BRAND_COLOR}">MỘT NHÀ Team</strong>
            </p>
        `),
    };
}

/**
 * Project update notification
 */
export function projectUpdateEmail({ customerName, projectName, projectCode, progress, milestone, message }) {
    return {
        subject: `[MỘT NHÀ] Cập nhật dự án ${projectCode} — ${progress}%`,
        html: baseTemplate(`
            <h2 style="margin:0 0 16px;font-size:18px;color:${BRAND_COLOR}">Cập nhật tiến độ dự án</h2>
            <p style="font-size:14px;color:#475569;margin-bottom:16px">
                Kính gửi <strong>${customerName}</strong>,
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:16px">
                <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">Dự án</div>
                <div style="font-size:15px;font-weight:700;color:${BRAND_COLOR}">${projectCode} — ${projectName}</div>
                <div style="margin-top:12px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <span style="font-size:12px;color:#64748b">Tiến độ</span>
                        <span style="font-size:13px;font-weight:700;color:${BRAND_COLOR}">${progress}%</span>
                    </div>
                    <div style="height:8px;background:#e2e8f0;border-radius:4px">
                        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,${BRAND_COLOR},${GOLD});border-radius:4px"></div>
                    </div>
                </div>
                ${milestone ? `<div style="margin-top:12px;padding:8px 12px;background:rgba(35,64,147,0.06);border-radius:6px;font-size:13px">
                    ✅ <strong>${milestone}</strong>
                </div>` : ''}
            </div>
            ${message ? `<p style="font-size:13px;color:#475569">${message}</p>` : ''}
            <p style="font-size:13px;color:#64748b;margin-top:16px">
                Trân trọng,<br><strong style="color:${BRAND_COLOR}">MỘT NHÀ Team</strong>
            </p>
        `),
    };
}

/**
 * Welcome email for new customer
 */
export function welcomeCustomerEmail({ customerName, loginUrl }) {
    return {
        subject: `[MỘT NHÀ] Chào mừng ${customerName}!`,
        html: baseTemplate(`
            <h2 style="margin:0 0 16px;font-size:18px;color:${BRAND_COLOR}">Chào mừng đến với MỘT NHÀ!</h2>
            <p style="font-size:14px;color:#475569;margin-bottom:16px">
                Kính gửi <strong>${customerName}</strong>,
            </p>
            <p style="font-size:14px;color:#475569;margin-bottom:20px">
                Cảm ơn bạn đã tin tưởng MỘT NHÀ. Bạn có thể theo dõi tiến độ dự án, xem báo giá và lịch sử thanh toán trên cổng khách hàng.
            </p>
            ${loginUrl ? `<div style="text-align:center;margin:24px 0">
                <a href="${loginUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                    Truy cập cổng khách hàng →
                </a>
            </div>` : ''}
            <p style="font-size:13px;color:#64748b;margin-top:16px">
                Trân trọng,<br><strong style="color:${BRAND_COLOR}">MỘT NHÀ Team</strong>
            </p>
        `),
    };
}
