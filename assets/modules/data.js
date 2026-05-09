"use strict";

export const TICKET_DATA = [
  {
    group: "FWC",
    teams: [{ code: "FWC", name: "FIFA World Cup", flagCode: null, flagFallback: "\u{1F3C6}", tickets: ["00", ...range(1, 19)] }],
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

export const allTeams = TICKET_DATA.flatMap((group) => group.teams.map((item) => ({ ...item, group: group.group })));
export const teamByCode = new Map(allTeams.map((item) => [item.code, item]));

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function team(code, name, flagCode) {
  return { code, name, flagCode, flagFallback: code, tickets: range(1, 20) };
}
