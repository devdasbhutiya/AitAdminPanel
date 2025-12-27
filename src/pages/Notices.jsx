import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { noticesService, branchesService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import { formatTimestamp, SECTIONS, SEMESTERS } from '../utils/helpers';
import './Users.css';

const Notices = () => {
    const { userData, canPerformAction } = useAuth();
    const { showSuccess, showError } = useToast();
    const [notices, setNotices] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '', priority: 'normal', targetAudience: 'all', branch: '', semester: '', section: '', category: '', isImportant: false });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [noticesData, branchesData] = await Promise.all([
                noticesService.getAll(),
                branchesService.getAll()
            ]);
            setNotices(noticesData);
            setBranches(branchesData);
        }
        catch (error) { showError('Failed to load notices'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (notice = null) => {
        setSelectedNotice(notice);
        setFormData(notice ? {
            title: notice.title || '',
            content: notice.content || '',
            priority: notice.priority || 'normal',
            targetAudience: notice.targetAudience || 'all',
            branch: notice.branch || '',
            semester: notice.semester || '',
            section: notice.section || '',
            category: notice.category || '',
            isImportant: notice.isImportant || false
        } : {
            title: '',
            content: '',
            priority: 'normal',
            targetAudience: 'all',
            branch: '',
            semester: '',
            section: '',
            category: '',
            isImportant: false
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedNotice) { await noticesService.update(selectedNotice.id, formData); showSuccess('Notice updated'); }
            else { await noticesService.create(formData, userData); showSuccess('Notice created'); }
            setModalOpen(false); loadData();
        } catch (error) { showError('Failed to save notice'); }
    };

    const handleDelete = async () => {
        try { await noticesService.delete(selectedNotice.id); showSuccess('Notice deleted'); setDeleteModalOpen(false); loadData(); }
        catch (error) { showError('Failed to delete notice'); }
    };

    const renderTarget = (row) => {
        if (!row.branch) return 'All';
        if (row.branch && !row.semester) return row.branch;
        if (row.branch && row.semester && !row.section) return `${row.branch} - Sem ${row.semester}`;
        return `${row.branch} - Sem ${row.semester} - Sec ${row.section}`;
    };

    const columns = [
        { key: 'title', label: 'Title', sortable: true },
        { key: 'priority', label: 'Priority', render: (v) => <span className={`status-badge status-${v}`}>{v}</span> },
        { key: 'targetAudience', label: 'Audience' },
        { key: 'target', label: 'Target', render: (v, row) => renderTarget(row) },
        { key: 'createdByName', label: 'Posted By' },
        { key: 'createdAt', label: 'Date', render: (v) => formatTimestamp(v) }
    ];

    const renderActions = (row) => (
        <>
            <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}><span className="material-icons-round">edit</span></button>
            {canPerformAction('delete') && <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setSelectedNotice(row); setDeleteModalOpen(true); }}><span className="material-icons-round">delete</span></button>}
        </>
    );

    return (
        <div>
            <div className="page-header"><div className="header-actions">
                {canPerformAction('create') && <button className="btn-primary" onClick={() => handleOpenModal()}><span className="material-icons-round">add</span>Add Notice</button>}
            </div></div>
            <DataTable columns={columns} data={notices} loading={loading} searchable={true} searchKeys={['title', 'content']} actions={renderActions} />
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedNotice ? 'Edit Notice' : 'Add Notice'}>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-group"><label>Title *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
                    <div className="form-row">
                        <div className="form-group"><label>Priority</label><select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                        <div className="form-group"><label>Target Audience</label><select value={formData.targetAudience} onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}><option value="all">All</option><option value="students">Students</option><option value="faculty">Faculty</option></select></div>
                        <div className="form-group"><label>Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}><option value="">Select Category</option><option value="general">General</option><option value="exam">Exam</option><option value="facilities">Facilities</option><option value="academic">Academic</option><option value="event">Event</option></select></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formData.isImportant} onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })} style={{ marginRight: '8px', cursor: 'pointer' }} />
                                Mark as Important
                            </label>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Branch</label><select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}><option value="">All Branches</option>{branches.map(b => <option key={b.id} value={b.code}>{b.name}</option>)}</select></div>
                        <div className="form-group"><label>Semester</label><select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })}><option value="">All Semesters</option>{SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="form-group"><label>Section</label><select value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })}><option value="">All Sections</option>{SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="form-group"><label>Content *</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required rows="5" /></div>
                    <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                </form>
            </Modal>
            <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} message={`Delete "${selectedNotice?.title}"?`} />
        </div>
    );
};

export default Notices;
