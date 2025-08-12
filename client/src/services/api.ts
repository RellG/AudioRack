import axios, { type AxiosInstance } from 'axios';
import type { 
  Equipment, 
  DeletedEquipment,
  CreateEquipmentDto, 
  UpdateEquipmentDto,
  LoginDto,
  RegisterDto,
  AuthResponse,
  ApiResponse,
  EquipmentStats,
  EquipmentFilters 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1314/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.status, error.response?.data, error.message);
        if (error.response?.status === 401) {
          // Token expired or invalid, clear storage and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterDto): Promise<AuthResponse> {
    const response = await this.client.post('/auth/register', userData);
    return response.data;
  }

  // Equipment endpoints
  async getEquipment(filters?: EquipmentFilters): Promise<ApiResponse<Equipment[]>> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.condition && filters.condition !== 'all') params.append('condition', filters.condition);

    const response = await this.client.get(`/equipment?${params.toString()}`);
    return response.data;
  }

  async createEquipment(equipment: CreateEquipmentDto): Promise<ApiResponse<Equipment>> {
    const response = await this.client.post('/equipment', equipment);
    return response.data;
  }

  async updateEquipment(id: string, updates: UpdateEquipmentDto): Promise<ApiResponse<Equipment>> {
    const response = await this.client.put(`/equipment/${id}`, updates);
    return response.data;
  }

  async deleteEquipment(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/equipment/${id}`);
    return response.data;
  }

  async getEquipmentStats(): Promise<ApiResponse<EquipmentStats>> {
    const response = await this.client.get('/equipment/stats');
    return response.data;
  }

  // Deleted Equipment
  async getDeletedEquipment(): Promise<ApiResponse<DeletedEquipment[]>> {
    const response = await this.client.get('/equipment/deleted');
    return response.data;
  }

  async restoreEquipment(id: string): Promise<ApiResponse<Equipment>> {
    const response = await this.client.post(`/equipment/deleted/${id}/restore`);
    return response.data;
  }

  async permanentlyDeleteEquipment(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/equipment/deleted/${id}/permanent`);
    return response.data;
  }

  // Reports
  async getInventoryReport(format: 'json' | 'csv' = 'json'): Promise<any> {
    const response = await this.client.get(`/equipment/report?format=${format}`, {
      responseType: format === 'csv' ? 'blob' : 'json'
    });
    return format === 'csv' ? response : response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();