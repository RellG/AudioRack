import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import type { Equipment } from '../types';

interface EquipmentUpdate {
  operation: 'create' | 'update' | 'delete' | 'restore';
  equipment: Equipment;
  timestamp: string;
}

interface StatsUpdate {
  stats: any;
  timestamp: string;
}

export const useEquipmentSocket = (teamId: string = 'global') => {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<EquipmentUpdate | null>(null);

  useEffect(() => {
    // Create socket connection
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'http://192.168.4.50:1314'
      : 'http://localhost:1314';

    console.log('🔌 Connecting to WebSocket:', `${socketUrl}/equipment`);
    
    const socket = io(`${socketUrl}/equipment`, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Equipment WebSocket connected:', socket.id);
      setIsConnected(true);
      socket.emit('join-team', teamId);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Equipment WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🚫 Equipment WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Equipment update listener
    socket.on('equipment-update', (data: EquipmentUpdate) => {
      console.log('📡 Received equipment update:', data);
      setLastUpdate(data);

      // Invalidate equipment queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      
      // Also invalidate stats as they might be affected
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });

      // Optimistic update for immediate UI response
      queryClient.setQueryData(['equipment'], (oldData: any) => {
        if (!oldData?.data) return oldData;
        
        const equipmentList = oldData.data;
        const updatedEquipment = { ...data.equipment, _id: data.equipment.id };

        switch (data.operation) {
          case 'create':
            // Add new equipment to the beginning of the list
            return {
              ...oldData,
              data: [updatedEquipment, ...equipmentList],
              count: oldData.count + 1
            };

          case 'update':
            // Update existing equipment
            return {
              ...oldData,
              data: equipmentList.map((item: Equipment) => 
                item.id === data.equipment.id ? updatedEquipment : item
              )
            };

          case 'delete':
            // Remove equipment from list
            return {
              ...oldData,
              data: equipmentList.filter((item: Equipment) => item.id !== data.equipment.id),
              count: oldData.count - 1
            };

          case 'restore':
            // Add restored equipment back to list
            return {
              ...oldData,
              data: [updatedEquipment, ...equipmentList],
              count: oldData.count + 1
            };

          default:
            return oldData;
        }
      });
    });

    // Stats update listener
    socket.on('stats-update', (data: StatsUpdate) => {
      console.log('📊 Received stats update:', data);
      queryClient.setQueryData(['equipment-stats'], data.stats);
    });

    // Activity update listener (for future use)
    socket.on('activity-update', (data: any) => {
      console.log('📝 Received activity update:', data);
      // Could be used for activity feed in the future
    });

    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [teamId, queryClient]);

  return {
    isConnected,
    lastUpdate,
    socket: socketRef.current
  };
};