import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { assignmentsService, coursesService, branchesService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import { formatTimestamp, SECTIONS, SEMESTERS } from '../utils/helpers';
import './Users.css';
import './Assignments.css';

const Assignments = () => {
    const { userData, canPerformAction } = useAuth();
    const { showSuccess, showError } = useToast();
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', courseId: '', courseName: '', dueDate: '', totalMarks: '', questions: [], branch: '', semester: '', section: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [assignData, coursesData, branchesData] = await Promise.all([assignmentsService.getAll(), coursesService.getAll(), branchesService.getAll()]);
            setAssignments(assignData); setCourses(coursesData); setBranches(branchesData);
        } catch (error) { showError('Failed to load'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (assignment = null) => {
        setSelectedAssignment(assignment);
        setFormData(assignment ? { ...assignment, questions: Array.isArray(assignment.questions) ? assignment.questions : [] } : { title: '', description: '', courseId: '', courseName: '', dueDate: '', totalMarks: '', questions: [], branch: '', semester: '', section: '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const course = courses.find(c => c.id === formData.courseId);
        const branch = branches.find(b => b.code === formData.branch);
        const data = {
            ...formData,
            courseName: course?.name || formData.courseName,
            branch: branch?.name || formData.branch // Save branch name instead of code
        };
        try {
            if (selectedAssignment) { await assignmentsService.update(selectedAssignment.id, data, userData); showSuccess('Updated'); }
            else { await assignmentsService.create(data, userData); showSuccess('Created'); }
            setModalOpen(false); loadData();
        } catch (error) { showError('Failed to save'); }
    };

    const handleAddQuestion = () => {
        setFormData({
            ...formData,
            questions: [...(formData.questions || []), { id: Date.now().toString(), text: '', marks: '' }]
        });
    };

    const handleRemoveQuestion = (index) => {
        const newQuestions = [...(formData.questions || [])];
        newQuestions.splice(index, 1);
        setFormData({ ...formData, questions: newQuestions });
    };

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...(formData.questions || [])];
        newQuestions[index][field] = value;
        setFormData({ ...formData, questions: newQuestions });
    };

    const handleDelete = async () => {
        try { await assignmentsService.delete(selectedAssignment.id); showSuccess('Deleted'); setDeleteModalOpen(false); loadData(); }
        catch (error) { showError('Failed'); }
    };

    const columns = [
        { key: 'title', label: 'Title', sortable: true },
        { key: 'courseName', label: 'Course', sortable: true },
        { key: 'semester', label: 'Semester' },
        { key: 'section', label: 'Section' },
        { key: 'dueDate', label: 'Due Date', render: (v) => formatTimestamp(v) },
        { key: 'totalMarks', label: 'Marks' },
        { key: 'createdByName', label: 'Created By' },
        { key: 'updatedByName', label: 'Updated By' }
    ];

    const renderActions = (row) => (
        <>
            <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}><span className="material-icons-round">edit</span></button>
            {canPerformAction('delete') && <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setSelectedAssignment(row); setDeleteModalOpen(true); }}><span className="material-icons-round">delete</span></button>}
        </>
    );

    return (
        <div>
            <div className="page-header"><div className="header-actions">
                {canPerformAction('create') && <button className="btn-primary" onClick={() => handleOpenModal()}><span className="material-icons-round">add</span>Add Assignment</button>}
            </div></div>
            <DataTable columns={columns} data={assignments} loading={loading} searchable={true} searchKeys={['title', 'courseName']} actions={renderActions} />
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedAssignment ? 'Edit' : 'Add'}>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-group"><label>Title *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
                    <div className="form-row">
                        <div className="form-group"><label>Course *</label><select value={formData.courseId} onChange={(e) => setFormData({ ...formData, courseId: e.target.value })} required><option value="">Select</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        <div className="form-group"><label>Due Date *</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Branch</label><select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}><option value="">Select</option>{branches.map(b => <option key={b.id} value={b.code}>{b.name}</option>)}</select></div>
                        <div className="form-group"><label>Semester</label><select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })}><option value="">Select</option>{SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="form-group"><label>Section</label><select value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })}><option value="">Select</option>{SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="form-group"><label>Total Marks</label><input type="number" value={formData.totalMarks} onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })} /></div>

                    <div className="form-group">
                        <label>Questions</label>
                        <div className="questions-list">
                            {(formData.questions || []).map((q, index) => (
                                <div key={index} className="question-item">
                                    <div className="question-header">
                                        <span>Question {index + 1}</span>
                                        <button type="button" className="btn-icon delete" onClick={() => handleRemoveQuestion(index)}>
                                            <span className="material-icons-round">delete</span>
                                        </button>
                                    </div>
                                    <textarea
                                        placeholder="Question text"
                                        value={q.text}
                                        onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                                        className="question-input"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Marks"
                                        value={q.marks}
                                        onChange={(e) => handleQuestionChange(index, 'marks', e.target.value)}
                                        className="marks-input"
                                    />
                                </div>
                            ))}
                            <button type="button" className="btn-secondary btn-sm" onClick={handleAddQuestion}>
                                <span className="material-icons-round">add</span> Add Question
                            </button>
                        </div>
                    </div>

                    <div className="form-group"><label>Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                    <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                </form>
            </Modal>
            <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} message={`Delete "${selectedAssignment?.title}"?`} />
        </div>
    );
};

export default Assignments;
