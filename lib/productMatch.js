/**
 * Shared product matching utilities
 * Used by BudgetQuickAdd and BudgetTemplateTab
 */

// Normalize Vietnamese text for fuzzy matching
export const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').trim();

// Smart product matching: exact name > exact code > normalized includes > word intersection
export function findProduct(products, searchName) {
    if (!searchName || !products) return null;
    const s = searchName.trim();
    const sLow = s.toLowerCase();
    const sNorm = norm(s);

    // 1. Exact match (name or code)
    let match = products.find(p => p.name?.toLowerCase() === sLow || p.code?.toLowerCase() === sLow);
    if (match) return match;

    // 2. Normalized exact match
    match = products.find(p => norm(p.name) === sNorm);
    if (match) return match;

    // 3. Substring match (either A includes B or B includes A)
    match = products.find(p => norm(p.name).includes(sNorm) || sNorm.includes(norm(p.name)) || norm(p.code || '').includes(sNorm));
    if (match) return match;

    // 4. Word intersection match (all words in search term exist in product name)
    const searchWords = sNorm.split(' ').filter(Boolean);
    if (searchWords.length > 1) {
        match = products.find(p => {
            const pNorm = norm(p.name);
            return searchWords.every(w => pNorm.includes(w));
        });
        if (match) return match;
    }

    return null;
}
