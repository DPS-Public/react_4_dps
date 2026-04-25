import React, { useEffect, useRef } from 'react';
import { Drawer } from 'antd';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCurrentProject } from '@/store/slices/project';
import SettingsUserManagment from '../canvas_settings/SettingsUserManagment';

type ProjectRecord = {
  id: string;
  name: string;
  userId?: string;
  createdAt?: unknown;
};

interface ManageUsersDrawerProps {
  visible: boolean;
  onClose: () => void;
  selectedProject: ProjectRecord | null;
}

function DrawerProjectSync({
  active,
  selectedProject,
}: {
  active: boolean;
  selectedProject: ProjectRecord | null;
}) {
  const dispatch = useAppDispatch();
  const currentProject = useAppSelector((state) => state.project.currentProject);
  const previousProjectRef = useRef(currentProject);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!active || !selectedProject?.id) {
      hasSyncedRef.current = false;
      return;
    }

    if (!hasSyncedRef.current) {
      previousProjectRef.current = currentProject;
      hasSyncedRef.current = true;
    }

    dispatch(setCurrentProject(selectedProject as any));

    return () => {
      hasSyncedRef.current = false;
      dispatch(setCurrentProject((previousProjectRef.current as any) || null));
    };
  }, [active, dispatch, selectedProject]);

  return null;
}

const ManageUsersDrawer: React.FC<ManageUsersDrawerProps> = ({
  visible,
  onClose,
  selectedProject,
}) => {
  return (
    <>
      <DrawerProjectSync active={visible} selectedProject={selectedProject} />
      <Drawer
        title={selectedProject ? `User Management - ${selectedProject.name}` : 'User Management'}
        width="90vw"
        onClose={onClose}
        open={visible}
        destroyOnClose
        styles={{
          body: {
            padding: '24px',
            background: '#fafafa',
          },
        }}
      >
        {visible && selectedProject ? <SettingsUserManagment /> : null}
      </Drawer>
    </>
  );
};

export default ManageUsersDrawer;
