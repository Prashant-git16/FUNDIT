/**
 * api.js — Centralised API client
 *
 * All backend requests flow through this module.
 * - Sets credentials: 'include' so the HTTP-only auth cookie is always sent.
 * - Parses JSON responses uniformly.
 * - Throws descriptive errors that components can display.
 *
 * Usage:
 *   import api from '../api';
 *   const { campaigns } = await api.get('/api/campaigns');
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(method, path, body, isFormData = false) {
  const options = {
    method,
    credentials: 'include', // Send HTTP-only cookie on every request
    headers: {},
  };

  if (body && !isFormData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  } else if (isFormData) {
    // Let the browser set the correct multipart/form-data boundary
    options.body = body;
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  // Parse response as JSON regardless of status code
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    // Throw an error with the server's message so components can display it
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

const api = {
  get:    (path)               => request('GET',    path),
  post:   (path, body)         => request('POST',   path, body),
  patch:  (path, body)         => request('PATCH',  path, body),
  delete: (path)               => request('DELETE', path),
  postForm: (path, formData)   => request('POST',   path, formData, true),
  patchForm: (path, formData)  => request('PATCH',  path, formData, true),
};

export default api;
