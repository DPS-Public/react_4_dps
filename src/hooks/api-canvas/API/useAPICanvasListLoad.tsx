import {useSelector} from "react-redux";
import {RootState} from "@/store";
import { OperationType } from "@/hooks/api-canvas/types";

export default function useAPICanvasListLoad({
                                                setEndpoints,
                                                setSelectedEndpoint
                                            }) {
    const apiCanvasCatalog = useSelector((state: RootState) => state.projectCanvasCatalog.apiCanvases);

    const buildListEndpoint = (id: string, name: string) => ({
        id,
        name,
        description: "",
        config: {
            method: "POST" as const,
            localUrl: "",
            localHeader: "",
            filePath: "",
        },
        requestBody: "{}",
        responseBody: "{}",
        input: [],
        output: [],
        operation: [] as { type: OperationType; description: string }[],
    });

    const canvasListLoad = async (setLoading: any) => {
        setLoading(true);
        const endpointsArray = apiCanvasCatalog.map(({ id, name }) => buildListEndpoint(id, String(name || "")));

        const storedEndpointId = localStorage.getItem("selectedEndpointId");
        const nextSelectedEndpoint =
            endpointsArray.find((item) => item.id === storedEndpointId) ?? endpointsArray[0] ?? null;

        setSelectedEndpoint(nextSelectedEndpoint);
        if (nextSelectedEndpoint?.id) {
            localStorage.setItem("selectedEndpointId", nextSelectedEndpoint.id);
            localStorage.setItem("selectedEndpoint", JSON.stringify(nextSelectedEndpoint));
        } else {
            localStorage.removeItem("selectedEndpoint");
            localStorage.removeItem("selectedEndpointId");
        }
        setEndpoints(endpointsArray);
        setLoading(false);
    };

    return {
        canvasListLoad,

    }
}
