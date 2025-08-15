"use client";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useParams } from "next/navigation";
import { useState } from "react";

const CONVOS = gql`query MyConversations { myConversations { id matchId lastMessageAt unreadCount otherUser { userId name } } }`;
const SEND = gql`mutation Send($conversationId: ID!, $content: String) { sendMessage(conversationId: $conversationId, content: $content) { id createdAt } }`;
const READ = gql`mutation Read($conversationId: ID!) { markConversationRead(conversationId: $conversationId) }`;

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const { data, refetch } = useQuery(CONVOS);
  const [send] = useMutation(SEND);
  const [read] = useMutation(READ);
  const [text, setText] = useState("");

  const convo = (data?.myConversations ?? []).find((c: any) => c.id === params.id);

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Chat</h1>
      {convo ? (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">Chatting with {convo.otherUser?.name}</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text) return;
              await send({ variables: { conversationId: convo.id, content: text } });
              setText("");
              await read({ variables: { conversationId: convo.id } });
              refetch();
            }}
            className="flex gap-2"
          >
            <input className="flex-1 border rounded p-2" placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="bg-black text-white rounded px-4">Send</button>
          </form>
        </div>
      ) : (
        <p>Conversation not found.</p>
      )}
    </div>
  );
}

