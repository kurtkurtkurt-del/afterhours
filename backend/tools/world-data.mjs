/* afterhours — the world list.
   Six continents, three countries each, three cities each. Munich is
   already here and keeps its own 36 nights; everyone else gets two.

   The content is invented but not random: each city's night was written
   by hand to be believable in that city. The venue names take after real
   places, the events are fiction.

   [kind, heading, venue, day (2026), time, text]  */

export const CONTINENTS = [
  {
    continent: "Europe", continentSlug: "eu",
    countries: [
      { name: "Deutschland", code: "de", cities: [
        { slug: "munchen", name: "münchen", nights: [] },   /* it already has its own 36 */
        { slug: "berlin", name: "berlin", nights: [
          ["Rave", "Betonhalle", "Kraftwerk Mitte", "12.09", "23:30",
           "Concrete, three storeys of it, and a sound system that treats the building as a cabinet."],
          ["Club Night", "Sonntagsclub", "Neukölln basement", "20.09", "22:00",
           "Sunday evening as a proper night out. Everyone has work tomorrow and nobody mentions it."],
        ]},
        { slug: "koln", name: "köln", nights: [
          ["Konzert", "Domplatte", "Kulturkirche", "03.10", "20:00",
           "A choir, a drum machine, and a church that was not built for either."],
          ["Hausparty", "Zweite Etage", "Ehrenfeld", "17.10", "21:00",
           "Fourth flat on the left. The neighbours are invited, which is the only reason it works."],
        ]},
      ]},
      { name: "Türkiye", code: "tr", cities: [
        { slug: "istanbul", name: "istanbul", nights: [
          ["Club Night", "Karaköy Alt Kat", "Karaköy", "19.09", "23:00",
           "Below street level, one room, and the ferry horn coming through the wall at 2am."],
          ["Meetup", "Plak Değişimi", "Kadıköy", "27.09", "16:00",
           "Bring three records you are done with. Leave with three you are not."],
        ]},
        { slug: "ankara", name: "ankara", nights: [
          ["Konzert", "Sanat Sahnesi", "Kızılay", "10.10", "20:30",
           "A hall built for speeches, borrowed for a band that does not make any."],
          ["Rave", "Depo Gecesi", "Ostim", "24.10", "00:30",
           "An industrial district that empties at six and fills again at midnight."],
        ]},
        { slug: "izmir", name: "izmir", nights: [
          ["Festival", "Körfez Açık Hava", "Kültürpark", "05.09", "18:00",
           "Five hours of sea breeze, then the wind drops and the bass finally sits still."],
          ["Club Night", "Alsancak Geç Saat", "Alsancak", "18.10", "23:30",
           "The street is loud until two; the room is louder after."],
        ]},
      ]},
      { name: "Österreich", code: "at", cities: [
        { slug: "wien", name: "wien", nights: [
          ["Club Night", "Gürtelbogen", "Stadtbahnbögen", "26.09", "22:30",
           "Under the railway arches, a train passing every four minutes and nobody flinching."],
          ["Meetup", "Kaffeehaus Runde", "Josefstadt", "11.10", "17:00",
           "One table, one waiter who has seen it all, and no agenda whatsoever."],
        ]},
        { slug: "graz", name: "graz", nights: [
          ["Hausparty", "Altbau Dritter", "Lend", "04.10", "21:30",
           "High ceilings, thin walls, and a landlord who is somehow also invited."],
          ["Konzert", "Murufer", "Kunsthaus", "22.11", "20:00",
           "Played to the river, which does not applaud but does carry the sound."],
        ]},
        { slug: "salzburg", name: "salzburg", nights: [
          ["Konzert", "Kellergewölbe", "Altstadt", "14.11", "19:30",
           "A cellar older than the country, and a set that leans into the reverb."],
          ["Meetup", "Bergweg Frühstück", "Kapuzinerberg", "29.11", "09:00",
           "Walk up, eat, walk down. The whole event is the walk."],
        ]},
      ]},
    ],
  },

  {
    continent: "Asia", continentSlug: "as",
    countries: [
      { name: "日本", code: "jp", cities: [
        { slug: "tokyo", name: "tokyo", nights: [
          ["Club Night", "Shibuya Chika", "Dogenzaka basement", "13.09", "23:00",
           "Second basement, forty people, and a policy of never announcing who is playing."],
          ["Rave", "Bayside Warehouse", "Shinkiba", "27.09", "01:00",
           "Out where the trains stop early, so nobody leaves before the sun."],
        ]},
        { slug: "osaka", name: "osaka", nights: [
          ["Konzert", "Namba Loft", "Namba", "08.10", "19:00",
           "Three bands, one hour each, and a crowd that stays for all three."],
          ["Hausparty", "Nagaya Night", "Nishinari", "25.10", "20:00",
           "A row house with the doors open and the party spilling into the lane."],
        ]},
        { slug: "kyoto", name: "kyoto", nights: [
          ["Meetup", "Kamogawa Sit", "Kamo riverbank", "20.09", "18:30",
           "Everyone sits the same distance apart. Nobody planned it; it just happens here."],
          ["Club Night", "Machiya Sound", "Nakagyo", "15.11", "22:00",
           "A wooden townhouse with a sound system that respects the wood."],
        ]},
      ]},
      { name: "한국", code: "kr", cities: [
        { slug: "seoul", name: "seoul", nights: [
          ["Rave", "Mullae Ironworks", "Mullae-dong", "19.09", "23:30",
           "Metal shops by day, still smelling of it by night, which somehow suits the music."],
          ["Club Night", "Itaewon Late", "Itaewon", "10.10", "23:00",
           "The last hour is the point. Everything before it is a waiting room."],
        ]},
        { slug: "busan", name: "busan", nights: [
          ["Festival", "Gwangalli Open Air", "Gwangalli Beach", "12.09", "17:00",
           "The bridge lights up at nine and the whole crowd turns around for it."],
          ["Meetup", "Jagalchi Morning", "Jagalchi Market", "26.09", "07:00",
           "For people who would rather start a day than end one."],
        ]},
        { slug: "daegu", name: "daegu", nights: [
          ["Konzert", "Bangcheon Stage", "Bangcheon Market", "17.10", "19:30",
           "A market alley that turns into a room once the shutters come down."],
          ["Hausparty", "Rooftop 4F", "Jung-gu", "07.11", "21:00",
           "Fourth floor, no lift, and everyone arrives slightly out of breath."],
        ]},
      ]},
      { name: "Indonesia", code: "id", cities: [
        { slug: "jakarta", name: "jakarta", nights: [
          ["Club Night", "Kota Tua Cellar", "Kota Tua", "26.09", "22:30",
           "Colonial walls, tropical heat, and a fan that gave up an hour ago."],
          ["Rave", "Ancol Late", "Ancol", "24.10", "00:00",
           "By the water, where the city finally stops being loud in the other way."],
        ]},
        { slug: "bandung", name: "bandung", nights: [
          ["Konzert", "Dago Hall", "Dago", "11.10", "19:00",
           "Cool enough at altitude that nobody complains about standing."],
          ["Meetup", "Zine Sore", "Braga", "01.11", "16:00",
           "Photocopied, stapled, handed over. The whole economy runs on trade."],
        ]},
        { slug: "yogyakarta", name: "yogyakarta", nights: [
          ["Hausparty", "Kos Kosan", "Sleman", "18.10", "20:30",
           "A student boarding house where the rule is that you bring something."],
          ["Festival", "Sawah Sonic", "rice terraces", "22.11", "16:00",
           "Speakers between the fields. The frogs join in after dark and stay."],
        ]},
      ]},
    ],
  },

  {
    continent: "Africa", continentSlug: "af",
    countries: [
      { name: "Nigeria", code: "ng", cities: [
        { slug: "lagos", name: "lagos", nights: [
          ["Club Night", "Yaba Backroom", "Yaba", "19.09", "23:00",
           "Behind a phone repair shop, and the queue knows exactly which door."],
          ["Konzert", "Freedom Park Live", "Lagos Island", "10.10", "19:00",
           "An old prison yard that has been a concert venue longer than it was a prison."],
        ]},
        { slug: "abuja", name: "abuja", nights: [
          ["Rave", "Rock Bottom", "Wuse", "03.10", "00:00",
           "A city designed on paper, and a night that ignores the plan entirely."],
          ["Meetup", "Sunday Sound", "Jabi Lake", "25.10", "17:00",
           "Everyone brings one speaker. It should not work and it does."],
        ]},
        { slug: "ibadan", name: "ibadan", nights: [
          ["Hausparty", "Bodija Compound", "Bodija", "17.10", "20:00",
           "A compound, four families, and one generator that everyone is polite about."],
          ["Festival", "Agodi Open Air", "Agodi Gardens", "14.11", "16:00",
           "Starts in daylight so the drummers can see each other."],
        ]},
      ]},
      { name: "Kenya", code: "ke", cities: [
        { slug: "nairobi", name: "nairobi", nights: [
          ["Club Night", "Westlands Basement", "Westlands", "26.09", "22:30",
           "Down two flights, and the traffic above stops mattering."],
          ["Rave", "Industrial Area", "Enterprise Road", "07.11", "01:00",
           "Warehouses that are still warehouses on Monday morning."],
        ]},
        { slug: "mombasa", name: "mombasa", nights: [
          ["Festival", "Old Town Beats", "Old Town", "12.09", "18:00",
           "Coral walls hold the heat and hand it back all evening."],
          ["Meetup", "Dhow Sunset", "Tudor Creek", "04.10", "17:30",
           "On the water for two hours. There is nowhere to go, which is the design."],
        ]},
        { slug: "kisumu", name: "kisumu", nights: [
          ["Konzert", "Lakeside Stage", "Dunga Beach", "24.10", "18:30",
           "The lake goes flat at dusk and the sound carries much further than it should."],
          ["Hausparty", "Milimani House", "Milimani", "21.11", "20:00",
           "One long table outside, and nobody sits at it until midnight."],
        ]},
      ]},
      { name: "Maroc", code: "ma", cities: [
        { slug: "casablanca", name: "casablanca", nights: [
          ["Club Night", "Corniche Sous-Sol", "Ain Diab", "10.10", "23:30",
           "The sea on one side, a wall of speakers on the other."],
          ["Konzert", "Ancienne Médina", "Old Medina", "28.11", "20:00",
           "A courtyard with four walls and a ceiling of exactly nothing."],
        ]},
        { slug: "marrakesh", name: "marrakesh", nights: [
          ["Meetup", "Riad Rooftop", "Medina", "19.09", "18:00",
           "Mint tea, low cushions, and the call to prayer cutting cleanly through the conversation."],
          ["Rave", "Palmeraie Night", "Palmeraie", "31.10", "23:00",
           "Out among the palms, where the sound has nothing to bounce off."],
        ]},
        { slug: "tanger", name: "tanger", nights: [
          ["Festival", "Détroit Sessions", "Cap Spartel", "05.09", "17:00",
           "Two seas meet here and the wind cannot decide which way to blow."],
          ["Club Night", "Rue de la Plage", "Malabata", "14.11", "23:00",
           "A room that has been a cinema, a café, and now this."],
        ]},
      ]},
    ],
  },

  {
    continent: "North America", continentSlug: "na",
    countries: [
      { name: "United States", code: "us", cities: [
        { slug: "new-york", name: "new york", nights: [
          ["Club Night", "Bushwick Loft", "Bushwick", "12.09", "23:00",
           "Freight lift, fourth floor, and a door person who remembers faces."],
          ["Konzert", "Bowery Basement", "Lower East Side", "03.10", "20:00",
           "Two hundred people in a room built for eighty, which is the tradition."],
        ]},
        { slug: "chicago", name: "chicago", nights: [
          ["Rave", "South Side Warehouse", "Bridgeport", "26.09", "00:00",
           "Where the whole thing started, and the room still acts like it knows."],
          ["Meetup", "Record Fair", "Pilsen", "18.10", "11:00",
           "Crates on folding tables. Bring cash and a bag you can carry home."],
        ]},
        { slug: "detroit", name: "detroit", nights: [
          ["Club Night", "Eastern Market Late", "Eastern Market", "10.10", "23:30",
           "Produce sheds by day. The concrete floor takes the low end perfectly."],
          ["Festival", "Riverfront Open Air", "Detroit Riverfront", "05.09", "15:00",
           "Canada on the far bank, close enough to wave at."],
        ]},
      ]},
      { name: "México", code: "mx", cities: [
        { slug: "ciudad-de-mexico", name: "ciudad de méxico", nights: [
          ["Club Night", "Roma Norte Sótano", "Roma Norte", "19.09", "23:30",
           "A basement under a building that survived two earthquakes and shows it."],
          ["Rave", "Vecindad", "Doctores", "07.11", "01:00",
           "Courtyard housing, doors open onto it, and the party is the courtyard."],
        ]},
        { slug: "guadalajara", name: "guadalajara", nights: [
          ["Konzert", "Teatro Chico", "Centro", "24.10", "20:00",
           "Velvet seats nobody uses, because everyone stands from the first song."],
          ["Hausparty", "Azotea", "Americana", "14.11", "21:00",
           "Rooftop, string lights, and a view of every other rooftop doing the same."],
        ]},
        { slug: "monterrey", name: "monterrey", nights: [
          ["Festival", "Cerro Sonoro", "Parque Fundidora", "12.09", "16:00",
           "Old steelworks, mountains behind, and heat that only breaks at nine."],
          ["Meetup", "Fanzine Nocturno", "Barrio Antiguo", "01.11", "18:00",
           "Photocopies, folding tables, and arguments about staples."],
        ]},
      ]},
      { name: "Canada", code: "ca", cities: [
        { slug: "montreal", name: "montréal", nights: [
          ["Club Night", "Mile End Loft", "Mile End", "03.10", "23:00",
           "A permit that expires at three and a crowd that has read it."],
          ["Konzert", "Plateau Church", "Le Plateau", "21.11", "19:30",
           "Deconsecrated, freezing, and acoustically almost unfair."],
        ]},
        { slug: "toronto", name: "toronto", nights: [
          ["Rave", "Junction Warehouse", "The Junction", "17.10", "00:30",
           "Beside a rail line, so the low end has competition twice an hour."],
          ["Meetup", "Kensington Swap", "Kensington Market", "27.09", "13:00",
           "Trade a record, trade a jacket, trade a phone number. All equally likely."],
        ]},
        { slug: "vancouver", name: "vancouver", nights: [
          ["Hausparty", "East Van Basement", "East Vancouver", "07.11", "21:00",
           "Rain outside, condensation inside, and nobody going home early because of either."],
          ["Festival", "Harbour Open Air", "Crab Park", "05.09", "15:00",
           "Mountains on one side, container cranes on the other."],
        ]},
      ]},
    ],
  },

  {
    continent: "South America", continentSlug: "sa",
    countries: [
      { name: "Brasil", code: "br", cities: [
        { slug: "sao-paulo", name: "são paulo", nights: [
          ["Club Night", "Barra Funda", "Barra Funda", "19.09", "23:59",
           "Nothing starts before midnight and nothing ends before the metro reopens."],
          ["Rave", "Minhocão", "Elevado", "31.10", "01:00",
           "An elevated road closed to cars on Sundays, borrowed a few hours early."],
        ]},
        { slug: "rio-de-janeiro", name: "rio de janeiro", nights: [
          ["Festival", "Lapa Arcos", "Lapa", "12.09", "18:00",
           "Under the arches, where four sound systems negotiate all night."],
          ["Meetup", "Roda na Praça", "Santa Teresa", "04.10", "16:00",
           "A circle, instruments passed around it, and no stage anywhere."],
        ]},
        { slug: "belo-horizonte", name: "belo horizonte", nights: [
          ["Konzert", "Praça Sonora", "Savassi", "24.10", "19:00",
           "A square that fills from the edges in, until you cannot see where it started."],
          ["Hausparty", "Casa Amarela", "Santa Efigênia", "21.11", "21:00",
           "Yellow house, green gate, and a hill that punishes anyone who arrives late."],
        ]},
      ]},
      { name: "Argentina", code: "ar", cities: [
        { slug: "buenos-aires", name: "buenos aires", nights: [
          ["Club Night", "Palermo Sótano", "Palermo", "26.09", "01:00",
           "Dinner at eleven, arrive at one, leave when the bakeries open."],
          ["Konzert", "Galpón San Telmo", "San Telmo", "14.11", "20:30",
           "A shed with a tin roof that becomes an instrument when it rains."],
        ]},
        { slug: "cordoba", name: "córdoba", nights: [
          ["Rave", "Sierra Chica", "outside the city", "10.10", "23:00",
           "Forty minutes out, no lights on the road, and a horizon you can hear."],
          ["Meetup", "Feria de Discos", "Güemes", "18.10", "12:00",
           "Sunday, tables, and one man who will not sell you the record you want."],
        ]},
        { slug: "rosario", name: "rosario", nights: [
          ["Festival", "Costanera", "Paraná riverfront", "05.09", "17:00",
           "The river is a kilometre wide here and the sound just keeps going."],
          ["Hausparty", "Casa Chica", "Pichincha", "07.11", "22:00",
           "A small house with too many people in it, which is the entire concept."],
        ]},
      ]},
      { name: "Colombia", code: "co", cities: [
        { slug: "bogota", name: "bogotá", nights: [
          ["Club Night", "Chapinero Bajo", "Chapinero", "19.09", "22:30",
           "Two thousand six hundred metres up, so pace yourself early."],
          ["Rave", "Bodega Norte", "Usaquén", "28.11", "00:00",
           "Cold outside, which makes the room feel like a decision."],
        ]},
        { slug: "medellin", name: "medellín", nights: [
          ["Festival", "Comuna Abierta", "Comuna 13", "12.09", "15:00",
           "Escalators up the hillside, sound at every landing."],
          ["Meetup", "Intercambio", "Laureles", "01.11", "17:00",
           "Bring something to swap and something to count about it."],
        ]},
        { slug: "cali", name: "cali", nights: [
          ["Konzert", "Salsa Vieja", "Barrio Obrero", "17.10", "21:00",
           "Live brass in a room where everyone already knows the steps."],
          ["Hausparty", "Terraza", "San Antonio", "21.11", "20:00",
           "A terrace above the old town, and a hill that keeps the noise local."],
        ]},
      ]},
    ],
  },

  {
    continent: "Oceania", continentSlug: "oc",
    countries: [
      { name: "Australia", code: "au", cities: [
        { slug: "sydney", name: "sydney", nights: [
          ["Club Night", "Marrickville Warehouse", "Marrickville", "26.09", "22:00",
           "Industrial estate, one unmarked roller door, and a noise complaint waiting to happen."],
          ["Festival", "Harbour Sunset", "Barangaroo", "05.09", "16:00",
           "Finishes at ten because the council says so, and nobody argues."],
        ]},
        { slug: "melbourne", name: "melbourne", nights: [
          ["Rave", "Laneway Late", "Collingwood", "10.10", "00:00",
           "A lane so narrow the sound has nowhere to go but up."],
          ["Meetup", "Vinyl Sunday", "Fitzroy", "18.10", "12:00",
           "Four hours, no phones on the table, and coffee taken very seriously."],
        ]},
        { slug: "brisbane", name: "brisbane", nights: [
          ["Konzert", "Fortitude Hall", "Fortitude Valley", "24.10", "19:30",
           "Humid enough that the band and the crowd are equally wet by the third song."],
          ["Hausparty", "Queenslander", "West End", "14.11", "20:00",
           "A house on stilts, the party underneath it, and the mosquitos invited."],
        ]},
      ]},
      { name: "Aotearoa", code: "nz", cities: [
        { slug: "auckland", name: "auckland", nights: [
          ["Club Night", "K Road Basement", "Karangahape Road", "19.09", "23:00",
           "The street has changed hands four times; the basement has not changed at all."],
          ["Meetup", "Waterfront Walk", "Wynyard Quarter", "27.09", "17:00",
           "An hour along the water, then whoever is left picks a bar."],
        ]},
        { slug: "wellington", name: "wellington", nights: [
          ["Rave", "Cuba Street Cellar", "Te Aro", "17.10", "23:30",
           "Wind outside that could take the door off, and a room that stays warm anyway."],
          ["Konzert", "Harbour Stage", "Oriental Bay", "07.11", "18:00",
           "Played into a southerly, which every band here is prepared for."],
        ]},
        { slug: "christchurch", name: "christchurch", nights: [
          ["Festival", "Rebuild Open Air", "Central City", "12.09", "15:00",
           "On a site that has been three different things since 2011."],
          ["Hausparty", "Villa Backyard", "Riccarton", "21.11", "19:00",
           "Long grass, borrowed chairs, and a fire that someone thought about in advance."],
        ]},
      ]},
      { name: "Viti", code: "fj", cities: [
        { slug: "suva", name: "suva", nights: [
          ["Meetup", "Seawall Sundown", "Suva seawall", "26.09", "17:30",
           "Everyone sits facing the same way. The event is the sunset and the talking."],
          ["Club Night", "Victoria Parade", "Victoria Parade", "24.10", "22:00",
           "Rain most evenings, and the room fills faster when it comes."],
        ]},
        { slug: "nadi", name: "nadi", nights: [
          ["Festival", "Reef Open Air", "Wailoaloa Beach", "05.09", "16:00",
           "Sand, one stage, and a tide that decides how much room there is."],
          ["Hausparty", "Backyard Lovo", "Namaka", "14.11", "18:00",
           "Food buried in the ground hours before anyone arrives. Worth the wait."],
        ]},
        { slug: "lautoka", name: "lautoka", nights: [
          ["Konzert", "Sugar City Hall", "Lautoka", "17.10", "19:00",
           "The mill smells of molasses for six months a year and tonight is one of them."],
          ["Rave", "Mill Yard", "Lautoka Mill", "28.11", "23:00",
           "Cane trains on one side, sound system on the other, both running late."],
        ]},
      ]},
    ],
  },
];
