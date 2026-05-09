"use strict";

import { allTeams, teamByCode } from "./data.js";

export function getRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const match = hash.match(/^\/team\/([A-Z0-9]+)$/);
  return match ? { name: "team", code: match[1] } : { name: "home" };
}

export function getAdjacentTeams(teamCode) {
  const index = allTeams.findIndex((item) => item.code === teamCode);
  return {
    prev: index > 0 ? allTeams[index - 1] : null,
    next: index >= 0 && index < allTeams.length - 1 ? allTeams[index + 1] : null,
  };
}

export function goToAdjacentTeam(teamCode, direction) {
  const adjacent = getAdjacentTeams(teamCode);
  goToTeam(direction < 0 ? adjacent.prev?.code : adjacent.next?.code);
}

export function goToTeam(teamCode) {
  if (!teamCode || !teamByCode.has(teamCode)) return;
  window.location.hash = `#/team/${teamCode}`;
}
