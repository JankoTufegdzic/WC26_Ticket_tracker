"use strict";

import { createClient } from "@supabase/supabase-js";
import { elements } from "./dom.js";
import { getAppUrl, ticketKey } from "./utils.js";

export const state = {
  supabaseClient: null,
  currentUser: null,
  ownedTickets: new Set(),
  saveQueue: Promise.resolve(),
};

export function setupSupabase() {
  const config = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
  const configured =
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes("YOUR_") &&
    !config.supabaseAnonKey.includes("YOUR_");

  if (configured) {
    state.supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
}

export async function signIn() {
  if (!state.supabaseClient) return;
  elements.authMessage.textContent = "Signing in...";
  const { error } = await state.supabaseClient.auth.signInWithPassword({
    email: elements.emailInput.value.trim(),
    password: elements.passwordInput.value,
  });
  if (error) {
    elements.authMessage.textContent = error.message;
    return;
  }
  elements.authDialog.close();
}

export async function signUp() {
  if (!state.supabaseClient) return;
  elements.authMessage.textContent = "Creating account...";
  const { error } = await state.supabaseClient.auth.signUp({
    email: elements.emailInput.value.trim(),
    password: elements.passwordInput.value,
    options: {
      emailRedirectTo: getAppUrl(),
    },
  });
  elements.authMessage.textContent = error ? error.message : "Account created. Check your email if confirmation is enabled.";
}

export async function signOut() {
  if (state.supabaseClient) {
    await state.supabaseClient.auth.signOut();
  }
}

export async function hydrateTickets() {
  if (!state.supabaseClient || !state.currentUser) {
    state.ownedTickets = new Set();
    updateAccountUi();
    return;
  }

  elements.syncStatus.textContent = "Syncing...";
  const { data, error } = await state.supabaseClient
    .from("ticket_collection")
    .select("team_code,ticket_no")
    .eq("user_id", state.currentUser.id);

  if (error) {
    elements.syncStatus.textContent = "Sync failed";
    console.error(error);
    return;
  }

  state.ownedTickets = new Set(data.map((row) => ticketKey(row.team_code, row.ticket_no)));
  updateAccountUi();
}

export function updateAccountUi() {
  const configured = Boolean(state.supabaseClient);
  elements.authButton.classList.toggle("hidden", Boolean(state.currentUser));
  elements.signOutButton.classList.toggle("hidden", !state.currentUser);

  if (state.currentUser) {
    elements.syncStatus.textContent = state.currentUser.email ?? "Signed in";
  } else if (configured) {
    elements.syncStatus.textContent = "Sign in required";
  } else {
    elements.syncStatus.textContent = "Supabase not configured";
  }
}

export async function saveTicket(teamCode, ticketNo, isOwned) {
  if (!state.supabaseClient || !state.currentUser) {
    return;
  }

  elements.syncStatus.textContent = "Saving...";
  const query = isOwned
    ? state.supabaseClient.from("ticket_collection").upsert({
        user_id: state.currentUser.id,
        team_code: teamCode,
        ticket_no: ticketNo,
      })
    : state.supabaseClient
        .from("ticket_collection")
        .delete()
        .eq("user_id", state.currentUser.id)
        .eq("team_code", teamCode)
        .eq("ticket_no", ticketNo);

  const { error } = await query;
  elements.syncStatus.textContent = error ? "Save failed" : state.currentUser.email ?? "Signed in";
  if (error) console.error(error);
}
