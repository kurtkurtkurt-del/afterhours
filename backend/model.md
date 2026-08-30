# afterhours — the data model

This file is not code, it is the decisions written down. The tables come
out of it.

## Decisions (2026-08-29)

- **You can look around without signing in.** Events and comments are
  public reading. Everything personal (swipes, kept cards, friends) needs
  an account.
- **Only Ahmet enters events.** One admin. No organiser account, no data
  pulled in from outside — both could be added later, neither exists now.
- **The front end changes as little as possible.** That is why a line like
  `meta`, which appears on screen word for word, is stored word for word
  in the database too; the structural fields (venue, date) are added
  *beside* it, never in its place.

## The things, and what joins them

```
city ──< venue ──< event >── event_type
                    │
                    ├──< swipe >── profile        (left/right, private to a person)
                    └──< comment >── profile      (beforehours; replies via parent_id)

profile ──< friendship >── profile                (mutual, confirmed)
profile ──1 profile_settings                      (only the owner reads it)
profile >── city                                  (home city)
```

### city
`münchen` and `istanbul` are live; `ankara` is soon; `berlin`, `wien` and
`köln` are faint. That split comes from the honest city list at the bottom
of the landing page, not from thin air.

### venue
The counterpart of the `VENUES` array in `venues.js`: a name, x/y on the
city schematic, the hour it opens and how many hours it stays open. The
"how many rooms are open right now" counter in the footer uses those,
which is why the hours are carried at all.

### event_type
The six kinds from the spec, in the spec's order: Rave, Club Night,
Konzert, Festival, Meetup, Hausparty. The order lives in `sort_order`
because the category buttons on the landing page follow it.

### event
Where the 36 records go. The fields match `events-data.js` one for one:

| field | what | note |
|---|---|---|
| `slug` | `asap-rocky` | it decides the URL, and never changes |
| `title` | `A$AP Rocky` | the name on the poster |
| `meta` | `Olympiahalle · 11.09.26 · 18:30` | **the line shown on screen**, stored as it is |
| `body` | the panel text | |
| `poster_no` | `1` → `posters/01.svg` | |
| `venue_id`, `starts_at` | the structural counterparts | **may be empty** |

`starts_at` being allowed to be empty matters: the existing data holds
non-dates like "Sommer 2027", "Mittwochs" and "2027 TBA". Forcing those
into a date would corrupt the data. `meta` is always right; when
`starts_at` is there, filtering by date becomes possible.

### profile
One row for everyone who signs in. Tied to Supabase's `auth.users` table;
the email stays private over there, and this table is the public part
(the handle). `is_admin` is true only for Ahmet — that is where the right
to write events comes from.

### swipe
One row per `(who, which event)`. `direction` is left or right.
**Kept cards are not a separate table**, they are the swipes that went
right — the "kept tonight" list is a query over them. The same card
cannot be swiped twice: `(user_id, event_id)` is unique, and a repeat
swipe overwrites.

### comment — beforehours
One table, two levels through `parent_id`: no `parent_id` means a topic,
a `parent_id` means a reply. A third level is refused on purpose (the
screen shows two). The `author_name` field is for the **sample** comments
that have no real user behind them; a real comment carries `author_id`.

### friendship
`requester` → `addressee`, `status`: pending / accepted.
The "friends liked swipes" mode = what confirmed friends swiped right.

## Who can see what

| | anonymous | signed in | Ahmet (admin) |
|---|---|---|---|
| event, venue, city, type | reads | reads | reads + writes |
| comment | reads | reads + writes (own) | + hides/deletes |
| own swipes | — | reads + writes | — |
| what a friend swiped right | — | reads (if confirmed) | — |
| someone else's swipes | — | **no** | **no** |

That last row matters: who liked what is personal. Not even the admin can
see it one by one, only the totals.

### profile  *(widened on 2026-08-30)*

The thing that appears after registration. It was **split in two**: a card
that is public, and settings only the owner reads. The reason for the
split is not technical but a decision: the "everyone reads" rule on
`profiles` would have opened the settings as well, and the principle that
"who liked what is open to nobody" only holds if the settings are hidden.

| field | what | note |
|---|---|---|
| `handle` | `ahmet` | friendship runs on it; `^[a-z0-9_]{3,20}$` |
| `display_name` | the name shown | 1–40 characters |
| `bio` | one line | 160 characters at most |
| `city_id` | home city | the deck's default can come from here |
| `onboarded_at` | **when registration finished** | stamped when a handle is chosen |
| `last_seen_at` | last seen | for the friends&more list |
| `is_admin` | | granted only from the SQL editor |

The settings (`profile_settings`): `kept_visibility` (`friends` /
`private`), `discoverable`, `notify_email`, `locale`.

**The privacy decision (2026-08-30).** A handle has to stay findable by
its nature — it is the only way to add a friend. But there are mountains
between "whoever knows your name can find you" and "anyone can download
the whole list"; the second is what was closed. The profile table is now
open only to yourself, your confirmed friends, and anyone with a request
pending between you; everything a stranger sees goes through functions
that hand back individually chosen fields. With `discoverable` off the
card does not appear at all, but someone who knows the handle can still
send a request — otherwise nobody could ever add that person. Last seen
never leaves with its clock time, only as a day, and only to a friend.

**Deliberately absent:** a profile photo. The site draws an initial;
uploading a photo means storage plus moderation plus GDPR. Not needed for
now.
