import { useRef } from "react"
import BacklogTable from "./components/BacklogTable"
import { Toolbox } from "./components/Toolbox"
import { IssueProvider } from "./context/issueContext"

export const Backlog = () => {
    const sectionRef = useRef<HTMLDivElement>(null)

    return (
        <IssueProvider>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="rounded min-h-0 overflow-hidden">
                <Toolbox current={sectionRef} />
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', marginTop: 20 }} ref={sectionRef}>
                    <BacklogTable  />
                </div>
            </div>
        </IssueProvider>
    )
}
