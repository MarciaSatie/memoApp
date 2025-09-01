"use client";
import { useState } from "react";
import { auth } from "@/app/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { updateProfile } from "firebase/auth";

import { useAuth } from "@/app/provider/AuthProvider";

  async function handleGoogleSignIn() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google sign-in error:", error);
      alert(error.message);
    }
  }


export default function AuthWidget() {
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState("signin");
    const [loading, setLoading] = useState(false);
    //getting loading  object and user object from useAuth hook and rename it to authLoading to avoid conflict with loading state defined above
    const { user, loading: authLoading } = useAuth();


    async function handleSubmit(e) {
        e.preventDefault(); // stop page reload on form submit
        setLoading(true);   // disable form while processing

        try {
            if (mode === "signup") {
            // 1. Create a new user with email + password
            const cred = await createUserWithEmailAndPassword(auth, email, password);

            // 2. Immediately update their profile with the chosen displayName
            await updateProfile(cred.user, { displayName });

            } else {
            // Sign in existing user
            await signInWithEmailAndPassword(auth, email, password);
            }

            // Clear the form fields after success
            setEmail("");
            setPassword("");
            setDisplayName("");
        } catch (error) {
            console.error("Authentication error:", error);
           alert(`Auth error: ${error.code}`);

        } finally {
            setLoading(false); // re-enable form
        }
    }

    if (authLoading) return <p>Checking authentication...</p>;
    if (user) return (
        <div className="absolute top-20 right-10 flex items-center gap-2 p-2 border rounded border-bd
                        max-sm:static max-sm:w-full max-sm:justify-end">
            {/* Hide text on small screens */}
            <p className="text-sm text-bd hidden sm:block">
            Signed in as {user.displayName || user.email}
            </p>
            <button
            onClick={() => signOut(auth)}
            className="bg-red-500 text-white rounded px-3 py-1 text-sm"
            >
            Sign Out
            </button>
        </div>
    );


    return (
        <div className="max-w-sm mx-auto mt-8 p-4 border rounded">
            <form onSubmit={handleSubmit}>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Name" className="border rounded p-2 w-full mb-2" required />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="border rounded p-2 w-full mb-2" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="border rounded p-2 w-full mb-2" required />
                <button type="submit" className="bg-blue-500 text-white rounded p-2 w-full" disabled={loading}>
                    {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Sign Up"}
                </button>
                <p className="mt-10 text-center">
                    {mode === "signin" ? (
                        <>
                            Don't have an account? <button type="button" className="text-blue-500" onClick={() => setMode("signup")}>Sign Up</button>
                        </>
                    ) : (
                        <>
                            Already have an account? <button type="button" className="text-blue-500" onClick={() => setMode("signin")}>Sign In</button>
                        </>
                    )}  
                </p>

                <button type="button" onClick={handleGoogleSignIn} className="bg-red-500 text-white rounded p-2 w-full mt-10">
                    Sign in with Google
                </button>

            </form>

        </div>

    )
}
