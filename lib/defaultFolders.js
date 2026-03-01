/**
 * Default folder template for new projects.
 * Each folder can have nested children.
 */
const DEFAULT_FOLDERS = [
    { name: '01. Hồ sơ Khảo sát & Pháp lý', order: 1 },
    { name: '02. Concept & Layout 2D', order: 2 },
    {
        name: '03. Phối cảnh 3D', order: 3,
        children: [
            { name: 'Kiến trúc', order: 1 },
            { name: 'Nội thất', order: 2 },
        ],
    },
    {
        name: '04. Bản vẽ Kỹ thuật Thi công', order: 4,
        children: [
            { name: 'MEP', order: 1 },
            { name: 'Kết cấu', order: 2 },
            { name: 'Kiến trúc', order: 3 },
        ],
    },
    { name: '05. Báo giá & Hợp đồng', order: 5 },
];

/**
 * Create default folders for a project inside a transaction.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} projectId
 */
export async function createDefaultFolders(tx, projectId) {
    for (const folder of DEFAULT_FOLDERS) {
        const parent = await tx.documentFolder.create({
            data: {
                name: folder.name,
                order: folder.order,
                projectId,
            },
        });
        if (folder.children) {
            for (const child of folder.children) {
                await tx.documentFolder.create({
                    data: {
                        name: child.name,
                        order: child.order,
                        parentId: parent.id,
                        projectId,
                    },
                });
            }
        }
    }
}
