import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { studentsService, branchesService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import * as XLSX from 'xlsx';
import { SECTIONS } from '../utils/helpers';
import './Users.css';

const Students = () => {
    const { canPerformAction, userData } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();
    const [students, setStudents] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [formData, setFormData] = useState({
        enrollmentNo: '',
        name: '',
        admissionYear: '',
        semester: '',
        branch: '',
        section: '',
        isDtoD: false,
        dateOfBirth: '',
        classMentor: '',
        contactNo: '',
        parentContactNo: '',
        email: '',
        abcId: ''
    });

    // Excel upload states
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Filter states
    const [filters, setFilters] = useState({
        branch: '',
        semester: '',
        section: '',
        admissionYear: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [studentsData, branchesData] = await Promise.all([
                studentsService.getAll(),
                branchesService.getAll()
            ]);
            setStudents(studentsData);
            setBranches(branchesData);
        } catch (error) {
            showError('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (student = null) => {
        setSelectedStudent(student);
        setFormData(student ? { ...student } : {
            enrollmentNo: '',
            name: '',
            admissionYear: '',
            semester: '',
            branch: '',
            section: '',
            isDtoD: false,
            dateOfBirth: '',
            classMentor: '',
            contactNo: '',
            parentContactNo: '',
            email: '',
            abcId: ''
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedStudent) {
                await studentsService.update(selectedStudent.id, formData, userData);
                showSuccess('Student updated');
            } else {
                await studentsService.create(formData, userData);
                showSuccess('Student created');
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to save student');
        }
    };

    const handleDelete = async () => {
        try {
            await studentsService.delete(selectedStudent.id, userData);
            showSuccess('Student deleted');
            setDeleteModalOpen(false);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to delete student');
        }
    };

    // Helper function to map branch code/name to branch name
    const mapBranchToName = (branchValue) => {
        if (!branchValue) return '';
        const branchStr = String(branchValue).trim();

        // First, check if it's already a full branch name
        const exactMatch = branches.find(b => b.name.toLowerCase() === branchStr.toLowerCase());
        if (exactMatch) return exactMatch.name;

        // Then, check if it's a branch code
        const codeMatch = branches.find(b => b.code.toLowerCase() === branchStr.toLowerCase());
        if (codeMatch) return codeMatch.name;

        // Return original value if no match found
        return branchStr;
    };

    // Excel upload handlers
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Map Excel columns to our data structure
                const rawBranch = (row) => row.Branch || row.branch || row.BRANCH || row.Department || '';
                const mappedData = jsonData.map((row, index) => ({
                    id: `temp-${index}`,
                    enrollmentNo: row['Enrollment No'] || row.enrollmentNo || row['Enrollment Number'] || '',
                    name: row.Name || row.name || row.NAME || '',
                    admissionYear: row['Admission Year'] || row.admissionYear || row.Year || '',
                    semester: row.Semester || row.semester || row.Sem || '',
                    branch: mapBranchToName(rawBranch(row)),
                    section: row.Section || row.section || row.SECTION || '',
                    isDtoD: row.IsDtoD === true || row.IsDtoD === 'true' || row.IsDtoD === 'Yes' || row.isDtoD === 'Y' || false,
                    dateOfBirth: row['Date of Birth'] || row.dateOfBirth || row.DOB || '',
                    classMentor: row['Class Mentor'] || row.classMentor || row.Mentor || '',
                    contactNo: row['Contact No'] || row.contactNo || row.Contact || row.Mobile || '',
                    parentContactNo: row['Parent Contact No'] || row.parentContactNo || row['Parent Contact'] || '',
                    email: row.Email || row.email || row.EMAIL || '',
                    abcId: row['ABC ID'] || row.abcId || row.ABCID || '',
                    isValid: true
                }));

                // Validate data
                const validatedData = mappedData.map(row => ({
                    ...row,
                    isValid: row.enrollmentNo && row.name && row.branch && row.semester
                }));

                setExcelData(validatedData);
                setUploadModalOpen(true);
                showInfo(`Found ${validatedData.length} entries in the file`);
            } catch (err) {
                showError('Failed to parse Excel file. Please check the format.');
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = ''; // Reset input
    };

    const handleConfirmUpload = async () => {
        const validEntries = excelData.filter(row => row.isValid);
        if (validEntries.length === 0) {
            showError('No valid entries to upload');
            return;
        }

        setUploading(true);
        try {
            const cleanEntries = validEntries.map(({ id, isValid, ...data }) => data);
            const results = await studentsService.bulkCreate(cleanEntries, userData);

            if (results.success > 0) {
                showSuccess(`Successfully uploaded ${results.success} students`);
            }
            if (results.failed > 0) {
                showError(`Failed to upload ${results.failed} students (duplicate enrollment numbers or invalid data)`);
                console.error('Upload errors:', results.errors);
            }

            setUploadModalOpen(false);
            setExcelData([]);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to upload students');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveExcelRow = (index) => {
        setExcelData(prev => prev.filter((_, i) => i !== index));
    };

    // Download Excel template
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Enrollment No': '2023CSE001',
                'Name': 'John Doe',
                'Branch': 'CSE',
                'Semester': 5,
                'Section': 'A',
                'Admission Year': 2023,
                'IsDtoD': 'No',
                'Date of Birth': '2004-01-15',
                'Class Mentor': 'Dr. Smith',
                'Contact No': '9876543210',
                'Parent Contact No': '9876543211',
                'Email': 'john.doe@example.com',
                'ABC ID': 'ABC123456'
            },
            {
                'Enrollment No': '2023CSE002',
                'Name': 'Jane Smith',
                'Branch': 'CSE',
                'Semester': 5,
                'Section': 'A',
                'Admission Year': 2023,
                'IsDtoD': 'Yes',
                'Date of Birth': '2004-03-20',
                'Class Mentor': 'Dr. Smith',
                'Contact No': '9876543212',
                'Parent Contact No': '9876543213',
                'Email': 'jane.smith@example.com',
                'ABC ID': 'ABC123457'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
        XLSX.writeFile(workbook, 'Students_Template.xlsx');
        showInfo('Template downloaded successfully');
    };

    // Apply filters to students data
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            if (filters.branch && student.branch !== filters.branch) return false;
            if (filters.semester && String(student.semester) !== String(filters.semester)) return false;
            if (filters.section && student.section !== filters.section) return false;
            if (filters.admissionYear && String(student.admissionYear) !== String(filters.admissionYear)) return false;
            return true;
        });
    }, [students, filters]);

    // Export filtered data to Excel
    const handleExportFiltered = () => {
        if (filteredStudents.length === 0) {
            showError('No data to export');
            return;
        }

        const exportData = filteredStudents.map(student => ({
            'Enrollment No': student.enrollmentNo,
            'Name': student.name,
            'Branch': student.branch,
            'Semester': student.semester,
            'Section': student.section,
            'Admission Year': student.admissionYear || '',
            'IsDtoD': student.isDtoD ? 'Yes' : 'No',
            'Date of Birth': student.dateOfBirth || '',
            'Class Mentor': student.classMentor || '',
            'Contact No': student.contactNo || '',
            'Parent Contact No': student.parentContactNo || '',
            'Email': student.email || '',
            'ABC ID': student.abcId || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Students_Export_${timestamp}.xlsx`);
        showSuccess(`Exported ${filteredStudents.length} students`);
    };

    // Clear all filters
    const handleClearFilters = () => {
        setFilters({
            branch: '',
            semester: '',
            section: '',
            admissionYear: ''
        });
    };

    const columns = [
        { key: 'enrollmentNo', label: 'Enrollment No', sortable: true },
        { key: 'name', label: 'Name', sortable: true },
        { key: 'branch', label: 'Branch' },
        { key: 'semester', label: 'Sem' },
        { key: 'section', label: 'Sec' },
        { key: 'admissionYear', label: 'Year' },
        { key: 'contactNo', label: 'Contact' },
        { key: 'email', label: 'Email' }
    ];

    const renderActions = (row) => (
        <>
            <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}>
                <span className="material-icons-round">edit</span>
            </button>
            {canPerformAction('delete') && (
                <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setSelectedStudent(row); setDeleteModalOpen(true); }}>
                    <span className="material-icons-round">delete</span>
                </button>
            )}
        </>
    );

    return (
        <div>
            <div className="page-header">
                <div className="header-actions">
                    {canPerformAction('create') && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <button className="btn-secondary" onClick={handleDownloadTemplate}>
                                <span className="material-icons-round">download</span>
                                Download Template
                            </button>
                            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                <span className="material-icons-round">upload_file</span>
                                Upload Excel
                            </button>
                            <button className="btn-secondary" onClick={handleExportFiltered}>
                                <span className="material-icons-round">file_download</span>
                                Export Data
                            </button>
                            <button className="btn-primary" onClick={() => handleOpenModal()}>
                                <span className="material-icons-round">add</span>
                                Add Student
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="data-card" style={{ marginBottom: '1rem' }}>
                <div className="form-row" style={{ margin: 0, gap: '1rem', padding: '1rem' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label>Branch</label>
                        <select
                            value={filters.branch}
                            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label>Semester</label>
                        <select
                            value={filters.semester}
                            onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                        >
                            <option value="">All Semesters</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label>Section</label>
                        <select
                            value={filters.section}
                            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                        >
                            <option value="">All Sections</option>
                            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label>Admission Year</label>
                        <input
                            type="number"
                            placeholder="e.g., 2023"
                            value={filters.admissionYear}
                            onChange={(e) => setFilters({ ...filters, admissionYear: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: '0 0 auto', alignSelf: 'flex-end' }}>
                        <button className="btn-secondary" onClick={handleClearFilters} style={{ width: 'auto' }}>
                            <span className="material-icons-round">clear</span>
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredStudents}
                loading={loading}
                searchable={true}
                searchKeys={['enrollmentNo', 'name', 'email', 'contactNo']}
                actions={renderActions}
            />

            {/* Student Form Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedStudent ? 'Edit Student' : 'Add Student'} size="large">
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Enrollment No *</label>
                            <input
                                type="text"
                                value={formData.enrollmentNo}
                                onChange={(e) => setFormData({ ...formData, enrollmentNo: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Branch *</label>
                            <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} required>
                                <option value="">Select Branch</option>
                                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Semester *</label>
                            <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} required>
                                <option value="">Select</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Section *</label>
                            <select value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} required>
                                <option value="">Select</option>
                                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Admission Year</label>
                            <input
                                type="number"
                                value={formData.admissionYear}
                                onChange={(e) => setFormData({ ...formData, admissionYear: e.target.value })}
                                placeholder="2023"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isDtoD}
                                    onChange={(e) => setFormData({ ...formData, isDtoD: e.target.checked })}
                                    style={{ width: 'auto', margin: 0 }}
                                />
                                Diploma to Degree (DtoD)
                            </label>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Contact No</label>
                            <input
                                type="tel"
                                value={formData.contactNo}
                                onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Parent Contact No</label>
                            <input
                                type="tel"
                                value={formData.parentContactNo}
                                onChange={(e) => setFormData({ ...formData, parentContactNo: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Email ID</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>ABC ID</label>
                            <input
                                type="text"
                                value={formData.abcId}
                                onChange={(e) => setFormData({ ...formData, abcId: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Class Mentor</label>
                            <input
                                type="text"
                                value={formData.classMentor}
                                onChange={(e) => setFormData({ ...formData, classMentor: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn-primary">Save</button>
                    </div>
                </form>
            </Modal>

            {/* Excel Upload Preview Modal */}
            <Modal isOpen={uploadModalOpen} onClose={() => { setUploadModalOpen(false); setExcelData([]); }} title="Preview Students Upload" size="large">
                <div className="excel-preview">
                    <div className="excel-info">
                        <span className="material-icons-round">info</span>
                        <p>Review the data below. Entries marked in red have missing required fields (Enrollment No, Name, Branch, Semester).</p>
                    </div>

                    <div className="excel-table-container">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th>Enrollment No</th>
                                    <th>Name</th>
                                    <th>Branch</th>
                                    <th>Sem</th>
                                    <th>Section</th>
                                    <th>Year</th>
                                    <th>DtoD</th>
                                    <th>Contact</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {excelData.map((row, index) => (
                                    <tr key={row.id} className={row.isValid ? '' : 'invalid-row'}>
                                        <td>{row.enrollmentNo || '-'}</td>
                                        <td>{row.name || '-'}</td>
                                        <td>{row.branch || '-'}</td>
                                        <td>{row.semester || '-'}</td>
                                        <td>{row.section || '-'}</td>
                                        <td>{row.admissionYear || '-'}</td>
                                        <td>{row.isDtoD ? 'Yes' : 'No'}</td>
                                        <td>{row.contactNo || '-'}</td>
                                        <td>
                                            <button className="btn-icon delete" onClick={() => handleRemoveExcelRow(index)} title="Remove">
                                                <span className="material-icons-round">close</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="excel-summary">
                        <span className="valid-count">
                            <span className="material-icons-round">check_circle</span>
                            {excelData.filter(r => r.isValid).length} valid entries
                        </span>
                        <span className="invalid-count">
                            <span className="material-icons-round">error</span>
                            {excelData.filter(r => !r.isValid).length} invalid entries
                        </span>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={() => { setUploadModalOpen(false); setExcelData([]); }}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleConfirmUpload}
                            disabled={uploading || excelData.filter(r => r.isValid).length === 0}
                        >
                            {uploading ? 'Uploading...' : `Upload ${excelData.filter(r => r.isValid).length} Students`}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                message="Delete this student?"
            />
        </div>
    );
};

export default Students;
