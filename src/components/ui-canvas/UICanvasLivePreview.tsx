import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import UIPrototype from "@/hooks/ui-canvas/ui-prototype/UIPrototype.tsx";
import {doc, getDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";

export default function UICanvasLivePreview() {
    const {canvasId} = useParams();
    const [inputs, setInputs] = useState({});

    useEffect(() => {
        const uiCanvasDocRef = doc(db, "ui_canvas", canvasId);
        const snapshot = getDoc(uiCanvasDocRef).then(res => {
            const input = res.data()?.input[canvasId];
            setInputs(input);
        });
    }, []);

    return (
        <div
            style={{
                height: "100vh",
                overflowY: "auto",
                overflowX: "hidden",
                background: "#ffffff",
                padding: "24px 16px 40px",
                boxSizing: "border-box",
            }}
        >
            <div className="mx-auto flex w-full max-w-full justify-center">
                <UIPrototype
                    componentsJson={inputs ?? {}}
                    selectedUICanvasId={canvasId}
                    preview={true}
                    isShowUIViewCSSColumn={false}
                />
            </div>
        </div>
    )
}
