import axios from 'axios';

// Create custom axios instance
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login/register
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ========================
// Auth Service
// ========================
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (userData: any) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },
};

// ========================
// Cities Service
// ========================
export const citiesService = {
  getCities: async () => {
    const response = await apiClient.get('/cities');
    return response.data;
  },
};

// ========================
// NGO Service
// ========================
export const ngoService = {
  getNgos: async (params?: {
    service?: string;
    city_id?: number;
    search?: string;
    verified?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/ngos', { params });
    return response.data;
  },

  getNgoById: async (id: number) => {
    const response = await apiClient.get(`/ngos/${id}`);
    return response.data;
  },

  updateMyProfile: async (data: any) => {
    const response = await apiClient.put('/ngos/my/profile', data);
    return response.data;
  },

  reportNgo: async (id: number, reason: string) => {
    const response = await apiClient.post(`/ngos/${id}/report`, { reason });
    return response.data;
  },
};

// ========================
// Request Service
// ========================
export const requestService = {
  createRequest: async (data: {
    request_type: string;
    title: string;
    description: string;
    city_id: number;
    latitude?: number;
    longitude?: number;
  }) => {
    const response = await apiClient.post('/requests', data);
    return response.data;
  },

  getUserRequests: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/requests', {
      params: { my: 'true', ...params },
    });
    return response.data;
  },

  getNgoFeedRequests: async (params?: {
    status?: string;
    type?: string;
    city_id?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/requests', { params });
    return response.data;
  },

  getRequestById: async (id: number) => {
    const response = await apiClient.get(`/requests/${id}`);
    return response.data;
  },

  respondToRequest: async (id: number, response_message: string) => {
    const response = await apiClient.post(`/requests/${id}/respond`, {
      response_message,
    });
    return response.data;
  },

  updateRequestStatus: async (id: number, status: string) => {
    const response = await apiClient.patch(`/requests/${id}/status`, { status });
    return response.data;
  },
};

// ========================
// Chat Service
// ========================
export const chatService = {
  getChats: async () => {
    const response = await apiClient.get('/chats');
    return response.data;
  },

  getMessages: async (chatId: number) => {
    const response = await apiClient.get(`/chats/${chatId}/messages`);
    return response.data;
  },

  sendMessage: async (chatId: number, message: string) => {
    const response = await apiClient.post(`/chats/${chatId}/messages`, {
      message,
    });
    return response.data;
  },
};

// ========================
// Admin Service
// ========================
export const adminService = {
  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  getNgos: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/admin/ngos', { params });
    return response.data;
  },

  verifyNgo: async (id: number, verification_status: string, remarks?: string) => {
    const response = await apiClient.patch(`/admin/ngos/${id}/verify`, {
      verification_status,
      remarks,
    });
    return response.data;
  },

  rejectNgo: async (id: number, remarks?: string) => {
    const response = await apiClient.patch(`/admin/ngos/${id}/reject`, {
      remarks,
    });
    return response.data;
  },

  getUsers: async (params?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  toggleUserStatus: async (id: number) => {
    const response = await apiClient.patch(`/admin/users/${id}/status`);
    return response.data;
  },

  getRequests: async (params?: {
    status?: string;
    type?: string;
    city_id?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/admin/requests', { params });
    return response.data;
  },

  getReports: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/admin/reports', { params });
    return response.data;
  },

  resolveReport: async (id: number, status: string) => {
    const response = await apiClient.patch(`/admin/reports/${id}`, { status });
    return response.data;
  },

  // Document Verification Queue & Actions
  getVerifications: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/admin/verifications', { params });
    return response.data;
  },

  getVerificationById: async (id: number) => {
    const response = await apiClient.get(`/admin/verifications/${id}`);
    return response.data;
  },

  getDocumentSignedUrl: async (verifId: number, docId: number) => {
    const response = await apiClient.get(`/admin/verifications/${verifId}/document/${docId}/view`);
    return response.data;
  },

  approveVerification: async (id: number, remarks?: string) => {
    const response = await apiClient.post(`/admin/verifications/${id}/approve`, { remarks });
    return response.data;
  },

  rejectVerification: async (id: number, reason: string) => {
    const response = await apiClient.post(`/admin/verifications/${id}/reject`, { reason });
    return response.data;
  },

  requestCorrection: async (id: number, reason: string) => {
    const response = await apiClient.post(`/admin/verifications/${id}/request-correction`, { reason });
    return response.data;
  },

  reprocessVerification: async (id: number) => {
    const response = await apiClient.post(`/admin/verifications/${id}/reprocess`);
    return response.data;
  },
};

// ========================
// NGO Verification Service
// ========================
export const verificationService = {
  getMyVerification: async () => {
    const response = await apiClient.get('/ngos/verification');
    return response.data;
  },

  uploadDocument: async (formData: FormData) => {
    const response = await apiClient.post('/ngos/verification/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getMyDocuments: async () => {
    const response = await apiClient.get('/ngos/verification/documents');
    return response.data;
  },

  deleteDocument: async (id: number) => {
    const response = await apiClient.delete(`/ngos/verification/documents/${id}`);
    return response.data;
  },

  processVerification: async () => {
    const response = await apiClient.post('/ngos/verification/process');
    return response.data;
  },

  getMyReport: async () => {
    const response = await apiClient.get('/ngos/verification/report');
    return response.data;
  },
};

export default apiClient;

