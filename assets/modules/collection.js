"use strict";

import { state } from "./auth.js";
import { allTeams } from "./data.js";
import { ticketKey } from "./utils.js";

export function countOwned(item) {
  return item.tickets.filter((ticketNo) => state.ownedTickets.has(ticketKey(item.code, ticketNo))).length;
}

export function getRemainingTickets(item) {
  return item.tickets.filter((ticketNo) => !state.ownedTickets.has(ticketKey(item.code, ticketNo)));
}

export function getTotals() {
  const total = allTeams.reduce((sum, item) => sum + item.tickets.length, 0);
  const owned = allTeams.reduce((sum, item) => sum + countOwned(item), 0);
  return {
    total,
    owned,
    missing: total - owned,
    percent: total === 0 ? 0 : Math.round((owned / total) * 100),
  };
}
