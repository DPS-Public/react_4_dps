export const utilResolveActingUser = (users: any[], currentUser: any) => {
    let storedUserData: any = {};

    try {
        storedUserData = JSON.parse(localStorage.getItem("userData") || "{}");
    } catch (error) {
        console.error("Error parsing userData from localStorage:", error);
    }

    const normalizedUid = String(currentUser?.uid || storedUserData?.uid || "").trim();
    const normalizedEmail = String(currentUser?.email || storedUserData?.email || "")
        .toLowerCase()
        .trim();

    const matchedProjectUser = (users || []).find((user: any) => {
        const userUid = String(user?.uid || "").trim();
        const userEmail = String(user?.email || "").toLowerCase().trim();

        return (normalizedUid && userUid === normalizedUid) || (normalizedEmail && userEmail === normalizedEmail);
    });

    const name =
        matchedProjectUser?.displayName ||
        storedUserData?.displayName ||
        storedUserData?.name ||
        currentUser?.displayName ||
        currentUser?.email ||
        storedUserData?.email ||
        "Unknown";

    return {
        uid: normalizedUid || matchedProjectUser?.uid || "",
        email: normalizedEmail || matchedProjectUser?.email || "",
        displayName: name,
        photoURL: matchedProjectUser?.photoURL || storedUserData?.photoURL || null,
    };
};
