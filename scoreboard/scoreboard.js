/**
 * scoreboard.js — facilitator live scoreboard (/scoreboard/).
 *
 * Lists every room created today (or on ?date=YYYY-MM-DD) and shows
 * each team as a lane: a pixel runner moving along a five-stage track,
 * a running timer, and big announcements as teams solve each stage.
 *
 * Reads the same room docs the follow page does (room-sync.js). The
 * only writes are hidden:true/false when a team is dropped or restored.
 * Drops and added teams are also remembered on this device, so the
 * page still works if the Firestore rules haven't been updated to allow
 * the hidden field (see the facilitator guide).
 *
 * ?demo=1 runs a self-playing demo with made-up teams and no network,
 * for rehearsing or checking the projector.
 */
(function () {
  "use strict";

  var C = window.CPF_CONTENT;
  var STORE_KEY = "cpf_scoreboard_v1";
  var params = new URLSearchParams(window.location.search);
  var DEMO = params.get("demo") === "1";

  // ------------------------------------------------------------------
  // Team colours: the figure's hands and feet, and the lane's accents.
  // Handed out in the order teams joined, so up to four teams never
  // share one.
  // ------------------------------------------------------------------
  var TEAM_COLORS = ["#2f8fe8", "#e2497f", "#23a66b", "#ef8a1f", "#8a5cf0", "#11a3a6", "#d9534f", "#c9a227"];
  var colorOf = {};
  var colorsUsed = 0;
  function hashCode(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function teamColor(code) {
    if (!colorOf[code]) colorOf[code] = TEAM_COLORS[colorsUsed++ % TEAM_COLORS.length];
    return colorOf[code];
  }

  // ------------------------------------------------------------------
  // Stages. stageIndex uses app.js's view numbers: 0 welcome/invite,
  // 1 stage 1, 2 code cracked, 3 password, 4 stage 2, 5 stage 3A,
  // 5.5 mission tiles, 6 logo photo, 7 / 7.1 / 7.2 / 7.3 stage 4 (A, B
  // solved), 8 stage 5, 9 finished.
  // ------------------------------------------------------------------
  var ZONES = [
    { icon: C.stage1.icon, name: "Passcode" },
    { icon: C.stage2.icon, name: "Emails" },
    { icon: C.stage3.icon, name: "Mission" },
    { icon: C.stage4.icon, name: "Numbers" },
    { icon: C.stage5.icon, name: "Key words" },
  ];
  // Where the runner stands (percent of the track) at each stageIndex.
  function progressPct(si) {
    if (si >= 9) return 100;
    if (si >= 8) return 84;
    if (si >= 7.3) return 77;
    if (si >= 7.1) return 70;
    if (si >= 7) return 63;
    if (si >= 6) return 55;
    if (si >= 5.5) return 49;
    if (si >= 5) return 43;
    if (si >= 4) return 24;
    if (si >= 3) return 16;
    if (si >= 2) return 12;
    if (si >= 1) return 4;
    return 0;
  }
  function zoneOf(si) {
    if (si >= 9) return 5;
    if (si >= 8) return 4;
    if (si >= 7) return 3;
    if (si >= 5) return 2;
    if (si >= 4) return 1;
    if (si >= 1) return 0;
    return -1;
  }
  function stage4Parts(si) {
    return { a: si === 7.1 || si === 7.3, b: si === 7.2 || si === 7.3 };
  }
  // Label under the team name, and the words the runner's bubble cycles
  // through. Deliberately never shows an answer: this is on a projector.
  function stageStatus(si) {
    if (si >= 9) return { label: "<b>Slides rebuilt</b>", verbs: ["Mission complete!", "Slides rebuilt!", "Briefing ready!"] };
    if (si >= 8) return { label: "<b>Stage 5</b> · Key words", verbs: ["Solving crosswords…", "Unscrambling…", "Deducing…"] };
    if (si >= 7) {
      var p = stage4Parts(si);
      var chips = chip("4A", p.a) + chip("4B", p.b);
      var verbs = p.a && !p.b ? ["Steering the maze…", "Tilting carefully…", "Dodging holes…"]
        : p.b && !p.a ? ["Searching…", "Calculating…", "Investigating…"]
        : ["Calculating…", "Steering the maze…", "Searching…"];
      return { label: "<b>Stage 4</b> · Numbers " + chips, verbs: verbs };
    }
    if (si >= 6) return { label: "<b>Stage 3</b> · Logo photo " + chip("3A", true) + chip("3B", false), verbs: ["Snapping the logo…", "Framing the shot…", "Say cheese…"] };
    if (si >= 5.5) return { label: "<b>Stage 3</b> · Mission " + chip("3A", true) + chip("3B", false), verbs: ["Rebuilding…", "Arranging phrases…", "Sketching the logo…"] };
    if (si >= 5) return { label: "<b>Stage 3</b> · Departments " + chip("3A", false) + chip("3B", false), verbs: ["Investigating…", "Checking folders…", "Sketching the logo…", "Deducing…"] };
    if (si >= 4) return { label: "<b>Stage 2</b> · Emails", verbs: ["Reading…", "Scanning emails…", "Deducing…"] };
    if (si >= 3) return { label: "<b>Stage 1</b> · Password", verbs: ["Reconnecting…", "Typing…"] };
    if (si >= 2) return { label: "<b>Stage 1</b> · The lock", verbs: ["Unlocking…", "Dialling…", "Click click…"] };
    if (si >= 1) return { label: "<b>Stage 1</b> · Passcode", verbs: ["Decoding…", "Counting sides…", "Calculating…"] };
    return { label: "Waiting at the start line", verbs: ["Ready…", "Stretching…", "Warming up…"] };
  }
  function chip(text, done) {
    return '<span class="task-chip' + (done ? " task-chip--done" : "") + '">' + text + (done ? " ✓" : "") + "</span>";
  }

  // What to announce when a team moves from prev to next.
  function announcement(prev, next, name) {
    var T = "<em>" + esc(name) + "</em>";
    if (next >= 9 && prev < 9) return { icon: "🏆", text: T + " has solved Stage 5 and rebuilt the slides!", finish: true };
    if (next >= 8 && prev < 8) return { icon: C.stage4.icon, text: T + " has solved Stage 4!" };
    if (next >= 7 && prev >= 7) {
      var a0 = stage4Parts(prev), a1 = stage4Parts(next);
      if (a1.a && !a0.a && a1.b && !a0.b) return { icon: C.stage4.icon, text: T + " has solved Stage 4A and the Code Maze!" };
      if (a1.a && !a0.a) return { icon: C.stage4.icon, text: T + " has solved Stage 4A!" };
      if (a1.b && !a0.b) return { icon: "🌀", text: T + " has escaped the Code Maze!" };
      return null;
    }
    if (next >= 7 && prev < 7) return { icon: C.stage3b.icon, text: T + " has solved Stage 3!" };
    if (next >= 6 && prev < 6) return { icon: C.stage3.icon, text: T + " has rebuilt the Mission statement!" };
    if (next >= 5.5 && prev < 5.5) return { icon: C.stage3.icon, text: T + " has found the 5 real departments!" };
    if (next >= 5 && prev < 5) return { icon: C.stage2.icon, text: T + " has solved Stage 2!" };
    if (next >= 4 && prev < 4) return { icon: C.gate.icon, text: T + " has cracked the password!" };
    if (next >= 3 && prev < 3) return { icon: "🔓", text: T + " has opened the lock!" };
    if (next >= 2 && prev < 2) return { icon: C.stage1.icon, text: T + " has solved Stage 1!" };
    if (next >= 1 && prev < 1) return { icon: "🚀", text: T + " has started the rebuild!" };
    return null;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  function esc(str) {
    var d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }
  function ms(ts) {
    if (!ts) return null;
    if (typeof ts === "number") return ts;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    return null;
  }
  function fmtDuration(msVal) {
    var s = Math.max(0, Math.floor(msVal / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var two = function (n) { return (n < 10 ? "0" : "") + n; };
    return (h ? h + ":" + two(m) : two(m)) + ":" + two(sec);
  }
  function fmtClock(d) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function loadStore() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return { added: v.added || [], dropped: v.dropped || [] };
    } catch (e) { return { added: [], dropped: [] }; }
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* private mode: this screen only */ }
  }

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  var store = loadStore();
  var dayRooms = {};     // code -> room, from the day query
  var addedRooms = {};   // code -> room, from teams added by code
  var addedSubs = {};    // code -> unsubscribe
  var lastStage = {};    // code -> stageIndex last rendered, for announcements
  var firstDataSeen = false;
  var lanes = {};        // code -> lane DOM refs
  var tick = 0;
  var soundOn = false;

  var el = {
    lanes: document.getElementById("sbLanes"),
    toasts: document.getElementById("sbToasts"),
    feed: document.getElementById("sbFeed"),
    clock: document.getElementById("sbClock"),
    date: document.getElementById("sbDate"),
    counts: document.getElementById("sbCounts"),
    status: document.getElementById("sbStatus"),
    panel: document.getElementById("sbPanel"),
    panelList: document.getElementById("panelList"),
    addMsg: document.getElementById("addMsg"),
    rulesMsg: document.getElementById("rulesMsg"),
  };

  function dayRange() {
    var d = params.get("date");
    var start;
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      var p = d.split("-");
      start = new Date(+p[0], +p[1] - 1, +p[2]);
    } else {
      var now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return { start: start, end: end };
  }

  function isDropped(room) {
    return room.hidden === true || store.dropped.indexOf(room.code) !== -1;
  }
  function allRooms() {
    var map = {};
    Object.keys(dayRooms).forEach(function (c) { map[c] = dayRooms[c]; });
    Object.keys(addedRooms).forEach(function (c) { map[c] = addedRooms[c]; });
    return Object.keys(map).map(function (c) { return map[c]; });
  }
  function visibleRooms() {
    return allRooms().filter(function (r) { return !isDropped(r); });
  }

  // Timer: from the leader phone's own start/finish times when the room
  // has them; otherwise estimated (room created / last update).
  var INACTIVE_MS = 90 * 60 * 1000;
  function timing(room) {
    var si = room.stageIndex || 0;
    var start = room.startedAtMs || null, approx = false;
    if (!start && si >= 1) { start = ms(room.createdAt); approx = true; }
    var end = room.finishedAtMs || null;
    if (!end && si >= 9) { end = ms(room.updatedAt); approx = approx || !room.finishedAtMs; }
    if (!start) return { text: "--:--", elapsed: null, approx: false };
    // A team whose phone hasn't moved on for 90 minutes has almost
    // certainly stopped (a test, or an abandoned game): freeze its clock
    // at its last update instead of letting it run for hours.
    var last = ms(room.updatedAt);
    var inactive = !end && last && Date.now() - last > INACTIVE_MS;
    if (inactive) end = Math.max(last, start);
    var elapsed = (end || Date.now()) - start;
    return { text: fmtDuration(elapsed), elapsed: elapsed, approx: approx, done: !!end, inactive: inactive };
  }

  function rankSort(a, b) {
    var sa = a.stageIndex || 0, sb = b.stageIndex || 0;
    if (sa >= 9 && sb >= 9) return (timing(a).elapsed || 0) - (timing(b).elapsed || 0);
    if (sa !== sb) {
      // Stage 4's 7.1 and 7.2 are equally far along.
      var pa = progressPct(sa), pb = progressPct(sb);
      if (pa !== pb) return pb - pa;
    }
    var ua = ms(a.updatedAt) || 0, ub = ms(b.updatedAt) || 0;
    if (ua !== ub) return ua - ub;
    return (a.teamName || "").localeCompare(b.teamName || "");
  }

  // ------------------------------------------------------------------
  // Lanes
  // ------------------------------------------------------------------
  function buildLane(room) {
    var color = teamColor(room.code);
    var node = document.createElement("div");
    node.className = "lane";
    node.style.setProperty("--team", color);
    var zonesHtml = ZONES.map(function (z, i) {
      return '<div class="track__zone" data-zone="' + i + '">' + z.icon + ' <span class="track__zone-name">' + (i + 1) + " · " + esc(z.name) + "</span></div>";
    }).join("");
    var pipsHtml = [20, 40, 60, 80].map(function (p, i) {
      return '<span class="track__pip" data-pip="' + i + '" style="left:' + p + '%"></span>';
    }).join("");
    node.innerHTML =
      '<div class="lane__rank"></div>' +
      '<div class="lane__info">' +
      '<div class="lane__name"><span class="lane__dot"></span><span class="lane__name-text"></span></div>' +
      '<div class="lane__timer"></div>' +
      '<div class="lane__stage"></div>' +
      "</div>" +
      '<div class="track"><div class="track__inner">' +
      '<div class="track__road"><div class="track__fill"></div></div>' +
      '<span class="track__start"></span>' + pipsHtml +
      '<span class="track__flag">🏁</span>' +
      '<div class="track__zones">' + zonesHtml + "</div>" +
      '<div class="runner" data-pose="rest"><div class="runner__bubble"></div>' + window.CPFFigure.svg(color) + "</div>" +
      "</div></div>";
    return {
      node: node,
      rank: node.querySelector(".lane__rank"),
      name: node.querySelector(".lane__name-text"),
      timer: node.querySelector(".lane__timer"),
      stage: node.querySelector(".lane__stage"),
      fill: node.querySelector(".track__fill"),
      runner: node.querySelector(".runner"),
      bubble: node.querySelector(".runner__bubble"),
      pips: node.querySelectorAll(".track__pip"),
      zones: node.querySelectorAll(".track__zone"),
      shownStage: null,
      shownRank: null,
      verb: "",
      say: "",        // one-off bubble text during an animation
      busy: false,    // mid-animation: don't change pose underneath it
      timers: [],
      sparkles: null,
    };
  }

  // The pose a team settles into: resting at the start (or when
  // inactive), thinking while on a stage, celebrating once finished.
  function basePose(refs, si) {
    if (refs.node.classList.contains("lane--inactive") || si < 1) return "rest";
    if (si >= 9) return "cheer";
    return "think";
  }
  function setPose(refs, pose, say) {
    refs.runner.setAttribute("data-pose", pose);
    refs.say = say || "";
    refs.verb = "";
    updateBubble(refs, refs.shownStage || 0);
  }
  function later(refs, delay, fn) {
    refs.timers.push(setTimeout(fn, delay));
  }
  function clearLater(refs) {
    refs.timers.forEach(clearTimeout);
    refs.timers = [];
  }
  // Moves the runner and the gold fill to pct; animate=false jumps there.
  function placeRunner(refs, pct, animate) {
    refs.node.classList.toggle("lane--instant", !animate);
    refs.runner.style.left = pct + "%";
    refs.fill.style.width = pct + "%";
    refs.runner.classList.toggle("runner--at-start", pct < 8);
    refs.runner.classList.toggle("runner--at-end", pct > 92);
    if (!animate) {
      void refs.node.offsetWidth;
      refs.node.classList.remove("lane--instant");
    }
  }

  function updateLane(refs, room, rank, isNew) {
    var si = room.stageIndex || 0;
    var pct = progressPct(si);
    var status = stageStatus(si);
    refs.rank.textContent = rank;
    refs.rank.className = "lane__rank" + (rank <= 3 && si >= 1 ? " lane__rank--" + rank : "");
    refs.name.textContent = room.teamName || room.code;
    refs.node.title = "Room " + room.code;
    refs.node.classList.toggle("lane--waiting", si < 1);
    refs.node.classList.toggle("lane--finished", si >= 9);

    // Overtaken while standing still: a startled stumble.
    var overtaken = refs.shownRank !== null && rank > refs.shownRank && refs.shownStage === si && !refs.busy && si >= 1 && si < 9;
    refs.shownRank = rank;

    if (refs.shownStage !== si) {
      var prevStage = refs.shownStage;
      refs.stage.innerHTML = (zoneOf(si) >= 0 && si < 9 ? ZONES[zoneOf(si)].icon + " " : si >= 9 ? "🏆 " : "⏳ ") + status.label;
      var zone = zoneOf(si);
      refs.shownStage = si;
      clearLater(refs);
      if (prevStage === null) {
        // First time on the board: jump straight to where the team is.
        placeRunner(refs, pct, false);
        refs.busy = false;
        if (isNew && firstDataSeen && si < 1) {
          refs.busy = true;
          setPose(refs, "yay", "Hello!");
          later(refs, 1800, function () { refs.busy = false; setPose(refs, basePose(refs, si)); });
        } else {
          setPose(refs, basePose(refs, si));
        }
      } else if (progressPct(prevStage) !== pct) {
        // Solved something: surprised, then run to the new spot.
        refs.busy = true;
        setPose(refs, "jolt", si >= 9 ? "Done!!" : "Got it!");
        later(refs, 900, function () {
          placeRunner(refs, pct, true);
          setPose(refs, "run", si >= 9 ? "Final sprint!" : "On my way!");
        });
        later(refs, 900 + 2400, function () {
          refs.busy = false;
          setPose(refs, basePose(refs, si));
        });
      } else {
        setPose(refs, basePose(refs, si));
      }
      var paint = function () {
        Array.prototype.forEach.call(refs.pips, function (p, i) { p.classList.toggle("track__pip--done", zone > i); });
        Array.prototype.forEach.call(refs.zones, function (z, i) {
          z.classList.toggle("track__zone--done", zone > i);
          z.classList.toggle("track__zone--current", zone === i);
        });
        if (si >= 9 && !refs.sparkles) {
          refs.sparkles = document.createElement("div");
          refs.sparkles.className = "lane__sparkles";
          refs.sparkles.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i>";
          refs.node.appendChild(refs.sparkles);
        }
      };
      if (refs.busy && prevStage !== null) later(refs, 900, paint); else paint();
    } else if (overtaken) {
      refs.busy = true;
      setPose(refs, "stumble", "Whoa!");
      later(refs, 1500, function () { refs.busy = false; setPose(refs, basePose(refs, si)); });
    }
    updateBubble(refs, si);
    updateTimer(refs, room);
  }

  function updateBubble(refs, si) {
    var verb;
    if (refs.say) verb = refs.say;
    else if (refs.node.classList.contains("lane--inactive")) verb = "Zzz…";
    else {
      var verbs = stageStatus(si).verbs;
      var offset = refs.node.dataset.offset ? +refs.node.dataset.offset : 0;
      verb = verbs[(Math.floor(tick / 4) + offset) % verbs.length];
    }
    if (verb !== refs.verb) {
      refs.bubble.textContent = verb;
      refs.bubble.classList.remove("runner__bubble--swap");
      void refs.bubble.offsetWidth;
      refs.bubble.classList.add("runner__bubble--swap");
      refs.verb = verb;
    }
  }

  function updateTimer(refs, room) {
    var t = timing(room);
    var html = (t.approx ? '<span class="lane__approx" title="Estimated: this team\'s phone hasn\'t reported its exact start time">≈</span>' : "") + t.text;
    if ((room.stageIndex || 0) >= 9) html += '<span class="lane__timer-tag">Finished</span>';
    else if (t.inactive) html += '<span class="lane__timer-tag lane__timer-tag--idle">Inactive</span>';
    if (refs.timer.innerHTML !== html) refs.timer.innerHTML = html;
    var wasInactive = refs.node.classList.contains("lane--inactive");
    if (!!t.inactive !== wasInactive) {
      refs.node.classList.toggle("lane--inactive", !!t.inactive);
      if (!refs.busy) setPose(refs, basePose(refs, room.stageIndex || 0));
    }
  }

  function render() {
    var rooms = visibleRooms().sort(rankSort);
    // Colours go to teams in the order they joined.
    rooms.slice().sort(function (a, b) { return (ms(a.createdAt) || 0) - (ms(b.createdAt) || 0); })
      .forEach(function (r) { teamColor(r.code); });
    var finished = rooms.filter(function (r) { return (r.stageIndex || 0) >= 9; }).length;
    el.counts.textContent = rooms.length + (rooms.length === 1 ? " team" : " teams") + (finished ? " · " + finished + " finished" : "");

    // Announce stage changes (never on the first load, or for a team
    // that's only just appeared on the board).
    rooms.forEach(function (room) {
      var si = room.stageIndex || 0;
      var prev = lastStage[room.code];
      if (firstDataSeen && prev !== undefined && si > prev) {
        var a = announcement(prev, si, room.teamName || room.code);
        if (a) announce(a, room);
        if (lanes[room.code]) flash(lanes[room.code].node);
      } else if (firstDataSeen && prev === undefined && si < 1) {
        announce({ icon: "👋", text: "<em>" + esc(room.teamName || room.code) + "</em> has joined the briefing!" }, room, true);
      }
      lastStage[room.code] = si;
    });

    if (!rooms.length) {
      Object.keys(lanes).forEach(function (c) { lanes[c].node.remove(); delete lanes[c]; });
      if (!el.lanes.querySelector(".sb-empty")) {
        el.lanes.innerHTML =
          '<div class="sb-empty"><div class="runner" data-pose="rest">' + window.CPFFigure.svg(TEAM_COLORS[0]) + "</div>" +
          "<h2>Waiting for teams</h2><p>Teams appear here as soon as their leader names the team in the game.</p></div>";
      }
      return;
    }
    var empty = el.lanes.querySelector(".sb-empty");
    if (empty) empty.remove();

    // FLIP: remember where each lane was, reorder, then animate from
    // the old spot so overtakes slide instead of jumping.
    var before = {};
    Object.keys(lanes).forEach(function (c) { before[c] = lanes[c].node.getBoundingClientRect().top; });
    var keep = {};
    rooms.forEach(function (room, i) {
      var refs = lanes[room.code], isNew = false;
      if (!refs) {
        refs = lanes[room.code] = buildLane(room);
        refs.node.dataset.offset = String(hashCode(room.code) % 3);
        isNew = true;
      }
      keep[room.code] = true;
      el.lanes.appendChild(refs.node);
      updateLane(refs, room, i + 1, isNew);
    });
    Object.keys(lanes).forEach(function (c) {
      if (!keep[c]) { lanes[c].node.remove(); delete lanes[c]; }
    });
    Object.keys(lanes).forEach(function (c) {
      if (before[c] === undefined) return;
      var dy = before[c] - lanes[c].node.getBoundingClientRect().top;
      if (Math.abs(dy) < 2) return;
      var n = lanes[c].node;
      n.style.transition = "none";
      n.style.transform = "translateY(" + dy + "px)";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          n.style.transition = "transform 0.8s cubic-bezier(0.3, 0.9, 0.3, 1)";
          n.style.transform = "";
        });
      });
    });
    if (!el.panel.hidden) renderPanel();
  }

  function flash(node) {
    node.classList.remove("lane--flash");
    void node.offsetWidth;
    node.classList.add("lane--flash");
  }

  // ------------------------------------------------------------------
  // Announcements: a big banner (queued, one at a time) + the feed.
  // ------------------------------------------------------------------
  var toastQueue = [];
  var toastShowing = false;
  function announce(a, room, quiet) {
    var t = timing(room);
    var sub = a.finish && t.elapsed !== null ? "Finished in " + (t.approx ? "about " : "") + t.text : t.elapsed !== null && !quiet ? "Time so far " + t.text : "";
    toastQueue.push({ icon: a.icon, text: a.text, sub: sub, finish: !!a.finish });
    addFeed(a.icon + " " + a.text);
    if (!toastShowing) nextToast();
  }
  function nextToast() {
    var item = toastQueue.shift();
    if (!item) { toastShowing = false; return; }
    toastShowing = true;
    var node = document.createElement("div");
    node.className = "toast" + (item.finish ? " toast--finish" : "");
    node.innerHTML = '<div class="toast__icon">' + item.icon + "</div><div><div class=\"toast__text\">" + item.text + "</div>" +
      (item.sub ? '<div class="toast__sub">' + esc(item.sub) + "</div>" : "") + "</div>";
    el.toasts.appendChild(node);
    playChime(item.finish);
    var hold = item.finish ? 6500 : toastQueue.length ? 2600 : 4200;
    setTimeout(function () {
      node.classList.add("toast--out");
      setTimeout(function () { node.remove(); nextToast(); }, 400);
    }, hold);
  }
  function addFeed(html) {
    var empty = el.feed.querySelector(".sb-feed__empty");
    if (empty) empty.remove();
    var item = document.createElement("span");
    item.className = "sb-feed__item sb-feed__item--new";
    item.innerHTML = "<time>" + fmtClock(new Date()) + "</time>" + html;
    el.feed.insertBefore(item, el.feed.firstChild);
    while (el.feed.children.length > 12) el.feed.removeChild(el.feed.lastChild);
  }

  // Chime: same idea as the follow page, a bit grander for a finish.
  var audioCtx = null;
  function playChime(big) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var notes = big ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 987.77];
      var now = audioCtx.currentTime;
      notes.forEach(function (f, i) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "triangle"; o.frequency.value = f;
        var t0 = now + i * 0.12;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t0); o.stop(t0 + 0.55);
      });
    } catch (e) { /* no audio */ }
  }

  // ------------------------------------------------------------------
  // Drop / add teams
  // ------------------------------------------------------------------
  function dropTeam(code) {
    if (store.dropped.indexOf(code) === -1) store.dropped.push(code);
    saveStore();
    render();
    if (!DEMO && window.CPFRoomSync && window.CPFRoomSync.setRoomHidden) {
      window.CPFRoomSync.setRoomHidden(code, true).catch(function () { rulesRefused(); });
    }
  }
  function restoreTeam(code) {
    store.dropped = store.dropped.filter(function (c) { return c !== code; });
    saveStore();
    var room = dayRooms[code] || addedRooms[code];
    if (room && room.hidden && !DEMO && window.CPFRoomSync) {
      window.CPFRoomSync.setRoomHidden(code, false).catch(function () { rulesRefused(); });
    }
    render();
  }
  function rulesRefused() {
    el.rulesMsg.className = "sb-panel__msg sb-panel__msg--warn";
    el.rulesMsg.textContent = "Dropped on this screen only. To drop teams on every screen, and to show exact timers, update the Firestore rules as described in the facilitator guide.";
  }
  function addTeam(code) {
    code = (code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    el.addMsg.className = "sb-panel__msg";
    if (code.length !== 6) { el.addMsg.className += " sb-panel__msg--bad"; el.addMsg.textContent = "Room codes are 6 characters."; return; }
    if (store.added.indexOf(code) === -1) store.added.push(code);
    var wasDropped = store.dropped.indexOf(code) !== -1 || (dayRooms[code] && dayRooms[code].hidden);
    saveStore();
    if (wasDropped) restoreTeam(code);
    if (dayRooms[code] && !wasDropped) { el.addMsg.textContent = (dayRooms[code].teamName || code) + " is already on the board."; return; }
    el.addMsg.textContent = "Looking up " + code + "…";
    watchAdded(code, true);
  }
  function removeAdded(code) {
    store.added = store.added.filter(function (c) { return c !== code; });
    saveStore();
    if (addedSubs[code]) { addedSubs[code](); delete addedSubs[code]; }
    delete addedRooms[code];
    render();
  }
  function watchAdded(code, reportBack) {
    if (DEMO) {
      if (reportBack) el.addMsg.textContent = "Adding by code needs the live board (it's off in demo mode).";
      return;
    }
    if (addedSubs[code] || !window.CPFRoomSync) return;
    addedSubs[code] = window.CPFRoomSync.subscribeRoom(code, function (data) {
      addedRooms[code] = Object.assign({ code: code }, data);
      if (reportBack) { el.addMsg.textContent = "Added " + (data.teamName || code) + "."; reportBack = false; }
      render();
    }, function () {
      if (reportBack) {
        el.addMsg.className = "sb-panel__msg sb-panel__msg--bad";
        el.addMsg.textContent = "No team found with room code " + code + ".";
        removeAdded(code);
      }
    });
  }

  function renderPanel() {
    var rooms = allRooms().sort(function (a, b) { return (ms(a.createdAt) || 0) - (ms(b.createdAt) || 0); });
    var shown = rooms.filter(function (r) { return !isDropped(r); });
    var dropped = rooms.filter(isDropped);
    function row(r, isDrop) {
      var created = ms(r.createdAt);
      var meta = r.code + " · " + (created ? "joined " + fmtClock(new Date(created)) : "") + " · " + (zoneOf(r.stageIndex || 0) >= 0 ? ((r.stageIndex || 0) >= 9 ? "finished" : "stage " + (zoneOf(r.stageIndex) + 1)) : "not started");
      var fromOtherDay = addedRooms[r.code] && !dayRooms[r.code];
      var btn = isDrop
        ? '<button class="sb-btn sb-btn--small sb-btn--restore" data-restore="' + r.code + '">Restore</button>'
        : fromOtherDay
          ? '<button class="sb-btn sb-btn--small sb-btn--drop" data-unadd="' + r.code + '">Remove</button>'
          : '<button class="sb-btn sb-btn--small sb-btn--drop" data-drop="' + r.code + '">Drop</button>';
      return '<div class="team-row' + (isDrop ? " team-row--dropped" : "") + '">' +
        '<span class="team-row__dot" style="background:' + teamColor(r.code) + '"></span>' +
        "<div><div class=\"team-row__name\">" + esc(r.teamName || r.code) + '</div><div class="team-row__meta">' + esc(meta) + "</div></div>" + btn + "</div>";
    }
    el.panelList.innerHTML =
      (shown.length ? shown.map(function (r) { return row(r, false); }).join("") : '<div class="sb-panel__none">No teams on the board.</div>') +
      (dropped.length ? '<div class="sb-panel__group">Dropped</div>' + dropped.map(function (r) { return row(r, true); }).join("") : "");
  }

  el.panelList.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.drop) dropTeam(b.dataset.drop);
    else if (b.dataset.restore) restoreTeam(b.dataset.restore);
    else if (b.dataset.unadd) removeAdded(b.dataset.unadd);
    renderPanel();
  });
  document.getElementById("manageBtn").addEventListener("click", function () {
    renderPanel();
    el.panel.hidden = false;
  });
  document.getElementById("panelClose").addEventListener("click", function () { el.panel.hidden = true; });
  el.panel.addEventListener("click", function (e) { if (e.target === el.panel) el.panel.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") el.panel.hidden = true; });
  document.getElementById("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("addInput");
    addTeam(input.value);
    input.value = "";
  });
  var soundBtn = document.getElementById("soundBtn");
  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔔 Sound on" : "🔕 Sound off";
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    if (soundOn) playChime(false);
  });
  document.getElementById("fullBtn").addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  });

  // ------------------------------------------------------------------
  // Clock / timers
  // ------------------------------------------------------------------
  function everySecond() {
    tick++;
    el.clock.textContent = fmtClock(new Date());
    visibleRooms().forEach(function (room) {
      var refs = lanes[room.code];
      if (!refs) return;
      updateTimer(refs, room);
      updateBubble(refs, room.stageIndex || 0);
    });
  }

  function setStatus(kind, text) {
    el.status.className = "sb-status" + (kind ? " sb-status--" + kind : "");
    el.status.textContent = text;
  }

  // ------------------------------------------------------------------
  // Data: live Firestore, or the demo
  // ------------------------------------------------------------------
  function startLive() {
    var range = dayRange();
    el.date.textContent = range.start.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
    window.CPFRoomSync.subscribeRoomsBetween(range.start, range.end, function (rooms) {
      var next = {};
      rooms.forEach(function (r) { next[r.code] = r; });
      dayRooms = next;
      setStatus("live", "Live");
      render();
      firstDataSeen = true;
    }, function (err) {
      console.warn("scoreboard: live list failed", err);
      setStatus("bad", "Offline — retrying");
    });
    store.added.forEach(function (code) { watchAdded(code, false); });
  }

  function startDemo() {
    setStatus("demo", "Demo");
    el.date.textContent = "Demo teams";
    var names = ["Team Kaya Toast", "The Kopi Kakis", "Durian Detectives", "Satay Sleuths"];
    var path = [0, 1, 2, 3, 4, 5, 5.5, 6, 7, 7.1, 7.3, 8, 9];
    var now = Date.now();
    var demo = names.map(function (n, i) {
      var step = [6, 4, 8, 0][i];
      var started = now - (14 + i * 3) * 60000 - i * 17000;
      var room = { code: "DEMO" + String.fromCharCode(65 + i) + "Z", teamName: n, stageIndex: path[step], createdAt: started - 60000, updatedAt: now - i * 20000, startedAtMs: step ? started : null, _step: step };
      if (i === 1) room._alt = true;
      return room;
    });
    demo.forEach(function (r) { dayRooms[r.code] = r; });
    render();
    firstDataSeen = true;
    setInterval(function () {
      var pool = demo.filter(function (r) { return r._step < path.length - 1 && !isDropped(r); });
      if (!pool.length) return;
      var r = pool[Math.floor(Math.random() * pool.length)];
      r._step++;
      var si = path[r._step];
      if (si === 7.1 && r._alt) si = 7.2;
      r.stageIndex = si;
      r.updatedAt = Date.now();
      if (si >= 1 && !r.startedAtMs) r.startedAtMs = Date.now();
      if (si >= 9) r.finishedAtMs = Date.now();
      render();
    }, 3800);
  }

  function boot() {
    el.clock.textContent = fmtClock(new Date());
    setInterval(everySecond, 1000);
    if (DEMO) { startDemo(); return; }
    var tries = 0;
    (function waitForSync() {
      if (window.CPFRoomSync && window.CPFRoomSync.subscribeRoomsBetween) { startLive(); return; }
      if (++tries > 100) { setStatus("bad", "Couldn't load the live service"); return; }
      setTimeout(waitForSync, 100);
    })();
  }
  boot();
})();
