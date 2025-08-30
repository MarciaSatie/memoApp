"use client"; // "use client" enables React hooks in this file (needed for Firebase Auth in the browser).

import { createContext, useContext, useEffect, useState } from "react";
// onAuthStateChanged: Firebase listener that fires when the user signs in/out or refreshes.
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";


// Create a Context to hold auth state; default is { user: null, loading: true } if no Provider wraps you.
const AuthContext = createContext({ user: null, loading: true });

// AuthProvider: shares Firebase Auth state (user/loading) with the whole app via React Context.
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { const unsub = onAuthStateChanged(auth, (u) => {setUser(u); setLoading(false); }); return () => unsub(); }, []);
    
    return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
