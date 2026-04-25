// hooks/useNavigationContext.ts
import {useLocation, useNavigate} from "react-router-dom";

export function useNavigationContext() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return {
    navigate,
    location
  };
}
