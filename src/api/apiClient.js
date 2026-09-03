import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(message, status, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const tokenStorage = {
  getToken: () => localStorage.getItem('access_token'),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  },
  removeToken: () => localStorage.removeItem('access_token'),
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if JWT token is present
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Standardize response error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      const message =
        data?.error?.message || data?.message || error.message || 'An unexpected error occurred';
      const code = data?.error?.code || 'API_ERROR';
      const details = data?.error?.details || null;

      if (status === 401) {
        tokenStorage.removeToken();
        window.dispatchEvent(new CustomEvent('lankaeats:unauthorized'));
      }

      return Promise.reject(new ApiError(message, status, code, details));
    }

    return Promise.reject(
      new ApiError(error.message || 'Network or connection error', 0, 'NETWORK_ERROR')
    );
  }
);
