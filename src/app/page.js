import AuthWidget from "@/components/auth/AuthWidget";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold">MemoMingle</h1>
      <p className="mt-2 text-gray-600">Your study cards app starts here.</p>
      <AuthWidget />
    </main>
  );
}
