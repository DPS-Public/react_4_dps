CDA™ — Canvas Driven Architecture
Engineering & Code Standardization Guide
Version: 1.0 Author: Anar Rustamov (DPS Alliance) Contact: me@anarrustamov.com Website: https://dpsummary.com

1. Purpose
This document defines the official engineering architecture standard for DPS frontend development. DPS operates as a multi-product ecosystem consisting of four independent product universes:
Public
Education
Coach Console
Course Creator
Each universe is architecturally isolated. There is no shared server state, no shared API layer, and no cross-module data dependency.
This standard ensures:
Clear module boundaries
Query isolation
Scalable architecture
Predictable development
Zero cache contamination
Clean engineering governance

2. Core Architecture Principle
One Route Prefix = One Product Universe = One QueryClient = One API Layer
Each product universe is treated as an independent system inside a single frontend application.

3. Product Universes & Routing Map
Product
Route Prefix
Shell Component
QueryClient
Public
/
<PublicShell />
publicQC
Education
/edu/*
<EducationShell />
eduQC
Coach Console
/coach/*
<CoachShell />
coachQC
Course Creator
/creator/*
<CreatorShell />
creatorQC

⚠️ A root-level QueryClientProvider is NOT allowed. Each universe must inject its own QueryClient inside its Shell.

4. QueryClient Governance
Each product universe must have its own QueryClient instance.
import { QueryClient } from "@tanstack/react-query";

export const publicQC = new QueryClient();
export const eduQC = new QueryClient();
export const coachQC = new QueryClient();
export const creatorQC = new QueryClient();

Rules:
QueryClient must be a singleton per universe
No shared QueryClient across modules
No dynamic QueryClient creation inside components
No nested cross-universe providers

5. Shell & Provider Pattern
Each universe must be wrapped in its own QueryClientProvider inside a dedicated Shell component.
export default function EducationShell() {
  return (
    <QueryClientProvider client={eduQC}>
      <EducationRoutes />
    </QueryClientProvider>
  );
}

Rules:
Provider exists only inside its universe shell
Components outside the shell must not access its QueryClient
The Shell is the architectural boundary

6. Folder Structure
6.1 Application-Level Structure
src/
  app/
    router/
      AppRouter.tsx
    providers/
      queryClients.ts
      shells/
        PublicShell.tsx
        EducationShell.tsx
        CoachShell.tsx
        CreatorShell.tsx
  modules/
    public/
      api/
      queries/
      mutations/
      pages/
      components/
    education/
      api/
      queries/
      mutations/
      pages/
      components/
    coach/
      api/
      queries/
      mutations/
      pages/
      components/
    creator/
      api/
      queries/
      mutations/
      pages/
      components/

⚠️ Strict Rule: No cross-module imports of api/, queries/, or mutations/. Each module is a sealed boundary.

6.2 UI Canvas Folder Structure
Every ui-canvas/uic_<canvas_name>/ directory must follow this fixed internal structure:
ui-canvas/uic_<canvas_name>/
  components/
  hooks/
  handlers/
  services/
  configs/
  utils/
  types/

Folder
Purpose
Example Files
components/
UI components (Table, Drawer, Modal, Form)
CanvasTable.tsx, IssueDrawer.tsx
hooks/
React state and effect logic (useState/useEffect)
useCanvasData.ts, useUserStatus.ts
handlers/
UI event orchestrators (onClick/onSubmit → calls service)
handleBatchAddCommits.ts, handleAuth.ts
services/
Clean async functions for Firebase/API (no UI dependency)
serviceUser.ts, serviceGithub.ts
configs/
Table columns, form fields, and static config objects
configApiEndpoints.ts, configGithubCommitConfigs.tsx
utils/
Pure helper functions (format, normalize, map)
utilFormatDate.ts, utilValidateEmail.ts
types/
TypeScript interfaces and types (1 file = 1 type)
commitTypes.interface.ts, userTypes.interface.ts


7. File Naming & Single-Responsibility Rule
7.1 The Golden Rule: 1 File = 1 Export
Every function, method, interface, or type must live in its own file.
✅ Correct:
getActiveProjectById.ts  →  export async function getActiveProjectById(...) {}
UploadedFile.interface.ts  →  export interface UploadedFile {}

❌ Incorrect:
backlogService.ts  →  10+ functions inside
createIssueTypes.interface.ts  →  3 interfaces inside

Why: In a large codebase, search, refactoring, ownership, testing, reuse, and import management are only predictable when each file has a single, clear responsibility.

7.2 File Name = Export Name (100% Match)
The file name must exactly match the name of the exported entity.
✅ Correct:
getTasks.ts         →  export const getTasks = async (...) => {}
createIssue.ts      →  export const createIssue = async (...) => {}
CommonDescription.ts →  export interface CommonDescription {}


7.3 Naming Conventions by Layer
Layer
Prefix
File Example
Export Example
Components
PascalCase
ApiCanvas.tsx
export default function ApiCanvas()
Hooks
use
useCanvasSync.ts
export const useCanvasSync = ()
Handlers
handle
handleUserClick.ts
export const handleUserClick = (e)
Services
service
serviceUser.ts
export const serviceUser = ()
Utils
util
utilFormatDate.ts
export const utilFormatDate = ()
Types / Interfaces
domain name
commitTypes.interface.ts
export interface CommitType {}
Store slices
camelCase
canvasSlice.ts
export const canvasSlice
Action files
snake_case + _actions
canvas_login_actions.ts
—


8. Layer Responsibilities
8.1 Handler — UI Event Orchestrator
A handleXXX function manages only UI events and state. It must not contain data-access logic.
A handler:
Sets loading state
Shows messages
Calls a service
Handles errors
Updates UI-relevant mappings
// handleBatchAddCommits.ts
export const handleBatchAddCommits = async (e: React.MouseEvent) => {
  setLoading(true);
  try {
    await serviceCreateCommits(data);
    message.success("Commits added.");
  } catch {
    message.error("Failed to add commits.");
  } finally {
    setLoading(false);
  }
};

❌ A handler must never behave like a service (no direct Firestore/API calls).

8.2 Service — Data Access & Integration Layer
A serviceXXX function handles only data retrieval and persistence. It must not interact with UI.
A service:
Executes Firestore queries
Makes REST API calls
Returns data
// getActiveProjectById.ts
import { db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function getActiveProjectById(id: string) {
  const docRef = doc(db, "ui_canvas", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

❌ A service must never use:
message.success / message.error
setLoading, setState
DOM events (MouseEvent)
AntD or any UI components
Note: Avoid id: any — use string as the minimum type constraint.

8.3 Utils — Pure Functions
Utils contain stateless, UI-independent helper logic:
Formatting
Parsing
Normalizing
Mapping
// utilFormatDate.ts
export const utilFormatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};


9. The Correct CDA Chain
UI (Button)  →  Handler (handleXXX)  →  Service (serviceXXX / getXXX / createXXX)  →  DB / API

❌ Anti-Pattern: Binding a service directly to onClick:
// WRONG — service receives an unwanted MouseEvent
<button onClick={resolveUserByGitHub}>Login</button>

✅ Correct:
// RIGHT — handler mediates between UI and service
<button onClick={handleGitHubLogin}>Login</button>

// handleGitHubLogin.ts
export const handleGitHubLogin = async (e: React.MouseEvent) => {
  await resolveUserByGitHub(userId);
};


10. Query Key Naming Convention
Even though QueryClient instances are isolated per universe, namespace-based query keys are mandatory for DevTools clarity.
Universe
Example Key
Public
['public', 'home']
Education
['edu', 'courses']
Coach
['coach', 'students']
Creator
['creator', 'drafts']

Rules:
The first key must always be the universe namespace
No generic keys such as ['users']
No cross-universe key reuse

11. API Layer Governance
Each universe must maintain a completely isolated API layer:
modules/education/api/*
modules/coach/api/*
modules/creator/api/*
modules/public/api/*

Rules:
No API function may be reused across universes
No shared baseURL across universes
Each universe manages its own authentication strategy

12. Authentication Isolation
If authentication exists in multiple universes, token storage must be namespaced:
Universe
Token Key
Education
edu_token
Coach
coach_token
Creator
creator_token

Public must not read tokens belonging to other universes
No shared global auth context across universes unless explicitly architected

13. Component Governance — Method & Prop Rules
13.1 No Method Passing via Props
In CDA, passing functions (callbacks) as props between components is forbidden. Only data (string, number, object, array) may be passed as props.
Why:
Prevents prop drilling
Enforces component isolation
Ensures components are not dependent on external handlers
❌ Anti-Pattern:
const CreateIssue = ({ handleSave }) => {
  const data = getData();
  return <button onClick={() => handleSave(data)}>Save</button>;
};

✅ CDA Standard:
const CreateIssue = () => {
  const data = getData();

  const handleLocalSave = () => {
    serviceCreateIssue(data);
  };

  return <button onClick={handleLocalSave}>Save</button>;
};


13.2 The Silent Component Principle
"Components must be deaf and mute."
Aspect
Rule
Input
Only strictly necessary data via Props
Logic
Owned entirely by the component's internal handlers/ and hooks/
Output
No callbacks. Silently updates the central store or database


14. Global State & Redux Governance
14.1 Action Naming Convention
Format: [Universe] / [Module] / [Action Name]
✅ Correct
❌ Incorrect
EDUCATION / COURSE_LIST / SET_LOADING
SET_DATA
COACH / STUDENT_DRAWER / OPEN
SET_LOADING


14.2 Store Isolation — Universe Slicing
Each product universe must have a dedicated Redux slice. One universe must never read another's state.
// src/app/store/slices/educationSlice.ts
export const educationSlice = createSlice({
  name: 'EDUCATION',
  initialState,
  reducers: {
    setCourseData: (state, action) => {
      state.courses = action.payload;
    }
  }
});


14.3 Dispatch Over Method Propagation
Golden Rule: If a parent component needs to know about a child's action, the child dispatches a Redux action. The parent listens via a selector. No method is passed down.
Child Component  →  dispatch(action)  →  Redux Store  →  Parent Selector


15. Firebase & React — Clean Patterns
15.1 Conditional Rendering Over CSS Hiding
❌ Never hide components with CSS:
<Component style={{ display: 'none' }} />

This keeps the component mounted, Firebase listeners active, and resources consumed.
✅ Always use conditional rendering:
{activeTab === 'target' && <Component />}

When unmounted, React clears memory and closes all Firebase connections.

15.2 Always Return a Cleanup Function
Every useEffect that creates a Firebase listener must return an unsubscribe function:
useEffect(() => {
  const unsubscribe = onSnapshot(ref, (snapshot) => {
    // handle data
  });
  return () => unsubscribe(); // cleanup on unmount
}, []);


15.3 Persist Data in Redux, Not in Component State
When a component unmounts, its local useState data is lost. To preserve data across tab switches:
Layer
Behavior
Component (UI)
Mounts and unmounts freely (performance gain)
Data (State)
Persists in Redux store (UX gain)


15.4 Global Drawer Pattern
"One Drawer per application, not one Drawer per row."
Place a single central Drawer at the application level and pass only an ID as a prop. The Drawer's content updates as props.id changes.
Benefits:
RAM does not inflate
Firebase limits are not exceeded
Codebase remains clean at any scale

16. Forbidden Patterns
The following are strictly forbidden:
One global QueryClient for all universes
Cross-universe query invalidation
Importing Education queries inside the Coach module
Shared mutation logic between universes
Shared environment variables without namespace prefixes
Global state that mixes data from multiple product universes
Passing methods/callbacks as props between components
Binding service functions directly to UI events
Violation of these rules results in architectural contamination.

17. Refactoring Reference — Service Decomposition
Before (incorrect):
backlogService.ts  →  10+ functions

After (CDA standard):
services/
  getActiveProjectById.ts
  getApiCanvas.ts
  getApiJson.ts
  getTasks.ts
  subscribeTasks.ts
  createIssue.ts
  getTaskById.ts
  editComment.ts
  updateDescription.ts
  updateClosedDate.ts

Each file contains exactly one export.

18. Engineering Philosophy
Architecture defines product scalability. Clear boundaries define execution stability. Isolation prevents chaos.
DPS frontend is not a single application. It is four independent systems deployed under one frontend container.
Principle
Direction
Data isolation
Over convenience
Explicit boundaries
Over implicit coupling
Predictability
Over shortcut architecture
Governance
Over improvisation


19. Standard of Acceptance
A contribution is accepted when it:
Maintains clear Canvas-to-Code traceability
Follows DPS domain language and naming conventions
Respects universe isolation and the CDA chain
Improves maintainability without breaking architectural clarity
Aligns with the CaDPM / CDA philosophy

20. Naming of Sub-Components in UI Canvas
Description:
 All components and their sub-components within a UI Canvas must be named in a clear, structured, and hierarchical manner. Each sub-component must explicitly include the name of its parent component to ensure traceability and consistency.
Rule:
Every sub-component must be prefixed with its parent component name.
Naming must reflect the hierarchical relationship between components.
Separators such as (-, /, _) may be used consistently across the system.
A unified naming convention must be maintained throughout the project.
Format:
[ParentComponent] - [SubComponent]
or
[ParentComponent] / [SubComponent]
or
[ParentComponent]_[SubComponent]
Examples:
Header - Logo
Header - Navigation
Header - Profile Menu
ProductCard / Image
ProductCard / Title
ProductCard / Price
ProductCard / Action Button
DashboardHeader_NotificationIcon
DashboardHeader_UserMenu
Sidebar_MenuItem
Sidebar_SubMenuItem
Incorrect Usage:
Button
Title
MenuItem
Correct Usage:
LoginForm - Submit Button
ProductCard - Title
Sidebar - Menu Item
Note:
 This naming convention improves structural clarity, enhances readability of the UI architecture, and ensures consistency across the UI Canvas. It also simplifies communication between design, development, and product teams.

21. Type Folder Naming Convention
Description:
 All files inside any types/ directory must use PascalCase naming. Type definitions are considered domain models and must follow a single consistent naming style.
Rules:
Every file inside types/ must begin with an uppercase letter
File name must exactly match the exported interface, type, enum, or constant name
No lowercase file names are allowed inside types/
One file may contain only one export
types/ must stay flat; subfolders inside types/ are not allowed
Examples:
ComponentJson.interface.ts  →  export interface ComponentJson {}
MotionProps.interface.ts    →  export interface MotionProps {}
Actions.ts                  →  export const Actions = [...]
Incorrect Usage:
componentTypeLabel.ts
actions.ts
motionProps.interface.ts

DPS Engineering Standard v1.0 — Approved Architecture Model Multi-Universe Query Governance Framework
© 2026 Anar Rustamov (DPS Alliance). CaDPM methodology is protected under CC BY-NC-ND 4.0. See dpsummary.com for the full CaDPM Guide.
