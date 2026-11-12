import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// undefined = still loading, null = signed out, object = signed in
export function useAuthSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
