"use client";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";

const FEED = gql`query Feed { discoveryFeed { userId name age gender bio } }`;
const SWIPE = gql`mutation Swipe($targetUserId: ID!, $direction: SwipeDirection!) { swipe(targetUserId: $targetUserId, direction: $direction) { ok matched matchId } }`;

export default function DiscoverPage() {
  const { data, refetch } = useQuery(FEED);
  const [swipe] = useMutation(SWIPE);
  const [idx, setIdx] = useState(0);
  const cards = data?.discoveryFeed ?? [];
  const current = cards[idx];

  const act = async (direction: "LEFT" | "RIGHT" | "SUPER") => {
    if (!current) return;
    await swipe({ variables: { targetUserId: current.userId, direction } });
    setIdx((i) => i + 1);
    refetch();
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Discover</h1>
      {current ? (
        <div className="border rounded p-4 space-y-2">
          <div className="font-medium">{current.name}, {current.age}</div>
          <div className="text-sm text-gray-600">{current.bio}</div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 border rounded p-2" onClick={() => act("LEFT")}>Pass</button>
            <button className="flex-1 bg-black text-white rounded p-2" onClick={() => act("RIGHT")}>Like</button>
            <button className="flex-1 bg-purple-600 text-white rounded p-2" onClick={() => act("SUPER")}>Super</button>
          </div>
        </div>
      ) : (
        <p>No more profiles. Try again later.</p>
      )}
    </div>
  );
}

