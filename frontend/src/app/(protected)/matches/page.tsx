"use client";
import { useQuery, gql } from "@apollo/client";

const MATCHES = gql`query Matches { myMatches { id status createdAt otherUser { userId name age } } }`;

export default function MatchesPage() {
  const { data } = useQuery(MATCHES);
  const items = data?.myMatches ?? [];
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Matches</h1>
      <ul className="space-y-3">
        {items.map((m: { id: string; createdAt: string; otherUser?: { name?: string } }) => (
          <li key={m.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.otherUser?.name}</div>
              <div className="text-sm text-gray-600">{new Date(m.createdAt).toLocaleDateString()}</div>
            </div>
            <a className="underline" href={`/chat/${m.id}`}>Open Chat</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

