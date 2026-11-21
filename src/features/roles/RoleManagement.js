import React, { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiShield, FiUsers } from 'react-icons/fi';
import { fetchPermissionCatalogAPI, fetchRolesAPI } from '../../api';
import '../../styles/RoleManagement.css';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedRole = roles.find((role) => Number(role.id) === Number(selectedId));
  const groupedPermissions = useMemo(() => {
    const groups = new Map();
    for (const permission of catalog) {
      if (!groups.has(permission.module)) {
        groups.set(permission.module, {
          name: permission.moduleName,
          pages: new Map(),
        });
      }
      const group = groups.get(permission.module);
      if (!group.pages.has(permission.page)) {
        group.pages.set(permission.page, { name: permission.pageName, permissions: [] });
      }
      group.pages.get(permission.page).permissions.push(permission);
    }
    return [...groups.entries()];
  }, [catalog]);

  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    return roles.filter((role) => !query || role.name.toLowerCase().includes(query));
  }, [roles, roleSearch]);
  const selectedKeys = selectedRole?.permissions || [];

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [roleResponse, permissionResponse] = await Promise.all([
          fetchRolesAPI(),
          fetchPermissionCatalogAPI(),
        ]);
        if (!active) return;
        const nextRoles = roleResponse.data || [];
        setRoles(nextRoles);
        setCatalog(permissionResponse.data || []);
        setSelectedId((currentId) =>
          nextRoles.some((role) => Number(role.id) === Number(currentId))
            ? currentId
            : nextRoles[0]?.id ?? null
        );
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || 'Unable to load role settings');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="role-management">
      <header className="role-page-header">
        <div className="role-page-heading">
          <span className="role-page-icon"><FiShield /></span>
          <div>
            <p className="role-eyebrow">ACCESS CONTROL</p>
            <h1>Roles &amp; Permissions</h1>
            <p>Review the three fixed company roles and their permissions.</p>
          </div>
        </div>
        <div className="role-page-stat">
          <FiUsers />
          <span><strong>{roles.length}</strong> fixed roles</span>
        </div>
      </header>

      {error && <div className="role-message role-message--error" role="alert">{error}</div>}

      {loading ? (
        <div className="role-loading" role="status">Loading role settings…</div>
      ) : (
        <div className="role-workspace">
          <aside className="role-sidebar">
            <div className="role-sidebar-heading">
              <div>
                <h2>Company roles</h2>
                <p>Role definitions are fixed</p>
              </div>
              <span className="role-count">{roles.length}</span>
            </div>
            <label className="role-search">
              <FiSearch />
              <input
                type="search"
                aria-label="Search roles"
                placeholder="Search roles"
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
              />
            </label>
            <nav aria-label="Company roles" className="role-list">
              {filteredRoles.map((role) => (
                <button
                  type="button"
                  key={role.id}
                  onClick={() => setSelectedId(role.id)}
                  aria-pressed={Number(role.id) === Number(selectedId)}
                  className={`role-list-item${Number(role.id) === Number(selectedId) ? ' is-selected' : ''}`}
                >
                  <span className="role-list-icon"><FiShield /></span>
                  <span className="role-list-copy">
                    <strong>{role.name}</strong>
                    <span>{Number(role.userCount) || 0} users</span>
                  </span>
                  <span className="role-system-badge">Fixed role</span>
                </button>
              ))}
              {filteredRoles.length === 0 && (
                <p className="role-list-empty">{roles.length ? 'No matching roles.' : 'No roles are available.'}</p>
              )}
            </nav>
          </aside>

          {!selectedRole ? (
            <div className="role-editor role-editor--empty">
              <span className="role-empty-icon"><FiShield /></span>
              <h2>Select a role</h2>
              <p>Choose a role to review its permissions.</p>
            </div>
          ) : (
            <div className="role-editor">
              <div className="role-editor-header">
                <div className="role-editor-title">
                  <span className="role-editor-icon"><FiShield /></span>
                  <div>
                    <div className="role-title-line">
                      <h2>{selectedRole.name}</h2>
                      <span className="role-system-badge">Fixed role</span>
                    </div>
                    <p>{selectedRole.description}</p>
                  </div>
                </div>
              </div>

              <div className="role-permissions-heading">
                <div>
                  <h3>Permission matrix</h3>
                  <p>Permissions are enforced by the backend and cannot be changed here.</p>
                </div>
                <span className="role-permission-count">{selectedKeys.length} granted</span>
              </div>

              <div className="role-permission-grid">
                {groupedPermissions.map(([moduleKey, module]) => {
                  const modulePermissions = [...module.pages.values()].flatMap((page) => page.permissions);
                  const moduleSelectedCount = modulePermissions.filter((permission) =>
                    selectedKeys.includes(permission.permissionKey)
                  ).length;
                  return (
                    <section key={moduleKey} className="role-module-card">
                      <header className="role-module-header">
                        <div>
                          <h4>{module.name}</h4>
                          <span>{module.pages.size} {module.pages.size === 1 ? 'page' : 'pages'}</span>
                        </div>
                        <span className="role-module-count">{moduleSelectedCount}/{modulePermissions.length}</span>
                      </header>
                      {[...module.pages.entries()].map(([pageKey, page]) => (
                        <div key={pageKey} className="role-permission-page">
                          <h5>{page.name}</h5>
                          <div className="role-permission-actions">
                            {page.permissions.map((permission) => {
                              const checked = selectedKeys.includes(permission.permissionKey);
                              return (
                                <label
                                  key={permission.permissionKey}
                                  className={`role-permission-option${checked ? ' is-checked' : ''} is-disabled`}
                                >
                                  <input type="checkbox" checked={checked} disabled readOnly />
                                  <span>{permission.actionName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
