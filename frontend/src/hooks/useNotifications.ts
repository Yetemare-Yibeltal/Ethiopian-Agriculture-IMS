'use client';

import { useCallback } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/providers/ToastProvider';

// ─── Types ────────────────────────────────────────────────
export interface Notification {
  id: string;
  type:
    | 'FOOD_SECURITY_ALERT'
    | 'DUPLICATE_BLOCKED'
    | 'EXPORT_READY'
    | 'NEW_USER'
    | 'SYSTEM'
    | 'AID_REMINDER';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    pageCount: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
}

// ─── useNotifications ─────────────────────────────────────
export function useNotifications(filters?: {
  isRead?: boolean;
  type?: string;
}) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        perPage: '20',
        ...(filters?.isRead !== undefined && {
          isRead: String(filters.isRead),
        }),
        ...(filters?.type && { type: filters.type }),
      });

      const response = await apiClient.get<NotificationsResponse>(
        `/notifications?${params}`,
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { page, pageCount } = lastPage.pagination;
      return page < pageCount ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000,
  });
}

// ─── useUnreadCount ───────────────────────────────────────
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get<UnreadCountResponse>(
        '/notifications/unread-count',
      );
      return response.data.data.count;
    },
    // Poll every 30 seconds to keep badge current
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
}

// ─── useMarkAsRead ────────────────────────────────────────
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });
}

// ─── useMarkAllAsRead ─────────────────────────────────────
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch('/notifications/read-all');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
      toast.success(
        `${data.data?.count ?? 'All'} notifications marked as read`,
      );
    },
    onError: () => {
      toast.error('Failed to mark all notifications as read');
    },
  });
}

// ─── useDismissNotification ───────────────────────────────
export function useDismissNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/notifications/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    },
  });
}

// ─── useClearAllNotifications ─────────────────────────────
export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/notifications/clear-all');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
      toast.success(`${data.data?.count ?? 'All read'} notifications cleared`);
    },
    onError: () => {
      toast.error('Failed to clear notifications');
    },
  });
}

// ─── useBroadcastNotification ─────────────────────────────
export function useBroadcastNotification() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type:
        | 'FOOD_SECURITY_ALERT'
        | 'DUPLICATE_BLOCKED'
        | 'EXPORT_READY'
        | 'NEW_USER'
        | 'SYSTEM'
        | 'AID_REMINDER';
      roleFilter:
        | 'ALL'
        | 'SUPER_ADMIN'
        | 'ADMIN'
        | 'FIELD_AGENT'
        | 'NGO_PARTNER'
        | 'VIEWER';
    }) => {
      const response = await apiClient.post('/notifications/broadcast', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Broadcast sent to ${data.data?.sent ?? 0} users`);
    },
    onError: () => {
      toast.error('Failed to send broadcast notification');
    },
  });
}

// ─── useNotificationActions ───────────────────────────────
/**
 * Combined hook providing all notification actions.
 * The most convenient hook for the notification dropdown component.
 */
export function useNotificationActions() {
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const dismiss = useDismissNotification();
  const clearAll = useClearAllNotifications();

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsRead.mutate(id);
    },
    [markAsRead],
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead.mutate();
  }, [markAllAsRead]);

  const handleDismiss = useCallback(
    (id: string) => {
      dismiss.mutate(id);
    },
    [dismiss],
  );

  const handleClearAll = useCallback(() => {
    clearAll.mutate();
  }, [clearAll]);

  return {
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    dismiss: handleDismiss,
    clearAll: handleClearAll,
    isLoading:
      markAsRead.isPending ||
      markAllAsRead.isPending ||
      dismiss.isPending ||
      clearAll.isPending,
  };
}

export default useNotifications;
