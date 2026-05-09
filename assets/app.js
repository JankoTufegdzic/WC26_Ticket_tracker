"use strict";

import { createClient } from "@supabase/supabase-js";

const TICKET_DATA = [
  {
    group: "FWC",
    teams: [{ code: "FWC", name: "FIFA World Cup", flagCode: null, flagFallback: "🏆", tickets: ["00", ...range(1, 19)] }],
  },
  {
    group: "Group A",
    teams: [
      team("MEX", "Mexico", "mx"),
      team("RSA", "South Africa", "za"),
      team("KOR", "South Korea", "kr"),
      team("CZE", "Czech Republic", "cz"),
    ],
  },
  {
    group: "Group B",
    teams: [
      team("CAN", "Canada", "ca"),
      team("BIH", "Bosnia and Herzegovina", "ba"),
      team("QAT", "Qatar", "qa"),
      team("SUI", "Switzerland", "ch"),
    ],
  },
  {
    group: "Group C",
    teams: [
      team("BRA", "Brazil", "br"),
      team("MAR", "Morocco", "ma"),
      team("HAI", "Haiti", "ht"),
      team("SCO", "Scotland", "gb-sct"),
    ],
  },
  {
    group: "Group D",
    teams: [
      team("USA", "United States", "us"),
      team("PAR", "Paraguay", "py"),
      team("AUS", "Australia", "au"),
      team("TUR", "Turkey", "tr"),
    ],
  },
  {
    group: "Group E",
    teams: [
      team("GER", "Germany", "de"),
      team("CUW", "Curacao", "cw"),
      team("CIV", "Ivory Coast", "ci"),
      team("ECU", "Ecuador", "ec"),
    ],
  },
  {
    group: "Group F",
    teams: [
      team("NED", "Netherlands", "nl"),
      team("JPN", "Japan", "jp"),
      team("SWE", "Sweden", "se"),
      team("TUN", "Tunisia", "tn"),
    ],
  },
  {
    group: "Group G",
    teams: [
      team("BEL", "Belgium", "be"),
      team("EGY", "Egypt", "eg"),
      team("IRN", "Iran", "ir"),
      team("NZL", "New Zealand", "nz"),
    ],
  },
  {
    group: "Group H",
    teams: [
      team("ESP", "Spain", "es"),
      team("CPV", "Cape Verde", "cv"),
      team("KSA", "Saudi Arabia", "sa"),
      team("URU", "Uruguay", "uy"),
    ],
  },
  {
    group: "Group I",
    teams: [
      team("FRA", "France", "fr"),
      team("SEN", "Senegal", "sn"),
      team("IRQ", "Iraq", "iq"),
      team("NOR", "Norway", "no"),
      
    ],
  },
  {
    group: "Group J",
    teams: [
      team("ARG", "Argentina", "ar"),
      team("ALG", "Algeria", "dz"),
      team("AUT", "Austria", "at"),
      team("JOR", "Jordan", "jo"),
    ],
  },
  {
    group: "Group K",
    teams: [
      team("POR", "Portugal", "pt"),
      team("COD", "DR Congo", "cd"),
      team("UZB", "Uzbekistan", "uz"),
      team("COL", "Colombia", "co"),
      
    ],
  },
  {
    group: "Group L",
    teams: [
      team("ENG", "England", "gb-eng"),
      team("CRO", "Croatia", "hr"),
      team("GHA", "Ghana", "gh"),
      team("PAN", "Panama", "pa"),
    ],
  },
];

const allTeams = TICKET_DATA.flatMap((group) => group.teams.map((item) => ({ ...item, group: group.group })));
const teamByCode = new Map(allTeams.map((item) => [item.code, item]));
const app = document.querySelector("#app");
const printReport = document.querySelector("#printReport");
const syncStatus = document.querySelector("#syncStatus");
const authButton = document.querySelector("#authButton");
const signOutButton = document.querySelector("#signOutButton");
const authDialog = document.querySelector("#authDialog");
const closeAuth = document.querySelector("#closeAuth");
const authForm = document.querySelector("#authForm");
const signUpSubmit = document.querySelector("#signUpSubmit");
const authMessage = document.querySelector("#authMessage");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");

let supabaseClient = null;
let currentUser = null;
let ownedTickets = new Set();
let saveQueue = Promise.resolve();

