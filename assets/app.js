"use strict";

import { state } from "./modules/auth.js";
import {
  hydrateTickets,
  saveTicket,
  setupSupabase,
  signIn,
  signOut,
  signUp,
  updateAccountUi,
} from "./modules/auth.js";
import { countOwned, getRemainingTickets, getTotals } from "./modules/collection.js";
import { allTeams, teamByCode } from "./modules/data.js";
import { elements } from "./modules/dom.js";
import { getRoute, goToAdjacentTeam, goToTeam } from "./modules/router.js";
import {
  renderHomeHtml,
  renderLockedHtml,
  renderPrintReportHtml,
  renderTeamHtml,
} from "./modules/render.js";
import { ticketKey } from "./modules/utils.js";

init();

async function init() {
  setupSupabase();
  bindEvents();

  if (state.supabaseClient) {
    const { data } = await state.supabaseClient.auth.getSession();
    state.currentUser = data.session?.user ?? null;
    state.supabaseClient.auth.onAuthStateChange((_event, session) => {
      state.currentUser = session?.user ?? null;
      hydrateTickets().then(render);
    });
  }

  await hydrateTickets();
  render();
}

function bindEvents() {
  window.addEventListener("hashchange", render);

  elements.authButton.addEventListener("click", openAuthDialog);
  elements.closeAuth.addEventListener("click", () => elements.authDialog.close());

  elements.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const signedIn = await signIn();
    if (signedIn) {
      await hydrateTickets();
      render();
    }
  });

  elements.signUpSubmit.addEventListener("click", async () => {
    await signUp();
  });

  elements.signOutButton.addEventListener("click", async () => {
    await signOut();
    await hydrateTickets();
    render();
  });

  elements.app.addEventListener("click", async (event) => {
    const openAuth = event.target.closest("[data-open-auth]");
    if (openAuth) {
      openAuthDialog();
      return;
    }

    const navButton = event.target.closest("[data-team-nav]");
    if (navButton) {
      goToTeam(navButton.dataset.teamNav);
      return;
    }

    const printButton = event.target.closest("[data-print-remaining]");
    if (printButton) {
      printRemainingTickets();
      return;
    }

    const selectAllButton = event.target.closest("[data-select-all]");
    if (selectAllButton) {
      await markAllOwned(selectAllButton.dataset.selectAll);
      return;
    }

    const ticketButton = event.target.closest("[data-ticket]");
    if (!ticketButton) return;
    await toggleTicket(ticketButton.dataset.team, ticketButton.dataset.ticket);
  });

  window.addEventListener("keydown", (event) => {
    const route = getRoute();
    if (route.name !== "team" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToAdjacentTeam(route.code, -1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToAdjacentTeam(route.code, 1);
    }
  });
}

function openAuthDialog() {
  elements.authMessage.textContent = state.supabaseClient ? "" : "Add your Supabase credentials in .env first.";
  elements.authDialog.showModal();
  elements.emailInput.focus();
}

function render() {
  updateAccountUi();
  if (!state.supabaseClient || !state.currentUser) {
    elements.app.innerHTML = renderLockedHtml(Boolean(state.supabaseClient));
    return;
  }

  const route = getRoute();
  if (route.name === "team") {
    renderTeam(route.code);
    return;
  }

  elements.app.innerHTML = renderHomeHtml({
    totals: getTotals(),
    countOwned,
  });
}

function renderTeam(code) {
  const item = teamByCode.get(code);
  if (!item) {
    window.location.hash = "#/";
    return;
  }

  const owned = countOwned(item);
  elements.app.innerHTML = renderTeamHtml({
    item,
    owned,
    missing: item.tickets.length - owned,
    countOwned,
  });
}

async function markAllOwned(teamCode) {
  const item = teamByCode.get(teamCode);
  if (!item) return;

  for (const ticketNo of item.tickets) {
    if (!state.ownedTickets.has(ticketKey(item.code, ticketNo))) {
      await toggleTicket(item.code, ticketNo, { skipRender: true });
    }
  }
  render();
}

async function toggleTicket(teamCode, ticketNo, options = {}) {
  if (!state.supabaseClient || !state.currentUser) {
    elements.app.innerHTML = renderLockedHtml(Boolean(state.supabaseClient));
    return;
  }

  const key = ticketKey(teamCode, ticketNo);
  const nextOwned = !state.ownedTickets.has(key);

  if (nextOwned) {
    state.ownedTickets.add(key);
  } else {
    state.ownedTickets.delete(key);
  }

  if (!options.skipRender) render();

  state.saveQueue = state.saveQueue.then(() => saveTicket(teamCode, ticketNo, nextOwned));
  await state.saveQueue;
}

function printRemainingTickets() {
  const rows = allTeams
    .map((item) => ({
      label: item.code,
      numbers: getRemainingTickets(item),
    }))
    .filter((row) => row.numbers.length > 0);

  elements.printReport.innerHTML = renderPrintReportHtml(rows);

  const cleanup = () => {
    elements.printReport.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}
