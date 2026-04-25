import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Resolves a DPS project user by their GitHub numeric ID or GitHub login username.
 *
 * Strategy:
 * 1. Checks the `user_githubs` Firestore collection for ID-based matches.
 * 2. Falls back to fuzzy email/displayName matching against the projectUsers array.
 *
 * Returns the matched project user object, or null if not found.
 *
 * Service layer — Firebase communication only, no React state.
 */
export const resolveUserByGitHubId = async (
    githubId: string | number | null,
    githubLogin: string | null,
    projectUsers: any[]
): Promise<any | null> => {
    if (!githubId && !githubLogin) return null;

    try {
        // Step 1: Match by GitHub numeric ID in Firestore user_githubs collection
        if (githubId) {
            const snapshot = await getDocs(collection(db, 'user_githubs'));

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                if (Array.isArray(data.github_ids)) {
                    const matched = data.github_ids.find(
                        (id: string) => String(id).trim() === String(githubId).trim()
                    );
                    if (matched) {
                        const user = projectUsers.find((u: any) => u.uid === docSnap.id);
                        if (user) return user;
                    }
                }
            }
        }

        // Step 2: Fallback — fuzzy match by GitHub login against email or displayName
        if (githubLogin) {
            const login = githubLogin.toLowerCase();
            const user = projectUsers.find((u: any) =>
                u.email?.toLowerCase().includes(login) ||
                u.displayName?.toLowerCase().includes(login)
            );
            if (user) return user;
        }
    } catch (error) {
        console.error('Error resolving user by GitHub ID:', error);
    }

    return null;
};
