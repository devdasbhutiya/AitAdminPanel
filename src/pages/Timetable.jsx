import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { timetableService, coursesService, branchesService } from '../services';
import { DataTable, Modal, ConfirmModal } from '../components/common';
import * as XLSX from 'xlsx';
import { DAYS, SECTIONS } from '../utils/helpers';
import './Users.css';
import './Timetable.css';

const Timetable = () => {
    const { canPerformAction, userData } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();
    const [timetable, setTimetable] = useState([]);
    const [courses, setCourses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [formData, setFormData] = useState({ day: '', startTime: '', endTime: '', courseId: '', courseName: '', instructor: '', room: '', branch: '', semester: '', section: '', type: 'lecture' });

    // Excel upload states
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => { loadData(); }, [userData]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Use role-based filtering for timetable data
            const [ttData, coursesData, branchesData] = await Promise.all([
                userData?.role ? timetableService.getForTeacher(userData) : timetableService.getAll(),
                coursesService.getAll(),
                branchesService.getAll()
            ]);
            setTimetable(ttData);
            setCourses(coursesData);
            setBranches(branchesData);
        } catch (error) {
            showError('Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (entry = null) => {
        setSelectedEntry(entry);
        setFormData(entry
            ? { ...entry }
            : { day: '', startTime: '', endTime: '', courseId: '', courseName: '', instructor: '', room: '', branch: '', semester: '', section: '', type: 'lecture' }
        );
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const course = courses.find(c => c.id === formData.courseId);
        const data = {
            ...formData,
            courseName: course?.name || formData.courseName
        };
        try {
            if (selectedEntry) {
                await timetableService.update(selectedEntry.id, data, userData);
                showSuccess('Timetable updated');
            } else {
                await timetableService.create(data, userData);
                showSuccess('Entry created');
            }
            setModalOpen(false); loadData();
        } catch (error) {
            showError(error.message || 'Failed to save');
        }
    };

    const handleDelete = async () => {
        try {
            await timetableService.delete(selectedEntry.id, userData);
            showSuccess('Entry deleted');
            setDeleteModalOpen(false);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to delete');
        }
    };

    // Excel export handler
    const handleExportExcel = () => {
        if (timetable.length === 0) {
            showError('No data to export');
            return;
        }

        // Prepare data for export
        const exportData = timetable.map(entry => ({
            'Day': entry.day,
            'Start Time': entry.startTime,
            'End Time': entry.endTime,
            'Course': entry.courseName,
            'Instructor': entry.instructor,
            'Room': entry.room,
            'Branch': entry.branch,
            'Semester': entry.semester,
            'Section': entry.section
        }));

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Timetable');

        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Day
            { wch: 12 }, // Start Time
            { wch: 12 }, // End Time
            { wch: 25 }, // Course
            { wch: 20 }, // Instructor
            { wch: 12 }, // Room
            { wch: 15 }, // Branch
            { wch: 10 }, // Semester
            { wch: 10 }, // Section
        ];

        // Generate filename with date
        const date = new Date().toISOString().split('T')[0];
        const filename = `timetable_export_${date}.xlsx`;

        // Download file
        XLSX.writeFile(wb, filename);
        showSuccess(`Exported ${timetable.length} entries to ${filename}`);
    };

    // Download sample template
    const handleDownloadTemplate = () => {
        // Create sample data
        const sampleData = [
            {
                'Day': 'Monday',
                'Start Time': '09:00',
                'End Time': '10:30',
                'Course': 'Data Structures',
                'Instructor': 'Dr. John Doe',
                'Room': 'Lab 101',
                'Branch': 'Computer Engineering',
                'Semester': '3',
                'Section': 'A',
                'Type': 'lecture'
            },
            {
                'Day': 'Monday',
                'Start Time': '11:00',
                'End Time': '12:30',
                'Course': 'Database Management',
                'Instructor': 'Prof. Jane Smith',
                'Room': 'Room 202',
                'Branch': 'Computer Engineering',
                'Semester': '3',
                'Section': 'A',
                'Type': 'lab'
            },
            {
                'Day': 'Tuesday',
                'Start Time': '14:00',
                'End Time': '15:30',
                'Course': 'Web Development',
                'Instructor': 'Dr. Mike Wilson',
                'Room': 'Lab 103',
                'Branch': 'Computer Engineering',
                'Semester': '3',
                'Section': 'B',
                'Type': 'tutorial'
            }
        ];

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Timetable Template');

        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Day
            { wch: 12 }, // Start Time
            { wch: 12 }, // End Time
            { wch: 25 }, // Course
            { wch: 20 }, // Instructor
            { wch: 12 }, // Room
            { wch: 25 }, // Branch
            { wch: 10 }, // Semester
            { wch: 10 }, // Section
            { wch: 10 }, // Type
        ];

        // Download file
        const filename = 'timetable_template.xlsx';
        XLSX.writeFile(wb, filename);
        showSuccess('Template downloaded successfully!');
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

                if (jsonData.length === 0) {
                    showError('The Excel file is empty. Please add data and try again.');
                    return;
                }

                // Map Excel columns to our data structure
                const mappedData = jsonData.map((row, index) => ({
                    id: `temp-${index}`,
                    day: row.Day || row.day || row.DAY || '',
                    startTime: formatExcelTime(row['Start Time'] || row.StartTime || row.startTime || row['start time'] || ''),
                    endTime: formatExcelTime(row['End Time'] || row.EndTime || row.endTime || row['end time'] || ''),
                    courseName: row.Course || row.course || row.COURSE || row['Course Name'] || row.Subject || '',
                    instructor: row.Instructor || row.instructor || row.INSTRUCTOR || row.Faculty || row.Teacher || '',
                    room: row.Room || row.room || row.ROOM || row['Room No'] || '',
                    branch: row.Branch || row.branch || row.BRANCH || row.Department || '',
                    semester: row.Semester || row.semester || row.SEMESTER || row.Sem || '',
                    section: row.Section || row.section || row.SECTION || '',
                    type: (row.Type || row.type || row.TYPE || 'lecture').toLowerCase(),
                    isValid: true
                }));

                // Validate data
                const validatedData = mappedData.map(row => ({
                    ...row,
                    isValid: row.day && row.startTime && row.courseName
                }));

                setExcelData(validatedData);
                setUploadModalOpen(true);
                showInfo(`Found ${validatedData.length} entries in the file`);
            } catch (err) {
                showError('Failed to parse Excel file. Please check the format and try again.');
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = ''; // Reset input
    };

    const formatExcelTime = (time) => {
        if (!time) return '';
        // Handle Excel time format (decimal number)
        if (typeof time === 'number') {
            const totalMinutes = Math.round(time * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        // Handle string time format
        return time.toString();
    };

    const handleConfirmUpload = async () => {
        const validEntries = excelData.filter(row => row.isValid);
        if (validEntries.length === 0) {
            showError('No valid entries to upload');
            return;
        }

        setUploading(true);
        let successCount = 0;
        let errorCount = 0;
        let firstError = null;

        try {
            for (const entry of validEntries) {
                const { id, isValid, ...data } = entry;
                try {
                    await timetableService.create(data, userData);
                    successCount++;
                } catch (err) {
                    errorCount++;
                    if (!firstError) {
                        firstError = err.message;
                    }
                    console.error('Failed to create entry:', err.message, 'Data:', data);
                }
            }

            if (successCount > 0) {
                showSuccess(`Successfully uploaded ${successCount} timetable entries`);
            }
            if (errorCount > 0) {
                const errorMsg = firstError
                    ? `Failed to upload ${errorCount} entries. Error: ${firstError}`
                    : `Failed to upload ${errorCount} entries`;
                showError(errorMsg);
            }

            setUploadModalOpen(false);
            setExcelData([]);
            loadData();
        } catch (error) {
            showError(error.message || 'Failed to upload entries');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveExcelRow = (index) => {
        setExcelData(prev => prev.filter((_, i) => i !== index));
    };

    const columns = [
        { key: 'day', label: 'Day', sortable: true },
        { key: 'startTime', label: 'Start Time' },
        { key: 'endTime', label: 'End Time' },
        { key: 'courseName', label: 'Course', sortable: true },
        { key: 'type', label: 'Type' },
        { key: 'instructor', label: 'Instructor' },
        { key: 'room', label: 'Room' },
        { key: 'section', label: 'Section' },
        { key: 'branch', label: 'Branch' },
        {
            key: 'updatedByName',
            label: 'Updated By'
        }
    ];

    const renderActions = (row) => (
        <>
            <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}><span className="material-icons-round">edit</span></button>
            {canPerformAction('delete') && <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setSelectedEntry(row); setDeleteModalOpen(true); }}><span className="material-icons-round">delete</span></button>}
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
                            <button className="btn-secondary" onClick={handleExportExcel}>
                                <span className="material-icons-round">file_download</span>
                                Export Excel
                            </button>
                            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                <span className="material-icons-round">upload_file</span>
                                Upload Excel
                            </button>
                            <button className="btn-primary" onClick={() => handleOpenModal()}>
                                <span className="material-icons-round">add</span>
                                Add Entry
                            </button>
                        </>
                    )}
                </div>
            </div>
            <DataTable columns={columns} data={timetable} loading={loading} searchable={true} searchKeys={['courseName', 'instructor', 'day']} actions={renderActions} />

            {/* Single Entry Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedEntry ? 'Edit Entry' : 'Add Entry'} size="medium">
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Day *</label>
                            <select value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })} required>
                                <option value="">Select Day</option>
                                <option value="Monday">Monday</option>
                                <option value="Tuesday">Tuesday</option>
                                <option value="Wednesday">Wednesday</option>
                                <option value="Thursday">Thursday</option>
                                <option value="Friday">Friday</option>
                                <option value="Saturday">Saturday</option>
                                <option value="Sunday">Sunday</option>
                            </select>
                        </div>
                        <div className="form-group"><label>Course *</label><select value={formData.courseId} onChange={(e) => setFormData({ ...formData, courseId: e.target.value })} required><option value="">Select</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Start Time *</label><input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required /></div>
                        <div className="form-group"><label>End Time *</label><input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}><option value="lecture">Lecture</option><option value="lab">Lab</option><option value="tutorial">Tutorial</option></select></div>
                        <div className="form-group"><label>Instructor</label><input type="text" value={formData.instructor} onChange={(e) => setFormData({ ...formData, instructor: e.target.value })} /></div>
                        <div className="form-group"><label>Room</label><input type="text" value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Branch *</label><select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} required><option value="">Select</option>{branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
                        <div className="form-group"><label>Semester *</label><select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} required><option value="">Select</option>{[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="form-group"><label>Section *</label><select value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} required><option value="">Select</option>{SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                </form>
            </Modal>

            {/* Excel Upload Preview Modal */}
            <Modal isOpen={uploadModalOpen} onClose={() => { setUploadModalOpen(false); setExcelData([]); }} title="Preview Timetable Upload" size="large">
                <div className="excel-preview">
                    <div className="excel-info">
                        <span className="material-icons-round">info</span>
                        <p>Review the data below. Entries marked in red have missing required fields (Day, Start Time, Course). Click upload to save valid entries.</p>
                    </div>

                    <div className="excel-table-container">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Course</th>
                                    <th>Type</th>
                                    <th>Instructor</th>
                                    <th>Room</th>
                                    <th>Branch</th>
                                    <th>Semester</th>
                                    <th>Section</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {excelData.map((row, index) => (
                                    <tr key={row.id} className={row.isValid ? '' : 'invalid-row'}>
                                        <td>{row.day || '-'}</td>
                                        <td>{row.startTime || '-'}</td>
                                        <td>{row.endTime || '-'}</td>
                                        <td>{row.courseName || '-'}</td>
                                        <td>{row.type || 'lecture'}</td>
                                        <td>{row.instructor || '-'}</td>
                                        <td>{row.room || '-'}</td>
                                        <td>{row.branch || '-'}</td>
                                        <td>{row.semester || '-'}</td>
                                        <td>{row.section || '-'}</td>
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
                            {uploading ? 'Uploading...' : `Upload ${excelData.filter(r => r.isValid).length} Entries`}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} message="Delete this entry?" />
        </div>
    );
};

export default Timetable;
