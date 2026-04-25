import { db } from '@/config/firebase';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  pullRequestId?: string;
  prNumber?: number;
  repoFullName?: string;
  compareRepoFullName?: string;
  projectId?: string | null;
  projectName?: string | null;
  projectLabel?: string | null;
  targetProjectName?: string | null;
  userId: string;
  read: boolean;
  createdAt: any;
  updatedAt: any;
  description?: string;
  body?: string;
  issueId?: string;
  issueKey?: string;
  issueNo?: number;
  actionType?: string;
  actionDetails?: any;
  emailSent?: boolean; 
  notificationNumber?: number;
  _collectionName?: string;
}

export const useNotifications = (userId: string | null, projectId?: string | null) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const userNotificationCollection = `${userId}_notifications`;
    // const projectNotificationCollection = projectId ? `${projectId}_notifications` : null;

    const allNotifications: Notification[] = [];
    const unsubscribes: (() => void)[] = [];
    
    const updateNotifications = () => {
      const seen = new Set<string>();
      const uniqueNotifications: Notification[] = [];
      
      for (const notification of allNotifications) {
        let uniqueKey = '';
        if (notification.type === 'issue' && notification.issueId) {
          const timeKey = notification.createdAt?.toMillis?.() 
            ? Math.floor(notification.createdAt.toMillis() / 1000)
            : notification.createdAt?.getTime?.() 
            ? Math.floor(notification.createdAt.getTime() / 1000)
            : new Date(notification.createdAt || 0).getTime() 
            ? Math.floor(new Date(notification.createdAt).getTime() / 1000)
            : '';
          
          uniqueKey = `${notification.issueId}_${notification.actionType || 'unknown'}_${timeKey}`;
        } else {
          const timeKey = notification.createdAt?.toMillis?.() 
            ? Math.floor(notification.createdAt.toMillis() / 1000)
            : notification.createdAt?.getTime?.() 
            ? Math.floor(notification.createdAt.getTime() / 1000)
            : new Date(notification.createdAt || 0).getTime() 
            ? Math.floor(new Date(notification.createdAt).getTime() / 1000)
            : '';
          uniqueKey = `${notification.id}_${timeKey}`;
        }
        
        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          uniqueNotifications.push(notification);
        } 
      }
      uniqueNotifications.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || new Date(a.createdAt || 0).getTime() || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || new Date(b.createdAt || 0).getTime() || 0;
        return bTime - aTime;
      });

      setNotifications(uniqueNotifications);
      setUnreadCount(uniqueNotifications.filter((n) => !n.read).length);
      setLoading(false);
    };

    const setupUserNotifications = () => {
      let q;
      try {
        q = query(
          collection(db, userNotificationCollection),
          orderBy('createdAt', 'desc')
        );
      } catch (error) {
        q = query(
          collection(db, userNotificationCollection)
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const indicesToRemove: number[] = [];
          allNotifications.forEach((n, index) => {
            if (n._collectionName === userNotificationCollection) {
              indicesToRemove.push(index);
            }
          });
          indicesToRemove.reverse().forEach(index => allNotifications.splice(index, 1));

          snapshot.forEach((doc) => {
            const data = doc.data();
            const notification = {
              id: doc.id,
              ...data,
              _collectionName: userNotificationCollection,
            } as Notification;
            allNotifications.push(notification);
          });

          updateNotifications();
        },
        (error) => {
          console.error('Error listening to user notifications:', error);
          if (error.code === 'failed-precondition') {
            const fallbackQ = query(
              collection(db, userNotificationCollection)
            );
            
            const fallbackUnsubscribe = onSnapshot(
              fallbackQ,
              (snapshot) => {
                const indicesToRemove: number[] = [];
                allNotifications.forEach((n, index) => {
                  if (n._collectionName === userNotificationCollection) {
                    indicesToRemove.push(index);
                  }
                });
                indicesToRemove.reverse().forEach(index => allNotifications.splice(index, 1));
                snapshot.forEach((doc) => {
                  allNotifications.push({
                    id: doc.id,
                    ...doc.data(),
                    _collectionName: userNotificationCollection,
                  } as Notification);
                });

                updateNotifications();
              },
              (fallbackError) => {
                setLoading(false);
              }
            );
            
            unsubscribes.push(fallbackUnsubscribe);
          } else {
            setLoading(false);
          }
        }
      );

      unsubscribes.push(unsubscribe);
    };

    // const setupProjectNotifications = () => {
    //   if (!projectNotificationCollection) return;

    //   let q;
    //   try {
    //     q = query(
    //       collection(db, projectNotificationCollection),
    //       orderBy('createdAt', 'desc')
    //     );
    //   } catch (error) {
    //     q = query(
    //       collection(db, projectNotificationCollection)
    //     );
    //   }

    //   const unsubscribe = onSnapshot(
    //     q,
    //     (snapshot) => {
    //       // Remove old notifications from this collection
    //       const indicesToRemove: number[] = [];
    //       allNotifications.forEach((n, index) => {
    //         if (n._collectionName === projectNotificationCollection) {
    //           indicesToRemove.push(index);
    //         }
    //       });
    //       indicesToRemove.reverse().forEach(index => allNotifications.splice(index, 1));

    //       // Add new notifications
    //       snapshot.forEach((doc) => {
    //         const data = doc.data();
    //         const notification = {
    //           id: doc.id,
    //           ...data,
    //           _collectionName: projectNotificationCollection,
    //         } as Notification;
    //         allNotifications.push(notification);
            
    //       });

    //       updateNotifications();
    //     },
    //     (error) => {
    //       console.error('Error listening to project notifications:', error);
    //       if (error.code === 'failed-precondition') {
    //         const fallbackQ = query(
    //           collection(db, projectNotificationCollection)
    //         );
            
    //         const fallbackUnsubscribe = onSnapshot(
    //           fallbackQ,
    //           (snapshot) => {
    //             const indicesToRemove: number[] = [];
    //             allNotifications.forEach((n, index) => {
    //               if (n._collectionName === projectNotificationCollection) {
    //                 indicesToRemove.push(index);
    //               }
    //             });
    //             indicesToRemove.reverse().forEach(index => allNotifications.splice(index, 1));

    //             snapshot.forEach((doc) => {
    //               allNotifications.push({
    //                 id: doc.id,
    //                 ...doc.data(),
    //                 _collectionName: projectNotificationCollection,
    //               } as Notification);
    //             });

    //             updateNotifications();
    //           },
    //           (fallbackError) => {
    //             console.error('Fallback query for project notifications also failed:', fallbackError);
    //           }
    //         );
            
    //         unsubscribes.push(() => fallbackUnsubscribe());
    //       }
    //     }
    //   );

    //   unsubscribes.push(() => unsubscribe());
    // };

    setupUserNotifications();
    // setupProjectNotifications();

    return () => {
      unsubscribes.forEach((unsub) => {
        try {
          unsub?.();
        } catch (error) {
          console.warn('Failed to unsubscribe notifications listener safely:', error);
        }
      });
    };
  }, [userId, projectId]);

  const markAsRead = async (notificationId: string) => {
    try {
      if (!userId) {
        return;
      }
      
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification) {
        return;
      }

      const collectionName = notification._collectionName || `${userId}_notifications`;
      const notificationRef = doc(db, collectionName, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!userId) {
        return;
      }

      
      const unreadNotifications = notifications.filter((n) => !n.read);
      const updatePromises = unreadNotifications.map((notification) => {
        const collectionName = notification._collectionName || `${userId}_notifications`;
        const notificationRef = doc(db, collectionName, notification.id);
        return updateDoc(notificationRef, {
          read: true,
          updatedAt: new Date(),
        });
      });
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
};

