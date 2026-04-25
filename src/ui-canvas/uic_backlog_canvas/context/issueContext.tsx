import { RootState } from "@/store";
import { createContext, useState } from "react";
import { useSelector } from "react-redux";
import { DEFAULT_BACKLOG_COLUMN_KEYS } from "../configs/columns/configBacklogColumns";

export const IssueContext = createContext<any>({})

export const IssueProvider = ({ children }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [edit, setEdit] = useState<boolean>(false)
    const [currentUser, setCurrentUser] = useState<any>(null);
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const [countFilter, setCountFilter] = useState<number>(0)
    const [tasks, setTasks] = useState<any[]>([]);
    const [type, setType] = useState<boolean>(false)
    const [disabled, setDisabled] = useState<any>(true)
    const [toggle, setToggle] = useState<boolean>(false)
    const [status, setStatus] = useState<boolean>(false)
    const [filter, setFilter] = useState<boolean>(false)
    const [users, setUsers] = useState<any[]>([]);
    const [canvases, setCanvases] = useState<any[]>([]);
    const [forward, setForward] = useState<boolean>(false)
    const [csflag, setCsflag] = useState<boolean>(false)
    const [api, setApi] = useState<boolean>(false)
    const [apiFlag, setApiFlag] = useState<boolean>(false)
    const [sprint, setSprint] = useState<boolean>(false)
    const [parentNo, setParentNo] = useState<any>({})
    const [parentNoFlag, setParentNoFlag] = useState<boolean>(false)
    const [commentVisible, setCommentVisible] = useState<boolean>(false);
    const [uiFlag, setUiFlag] = useState<boolean>(false);
    const [activeCanvas, setActiveCanvas] = useState<any>("")
    const [filterValues, setFilterValues] = useState<any>({})
    const [relatedUICanvas, setRelatedUICanvas] = useState<boolean>(false)
    const [addCrdComponentDrawer, setAddCrdComponentDrawer] = useState<boolean>(false)
    const [calculateCodeLine, setCalculateCodeLine] = useState<boolean>(false)
    const [calculateCodeLineEnabled, setCalculateCodeLineEnabled] = useState<boolean>(false)
    const [getCommitsFromGithub, setGetCommitsFromGithub] = useState<boolean>(false)
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
    const [userId, setUserId] = useState<any>('')
    const [currentTaskId,setCurrentTaskId] = useState<string>("")
    const [currentTaskIds,setCurrentTaskIds] = useState<string[]>([])
    const [backlogVisibleColumnKeys, setBacklogVisibleColumnKeys] = useState<string[]>(DEFAULT_BACKLOG_COLUMN_KEYS)
    const [backlogColumnResetVersion, setBacklogColumnResetVersion] = useState<number>(0)
    const close = () => {
        setOpen(false)
        setEdit(false)
    }
    const props = {
        filterValues, setFilterValues,
        toggle, setToggle,
        open, setOpen,
        edit, setEdit,
        currentUser, setCurrentUser,
        apiFlag, setApiFlag,
        currentProject,
        activeCanvas, setActiveCanvas,
        uiFlag, setUiFlag,
        commentVisible, setCommentVisible,
        parentNoFlag, setParentNoFlag,
        parentNo, setParentNo,
        tasks, setTasks,
        users, setUsers, userId, setUserId,
        type, setType, disabled, setDisabled, status, setStatus, filter, canvases, setCanvases, setFilter,
        forward, setForward,
        csflag, setCsflag,
        api, setApi,
        sprint, setSprint,
        relatedUICanvas, setRelatedUICanvas,
        addCrdComponentDrawer, setAddCrdComponentDrawer,
        calculateCodeLine, setCalculateCodeLine,
        calculateCodeLineEnabled, setCalculateCodeLineEnabled,
        viewMode, setViewMode,
        close,
        countFilter, setCountFilter,
        getCommitsFromGithub, setGetCommitsFromGithub,
        currentTaskId,setCurrentTaskId,
        currentTaskIds,setCurrentTaskIds,
        backlogVisibleColumnKeys, setBacklogVisibleColumnKeys,
        backlogColumnResetVersion, setBacklogColumnResetVersion,
    }
    return (
        <IssueContext.Provider value={props}>
            {children}
        </IssueContext.Provider>
    );
}
