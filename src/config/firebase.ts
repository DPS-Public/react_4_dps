import { initializeApp } from "firebase/app";
import {
	getAuth,
	GoogleAuthProvider,
	GithubAuthProvider,
	signInWithPopup,
	fetchSignInMethodsForEmail,
	linkWithCredential,
	linkWithPopup,
	reauthenticateWithPopup,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { message } from "antd";
import { getStorage } from "firebase/storage";
// import { callApiCoachConsole } from "@/utils/callApi";

// Environment variables
const API_KEY = import.meta.env.VITE_API_KEY;
const FIREBASE_APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;
const FIREBASE_AUTH_DOMAIN = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_MEASUREMENT_ID = import.meta.env.VITE_MEASUREMENT_ID;
const VITE_PROD = import.meta.env.VITE_PROD;
const FIRESTORE_DATABASE_ID = import.meta.env.VITE_FIRESTORE_DATABASE_ID;
const FIREBASE_MAIL_DATABASE_ID = import.meta.env.VITE_FIREBASE_MAIL_DATABASE_ID;
const SYSTEM_ADMIN_EMAIL = String(import.meta.env.VITE_SYSTEM_ADMIN_EMAIL || "").trim().toLowerCase();

// Firebase Configuration
const firebaseConfig = {
	apiKey: API_KEY,
	authDomain: FIREBASE_AUTH_DOMAIN,
	projectId: FIREBASE_PROJECT_ID,
	storageBucket: FIREBASE_STORAGE_BUCKET,
	messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
	appId: FIREBASE_APP_ID,
	measurementId: FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with conditional database name
const resolvedFirestoreDatabaseId = FIRESTORE_DATABASE_ID || VITE_PROD || "langdp-psp";
const db = getFirestore(app, resolvedFirestoreDatabaseId);
const resolvedMailFirestoreDatabaseId = FIREBASE_MAIL_DATABASE_ID || resolvedFirestoreDatabaseId;
const mailDb = getFirestore(app, resolvedMailFirestoreDatabaseId);
const langDp = getFirestore(app,'langdp-psp');
const examDb = getFirestore(app, "test-exam");
const storage = getStorage(app);

const normalizeEmail = (value?: string | null) => String(value || "").trim().toLowerCase();

// Authentication Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
[
	"repo",
	"read:org",
	"workflow",
	"admin:repo_hook",
	"repo:invite",
	"project",
	"read:project",
	"notifications",
	"read:user",
	"user:email",
].forEach((scope) => githubProvider.addScope(scope));

const GITHUB_SESSION_STORAGE_KEY = "githubSessionEncoded";
const GITHUB_SCOPES_STORAGE_KEY = "githubScopes";
const GITHUB_LOGIN_STORAGE_KEY = "githubLogin";
const GITHUB_ID_STORAGE_KEY = "githubId";
const LEGACY_GITHUB_TOKEN_KEY = "githubAccessToken";

const getGithubStoragePassphrase = () => {
	const userData = JSON.parse(localStorage.getItem("userData") || "{}");
	const uid = userData?.uid || localStorage.getItem("uid") || "anonymous";
	return `${uid}:${FIREBASE_PROJECT_ID}:${FIREBASE_APP_ID}:github-session`;
};

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const deriveGithubStorageKey = async () => {
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encoder.encode(getGithubStoragePassphrase()),
		"PBKDF2",
		false,
		["deriveKey"]
	);

	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: encoder.encode(`${FIREBASE_PROJECT_ID}:${FIREBASE_APP_ID}:github-salt`),
			iterations: 100000,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"]
	);
};

const encryptForStorage = async (payload: any) => {
	const key = await deriveGithubStorageKey();
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
	const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodedPayload);

	return JSON.stringify({
		iv: bytesToBase64(iv),
		data: bytesToBase64(new Uint8Array(cipherBuffer)),
	});
};

