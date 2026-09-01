/* afterhours — the twenty on the wall.

   Hand-picked from the Ticketmaster window 01.10.2026 → 01.01.2027, by
   three measures: the best-looking cover, the most gloriously absurd,
   and the loudest names in the world right now. They hold the wall in
   this order until their nights pass; a night that has passed leaves the
   database and the wall quietly fills the gap from the random pool.

   `pos` (optional) is the CSS object-position for the 2:3 crop, for a
   cover whose subject is not in the middle.

   `body` is the line the hover panel and the event page speak for this
   night — twenty nights, twenty different registers: a customs form, a
   shipping forecast, a bug ticket, a diplomatic cable. Written here so
   the wall has a voice of its own; the database line stays underneath
   as the fallback.

   `artist` + `song` name the act's most famous track, hand-picked; the
   event page plays its Apple Music preview through a small sound row
   (explore/event.js) — the hook of the song, right on the page, no key
   and no account needed. The two nights that are not music acts carry
   no song, and no row appears. */

window.FEATURED = [
  { slug: "the-weeknd-after-hours-til-dawn-tour-16b72e5f",
    artist: "The Weeknd", song: "Blinding Lights",
    body: "The one tour we were legally obliged to hang first: it runs from after hours til dawn, and we have never related to anything more." },
  { slug: "tyla-the-a-pop-world-tour-3da81ac5",
    artist: "Tyla", song: "Water",
    body: "Forecast for Düsseldorf: thirty degrees indoors, a pop front moving in from Johannesburg, visibility zero past the third row. Umbrellas useless." },
  { slug: "the-strokes-reality-awaits-92a28ab5",
    artist: "The Strokes", song: "Last Nite",
    body: "A voicemail from 2001, finally delivered. They still sound like New York at 2am, and reality, as promised on the tin, is still waiting." },
  { slug: "asap-rocky-don-t-be-dumb-world-tour-79c44b4e",
    artist: "A$AP Rocky", song: "Praise The Lord (Da Shine)",
    body: "Athens gave the world democracy, tragedy and comedy, then waited two and a half thousand years for the best-dressed man in it to arrive." },
  { slug: "hatsune-miku-miku-expo-2026-europe-ee092c17",
    artist: "Hatsune Miku", song: "The World Is Mine",
    body: "Support ticket #01: performer does not physically exist. Status: closed — working as intended. Sixteen years on stage, no body, no bad nights." },
  { slug: "j-cole-the-fall-off-tour-50cb5d66",
    artist: "J. Cole", song: "No Role Modelz",
    body: "Actuarial note, Zurich: a tour named The Fall-Off, headlined by a man with no recorded misses. Risk of decline assessed at negligible." },
  { slug: "verka-serduchka-and-band-fcdabbbf",
    artist: "Verka Serduchka", song: "Dancing Lasha Tumbai",
    body: "Customs declaration, Hamburg: one silver star hat, seven costume changes, one Eurovision grudge from 2007 kept in working order. Nothing further." },
  { slug: "bob-dylan-e603e5ab",
    artist: "Bob Dylan", song: "Like a Rolling Stone",
    body: "Rumour has it nobody knows the setlist — not the band, possibly not him. That has been the arrangement for sixty years, and Oslo will take it." },
  { slug: "my-chemical-romance-0ffb66fd",
    artist: "My Chemical Romance", song: "Welcome to the Black Parade",
    body: "Reports of this band's death (2013) were accurate at the time. The séance now fills stadiums. Wear black — it is what they would have wanted, and they said so." },
  { slug: "erykah-badu-imeho-an-intimate-experience-with-er-72034c1e",
    artist: "Erykah Badu", song: "On & On",
    body: "WARNING: prolonged exposure may cause revised life plans, incense purchases and lasting distrust of your own record collection. Milan accepts no liability." },
  { slug: "power-slap-25-hitman-vs-dumpling-2-c0942257",
    body: "The sequel the arthouse crowd was afraid to ask for: Hitman versus Dumpling, part two. One plot device, delivered open-palm. Cannes remains silent." },
  { slug: "bulent-ersoy-3c8f59c8",
    artist: "Bülent Ersoy", song: "Ümit Hırsızı",
    body: "Protocol note, Antwerp: when the Diva enters, you stand. There is no second item of protocol." },
  { slug: "placebo-30th-anniversary-tour-cbbd436f",
    artist: "Placebo", song: "Every You Every Me",
    body: "Thirty years of trials confirm this Placebo outperforms the real thing. Side effects include eyeliner and your entire adolescence returning at once." },
  { slug: "pitbull-i-m-back-d99dad7f",
    artist: "Pitbull", song: "Give Me Everything",
    body: "Press release: Mr. Worldwide returns to the world, which, technically, he never left. He does not specify where he went. He never explains. Dale." },
  { slug: "slava-s-snowshow-50438278",
    body: "Incident report, Guadalajara: indoor blizzard, cause — one clown. The storm is scheduled, the tears are voluntary, the paper snow gets everywhere for weeks." },
  { slug: "kneecap-b0a59635",
    artist: "Kneecap", song: "Sick In The Head",
    body: "Performed in a language certain governments would prefer stayed untranslated. Stockholm gets the full glossary: three lads, one balaclava, zero apologies." },
  { slug: "the-blaze-dj-set-5628863c",
    artist: "The Blaze", song: "Territory",
    body: "Postcard from İzmir: the French duo that makes grown men cry in slow motion, with the Aegean just past the decks. Wish you were sweating." },
  { slug: "tarkan-d5b28834",
    artist: "Tarkan", song: "Şımarık",
    body: "Diplomatic cable, Abu Dhabi: the şıkıdım arrives by moonlight. Three decades of field evidence suggest resistance is purely decorative." },
  { slug: "fat-freddy-s-drop-aab2b830",
    artist: "Fat Freddy's Drop", song: "Wandering Eye",
    body: "Shipping forecast: seven New Zealanders adrift on horns and dub, drifting inland towards landlocked Zurich. Sea state smooth. Set length oceanic." },
  { slug: "two-door-cinema-club-b7be0302",
    artist: "Two Door Cinema Club", song: "What You Know",
    body: "Minutes of the press conference: the cat on the poster has been fully briefed and offers no comment. Monterrey will dance anyway. The crown stays on." },
];
