/* ===== SHIFT MANAGEMENT — Review & manage employee shifts and cash drawers ===== */
import React, { useEffect, useMemo, useState } from 'react';
import { FiPrinter, FiDownload, FiEye } from 'react-icons/fi';
import usePosStore from '../../store/posStore';
import { fetchCompanyUsersAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import {
    Button,
    Badge,
    Modal,
    Pagination,
    ToastContainer,
    LoadingSpinner,
    EmptyState,
} from '../../components/ui';
import { exportToCSV } from '../../utils/export';
import { todayISO } from '../../utils/date';
import '../../styles/ShiftManagement.css';

const ITEMS_PER_PAGE = 5;

function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return {
        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    };
}

function formatMoney(val) {
    const num = Number(val || 0);
    return `$${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getShiftStatusInfo(shift) {
    if (shift.status === 'OPEN') {
        return { label: 'Active', variant: 'success', key: 'ACTIVE' };
    }
    const expected = Number(shift.closingCashExpected || 0);
    const actual = Number(shift.closingCashActual || 0);
    const diff = actual - expected;
    if (Math.abs(diff) > 0.009) {
        return { label: 'Discrepancy', variant: 'danger', key: 'DISCREPANCY' };
    }
    return { label: 'Closed', variant: 'info', key: 'CLOSED' };
}

export default function ShiftManagement() {
    const toast = useToast();
    const {
        shiftList,
        loadingShiftList,
        shiftFilters,
        loadShiftDetails,
    } = usePosStore();

    const [employees, setEmployees] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedShift, setSelectedShift] = useState(null);

    // Local (draft) filter state — only applied to the store on "Apply Filters"
    const [draftFilters, setDraftFilters] = useState(shiftFilters);

    useEffect(() => {
        // Initial load — defaults to today's date range
        loadShiftDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        async function loadEmployees() {
            try {
                const res = await fetchCompanyUsersAPI(1);
                setEmployees(res?.data || []);
            } catch (err) {
                console.error('Failed to load employees', err);
            }
        }
        loadEmployees();
    }, []);

    const handleApplyFilters = async () => {
        setCurrentPage(1);
        try {
            await loadShiftDetails(draftFilters);
        } catch (err) {
            toast.error('Failed to load shift details.');
        }
    };

    const handleDraftChange = (patch) => {
        setDraftFilters((prev) => ({ ...prev, ...patch }));
    };

    // Client-side pagination over the fetched (filtered) list
    const totalPages = Math.ceil(shiftList.length / ITEMS_PER_PAGE) || 1;
    const paginatedShifts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return shiftList.slice(start, start + ITEMS_PER_PAGE);
    }, [shiftList, currentPage]);

    const handleExportCSV = () => {
        if (!shiftList.length) {
            toast.error('No shift data to export');
            return;
        }
        try {
            const rows = shiftList.map((s) => {
                const statusInfo = getShiftStatusInfo(s);
                const expected =
                    s.status === 'OPEN'
                        ? Number(s.openingFloat || 0) + Number(s.cashSalesTotal || 0)
                        : Number(s.closingCashExpected || 0);
                const actual = s.status === 'OPEN' ? '' : Number(s.closingCashActual || 0);
                const diff = s.status === 'OPEN' ? '' : (Number(s.closingCashActual || 0) - Number(s.closingCashExpected || 0)).toFixed(2);
                return {
                    'Shift ID': `SH-${s.id}`,
                    Employee: s.user?.name || '',
                    'Start Time': s.openedAt ? new Date(s.openedAt).toLocaleString('en-IN') : '',
                    'End Time': s.closedAt ? new Date(s.closedAt).toLocaleString('en-IN') : '',
                    'Expected Cash': expected.toFixed(2),
                    'Actual Cash': actual,
                    Difference: diff,
                    Status: statusInfo.label,
                };
            });
            exportToCSV(rows, `Shift_Report_${todayISO()}`);
            toast.success('CSV report downloaded ✓');
        } catch (err) {
            toast.error('Failed to export CSV.');
            console.error(err);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="sm-page">
            <ToastContainer toasts={toast.toasts} />

            <div className="page-header sm-no-print">
                <div className="page-header__left">
                    <h1>Shift Management</h1>
                    <p className="page-header__sub">
                        Review and manage employee shifts and cash drawers.
                    </p>
                </div>
                <div className="page-header__actions">
                    {/* <Button variant="secondary" onClick={handlePrint} icon={<FiPrinter />}>
                        Print Report
                    </Button> */}
                    <Button variant="primary" onClick={handleExportCSV} icon={<FiDownload />}>
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="sm-filter-bar sm-no-print">
                <div className="sm-filter-group sm-filter-group--range">
                    <label className="filter-label">Date Range</label>
                    <div className="sm-date-range">
                        <input
                            type="date"
                            className="form-input"
                            value={draftFilters.fromDate}
                            onChange={(e) => handleDraftChange({ fromDate: e.target.value })}
                        />
                        <span className="sm-date-sep">to</span>
                        <input
                            type="date"
                            className="form-input"
                            value={draftFilters.toDate}
                            onChange={(e) => handleDraftChange({ toDate: e.target.value })}
                        />
                    </div>
                </div>

                <div className="sm-filter-group">
                    <label className="filter-label">Employee</label>
                    <select
                        className="form-select"
                        value={draftFilters.userId}
                        onChange={(e) => handleDraftChange({ userId: e.target.value })}
                    >
                        <option value="">All Employees</option>
                        {employees.map((emp) => (
                            <option key={emp.id || emp._id} value={emp.id || emp._id}>
                                {emp.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="sm-filter-group">
                    <label className="filter-label">Status</label>
                    <select
                        className="form-select"
                        value={draftFilters.status}
                        onChange={(e) => handleDraftChange({ status: e.target.value })}
                    >
                        <option value="">All Statuses</option>
                        <option value="OPEN">Active</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>

                <div className="sm-filter-actions">
                    <Button variant="primary" onClick={handleApplyFilters}>
                        Apply Filters
                    </Button>
                </div>
            </div>

            <div className="sm-card">
                {loadingShiftList ? (
                    <LoadingSpinner message="Loading shift details..." />
                ) : shiftList.length === 0 ? (
                    <EmptyState
                        icon="🕒"
                        title="No Shifts Found"
                        description="No shifts match your selected filters."
                    />
                ) : (
                    <div className="sm-table-container">
                        <table className="sm-table">
                            <thead>
                                <tr>
                                    <th>Shift ID</th>
                                    <th>Employee</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Expected Cash</th>
                                    <th>Actual Cash</th>
                                    <th>Difference</th>
                                    <th>Status</th>
                                    <th className="sm-no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedShifts.map((shift) => {
                                    const start = formatDateTime(shift.openedAt);
                                    const end = formatDateTime(shift.closedAt);
                                    const statusInfo = getShiftStatusInfo(shift);
                                    const isOpen = shift.status === 'OPEN';
                                    const expected = isOpen
                                        ? Number(shift.openingFloat || 0) + Number(shift.cashSalesTotal || 0)
                                        : Number(shift.closingCashExpected || 0);
                                    const actual = Number(shift.closingCashActual || 0);
                                    const diff = actual - Number(shift.closingCashExpected || 0);

                                    return (
                                        <tr key={shift.id}>
                                            <td>
                                                <span className="sm-shift-id">#SH-{shift.id}</span>
                                            </td>
                                            <td>{shift.user?.name || '—'}</td>
                                            <td>
                                                <div className="sm-time-cell">
                                                    <span>{start.time}</span>
                                                    <span className="sm-time-sub">{start.date}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {shift.closedAt ? (
                                                    <div className="sm-time-cell">
                                                        <span>{end.time}</span>
                                                        <span className="sm-time-sub">{end.date}</span>
                                                    </div>
                                                ) : (
                                                    '--'
                                                )}
                                            </td>
                                            <td>{formatMoney(expected)}</td>
                                            <td>{isOpen ? '--' : formatMoney(actual)}</td>
                                            <td>
                                                {isOpen ? (
                                                    '--'
                                                ) : (
                                                    <span
                                                        className={
                                                            diff === 0
                                                                ? 'sm-diff sm-diff--zero'
                                                                : diff > 0
                                                                    ? 'sm-diff sm-diff--pos'
                                                                    : 'sm-diff sm-diff--neg'
                                                        }
                                                    >
                                                        {diff > 0 ? '+' : ''}
                                                        {formatMoney(diff).replace('$-', '-$')}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <Badge variant={statusInfo.variant}>
                                                    {statusInfo.key === 'ACTIVE' && <span className="sm-dot" />}
                                                    {statusInfo.key === 'DISCREPANCY' && '⚠ '}
                                                    {statusInfo.label}
                                                </Badge>
                                            </td>
                                            <td className="sm-no-print">
                                                <button
                                                    className="sm-eye-btn"
                                                    onClick={() => setSelectedShift(shift)}
                                                    aria-label="View shift details"
                                                >
                                                    <FiEye />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {shiftList.length > 0 && (
                <div className="sm-no-print">
                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        from={(currentPage - 1) * ITEMS_PER_PAGE + 1}
                        to={Math.min(currentPage * ITEMS_PER_PAGE, shiftList.length)}
                        total={shiftList.length}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            <Modal
                open={!!selectedShift}
                onClose={() => setSelectedShift(null)}
                title={selectedShift ? `Shift #SH-${selectedShift.id} Details` : ''}
            >
                {selectedShift && (
                    <div className="sm-detail-grid">
                        <div className="sm-detail-row">
                            <span>Employee</span>
                            <strong>{selectedShift.user?.name || '—'}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Email</span>
                            <strong>{selectedShift.user?.email || '—'}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Terminal</span>
                            <strong>{selectedShift.terminalId || '—'}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Status</span>
                            <Badge variant={getShiftStatusInfo(selectedShift).variant}>
                                {getShiftStatusInfo(selectedShift).label}
                            </Badge>
                        </div>
                        <div className="sm-detail-row">
                            <span>Opened At</span>
                            <strong>
                                {selectedShift.openedAt
                                    ? new Date(selectedShift.openedAt).toLocaleString('en-IN')
                                    : '—'}
                            </strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Closed At</span>
                            <strong>
                                {selectedShift.closedAt
                                    ? new Date(selectedShift.closedAt).toLocaleString('en-IN')
                                    : '—'}
                            </strong>
                        </div>
                        <div className="sm-detail-divider" />
                        <div className="sm-detail-row">
                            <span>Opening Float</span>
                            <strong>{formatMoney(selectedShift.openingFloat)}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Cash Sales</span>
                            <strong>{formatMoney(selectedShift.cashSalesTotal)}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Card Sales</span>
                            <strong>{formatMoney(selectedShift.cardSalesTotal)}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>UPI Sales</span>
                            <strong>{formatMoney(selectedShift.upiSalesTotal)}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Total Sales Count</span>
                            <strong>{selectedShift.totalSalesCount ?? 0}</strong>
                        </div>
                        <div className="sm-detail-divider" />
                        <div className="sm-detail-row">
                            <span>Expected Closing Cash</span>
                            <strong>{formatMoney(selectedShift.closingCashExpected)}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Actual Closing Cash</span>
                            <strong>{formatMoney(selectedShift.closingCashActual)}</strong>
                        </div>
                        <div className="sm-detail-row">
                            <span>Difference</span>
                            <strong>
                                {formatMoney(
                                    Number(selectedShift.closingCashActual || 0) -
                                    Number(selectedShift.closingCashExpected || 0)
                                )}
                            </strong>
                        </div>
                        {selectedShift.notes && (
                            <>
                                <div className="sm-detail-divider" />
                                <div className="sm-detail-row sm-detail-row--notes">
                                    <span>Notes</span>
                                    <p>{selectedShift.notes}</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}