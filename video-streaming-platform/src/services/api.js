const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token
const getToken = () => {
    return localStorage.getItem('token');
};

// Helper function to create headers
const getHeaders = (includeAuth = true) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (includeAuth) {
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};

// Authentication API
export const authAPI = {
    register: async (name, email, password, role = 'viewer') => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ name, email, password, role }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        return data;
    },

    login: async (email, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        return data;
    },

    getMe: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        return await response.json();
    },

    logout: () => {
        localStorage.removeItem('token');
    },
};

// Videos API
export const videosAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);

        const response = await fetch(`${API_BASE_URL}/videos?${params}`, {
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch videos');
        }

        return await response.json();
    },

    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch video');
        }

        return await response.json();
    },

    upload: async (file, title, description, onProgress) => {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('description', description || '');

        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/videos/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        return await response.json();
    },

    getStreamUrl: (id) => {
        const token = getToken();
        return `${API_BASE_URL}/videos/${id}/stream?token=${token}`;
    },

    incrementViews: async (id) => {
        const response = await fetch(`${API_BASE_URL}/videos/${id}/view`, {
            method: 'PATCH',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to increment views');
        }

        return await response.json();
    },

    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to delete video');
        }

        return await response.json();
    },
};

// Users API
export const usersAPI = {
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        return await response.json();
    },

    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user');
        }

        return await response.json();
    },

    update: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to update user');
        }

        return await response.json();
    },

    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to delete user');
        }

        return await response.json();
    },
};
