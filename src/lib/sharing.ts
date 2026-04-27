import { User } from "firebase/auth";
import { UserProfile } from "@/lib/firebase";

export const FIRESTORE_IN_LIMIT = 10;

export function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function uniqueNormalizedEmails(emails: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      emails
        .map((email) => normalizeEmail(email))
        .filter((email): email is string => Boolean(email))
    )
  );
}

export function buildAccessibleUserIds(user: User | null, profiles: UserProfile[]): string[] {
  if (!user) return [];
  return Array.from(new Set([user.uid, ...profiles.map((profile) => profile.uid)].filter(Boolean))).sort();
}

export function buildSharedEmailAccessList(user: User | null, profiles: UserProfile[]): string[] {
  return uniqueNormalizedEmails([
    user?.email,
    ...profiles.flatMap((profile) => [profile.email, ...(profile.sharedWith ?? [])]),
  ]);
}

export function chunkForFirestore<T>(items: T[], chunkSize = FIRESTORE_IN_LIMIT): T[][] {
  if (items.length === 0) return [];

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}
