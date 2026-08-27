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
| 1 · Founding date | Spot the real timeline fragment among 4, derive the 4-digit DDMM code | `content.js → stage1.lockCode` (default `0107`) |
| Physical prop | Team dials the code on a **real 4-digit combination lock** in the room; inside is a note with a password | you set up |
| Gate | Team types the password from the lock to "reconnect to the network" | `content.js → gate.password` (default `SECUREFUTURE`) |
| 2 · Emails | Read 2 mock emails; first letter of each paragraph spells MISSION / VISION | `content.js → stage2.emails` |
| 3 · Mission | Tap shuffled phrase-tiles into the correct order to rebuild the mission statement | `content.js → stage3.tiles` |
| 4 · Numbers | Solve 3 simple equations to reveal 4.2 million members / 30 national projects | `content.js → stage4.blanks` |
| 5 · Vision words | Unscramble 3 anagrams (clue-driven) to reveal TRUSTED / RESPECTED / COMMITTED | `content.js → stage5.words` |
| Finale | Both slides render fully assembled from everything the team found | `content.js → finale` |

## Facilitator setup checklist

1. **Set the physical lock** to `0107` (or whatever you change
   `stage1.lockCode` to — keep it 4 digits and matching the app).
2. **Write the gate password** (`SECUREFUTURE` by default) on a slip of
   paper and place it inside the lock box.
3. Test the full flow yourself once on a phone before the first team runs
   it.
4. **Between teams**, reset a device in one of two ways:
   - On the finale screen, tap **"Reset for Next Team"**.
   - Or open the link with `?reset=1` appended, e.g.
     `https://your-url/index.html?reset=1` (also available as a small
     "Facilitator: reset progress" link at the bottom of the welcome
     screen).
5. Progress is stored **per device/browser**, not centrally — if a team
   switches phones mid-game they'll need to restart on the new device.

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