const decryptFromStorage = async (payload: string | null) => {
	if (!payload) return null;

	try {
		const parsed = JSON.parse(payload);
		if (!parsed?.iv || !parsed?.data) return null;

		const key = await deriveGithubStorageKey();
		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: base64ToBytes(parsed.iv) },
			key,
			base64ToBytes(parsed.data)
		);

		return JSON.parse(new TextDecoder().decode(decrypted));
	} catch (error) {
		console.warn("Failed to decrypt GitHub session payload:", error);
		return null;
	}
};

const storeEncryptedGitHubSession = async (payload: any) => {
	const encryptedPayload = await encryptForStorage(payload);
	localStorage.setItem(GITHUB_SESSION_STORAGE_KEY, encryptedPayload);
	if (payload?.scopes?.length) {
		localStorage.setItem(GITHUB_SCOPES_STORAGE_KEY, payload.scopes.join(","));
	}
	if (payload?.login) {
		localStorage.setItem(GITHUB_LOGIN_STORAGE_KEY, payload.login);
	}
	if (payload?.id) {
		localStorage.setItem(GITHUB_ID_STORAGE_KEY, String(payload.id));
	}
};

export const clearGitHubSessionStorage = () => {
	localStorage.removeItem(LEGACY_GITHUB_TOKEN_KEY);
	localStorage.removeItem(GITHUB_ID_STORAGE_KEY);
	localStorage.removeItem(GITHUB_LOGIN_STORAGE_KEY);
	localStorage.removeItem(GITHUB_SCOPES_STORAGE_KEY);
	localStorage.removeItem(GITHUB_SESSION_STORAGE_KEY);
};

export const getGitHubSessionData = async () => {
	const encryptedSession = localStorage.getItem(GITHUB_SESSION_STORAGE_KEY);
	const decryptedSession = await decryptFromStorage(encryptedSession);
	if (decryptedSession) {
		return decryptedSession;
	}

	const legacyToken = localStorage.getItem(LEGACY_GITHUB_TOKEN_KEY);
	if (!legacyToken) return null;

	const migratedPayload = {
		accessToken: legacyToken,
		id: localStorage.getItem(GITHUB_ID_STORAGE_KEY) || "",
		login: localStorage.getItem(GITHUB_LOGIN_STORAGE_KEY) || "",
		scopes: (localStorage.getItem(GITHUB_SCOPES_STORAGE_KEY) || "").split(",").filter(Boolean),
		repos: [],
		syncedAt: new Date().toISOString(),
	};
	await storeEncryptedGitHubSession(migratedPayload);
	localStorage.removeItem(LEGACY_GITHUB_TOKEN_KEY);
	return migratedPayload;
};

export const getGitHubAccessToken = async () => {
	const sessionData = await getGitHubSessionData();
	return sessionData?.accessToken || "";
};

export const getUserData = async (uid: string) => {
	const normalizedUid = String(uid || "").trim();
	if (!normalizedUid) return null;

	const storedUserData = localStorage.getItem("userData");
	if (storedUserData) {
		try {
			const parsed = JSON.parse(storedUserData);
			if (parsed?.uid === normalizedUid) {
				return parsed;
			}
		} catch (error) {
			console.warn("Failed to parse cached userData from localStorage:", error);
		}
	}

	try {
		const directDoc = await getDoc(doc(db, "users", normalizedUid));
		if (directDoc.exists()) {
			return { uid: directDoc.id, ...directDoc.data() };
		}
	} catch (error) {
		console.warn("Failed to read user by direct uid from Firestore:", error);
	}

	try {
		const byUid = await getDocs(query(collection(db, "users"), where("uid", "==", normalizedUid)));
		if (!byUid.empty) {
			const userDoc = byUid.docs[0];
			return { uid: userDoc.data()?.uid || userDoc.id, ...userDoc.data() };
		}
	} catch (error) {
		console.warn("Failed to query user by uid from Firestore:", error);
	}

	return { uid: normalizedUid };
};

const encodeJsonForStorage = (value: any) => {
	try {
		return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
	} catch (error) {
		console.warn("Failed to encode GitHub session payload:", error);
		return "";
	}
};

const normalizeScopes = (scopeHeader: string | null) => {
	if (!scopeHeader) return [] as string[];
	return scopeHeader
		.split(",")
		.map((scope) => scope.trim())
		.filter(Boolean);
};

