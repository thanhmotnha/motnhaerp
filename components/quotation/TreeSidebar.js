'use client';
import { fmt } from '@/lib/quotation-constants';

export default function TreeSidebar({ hook, onClose }) {
    const {
        treeTab, setTreeTab, treeSearch, setTreeSearch,
        libTree, prodTree, expandedNodes, toggleNode,
        editingLibItem, setEditingLibItem, saveLibItem,
        editingLibCat, setEditingLibCat, saveLibCategory,
        editingProdCat, setEditingProdCat, saveProdCategory,
        addFromLibrary, addFromProduct,
        activeCategoryIdx, categories,
    } = hook;

    const renderTreeLeaf = (item, onClick, type = 'library') => {
        const price = type === 'products' ? item.salePrice : item.unitPrice;
        const isEditingThis = editingLibItem?.id === item.id;

        if (type === 'library') {
            return (
                <div key={item.id} className="tree-node tree-leaf"
                    onClick={() => !isEditingThis && onClick(item)}
                    title={`${item.description || item.name}\nĐG: ${fmt(price)}đ/${item.unit}`}>
                    {item.image ? (
                        <img src={item.image} alt="" className="tree-thumb" />
                    ) : (
                        <span className="tree-icon">+</span>
                    )}
                    {isEditingThis ? (
                        <input autoFocus value={editingLibItem.name}
                            onChange={e => setEditingLibItem(p => ({ ...p, name: e.target.value }))}
                            onBlur={saveLibItem}
                            onKeyDown={e => { if (e.key === 'Enter') saveLibItem(); if (e.key === 'Escape') setEditingLibItem(null); }}
                            onClick={e => e.stopPropagation()}
                            style={{ flex: 1, fontSize: 12, padding: '1px 4px', border: '1px solid var(--primary)', borderRadius: 3 }} />
                    ) : (
                        <span className="tree-label" onDoubleClick={e => { e.stopPropagation(); setEditingLibItem({ id: item.id, name: item.name }); }}>
                            {item.name}
                        </span>
                    )}
                    {price > 0 && <span className="tree-price">{fmt(price)}</span>}
                </div>
            );
        }

        return (
            <div key={item.id} className="tree-node tree-leaf"
                onClick={() => onClick(item)}
                title={`${item.description || ''}\nĐG: ${fmt(price)}đ/${item.unit}`}>
                {item.image ? (
                    <img src={item.image} alt="" className="tree-thumb" />
                ) : (
                    <span className="tree-icon">+</span>
                )}
                <span className="tree-label">{item.name}</span>
                <span className="tree-price">{fmt(price)}</span>
            </div>
        );
    };

    return (
        <div className="card tree-sidebar quotation-tree-sidebar" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                    <button className={`btn btn-sm ${treeTab === 'library' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setTreeTab('library')} style={{ flex: 1, fontSize: 11 }}>Hạng mục</button>
                    <button className={`btn btn-sm ${treeTab === 'products' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setTreeTab('products')} style={{ flex: 1, fontSize: 11 }}>Sản phẩm</button>
                    {onClose && (
                        <button className="btn btn-ghost btn-sm quotation-tree-close" onClick={onClose}
                            style={{ padding: '4px 8px', fontSize: 14 }}>✕</button>
                    )}
                </div>
                <input className="form-input form-input-compact" placeholder="Tìm kiếm..." value={treeSearch}
                    onChange={e => setTreeSearch(e.target.value)} style={{ width: '100%' }} />
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.5 }}>
                    → <strong style={{ color: 'var(--accent-primary)' }}>
                        {categories[activeCategoryIdx]?.name || `Hạng mục #${activeCategoryIdx + 1}`}
                    </strong>
                </div>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
                {treeTab === 'library' ? (
                    Object.entries(libTree).map(([cat, subs]) => {
                        const totalItems = Object.values(subs).reduce((s, arr) => s + arr.length, 0);
                        const hasSubcats = Object.keys(subs).some(k => k !== '');
                        return (
                            <div key={cat}>
                                <div className="tree-node tree-sub"
                                    onClick={() => editingLibCat?.old !== cat && toggleNode(`lib:${cat}`)}
                                    title="Double-click để đổi tên danh mục">
                                    <span className="tree-arrow">{expandedNodes[`lib:${cat}`] ? '▾' : '▸'}</span>
                                    <span className="tree-icon">🔨</span>
                                    {editingLibCat?.old === cat ? (
                                        <input autoFocus value={editingLibCat.name}
                                            onChange={e => setEditingLibCat(p => ({ ...p, name: e.target.value }))}
                                            onBlur={saveLibCategory}
                                            onKeyDown={e => { if (e.key === 'Enter') saveLibCategory(); if (e.key === 'Escape') setEditingLibCat(null); }}
                                            onClick={e => e.stopPropagation()}
                                            style={{ flex: 1, fontSize: 12, padding: '1px 4px', border: '1px solid var(--primary)', borderRadius: 3 }} />
                                    ) : (
                                        <span className="tree-label" onDoubleClick={e => { e.stopPropagation(); setEditingLibCat({ old: cat, name: cat }); }}>{cat}</span>
                                    )}
                                    <span className="tree-count">{totalItems}</span>
                                </div>
                                {expandedNodes[`lib:${cat}`] && (hasSubcats ? (
                                    Object.entries(subs).map(([sub, items]) => sub === '' ? (
                                        items.map(item => renderTreeLeaf(item, addFromLibrary, 'library'))
                                    ) : (
                                        <div key={sub} style={{ paddingLeft: 12 }}>
                                            <div className="tree-node tree-sub" onClick={() => toggleNode(`lib:${cat}:${sub}`)} style={{ fontSize: 12 }}>
                                                <span className="tree-arrow">{expandedNodes[`lib:${cat}:${sub}`] ? '▾' : '▸'}</span>
                                                <span className="tree-label" style={{ opacity: 0.7 }}>{sub}</span>
                                                <span className="tree-count">{items.length}</span>
                                            </div>
                                            {expandedNodes[`lib:${cat}:${sub}`] && items.map(item => renderTreeLeaf(item, addFromLibrary, 'library'))}
                                        </div>
                                    ))
                                ) : (
                                    Object.values(subs).flat().map(item => renderTreeLeaf(item, addFromLibrary, 'library'))
                                ))}
                            </div>
                        );
                    })
                ) : (
                    Object.entries(prodTree).map(([cat, items]) => (
                        <div key={cat}>
                            <div className="tree-node tree-sub"
                                onClick={() => editingProdCat?.old !== cat && toggleNode(cat)}
                                title="Double-click để đổi tên danh mục">
                                <span className="tree-arrow">{expandedNodes[cat] ? '▾' : '▸'}</span>
                                <span className="tree-icon">📦</span>
                                {editingProdCat?.old === cat ? (
                                    <input autoFocus value={editingProdCat.name}
                                        onChange={e => setEditingProdCat(p => ({ ...p, name: e.target.value }))}
                                        onBlur={saveProdCategory}
                                        onKeyDown={e => { if (e.key === 'Enter') saveProdCategory(); if (e.key === 'Escape') setEditingProdCat(null); }}
                                        onClick={e => e.stopPropagation()}
                                        style={{ flex: 1, fontSize: 12, padding: '1px 4px', border: '1px solid var(--primary)', borderRadius: 3 }} />
                                ) : (
                                    <span className="tree-label" onDoubleClick={e => { e.stopPropagation(); setEditingProdCat({ old: cat, name: cat }); }}>{cat}</span>
                                )}
                                <span className="tree-count">{items.length}</span>
                            </div>
                            {expandedNodes[cat] && items.map(item => renderTreeLeaf(item, addFromProduct, 'products'))}
                        </div>
                    ))
                )}
                {((treeTab === 'library' && Object.keys(libTree).length === 0) ||
                    (treeTab === 'products' && Object.keys(prodTree).length === 0)) && (
                        <div style={{ padding: 20, textAlign: 'center', opacity: 0.4, fontSize: 12 }}>
                            {treeSearch ? 'Không tìm thấy' : 'Chưa có dữ liệu'}
                        </div>
                    )}
            </div>
        </div>
    );
}
