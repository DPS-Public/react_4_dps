import React from 'react';
import { Badge, Button, Tooltip } from 'antd';
import { BellOutlined } from '@ant-design/icons';

interface NotificationIconProps {
  unreadCount: number;
  onClick: () => void;
  appTheme?: 'light' | 'dark';
}

const NotificationIcon: React.FC<NotificationIconProps> = ({
  unreadCount,
  onClick,
  appTheme = 'light',
}) => {
  return (
    <Tooltip title="Notifications">
      <Badge count={unreadCount} size="small" offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined />}
          onClick={onClick}
          style={{
            color: appTheme === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 8px',
          }}
        />
      </Badge>
    </Tooltip>
  );
};

export default NotificationIcon;

