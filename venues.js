/* afterhours — the venues in Munich.
   x/y is the position in the 1440x900 design space of the city schematic;
   opensAt and hours are when a room opens and how long it stays open (the
   "how many rooms are open" counter in the footer uses those).

   This list started inside app.js. The maps page needs the same
   coordinates, so it moved somewhere both can reach.  */

const VENUES = [
  { name: "OLYMPIAHALLE",      x: 512, y: 236, opensAt: 18.5, hours: 4 },
  { name: "OLYMPIAPARK",       x: 556, y: 288, opensAt: 19.5, hours: 4 },
  { name: "ZENITH",            x: 946, y: 196, opensAt: 25.0, hours: 5 },
  { name: "TONHALLE",          x: 902, y: 236, opensAt: 22.0, hours: 6 },
  { name: "SCHWABING",         x: 760, y: 300, opensAt: 21.0, hours: 4 },
  { name: "MAXVORSTADT",       x: 664, y: 396, opensAt: 22.2, hours: 8 },
  { name: "NEUHAUSEN",         x: 556, y: 430, opensAt: 21.5, hours: 5 },
  { name: "P1",                x: 792, y: 404, opensAt: 23.0, hours: 6 },
  { name: "PIMPERNEL",         x: 748, y: 444, opensAt: 22.0, hours: 6 },
  { name: "MUSEUMSINSEL 1",    x: 828, y: 478, opensAt: 24.0, hours: 7 },
  { name: "HAIDHAUSEN",        x: 892, y: 494, opensAt: 20.0, hours: 4 },
  { name: "WESTEND",           x: 596, y: 552, opensAt: 19.0, hours: 3 },
  { name: "MILLA",             x: 726, y: 556, opensAt: 22.0, hours: 5 },
  { name: "GLOCKENBACH",       x: 764, y: 578, opensAt: 19.0, hours: 4 },
  { name: "SCHLACHTHOF",       x: 704, y: 614, opensAt: 18.0, hours: 4 },
  { name: "BAHNWÄRTER THIEL",  x: 668, y: 662, opensAt: 21.1, hours: 6 },
  { name: "SUNNY RED",         x: 636, y: 690, opensAt: 22.6, hours: 6 },
  { name: "ALTE UTTING",       x: 700, y: 706, opensAt: 18.5, hours: 4 },
  { name: "GIESING",           x: 812, y: 682, opensAt: 20.0, hours: 4 },
  { name: "RIEM",              x: 1128, y: 512, opensAt: 20.0, hours: 8 },
];

/* A `const` is not written onto window; other modules need to see it, so
   it is attached on purpose (same as POSTERS).  */
window.VENUES = VENUES;
