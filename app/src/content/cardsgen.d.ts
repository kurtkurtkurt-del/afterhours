export type NightCardData = {
  city?: string;
  t: string; ty: string; v: string; d: string;
  metal: string; motif: string;
  in: string; out: string; dur: string;
  crew: string[]; more: number; aud: string; msg: number; who: string;
  froze: string; no: string; at1: string; at2: string;
  q1?: [string, string, string]; q2?: [string, string, string];
  blank?: boolean;
};
declare const CARDS: {
  nights: NightCardData[];
  front: (e: NightCardData, i: number) => string;
  back: (e: NightCardData, i: number) => string;
};
export default CARDS;
