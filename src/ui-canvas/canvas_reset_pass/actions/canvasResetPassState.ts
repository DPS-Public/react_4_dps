import { callApiPublic } from '@/utils/callApi';
import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function useCanvasResetPassState() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const oobCode = queryParams.get("oobCode");
    const navigate=useNavigate()
  
    const handleSubmit = async () => {
     
  
      if (!oobCode) {
        toast.error("Invalid or missing reset code.");
        return;
      }
  
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
  
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
  
      try {
        const res:any=await callApiPublic("/auth/reset",{
          newPassword:password,
          confirmPassword,
          oobCode
      })
      if(res.status==200){
         navigate('/login')
         toast.success(res.message)
         
      }
      else{
        toast.error(res.message)
      }
        toast.success("Password reset successfully. You can now log in.");
      } catch (error) {
        toast.error(`Error: ${error.message}`);
      }
    };
  return{password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    handleSubmit, 
  }
}


