'use client';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const STATUS_COLORS = {
    'Chưa bắt đầu': 'muted',
    'Đang thi công': 'warning',
    'Hoàn thành': 'success',
    'Quá hạn': 'danger',
};

export default function ScheduleListView({ tasks, flat, onUpdate, onDelete }) {
    // Render tasks recursively with indentation
    const renderTask = (task, depth = 0) => {
        const isGroup = task.children && task.children.length > 0;
        const isOverdue = task.status !== 'Hoàn thành' && new Date(task.endDate) < new Date();
        const actualStatus = isOverdue && task.status !== 'Hoàn thành' ? 'Quá hạn' : task.status;
        const hasBaseline = task.baselineStart && task.baselineEnd;
        const baselineEnd = hasBaseline ? new Date(task.baselineEnd) : null;
        const actualEnd = new Date(task.endDate);
        const delayDays = hasBaseline ? Math.ceil((actualEnd - baselineEnd) / 86400000) : 0;

        return (
            <div key={task.id}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 80px 80px 60px 120px 100px 40px',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    background: isGroup ? 'var(--bg-elevated)' : 'transparent',
                    fontSize: 13,
                }}>
                    {/* Name */}
                    <div style={{ paddingLeft: depth * 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isGroup && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>}
                        {task.color && <span style={{ width: 4, height: 20, borderRadius: 2, background: task.color, flexShrink: 0 }}></span>}
                        <span style={{ fontWeight: isGroup ? 700 : 500 }}>{task.wbs && <span style={{ color: 'var(--text-muted)', marginRight: 6, fontSize: 11 }}>{task.wbs}</span>}{task.name}</span>
                        {task.predecessorId && <span title="Có liên kết FS" style={{ fontSize: 10, color: 'var(--accent-primary)' }}>🔗</span>}
                        {delayDays > 0 && <span className="badge danger" style={{ fontSize: 10, padding: '1px 6px' }}>+{delayDays}d</span>}
                    </div>

                    {/* Assignee */}
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignee || '—'}</div>

                    {/* Start */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(task.startDate)}</div>

                    {/* End */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(task.endDate)}</div>

                    {/* Duration */}
                    <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-muted)' }}>{task.duration}d</div>

                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                            type="range" min="0" max="100" step="5"
                            value={task.progress}
                            onChange={e => onUpdate(task.id, { progress: Number(e.target.value) })}
                            style={{ width: 60, accentColor: task.progress === 100 ? 'var(--status-success)' : 'var(--accent-primary)' }}
                            disabled={isGroup}
                        />
                        <span style={{ fontWeight: 700, fontSize: 12, width: 32, textAlign: 'right', color: task.progress === 100 ? 'var(--status-success)' : 'var(--text-primary)' }}>{task.progress}%</span>
                    </div>

                    {/* Status */}
                    <div><span className={`badge ${STATUS_COLORS[actualStatus] || 'muted'}`} style={{ fontSize: 11 }}>{actualStatus}</span></div>

                    {/* Actions */}
                    <div>
                        <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 4 }} title="Xóa">🗑️</button>
                    </div>
                </div>
                {/* Children */}
                {task.children && [...task.children].sort((a, b) => a.order - b.order).map(child => renderTask(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 80px 80px 60px 120px 100px 40px',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'var(--bg-elevated)',
                borderBottom: '2px solid var(--border-color)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
            }}>
                <div>Hạng mục</div>
                <div>Phụ trách</div>
                <div>Bắt đầu</div>
                <div>Kết thúc</div>
                <div style={{ textAlign: 'center' }}>Ngày</div>
                <div>Tiến độ</div>
                <div>Trạng thái</div>
                <div></div>
            </div>
            {/* Tasks */}
            {tasks.map(t => renderTask(t, 0))}
            {tasks.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hạng mục</div>
            )}
        </div>
    );
}
