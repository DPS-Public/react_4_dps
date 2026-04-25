export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  providerId: string | null;
  creationTime: string;
  lastSignInTime: string;
  githubId?: string | null;
  githubIds?: string[];
  hasGitHub?: boolean;
}

export interface ProjectPermission {
  id: string;
  user_list: Array<{
    uid: string;
    created_at: Date;
    created_by: string;
    permission_type: string;
  }>;
}
