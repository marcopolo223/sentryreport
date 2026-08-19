"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/** Refreshes the auth cookie in the browser. Edge middleware cannot load Supabase. */
export function AuthRefresh() {
  useEffect(() => {
    try {
      void createClient().auth.getUser();
    } catch {
      // Env is missing in this environment.
    }
  }, []);

  return null;
}
