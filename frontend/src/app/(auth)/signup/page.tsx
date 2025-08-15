"use client";
import { useState } from "react";
import { useMutation, gql } from "@apollo/client";

const SIGN_UP = gql`
  mutation SignUp($email: String!, $password: String!) {
    signUp(email: $email, password: $password) { ok error user { id email } }
  }
`;

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mutate, { loading, error, data }] = useMutation(SIGN_UP);

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign up</h1>
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
          {loading ? "Signing up..." : "Sign up"}
        </button>
        {error && <p className="text-red-600 text-sm">{error.message}</p>}
        {data?.signUp?.error && <p className="text-red-600 text-sm">{data.signUp.error}</p>}
      </form>
      <p className="mt-4 text-sm">
        Have an account? <a href="/signin" className="underline">Sign in</a>
      </p>
    </div>
  );
}

