import {useMobileDetection} from "../hooks/useMobileDetection";
import {useAppTheme} from "../hooks/useAppTheme";
import {useProjectManagementFromUserProjects} from "../hooks/useProjectManagementFromUserProjects";
import {useProjectCreation} from "../hooks/useProjectCreation";
import ProjectSelector from "../ProjectSelector";
import {useLocalStorageProject} from "../hooks/useLocalStorageProject";
import {getActiveKey, menuItems} from "../hooks/MenuItems";
import {useNavigationContext} from "../hooks/useNavigationContext";
import {useUserContext} from "../hooks/useUserContext";


export function useMainLayoutActions() {
  // Import contexts from dedicated hooks
  const { navigate, location } = useNavigationContext();
  const { user, loading, auth } = useUserContext();
  
  const isMobile = useMobileDetection();
  const { appTheme, setTheme, defaultAlgorithm, darkAlgorithm } = useAppTheme();
  const { projects, currentProject, selectProject } = useProjectManagementFromUserProjects();
  const {
    createProjectModalVisible,
    createProjectLoading,
    canCreateProject,
    form,
    showCreateProjectModal,
    handleCreateProject,
    handleCancelCreateProject
  } = useProjectCreation();
  
  useLocalStorageProject();

  const handleMenuClick = (key: string) => {
    if (key === "logout") {
      auth.signOut();
    } else if (key === "profile") {
      navigate("/profile");
    } else {
      navigate(key);
    }
  };

  const projectSelector = (
    <ProjectSelector
      projects={projects}
      currentProject={currentProject}
      onSelectProject={selectProject}
      onCreateProject={showCreateProjectModal}
      canCreateProject={canCreateProject}
      handleCancelCreateProject={handleCancelCreateProject}
      form={form}
      createProjectModalVisible={createProjectModalVisible}
      createProjectLoading={createProjectLoading}
      handleCreateProject={handleCreateProject}
    />
  );

  return {
    theme: { defaultAlgorithm, darkAlgorithm },
    appTheme,
    setTheme,
    isMobile,
    menuItems,
    handleMenuClick,
    getActiveKey: () => getActiveKey(location.pathname, location.search),
    projectSelector,
    currentProject,
    projects,
    canCreateProject,
    handleCreateProject: showCreateProjectModal,
    user,
    loading,
  };
}

export default useMainLayoutActions;
