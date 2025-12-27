import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { branchesService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import './Users.css';

const Branches = () => {
    const { canPerformAction } = useAuth();
    const { showSuccess, showError } = useToast();

    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(null);

    const [formData, setFormData] = useState({ name: '', code: '', hodName: '', description: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await branchesService.getAll();
            setBranches(data);
        } catch (error) {
            showError('Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (branch = null) => {
        setSelectedBranch(branch);
        setFormData(branch ? { name: branch.name || '', code: branch.code || '', hodName: branch.hodName || '', description: branch.description || '' } : { name: '', code: '', hodName: '', description: '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedBranch) {
                await branchesService.update(selectedBranch.id, formData);
                showSuccess('Branch updated');
            } else {
                await branchesService.create(formData);
                showSuccess('Branch created');
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            showError('Failed to save branch');
        }
    };

    const handleDelete = async () => {
        try {
            await branchesService.delete(selectedBranch.id);
            showSuccess('Branch deleted');
            setDeleteModalOpen(false);
            loadData();
        } catch (error) {
            showError('Failed to delete branch');
        }
    };

    const columns = [
        { key: 'code', label: 'Code', sortable: true },
        { key: 'name', label: 'Branch Name', sortable: true },
        { key: 'hodName', label: 'HOD' },
        { key: 'description', label: 'Description' }
    ];

    const renderActions = (row) => (
        <>
            <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}><span className="material-icons-round">edit</span></button>
            {canPerformAction('delete') && <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setSelectedBranch(row); setDeleteModalOpen(true); }}><span className="material-icons-round">delete</span></button>}
        </>
    );

    return (
        <div>
            <div className="page-header"><div className="header-actions">
                {canPerformAction('create') && <button className="btn-primary" onClick={() => handleOpenModal()}><span className="material-icons-round">add</span>Add Branch</button>}
            </div></div>
            <DataTable columns={columns} data={branches} loading={loading} searchable={true} searchKeys={['name', 'code']} actions={renderActions} />
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedBranch ? 'Edit Branch' : 'Add Branch'}>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label>Branch Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div className="form-group"><label>Code *</label><input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required /></div>
                    </div>
                    <div className="form-group"><label>HOD Name</label><input type="text" value={formData.hodName} onChange={(e) => setFormData({ ...formData, hodName: e.target.value })} /></div>
                    <div className="form-group"><label>Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                    <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                </form>
            </Modal>
            <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} message={`Delete "${selectedBranch?.name}"?`} />
        </div>
    );
};

export default Branches;
