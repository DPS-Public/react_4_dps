import { db } from "@/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const generateProjectNumber = async (): Promise<number> => {
  try {
    const counterRef = doc(db, "counters", "projects");
    const counterDoc = await getDoc(counterRef);




    
    let newCount: number;
    
    if (counterDoc.exists()) {
      const currentCount = counterDoc.data().count || 0;
      newCount = Math.max(1000, currentCount) + 1;
    } else {
      newCount = 1000;
    }
    
    await setDoc(counterRef, { count: newCount }, { merge: true });
    return newCount;
    
  } catch (error) {
    console.error("Error generating project number:", error);
    return Math.max(1000, Date.now());
  }
};
