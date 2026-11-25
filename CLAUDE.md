# CPF Board Induction Escape Room — notes for Claude

A mobile-first companion app for a physical escape room used in CPF Board
(Singapore) new-joiner inductions. Teams of new joiners solve 5 stages on a
phone, helped by physical props a facilitator hands out. The owner describes
changes in plain English and tests on real phones and in real sessions; give
step-by-step instructions for anything they must do themselves (Firebase
console, GitHub settings).

## Ground rules

- **No build step, no npm at runtime, no CDN.** Plain HTML/CSS/JS served as
  static files by GitHub Pages. Keep it that way.
- **All player-facing words, answers and prop codes live in `content.js`.**
  Change copy there, not in `app.js`.
- **Never put answers where participants can see them early**: the game, the
  follow page and the projector scoreboard are all visible to teams.
  `guide.html` holds the answers and is deliberately not linked from the game.
- **Bump the `?v=` numbers after changing a script or stylesheet.** Phones
  cache files, and a stale copy has caused real confusion mid-session. The
  tags are in `index.html`, `follow/index.html` and `scoreboard/index.html`
  (the Firebase bundle import in `room-sync.js` has its own `?v=`). Use the
  date plus a letter, e.g. `20261125a`.
- **The site is published from the repo's default branch.** A push there is
  live about a minute later; nothing needs merging. (The default branch is
  currently `claude/cpf-induction-escape-room-vswid8`; it may be renamed
  to `main` when the repo moves.)
- Commit messages: a short summary line, then what changed and why in plain
  words.

## How the pieces fit

| Path | What it is |
|---|---|
| `index.html`, `app.js`, `styles.css`, `content.js` | The game, run on the team leader's phone. State machine in `app.js`; views 0 welcome/invite, 1 stage 1, 2 code cracked, 3 password, 4 stage 2, 5 stage 3A, 6 logo photo, 7 stage 4, 8 stage 5, 9 finale. Progress is saved per device in `localStorage`. |
| `follow/` | Read-only page teammates open on their own phones (via the invite QR) to see the leader's current stage live. |
| `scoreboard/` | Facilitator projector page: one lane per team (designed for 4, on a 1080p laptop browser; phones don't matter), stick figures (`figure.js`, drawn as SVG from a character sheet the owner supplied), timers, split times, announcements, drop/add teams. `?demo=1` plays a self-running demo with no network. `?date=YYYY-MM-DD` shows another day. |
| `tilt-maze/` | Stage 4B "Code Maze": a tilt game played on a second phone placed on a physical device; reveals the answer. Its QR on the leader's screen is drawn from the site's own address. |
| `data-run/` | Optional side game (step counter). Not part of the main flow. |
| `guide.html` + `guide-img/` | Facilitator guide with screenshots, answer key, troubleshooting and a "How this app was built" section. Update it when behaviour a facilitator sees changes. |
| `room-sync.js`, `firebase-config.js`, `vendor/` | Live sync through Firebase Firestore (project `cpf-induction-escape-room`). `vendor/firebase-firestore.bundle.js` is firebase@13.0.0 bundled with esbuild (exports listed in `room-sync.js`); `qr.js` wraps `vendor/qrcode-generator.bundle.js`. |

### Room documents (Firestore collection `rooms`, id = 6-character code)

`teamName`, `stageIndex`, `createdAt`, `updatedAt`, `expiresAt` (for a TTL
cleanup policy), `startedAtMs`, `finishedAtMs`, `splits` (stage number →
completion time), `hidden` (dropped from the scoreboard).

`stageIndex` uses the game's view numbers, with sub-stages: 5.5 = Stage 3A
solved; 7.1 / 7.2 / 7.3 = Stage 4A / 4B / both solved. The follow page and
scoreboard depend on these values.

All syncing is fire-and-forget: the game must keep working with no network.
Extra fields are written separately from `stageIndex`, so a refused write
never blocks stage syncing.

### Current Firestore security rules

The owner pastes these into the Firebase console (Firestore Database →
Rules). Any new field the client writes must be added to the `hasOnly` list,
and the owner must publish the change; tell them so and give the full text.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomCode} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['teamName','stageIndex','createdAt'])
                    && request.resource.data.stageIndex == 0;
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
                    .hasOnly(['stageIndex','updatedAt','startedAtMs','finishedAtMs','splits','hidden']);
    }
  }
}
```

## Testing

- Serve locally with `python3 -m http.server 8899` and drive pages with
  Playwright (Chromium). Play through as a leader, with a second browser
  context as a follower when sync matters.
- **Avoid creating rooms in the real Firebase project**: the live scoreboard
  shows every room created today, including test rooms. Prefer routing
  `room-sync.js` to a stand-in that records calls, `scoreboard/?demo=1`, or
  reading past days with `scoreboard/?date=...`. If a real room is
  unavoidable, say so to the owner so they can drop it.
- Answers for a quick play-through are in `content.js` (and the guide's
  answer key).
- The camera (Stage 3B) and motion sensors (Code Maze, Data Run) can't be
  tested headless; fake the saved state or dispatch events, and ask the
  owner to check on a real phone.
