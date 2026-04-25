import { auth, buildAuthenticatedUserProfile, db, ensureSystemAdminUserDocument, loginWithGoogle } from '@/config/firebase';
import { message } from 'antd';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

export default function useCanvasLoginActions() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const missingUserMessage = 'Failed to login. User does not exist.';
  const systemAdminEmail = String(import.meta.env.VITE_SYSTEM_ADMIN_EMAIL || '').trim().toLowerCase();
  const showLoginError = (content: string) => {
    message.error(content);
    toast.error(content);
  };

  const isEnvSystemAdmin = (rawEmail?: string | null) =>
    String(rawEmail || '').trim().toLowerCase() === systemAdminEmail;

  const ensureUserExistsInFirestore = async (firebaseUser: any) => {
    if (!firebaseUser?.uid) {
      return false;
    }

    const directDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (directDoc.exists()) {
      return true;
    }

    const normalizedEmail = String(firebaseUser.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('email', '==', normalizedEmail))
    );

    return !usersSnapshot.empty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const existsInUsers = await ensureUserExistsInFirestore(firebaseUser);

      if (!existsInUsers) {
        if (isEnvSystemAdmin(firebaseUser.email)) {
          await ensureSystemAdminUserDocument(firebaseUser, firebaseUser.email);
        } else {
          await signOut(auth);
          showLoginError(missingUserMessage);
          return;
        }
      }

      const idToken = await firebaseUser.getIdToken();
      const userProfile = await buildAuthenticatedUserProfile(firebaseUser);

      localStorage.setItem("token", idToken);
      if (userProfile) {
        localStorage.setItem("userData", JSON.stringify(userProfile));
      }
      toast.success("User signed in");
      window.location.href = '/ui-canvas';
    } catch (error) {
      console.error(error);
      showLoginError("Login error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const user: any = await loginWithGoogle({ showSuccessMessage: false });
    const firebaseUser = user?.firebaseUser || user?.user;
    const existsInUsers = await ensureUserExistsInFirestore(firebaseUser);

    if (!existsInUsers) {
      if (isEnvSystemAdmin(firebaseUser?.email)) {
        await ensureSystemAdminUserDocument(firebaseUser, firebaseUser?.email);
      } else {
        await signOut(auth);
        showLoginError(missingUserMessage);
        return;
      }
    }

    if (user.token) {
      localStorage.setItem('token', user.token);
      localStorage.setItem('userData', JSON.stringify(user.user));
      toast.success('User signed in');
         window.location.href = '/ui-canvas';
    } else {
      showLoginError('User signed in, but no access token');
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    setIsSubmitting,
    handleSubmit,
    handleGoogleSignIn,
  };
}



