import { Notification } from '@/components/Layout/hooks/useNotifications';
import { useProjectManagement } from '@/components/Layout/hooks/useProjectManagement';

export const useIssueActions = () => {
  const { currentProject, selectProject, projects } = useProjectManagement();

  const handleIssueClick = async (notification: Notification) => {
    if (notification.type === 'issue' && (notification.issueId || notification.issueKey)) {
      const issueId = notification.issueId || notification.issueKey;
      const notificationProjectId = notification.projectId;
      const needsProjectSwitch = notificationProjectId && 
                                  currentProject?.id && 
                                  notificationProjectId !== currentProject.id;

      const isCommentAction = notification.actionType === 'comment_add' || notification.actionType === 'comment_update';

      const openIssueDrawer = () => {
        window.dispatchEvent(
          new CustomEvent('openGlobalIssueDrawer', {
            detail: {
              id: issueId,
              issueKey: notification.issueKey || issueId,
              issueId,
              no: notification.issueNo,
              title: notification.title,
              description: notification.description || notification.body,
              projectId: notification.projectId,
              openTab: isCommentAction ? 'comment' : 'details',
            },
          })
        );
      };

      if (needsProjectSwitch) {
        const targetProject = projects.find(p => p.id === notificationProjectId);
        
        if (targetProject) {          
          selectProject(notificationProjectId);
          
          setTimeout(() => {
            openIssueDrawer();
          }, 300);
        } else {
          openIssueDrawer();
        }
      } else {
        openIssueDrawer();
      }
    }
  };

  return {
    handleIssueClick,
  };
};

