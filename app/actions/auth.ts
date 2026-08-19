"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearActiveOrgCookie } from "@/lib/active-org";
import { setIntendedPlan } from "@/lib/intended-plan";

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  clearActiveOrgCookie();
  redirect("/login");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  setIntendedPlan(String(formData.get("plan") ?? ""));

  const agreed = formData.get("agree") === "1" || formData.get("agree") === "on";

  if (!fullName || !email || !password) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("Name, email, and password are required.")
    );
  }

  if (!agreed) {
    redirect(
      "/signup?error=" +
        encodeURIComponent(
          "You must agree to the Terms of Service and Privacy Policy."
        )
    );
  }

  const supabase = createClient();
  let createErrorMessage: string | null = null;
  let alreadyRegistered = false;

  try {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    const admin = createServiceClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      alreadyRegistered =
        createError.message.toLowerCase().includes("already") ||
        createError.message.toLowerCase().includes("registered");
      createErrorMessage = createError.message;
    }
  } catch (err) {
    createErrorMessage =
      err instanceof Error ? err.message : "Could not create the account.";
  }

  if (createErrorMessage) {
    redirect(
      alreadyRegistered
        ? `/login?error=${encodeURIComponent("That email is already registered. Log in instead.")}`
        : `/signup?error=${encodeURIComponent(createErrorMessage)}`
    );
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    redirect(`/signup?error=${encodeURIComponent(signInError.message)}`);
  }

  redirect("/dashboard");
}

function accountRedirect(message?: string): never {
  redirect(
    message
      ? `/account?error=${encodeURIComponent(message)}`
      : "/account?saved=1"
  );
}

export async function updateAccountProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!fullName || !email) {
    accountRedirect("Name and email are required.");
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ full_name: fullName, email })
    .eq("id", user.id);
  if (profileError) accountRedirect(profileError.message);

  const { error: authError } = await supabase.auth.updateUser({
    email,
    data: { full_name: fullName },
  });
  if (authError) accountRedirect(authError.message);

  revalidatePath("/account");
  accountRedirect();
}

export async function updateAccountPassword(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    accountRedirect("Password must be at least 8 characters.");
  }
  if (password !== confirm) {
    accountRedirect("Passwords do not match.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) accountRedirect(error.message);

  revalidatePath("/account");
  accountRedirect();
}
