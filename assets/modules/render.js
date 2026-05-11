"use strict";

import { state } from "./auth.js";
import { TICKET_DATA } from "./data.js";
import { getAdjacentTeams } from "./router.js";
import { escapeHtml, ticketKey } from "./utils.js";

const leftPositions = ["slot-c3", "slot-c4", "slot-c1", "slot-c2", "slot-c3", "slot-c4", "slot-c1", "slot-c2", "slot-c3", "slot-c4"];
const rightPositions = ["slot-c1", "slot-c2", "slot-c3 span-2", "slot-c1", "slot-c2", "slot-c3", "slot-c4", "slot-c2", "slot-c3", "slot-c4"];
const sixPerPageLeftPositions = ["slot-c3", "slot-c4", "slot-c1", "slot-c2", "slot-c3", "slot-c4"];
const sixPerPageRightPositions = ["slot-c1", "slot-c2", "slot-c3", "slot-c4", "slot-c1", "slot-c2"];

export function renderLockedHtml(hasSupabase) {
  const title = hasSupabase ? "Sign in required" : "Supabase setup required";
  const message = hasSupabase
    ? "Sign in or create an account to view and update your album."
    : "Add Supabase environment values and redeploy before the tracker can be used.";

  return `
    <section class="locked-panel">
      <h1>${title}</h1>
      <p>${message}</p>
      <button class="button primary" type="button" data-open-auth ${hasSupabase ? "" : "disabled"}>Sign in</button>
    </section>
  `;
}

export function renderHomeHtml({ totals, countOwned }) {
  return `
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

    ${TICKET_DATA.map((group) => renderGroup(group, countOwned)).join("")}
  `;
}

export function renderTeamHtml({ item, owned, missing }) {
  const adjacent = getAdjacentTeams(item.code);
  return `
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
}

export function renderPrintReportHtml(groups) {
  return `
    <div class="print-page">
      <h1>WC26 Remaining Tickets</h1>
      <p>${new Date().toLocaleDateString()}</p>
      <div class="print-list">
        ${
          groups.length
            ? groups
                .map((group) => renderPrintGroup(group))
                .join("")
            : '<div class="print-row"><strong>Complete</strong><span>No remaining tickets</span></div>'
        }
      </div>
    </div>
  `;
}

function renderPrintGroup(group) {
  return `
    <section class="print-group">
      <h2>${escapeHtml(group.label)}</h2>
      ${group.rows
        .map(
          (row) => `
            <div class="print-row">
              <strong>${escapeHtml(row.label)}</strong>
              <span>${row.numbers.map(escapeHtml).join(" ")}</span>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderGroup(group, countOwned) {
  const owned = group.teams.reduce((sum, item) => sum + countOwned(item), 0);
  const total = group.teams.reduce((sum, item) => sum + item.tickets.length, 0);
  return `
    <section class="group-section">
      <div class="group-title">
        <h2>${escapeHtml(group.group)}</h2>
        <span>${owned}/${total} owned</span>
      </div>
      <div class="team-grid">
        ${group.teams.map((item) => renderTeamCard(item, countOwned)).join("")}
      </div>
    </section>
  `;
}

function renderTeamCard(item, countOwned) {
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

function renderAlbumSpread(item, owned, missing) {
  if (item.layout === "sixPerPage") {
    return renderSixPerPageSpread(item, owned, missing);
  }

  const leftTickets = item.tickets.slice(0, 10);
  const rightTickets = item.tickets.slice(10, 20);

  return `
    <section class="album-spread" aria-label="${escapeHtml(item.name)} ticket album pages">
      <article class="album-page album-page-left">
        <div class="album-team-panel">
          ${renderFlag(item)}
          <span class="album-team-code">${item.code}</span>
          <h1>${escapeHtml(item.name)}</h1>
          <p>${escapeHtml(item.group)} &middot; ${owned} owned &middot; ${missing} needed</p>
        </div>
        ${leftTickets.map((ticketNo, index) => renderTicketButton(item.code, ticketNo, leftPositions[index])).join("")}
      </article>

      <article class="album-page album-page-right">
        ${rightTickets.map((ticketNo, index) => renderTicketButton(item.code, ticketNo, rightPositions[index])).join("")}
      </article>
    </section>
  `;
}

function renderSixPerPageSpread(item, owned, missing) {
  const leftTickets = item.tickets.slice(0, 6);
  const rightTickets = item.tickets.slice(6, 12);

  return `
    <section class="album-spread" aria-label="${escapeHtml(item.name)} ticket album pages">
      <article class="album-page album-page-left">
        <div class="album-team-panel">
          ${renderFlag(item)}
          <span class="album-team-code">${item.code}</span>
          <h1>${escapeHtml(item.name)}</h1>
          <p>${escapeHtml(item.group)} &middot; ${owned} owned &middot; ${missing} needed</p>
        </div>
        ${leftTickets.map((ticketNo, index) => renderTicketButton(item.code, ticketNo, sixPerPageLeftPositions[index])).join("")}
      </article>

      <article class="album-page album-page-right">
        ${rightTickets.map((ticketNo, index) => renderTicketButton(item.code, ticketNo, sixPerPageRightPositions[index])).join("")}
      </article>
    </section>
  `;
}

function renderFlag(item) {
  if (!item.flagCode) {
    const logoClass = item.logoClass ? ` ${escapeHtml(item.logoClass)}` : "";
    return `<span class="flag flag-fallback${logoClass}" aria-hidden="true">${escapeHtml(item.flagFallback)}</span>`;
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

function renderTicketButton(teamCode, ticketNo, extraClass = "") {
  const owned = state.ownedTickets.has(ticketKey(teamCode, ticketNo));
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
