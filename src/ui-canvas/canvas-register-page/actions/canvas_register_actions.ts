// import { signInWithGitHub, signInWithGoogle } from '@/config/firebase';
import { auth, db, loginWithGitHub, loginWithGoogle } from "@/config/firebase";
import { callApiPublic } from "@/utils/callApi";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const redirectUserAfterLogin = async (token: string, user: any) => {
  const redirectPath = sessionStorage.getItem("redirectAfterLogin") || "/enrolled-projects";
  window.location.href = redirectPath;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getAlreadyRegisteredMessage = (authExists: boolean, firestoreExists: boolean) => {
  if (authExists && firestoreExists) {
    return "This user is already registered. We found this account in both authentication and the users list. Please sign in instead.";
  }

  if (authExists) {
    return "This email already exists in authentication, but the user profile is missing from the users list.";
  }

  if (firestoreExists) {
    return "This email already exists in the users list, but the authentication account is missing.";
  }

  return "This user is already registered. Please sign in instead.";
};

const getRegisterErrorMessage = (response: any) => {
  const rawMessage = String(response?.message || "").toLowerCase();

  if (
    rawMessage.includes("already registered") ||
    rawMessage.includes("already exists") ||
    rawMessage.includes("email-already-in-use")
  ) {
    return "This email already exists in authentication. The users list record could not be completed automatically. Please sign in or contact an administrator.";
  }

  return response?.message || "Registration failed. Please try again.";
};

export default function useCanvasRegisterActions() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validatePassword = () => {
    if (password !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return false;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }

    setPasswordError("");
    return true;
  };

  const getExistingRegistrationState = async (rawEmail: string) => {
    const normalizedEmail = normalizeEmail(rawEmail);

    const [signInMethods, usersSnapshot] = await Promise.all([
      fetchSignInMethodsForEmail(auth, normalizedEmail),
      getDocs(query(collection(db, "users"), where("email", "==", normalizedEmail))),
    ]);

    return {
      authExists: signInMethods.length > 0,
      firestoreExists: !usersSnapshot.empty,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const normalizedEmail = normalizeEmail(email);
      const { authExists, firestoreExists } = await getExistingRegistrationState(normalizedEmail);

      if (authExists && firestoreExists) {
        toast.error(getAlreadyRegisteredMessage(authExists, firestoreExists));
        return;
      }

      const res: any = await callApiPublic("/auth/register", {
        email: normalizedEmail,
        password,
        displayName: name,
      });

      if (res.status >= 200 && res.status < 300 && res.email) {
        navigate("/login");
        toast.success(res.message || "Registration completed successfully.");
      } else {
        toast.error(getRegisterErrorMessage(res));
      }
    } catch (error) {
      console.error(error);
      toast.error("Registration check failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const user: any = await loginWithGoogle();
    if (user.token) {
      localStorage.setItem("token", user.token);
      localStorage.setItem("userData", JSON.stringify(user.user));
      toast.success("User signed in");
      await redirectUserAfterLogin(user.token, user.user);
    } else {
      toast.error("User signed in, but no access token");
    }
  };

  const handleGitHubLogin = async () => {
    const user: any = await loginWithGitHub();
    if (user.token) {
      localStorage.setItem("token", user.token);
      localStorage.setItem("userData", JSON.stringify(user.user));
      toast.success("User signed in");
      await redirectUserAfterLogin(user.token, user.user);
    } else {
      toast.error("User signed in, but no access token");
    }
  };

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    setPasswordError,
    isSubmitting,
    setIsSubmitting,
    handleSubmit,
    handleGoogleSignIn,
    handleGitHubLogin,
  };
}
