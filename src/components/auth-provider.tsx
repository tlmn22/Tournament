"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

const AuthContext = createContext<{ user: User | null; loading: boolean; error: string }>({
  user: null, loading: true, error: "",
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ user: User | null; loading: boolean; error: string }>({
    user: null, loading: true, error: "",
  });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = getSupabase();
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setState({ user: session?.user ?? null, loading: false, error: "" });
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void supabase.auth.initialize().then(({ error }) => {
        if (error && active) setState({ user: null, loading: false, error: "Баталгаажуулах холбоос хүчингүй эсвэл хугацаа нь дууссан байна. Дахин нэвтрэх эсвэл шинэ холбоос аваарай." });
      }).catch(() => {
        if (active) setState({ user: null, loading: false, error: "Холболт амжилтгүй боллоо. Хуудсаа дахин ачаалаарай." });
      });
    } catch {
      // Initialization failure is asynchronous to avoid a synchronous effect update.
      queueMicrotask(() => {
        if (active) setState({ user: null, loading: false, error: "Нэвтрэх үйлчилгээний тохиргоо дутуу байна." });
      });
    }
    return () => { active = false; unsubscribe?.(); };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
