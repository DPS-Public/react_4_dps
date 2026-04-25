import {createSlice} from "@reduxjs/toolkit";

interface AuthState {
    currentUser: any | null;
    currentCanvas: any | null;
    canvasses: any[];
    users: []
}

const initialState: AuthState = {
    currentUser: null,
    canvasses: [],
    currentCanvas: null,
    users: []
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCurrentUser: (state, action) => {

            state.currentUser = action.payload;
        },
        setCurrentCanvas: (state, action) => {
            state.currentCanvas = action.payload;
        },
        setCanvasses: (state, action) => {
            state.canvasses = action.payload;
        },
        setUsers: (state, action) => {
            state.users = action.payload;
        },
        updateUser: (state, action) => {
            const { uid, updates } = action.payload;
            const userIndex = state.users.findIndex((u: any) => u.uid === uid);
            if (userIndex !== -1) {
                state.users[userIndex] = { ...state.users[userIndex], ...updates };
            }
        }
    },
});

export const authReducer = authSlice.reducer;
export const {setCurrentUser, setCanvasses, setUsers, setCurrentCanvas, updateUser} = authSlice.actions;
