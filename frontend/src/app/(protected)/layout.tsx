"use client";
import { ReactNode, useEffect } from "react";
import { useMe } from "@/lib/useMe";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { me, loading } = useMe();

  useEffect(() => {
    if (!loading && !me) {
      window.location.href = "/signin";
    }
  }, [me, loading]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!me) return null;

  return (
    <div>
      <nav className="flex gap-4 p-4 border-b">
        <a className="underline" href="/discover">Discover</a>
        <a className="underline" href="/matches">Matches</a>
        <a className="underline" href="/onboarding">Profile</a>
      </nav>
      {children}
    </div>
  );
}

