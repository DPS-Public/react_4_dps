import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, buildAuthenticatedUserProfile, seedSystemAdmin } from "../config/firebase";
// import { callApiPublic } from "@/utils/callApi";
import { message } from "antd";

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  token: string | null;
  isSystemAdmin: boolean;
  logout: () => Promise<void>;
  logoutLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  token: null,
  isSystemAdmin: false,
  logout: async () => {},
  logoutLoading: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Logout function
  const logout = async () => {
    setLogoutLoading(true);
    try {
      // First sign out from Firebase
      await signOut(auth);
      
      // Then call your backend logout API if user exists
      if (user?.uid) {
        try {
          // const response = await callApiPublic("/auth/log-out", {
          //   uid: user.uid
          // });
          // if (response.success) {
          //   message.success("Backend logout successful");
          // }
          // TODO: Replace with new API logic or remove if not needed.
        } catch (apiError) {
          console.error("Backend logout failed:", apiError);
        }
      }
      
    } catch (error) {
      console.error("Firebase logout error:", error);
    } finally {
      // Always clear local state and storage
      setUser(null);
      setUserProfile(null);
      setIsSystemAdmin(false);
      setToken(null);
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      sessionStorage.removeItem("redirectAfterLogin");
      setLogoutLoading(false);
    }
  };

  // Check token validity
  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      return Date.now() < expirationTime - 60000; // 1 minute buffer
    } catch {
      return false;
    }
  };

  // Refresh token function
  const refreshToken = async (firebaseUser: User): Promise<string> => {
    try {
      const newToken = await firebaseUser.getIdToken(true);
      localStorage.setItem("token", newToken);
      return newToken;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  };

  // Auth state and token setup
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    let unsubscribe: () => void;

    const initializeAuth = async () => {
      await seedSystemAdmin();

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            setUser(firebaseUser);
            
            let idToken = await firebaseUser.getIdToken();
            
            if (!isTokenValid(idToken)) {
              idToken = await refreshToken(firebaseUser);
            }
            
            setToken(idToken);
            localStorage.setItem("token", idToken);

            const resolvedProfile = await buildAuthenticatedUserProfile(firebaseUser);
            setUserProfile(resolvedProfile);
            setIsSystemAdmin(Boolean(resolvedProfile?.isSystemAdmin));
            if (resolvedProfile) {
              localStorage.setItem("userData", JSON.stringify(resolvedProfile));
            }

            // Set up token refresh interval
            refreshInterval = setInterval(async () => {
              try {
                const newToken = await refreshToken(firebaseUser);
                setToken(newToken);
              } catch (error) {
                console.error("Auto token refresh failed:", error);
                await logout();
              }
            }, 55 * 60 * 1000);

          } else {
            // User signed out
            setUser(null);
            setUserProfile(null);
            setIsSystemAdmin(false);
            setToken(null);
            localStorage.removeItem("token");
            localStorage.removeItem("userData");
            if (refreshInterval) clearInterval(refreshInterval);
          }
        } catch (error) {
          console.error("Auth state change error:", error);
          setUser(null);
          setUserProfile(null);
          setIsSystemAdmin(false);
          setToken(null);
          localStorage.removeItem("token");
          localStorage.removeItem("userData");
        } finally {
          setLoading(false);
        }
      });
    };

    initializeAuth();

    return () => {
      if (unsubscribe) unsubscribe();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    token,
    isSystemAdmin,
    logout,
    logoutLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