init();

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function team(code, name, flagCode) {
  return { code, name, flagCode, flagFallback: code, tickets: range(1, 20) };
}

async function init() {
  setupSupabase();
  bindEvents();

  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data.session?.user ?? null;
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user ?? null;
      hydrateTickets().then(render);
    });
  }

  await hydrateTickets();
  render();
}

function setupSupabase() {
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
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
}

function bindEvents() {
  window.addEventListener("hashchange", render);

  authButton.addEventListener("click", () => {
    authMessage.textContent = supabaseClient ? "" : "Add your Supabase credentials in .env first.";
    authDialog.showModal();
    emailInput.focus();
  });

  closeAuth.addEventListener("click", () => authDialog.close());

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signIn();
  });

  signUpSubmit.addEventListener("click", async () => {
    await signUp();
  });

  signOutButton.addEventListener("click", async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  });

  app.addEventListener("click", async (event) => {
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

    const ticketButton = event.target.closest("[data-ticket]");
    if (!ticketButton) return;
    const teamCode = ticketButton.dataset.team;
    const ticketNo = ticketButton.dataset.ticket;
    await toggleTicket(teamCode, ticketNo);
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

async function signIn() {
  if (!supabaseClient) return;
  authMessage.textContent = "Signing in...";
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });
  if (error) {
    authMessage.textContent = error.message;
    return;
  }
  authDialog.close();
}

async function signUp() {
  if (!supabaseClient) return;
  authMessage.textContent = "Creating account...";
  const { error } = await supabaseClient.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value,
    options: {
      emailRedirectTo: getAppUrl(),
    },
  });
  authMessage.textContent = error ? error.message : "Account created. Check your email if confirmation is enabled.";
}

function getAppUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

async function hydrateTickets() {
  if (!supabaseClient || !currentUser) {
    ownedTickets = new Set();
    updateAccountUi();
    return;
  }

  syncStatus.textContent = "Syncing...";
  const { data, error } = await supabaseClient
    .from("ticket_collection")
    .select("team_code,ticket_no")
    .eq("user_id", currentUser.id);

  if (error) {
    syncStatus.textContent = "Sync failed";
    console.error(error);
    return;
  }

  ownedTickets = new Set(data.map((row) => ticketKey(row.team_code, row.ticket_no)));
  updateAccountUi();
}

function updateAccountUi() {
  const configured = Boolean(supabaseClient);
  authButton.classList.toggle("hidden", Boolean(currentUser));
  signOutButton.classList.toggle("hidden", !currentUser);

  if (currentUser) {
    syncStatus.textContent = currentUser.email ?? "Signed in";
  } else if (configured) {
    syncStatus.textContent = "Sign in required";
  } else {
    syncStatus.textContent = "Supabase not configured";
  }
}

function render() {
  updateAccountUi();
  if (!supabaseClient || !currentUser) {
    renderLocked();
    return;
  }

  const route = getRoute();
  if (route.name === "team") {
    renderTeam(route.code);
    return;
  }
  renderHome();
}

function renderLocked() {
  const title = supabaseClient ? "Sign in required" : "Supabase setup required";
  const message = supabaseClient
    ? "Sign in or create an account to view and update your album."
    : "Add Supabase environment values and redeploy before the tracker can be used.";

  app.innerHTML = `
    <section class="locked-panel">
      <h1>${title}</h1>
      <p>${message}</p>
      <button class="button primary" type="button" data-open-auth ${supabaseClient ? "" : "disabled"}>Sign in</button>
    </section>
  `;

  const openAuth = app.querySelector("[data-open-auth]");
  openAuth.addEventListener("click", () => {
    authMessage.textContent = "";
    authDialog.showModal();
    emailInput.focus();
  });
}

function getRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const match = hash.match(/^\/team\/([A-Z0-9]+)$/);
  return match ? { name: "team", code: match[1] } : { name: "home" };
}

function renderHome() {
  const totals = getTotals();
  app.innerHTML = `
    ${configNotice()}
    <section class="page-head">
      <div>
        <h1>Album progress</h1>
        <p>Open a team, then tap numbers you already have in your album.</p>
      </div>
      <button class="button secondary" type="button" data-print-remaining>Print remaining PDF</button>
    </section>

    <section class="summary-grid" aria-label="Album summary">
      <article class="metric"><span>Owned</span><strong>${totals.owned}</strong></article>
      <article class="metric"><span>Still needed</span><strong>${totals.missing}</strong></article>
      <article class="metric"><span>Completion</span><strong>${totals.percent}%</strong></article>
    </section>

    ${TICKET_DATA.map(renderGroup).join("")}
  `;
}

