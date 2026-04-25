import React from 'react';
import { Popover, Avatar, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

interface UserProfileTooltipProps {
  user: any;
  children: React.ReactNode;
  navigateOnClick?: boolean;
}

const UserProfileTooltip: React.FC<UserProfileTooltipProps> = ({ user, children, navigateOnClick = true }) => {
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const content = (
    <div className="w-64">
      <div className="bg-blue-600 p-4 rounded-t-lg flex items-center gap-3">
        <Avatar
          size={48}
          src={user.photoURL}
          style={{ backgroundColor: '#1890ff' }}
        >
          {!user.photoURL && getInitials(user.displayName || user.email || '')}
        </Avatar>
        <div className="text-white">
          <div className="font-semibold truncate">
            {user.displayName || user.email || 'Unknown User'}
            {user.displayName && (
              <span className="text-blue-200 text-xs ml-1">
                ({user.displayName.split(' ')[0]}...)
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 bg-white rounded-b-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <span className="text-gray-400">✉</span>
          <span className="truncate">{user.email || 'No email'}</span>
        </div>
        <Button
          type="default"
          block
          disabled={!user?.uid}
          onClick={() => {
            if (user?.uid) {
              navigate(`/user-profile/${user.uid}`);
            }
          }}
        >
          View profile
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="hover"
      placement="right"
      overlayClassName="user-profile-tooltip"
    >
      <span
        onClick={() => {
          if (navigateOnClick && user?.uid) {
            navigate(`/user-profile/${user.uid}`);
          }
        }}
        style={{ cursor: navigateOnClick ? "pointer" : "default" }}
      >
        {children}
      </span>
    </Popover>
  );
};

export default UserProfileTooltip;

