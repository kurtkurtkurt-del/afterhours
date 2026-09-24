# afterhours — play console listing

## identity
- package: app.afterhours.android · version 0.1.0 (versionCode auto-increments via EAS)
- category: Lifestyle (alt: Events) · content rating: fill the IARC questionnaire; nightlife + user comments → likely "Teen"/16+
- contact email: ahmet.selcuk.kurt@gmail.com
- privacy policy url: https://kurtkurtkurt-del.github.io/afterhours/datenschutz/
- account deletion url (required): https://kurtkurtkurt-del.github.io/afterhours/settings/  (delete account lives there and in the app)

## title (30)
afterhours

## short description (80)
find your night. one card at a time. munich, istanbul, and 90 more cities.

## full description (4000)
afterhours is for deciding whether to go out tonight.

there is no search and no feed. the deck hands you one night at a time: a rave, a club night, a konzert, a festival, a meetup, a hausparty. swipe right to keep it, left and it never comes back.

go, and the night becomes a card. check in at the door and it turns into an afterhours card, yours to keep. the room after the night stays open for 48 hours: a voice note, two lines, who was there. then it freezes, forever.

see who is going. your friends' kept nights, who is coming, and a match when you both keep the same one. nothing you let go is ever shown to anyone.

what is near you, right now. the map shows tonight's nights around you. szene nights reveal their address only at check-in.

who is playing. live now, later tonight, this week; their sets, their photos, their next night.

background music if you want it: house, techno or rap, ten tracks each, off by default.

we count nights out, not minutes in.

## data safety (answers)
- location: approximate + precise, collected, not shared, optional (map only), used for app functionality
- email address: collected for account creation and sign-in; optional (guest mode exists)
- user-generated content: comments in rooms (later), profile handle/name/bio
- app activity: swipes (kept/let go) tied to the account; never shown per person, only totals
- no advertising id, no analytics sdk, no third-party sharing
- data is encrypted in transit (https); users can request deletion in-app (settings → delete account) or on the website

## permissions declared
ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION (while in use). nothing else.

## screenshots to take (phone, 1080×1920+)
1. flow deck with a card mid-swipe and the keep stamp
2. night page (cover, keep / ticket)
3. yours: tonight cards + a match box
4. map with pins near the user
5. djs: live now
6. account with the collection grid
7. sign up screen ("first time? welcome in.")

## feature graphic (1024×500)
ink ground, paper wordmark "afterhours", one line: "find your night."

## release notes 0.1.0
first closed test. deck, night pages, map, sign up, guest mode, background music.

## before submitting
- [ ] Supabase: allow anonymous sign-ins; decide on email confirmation
- [ ] website: an English privacy summary linked from datenschutz (Play reviewers read English)
- [ ] EAS: `npx eas-cli@latest login` → `npx eas-cli@latest init` → `npx eas-cli@latest build -p android --profile production`
- [ ] Play Console: create app, upload the AAB to Internal testing, add 12 testers for the 14-day closed test
- [ ] Google Maps not used (Leaflet + CARTO); CARTO attribution shown on the map and in credits
