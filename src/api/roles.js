import { axios, BASE_URL, getAuthHeaders } from './client';

const request = async (method, path, data) => {
  const response = await axios({ method, url: `${BASE_URL}${path}`, data, ...getAuthHeaders() });
  return response.data;
};

export const fetchRolesAPI = () => request('get', '/roles');
export const fetchAssignableRolesAPI = () => request('get', '/roles/assignable');
export const fetchPermissionCatalogAPI = () => request('get', '/permissions');
export const createRoleAPI = (data) => request('post', '/roles', data);
export const updateRoleAPI = (id, data) => request('put', `/roles/${id}`, data);
export const deleteRoleAPI = (id) => request('delete', `/roles/${id}`);
export const duplicateRoleAPI = (id) => request('post', `/roles/${id}/duplicate`);
export const updateRolePermissionsAPI = (id, permissionKeys) =>
  request('put', `/roles/${id}/permissions`, { permissionKeys });
