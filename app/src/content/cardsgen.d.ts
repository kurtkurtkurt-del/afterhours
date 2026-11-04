export type CardKind = 'rave' | 'club' | 'concert' | 'festival' | 'meetup' | 'house';
// What a card holds, nothing more (owner, 04.11.2026).
export type NightCardData = {
  kind: CardKind | string;      // a kind, or the type name from the database (kindOf picks)
  design?: number;              // 0–9; when missing, pickDesign(id) decides
  id?: string;                  // the stable id (slug) the design is picked from
  ty?: string;                  // the type label on the card (RAVE, KONZERT …)
  t: string;                    // the night's name
  d: string;                    // the date, as shown
  doors?: string;               // the time the doors opened, as shown
  v?: string | null;            // venue
  city?: string | null;
  crew?: string[];              // initials of the people who came, if any
  track?: string | null;        // the night's track when there is one
  artist?: string | null;
  photo?: string | null;        // the night's photo when there is one
};
declare const CARDS: {
  nights: NightCardData[];
  kinds: CardKind[];
  front: (e: NightCardData, i: number | string) => string;
  kindOf: (typeName: string | null | undefined) => CardKind;
  pickDesign: (id: string) => number;
  setFonts: (f: { regular?: string; medium?: string; mono?: string }) => void;
  designs: () => number[];
};
export default CARDS;
