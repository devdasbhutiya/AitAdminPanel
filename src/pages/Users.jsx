import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usersService, branchesService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import { capitalize } from '../utils/helpers';
import './Users.css';

const Users = () => {
    const { userData, canPerformAction, isAdminOrPrincipal, role } = useAuth();
    const { showSuccess, showError } = useToast();

    // Debug: Check if admin role is being detected correctly
    const userIsAdminOrPrincipal = role === 'admin' || role === 'principal' || role === 'Admin' || role === 'Principal';
    console.log('User role:', role, 'isAdminOrPrincipal:', isAdminOrPrincipal?.(), 'direct check:', userIsAdminOrPrincipal);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState([]);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'faculty',
        department: '',
        designation: '',
        assignedSections: [] // Array of {branch, semester, section} objects
    });

    // New section assignment form
    const [newSection, setNewSection] = useState({
        branch: '',
        semester: '',
        section: ''
    });

    const sections = ['A', 'B', 'C', 'D', 'E'];
    const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, branchesData] = await Promise.all([
                usersService.getAll(),
                branchesService.getAll()
            ]);
            setUsers(usersData);
            setBranches(branchesData);
        } catch (error) {
            showError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '',
                confirmPassword: '',
                role: user.role || 'faculty',
                department: user.department || '',
                designation: user.designation || '',
                assignedSections: user.assignedSections || []
            });
        } else {
            setSelectedUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'faculty',
                department: '',
                designation: '',
                assignedSections: []
            });
        }
        setNewSection({ branch: '', semester: '', section: '' });
        setModalOpen(true);
    };

    const handleAddSection = () => {
        console.log('handleAddSection called with newSection:', newSection);

        if (!newSection.branch || !newSection.semester || !newSection.section) {
            showError('Please select branch, semester, and section');
            return;
        }

        // Check if already exists
        const exists = formData.assignedSections.some(
            s => s.branch === newSection.branch &&
                s.semester === newSection.semester &&
                s.section === newSection.section
        );

        if (exists) {
            showError('This section is already assigned');
            return;
        }

        const newAssignedSections = [...formData.assignedSections, { ...newSection }];
        console.log('New assignedSections:', newAssignedSections);

        setFormData({
            ...formData,
            assignedSections: newAssignedSections
        });
        setNewSection({ branch: '', semester: '', section: '' });

        console.log('formData after update:', formData);
    };

    const handleRemoveSection = (index) => {
        const updated = [...formData.assignedSections];
        updated.splice(index, 1);
        setFormData({ ...formData, assignedSections: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!selectedUser && formData.password !== formData.confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (!selectedUser && formData.password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        try {
            // Debug: Log the form data being submitted
            console.log('Submitting form data:', formData);
            console.log('Assigned sections:', formData.assignedSections);

            if (selectedUser) {
                await usersService.update(selectedUser.id, formData, userData);
                showSuccess('User updated successfully');
            } else {
                await usersService.create(formData, userData);
                showSuccess('User created successfully');
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to save user');
        }
    };

    const handleDelete = async () => {
        try {
            await usersService.delete(selectedUser.id, userData);
            showSuccess('User deleted successfully');
            setDeleteModalOpen(false);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to delete user');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (value, row) => (
                <div className="user-cell">
                    <div className="user-avatar-small">{value?.[0]?.toUpperCase() || 'U'}</div>
                    <span>{value}</span>
                </div>
            )
        },
        { key: 'email', label: 'Email', sortable: true },
        {
            key: 'role',
            label: 'Role',
            sortable: true,
            render: (value) => (
                <span className={`role-badge role-${value}`}>{capitalize(value)}</span>
            )
        },
        { key: 'department', label: 'Department', sortable: true },
        {
            key: 'assignedSections',
            label: 'Assigned Sections',
            render: (value) => {
                if (!value || value.length === 0) return '-';
                if (value.length <= 2) {
                    return value.map(s => `${s.branch}-${s.semester}-${s.section}`).join(', ');
                }
                return `${value.length} sections`;
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => (
                <span className={`status-badge status-${value || 'active'}`}>
                    {capitalize(value || 'active')}
                </span>
            )
        }
    ];

    const renderActions = (row) => (
        <>
            <button
                className="btn-icon edit"
                onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}
                title="Edit"
            >
                <span className="material-icons-round">edit</span>
            </button>
            {canPerformAction('delete') && (
                <button
                    className="btn-icon delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(row);
                        setDeleteModalOpen(true);
                    }}
                    title="Delete"
                >
                    <span className="material-icons-round">delete</span>
                </button>
            )}
        </>
    );

    const isFaculty = formData.role === 'faculty';

    return (
        <div className="users-page">
            <div className="page-header">
                <div className="header-actions">
                    <button className="btn-secondary">
                        <span className="material-icons-round">download</span>
                        Export
                    </button>
                    {canPerformAction('create') && (
                        <button className="btn-primary" onClick={() => handleOpenModal()}>
                            <span className="material-icons-round">add</span>
                            Add User
                        </button>
                    )}
                </div>
            </div>

            <DataTable
                columns={columns}
                data={users}
                loading={loading}
                searchable={true}
                searchKeys={['name', 'email', 'department']}
                actions={renderActions}
                emptyMessage="No users found"
            />

            {/* User Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={selectedUser ? 'Edit User' : 'Add New User'}
                size="large"
            >
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="name">Full Name *</label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@ait.edu"
                                required
                                disabled={!!selectedUser}
                            />
                        </div>
                    </div>

                    {!selectedUser && (
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="password">Password *</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Min 6 characters"
                                    minLength="6"
                                    required={!selectedUser}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password *</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Confirm password"
                                    minLength="6"
                                    required={!selectedUser}
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="role">Role *</label>
                            <select
                                id="role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                required
                            >
                                <option value="faculty">Faculty</option>
                                <option value="hod">HOD</option>
                                <option value="principal">Principal</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="department">Department *</label>
                            <select
                                id="department"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                required
                            >
                                <option value="">Select Department</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.name}>{branch.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {['faculty', 'hod'].includes(formData.role) && (
                        <div className="form-group">
                            <label htmlFor="designation">Designation</label>
                            <input
                                type="text"
                                id="designation"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                placeholder="Assistant Professor"
                            />
                        </div>
                    )}

                    {/* Section Assignment for Faculty */}
                    {isFaculty && userIsAdminOrPrincipal && (
                        <div className="section-assignment">
                            <h4>
                                <span className="material-icons-round">school</span>
                                Assigned Sections
                            </h4>
                            <p className="section-hint">
                                Assign specific branch, semester, and section combinations this faculty member can access and manage.
                            </p>

                            {/* Current assignments */}
                            {formData.assignedSections.length > 0 && (
                                <div className="assigned-sections-list">
                                    {formData.assignedSections.map((section, index) => (
                                        <div key={index} className="section-chip">
                                            <span className="material-icons-round">class</span>
                                            <span>{section.branch} - Sem {section.semester} - Sec {section.section}</span>
                                            <button
                                                type="button"
                                                className="chip-remove"
                                                onClick={() => handleRemoveSection(index)}
                                            >
                                                <span className="material-icons-round">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add new section */}
                            <div className="add-section-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Branch</label>
                                        <select
                                            value={newSection.branch}
                                            onChange={(e) => setNewSection({ ...newSection, branch: e.target.value })}
                                        >
                                            <option value="">Select Branch</option>
                                            {branches.map(branch => (
                                                <option key={branch.id} value={branch.name}>{branch.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Semester</label>
                                        <select
                                            value={newSection.semester}
                                            onChange={(e) => setNewSection({ ...newSection, semester: e.target.value })}
                                        >
                                            <option value="">Select Semester</option>
                                            {semesters.map(sem => (
                                                <option key={sem} value={String(sem)}>{sem}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Section</label>
                                        <select
                                            value={newSection.section}
                                            onChange={(e) => setNewSection({ ...newSection, section: e.target.value })}
                                        >
                                            <option value="">Select Section</option>
                                            {sections.map(sec => (
                                                <option key={sec} value={sec}>{sec}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-add-section"
                                        onClick={() => {
                                            console.log('Add button clicked!');
                                            handleAddSection();
                                        }}
                                        style={{ minWidth: '80px' }}
                                    >
                                        <span className="material-icons-round">add</span>
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {selectedUser ? 'Update User' : 'Save User'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete User"
                message={`Are you sure you want to delete "${selectedUser?.name}"?`}
            />
        </div>
    );
};

export default Users;
