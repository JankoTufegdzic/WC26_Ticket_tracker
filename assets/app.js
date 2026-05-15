"use strict";

import { state } from "./modules/auth.js";
import {
  hydrateTickets,
  recoverSession,
  saveTicket,
  setupSupabase,
  signIn,
  signOut,
  signUp,
  updateAccountUi,
} from "./modules/auth.js";
import { countOwned, getRemainingTickets, getTotals } from "./modules/collection.js";
import { teamByCode, TICKET_DATA } from "./modules/data.js";
import { elements } from "./modules/dom.js";
import { getRoute, goToAdjacentTeam, goToTeam } from "./modules/router.js";
import {
  renderHomeHtml,
  renderLockedHtml,
  renderPrintReportHtml,
  renderSessionLoadingHtml,
  renderTeamHtml,
} from "./modules/render.js";
import { ticketKey } from "./modules/utils.js";

init();

let sessionRecovery = null;

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

  elements.app.addEventListener("input", (event) => {
    const searchInput = event.target.closest("[data-team-search]");
    if (!searchInput) return;

    if (searchInput.dataset.teamSearch === "navigate") {
      navigateFromSearch(searchInput.value);
      return;
    }

    filterTeamCards(searchInput.value);
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

function navigateFromSearch(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return;

  const exactMatch = TICKET_DATA.flatMap((group) => group.teams).find((item) => {
    return item.code.toLowerCase() === normalizedQuery || item.name.toLowerCase() === normalizedQuery;
  });

  if (exactMatch) {
    goToTeam(exactMatch.code);
  }
}

function filterTeamCards(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const groups = [...elements.app.querySelectorAll("[data-group-section]")];
  let visibleCount = 0;

  for (const group of groups) {
    const cards = [...group.querySelectorAll("[data-team-card]")];
    let visibleInGroup = 0;

    for (const card of cards) {
      const matches = !normalizedQuery || card.dataset.searchText.includes(normalizedQuery);
      card.classList.toggle("hidden", !matches);
      if (matches) visibleInGroup += 1;
    }

    group.classList.toggle("hidden", visibleInGroup === 0);
    visibleCount += visibleInGroup;
  }

  const emptyState = elements.app.querySelector("[data-search-empty]");
  if (emptyState) {
    emptyState.classList.toggle("hidden", visibleCount > 0);
  }
}

function openAuthDialog() {
  elements.authMessage.textContent = state.supabaseClient ? "" : "Add your Supabase credentials in .env first.";
  elements.authDialog.showModal();
  elements.emailInput.focus();
}

function render() {
  updateAccountUi();
  if (!state.supabaseClient) {
    elements.app.innerHTML = renderLockedHtml(Boolean(state.supabaseClient));
    return;
  }

  if (!state.currentUser) {
    recoverSessionBeforeLocking();
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

function recoverSessionBeforeLocking() {
  elements.app.innerHTML = renderSessionLoadingHtml();

  if (!sessionRecovery) {
    sessionRecovery = recoverSession()
      .then(async (recovered) => {
        if (recovered) {
          await hydrateTickets();
        }
      })
      .finally(() => {
        sessionRecovery = null;
        updateAccountUi();
        if (!state.currentUser) {
          elements.app.innerHTML = renderLockedHtml(true);
          return;
        }
        render();
      });
  }
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
    render();
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
  const groups = TICKET_DATA.map((group) => ({
    label: group.group,
    rows: group.teams
      .map((item) => ({
        label: item.code,
        numbers: getRemainingTickets(item),
      }))
      .filter((row) => row.numbers.length > 0),
  })).filter((group) => group.rows.length > 0);

  elements.printReport.innerHTML = renderPrintReportHtml(groups);

  const cleanup = () => {
    elements.printReport.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}