const persistGithubSessionData = async (accessToken: string, fallbackGithubUid?: string) => {
	if (!accessToken) return;

	const githubHeaders = {
		Authorization: `token ${accessToken}`,
		Accept: "application/vnd.github+json",
	};

	let profile: any = null;
	let repos: any[] = [];
	let scopes: string[] = [];

	try {
		const profileResponse = await fetch("https://api.github.com/user", {
			headers: githubHeaders,
		});

		scopes = normalizeScopes(profileResponse.headers.get("x-oauth-scopes"));
		if (profileResponse.ok) {
			profile = await profileResponse.json();
		}
	} catch (profileError) {
		console.warn("Failed to fetch GitHub profile:", profileError);
	}

	try {
		const reposResponse = await fetch(
			"https://api.github.com/user/repos?per_page=100&type=all&sort=updated",
			{ headers: githubHeaders }
		);

		if (reposResponse.ok) {
			const reposJson = await reposResponse.json();
			repos = Array.isArray(reposJson)
				? reposJson.map((repo: any) => ({
					id: repo.id,
					name: repo.name,
					full_name: repo.full_name,
					private: !!repo.private,
					owner: repo.owner?.login || "",
				}))
				: [];
		}
	} catch (reposError) {
		console.warn("Failed to fetch GitHub repositories:", reposError);
	}

	const githubId = profile?.id ? String(profile.id) : fallbackGithubUid || "";
	if (githubId) {
		localStorage.setItem(GITHUB_ID_STORAGE_KEY, githubId);
	}

	if (profile?.login) {
		localStorage.setItem(GITHUB_LOGIN_STORAGE_KEY, String(profile.login));
	}

	if (scopes.length > 0) {
		localStorage.setItem(GITHUB_SCOPES_STORAGE_KEY, scopes.join(","));
	}

	const sessionPayload = {
		accessToken,
		id: githubId,
		login: profile?.login || "",
		name: profile?.name || "",
		email: profile?.email || "",
		avatar_url: profile?.avatar_url || "",
		scopes,
		repos,
		syncedAt: new Date().toISOString(),
	};

	await storeEncryptedGitHubSession(sessionPayload);
};

const buildClientAuthResponse = async (result: any) => {
	const firebaseUser = result.user;
	const idToken = await firebaseUser.getIdToken();
	const userProfile = await buildAuthenticatedUserProfile(firebaseUser);

	return {
		status: 200,
		token: idToken,
		user: userProfile,
	};
};

const syncGithubLocalState = async (result: any, fallbackAccessToken?: string) => {
	const githubProviderData = result?.user?.providerData?.find(
		(provider: any) => provider?.providerId === "github.com"
	);
	const githubUid = githubProviderData?.uid;
	const githubCredential = GithubAuthProvider.credentialFromResult(result);
	const accessToken = githubCredential?.accessToken || fallbackAccessToken;

	if (accessToken) {
		await persistGithubSessionData(accessToken, githubUid ? String(githubUid) : "");
	}

	if (githubUid) {
		localStorage.setItem("githubId", githubUid.toString());
	}
};

