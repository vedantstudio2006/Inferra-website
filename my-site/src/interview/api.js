import { supabase } from "../lib/supabase";

// Calls an Edge Function and returns its JSON, or throws an Error with the server's message.
export async function callFunction(name, { body, method = "POST" } = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body, method });

  if (error) {
    let message = "Something went wrong. Please try again.";
    if (error.context instanceof Response) {
      const details = await error.context.clone().json().catch(() => null);
      if (details?.error) message = details.error;
    } else if (error.message) {
      message = error.message;
    }
    throw new Error(message);
  }
  return data;
}
