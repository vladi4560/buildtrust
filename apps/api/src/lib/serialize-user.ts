import type { User } from "@prisma/client";

export function serializeUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export type SafeUser = ReturnType<typeof serializeUser>;
