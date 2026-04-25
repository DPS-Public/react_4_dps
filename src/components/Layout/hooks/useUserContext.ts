// hooks/useUserContext.ts
import {getAuth} from "firebase/auth";
import {useAuthState} from "react-firebase-hooks/auth";

export function useUserContext() {
  const auth = getAuth();
  const [user, loading] = useAuthState(auth);
  
  return {
    user,
    loading,
    auth
  };
}
