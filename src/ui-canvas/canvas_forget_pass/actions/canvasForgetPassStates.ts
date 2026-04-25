import { callApiPublic } from '@/utils/callApi';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

export default function useCanvasForgetPassStates() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
      e.preventDefault();
  
      if (!email) {
        message.error("Please enter an email");
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        message.error("Please enter a valid email address");
        return;
      }
      
      setLoading(true);
      
      // Show loading message
      const loadingMessage = message.loading('Sending reset instructions...', 0);
      
      try {
        const res = await callApiPublic("/auth/forget", {
          email,
        });
  
        // Destroy loading message
        setTimeout(() => {
          loadingMessage();
        }, 100);

        if (res.status === 200) {
          message.success({
            content: 'Check your email for password reset instructions',
            duration: 4,
            style: {
              marginTop: '50vh',
            },
          });
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          const errorMessage = res.message || res.error || "Failed to send reset email";
          message.error(errorMessage);
        }
      } catch (error) {
        console.error('API Error:', error);
        
        // Destroy loading message
        setTimeout(() => {
          loadingMessage();
        }, 100);
        
        const errorMessage = error.response?.data?.message || error.message || "An error occurred while sending reset email";
        message.error({
          content: errorMessage,
          duration: 5,
        });
      } finally {
        setLoading(false);
      }
    };

  return {
    email, 
    setEmail,
    handleSubmit,
    navigate,
    loading
  };
}

