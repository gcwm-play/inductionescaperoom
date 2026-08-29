# Operation Board Briefing — CPF Board Induction Escape Room

A mobile-first companion web app for a company induction escape room. New
joiners open a link on their phone, work through 5 puzzle stages to
rediscover CPF Board's founding date, mission, vision, membership and
scheme numbers, and reconstruct two "lost" briefing slides before the
President's visit.

Progress is saved automatically to the phone's `localStorage`, so closing
the tab, locking the phone, or refreshing never loses a team's place —
they pick up exactly where they left off.

## How it's built

Plain HTML/CSS/JS, no build step, no external dependencies or CDN calls —
just open `index.html` or host the folder anywhere static files are served
(GitHub Pages, Netlify, S3, an internal web server, etc).

- `index.html` — page shell
- `styles.css` — all styling (mobile-first, navy/gold theme)
- `content.js` — **every editable word, number, answer and prop code** —
  edit this file to change any puzzle without touching the app logic
- `app.js` — app/game logic (state machine, rendering, validation)

## Deploying

Any static host works. Simplest option, GitHub Pages:

1. Push this repo to GitHub.
2. Settings → Pages → Deploy from branch → pick the branch/root.
3. Share the resulting URL with new joiners (or put it behind a QR code).

Or just `python3 -m http.server` from this folder for local testing.

## Game flow

| Stage | What happens | Answer lives in |
|---|---|---|
| Briefing | Backstory: slides lost, President Tharman visiting, network outage | `content.js → welcome` |
| 1 · Founding date | Shape cipher (shape = number of sides) decodes to a 4-digit DDMM code | `content.js → stage1.lockCode` (default `0107`) |
| Physical prop | Team dials the code on a **real 4-digit combination lock** in the room; inside is a note with a password | you set up |
| Gate | Team types the password from the lock to "reconnect to the network" | `content.js → gate.password` (default `SECUREFUTURE`) |
| 2 · Emails | Read 2 mock emails; first letter of each paragraph spells MISSION / VISION | `content.js → stage2.emails` |
| 3A · Real departments | While the app puzzles are worked, one teammate starts drawing the CPF Board logo from a text description; meanwhile pick the 5 real CPF departments out of 15 (10 decoys) to unlock the tiles | `content.js → stage3.logoTask`, `stage3.deptChallenge` |
| 3 · Mission | Tap shuffled phrase-tiles into the correct order to rebuild the mission statement | `content.js → stage3.tiles` |
| 3B · Logo photo | Team photographs their finished logo drawing using the phone's camera | `content.js → stage3b` |
| 4A/4B · Numbers | Two physical/facilitator-led challenges, solved in parallel: 4A gets the member count from a facilitator-provided tool, 4B counts green dots behind each team's Character Board for the project count. Both required to progress | `content.js → stage4.challengeA` (`4.3`), `stage4.challengeB` (`30`) |
| 5 · Vision words | Unscramble 3 anagrams (clue-driven) to reveal TRUSTED / RESPECTED / COMMITTED | `content.js → stage5.words` |
| Finale | Both slides render fully assembled from everything the team found, plus their logo photo | `content.js → finale` |

## Facilitator setup checklist

1. **Set the physical lock** to `0107` (or whatever you change
   `stage1.lockCode` to — keep it 4 digits and matching the app).
2. **Write the gate password** (`SECUREFUTURE` by default) on a slip of
   paper and place it inside the lock box.
3. **Provide paper and pens/markers** for the Stage 3A logo-drawing task —
   this is a physical activity, not something done in the app.
4. **Set up Stage 4's physical props**:
   - Stage 4A: whatever "tool" you hand out on request that reveals the
     member count (`4.3`) — e.g. a card, a magnifying sheet, a UV light
     revealing hidden text, up to you.
   - Stage 4B: each team's "Character Board" prop needs green dots hidden
     behind it that sum to `30` across however many boards you use.
   Both answers are plain text fields in the app — no format is enforced
   beyond matching `4.3` / `30`, so any physical mechanic works as long as
   it lands on those numbers.
5. Test the full flow yourself once on a phone before the first team runs
   it, including granting camera access at Stage 3B. Camera capture is
   most reliable over **HTTPS** — GitHub Pages and the Artifact link both
   serve over HTTPS by default, so this is only a concern if you host it
   somewhere else over plain `http://`.
6. **Between teams**, reset a device in one of two ways:
   - On the finale screen, tap **"Reset for Next Team"**.
   - Or open the link with `?reset=1` appended, e.g.
     `https://your-url/index.html?reset=1` (also available as a small
     "Facilitator: reset progress" link at the bottom of the welcome
     screen). This also clears the saved logo photo.
7. Progress (and the logo photo) is stored **per device/browser**, not
   centrally — if a team switches phones mid-game they'll need to restart
   on the new device, and the photo is not centrally collectible. If you
   want to gather every team's logo drawing afterward, that needs a real
   upload target (e.g. a form endpoint or cloud storage bucket) — ask if
   you'd like that wired in; it's a separate piece of infrastructure
   beyond what a static site can do on its own.

## Content accuracy note

The facts used (1 July 1955 founding date, 4.2 million members, mission
and vision wording) are based on publicly available CPF Board information
gathered for this build — the two source slide images referenced in the
original request weren't actually attached, so nothing here was copied
from them. Before running this with real new joiners, check `content.js`
against your team's actual current slides and correct any wording, exact
figures, or the vision statement template (`finale.slide2.visionTemplate`)
to match precisely.

## Customising

Everything player-facing — copy, puzzle answers, lock code, password,
email text, equations, anagram clues, slide templates — is in
`content.js` with inline comments. No other file needs to change for a
content-only edit.
