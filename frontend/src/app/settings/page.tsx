"use client";

import React, { useEffect, useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button } from "@/components/ui/Button";

const GET_MY_PROFILE = gql`
  query GetMyProfileForSettings { myProfile { userId name lifestyle } }
`;
const UPSERT_PROFILE = gql`
  mutation UpsertProfileLifestyle($input: ProfileInput!) { upsertMyProfile(input: $input) { userId lifestyle } }
`;
const CHANGE_PASSWORD = gql`
  mutation ChangeMyPassword($current: String!, $next: String!) { changeMyPassword(currentPassword: $current, newPassword: $next) }
`;
const CHANGE_EMAIL = gql`
  mutation ChangeMyEmail($email: String!) { changeMyEmail(newEmail: $email) }
`;
const DELETE_ACCOUNT = gql`
  mutation DeleteMyAccount { deleteMyAccount }
`;

export default function SettingsPage() {
  const { data } = useQuery(GET_MY_PROFILE, { fetchPolicy: "cache-and-network" });
  const [upsertProfile] = useMutation(UPSERT_PROFILE);
  const [changePassword, { loading: changingPw }] = useMutation(CHANGE_PASSWORD);
  const [changeEmail, { loading: changingEmail }] = useMutation(CHANGE_EMAIL);
  const [deleteAccount, { loading: deleting }] = useMutation(DELETE_ACCOUNT);

  const lifestyleObj = useMemo(() => {
    try { return data?.myProfile?.lifestyle ? JSON.parse(data.myProfile.lifestyle) : {}; } catch { return {}; }
  }, [data?.myProfile?.lifestyle]);

  const [theme, setTheme] = useState<string>(lifestyleObj?.appearance?.theme || "light");
  const [emailNotifs, setEmailNotifs] = useState<boolean>(!!lifestyleObj?.notifications?.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const savePrefs = async () => {
    setMsg("");
    const merged = {
      ...(lifestyleObj || {}),
      appearance: { ...(lifestyleObj?.appearance || {}), theme },
      notifications: { ...(lifestyleObj?.notifications || {}), email: emailNotifs }
    };
    try {
      await upsertProfile({ variables: { input: { name: data?.myProfile?.name || "", age: 18, photos: [], visibility: "PUBLIC", lifestyle: JSON.stringify(merged) } } });
      setMsg("Preferences saved");
    } catch (e:any) { setMsg(e?.message || "Failed to save"); }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    try {
      const ok = (await changePassword({ variables: { current: currentPassword, next: newPassword } })).data?.changeMyPassword;
      setMsg(ok ? "Password updated" : "Failed to update password");
      setCurrentPassword(""); setNewPassword("");
    } catch (e:any) { setMsg(e?.message || "Failed to update password"); }
  };

  const onChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    try {
      const ok = (await changeEmail({ variables: { email: newEmail } })).data?.changeMyEmail;
      setMsg(ok ? "Email updated. Please verify via link sent to your new email." : "Failed to update email");
      setNewEmail("");
    } catch (e:any) { setMsg(e?.message || "Failed to update email"); }
  };

  const onDelete = async () => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setMsg("");
    try { const ok = (await deleteAccount()).data?.deleteMyAccount; setMsg(ok?"Account deleted":"Delete failed"); } catch (e:any) { setMsg(e?.message||"Delete failed"); }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4">
      <div className="max-w-xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {msg && <div className="p-3 border rounded text-sm">{msg}</div>}

        <section className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Appearance</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="radio" name="theme" checked={theme==="light"} onChange={()=>setTheme("light")} /> Light
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="theme" checked={theme==="dark"} onChange={()=>setTheme("dark")} /> Dark
            </label>
          </div>
          <Button onClick={savePrefs}>Save</Button>
        </section>

        <section className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Notifications</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={emailNotifs} onChange={(e)=>setEmailNotifs(e.target.checked)} /> Email notifications
          </label>
          <Button onClick={savePrefs}>Save</Button>
        </section>

        <section className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Change Password</h2>
          <form onSubmit={onChangePassword} className="space-y-2">
            <input type="password" placeholder="Current password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} className="w-full border rounded px-3 py-2" required />
            <input type="password" placeholder="New password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="w-full border rounded px-3 py-2" required minLength={8} />
            <Button type="submit" loading={changingPw}>Update Password</Button>
          </form>
        </section>

        <section className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Change Email</h2>
          <form onSubmit={onChangeEmail} className="space-y-2">
            <input type="email" placeholder="New email" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
            <Button type="submit" loading={changingEmail}>Update Email</Button>
          </form>
        </section>

        <section className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
          <Button variant="outline" onClick={onDelete} loading={deleting}>Delete Account</Button>
        </section>
      </div>
    </div>
  );
}

