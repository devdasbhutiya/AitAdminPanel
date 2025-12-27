import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { attendanceService, studentsService, branchesService, coursesService } from '../services';
import { DataTable } from '../components/common';
import { formatTimestamp, SECTIONS } from '../utils/helpers';
import './Attendance.css';

const Attendance = () => {
    const { userData } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();

    // Tab state
    const [activeTab, setActiveTab] = useState('mark'); // 'mark', 'records', 'summary'

    // Data states
    const [branches, setBranches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        branch: '',
        semester: '',
        section: '',
        courseId: '',
        date: new Date().toISOString().split('T')[0] // Today's date
    });

    // Attendance marking state
    const [presentStudents, setPresentStudents] = useState(new Set());
    const [existingAttendance, setExistingAttendance] = useState(null);

    // Load initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [branchesData, coursesData] = await Promise.all([
                branchesService.getAll(),
                coursesService.getAll()
            ]);
            setBranches(branchesData);
            setCourses(coursesData);
        } catch (error) {
            showError('Failed to load data');
        }
    };

    // Load students when filters change (for marking tab)
    useEffect(() => {
        if (activeTab === 'mark' && filters.branch && filters.semester && filters.section) {
            loadStudents();
        }
    }, [filters.branch, filters.semester, filters.section, activeTab]);

    // Load existing attendance when date/course changes
    useEffect(() => {
        if (activeTab === 'mark' && filters.courseId && filters.date && filters.section) {
            loadExistingAttendance();
        }
    }, [filters.courseId, filters.date, filters.section, activeTab]);

    // Load attendance records when viewing records tab
    useEffect(() => {
        if (activeTab === 'records') {
            loadAttendanceRecords();
        }
    }, [activeTab, filters.branch, filters.semester, filters.section, filters.courseId]);

    // Load summaries when viewing summary tab
    useEffect(() => {
        if (activeTab === 'summary' && filters.branch && filters.semester && filters.section) {
            loadSummaries();
        }
    }, [activeTab, filters.branch, filters.semester, filters.section, filters.courseId]);

    const loadStudents = async () => {
        try {
            setLoading(true);
            // Keep semester as string since Firestore stores it as string
            // Firestore requires exact type match for queries

            console.log('[Attendance] Loading students with filters:', {
                branch: filters.branch,
                semester: filters.semester,
                section: filters.section
            });

            const studentsData = await studentsService.getAll({
                branch: filters.branch,
                semester: filters.semester,
                section: filters.section
            });

            console.log('[Attendance] Students loaded:', studentsData.length);
            setStudents(studentsData);
            // Reset present students when loading new list
            setPresentStudents(new Set());
            setExistingAttendance(null);
        } catch (error) {
            console.error('[Attendance] Error loading students:', error);
            showError('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const loadExistingAttendance = async () => {
        try {
            const existing = await attendanceService.getByDateAndCourse(
                filters.courseId,
                filters.date,
                filters.section
            );
            if (existing) {
                setExistingAttendance(existing);
                setPresentStudents(new Set(existing.presentStudents || []));
                showInfo('Existing attendance found for this date');
            } else {
                setExistingAttendance(null);
                setPresentStudents(new Set());
            }
        } catch (error) {
            console.error('Error loading existing attendance:', error);
        }
    };

    const loadAttendanceRecords = async () => {
        try {
            setLoading(true);
            const recordFilters = {};
            if (filters.branch) recordFilters.branch = filters.branch;
            if (filters.semester) recordFilters.semester = filters.semester;
            if (filters.section) recordFilters.section = filters.section;
            if (filters.courseId) recordFilters.courseId = filters.courseId;

            const records = await attendanceService.getAll(recordFilters);
            setAttendanceRecords(records);
        } catch (error) {
            showError('Failed to load attendance records');
        } finally {
            setLoading(false);
        }
    };

    const loadSummaries = async () => {
        try {
            setLoading(true);
            // Keep semester as string for Firestore query type matching

            const summaryFilters = {
                branch: filters.branch,
                semester: filters.semester,
                section: filters.section
            };
            if (filters.courseId) {
                summaryFilters.courseId = filters.courseId;
            }

            console.log('[Attendance] Loading summaries with filters:', summaryFilters);
            const summaryData = await attendanceService.getClassSummary(summaryFilters);
            console.log('[Attendance] Summaries loaded:', summaryData.length);
            setSummaries(summaryData);
        } catch (error) {
            console.error('[Attendance] Error loading summaries:', error);
            showError('Failed to load attendance summaries');
        } finally {
            setLoading(false);
        }
    };

    // Filter courses based on selected branch and semester
    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            if (filters.branch && course.department !== filters.branch) return false;
            if (filters.semester && String(course.semester) !== String(filters.semester)) return false;
            return true;
        });
    }, [courses, filters.branch, filters.semester]);

    // Get selected course details
    const selectedCourse = useMemo(() => {
        return courses.find(c => c.id === filters.courseId);
    }, [courses, filters.courseId]);

    // Toggle student attendance
    const toggleStudentAttendance = (enrollmentNo) => {
        setPresentStudents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(enrollmentNo)) {
                newSet.delete(enrollmentNo);
            } else {
                newSet.add(enrollmentNo);
            }
            return newSet;
        });
    };

    // Select/Deselect all
    const toggleSelectAll = () => {
        if (presentStudents.size === students.length) {
            setPresentStudents(new Set());
        } else {
            setPresentStudents(new Set(students.map(s => s.enrollmentNo)));
        }
    };

    // Submit attendance
    const handleSubmitAttendance = async () => {
        if (!filters.courseId) {
            showError('Please select a course');
            return;
        }
        if (!filters.date) {
            showError('Please select a date');
            return;
        }
        if (students.length === 0) {
            showError('No students found for this class');
            return;
        }

        setSubmitting(true);
        try {
            const attendanceData = {
                courseId: filters.courseId,
                courseName: selectedCourse?.name || '',
                branch: filters.branch,
                semester: filters.semester,
                section: filters.section,
                date: filters.date,
                presentStudents: Array.from(presentStudents),
                totalStudents: students.length
            };

            await attendanceService.markAttendance(attendanceData, userData);
            showSuccess(`Attendance marked: ${presentStudents.size}/${students.length} present`);
            setExistingAttendance({ ...attendanceData });
        } catch (error) {
            showError(error.message || 'Failed to mark attendance');
        } finally {
            setSubmitting(false);
        }
    };

    // Get initials from name
    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '?';
        // If it has spaces, split by spaces (for names like "John Doe")
        if (name.includes(' ')) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        // Otherwise just return first 2 characters (for enrollment numbers, etc.)
        return name.slice(0, 2).toUpperCase();
    };

    // Get percentage class
    const getPercentageClass = (percentage) => {
        if (percentage >= 75) return 'good';
        if (percentage >= 50) return 'warning';
        return 'danger';
    };

    // Records table columns
    const recordColumns = [
        { key: 'date', label: 'Date', sortable: true },
        { key: 'courseName', label: 'Course' },
        { key: 'branch', label: 'Branch' },
        { key: 'semester', label: 'Sem' },
        { key: 'section', label: 'Sec' },
        {
            key: 'presentStudents',
            label: 'Present',
            render: (v, row) => `${(v || []).length}/${row.totalStudents || 0}`
        },
        { key: 'markedByName', label: 'Marked By' },
        { key: 'createdAt', label: 'Time', render: (v) => formatTimestamp(v) }
    ];

    return (
        <div className="attendance-page">
            {/* Tabs */}
            <div className="attendance-tabs">
                <button
                    className={`tab-btn ${activeTab === 'mark' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mark')}
                >
                    <span className="material-icons-round">edit_note</span>
                    <span>Mark Attendance</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
                    onClick={() => setActiveTab('records')}
                >
                    <span className="material-icons-round">history</span>
                    <span>Records</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    <span className="material-icons-round">analytics</span>
                    <span>Summary</span>
                </button>
            </div>

            {/* Filters */}
            <div className="filter-card">
                <h3>
                    <span className="material-icons-round">filter_alt</span>
                    Select Class
                </h3>
                <div className="filter-row">
                    <div className="form-group">
                        <label>Branch *</label>
                        <select
                            value={filters.branch}
                            onChange={(e) => setFilters({ ...filters, branch: e.target.value, courseId: '' })}
                        >
                            <option value="">Select Branch</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Semester *</label>
                        <select
                            value={filters.semester}
                            onChange={(e) => setFilters({ ...filters, semester: e.target.value, courseId: '' })}
                        >
                            <option value="">Select Semester</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Section *</label>
                        <select
                            value={filters.section}
                            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                        >
                            <option value="">Select Section</option>
                            {SECTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    {(activeTab === 'mark' || activeTab === 'summary') && (
                        <div className="form-group">
                            <label>Course {activeTab === 'mark' ? '*' : ''}</label>
                            <select
                                value={filters.courseId}
                                onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
                                disabled={!filters.branch || !filters.semester}
                            >
                                <option value="">Select Course</option>
                                {filteredCourses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {activeTab === 'mark' && (
                        <div className="form-group">
                            <label>Date *</label>
                            <input
                                type="date"
                                value={filters.date}
                                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Mark Attendance Tab */}
            {activeTab === 'mark' && (
                <>
                    {!filters.branch || !filters.semester || !filters.section ? (
                        <div className="student-list-card">
                            <div className="empty-state">
                                <span className="material-icons-round">school</span>
                                <h3>Select a Class</h3>
                                <p>Choose branch, semester, and section to view students</p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="student-list-card">
                            <div className="loading-state">
                                <span className="material-icons-round spin">sync</span>
                            </div>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="student-list-card">
                            <div className="empty-state">
                                <span className="material-icons-round">person_off</span>
                                <h3>No Students Found</h3>
                                <p>No students are registered for this class</p>
                            </div>
                        </div>
                    ) : (
                        <div className="student-list-card">
                            <div className="student-list-header">
                                <h3>
                                    <span className="material-icons-round">groups</span>
                                    Students ({students.length})
                                    {existingAttendance && (
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#f59e0b',
                                            background: '#fef3c7',
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            marginLeft: '8px'
                                        }}>
                                            Editing existing
                                        </span>
                                    )}
                                </h3>
                                <div className="student-count">
                                    <div className="count-badge present">
                                        <span className="material-icons-round">check_circle</span>
                                        {presentStudents.size} Present
                                    </div>
                                    <div className="count-badge absent">
                                        <span className="material-icons-round">cancel</span>
                                        {students.length - presentStudents.size} Absent
                                    </div>
                                </div>
                            </div>

                            <div className="select-all-row">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={presentStudents.size === students.length && students.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                    Select All Students
                                </label>
                            </div>

                            <div className="student-list">
                                {students.map((student) => (
                                    <div
                                        key={student.id}
                                        className={`student-row ${presentStudents.has(student.enrollmentNo) ? 'present' : ''}`}
                                        onClick={() => toggleStudentAttendance(student.enrollmentNo)}
                                    >
                                        <input
                                            type="checkbox"
                                            className="student-checkbox"
                                            checked={presentStudents.has(student.enrollmentNo)}
                                            onChange={() => toggleStudentAttendance(student.enrollmentNo)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="student-info">
                                            <div className="student-avatar">
                                                {getInitials(student.name)}
                                            </div>
                                            <div className="student-details">
                                                <span className="student-name">{student.name}</span>
                                                <span className="student-enrollment">{student.enrollmentNo}</span>
                                            </div>
                                        </div>
                                        <span className={`attendance-status ${presentStudents.has(student.enrollmentNo) ? 'present' : 'absent'}`}>
                                            {presentStudents.has(student.enrollmentNo) ? 'Present' : 'Absent'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="submit-area">
                                <button
                                    className="btn-primary"
                                    onClick={handleSubmitAttendance}
                                    disabled={submitting || !filters.courseId || !filters.date}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="material-icons-round spin">sync</span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round">save</span>
                                            {existingAttendance ? 'Update Attendance' : 'Submit Attendance'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Records Tab */}
            {activeTab === 'records' && (
                <DataTable
                    columns={recordColumns}
                    data={attendanceRecords}
                    loading={loading}
                    searchable={true}
                    searchKeys={['courseName', 'branch', 'date', 'markedByName']}
                    emptyMessage="No attendance records found"
                />
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
                <>
                    {!filters.branch || !filters.semester || !filters.section ? (
                        <div className="student-list-card">
                            <div className="empty-state">
                                <span className="material-icons-round">analytics</span>
                                <h3>Select a Class</h3>
                                <p>Choose branch, semester, and section to view attendance summary</p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="student-list-card">
                            <div className="loading-state">
                                <span className="material-icons-round spin">sync</span>
                            </div>
                        </div>
                    ) : summaries.length === 0 ? (
                        <div className="student-list-card">
                            <div className="empty-state">
                                <span className="material-icons-round">bar_chart</span>
                                <h3>No Summary Data</h3>
                                <p>No attendance has been marked for this class yet</p>
                            </div>
                        </div>
                    ) : (
                        <div className="summary-grid">
                            {summaries.map((summary) => (
                                <div key={summary.id} className="summary-card">
                                    <div className="summary-card-header">
                                        <div className="summary-avatar">
                                            {getInitials(summary.enrollmentNo)}
                                        </div>
                                        <div className="summary-info">
                                            <h4>{summary.enrollmentNo}</h4>
                                            <p>{summary.courseName || summary.courseId}</p>
                                        </div>
                                    </div>
                                    <div className="summary-stats">
                                        <div className="stat-item">
                                            <div className="stat-value">{summary.attended}</div>
                                            <div className="stat-label">Attended</div>
                                        </div>
                                        <div className="stat-item">
                                            <div className="stat-value">{summary.total}</div>
                                            <div className="stat-label">Total</div>
                                        </div>
                                        <div className={`percentage-badge ${getPercentageClass(summary.percentage)}`}>
                                            {summary.percentage}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Attendance;
