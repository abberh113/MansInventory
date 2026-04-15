import axios from 'axios';
import type { User } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const loginUser = (email: string, password: string) => {
  const form = new URLSearchParams();
  form.append('username', email); // OAuth2 expects 'username' field, we pass email
  form.append('password', password);
  return API.post('/api/v1/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};

export const registerUser = (data: { full_name: string; email: string; password: string; role?: string }) =>
  API.post('/api/v1/auth/register', data);

export const logoutUser = () => API.post('/api/v1/auth/logout');

export const requestPasswordReset = (email: string) =>
  API.post('/api/v1/auth/password-reset-request', { email });

export const confirmPasswordReset = (token: string, new_password: string) =>
  API.post('/api/v1/auth/password-reset-confirm', { token, new_password });

// Users
export const getUsers = () => API.get('/api/v1/users/');
export const getMyProfile = () => API.get('/api/v1/users/me');
export const createUser = (data: Partial<User> & { password?: string }) => API.post('/api/v1/users/', data);
export const updateUser = (userId: number, data: object) => API.put(`/api/v1/users/${userId}`, data);
export const deleteUser = (userId: number) => API.delete(`/api/v1/users/${userId}`);
export const resetUserPassword = (userId: number, password: string) => 
  API.put(`/api/v1/users/${userId}/reset-password?password_in=${password}`);

// Audit
export const getAuditLogs = () => API.get('/api/v1/audit/');

// User Confirmation & Suspension
export const confirmUser = (userId: number) => API.post(`/api/v1/users/${userId}/confirm`);
export const toggleUserActive = (userId: number) => API.post(`/api/v1/users/${userId}/toggle-active`);

// Categories
export const getCategories = () => API.get('/api/v1/inventory/categories');
export const createCategory = (data: { name: string; description?: string }) =>
  API.post('/api/v1/inventory/categories', data);
export const updateCategory = (id: number, data: { name?: string; description?: string }) =>
  API.put(`/api/v1/inventory/categories/${id}`, data);
export const deleteCategory = (id: number) => API.delete(`/api/v1/inventory/categories/${id}`);

// Products
export const getProducts = () => API.get('/api/v1/inventory/products');
export const createProduct = (data: FormData) =>
  API.post('/api/v1/inventory/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateProduct = (id: number, data: FormData) =>
  API.put(`/api/v1/inventory/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteProduct = (id: number) => API.delete(`/api/v1/inventory/products/${id}`);
export const bulkUploadProducts = (file: File) => {
  const data = new FormData();
  data.append('file', file);
  return API.post('/api/v1/inventory/products/bulk', data, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// Orders
export const getOrders = () => API.get('/api/v1/inventory/orders');
export const createOrder = (data: { customer_name: string; items: { product_id: number; quantity: number }[] }) =>
  API.post('/api/v1/inventory/orders', data);
export const updateOrderStatus = (id: number, status: string) =>
  API.put(`/api/v1/inventory/orders/${id}?status=${status}`);

export default API;