function renderGroup(group) {
  const owned = group.teams.reduce((sum, item) => sum + countOwned(item), 0);
  const total = group.teams.reduce((sum, item) => sum + item.tickets.length, 0);
  return `
    <section class="group-section">
      <div class="group-title">
        <h2>${escapeHtml(group.group)}</h2>
        <span>${owned}/${total} owned</span>
      </div>
      <div class="team-grid">
        ${group.teams.map(renderTeamCard).join("")}
      </div>
    </section>
  `;
}

function renderTeamCard(item) {
  const owned = countOwned(item);
  const percent = Math.round((owned / item.tickets.length) * 100);
  return `
    <a class="team-card" href="#/team/${item.code}" aria-label="${escapeHtml(item.name)} tickets">
      ${renderFlag(item)}
      <span>
        <span class="team-code">${item.code}</span>
        <span class="team-name">${escapeHtml(item.name)}</span>
        <span class="progress-line">
          <span class="progress-track"><span class="progress-bar" style="width:${percent}%"></span></span>
          <span class="progress-text">${owned}/${item.tickets.length}</span>
        </span>
      </span>
    </a>
  `;
}

function renderTeam(code) {
  const item = teamByCode.get(code);
  if (!item) {
    window.location.hash = "#/";
    return;
  }

  const owned = countOwned(item);
  const missing = item.tickets.length - owned;
  const adjacent = getAdjacentTeams(item.code);
  app.innerHTML = `
    ${configNotice()}
    <div class="team-toolbar">
      <a class="button ghost" href="#/">Back to groups</a>
      <div class="team-nav">
        <button
          class="button ghost"
          type="button"
          data-team-nav="${adjacent.prev?.code ?? ""}"
          ${adjacent.prev ? "" : "disabled"}
          aria-label="Previous team"
        >&larr; ${adjacent.prev?.code ?? "Prev"}</button>
        <button
          class="button ghost"
          type="button"
          data-team-nav="${adjacent.next?.code ?? ""}"
          ${adjacent.next ? "" : "disabled"}
          aria-label="Next team"
        >${adjacent.next?.code ?? "Next"} &rarr;</button>
      </div>
      <button class="button secondary" type="button" data-select-all="${item.code}">Mark all owned</button>
    </div>

    ${renderAlbumSpread(item, owned, missing)}
  `;

  const selectAll = app.querySelector("[data-select-all]");
  selectAll.addEventListener("click", async () => {
    for (const ticketNo of item.tickets) {
      if (!ownedTickets.has(ticketKey(item.code, ticketNo))) {
        await toggleTicket(item.code, ticketNo, { skipRender: true });
      }
    }
    render();
  });
}

function renderAlbumSpread(item, owned, missing) {
  const leftTickets = item.tickets.slice(0, 10);
  const rightTickets = item.tickets.slice(10, 20);

  return `
    <section class="album-spread" aria-label="${escapeHtml(item.name)} ticket album pages">
      <article class="album-page album-page-left">
        <div class="album-team-panel">
          ${renderFlag(item)}
          <span class="album-team-code">${item.code}</span>
          <h1>${escapeHtml(item.name)}</h1>
          <p>${escapeHtml(item.group)} · ${owned} owned · ${missing} needed</p>
        </div>
        ${leftTickets.map((ticketNo) => renderTicketButton(item.code, ticketNo)).join("")}
      </article>

      <article class="album-page album-page-right">
        <div class="album-empty-slot" aria-hidden="true"></div>
        ${rightTickets.map((ticketNo) => renderTicketButton(item.code, ticketNo, ticketNo === "13" ? "ticket-landscape" : "")).join("")}
      </article>
    </section>
  `;
}

