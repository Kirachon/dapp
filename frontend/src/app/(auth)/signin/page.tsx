"use client";
import { useState } from "react";
import { useMutation, gql } from "@apollo/client";

const SIGN_IN = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) { ok error user { id email } }
  }
`;

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mutate, { loading, error, data }] = useMutation(SIGN_IN);

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await mutate({ variables: { email, password } });
          window.location.href = "/onboarding";
        }}
        className="space-y-4"
      >
        <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-black text-white rounded p-2" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && <p className="text-red-600 text-sm">{error.message}</p>}
        {data?.signIn?.error && <p className="text-red-600 text-sm">{data.signIn.error}</p>}
      </form>
      <p className="mt-4 text-sm">
        No account? <a href="/signup" className="underline">Sign up</a>
      </p>
    </div>
  );
}

