export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Dating App</h1>
      <div className="space-x-4">
        <a className="underline" href="/signup">Sign up</a>
        <a className="underline" href="/signin">Sign in</a>
        <a className="underline" href="/onboarding">Onboarding</a>
        <a className="underline" href="/discover">Discover</a>
        <a className="underline" href="/matches">Matches</a>
      </div>
    </main>
  );
}
