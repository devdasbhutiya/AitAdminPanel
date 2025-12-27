import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { eventsService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import { formatTimestamp } from '../utils/helpers';
import './Users.css';

const Events = () => {
    const { canPerformAction } = useAuth();
    const { showSuccess, showError } = useToast();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', date: '', time: '', location: '', type: 'academic' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try { setLoading(true); const data = await eventsService.getAll(); setEvents(data); }
        catch (error) { showError('Failed to load events'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (event = null) => {
        setSelectedEvent(event);
        setFormData(event ? { title: event.title || '', description: event.description || '', date: event.date || '', time: event.time || '', location: event.location || '', type: event.type || 'academic' } : { title: '', description: '', date: '', time: '', location: '', type: 'academic' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedEvent) { await eventsService.update(selectedEvent.id, formData); showSuccess('Event updated'); }
            else { await eventsService.create(formData); showSuccess('Event created'); }
            setModalOpen(false); loadData();
        } catch (error) { showError('Failed to save event'); }
    };

    const handleDelete = async () => {
        try { await eventsService.delete(selectedEvent.id); showSuccess('Event deleted'); setDeleteModalOpen(false); loadData(); }
        catch (error) { showError('Failed to delete event'); }
    };

    const columns = [
        { key: 'title', label: 'Title', sortable: true },
        { key: 'date', label: 'Date', sortable: true, render: (v) => formatTimestamp(v) },
        { key: 'time', label: 'Time' },
        { key: 'location', label: 'Location' },
        { key: 'type', label: 'Type', render: (v) => <span className={`status-badge status-${v}`}>{v}</span> }
    ];

    const renderActions = (row) => (
        <>
            <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}><span className="material-icons-round">edit</span></button>
            {canPerformAction('delete') && <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setSelectedEvent(row); setDeleteModalOpen(true); }}><span className="material-icons-round">delete</span></button>}
        </>
    );

    return (
        <div>
            <div className="page-header"><div className="header-actions">
                {canPerformAction('create') && <button className="btn-primary" onClick={() => handleOpenModal()}><span className="material-icons-round">add</span>Add Event</button>}
            </div></div>
            <DataTable columns={columns} data={events} loading={loading} searchable={true} searchKeys={['title', 'location']} actions={renderActions} />
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedEvent ? 'Edit Event' : 'Add Event'}>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-group"><label>Title *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
                    <div className="form-row">
                        <div className="form-group"><label>Date *</label><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
                        <div className="form-group"><label>Time</label><input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Location</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
                        <div className="form-group"><label>Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}><option value="academic">Academic</option><option value="cultural">Cultural</option><option value="sports">Sports</option></select></div>
                    </div>
                    <div className="form-group"><label>Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                    <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                </form>
            </Modal>
            <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} message={`Delete "${selectedEvent?.title}"?`} />
        </div>
    );
};

export default Events;
