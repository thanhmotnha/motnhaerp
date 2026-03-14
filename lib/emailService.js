import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

/**
 * Get SMTP config from DB settings
 */
async function getSmtpConfig() {
    try {
        const settings = await prisma.setting.findMany({
            where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_secure'] } },
        });
        const cfg = {};
        settings.forEach(s => { cfg[s.key] = s.value; });

        if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) return null;

        return {
            host: cfg.smtp_host,
            port: parseInt(cfg.smtp_port) || 587,
            secure: cfg.smtp_secure === 'true',
            auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
            from: cfg.smtp_from || cfg.smtp_user,
        };
    } catch { return null; }
}

/**
 * Send email using SMTP settings from DB
 */
export async function sendEmail({ to, subject, html, text }) {
    const config = await getSmtpConfig();
    if (!config) throw new Error('Chưa cấu hình SMTP trong Settings');

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
    });

    const result = await transporter.sendMail({
        from: config.from,
        to,
        subject,
        html,
        text,
    });

    return result;
}

/**
 * Build contract email HTML
 */
export function buildContractEmailHtml({ contract, customer, publicUrl }) {
    const fmtCurrency = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <!-- Header -->
    <tr><td style="background:#234093;padding:20px 30px;text-align:center">
        <img src="https://pub-1e1be66737b446708af785e6cc8fe673.r2.dev/assets/motnha-header.jpg" alt="Một Nhà" style="max-width:100%;height:auto" />
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:30px">
        <h2 style="color:#234093;margin:0 0 8px;font-size:20px">Hợp đồng ${contract.type || ''}</h2>
        <p style="color:#64748b;font-size:13px;margin:0 0 20px">Mã: <strong style="color:#234093">${contract.code}</strong></p>

        <p style="font-size:14px;color:#1e293b;line-height:1.8;margin:0 0 20px">
            Kính gửi <strong>${customer?.name || 'Quý khách'}</strong>,<br><br>
            Một Nhà xin gửi đến Quý khách hợp đồng <strong>${contract.name || ''}</strong> 
            với giá trị <strong style="color:#234093">${fmtCurrency(contract.contractValue)}</strong>.
            ${contract.signDate ? `<br>Ngày ký dự kiến: <strong>${fmtDate(contract.signDate)}</strong>` : ''}
        </p>

        <!-- CTA Button -->
        <div style="text-align:center;margin:24px 0">
            <a href="${publicUrl}" target="_blank" style="display:inline-block;padding:14px 40px;background:#234093;color:#fff;text-decoration:none;border-radius:6px;font-weight:800;font-size:15px;letter-spacing:0.5px">
                📋 Xem hợp đồng
            </a>
        </div>

        <p style="font-size:12px;color:#94a3b8;margin:20px 0 0;text-align:center">
            Nếu có thắc mắc, vui lòng liên hệ Hotline: <strong style="color:#DBB35E">(+84) 948 869 89</strong>
        </p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#234093;padding:14px 30px;text-align:center">
        <p style="color:rgba(255,255,255,0.7);font-size:10px;margin:0">
            <strong style="color:#DBB35E">MỘT NHÀ</strong> — Nhà ở trọn gói / Nội thất thông minh | www.motnha.vn
        </p>
    </td></tr>
</table>
</body>
</html>`;
}
