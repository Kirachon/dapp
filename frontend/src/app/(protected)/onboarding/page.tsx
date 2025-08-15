"use client";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useState, useEffect } from "react";

const ME = gql`query { me { id email } }`;
const MY_PROFILE = gql`query { myProfile { userId name age gender bio interests photos visibility } }`;
const MY_PREFS = gql`query { myPreferences { userId minAge maxAge distanceKm showMe } }`;
const UPSERT_PROFILE = gql`
  mutation UpsertProfile($input: ProfileInput!) { upsertMyProfile(input: $input) { userId name age gender bio interests photos visibility } }
`;
const UPSERT_PREFS = gql`
  mutation UpsertPreferences($input: PreferencesInput!) { upsertMyPreferences(input: $input) { userId minAge maxAge distanceKm showMe } }
`;

export default function OnboardingPage() {
  const { data: meData } = useQuery(ME);
  const { data: profileData } = useQuery(MY_PROFILE);
  const { data: prefsData } = useQuery(MY_PREFS);
  const [upsertProfile] = useMutation(UPSERT_PROFILE);
  const [upsertPrefs] = useMutation(UPSERT_PREFS);

  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(18);
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(55);
  const [distanceKm, setDistanceKm] = useState(50);
  const [showMe, setShowMe] = useState("");

  useEffect(() => {
    const p = profileData?.myProfile;
    if (p) {
      setName(p.name ?? "");
      setAge(p.age ?? 18);
      setGender(p.gender ?? "");
      setBio(p.bio ?? "");
    }
    const pr = prefsData?.myPreferences;
    if (pr) {
      setMinAge(pr.minAge ?? 18);
      setMaxAge(pr.maxAge ?? 55);
      setDistanceKm(pr.distanceKm ?? 50);
      setShowMe(pr.showMe ?? "");
    }
  }, [profileData, prefsData]);

  return (
    <div className="mx-auto max-w-xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Onboarding</h1>
      {!meData?.me && <p>Please sign in to continue.</p>}

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Profile</h2>
        <div className="grid grid-cols-1 gap-3">
          <input className="border rounded p-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="border rounded p-2" placeholder="Age" type="number" value={age} onChange={(e) => setAge(parseInt(e.target.value || "18"))} />
          <input className="border rounded p-2" placeholder="Gender" value={gender} onChange={(e) => setGender(e.target.value)} />
          <textarea className="border rounded p-2" placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          <button
            className="bg-black text-white rounded p-2"
            onClick={async () => {
              await upsertProfile({ variables: { input: { name, age, gender, bio } } });
            }}
          >Save Profile</button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Preferences</h2>
        <div className="grid grid-cols-1 gap-3">
          <input className="border rounded p-2" placeholder="Min Age" type="number" value={minAge} onChange={(e) => setMinAge(parseInt(e.target.value || "18"))} />
          <input className="border rounded p-2" placeholder="Max Age" type="number" value={maxAge} onChange={(e) => setMaxAge(parseInt(e.target.value || "55"))} />
          <input className="border rounded p-2" placeholder="Distance (km)" type="number" value={distanceKm} onChange={(e) => setDistanceKm(parseInt(e.target.value || "50"))} />
          <input className="border rounded p-2" placeholder="Show Me (gender)" value={showMe} onChange={(e) => setShowMe(e.target.value)} />
          <button
            className="bg-black text-white rounded p-2"
            onClick={async () => {
              await upsertPrefs({ variables: { input: { minAge, maxAge, distanceKm, showMe } } });
              window.location.href = "/discover";
            }}
          >Save Preferences</button>
        </div>
      </section>
    </div>
  );
}

