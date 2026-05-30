export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
}

const users = new Map<string, UserProfile>();
const sessions = new Map<string, string>(); // token -> userId

export function createOrUpdateUser(profile: UserProfile): string {
  users.set(profile.id, profile);
  const token = `s_${crypto.randomUUID().replace(/-/g, "")}`;
  sessions.set(token, profile.id);
  return token;
}

export function getUserByToken(token: string): UserProfile | null {
  const userId = sessions.get(token);
  if (!userId) return null;
  return users.get(userId) ?? null;
}

export function removeSession(token: string): void {
  sessions.delete(token);
}
