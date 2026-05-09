"use strict";

export function getAppUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export function ticketKey(teamCode, ticketNo) {
  return `${teamCode}:${ticketNo}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
