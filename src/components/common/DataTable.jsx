import { useState, useMemo } from 'react';
import { filterBySearch, paginate } from '../../utils/helpers';
import './DataTable.css';

const DataTable = ({
    columns,
    data = [],
    loading = false,
    searchable = true,
    searchKeys = [],
    pagination = true,
    pageSize = 10,
    actions,
    emptyMessage = 'No data available',
    onRowClick,
    className = ''
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Filter and sort data
    const processedData = useMemo(() => {
        let result = [...data];

        // Apply search filter
        if (searchTerm && searchKeys.length > 0) {
            result = filterBySearch(result, searchTerm, searchKeys);
        }

        // Apply sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                const comparison = aValue.localeCompare ?
                    aValue.localeCompare(bValue) :
                    aValue - bValue;
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }

        return result;
    }, [data, searchTerm, searchKeys, sortConfig]);

    // Paginate data
    const paginatedData = useMemo(() => {
        if (!pagination) return processedData;
        return paginate(processedData, currentPage, pageSize);
    }, [processedData, currentPage, pageSize, pagination]);

    // Calculate total pages
    const totalPages = Math.ceil(processedData.length / pageSize);

    // Handle sort
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Render pagination
    const renderPagination = () => {
        if (!pagination || totalPages <= 1) return null;

        const pages = [];
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            pages.push(
                <button
                    key={i}
                    className={`page-btn ${currentPage === i ? 'active' : ''}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="pagination">
                <button
                    className="page-btn"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                >
                    <span className="material-icons-round">chevron_left</span>
                </button>
                {pages}
                <button
                    className="page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                >
                    <span className="material-icons-round">chevron_right</span>
                </button>
            </div>
        );
    };

    return (
        <div className={`data-card ${className}`}>
            {searchable && (
                <div className="table-header">
                    <div className="table-search">
                        <span className="material-icons-round">search</span>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                    className={col.sortable ? 'sortable' : ''}
                                >
                                    {col.label}
                                    {col.sortable && sortConfig.key === col.key && (
                                        <span className="material-icons-round sort-icon">
                                            {sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                        </span>
                                    )}
                                </th>
                            ))}
                            {actions && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="loading-cell">
                                    <div className="loader small"></div>
                                </td>
                            </tr>
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="empty-cell">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, index) => (
                                <tr
                                    key={row.id || index}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={onRowClick ? 'clickable' : ''}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="actions-cell">
                                            {actions(row)}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="table-footer">
                <span className="showing-text">
                    Showing {paginatedData.length} of {processedData.length} items
                </span>
                {renderPagination()}
            </div>
        </div>
    );
};

export default DataTable;
