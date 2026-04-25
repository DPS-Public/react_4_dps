import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  FirestoreError
} from 'firebase/firestore';

import { ApiRequest, ApiResponse, Environment, RequestHistory } from '../types/api';
import { db } from '@/config/firebase';

const COLLECTIONS = {
  REQUESTS: 'apiRequests',
  ENVIRONMENTS: 'environments',
  HISTORY: 'requestHistory'
};

// Helper function to handle Firestore errors
const handleFirestoreError = (error: FirestoreError, context: string) => {
  console.error(`Firestore Error in ${context}:`, error);
  if (error.code === 'failed-precondition') {
    const errorMessage = `Index missing or building.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  throw error;
};

// Type-safe document data extraction
const extractDocData = <T extends { id: string }>(doc: any): T => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data
  } as T;
};

// API Requests CRUD with user association
export const createRequest = async (request: Omit<ApiRequest, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.REQUESTS), {
      ...request,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'createRequest');
    return '';
  }
};

export const updateRequest = async (id: string, request: Partial<ApiRequest>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.REQUESTS, id);
    await updateDoc(docRef, {
      ...request,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'updateRequest');
  }
};

export const deleteRequest = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.REQUESTS, id));
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'deleteRequest');
  }
};

export const getRequests = async (userId: string): Promise<ApiRequest[]> => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.REQUESTS),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => extractDocData<ApiRequest>(doc));
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'getRequests');
    return [];
  }
};

export const getRequest = async (id: string): Promise<ApiRequest | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.REQUESTS, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? extractDocData<ApiRequest>(docSnap) : null;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'getRequest');
    return null;
  }
};

export const subscribeToRequests = (
  userId: string,
  callback: (requests: ApiRequest[]) => void,
  errorCallback?: (error: FirestoreError) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.REQUESTS),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const requests = querySnapshot.docs.map(doc => extractDocData<ApiRequest>(doc));
        callback(requests);
      },
      (error) => {
        const firestoreError = error as FirestoreError;
        // If index is missing, try without orderBy
        if (firestoreError.code === 'failed-precondition') {
          try {
            const fallbackQ = query(
              collection(db, COLLECTIONS.REQUESTS),
              where('userId', '==', userId)
            );
            
            return onSnapshot(
              fallbackQ,
              (querySnapshot) => {
                const requests = querySnapshot.docs.map(doc => extractDocData<ApiRequest>(doc));
                // Sort manually by updatedAt if available
                const sortedRequests = requests.sort((a, b) => {
                  const aTime = a.updatedAt?.getTime?.() || 0;
                  const bTime = b.updatedAt?.getTime?.() || 0;
                  return bTime - aTime;
                });
                callback(sortedRequests);
              },
              (fallbackError) => {
                console.error('Fallback subscription failed:', fallbackError);
                if (errorCallback) errorCallback(fallbackError as FirestoreError);
              }
            );
          } catch (fallbackInitError) {
            console.error('Fallback subscription initialization failed:', fallbackInitError);
            if (errorCallback) errorCallback(firestoreError);
            return () => {}; // Return empty unsubscribe function
          }
        } else {
          handleFirestoreError(firestoreError, 'subscribeToRequests');
          if (errorCallback) errorCallback(firestoreError);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'subscribeToRequests initialization');
    return () => { }; // Return empty unsubscribe function
  }
};

// Environments CRUD with user association
export const createEnvironment = async (environment: Omit<Environment, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.ENVIRONMENTS), {
      ...environment,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'createEnvironment');
    return '';
  }
};

export const updateEnvironment = async (id: string, environment: Partial<Environment>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.ENVIRONMENTS, id);
    await updateDoc(docRef, {
      ...environment,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'updateEnvironment');
  }
};

export const deleteEnvironment = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.ENVIRONMENTS, id));
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'deleteEnvironment');
  }
};

export const getEnvironments = async (userId: string): Promise<Environment[]> => {
  try {    const querySnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.ENVIRONMENTS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
    );    return querySnapshot.docs.map(doc => extractDocData<Environment>(doc));
  } catch (error) {
    const firestoreError = error as FirestoreError;
    // If index is missing, try without orderBy
    if (firestoreError.code === 'failed-precondition') {
      try {
        const querySnapshot = await getDocs(
          query(
            collection(db, COLLECTIONS.ENVIRONMENTS),
            where('userId', '==', userId)
          )
        );
        const environments = querySnapshot.docs.map(doc => extractDocData<Environment>(doc));
        // Sort manually by createdAt if available
        return environments.sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 
                       (a.createdAt as any)?.seconds ? (a.createdAt as any).toMillis() : 0;
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 
                       (b.createdAt as any)?.seconds ? (b.createdAt as any).toMillis() : 0;
          return bTime - aTime;
        });
      } catch (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        return [];
      }
    }
    handleFirestoreError(firestoreError, 'getEnvironments');
    return [];
  }
};

// Request History with user association
export const saveRequestHistory = async (history: Omit<RequestHistory, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.HISTORY), {
      ...history,
      timestamp: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'saveRequestHistory');
    return '';
  }
};

export const getRequestHistory = async (userId: string, requestId?: string): Promise<RequestHistory[]> => {
  try {
    let q;
    if (requestId) {
      q = query(
        collection(db, COLLECTIONS.HISTORY),
        where('userId', '==', userId),
        where('requestId', '==', requestId),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.HISTORY),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = extractDocData<RequestHistory>(doc);
      return {
        ...data,
        timestamp: (data.timestamp as Timestamp).toDate()
      };
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'getRequestHistory');
    return [];
  }
};
