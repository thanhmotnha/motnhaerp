import { PDFDocument } from 'pdf-lib';

/**
 * Merge cover PDF pages with main content PDF.
 *
 * @param {Buffer} mainPdfBuffer  – The main content PDF
 * @param {Object} covers         – { top: { url }, bottom: { url } }
 * @param {string} [baseUrl]      – Base URL for resolving relative paths (e.g. http://localhost:3000)
 * @returns {Promise<Buffer>}     – Merged PDF buffer
 */
export async function mergePdfWithCovers(mainPdfBuffer, covers, baseUrl = '') {
    const merged = await PDFDocument.create();
    const mainDoc = await PDFDocument.load(mainPdfBuffer);

    // Helper: fetch a PDF from URL and return loaded PDFDocument
    async function fetchPdf(url) {
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
        const res = await fetch(fullUrl);
        if (!res.ok) throw new Error(`Failed to fetch PDF cover: ${fullUrl} (${res.status})`);
        const buf = await res.arrayBuffer();
        return PDFDocument.load(buf);
    }

    // 1. Prepend top cover pages
    if (covers?.top?.url) {
        try {
            const topDoc = await fetchPdf(covers.top.url);
            const topPages = await merged.copyPages(topDoc, topDoc.getPageIndices());
            topPages.forEach(p => merged.addPage(p));
        } catch (err) {
            console.error('[PdfCoverMerger] Top cover failed:', err.message);
        }
    }

    // 2. Copy all main content pages
    const mainPages = await merged.copyPages(mainDoc, mainDoc.getPageIndices());
    mainPages.forEach(p => merged.addPage(p));

    // 3. Append bottom cover pages
    if (covers?.bottom?.url) {
        try {
            const bottomDoc = await fetchPdf(covers.bottom.url);
            const bottomPages = await merged.copyPages(bottomDoc, bottomDoc.getPageIndices());
            bottomPages.forEach(p => merged.addPage(p));
        } catch (err) {
            console.error('[PdfCoverMerger] Bottom cover failed:', err.message);
        }
    }

    const mergedBytes = await merged.save();
    return Buffer.from(mergedBytes);
}
