"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { gql, useMutation } from "@apollo/client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`;

const RESEND_EMAIL = gql`
  mutation ResendVerificationEmail {
    resendVerificationEmail
  }
`;

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error" | "resent">(token ? "verifying" : "idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [verifyEmail] = useMutation(VERIFY_EMAIL);
  const [resendEmail, { loading: resendLoading }] = useMutation(RESEND_EMAIL);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setStatus("verifying");
      try {
        const { data } = await verifyEmail({ variables: { token } });
        if (data?.verifyEmail) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg("The verification link is invalid or has expired.");
        }
      } catch (e) {
        setStatus("error");
        setErrorMsg("We couldn't verify your email. The link may have expired.");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async () => {
    try {
      const { data } = await resendEmail();
      if (data?.resendVerificationEmail) {
        setStatus("resent");
      } else {
        setStatus("error");
        setErrorMsg("We couldn't resend the verification email. Try again later.");
      }
    } catch (e) {
      setStatus("error");
      setErrorMsg("We couldn't resend the verification email. Try again later.");
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-6 text-center space-y-4">
        {status === "verifying" && (
          <>
            <h1 className="text-xl font-semibold">Verifying your email...</h1>
            <p>Please wait while we confirm your email address.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-xl font-semibold text-green-600">Email verified!</h1>
            <p>Your email is confirmed. You can now continue using the app.</p>
            <Link href="/"><Button>Go to Home</Button></Link>
          </>
        )}

        {(status === "idle" || status === "error" || status === "resent") && (
          <>
            <h1 className="text-xl font-semibold">Verify your email</h1>
            {status === "idle" && (
              <p>We sent a verification link to your email. Please check your inbox.</p>
            )}
            {status === "error" && (
              <p className="text-red-600">{errorMsg}</p>
            )}
            {status === "resent" && (
              <p className="text-green-600">A new verification email has been sent. Please check your inbox.</p>
            )}
            <div className="pt-2">
              <Button onClick={handleResend} disabled={resendLoading}>
                {resendLoading ? "Resending..." : "Resend verification email"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

