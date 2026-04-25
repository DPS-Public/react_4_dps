import {RootState} from "@/store";
import {useSelector} from "react-redux";

export default function useEndPointFunctions({
                                                 endpoints,
                                                 selectedEndpoint,
                                                 setSelectedEndpoint,
                                                 setEndpoints,setIsExportCanvasModalVisible
                                             }) {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);

    const handleEndpointChange = (value: string) => {
        const endpoint = endpoints.find((ep) => ep.id === value);
        if (endpoint) {
            setSelectedEndpoint(endpoint);
            localStorage.setItem("selectedEndpointId", endpoint.id);
            localStorage.setItem("selectedEndpoint", JSON.stringify(endpoint));
        } else {
            setSelectedEndpoint(null);
            localStorage.removeItem("selectedEndpointId");
            localStorage.removeItem("selectedEndpoint");
        }
    };

    return {
        handleEndpointChange
    }
}