function renderFlag(item) {
  if (!item.flagCode) {
    return `<span class="flag flag-fallback" aria-hidden="true">${escapeHtml(item.flagFallback)}</span>`;
  }

  const code = encodeURIComponent(item.flagCode);
  const fallback = escapeHtml(item.flagFallback);
  return `
    <span class="flag" aria-hidden="true">
      <img
        src="https://flagcdn.com/w80/${code}.png"
        srcset="https://flagcdn.com/w160/${code}.png 2x"
        alt=""
        loading="lazy"
        onerror="this.replaceWith(document.createTextNode('${fallback}'))"
      />
    </span>
  `;
}

function printRemainingTickets() {
  const rows = allTeams
    .map((item) => ({
      label: item.code,
      numbers: getRemainingTickets(item),
    }))
    .filter((row) => row.numbers.length > 0);

  printReport.innerHTML = `
    <div class="print-page">
      <h1>WC26 Remaining Tickets</h1>
      <p>${new Date().toLocaleDateString()}</p>
      <div class="print-list">
        ${
          rows.length
            ? rows
                .map(
                  (row) => `
                    <div class="print-row">
                      <strong>${escapeHtml(row.label)}</strong>
                      <span>${row.numbers.map(escapeHtml).join(" ")}</span>
                    </div>
                  `
                )
                .join("")
            : '<div class="print-row"><strong>Complete</strong><span>No remaining tickets</span></div>'
        }
      </div>
    </div>
  `;

  const cleanup = () => {
    printReport.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}

function renderTicketButton(teamCode, ticketNo, extraClass = "") {
  const owned = ownedTickets.has(ticketKey(teamCode, ticketNo));
  return `
    <button
      class="ticket-button ${extraClass} ${owned ? "owned" : ""}"
      type="button"
      data-team="${teamCode}"
      data-ticket="${ticketNo}"
      aria-pressed="${owned ? "true" : "false"}"
    >${ticketNo}</button>
  `;
}

async function toggleTicket(teamCode, ticketNo, options = {}) {
  if (!supabaseClient || !currentUser) {
    renderLocked();
    return;
  }

  const key = ticketKey(teamCode, ticketNo);
  const nextOwned = !ownedTickets.has(key);

  if (nextOwned) {
    ownedTickets.add(key);
  } else {
    ownedTickets.delete(key);
  }

  if (!options.skipRender) render();

  saveQueue = saveQueue.then(() => saveTicket(teamCode, ticketNo, nextOwned));
  await saveQueue;
}

async function saveTicket(teamCode, ticketNo, isOwned) {
  if (!supabaseClient || !currentUser) {
    return;
  }

  syncStatus.textContent = "Saving...";
  const query = isOwned
    ? supabaseClient.from("ticket_collection").upsert({
        user_id: currentUser.id,
        team_code: teamCode,
        ticket_no: ticketNo,
      })
    : supabaseClient
        .from("ticket_collection")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("team_code", teamCode)
        .eq("ticket_no", ticketNo);

  const { error } = await query;
  syncStatus.textContent = error ? "Save failed" : currentUser.email ?? "Signed in";
  if (error) console.error(error);
}

function countOwned(item) {
  return item.tickets.filter((ticketNo) => ownedTickets.has(ticketKey(item.code, ticketNo))).length;
}

function getRemainingTickets(item) {
  return item.tickets.filter((ticketNo) => !ownedTickets.has(ticketKey(item.code, ticketNo)));
}

function getTotals() {
  const total = allTeams.reduce((sum, item) => sum + item.tickets.length, 0);
  const owned = allTeams.reduce((sum, item) => sum + countOwned(item), 0);
  return {
    total,
    owned,
    missing: total - owned,
    percent: total === 0 ? 0 : Math.round((owned / total) * 100),
  };
}

function getAdjacentTeams(teamCode) {
  const index = allTeams.findIndex((item) => item.code === teamCode);
  return {
    prev: index > 0 ? allTeams[index - 1] : null,
    next: index >= 0 && index < allTeams.length - 1 ? allTeams[index + 1] : null,
  };
}

function goToAdjacentTeam(teamCode, direction) {
  const adjacent = getAdjacentTeams(teamCode);
  goToTeam(direction < 0 ? adjacent.prev?.code : adjacent.next?.code);
}

function goToTeam(teamCode) {
  if (!teamCode || !teamByCode.has(teamCode)) return;
  window.location.hash = `#/team/${teamCode}`;
}

function ticketKey(teamCode, ticketNo) {
  return `${teamCode}:${ticketNo}`;
}

function configNotice() {
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
