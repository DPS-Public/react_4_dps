import { useMemo } from 'react';
import { Dayjs } from 'dayjs';
import { Notification } from '@/components/Layout/hooks/useNotifications';

interface FilterState {
  selectedProject?: string;
  selectedCreatedBy?: string;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  showOnlyUnread?: boolean;
}

export const useNotificationFilters = (
  notifications: Notification[],
  filters: FilterState
) => {
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const { selectedProject, selectedCreatedBy, dateRange, showOnlyUnread } = filters;

      // Filter by UNREAD
      if (showOnlyUnread && notification.read) {
        return false;
      }

      // Filter by PROJECT
      if (selectedProject && notification.projectId !== selectedProject) {
        return false;
      }

      // Filter by CREATED BY (userId)
      if (selectedCreatedBy && notification.userId !== selectedCreatedBy) {
        return false;
      }

      // Filter by DATE RANGE
      if (dateRange && dateRange[0] && dateRange[1]) {
        try {
          const notificationDate = notification.createdAt?.toDate 
            ? notification.createdAt.toDate() 
            : notification.createdAt?.toMillis 
            ? new Date(notification.createdAt.toMillis()) 
            : new Date(notification.createdAt);
          
          const startDate = dateRange[0].startOf('day').toDate();
          const endDate = dateRange[1].endOf('day').toDate();
          
          if (notificationDate < startDate || notificationDate > endDate) {
            return false;
          }
        } catch (error) {
          console.error('Error filtering by date:', error);
        }
      }

      return true;
    });
  }, [notifications, filters]);

  return filteredNotifications;
};
