import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Plus, Search, RefreshCw, AlertTriangle, MoreVertical, Clock, MapPin, User, Edit, Trash2, Wifi, WifiOff } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEquipmentSocket } from '../hooks/useEquipmentSocket';
import type { Equipment, DeletedEquipment, CreateEquipmentDto, UpdateEquipmentDto, EquipmentFilters } from '../types';

const categories = ['Camera', 'Audio', 'Lighting', 'Switching', 'Storage', 'Cables', 'Accessories'] as const;

const EquipmentApp: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  
  // WebSocket connection for real-time updates
  const { isConnected: socketConnected, lastUpdate } = useEquipmentSocket('global');
  
  const [filters, setFilters] = useState<EquipmentFilters>({
    search: '',
    category: 'all',
    status: 'all'
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [newItem, setNewItem] = useState<CreateEquipmentDto>({
    name: '',
    category: 'Camera',
    location: '',
    notes: ''
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showDeletedItems, setShowDeletedItems] = useState(false);

  // Fetch equipment with reduced polling when WebSocket is connected
  const { data: equipmentData, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment', filters],
    queryFn: () => apiService.getEquipment(filters),
    refetchInterval: socketConnected ? 15000 : 5000, // 15s with WebSocket, 5s without
    staleTime: socketConnected ? 10000 : 3000, // More aggressive caching with WebSocket
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['equipment-stats'],
    queryFn: () => apiService.getEquipmentStats(),
    refetchInterval: socketConnected ? 20000 : 10000,
  });

  // Fetch deleted equipment
  const { data: deletedEquipmentData } = useQuery({
    queryKey: ['deleted-equipment'],
    queryFn: () => apiService.getDeletedEquipment(),
    refetchInterval: socketConnected ? 30000 : 15000,
  });

  // Create equipment mutation
  const createMutation = useMutation({
    mutationFn: (equipment: CreateEquipmentDto) => apiService.createEquipment(equipment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      handleCancelEdit();
    },
  });

  // Update equipment mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateEquipmentDto }) => 
      apiService.updateEquipment(id, updates),
    
    // Optimistic update for immediate UI response
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['equipment'] });
      
      // Snapshot the previous value
      const previousEquipment = queryClient.getQueryData(['equipment']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['equipment'], (old: any) => {
        if (!old?.data) return old;
        
        return {
          ...old,
          data: old.data.map((item: Equipment) =>
            item.id === id ? { ...item, ...updates } : item
          )
        };
      });

      return { previousEquipment };
    },
    
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousEquipment) {
        queryClient.setQueryData(['equipment'], context.previousEquipment);
      }
    },
    
    onSuccess: () => {
      // Don't invalidate immediately - let WebSocket handle the real update
      // Only invalidate stats as they might need server calculation
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      handleCancelEdit();
    },
    
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    }
  });

  // Delete equipment mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-equipment'] });
      setOpenDropdown(null);
    },
  });

  // Restore equipment mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiService.restoreEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-equipment'] });
    },
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => apiService.permanentlyDeleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-equipment'] });
    },
  });

  const equipment = equipmentData?.data || [];
  const stats = statsData?.data?.overview || { total: 0, checked: 0, pending: 0, issues: 0 };
  const deletedItems: DeletedEquipment[] = deletedEquipmentData?.data || [];

  const updateItemStatus = (id: string, newStatus: Equipment['status']) => {
    updateMutation.mutate({ id, updates: { status: newStatus } });
  };

  const addNewItem = () => {
    if (!newItem.name.trim()) return;
    
    if (editingItem) {
      // Update existing item
      updateMutation.mutate({ 
        id: editingItem._id, 
        updates: {
          name: newItem.name,
          category: newItem.category,
          location: newItem.location,
          notes: newItem.notes,
          condition: newItem.condition,
          priority: newItem.priority
        }
      });
    } else {
      // Create new item
      createMutation.mutate(newItem);
    }
  };

  const handleEditItem = (item: Equipment) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      location: item.location,
      notes: item.notes || '',
      condition: item.condition,
      priority: item.priority
    });
    setShowAddForm(true);
    setOpenDropdown(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setNewItem({ name: '', category: 'Camera', location: '', notes: '' });
    setShowAddForm(false);
  };

  const handleRestoreItem = (id: string) => {
    restoreMutation.mutate(id);
  };

  const handlePermanentDelete = (id: string, itemName: string) => {
    if (window.confirm(`Permanently delete "${itemName}"? This cannot be undone!`)) {
      permanentDeleteMutation.mutate(id);
    }
  };

  const handleDownloadReport = async (format: 'json' | 'csv' = 'csv') => {
    try {
      if (format === 'csv') {
        const response = await apiService.getInventoryReport('csv');
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `equipment-inventory-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const response = await apiService.getInventoryReport('json');
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `equipment-inventory-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(itemId);
    } else {
      setOpenDropdown(null);
    }
  };

  const toggleDropdown = (itemId: string) => {
    setOpenDropdown(openDropdown === itemId ? null : itemId);
  };

  const getStatusColor = (status: Equipment['status']) => {
    switch (status) {
      case 'checked': return 'status-checked';
      case 'pending': return 'status-pending';
      case 'issue': return 'status-issue';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getConditionColor = (condition: Equipment['condition']) => {
    switch (condition) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'needs_repair': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: Equipment['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500';
    }
  };

  const getPriorityIcon = (priority: Equipment['priority']) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (equipmentLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {/* Modern Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl shadow-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Equipment Manager</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Professional equipment tracking system</p>
              </div>
            </div>

            <div className="flex items-center justify-between lg:space-x-4">
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">Welcome, {user?.name}</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Equipment</span>
                  <span className="sm:hidden">Add</span>
                </button>
                {deletedItems.length > 0 && (
                  <button
                    onClick={() => setShowDeletedItems(!showDeletedItems)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Recently Deleted ({deletedItems.length})</span>
                    <span className="sm:hidden">Deleted ({deletedItems.length})</span>
                  </button>
                )}
                <button
                  onClick={() => handleDownloadReport('csv')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Download Report</span>
                  <span className="sm:hidden">Report</span>
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Stats Dashboard */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 group hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <RefreshCw className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 group hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Checked</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.checked}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Check className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 group hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 group hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Issues</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.issues}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Filters */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment or location..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200"
              />
            </div>
            
            <div className="flex space-x-4">
              <select
                value={filters.category || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
                className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200 min-w-[120px]"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select
                value={filters.status || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200 min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="checked">✅ Checked</option>
                <option value="pending">⏳ Pending</option>
                <option value="issue">⚠️ Issues</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment List - Mobile Optimized */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {equipment.map(item => (
            <div key={item._id} className={`
              group relative bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-sm hover:shadow-xl 
              transition-all duration-300 border border-gray-200 dark:border-gray-700
              ${item.priority === 'critical' ? 'ring-2 ring-red-500/20 border-red-500/50' : 
                item.priority === 'high' ? 'ring-2 ring-orange-500/20 border-orange-500/50' : ''}
              hover:scale-[1.01] md:hover:scale-[1.02] hover:border-blue-500/50
            `}>
              
              {/* Header with Status - Mobile Optimized */}
              <div className="flex items-start justify-between p-3 md:p-4 pb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {item.category}
                    </span>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      <span className="mr-1">{getPriorityIcon(item.priority)}</span>
                      {item.priority}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(item.status)} shadow-sm`}>
                  {item.status === 'checked' && <Check className="w-3 h-3 mr-1" />}
                  {item.status === 'issue' && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {item.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </div>
              </div>

              {/* Content */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{item.location}</span>
                  </div>
                  <div className={`text-xs font-medium ${getConditionColor(item.condition)}`}>
                    {item.condition.replace('_', ' ').charAt(0).toUpperCase() + item.condition.replace('_', ' ').slice(1)}
                  </div>
                </div>

                {item.notes && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3 border-l-2 border-blue-500">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{item.notes}</p>
                  </div>
                )}

                {/* Last Updated Info */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(item.lastChecked)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{item.checkedByName}</span>
                  </div>
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="flex gap-1 md:gap-2">
                  <button
                    onClick={() => updateItemStatus(item._id, 'pending')}
                    disabled={updateMutation.isPending}
                    className={`flex-1 inline-flex items-center justify-center gap-1 md:gap-2 px-2 py-2 md:px-3 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                      item.status === 'pending' 
                        ? 'bg-yellow-500 text-white shadow-lg ring-2 ring-yellow-500/30' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-500 hover:text-white hover:shadow-lg hover:scale-105'
                    } ${updateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Clock className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Pending</span>
                  </button>
                  
                  <button
                    onClick={() => updateItemStatus(item._id, 'checked')}
                    disabled={updateMutation.isPending}
                    className={`flex-1 inline-flex items-center justify-center gap-1 md:gap-2 px-2 py-2 md:px-3 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                      item.status === 'checked' 
                        ? 'bg-green-500 text-white shadow-lg ring-2 ring-green-500/30' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-500 hover:text-white hover:shadow-lg hover:scale-105'
                    } ${updateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Check className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Checked</span>
                  </button>
                  
                  <button
                    onClick={() => updateItemStatus(item._id, 'issue')}
                    disabled={updateMutation.isPending}
                    className={`flex-1 inline-flex items-center justify-center gap-1 md:gap-2 px-2 py-2 md:px-3 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                      item.status === 'issue'
                        ? 'bg-red-500 text-white shadow-lg ring-2 ring-red-500/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-500 hover:text-white hover:shadow-lg hover:scale-105'
                    } ${updateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Issue</span>
                  </button>

                  {/* More Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown(item._id)}
                      className="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                      title="More actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdown === item._id && (
                      <>
                        {/* Backdrop to close dropdown when clicking outside */}
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setOpenDropdown(null)}
                        />
                        
                        <div className="absolute right-0 top-12 z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[160px] overflow-hidden backdrop-blur-sm">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Equipment
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item._id, item.name)}
                            disabled={deleteMutation.isPending}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Equipment'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Real-time Update Indicator */}
                {updateMutation.isPending && (
                  <div className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Updating status...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {equipment.length === 0 && !equipmentLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No equipment found</h3>
            <p className="text-gray-400 mb-4">
              {filters.search || filters.category !== 'all' || filters.status !== 'all' 
                ? 'Try adjusting your search or filters to see more equipment.'
                : 'Get started by adding your first piece of equipment to track.'
              }
            </p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Equipment</span>
            </button>
          </div>
        )}

        {/* Recently Deleted Items Section */}
        {deletedItems.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Deleted Items</h2>
              <button
                onClick={() => setShowDeletedItems(!showDeletedItems)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {showDeletedItems ? 'Hide' : 'Show'} ({deletedItems.length})
              </button>
            </div>
            
            {showDeletedItems && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {deletedItems.map(item => (
                  <div key={`deleted-${item.id}`} className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-300 dark:border-gray-600 opacity-75">
                    {/* Deleted Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        Deleted
                      </span>
                    </div>
                    
                    {/* Header */}
                    <div className="flex items-start justify-between p-4 pb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 truncate line-through">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{item.location}</span>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 mb-3 border-l-2 border-gray-400">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.notes}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleRestoreItem(item.id)}
                          disabled={restoreMutation.isPending}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className="w-4 h-4" />
                          {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.id, item.name)}
                          disabled={permanentDeleteMutation.isPending}
                          className="inline-flex items-center gap-2 px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                          {permanentDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modern Live Updates Indicator with WebSocket Status - Mobile Optimized */}
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
          <div className="flex items-center space-x-2 md:space-x-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl md:rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-1 md:space-x-2">
              {socketConnected ? (
                <>
                  <Wifi className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">Real-time</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-orange-400 rounded-full animate-pulse shadow-lg"></div>
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">Polling</span>
                </>
              )}
            </div>
            <div className="w-px h-3 md:h-4 bg-gray-300 dark:bg-gray-600"></div>
            <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">{equipment.length}</span>
            {lastUpdate && (
              <>
                <div className="w-px h-3 md:h-4 bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize hidden sm:inline">
                  {lastUpdate.operation}d
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Modal - Mobile Optimized */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-t-xl lg:rounded-xl p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {editingItem ? 'Edit Equipment' : 'Add New Equipment'}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Equipment Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Main Camera, Wireless Mic A"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="input-primary"
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value as any }))}
                    className="input-primary"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={newItem.priority || 'medium'}
                    onChange={(e) => setNewItem(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="input-primary"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Location *</label>
                <input
                  type="text"
                  placeholder="e.g., Stage Left, Control Booth"
                  value={newItem.location}
                  onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
                <select
                  value={newItem.condition || 'good'}
                  onChange={(e) => setNewItem(prev => ({ ...prev, condition: e.target.value as any }))}
                  className="input-primary"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="needs_repair">Needs Repair</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
                <textarea
                  placeholder="Add any maintenance notes, issues, or special instructions..."
                  value={newItem.notes || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-primary resize-none"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center lg:justify-end space-y-3 lg:space-y-0 lg:space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-3 lg:py-2 text-gray-400 hover:text-white transition-colors bg-gray-700 lg:bg-transparent rounded-lg lg:rounded-none"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={addNewItem}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingItem 
                  ? (updateMutation.isPending ? 'Updating...' : 'Update Equipment')
                  : (createMutation.isPending ? 'Adding...' : 'Add Equipment')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentApp;