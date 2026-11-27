
import ChatApp from "@/components/chat/chat-app";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export default async function ChatPage() {
  const { profile } = await requireAuthenticatedUser();

  return <ChatApp fullName={profile.full_name} />;
}
