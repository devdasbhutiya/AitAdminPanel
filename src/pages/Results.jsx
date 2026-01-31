import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { resultsService, branchesService, studentsService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import * as XLSX from 'xlsx';
import { SECTIONS } from '../utils/helpers';
import './Users.css';

const Results = () => {
    const { canPerformAction, userData } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();
    const [results, setResults] = useState([]);
    const [branches, setBranches] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const [formData, setFormData] = useState({
        enrollmentNo: '',
        studentName: '',
        branch: '',
        semester: '',
        section: '',
        subjectCode: '',
        subjectName: '',
        credits: '',
        mid1Marks: '',
        mid2Marks: '',
        finalMidMarks: '',
        grade: '',
        academicYear: new Date().getFullYear()
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
        academicYear: '',
        enrollmentNo: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [resultsData, branchesData, studentsData] = await Promise.all([
                resultsService.getAll(),
                branchesService.getAll(),
                studentsService.getAll()
            ]);
            setResults(resultsData);
            setBranches(branchesData);
            setStudents(studentsData);
        } catch (error) {
            showError('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    // Calculate grade and final marks
    const calculateResults = (mid1, mid2) => {
        const mid1Marks = parseFloat(mid1) || 0;
        const mid2Marks = parseFloat(mid2) || 0;
        const finalMidMarks = (mid1Marks + mid2Marks) / 2;
        const percentage = (finalMidMarks / 30) * 100;

        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';

        return { finalMidMarks: finalMidMarks.toFixed(1), grade };
    };

    const handleOpenModal = (result = null) => {
        setSelectedResult(result);
        setFormData(result ? { ...result } : {
            enrollmentNo: '',
            studentName: '',
            branch: '',
            semester: '',
            section: '',
            subjectCode: '',
            subjectName: '',
            credits: '',
            mid1Marks: '',
            mid2Marks: '',
            finalMidMarks: '',
            grade: '',
            academicYear: new Date().getFullYear()
        });
        setModalOpen(true);
    };

    const handleStudentSelect = (enrollmentNo) => {
        const student = students.find(s => s.enrollmentNo === enrollmentNo);
        if (student) {
            setFormData(prev => ({
                ...prev,
                enrollmentNo: student.enrollmentNo,
                studentName: student.name,
                branch: student.branch,
                semester: student.semester,
                section: student.section
            }));
        }
    };

    const handleMarksChange = (field, value) => {
        const updated = { ...formData, [field]: value };

        if (field === 'mid1Marks' || field === 'mid2Marks') {
            const calculated = calculateResults(
                field === 'mid1Marks' ? value : updated.mid1Marks,
                field === 'mid2Marks' ? value : updated.mid2Marks
            );
            updated.finalMidMarks = calculated.finalMidMarks;
            updated.grade = calculated.grade;
        }

        setFormData(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedResult) {
                await resultsService.update(selectedResult.id, formData, userData);
                showSuccess('Result updated');
            } else {
                await resultsService.create(formData, userData);
                showSuccess('Result created');
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to save result');
        }
    };

    const handleDelete = async () => {
        try {
            await resultsService.delete(selectedResult.id, userData);
            showSuccess('Result deleted');
            setDeleteModalOpen(false);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to delete result');
        }
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
                const mappedData = jsonData.map((row, index) => {
                    const mid1 = parseFloat(row['Mid-1 Marks'] || row.mid1Marks || 0);
                    const mid2 = parseFloat(row['Mid-2 Marks'] || row.mid2Marks || 0);
                    const calculated = calculateResults(mid1, mid2);

                    return {
                        id: `temp-${index}`,
                        enrollmentNo: row['Enrollment No'] || row.enrollmentNo || '',
                        studentName: row['Student Name'] || row.studentName || row.Name || '',
                        branch: row.Branch || row.branch || '',
                        semester: row.Semester || row.semester || '',
                        section: row.Section || row.section || '',
                        subjectCode: row['Subject Code'] || row.subjectCode || '',
                        subjectName: row['Subject Name'] || row.subjectName || '',
                        credits: row.Credits || row.credits || '',
                        mid1Marks: mid1,
                        mid2Marks: mid2,
                        finalMidMarks: calculated.finalMidMarks,
                        grade: calculated.grade,
                        academicYear: row['Academic Year'] || row.academicYear || new Date().getFullYear(),
                        isValid: true
                    };
                });

                // Validate data
                const validatedData = mappedData.map(row => ({
                    ...row,
                    isValid: row.enrollmentNo && row.subjectCode && row.branch && row.semester
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
            const results = await resultsService.bulkCreate(cleanEntries, userData);

            if (results.success > 0) {
                showSuccess(`Successfully uploaded ${results.success} results`);
            }
            if (results.failed > 0) {
                showError(`Failed to upload ${results.failed} results`);
                console.error('Upload errors:', results.errors);
            }

            setUploadModalOpen(false);
            setExcelData([]);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to upload results');
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
                'Student Name': 'John Doe',
                'Branch': 'Computer Science and Engineering',
                'Semester': 5,
                'Section': 'A',
                'Subject Code': 'CS301',
                'Subject Name': 'Data Structures',
                'Credits': 4,
                'Mid-1 Marks': 17,
                'Mid-2 Marks': 32,
                'Academic Year': 2024
            },
            {
                'Enrollment No': '2023CSE002',
                'Student Name': 'Jane Smith',
                'Branch': 'Computer Science and Engineering',
                'Semester': 5,
                'Section': 'A',
                'Subject Code': 'CS302',
                'Subject Name': 'Database Management',
                'Credits': 4,
                'Mid-1 Marks': 18,
                'Mid-2 Marks': 36,
                'Academic Year': 2024
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
        XLSX.writeFile(workbook, 'Results_Template.xlsx');
        showInfo('Template downloaded successfully');
    };

    // Apply filters to results data
    const filteredResults = useMemo(() => {
        return results.filter(result => {
            if (filters.branch && result.branch !== filters.branch) return false;
            if (filters.semester && String(result.semester) !== String(filters.semester)) return false;
            if (filters.section && result.section !== filters.section) return false;
            if (filters.academicYear && String(result.academicYear) !== String(filters.academicYear)) return false;
            if (filters.enrollmentNo && !result.enrollmentNo.toLowerCase().includes(filters.enrollmentNo.toLowerCase())) return false;
            return true;
        });
    }, [results, filters]);

    // Export filtered data to Excel
    const handleExportFiltered = () => {
        if (filteredResults.length === 0) {
            showError('No data to export');
            return;
        }

        const exportData = filteredResults.map(result => ({
            'Enrollment No': result.enrollmentNo,
            'Student Name': result.studentName,
            'Branch': result.branch,
            'Semester': result.semester,
            'Section': result.section,
            'Subject Code': result.subjectCode,
            'Subject Name': result.subjectName,
            'Credits': result.credits,
            'Mid-1 Marks': result.mid1Marks,
            'Mid-2 Marks': result.mid2Marks,
            'Final Mid Marks': result.finalMidMarks,
            'Grade': result.grade,
            'Academic Year': result.academicYear
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Results_Export_${timestamp}.xlsx`);
        showSuccess(`Exported ${filteredResults.length} results`);
    };

    // Clear all filters
    const handleClearFilters = () => {
        setFilters({
            branch: '',
            semester: '',
            section: '',
            academicYear: '',
            enrollmentNo: ''
        });
    };

    const columns = [
        { key: 'enrollmentNo', label: 'Enrollment No', sortable: true },
        { key: 'studentName', label: 'Student Name', sortable: true },
        { key: 'subjectCode', label: 'Subject Code', sortable: true },
        { key: 'subjectName', label: 'Subject Name', sortable: true },
        { key: 'branch', label: 'Branch' },
        { key: 'semester', label: 'Sem' },
        { key: 'section', label: 'Sec' },
        { key: 'mid1Marks', label: 'Mid-1' },
        { key: 'mid2Marks', label: 'Mid-2' },
        { key: 'finalMidMarks', label: 'Final' },
        { key: 'grade', label: 'Grade' }
    ];

    const renderActions = (row) => (
        <>
            <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}>
                <span className="material-icons-round">edit</span>
            </button>
            {canPerformAction('delete') && (
                <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setSelectedResult(row); setDeleteModalOpen(true); }}>
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
                                Add Result
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="data-card" style={{ marginBottom: '1rem' }}>
                <div className="form-row" style={{ margin: 0, gap: '1rem', padding: '1rem' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label>Enrollment No</label>
                        <input
                            type="text"
                            placeholder="Search by enrollment..."
                            value={filters.enrollmentNo}
                            onChange={(e) => setFilters({ ...filters, enrollmentNo: e.target.value })}
                        />
                    </div>
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
                        <label>Academic Year</label>
                        <input
                            type="number"
                            placeholder="e.g., 2024"
                            value={filters.academicYear}
                            onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
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
                data={filteredResults}
                loading={loading}
                searchable={true}
                searchKeys={['enrollmentNo', 'studentName', 'subjectCode', 'subjectName']}
                actions={renderActions}
            />

            {/* Result Form Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedResult ? 'Edit Result' : 'Add Result'} size="large">
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Enrollment No *</label>
                            <select
                                value={formData.enrollmentNo}
                                onChange={(e) => handleStudentSelect(e.target.value)}
                                required
                                disabled={!!selectedResult}
                            >
                                <option value="">Select Student</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.enrollmentNo}>
                                        {s.enrollmentNo} - {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Student Name</label>
                            <input
                                type="text"
                                value={formData.studentName}
                                readOnly
                                disabled
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Branch</label>
                            <input
                                type="text"
                                value={formData.branch}
                                readOnly
                                disabled
                            />
                        </div>
                        <div className="form-group">
                            <label>Semester</label>
                            <input
                                type="text"
                                value={formData.semester}
                                readOnly
                                disabled
                            />
                        </div>
                        <div className="form-group">
                            <label>Section</label>
                            <input
                                type="text"
                                value={formData.section}
                                readOnly
                                disabled
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Subject Code *</label>
                            <input
                                type="text"
                                value={formData.subjectCode}
                                onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Subject Name *</label>
                            <input
                                type="text"
                                value={formData.subjectName}
                                onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Credits *</label>
                            <input
                                type="number"
                                value={formData.credits}
                                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                                required
                                min="1"
                                max="10"
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Mid-1 Marks (Out of 20) *</label>
                            <input
                                type="number"
                                value={formData.mid1Marks}
                                onChange={(e) => handleMarksChange('mid1Marks', e.target.value)}
                                required
                                min="0"
                                max="20"
                                step="0.1"
                            />
                        </div>
                        <div className="form-group">
                            <label>Mid-2 Marks (Out of 40) *</label>
                            <input
                                type="number"
                                value={formData.mid2Marks}
                                onChange={(e) => handleMarksChange('mid2Marks', e.target.value)}
                                required
                                min="0"
                                max="40"
                                step="0.1"
                            />
                        </div>
                        <div className="form-group">
                            <label>Final Mid Marks (Out of 30)</label>
                            <input
                                type="text"
                                value={formData.finalMidMarks}
                                readOnly
                                disabled
                            />
                        </div>
                        <div className="form-group">
                            <label>Grade</label>
                            <input
                                type="text"
                                value={formData.grade}
                                readOnly
                                disabled
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Academic Year *</label>
                            <input
                                type="number"
                                value={formData.academicYear}
                                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                                required
                                placeholder="2024"
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
            <Modal isOpen={uploadModalOpen} onClose={() => { setUploadModalOpen(false); setExcelData([]); }} title="Preview Results Upload" size="large">
                <div className="excel-preview">
                    <div className="excel-info">
                        <span className="material-icons-round">info</span>
                        <p>Review the data below. Entries marked in red have missing required fields (Enrollment No, Subject Code, Branch, Semester).</p>
                    </div>

                    <div className="excel-table-container">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th>Enrollment No</th>
                                    <th>Student Name</th>
                                    <th>Subject Code</th>
                                    <th>Subject Name</th>
                                    <th>Branch</th>
                                    <th>Sem</th>
                                    <th>Mid-1</th>
                                    <th>Mid-2</th>
                                    <th>Final</th>
                                    <th>Grade</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {excelData.map((row, index) => (
                                    <tr key={row.id} className={row.isValid ? '' : 'invalid-row'}>
                                        <td>{row.enrollmentNo || '-'}</td>
                                        <td>{row.studentName || '-'}</td>
                                        <td>{row.subjectCode || '-'}</td>
                                        <td>{row.subjectName || '-'}</td>
                                        <td>{row.branch || '-'}</td>
                                        <td>{row.semester || '-'}</td>
                                        <td>{row.mid1Marks || '-'}</td>
                                        <td>{row.mid2Marks || '-'}</td>
                                        <td>{row.finalMidMarks || '-'}</td>
                                        <td>{row.grade || '-'}</td>
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
                            {uploading ? 'Uploading...' : `Upload ${excelData.filter(r => r.isValid).length} Results`}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                message="Delete this result?"
            />
        </div>
    );
};

export default Results;
