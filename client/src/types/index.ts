export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
  teamId: string;
  lastLogin?: Date;
}

export interface Equipment {
  _id: string;
  id: string;
  name: string;
  category: 'Camera' | 'Audio' | 'Lighting' | 'Switching' | 'Storage' | 'Cables' | 'Accessories';
  status: 'pending' | 'checked' | 'issue';
  condition: 'excellent' | 'good' | 'fair' | 'needs_repair';
  location: string;
  notes?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  purchasePrice?: number;
  vendor?: string;
  model?: string;
  barcode?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  maintenanceDate?: Date;
  isReserved: boolean;
  reservedBy?: string;
  reservedUntil?: Date;
  lastChecked: Date;
  checkedBy: string | User;
  checkedByName: string;
  teamId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeletedEquipment {
  id: string;
  originalEquipmentId: string;
  name: string;
  category: Equipment['category'];
  status: Equipment['status'];
  condition: Equipment['condition'];
  location: string;
  notes?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  purchasePrice?: number;
  vendor?: string;
  model?: string;
  barcode?: string;
  priority: Equipment['priority'];
  maintenanceDate?: Date;
  isReserved: boolean;
  reservedBy?: string;
  reservedUntil?: Date;
  lastChecked: Date;
  checkedBy: string;
  checkedByName: string;
  teamId: string;
  deletedAt: Date;
  deletedBy: string;
  deletedByName: string;
  deletionReason?: string;
  originalCreatedAt: Date;
  originalUpdatedAt: Date;
}

export interface CreateEquipmentDto {
  name: string;
  category: Equipment['category'];
  location: string;
  notes?: string;
  serialNumber?: string;
  condition?: Equipment['condition'];
  purchasePrice?: number;
  vendor?: string;
  model?: string;
  barcode?: string;
  priority?: Equipment['priority'];
  purchaseDate?: string;
  warrantyExpiry?: string;
}

export interface UpdateEquipmentDto {
  name?: string;
  category?: Equipment['category'];
  location?: string;
  notes?: string;
  status?: Equipment['status'];
  condition?: Equipment['condition'];
  serialNumber?: string;
  priority?: Equipment['priority'];
}

export interface LoginDto {
  phone: string;
}

export interface RegisterDto {
  name: string;
  phone: string;
  teamId?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

export interface EquipmentStats {
  overview: {
    total: number;
    checked: number;
    pending: number;
    issues: number;
    reserved: number;
    critical: number;
    warrantyExpiring: number;
  };
  categories: Array<{ category: string; count: number }>;
  conditions: Array<{ condition: string; count: number }>;
  recentActivity: number;
  lastUpdated: Date;
}

export interface EquipmentFilters {
  search?: string;
  category?: Equipment['category'] | 'all';
  status?: Equipment['status'] | 'all';
  condition?: Equipment['condition'] | 'all';
  priority?: Equipment['priority'] | 'all';
  reserved?: boolean;
}

export interface EquipmentHistory {
  id: string;
  equipmentId: string;
  actionType: 'created' | 'updated' | 'status_changed' | 'deleted' | 'restored';
  oldValues?: any;
  newValues?: any;
  userId: string;
  userName: string;
  teamId: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}