const syncGithubStateFromAccessToken = async (accessToken: string) => {
	if (!accessToken) return;

	try {
		const profileResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${accessToken}`,
				Accept: "application/vnd.github+json",
			},
		});

		if (profileResponse.ok) {
			const profile = await profileResponse.json();
			if (profile?.id) {
				localStorage.setItem("githubId", String(profile.id));
			}
		}
	} catch (profileError) {
		console.warn("Failed to fetch GitHub profile from access token:", profileError);
	}

	await persistGithubSessionData(accessToken);
};

// Google Sign-In
const loginWithGoogle = async (options?: { showSuccessMessage?: boolean }) => {
	try {
		const result = await signInWithPopup(auth, googleProvider);
		const response = await buildClientAuthResponse(result);
		if (options?.showSuccessMessage !== false) {
			message.success("Signed in with Google");
		}
		return response;
	} catch (err: any) {
		console.error("Google login error:", err);

		if (err?.code === "auth/account-exists-with-different-credential") {
			message.error("Bu email artÄ±q baÅŸqa provider ilÉ™ istifadÉ™ olunur.");
		} else {
			message.error("Google giriÅŸindÉ™ xÉ™ta baÅŸ verdi.");
		}

		throw err;
	}
};

// GitHub Sign-In
const loginWithGitHub = async (options?: { showSuccessMessage?: boolean }) => {
	try {
		const hasLinkedGithubProvider = !!auth.currentUser?.providerData?.some(
			(provider) => provider?.providerId === "github.com"
		);

		const result = auth.currentUser
			? hasLinkedGithubProvider
				? await reauthenticateWithPopup(auth.currentUser, githubProvider)
				: await linkWithPopup(auth.currentUser, githubProvider)
			: await signInWithPopup(auth, githubProvider);

		await syncGithubLocalState(result);

		const response = await buildClientAuthResponse(result);
		if (options?.showSuccessMessage !== false) {
			message.success("Signed in with GitHub");
		}
		return response;
	} catch (err: any) {
		console.error("GitHub login error:", err);

		if (err?.code === "auth/provider-already-linked") {
			if (!auth.currentUser) {
				message.error("GitHub is already linked, please sign in again.");
				throw err;
			}

			const refreshedResult = await reauthenticateWithPopup(auth.currentUser, githubProvider);
			await syncGithubLocalState(refreshedResult);
			const response = await buildClientAuthResponse(refreshedResult);
			message.success("GitHub already linked and refreshed");
			return response;
		}

		if (err?.code === "auth/account-exists-with-different-credential") {
			const pendingCredential = GithubAuthProvider.credentialFromError(err);
			const email = err?.customData?.email;

			if (!email || !pendingCredential) {
				message.error("This email already exists with another provider.");
				throw err;
			}

			const signInMethods = await fetchSignInMethodsForEmail(auth, email);

			if (signInMethods.includes("google.com")) {
				message.info("Sign in with Google to link your GitHub account.");
				const googleResult = await signInWithPopup(auth, googleProvider);
				const linkedResult = await linkWithCredential(googleResult.user, pendingCredential);

				await syncGithubLocalState(linkedResult, (pendingCredential as any)?.accessToken);
				const response = await buildClientAuthResponse(linkedResult);
				message.success("GitHub linked to your existing account");
				return response;
			}

			if (signInMethods.includes("password")) {
				message.error("This email uses password login. Sign in with email/password first, then connect GitHub.");
				throw err;
			}

			message.error("This email already exists with another provider.");
			throw err;
		}

		if (err?.code === "auth/credential-already-in-use") {
			const pendingCredential = GithubAuthProvider.credentialFromError(err);
			const accessToken = (pendingCredential as any)?.accessToken;

			if (accessToken) {
				await syncGithubStateFromAccessToken(accessToken);
			}

			if (auth.currentUser) {
				const response = await buildClientAuthResponse({ user: auth.currentUser });
				message.success("GitHub token connected to current session");
				return response;
			}

			message.error("This GitHub credential is already in use by another account.");
			throw err;
		} else {
			message.error("GitHub login error");
		}

		throw err;
	}
};

 
// ?g?r istifad?çi m?lumatlarini oxumaq üçün köm?kçi funksiya yazmaq ist?yirsinizs?:
export const getAuthenticatedUser = async (uid: string) => {
    return getUserData(uid);
};

export const seedSystemAdmin = async () => {
	const seededEmail = normalizeEmail(SYSTEM_ADMIN_EMAIL);
	if (!seededEmail) {
		return null;
	}

	try {
		const adminRef = doc(db, "system_admins", seededEmail);
		const adminSnapshot = await getDoc(adminRef);

		if (!adminSnapshot.exists()) {
			await setDoc(
				adminRef,
				{
					email: seededEmail,
					role: "system_admin",
					status: "active",
					source: "env",
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				},
				{ merge: true }
			);
		}

		return { email: seededEmail };
	} catch (error) {
		console.warn("Failed to seed system admin from env:", error);
		return null;
	}
};

const ensureSystemAdminDocument = async (firebaseUser: any, email?: string | null) => {
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) {
		return null;
	}

	try {
		await setDoc(
			doc(db, "system_admins", normalizedEmail),
			{
				email: normalizedEmail,
				role: "system_admin",
				status: "active",
				source: normalizedEmail === normalizeEmail(SYSTEM_ADMIN_EMAIL) ? "env" : "firestore",
				uid: firebaseUser?.uid || "",
				displayName:
					firebaseUser?.displayName ||
					firebaseUser?.email?.split("@")[0] ||
					"",
				photoURL: firebaseUser?.photoURL || "",
				providerId: firebaseUser?.providerData?.[0]?.providerId || "",
				emailVerified: Boolean(firebaseUser?.emailVerified),
				updatedAt: serverTimestamp(),
				createdAt: serverTimestamp(),
			},
			{ merge: true }
		);

		return { email: normalizedEmail };
	} catch (error) {
		console.warn("Failed to ensure system admin document:", error);
		return null;
	}
};

export const ensureSystemAdminUserDocument = async (firebaseUser: any, email?: string | null) => {
	const normalizedEmail = normalizeEmail(email || firebaseUser?.email);
	if (!firebaseUser?.uid || !normalizedEmail) {
		return null;
	}

	try {
		await setDoc(
			doc(db, "users", firebaseUser.uid),
			{
				uid: firebaseUser.uid,
				email: normalizedEmail,
				displayName:
					firebaseUser?.displayName ||
					normalizedEmail.split("@")[0] ||
					"",
				photoURL: firebaseUser?.photoURL || "",
				providerId: firebaseUser?.providerData?.[0]?.providerId || "",
				emailVerified: Boolean(firebaseUser?.emailVerified),
				role: "system_admin",
				isSystemAdmin: true,
				updatedAt: serverTimestamp(),
				createdAt: serverTimestamp(),
			},
			{ merge: true }
		);

		return { uid: firebaseUser.uid, email: normalizedEmail };
	} catch (error) {
		console.warn("Failed to ensure system admin user document:", error);
		return null;
	}
};

export const checkIsSystemAdmin = async (email?: string | null) => {
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) {
		return false;
	}

	if (SYSTEM_ADMIN_EMAIL && normalizedEmail === normalizeEmail(SYSTEM_ADMIN_EMAIL)) {
		await seedSystemAdmin();
		return true;
	}

	try {
		const adminSnapshot = await getDoc(doc(db, "system_admins", normalizedEmail));
		return adminSnapshot.exists();
	} catch (error) {
		console.warn("Failed to check system admin role:", error);
		return false;
	}
};

export const buildAuthenticatedUserProfile = async (firebaseUser: any) => {
	if (!firebaseUser) {
		return null;
	}

	const firestoreUser = await getUserData(firebaseUser.uid);
	const email = firebaseUser.email || firestoreUser?.email || "";
	const isSystemAdmin = await checkIsSystemAdmin(email);
	const providerId = firebaseUser.providerData?.[0]?.providerId || firestoreUser?.providerId || "";

	if (isSystemAdmin) {
		await ensureSystemAdminDocument(firebaseUser, email);
	}

	return {
		...(firestoreUser || {}),
		uid: firebaseUser.uid,
		email,
		displayName:
			firestoreUser?.displayName ||
			firebaseUser.displayName ||
			firebaseUser.email?.split("@")[0] ||
			"",
		photoURL: firestoreUser?.photoURL || firebaseUser.photoURL || "",
		emailVerified: Boolean(firebaseUser.emailVerified),
		providerId,
		isSystemAdmin,
		role: isSystemAdmin ? "system_admin" : firestoreUser?.role || "user",
		systemRoles: isSystemAdmin ? ["system_admin"] : Array.isArray(firestoreUser?.systemRoles) ? firestoreUser.systemRoles : [],
	};
};

// Bütün lazimi obyektl?ri v? funksiyalari export edirik
export {
    app,
    auth,
    db,
    mailDb,
    loginWithGoogle,
    loginWithGitHub,
    storage,
    langDp,
    examDb
};
