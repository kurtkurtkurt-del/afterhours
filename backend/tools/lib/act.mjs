/* afterhours — the act on a night, read from its title. One rule for previews.mjs and
   enrich.mjs: the part before " - ", " – ", ": " or " | ", a leading "TYPE | " dropped,
   a trailing "Live in …" / "Tour …" cut. norm() makes two names comparable: lower case,
   accents stripped, anything but letters and digits a space. */
export const act = (t) =>
  String(t)
    .replace(/^[A-ZÄÖÜ]+ \| /, "")
    .split(/ - | – | — |: | \| /)[0]
    .replace(/\s+(Live in .*|Live auf Tour.*|Tour.*)$/i, "")
    .trim();

export const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
