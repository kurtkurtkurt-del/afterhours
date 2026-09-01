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

   `artist` + `song` name the act's most famous track, hand-picked, and
   `preview`/`store` carry the resolved Apple Music addresses, LOOKED UP
   ONCE and written down here — the search service rate-limits when the
   page asks live, and most chips went quiet. The page now plays the
   baked address instantly; the live search survives only as a fallback
   for a preview that has died. The two nights that are not music acts
   carry no song, and no chip appears. */

window.FEATURED = [
  { slug: "the-weeknd-after-hours-til-dawn-tour-16b72e5f",
    artist: "The Weeknd", song: "Blinding Lights",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/blinding-lights/1488408555?i=1488408568&uo=4",
    body: "The one tour we were legally obliged to hang first: it runs from after hours til dawn, and we have never related to anything more." },
  { slug: "tyla-the-a-pop-world-tour-3da81ac5",
    artist: "Tyla", song: "Water",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/9a/62/e6/9a62e688-9080-feed-2411-cc793c4545cf/mzaf_4449175929344535361.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/water/1699082722?i=1699082734&uo=4",
    body: "Forecast for Düsseldorf: thirty degrees indoors, a pop front moving in from Johannesburg, visibility zero past the third row. Umbrellas useless." },
  { slug: "the-strokes-reality-awaits-92a28ab5",
    artist: "The Strokes", song: "Last Nite",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/69/c7/30/69c73043-f9dd-0c63-23cd-bfab274520ee/mzaf_5834786258891852942.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/last-nite/266376953?i=266377010&uo=4",
    body: "A voicemail from 2001, finally delivered. They still sound like New York at 2am, and reality, as promised on the tin, is still waiting." },
  { slug: "asap-rocky-don-t-be-dumb-world-tour-79c44b4e",
    artist: "A$AP Rocky", song: "Praise The Lord (Da Shine)",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/8f/7b/c9/8f7bc926-4b40-a20c-09c2-6b368d4b5d8b/mzaf_6377849716329792033.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/praise-the-lord-da-shine-feat-skepta/1388565682?i=1388566993&uo=4",
    body: "Athens gave the world democracy, tragedy and comedy, then waited two and a half thousand years for the best-dressed man in it to arrive." },
  { slug: "hatsune-miku-miku-expo-2026-europe-ee092c17",
    artist: "Hatsune Miku", song: "The World Is Mine",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/da/cd/95/dacd95fc-90c9-156b-df82-82bbe4cc8884/mzaf_14586589631831006948.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/the-world-is-mine-feat-hatsune-miku/440374074?i=440374091&uo=4",
    body: "Support ticket #01: performer does not physically exist. Status: closed — working as intended. Sixteen years on stage, no body, no bad nights." },
  { slug: "j-cole-the-fall-off-tour-50cb5d66",
    artist: "J. Cole", song: "No Role Modelz",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/61/a5/d6/61a5d60b-e393-10cc-2dea-93084c9c8aca/mzaf_13393257960128944647.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/no-role-modelz/1600772499?i=1600773036&uo=4",
    body: "Actuarial note, Zurich: a tour named The Fall-Off, headlined by a man with no recorded misses. Risk of decline assessed at negligible." },
  { slug: "verka-serduchka-and-band-fcdabbbf",
    artist: "Verka Serduchka", song: "Dancing Lasha Tumbai",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview124/v4/7e/38/24/7e382402-7159-864b-3f91-0adf90e02096/mzaf_10698426224520006104.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/dancing-lasha-tumbai/1501765051?i=1501765449&uo=4",
    body: "Customs declaration, Hamburg: one silver star hat, seven costume changes, one Eurovision grudge from 2007 kept in working order. Nothing further." },
  { slug: "bob-dylan-e603e5ab",
    artist: "Bob Dylan", song: "Like a Rolling Stone",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a5/68/b1/a568b1af-ff36-c4c4-f8b4-f1ffe5484c3a/mzaf_7213634674974695928.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/like-a-rolling-stone/201281514?i=201281527&uo=4",
    body: "Rumour has it nobody knows the setlist — not the band, possibly not him. That has been the arrangement for sixty years, and Oslo will take it." },
  { slug: "my-chemical-romance-0ffb66fd",
    artist: "My Chemical Romance", song: "Welcome to the Black Parade",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ea/3c/d6/ea3cd64e-fa54-c3c0-b2e3-e96a7b16cbc1/mzaf_2589197593248149925.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/welcome-to-the-black-parade/209388277?i=209388682&uo=4",
    body: "Reports of this band's death (2013) were accurate at the time. The séance now fills stadiums. Wear black — it is what they would have wanted, and they said so." },
  { slug: "erykah-badu-imeho-an-intimate-experience-with-er-72034c1e",
    artist: "Erykah Badu", song: "On & On",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/3f/4d/e2/3f4de21f-b339-3e3d-b37d-cce28951390d/mzaf_12986673335900553824.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/on-and-on/1490881167?i=1490881465&uo=4",
    body: "WARNING: prolonged exposure may cause revised life plans, incense purchases and lasting distrust of your own record collection. Milan accepts no liability." },
  { slug: "power-slap-25-hitman-vs-dumpling-2-c0942257",
    body: "The sequel the arthouse crowd was afraid to ask for: Hitman versus Dumpling, part two. One plot device, delivered open-palm. Cannes remains silent." },
  { slug: "bulent-ersoy-3c8f59c8",
    artist: "Bülent Ersoy", song: "Ümit Hırsızı",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/3f/8b/02/3f8b0244-95b4-dca7-6be7-092c930782cc/mzaf_5273357126171091633.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/%C3%BCmit-h%C4%B1rs%C4%B1z%C4%B1/1454038508?i=1454038515&uo=4",
    body: "Protocol note, Antwerp: when the Diva enters, you stand. There is no second item of protocol." },
  { slug: "placebo-30th-anniversary-tour-cbbd436f",
    artist: "Placebo", song: "Every You Every Me",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/08/47/bc/0847bc45-507a-9f43-16bd-9d0fff100d1c/mzaf_16043826354165160157.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/every-you-every-me/961067195?i=961067403&uo=4",
    body: "Thirty years of trials confirm this Placebo outperforms the real thing. Side effects include eyeliner and your entire adolescence returning at once." },
  { slug: "pitbull-i-m-back-d99dad7f",
    artist: "Pitbull", song: "Give Me Everything",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/07/7a/58/077a5833-acac-306a-c927-f800f1e09d4d/mzaf_10663174745007601529.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/give-me-everything-feat-ne-yo-afrojack-nayer/440733026?i=440733032&uo=4",
    body: "Press release: Mr. Worldwide returns to the world, which, technically, he never left. He does not specify where he went. He never explains. Dale." },
  { slug: "slava-s-snowshow-50438278",
    body: "Incident report, Guadalajara: indoor blizzard, cause — one clown. The storm is scheduled, the tears are voluntary, the paper snow gets everywhere for weeks." },
  { slug: "kneecap-b0a59635",
    artist: "Kneecap", song: "Sick In The Head",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/90/a9/42/90a9424c-8440-b333-d04a-a1fa72a50968/mzaf_17596928103446546229.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/sick-in-the-head-kneecap-ost/1764596757?i=1764598246&uo=4",
    body: "Performed in a language certain governments would prefer stayed untranslated. Stockholm gets the full glossary: three lads, one balaclava, zero apologies." },
  { slug: "the-blaze-dj-set-5628863c",
    artist: "The Blaze", song: "Territory",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e6/6c/ea/e66cea77-d581-2c32-1b32-9f43a6b3d19c/mzaf_212496464620847106.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/territory/1203811796?i=1203812318&uo=4",
    body: "Postcard from İzmir: the French duo that makes grown men cry in slow motion, with the Aegean just past the decks. Wish you were sweating." },
  { slug: "tarkan-d5b28834",
    artist: "Tarkan", song: "Şımarık",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/9d/e5/be/9de5beb5-088d-7351-4937-088b44b53bc0/mzaf_9876759312100643997.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/%C5%9F%C4%B1mar%C4%B1k/499332675?i=499332705&uo=4",
    body: "Diplomatic cable, Abu Dhabi: the şıkıdım arrives by moonlight. Three decades of field evidence suggest resistance is purely decorative." },
  { slug: "fat-freddy-s-drop-aab2b830",
    artist: "Fat Freddy's Drop", song: "Wandering Eye",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/36/f6/72/36f67264-36c6-f615-190d-137324e40be4/mzaf_12900714246699901964.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/wandering-eye/340180839?i=340181122&uo=4",
    body: "Shipping forecast: seven New Zealanders adrift on horns and dub, drifting inland towards landlocked Zurich. Sea state smooth. Set length oceanic." },
  { slug: "two-door-cinema-club-b7be0302",
    artist: "Two Door Cinema Club", song: "What You Know",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ec/3c/ce/ec3cce65-ceaf-9406-adf0-bd5fdc7613f5/mzaf_15785820011577026107.plus.aac.p.m4a",
    store: "https://music.apple.com/us/album/what-you-know/1771710760?i=1771711274&uo=4",
    body: "Minutes of the press conference: the cat on the poster has been fully briefed and offers no comment. Monterrey will dance anyway. The crown stays on." },
];
