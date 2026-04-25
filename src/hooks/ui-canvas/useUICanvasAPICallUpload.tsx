import {collection, doc, getDoc, getDocs} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {useSelector} from "react-redux";
import {RootState} from "@/store";

export default function useUICanvasAPICallUpload() {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const loadAPIList = async () => {
        const projectDoc = doc(db, "projects", currentProject.id);
        const project = await getDoc(projectDoc);
        const apiJsonString = project.get("api_json");
        const apiJson = apiJsonString ? JSON.parse(apiJsonString) : {};
        const apiJsonKeys = Object.keys(apiJson)
        const apiCanvasDoc = await getDocs(collection(db, "api_canvas"));
        const endpointsArray = [];
        if (!apiCanvasDoc.empty) {
            apiCanvasDoc.forEach(item => {
                if (apiJsonKeys.includes(item.id)) {
                    const data = item.data();
                    const newStructure = {
                        ...data,
                        name: data?.name ?? apiJson[item.id],
                    }
                    endpointsArray.push({...data, ...newStructure})
                }
            });
            // setSelectedEndpoint(selectedEndpoint ? endpointsArray.find(item => item.id == selectedEndpoint.id) : endpointsArray[0])
            // setEndpoints(endpointsArray);
            return endpointsArray
        }
    }
    return {loadAPIList}
}
