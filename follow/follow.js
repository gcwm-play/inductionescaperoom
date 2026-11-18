/**
 * follow.js — read-only "follow along" page. A teammate scans the
 * leader's QR (or types the room code by hand) and this page mirrors
 * whichever stage the leader's app.js is currently on, live, via
 * window.CPFRoomSync (see ../room-sync.js).
 *
 * Deliberately NOT interactive: no inputs are submitted here, no answers
 * are validated — it only ever reads content.js's puzzle text keyed by
 * the room's synced stageIndex (same view-index scheme app.js uses).
 */
(function () {
  "use strict";

  var C = window.CPF_CONTENT;
  var FOLLOW_KEY = "cpf_follow_room_v1";
  var app = document.getElementById("app");
  var unsubscribe = null;
  var lastSeenStageIndex = null;
  var currentRoomCode = null;
  var S4_START_KEY = "cpf_follow_s4start_v1";

  function esc(str) {
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------------------------------------------------------------------
  // Sound cue — a short chime whenever the room's stage changes, so a
  // teammate with the phone in their pocket notices there's an update.
  // Mobile browsers won't play audio before a real user gesture, so this
  // is primed on the first tap/click anywhere on the page (covers both
  // the "type a code and tap Follow" path and arriving via a scanned QR
  // link, where no button click happens before the first snapshot).
  // Fire-and-forget like everything else here: if it never gets primed
  // (no interaction at all), the page just stays silent — the visual
  // "Live" status and stage content are still the real source of truth.
  // ---------------------------------------------------------------------
  var audioCtx = null;
  function primeAudio() {
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx && Ctor) audioCtx = new Ctor();
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) {}
  }
  document.addEventListener("click", primeAudio, { once: true });
  document.addEventListener("touchstart", primeAudio, { once: true });

  function playStageChime() {
    if (!audioCtx) return;
    try {
      var now = audioCtx.currentTime;
      [660, 990].forEach(function (freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0.18;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.15);
      });
    } catch (e) {}
  }

  // Trimmed copy of app.js's shape-cipher helpers — needed to render
  // Stage 1's puzzle the same way on this page. Kept local rather than
  // shared, since app.js wraps everything in its own closure and this
  // is only two small pure functions.
  var SHAPES = {
    circle: { sides: 0 },
    triangle: { sides: 3 },
    square: { sides: 4 },
    pentagon: { sides: 5 },
    hexagon: { sides: 6 },
  };
  function polygonPoints(sides, cx, cy, r) {
    var pts = [];
    var start = -Math.PI / 2;
    for (var i = 0; i < sides; i++) {
      var angle = start + (i * 2 * Math.PI) / sides;
      pts.push((cx + r * Math.cos(angle)).toFixed(2) + "," + (cy + r * Math.sin(angle)).toFixed(2));
    }
    return pts.join(" ");
  }
  function shapeSVG(shapeKey, size) {
    size = size || 40;
    var shape = SHAPES[shapeKey];
    if (!shape) return "";
    var cx = size / 2, cy = size / 2, r = size / 2 - 3;
    var inner;
    if (shape.sides === 0) {
      inner = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" />';
    } else if (shape.sides === 4) {
      var side = r * Math.SQRT2;
      inner = '<rect x="' + (cx - side / 2) + '" y="' + (cy - side / 2) + '" width="' + side + '" height="' + side + '" />';
    } else {
      inner = '<polygon points="' + polygonPoints(shape.sides, cx, cy, r) + '" />';
    }
    return (
      '<svg class="shape-icon" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" aria-label="' + esc(shapeKey) + '">' +
      inner +
      "</svg>"
    );
  }

  function waitForRoomSync(cb) {
    if (window.CPFRoomSync) return cb();
    setTimeout(function () { waitForRoomSync(cb); }, 30);
  }

  function getRoomCodeFromUrlOrStorage() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = (params.get("room") || "").toUpperCase().trim();
    if (fromUrl) return fromUrl;
    try {
      return (localStorage.getItem(FOLLOW_KEY) || "").toUpperCase().trim() || null;
    } catch (e) {
      return null;
    }
  }
  function rememberRoomCode(code) {
    try { localStorage.setItem(FOLLOW_KEY, code); } catch (e) {}
  }
  function forgetRoomCode() {
    try { localStorage.removeItem(FOLLOW_KEY); } catch (e) {}
  }

  function init() {
    waitForRoomSync(function () {
      var code = getRoomCodeFromUrlOrStorage();
      if (code) startFollowing(code);
      else renderJoinForm();
    });
  }

  function renderJoinForm(errorMsg) {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    app.innerHTML =
      '<div class="follow-join-wrap">' +
      "<h1>Follow a Team</h1>" +
      "<p>Enter the room code your teammate shared, or scan their QR code to open this page directly.</p>" +
      '<input type="text" id="joinCodeInput" class="follow-code-input" maxlength="6" placeholder="ABCD12" autocomplete="off" autocapitalize="characters" />' +
      (errorMsg ? '<div class="error-text">' + esc(errorMsg) + "</div>" : "") +
      '<button class="btn btn--primary" id="joinBtn">Follow</button>' +
      "</div>";
    var input = document.getElementById("joinCodeInput");
    document.getElementById("joinBtn").addEventListener("click", function () {
      var code = (input.value || "").toUpperCase().trim();
      if (!code) {
        renderJoinForm("Enter a room code first.");
        return;
      }
      startFollowing(code);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") document.getElementById("joinBtn").click();
    });
  }

  function startFollowing(code) {
    primeAudio();
    rememberRoomCode(code);
    currentRoomCode = code;
    if (unsubscribe) unsubscribe();
    lastSeenStageIndex = null; // reset so the first snapshot for this room never chimes
    renderShell(null, 0, "connecting");
    unsubscribe = window.CPFRoomSync.subscribeRoom(
      code,
      function (data) {
        var stageIndex = data.stageIndex || 0;
        if (lastSeenStageIndex !== null && stageIndex !== lastSeenStageIndex) {
          playStageChime();
        }
        lastSeenStageIndex = stageIndex;
        noteStage4Start(data, stageIndex);
        renderShell(data, stageIndex, "live");
      },
      function () {
        renderShell(null, 0, "notfound");
      }
    );
  }

  function renderShell(data, stageIndex, status) {
    var teamName = data && data.teamName ? data.teamName : "your teammate";
    var statusHtml;
    if (status === "live") {
      statusHtml = '<div class="follow-status follow-status--live">● Live — following ' + esc(teamName) + "</div>";
    } else if (status === "connecting") {
      statusHtml = '<div class="follow-status">Connecting…</div>';
    } else {
      statusHtml = '<div class="follow-status follow-status--bad">Room not found — check the code and try again</div>';
    }

    app.innerHTML =
      '<div class="follow-header">' +
      '<span class="follow-header__team">' + esc(teamName) + "</span>" +
      '<button class="follow-header__switch" id="switchBtn">Follow a different team</button>' +
      "</div>" +
      statusHtml +
      '<div class="follow-body" id="followBody"></div>';

    document.getElementById("switchBtn").addEventListener("click", function () {
      forgetRoomCode();
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      history.replaceState(null, "", window.location.pathname);
      renderJoinForm();
    });

    var bodyEl = document.getElementById("followBody");
    if (status === "live") {
      renderStageBody(bodyEl, stageIndex);
    } else if (status === "connecting") {
      bodyEl.innerHTML = '<p class="follow-waiting">Connecting to the room…</p>';
    } else {
      bodyEl.innerHTML = '<button class="btn btn--primary" id="retryJoin">Try a different code</button>';
      document.getElementById("retryJoin").addEventListener("click", function () {
        forgetRoomCode();
        renderJoinForm();
      });
    }
  }

  // -----------------------------------------------------------------
  // Per-stage read-only renderers, keyed by the same view index app.js
  // uses (0 welcome | 1 stage1 | 2 stage1success | 3 gate | 4 stage2 |
  // 5 stage3 | 6 stage3b | 7 stage4 | 8 stage5 | 9 finale). Only the
  // stage index is synced — not inputs, selections, or answers already
  // entered — so this shows each stage's prompt/clue text, not the
  // leader's live progress within it.
  // -----------------------------------------------------------------
  function renderStageBody(wrap, view) {
    switch (view) {
      case 0: return renderWelcome(wrap);
      case 1: return renderStage1(wrap);
      case 2: return renderStage1Success(wrap);
      case 3: return renderGate(wrap);
      case 4: return renderStage2(wrap);
      case 5: return renderStage3Dept(wrap);
      case 5.5: return renderStage3Tiles(wrap);
      case 6: return renderStage3b(wrap);
      case 7: case 7.1: case 7.2: case 7.3: return renderStage4(wrap, view);
      case 8: return renderStage5(wrap);
      case 9: return renderFinale(wrap);
      default: return renderWelcome(wrap);
    }
  }

  // Mission-tile order shared by the leader's phone and the /follow/
  // page: a shuffle seeded by the room code, so teammates see the
  // phrases scrambled in exactly the same order as the leader. Keep this
  // identical to seededTileOrder() in the other file.
  function seededTileOrder(count, seedText) {
    var h = 2166136261;
    for (var k = 0; k < seedText.length; k++) {
      h ^= seedText.charCodeAt(k);
      h = Math.imul(h, 16777619);
    }
    var seed = h >>> 0;
    function rand() {
      seed = (seed + 0x6d2b79f5) >>> 0;
      var t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var a = [];
    for (var n = 0; n < count; n++) a.push(n);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    // Never hand out the phrases already in the right order.
    if (a.every(function (v, idx) { return v === idx; })) a.push(a.shift());
    return a;
  }

  // Stage 4A hint countdown, shared by the leader's phone and the
  // /follow/ page. Fills #s4aHint (if it's on screen) every second: a
  // countdown until hintDelaySeconds have passed since startMs, then the
  // hint itself. Re-renders just recreate #s4aHint; this keeps finding it.
  var hintTimer = null;
  function hintBoxHtml(startMs) {
    return '<div class="hint-box s4a-hint" id="s4aHint">' + hintText(startMs) + "</div>";
  }
  function hintText(startMs) {
    var ch = C.stage4.challengeA;
    var left = Math.ceil((startMs + ch.hintDelaySeconds * 1000 - Date.now()) / 1000);
    if (left <= 0) return esc(ch.hint);
    var m = Math.floor(left / 60), sec = left % 60;
    return esc(ch.hintCountdownLabel) + ' <b class="s4a-hint__clock">' + m + ":" + (sec < 10 ? "0" : "") + sec + "</b>";
  }
  function runHintCountdown(startMs) {
    if (hintTimer) clearInterval(hintTimer);
    hintTimer = setInterval(function () {
      var el = document.getElementById("s4aHint");
      if (!el) { clearInterval(hintTimer); hintTimer = null; return; }
      var html = hintText(startMs);
      if (el.innerHTML !== html) el.innerHTML = html;
    }, 1000);
  }

  function card(innerHtml, navy) {
    return '<div class="card' + (navy ? " card--navy" : "") + '">' + innerHtml + "</div>";
  }

  // Mirrors app.js's stageHeading() exactly, same content.js icon fields,
  // so a stage looks identical here as it does on the leader's phone.
  function stageHeading(icon, text) {
    return "<h2>" + (icon ? '<span class="stage-icon" aria-hidden="true">' + icon + "</span> " : "") + esc(text) + "</h2>";
  }

  function renderWelcome(wrap) {
    var w = C.welcome;
    wrap.innerHTML = card(
      "<span class=\"eyebrow\">" + esc(w.heading) + "</span>" +
      w.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
      '<p class="follow-waiting">Waiting for your teammate to tap Start…</p>',
      true
    );
  }

  function renderStage1(wrap) {
    var s = C.stage1;
    var legendHtml = s.legend
      .map(function (item) {
        return '<div class="shape-legend__item">' + shapeSVG(item.shape) + '<span class="shape-legend__eq">= ' + esc(item.label) + "</span></div>";
      })
      .join("");
    var groupsHtml = s.puzzleGroups
      .map(function (group, gi) {
        var icons = group.map(function (k) { return shapeSVG(k); }).join("");
        var op = gi < s.puzzleGroups.length - 1 ? '<div class="shape-op">+</div>' : '<div class="shape-op">=</div>';
        return '<div class="shape-group">' + icons + "</div>" + op;
      })
      .join("");
    wrap.innerHTML = card(
      stageHeading(s.icon, s.title) +
      "<p>" + esc(s.intro) + "</p>" +
      '<div class="shape-legend">' + legendHtml + "</div>" +
      '<div class="shape-puzzle">' + groupsHtml + '<div class="shape-op shape-op--query">?</div></div>' +
      '<p class="follow-waiting">Solving on the leader’s phone…</p>'
    );
  }

  function renderStage1Success(wrap) {
    var s = C.stage1;
    var digits = s.lockCode.split("").map(function (d) { return '<div class="lock-code__digit">' + esc(d) + "</div>"; }).join("");
    wrap.innerHTML = card(
      stageHeading(s.icon, s.successHeading) +
      '<div class="lock-code">' + digits + "</div>" +
      (s.foundingReveal ? '<p class="success-banner">' + esc(s.foundingReveal) + "</p>" : "") +
      "<p>" + esc(s.lockInstruction) + "</p>",
      true
    );
  }

  function renderGate(wrap) {
    var g = C.gate;
    wrap.innerHTML = card(
      stageHeading(g.icon, g.heading) +
      "<p>" + esc(g.body) + "</p>" +
      '<p class="follow-waiting">Waiting for the password from the lock…</p>'
    );
  }

  function renderStage2(wrap) {
    var s = C.stage2;
    var emailsHtml = s.emails
      .map(function (email) {
        var paras = email.paragraphs.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
        return (
          '<div class="email-open" style="margin-bottom:14px">' +
          '<div class="email-open__subject">' + esc(email.subject) + "</div>" +
          '<div class="email-open__from">' + esc(email.from) + " · " + esc(email.time) + "</div>" +
          paras +
          "</div>"
        );
      })
      .join("");
    wrap.innerHTML = card(stageHeading(s.icon, s.title) + "<p>" + esc(s.intro) + "</p>") + emailsHtml;
  }

  // Stage 3 is split into two synced sub-stages (5 and 5.5, see app.js's
  // syncRoomStage(5.5) call) so the tile phrases only appear for
  // followers once the leader has actually solved the department
  // challenge — matching what the leader's own screen shows at each
  // point (it swaps from the dept grid to the tiles too, never both).
  function renderStage3Dept(wrap) {
    var s = C.stage3;
    var dc = s.deptChallenge;
    var deptHtml = dc.departments
      .map(function (d) { return '<label class="dept-item"><span class="dept-code">' + esc(d.code) + "</span></label>"; })
      .join("");
    wrap.innerHTML =
      card(
        (dc.eyebrow ? '<span class="eyebrow">' + esc(dc.eyebrow) + "</span>" : "") +
        stageHeading(s.icon, dc.title || s.title) +
        "<p>" + esc(dc.question) + "</p>" +
        "<p>" + esc(dc.instructions) + "</p>" +
        '<div class="dept-grid follow-dept-grid">' + deptHtml + "</div>"
      ) +
      logoTaskCard();
  }

  // The 3B logo description stays on followers' phones through the rest
  // of Stage 3 (tiles, and the photo step), since whoever is drawing is
  // usually a follower and may still need it after the leader solves 3A.
  function logoTaskCard() {
    var lt = C.stage3.logoTask;
    var cluesHtml = lt.clues.map(function (c) { return '<div class="clue-item">' + esc(c) + "</div>"; }).join("");
    return card(
      '<span class="eyebrow">' + esc(lt.eyebrow) + "</span>" +
      "<h3>" + esc(lt.heading) + "</h3>" +
      "<p>" + esc(lt.intro) + "</p>" +
      '<div class="clue-list">' + cluesHtml + "</div>" +
      "<p>" + esc(lt.note) + "</p>",
      true
    );
  }

  function renderStage3Tiles(wrap) {
    var s = C.stage3;
    // Scrambled in the same order as the leader's screen (seeded by the
    // room code), never in the correct order.
    var tilesHtml = seededTileOrder(s.tiles.length, currentRoomCode || "")
      .map(function (i) { return '<button class="tile" disabled>' + esc(s.tiles[i]) + "</button>"; })
      .join("");
    var correctDeptCodes = s.deptChallenge.departments
      .filter(function (d) { return d.correct; })
      .map(function (d) { return d.code; })
      .join(", ");
    wrap.innerHTML = card(
      stageHeading(s.icon, s.title) +
      '<div class="success-banner">' + esc(s.deptSuccessLabel) + " " + esc(correctDeptCodes) + "</div>" +
      "<p>" + esc(s.intro) + "</p>" +
      '<div class="field-label">Phrases to piece together (not shown in order)</div>' +
      '<div class="tile-row">' + tilesHtml + "</div>"
    ) + logoTaskCard();
  }

  function renderStage3b(wrap) {
    var s = C.stage3b;
    wrap.innerHTML = card(
      stageHeading(s.icon, s.title) +
      '<p class="follow-waiting">Your team is photographing their logo drawing now…</p>',
      true
    ) + logoTaskCard();
  }

  // view is 7 (neither solved), 7.1 (A only), 7.2 (B only), or 7.3
  // (both) — see app.js's stage4SubIndex(). The actual correct values
  // are already static in content.js (challengeA/B.answer), same as
  // Stage 1's lock code or Stage 5's words, so there's nothing per-team
  // to sync beyond which half is solved — the reveal itself just reads
  // from content.js once that's known.
  function renderStage4(wrap, view) {
    var s = C.stage4;
    var aOk = view === 7.1 || view === 7.3;
    var bOk = view === 7.2 || view === 7.3;

    // Unlike the leader's screen, a challenge with a "link" (Stage 4B)
    // gets a direct "Open" button here instead of its QR — followers are
    // already on their own phone, so scanning a code off their own
    // screen would be a pointless extra step.
    function challengeCard(challenge, solved) {
      var revealHtml = solved ? '<div class="success-banner">Confirmed: ' + esc(challenge.answer) + "</div>" : "";
      if (challenge.link) {
        var href = "../" + challenge.link;
        return card(
          '<span class="eyebrow">' + esc(challenge.label) + "</span>" +
          "<p>" + esc(challenge.followPrompt || challenge.prompt || "") + "</p>" +
          '<a class="btn btn--primary follow-direct-link" href="' + esc(href) + '" target="_blank" rel="noopener">Open the Code Maze ↗</a>' +
          revealHtml
        );
      }
      var bodyHtml = challenge.steps
        ? "<ol>" + challenge.steps.map(function (st) { return "<li>" + esc(st) + "</li>"; }).join("") + "</ol>"
        : "<p>" + esc(challenge.prompt) + "</p>";
      var hintHtml = challenge.hint && !solved ? hintBoxHtml(stage4StartMs()) : "";
      return card('<span class="eyebrow">' + esc(challenge.label) + "</span>" + bodyHtml + revealHtml + hintHtml);
    }

    var summary = s.summaryTemplate
      .replace("{members}", aOk ? s.challengeA.answer : "_._")
      .replace("{projects}", bOk ? s.challengeB.answer : "__");

    wrap.innerHTML =
      card(stageHeading(s.icon, s.title) + "<p>" + esc(s.intro) + "</p>") +
      challengeCard(s.challengeA, aOk) +
      challengeCard(s.challengeB, bOk) +
      card('<div class="number-summary">' + esc(summary) + "</div>", true);
    if (!aOk) runHintCountdown(stage4StartMs());
  }

  // When this team reached Stage 4, for the 4A hint countdown. If the
  // snapshot is the one that moved the room to Stage 4 (stageIndex
  // exactly 7), its server timestamp is the true start, matching the
  // leader's clock. Otherwise (joined mid-stage) fall back to the first
  // time this phone saw Stage 4. Remembered per room so a reload
  // doesn't restart the countdown.
  function noteStage4Start(data, stageIndex) {
    if (stageIndex < 7 || stageIndex >= 8) return;
    var saved = readStage4Start();
    var fromServer = stageIndex === 7 && data.updatedAt && data.updatedAt.toMillis ? data.updatedAt.toMillis() : null;
    if (saved && !fromServer) return;
    try {
      localStorage.setItem(S4_START_KEY, JSON.stringify({ room: currentRoomCode, t: fromServer || (saved || Date.now()) }));
    } catch (e) { /* storage unavailable: countdown runs from page load */ }
  }
  function readStage4Start() {
    try {
      var v = JSON.parse(localStorage.getItem(S4_START_KEY) || "null");
      return v && v.room === currentRoomCode ? v.t : null;
    } catch (e) { return null; }
  }
  var pageLoadedAt = Date.now();
  function stage4StartMs() {
    return readStage4Start() || pageLoadedAt;
  }

  function renderStage5(wrap) {
    var s = C.stage5;
    wrap.innerHTML = card(
      stageHeading(s.icon, s.title) +
      "<p>" + esc(s.intro) + "</p>" +
      "<p>" + esc(s.hint) + "</p>" +
      '<div class="hint-box">' + esc(s.colorHint) + "</div>"
    );
  }

  function renderFinale(wrap) {
    var f = C.finale;
    wrap.innerHTML = card(stageHeading(f.icon, f.heading) + "<p>" + esc(f.subheading) + "</p>", true);
  }

  init();
})();
