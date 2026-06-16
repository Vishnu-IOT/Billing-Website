/* ===== USERS REPORT SECTION ===== */
import React, { useState, useEffect, useMemo } from 'react';
import { fetchCompanyUsersAPI } from '../../api';
import { exportToExcel } from '../../utils/export';
import { useToast } from '../../hooks/useToast';
import { ToastContainer, Button, SearchBar, Pagination } from '../../components/ui';
import { FiDownload } from 'react-icons/fi';
import '../../styles/UserManagement.css'; // Reuses styles from User Management

export default function UsersReport() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const res = await fetchCompanyUsersAPI(1); // Default company ID = 1
        setUsers(res.data || []);
      } catch (err) {
        toast.error('Failed to load user listing.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q);

      const r = roleFilter.toUpperCase();
      const matchRole = r === 'ALL' || String(u.role).toUpperCase() === r;

      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  // Totals calculations
  const totalCount = filteredUsers.length;
  const activeCount = filteredUsers.filter((u) => u.is_active || u.status === '1').length;

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  // Export to Excel handler
  const handleExport = () => {
    try {
      const exportRows = filteredUsers.map((u) => ({
        Name: u.name || '',
        Email: u.email || '',
        Role: u.role || 'Staff',
        Phone: u.phone || 'N/A',
        Status: u.is_active || u.status === '1' ? 'Active' : 'Inactive',
        'Created Date': u.createdAt
          ? new Date(u.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : 'N/A',
      }));

      if (exportRows.length === 0) {
        toast.error('No user data to export');
        return;
      }

      exportToExcel(exportRows, 'Users Report', `Users_Report_${new Date().toISOString().split('T')[0]}`);
      toast.success('Excel report downloaded ✓');
    } catch (err) {
      toast.error('Failed to export to Excel.');
      console.error(err);
    }
  };

  return (
    <div className="um-page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Users Report</h1>
          <p className="page-header__sub">
            Review and export company users list
          </p>
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={handleExport} icon={<FiDownload />}>
            Download Excel
          </Button>
        </div>
      </div>

      {/* Analytics count badges */}
      <div 
        className="stat-grid" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 'var(--sp-4)', 
          marginBottom: 'var(--sp-2)' 
        }}
      >
        <div 
          className="stat-card" 
          style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: 'var(--sp-4)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--sp-4)' 
          }}
        >
          <div style={{ fontSize: '32px' }}>👥</div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL USERS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount}</div>
          </div>
        </div>

        <div 
          className="stat-card" 
          style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: 'var(--sp-4)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--sp-4)' 
          }}
        >
          <div style={{ fontSize: '32px' }}>🟢</div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE USERS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{activeCount}</div>
          </div>
        </div>
      </div>

      <div className="um-action-bar">
        <div className="um-search-wrap">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setCurrentPage(1); }}
            placeholder="Search users by name, email..."
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Filter Role:
          </label>
          <select
            className="um-form-select"
            style={{ width: 'auto', padding: '6px 12px' }}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Staff</option>
            <option value="BILLER">Biller</option>
          </select>
        </div>
      </div>

      <div className="um-card">
        {loading ? (
          <div style={{ display: 'flex', padding: '60px 0', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading users list...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="um-empty-state">
            <div className="um-empty-icon">👥</div>
            <h3 className="um-empty-title">No Users Found</h3>
            <p className="um-empty-desc">
              {search || roleFilter !== 'ALL'
                ? 'No users match your filters.'
                : 'Get started by onboarding staff.'}
            </p>
          </div>
        ) : (
          <div className="um-table-container">
            <table className="um-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const id = user.id || user._id;
                  const roleCls = `um-badge um-badge--${user.role || 'Staff'}`;
                  const isActive = user.is_active || user.status === '1';
                  const statusCls = `um-badge um-badge--${isActive ? 'Active' : 'Inactive'}`;

                  return (
                    <tr key={id}>
                      <td>
                        <div className="um-user-info">
                          <span className="um-user-name">{user.name}</span>
                          <span className="um-user-email">{user.email}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 'var(--fs-sm)' }}>
                          {user.phone || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span className={roleCls}>{user.role || 'Staff'}</span>
                      </td>
                      <td>
                        <span className={statusCls}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredUsers.length > itemsPerPage && (
        <div style={{ marginTop: '12px' }}>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            from={(currentPage - 1) * itemsPerPage + 1}
            to={Math.min(currentPage * itemsPerPage, filteredUsers.length)}
            total={filteredUsers.length}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
