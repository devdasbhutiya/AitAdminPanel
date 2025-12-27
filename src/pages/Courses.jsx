import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { coursesService, branchesService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import './Users.css';

const Courses = () => {
    const { canPerformAction } = useAuth();
    const { showSuccess, showError } = useToast();

    const [courses, setCourses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        department: '',
        semester: '',
        credits: '',
        instructor: '',
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [coursesData, branchesData] = await Promise.all([
                coursesService.getAll(),
                branchesService.getAll()
            ]);
            setCourses(coursesData);
            setBranches(branchesData);
        } catch (error) {
            showError('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (course = null) => {
        if (course) {
            setSelectedCourse(course);
            setFormData({
                name: course.name || '',
                code: course.code || '',
                department: course.department || '',
                semester: course.semester || '',
                credits: course.credits || '',
                instructor: course.instructor || '',
                description: course.description || ''
            });
        } else {
            setSelectedCourse(null);
            setFormData({
                name: '',
                code: '',
                department: '',
                semester: '',
                credits: '',
                instructor: '',
                description: ''
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedCourse) {
                await coursesService.update(selectedCourse.id, formData);
                showSuccess('Course updated successfully');
            } else {
                await coursesService.create(formData);
                showSuccess('Course created successfully');
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to save course');
        }
    };

    const handleDelete = async () => {
        try {
            await coursesService.delete(selectedCourse.id);
            showSuccess('Course deleted successfully');
            setDeleteModalOpen(false);
            loadData();
        } catch (error) {
            showError('Failed to delete course');
        }
    };

    const columns = [
        { key: 'code', label: 'Code', sortable: true },
        { key: 'name', label: 'Course Name', sortable: true },
        { key: 'department', label: 'Department', sortable: true },
        { key: 'semester', label: 'Semester', sortable: true },
        { key: 'credits', label: 'Credits' },
        { key: 'instructor', label: 'Instructor' }
    ];

    const renderActions = (row) => (
        <>
            <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}>
                <span className="material-icons-round">edit</span>
            </button>
            {canPerformAction('delete') && (
                <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setSelectedCourse(row); setDeleteModalOpen(true); }}>
                    <span className="material-icons-round">delete</span>
                </button>
            )}
        </>
    );

    return (
        <div className="courses-page">
            <div className="page-header">
                <div className="header-actions">
                    <button className="btn-secondary">
                        <span className="material-icons-round">download</span>Export
                    </button>
                    {canPerformAction('create') && (
                        <button className="btn-primary" onClick={() => handleOpenModal()}>
                            <span className="material-icons-round">add</span>Add Course
                        </button>
                    )}
                </div>
            </div>

            <DataTable columns={columns} data={courses} loading={loading} searchable={true} searchKeys={['name', 'code', 'department']} actions={renderActions} emptyMessage="No courses found" />

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedCourse ? 'Edit Course' : 'Add New Course'} size="medium">
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Course Name *</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Data Structures" required />
                        </div>
                        <div className="form-group">
                            <label>Course Code *</label>
                            <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CS201" required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Department *</label>
                            <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required>
                                <option value="">Select Department</option>
                                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                <option value="Computer Science">Computer Science</option>
                                <option value="Electronics">Electronics</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Semester *</label>
                            <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} required>
                                <option value="">Select Semester</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Credits</label>
                            <input type="number" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} placeholder="4" />
                        </div>
                        <div className="form-group">
                            <label>Instructor</label>
                            <input type="text" value={formData.instructor} onChange={(e) => setFormData({ ...formData, instructor: e.target.value })} placeholder="Prof. John Doe" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Course description..." />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn-primary">{selectedCourse ? 'Update' : 'Save'} Course</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} title="Delete Course" message={`Delete "${selectedCourse?.name}"?`} />
        </div>
    );
};

export default Courses;
