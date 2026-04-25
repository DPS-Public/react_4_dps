import { useAppSelector } from "@/store";
import SettingsGitHubProjectManagement from "./SettingsGitHubProjectManagement";

const GithubSettingsManagment=()=>{
     const currentProject = useAppSelector((state) => state.project.currentProject);
 return (
      <SettingsGitHubProjectManagement projectId={currentProject?.id}/>
 )
}

export default GithubSettingsManagment
