/* sample nights for the design sheet: one per design, varied so every slot shows */
(function(){
  const S = {
    rave:    [['Blitz · Nacht', 'BLITZ','MÜNCHEN'],['Silo West','SILO','MÜNCHEN'],['Betonhalle','KRAFTWERK','BERLIN'],['Rote Sonne Allnighter','ROTE SONNE','MÜNCHEN'],['Harry Klein','HARRY KLEIN','MÜNCHEN'],['Blitz × Pornceptual','BLITZ','MÜNCHEN'],['Bahnwärter Rave','BAHNWÄRTER THIEL','MÜNCHEN'],['Tunnel Session','BAHNWÄRTER THIEL','MÜNCHEN'],['Sunrise Set','ISARAUEN','MÜNCHEN'],['Tape Night','SILO','MÜNCHEN']],
    club:    [['Karaköy Alt Kat','KARAKÖY','İSTANBUL'],['Unterwelt','SUNNY RED','MÜNCHEN'],['Stamp Night','PIMPERNEL','MÜNCHEN'],['Neon Freitag','ROTE SONNE','MÜNCHEN'],['Bass Floor','HARRY KLEIN','MÜNCHEN'],['Vinyl Only','CHARLIE','MÜNCHEN'],['Downstairs','KLENZE 17','MÜNCHEN'],['Door Policy','BLITZ','MÜNCHEN'],['Cocktail Hour','ZEPHYR','MÜNCHEN'],['Garderobe','MILLA','MÜNCHEN']],
    concert: [['A$AP Rocky','OLYMPIAHALLE','MÜNCHEN'],['Nick Cave','OLYMPIAPARK','MÜNCHEN'],['AnnenMayKantereit','OLYMPIAPARK','MÜNCHEN'],['Bonez & RAF','OLYMPIAHALLE','MÜNCHEN'],['Thirty Seconds to Mars','OLYMPIAHALLE','MÜNCHEN'],['Fontaines D.C.','ZENITH','MÜNCHEN'],['Mitski','TONHALLE','MÜNCHEN'],['Encore Night','MUFFATHALLE','MÜNCHEN'],['Crowd Surf','BACKSTAGE','MÜNCHEN'],['Philharmonie','GASTEIG','MÜNCHEN']],
    festival:[['Elysium','MAXVORSTADT','MÜNCHEN'],['Mondscheinexpress','BAHNWÄRTER THIEL','MÜNCHEN'],['Sunny Fields','RIEM','MÜNCHEN'],['Bunting Weekend','OLYMPIAPARK','MÜNCHEN'],['Three Stages','MESSE','MÜNCHEN'],['Isle of Summer','REGATTA','MÜNCHEN'],['Rain Edition','THERESIENWIESE','MÜNCHEN'],['Camp Nights','FELDMOCHING','MÜNCHEN'],['Fireworks Finale','OLYMPIASEE','MÜNCHEN'],['Wiesn Afterhours','THERESIENWIESE','MÜNCHEN']],
    meetup:  [['Round Table','IMPACT HUB','MÜNCHEN'],['Open Talk','MUCCA','MÜNCHEN'],['Coffee & Code','MAN VERSUS MACHINE','MÜNCHEN'],['Name Tag Night','WERK1','MÜNCHEN'],['Founders Meet','TUM','MÜNCHEN'],['Lecture Hall','LMU','MÜNCHEN'],['Whiteboard Session','MINDSPACE','MÜNCHEN'],['Seven O’Clock','GLOCKENBACH','MÜNCHEN'],['Where Next','VIKTUALIENMARKT','MÜNCHEN'],['Network','BAYERNKASERNE','MÜNCHEN']],
    house:   [['Housewarming','SCHWABING','MÜNCHEN'],['Window Party','HAIDHAUSEN','MÜNCHEN'],['Balloons at Ada’s','GIESING','MÜNCHEN'],['Kitchen Party','NEUHAUSEN','MÜNCHEN'],['Up the Stairs','MAXVORSTADT','MÜNCHEN'],['Record Night','SENDLING','MÜNCHEN'],['Plant Party','GLOCKENBACH','MÜNCHEN'],['Ring Twice','LEHEL','MÜNCHEN'],['Couch Session','AU','MÜNCHEN'],['Rooftop','WESTEND','MÜNCHEN']],
  };
  const TY = { rave:'RAVE', club:'CLUB NIGHT', concert:'KONZERT', festival:'FESTIVAL', meetup:'MEETUP', house:'HAUSPARTY' };
  const tracks = [['Innerbloom','RÜFÜS DU SOL'],['Jungle','FRED AGAIN..'],null,['Papaoutai','STROMAE'],null,['Teardrop','MASSIVE ATTACK'],null,null,['Opus','ERIC PRYDZ'],null];
  const crews = [['A','M'],[],['L','E','J','M'],[],['S'],[],['D','Y','B','N','C'],[],[],['K','T']];
  const root = document.getElementById('all');
  const show = window.ONLY || null;
  CARDS.kinds.forEach((kind, ki) => {
    if (!CARDS.designs()[ki]) return;
    const h = document.createElement('h2'); h.textContent = TY[kind].toLowerCase(); root.appendChild(h);
    const row = document.createElement('div'); row.className = 'row'; root.appendChild(row);
    for (let d = 0; d < CARDS.designs()[ki]; d++) {
      if (show && d >= show) break;
      const s = S[kind][d];
      const e = { kind, design: d, ty: TY[kind], t: s[0], v: s[1], city: s[2], d: ['FR 17.10.26','SA 05.09.26','SA 12.09.26','DO 19.11.26','FR 02.10.26','SA 23.08.26','MI 15.09.26','FR 21.12.26','SA 12.04.27','SA 11.09.26'][d], doors: ['23:00','22:00','00:00','20:00','21:00','19:30','23:30','22:30','14:00','20:00'][d],
        crew: crews[(d + ki) % 10], track: tracks[(d + ki) % 10] ? tracks[(d + ki) % 10][0] : null, artist: tracks[(d + ki) % 10] ? tracks[(d + ki) % 10][1] : null,
        photo: (d + ki) % 3 === 1 ? '../party.jpg' : null };
      const fig = document.createElement('figure'); fig.innerHTML = CARDS.front(e, kind + d);
      const cap = document.createElement('figcaption'); cap.textContent = kind + ' · ' + (d + 1); fig.appendChild(cap);
      row.appendChild(fig);
    }
  });
})();
