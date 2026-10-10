import apiClient from './client';

export interface AppNotification {
  _id: string;
  user?: string;
  type:
    | 'plagiarism_alert'
    | 'job_update'
    | 'general'
    | 'test_assigned'
    | 'lab_assigned'
    | 'academic_update'
    | 'achievement_unlocked'
    | 'attendance_alert'
    | string;
  message: string;
  metadata?: {
    subjectName?: string;
    studentName?: string;
    attendancePercentage?: number;
    threshold?: number;
    badgeName?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
}

export interface SmartAlert {
  id: string;
  role: string;
  type: string;
  title: string;
  message: string;
  targetUrl?: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

export const notificationApi = {
  // Get all user notifications (last 50)
  getNotifications: async () => {
    const res = await apiClient.get<{
      success: boolean;
      count: number;
      data: AppNotification[];
    }>('/api/notifications');
    return {
      success: res.data.success,
      count: res.data.count || 0,
      data: res.data.data || [],
    };
  },

  // Get dynamic smart alerts
  getSmartAlerts: async () => {
    const res = await apiClient.get<{
      success: boolean;
      count: number;
      data: SmartAlert[];
    }>('/api/notifications/smart-alerts');
    return {
      success: res.data.success,
      count: res.data.count || 0,
      data: res.data.data || [],
    };
  },

  // Mark single notification as read
  markAsRead: async (notificationId: string) => {
    const res = await apiClient.put<{
      success: boolean;
      data: AppNotification;
    }>(`/api/notifications/${notificationId}/read`);
    return res.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const res = await apiClient.put<{
      success: boolean;
      message: string;
    }>('/api/notifications/read-all');
    return res.data;
  },

  // Delete notification
  deleteNotification: async (notificationId: string) => {
    const res = await apiClient.delete<{
      success: boolean;
    }>(`/api/notifications/${notificationId}`);
    return res.data;
  },
};
