import { prisma } from "@/lib/prisma";

type ValidateSessionParams = {
  userId: string;
  sessionId: string;
  invalidatedAt: Date | string | null;
};

export async function isAuthSessionValid({
  userId,
  sessionId,
  invalidatedAt,
}: ValidateSessionParams): Promise<boolean> {
  // Los identificadores de Supabase deben ser UUID válidos.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(userId) || !uuidPattern.test(sessionId)) {
    return false;
  }

  let sessions: Array<{ id: string }>;

  if (invalidatedAt) {
    const invalidationDate = new Date(invalidatedAt);

    if (Number.isNaN(invalidationDate.getTime())) {
      return false;
    }

    sessions = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM auth.sessions
      WHERE id = ${sessionId}::uuid
        AND user_id = ${userId}::uuid
        AND created_at > ${invalidationDate}::timestamptz
      LIMIT 1
    `;
  } else {
    sessions = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM auth.sessions
      WHERE id = ${sessionId}::uuid
        AND user_id = ${userId}::uuid
      LIMIT 1
    `;
  }

  return sessions.length > 0;
}
