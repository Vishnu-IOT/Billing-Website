import React, { useState, useEffect } from "react";
import {
  fetchCompanyUsersAPI,
  addCompanyUserAPI,
  updateCompanyUserAPI,
  deleteCompanyUserAPI,
} from "../../api";
import { fetchAssignableRolesAPI } from "../../api";
import useAuthStore from "../../store/authStore";
import { hasPermission } from "../../utils/permissions";
import {
  Button,
  Modal,
  ConfirmModal,
  SearchBar,
  ToastContainer,
} from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import "../../styles/UserManagement.css";

export default function UserManagement() {
  const toast = useToast();
  const currentUser = useAuthStore((state) => state.user);
  const refreshAccess = useAuthStore((state) => state.refreshAccess);
  const logout = useAuthStore((state) => state.logout);

  // ── States ──
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = Add, object = Edit
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
    status: "1",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch Users ──
  async function loadUsers() {
    setLoading(true);
    try {
      const data = await fetchCompanyUsersAPI(currentUser?.companyId);
      if (!data?.success) {
        throw new Error(data?.response?.data?.message || data?.message || "User list request was denied");
      }
      setUsers(data.data || []);
      if (
        hasPermission(currentUser, "users.directory.create") ||
        hasPermission(currentUser, "users.directory.edit")
      ) {
        const roleData = await fetchAssignableRolesAPI();
        setRoles(roleData.data || []);
      } else {
        setRoles([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to load user listing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [currentUser?.companyId]);

  // ── Form Input Change ──
  function handleInputChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  // ── Form Validation ──
  function validateForm() {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = "Full name is required";
    }
    if (!form.email.trim()) {
      errors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = "Invalid email address";
    }
    if (!form.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(form.phone)) {
      errors.phone = "Phone number must be exactly 10 digits or only Numbers";
    }
    if (!editingUser) {
      if (!form.password.trim()) {
        errors.password = "Password is required";
      } else if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
          form.password,
        )
      ) {
        errors.password =
          "Password must contain uppercase, lowercase, number, special character and minimum 8 characters";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Add User Trigger ──
  function handleAddClick() {
    setEditingUser(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      roleId: String(roles.find((role) => role.systemKey === "STAFF")?.id || ""),
      status: "1",
    });
    setFormErrors({});
    setModalOpen(true);
  }

  // ── Edit User Trigger ──
  function handleEditClick(user) {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      roleId: String(user.roleId || ""),
      status: user.is_active === true ? "1" : "0" || "1",
    });
    setFormErrors({});
    setModalOpen(true);
  }

  // ── Delete User Trigger ──
  function handleDeleteClick(user) {
    setDeletingUser(user);
    setDeleteOpen(true);
  }

  // ── Save/Update Form Submit ──
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (editingUser) {
        // Edit Mode
        const id = editingUser.id || editingUser._id;
        const result = await updateCompanyUserAPI(id, { ...form, roleId: Number(form.roleId) });
        if (result?.success) {
          toast.success("User updated successfully.");
          if (Number(id) === Number(currentUser?.id)) {
            if (form.status === "0") {
              setModalOpen(false);
              logout();
              return;
            }
            await refreshAccess();
          }
          setModalOpen(false);
          loadUsers();
        } else {
          toast.error(result?.response?.data?.message || result?.message || "Failed to update user.");
        }
      } else {
        // Add Mode
        const result = await addCompanyUserAPI(currentUser.companyId, { ...form, roleId: Number(form.roleId) });
        if (result?.success) {
          toast.success("User registered successfully.");
          setModalOpen(false);
          loadUsers();
        } else {
          toast.error(result?.response?.data?.message || result?.message || "Failed to add user.");
        }
      }
    } catch (err) {
      toast.error("An error occurred while saving user.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Confirm Deletion ──
  async function handleConfirmDelete() {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const id = deletingUser.id || deletingUser._id;
      const result = await deleteCompanyUserAPI(id, toast);
      if (result.success) {
        toast.success("User removed successfully.");
        setDeleteOpen(false);
        loadUsers();
      } else {
        toast.error("Failed to delete user.");
      }
    } catch (err) {
      toast.error("An error occurred during deletion.");
    } finally {
      setDeleting(false);
      setDeletingUser(null);
    }
  }

  // ── Search Filtering ──
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="um-page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>User Management</h1>
          <p className="page-header__sub">
            Company-wise staff directory and roles control
          </p>
        </div>
        <div className="page-header__right">
          {hasPermission(currentUser, "users.directory.create") && (
            <Button variant="primary" onClick={handleAddClick} icon={<FiPlus />}>
              Add User
            </Button>
          )}
        </div>
      </div>

      <div className="um-action-bar">
        <div className="um-search-wrap">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search users by name, email..."
          />
        </div>
        <div
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          Total Staff Count: <strong>{filteredUsers.length}</strong>
        </div>
      </div>

      <div className="um-card">
        {loading ? (
          <div
            style={{
              display: "flex",
              padding: "60px 0",
              justifyContent: "center",
            }}
          >
            <p style={{ color: "var(--text-muted)" }}>Loading users list...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="um-empty-state">
            <div className="um-empty-icon">👥</div>
            <h3 className="um-empty-title">No Users Found</h3>
            <p className="um-empty-desc">
              {searchTerm
                ? "No users match your search query."
                : "Get started by onboarding staff."}
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
                  <th style={{ width: "80px", textAlign: "center" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const id = user.id || user._id;
                  const roleCls = `um-badge um-badge--${user.role || "Owner"}`;
                  const statusCls = `um-badge um-badge--${user.is_active ? "Active" : "Inactive" || "1"}`;

                  return (
                    <tr key={id}>
                      <td>
                        <div className="um-user-info">
                          <span className="um-user-name">{user.name}</span>
                          <span className="um-user-email">{user.email}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "var(--fs-sm)" }}>
                          {user.phone || "N/A"}
                        </div>
                      </td>
                      <td>
                        <span className={roleCls}>{user.assignedRole?.name || user.role || "Unassigned"}</span>
                      </td>
                      <td>
                        <span className={statusCls}>
                          {user.is_active ? "Active" : "Inactive" || "1"}
                        </span>
                      </td>
                      <td>
                        <div className="um-btn-actions">
                          {hasPermission(currentUser, "users.directory.edit") && <button
                            className="um-btn-action um-btn-action--edit"
                            title="Edit User"
                            onClick={() => handleEditClick(user)}
                          >
                            <FiEdit2 />
                          </button>}
                          {hasPermission(currentUser, "users.directory.delete") && <button
                            className="um-btn-action um-btn-action--delete"
                            title="Delete User"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <FiTrash2 />
                          </button>}
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

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? "Update Staff Member" : "Register New Staff"}
      >
        <form onSubmit={handleSubmit} className="um-modal-form">
          <div className="um-form-group">
            <label className="um-form-label um-form-label--required">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              className={`um-form-input ${formErrors.name ? "um-form-input--error" : ""}`}
              value={form.name}
              onChange={handleInputChange}
              placeholder="e.g. Rahul Sharma"
            />
            {formErrors.name && (
              <span className="um-error-text">{formErrors.name}</span>
            )}
          </div>

          <div className="um-form-group">
            <label className="um-form-label um-form-label--required">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              className={`um-form-input ${formErrors.email ? "um-form-input--error" : ""}`}
              value={form.email}
              onChange={handleInputChange}
              placeholder="e.g. rahul@company.com"
            />
            {formErrors.email && (
              <span className="um-error-text">{formErrors.email}</span>
            )}
          </div>

          <div className="um-form-group">
            <label className="um-form-label um-form-label--required">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              className={`um-form-input ${formErrors.phone ? "um-form-input--error" : ""}`}
              inputMode="numeric"
              value={form.phone}
              onChange={handleInputChange}
              placeholder="10 digit mobile number"
              maxLength={10}
            />
            {formErrors.phone && (
              <span className="um-error-text">{formErrors.phone}</span>
            )}
          </div>

          {!editingUser && (
            <div className="um-form-group">
              <label className="um-form-label um-form-label--required">
                Password
              </label>
              <input
                type="password"
                name="password"
                title={`Password Requirements:
                  • Minimum 8 characters
                  • One uppercase letter
                  • One lowercase letter
                  • One number
                  • One special character`}
                className={`um-form-input ${formErrors.password ? "um-form-input--error" : ""}`}
                value={form.password}
                onChange={handleInputChange}
                placeholder="Enter password"
              />
              {formErrors.password && (
                <span className="um-error-text">{formErrors.password}</span>
              )}
            </div>
          )}

          <div className="um-form-group">
            <label className="um-form-label">Access Role</label>
            <select
              name="roleId"
              className="um-form-select"
              value={form.roleId}
              onChange={handleInputChange}
            >
              <option value="">Select a role</option>
              {roles
                .filter((role) => role.status === "ACTIVE")
                .map((role) => (
                  <option key={role.id} value={String(role.id)}>{role.name}</option>
                ))}
            </select>
          </div>

          <div className="um-form-group">
            <label className="um-form-label">Status</label>
            <select
              name="status"
              className="um-form-select"
              value={form.status}
              onChange={handleInputChange}
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 12,
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting} disabled={!form.roleId}>
              {editingUser ? "Save Changes" : "Create Staff/Rep"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Revoke Staff Access?"
        message={`Are you sure you want to delete ${deletingUser?.name || "this staff member"}? This will remove all their access permissions.`}
        loading={deleting}
      />
    </div>
  );
}
