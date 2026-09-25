import { cookies } from "next/headers";

export type Session = {
  userId: string;
  name: string;
  role: "MANAGER" | "STAFF";
};

const COOKIE_NAME = "session";

export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export function decodeSession(value: string): Session | null {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

export { COOKIE_NAME };
