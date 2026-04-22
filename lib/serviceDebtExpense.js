import { generateCode } from '@/lib/generateCode';

/**
 * Khi thanh toán một service debt (debt có `allocationPlan`), tự sinh ProjectExpense
 * với các ExpenseAllocation chia pro-rata theo kế hoạch phân bổ.
 *
 * Chi phí dự án chỉ phát sinh theo SỐ TIỀN THỰC TRẢ, không phải toàn bộ hợp đồng.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {Object} debt - Debt đã load (phải có allocationPlan, recipientType, recipientId, recipientName, serviceCategory, description)
 * @param {number} paidAmount - Số tiền trả lần này
 * @param {string} userId - User thực hiện thanh toán
 * @param {Date|string} date - Ngày thanh toán
 * @returns {Promise<Object|null>} ProjectExpense vừa tạo, hoặc null nếu không phải service debt
 */
export async function createServiceExpenseFromPayment(tx, debt, paidAmount, userId, date) {
    if (!debt?.allocationPlan || !Array.isArray(debt.allocationPlan) || debt.allocationPlan.length === 0) {
        return null;
    }

    const code = await generateCode('projectExpense', 'CP');
    const expense = await tx.projectExpense.create({
        data: {
            code,
            expenseType: 'Dịch vụ',
            description: debt.description,
            category: debt.serviceCategory || 'Dịch vụ',
            amount: paidAmount,
            paidAmount,
            status: 'Đã chi',
            date: date ? new Date(date) : new Date(),
            recipientType: debt.recipientType || '',
            recipientId: debt.recipientId || '',
            recipientName: debt.recipientName || '',
            submittedBy: userId,
            approvedBy: userId,
            notes: `Tự sinh từ TT công nợ ${debt.code}`,
        },
    });

    // Pro-rata allocation theo kế hoạch
    const allocations = debt.allocationPlan.map(a => ({
        expenseId: expense.id,
        projectId: a.projectId,
        amount: Math.round(paidAmount * a.ratio),
        ratio: a.ratio,
        notes: `Phân bổ ${Math.round(a.ratio * 100)}% từ công nợ ${debt.code}`,
    }));

    // Cân bằng chênh lệch do rounding vào allocation cuối
    const allocSum = allocations.reduce((s, a) => s + a.amount, 0);
    const diff = paidAmount - allocSum;
    if (diff !== 0 && allocations.length > 0) {
        allocations[allocations.length - 1].amount += diff;
    }

    await tx.expenseAllocation.createMany({ data: allocations });

    return expense;
}
