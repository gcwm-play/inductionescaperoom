/**
 * CPF Board Induction Escape Room — app logic.
 * No build step, no dependencies. Content lives in content.js.
 */
(function () {
  "use strict";

  var C = window.CPF_CONTENT;
  var STORAGE_KEY = "cpf_escape_progress_v1";

  // View indices:
  // 0 welcome | 1 stage1 | 2 stage1success | 3 gate | 4 stage2
  // 5 stage3  | 6 stage4 | 7 stage5        | 8 finale
  var STAGE_VIEW_START = [1, 4, 5, 6, 7];
  var STAGE_VIEW_END = [4, 5, 6, 7, 8];

  var app = document.getElementById("app");
  var state = loadState();
  var activeEmail = null; // ephemeral, not persisted

  init();

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  function defaultState() {
    return {
      maxUnlocked: 0,
      currentView: 0,
      startedAt: null,
      completedAt: null,
      progressData: {
        stage2: { solved: [false, false], inputs: ["", ""] },
        stage3: { placedOrder: [], shuffled: null },
        stage4: { m1: "", m2: "", p1: "" },
        stage5: { inputs: ["", "", ""], shuffled: null },
      },
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var base = defaultState();
      return Object.assign(base, parsed, {
        progressData: Object.assign(base.progressData, parsed.progressData || {}),
      });
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable — progress just won't persist */
    }
  }

  function resetAll() {
    state = defaultState();
    activeEmail = null;
    save();
    render();
  }

  function goTo(view) {
    if (view > state.maxUnlocked) view = state.maxUnlocked;
    state.currentView = view;
    save();
    render();
    window.scrollTo(0, 0);
  }

  function unlock(view) {
    state.maxUnlocked = Math.max(state.maxUnlocked, view);
    if (view >= 1 && !state.startedAt) state.startedAt = Date.now();
    if (view >= 8 && !state.completedAt) state.completedAt = Date.now();
    state.currentView = view;
    save();
    render();
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  function init() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      resetAll();
      history.replaceState(null, "", window.location.pathname);
      return;
    }
    render();
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function shuffledLetters(word) {
    var letters = word.split("");
    var attempt;
    var tries = 0;
    do {
      attempt = shuffle(letters).join("");
      tries++;
    } while (attempt === word && tries < 20);
    return attempt;
  }

  function normalize(str) {
    return (str || "").trim().toUpperCase();
  }

  function formatTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m + "m " + (s < 10 ? "0" : "") + s + "s";
  }

  function esc(str) {
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function confirmDialog(message, onConfirm) {
    var overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML =
      '<div class="confirm-box">' +
      "<p>" + esc(message) + "</p>" +
      '<button class="btn btn--primary" data-yes>Yes, continue</button>' +
      '<button class="btn btn--ghost" data-no>Cancel</button>' +
      "</div>";
    document.body.appendChild(overlay);
    overlay.querySelector("[data-yes]").addEventListener("click", function () {
      document.body.removeChild(overlay);
      onConfirm();
    });
    overlay.querySelector("[data-no]").addEventListener("click", function () {
      document.body.removeChild(overlay);
    });
  }

  function shakeEl(el) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }

  // ---------------------------------------------------------------------
  // Render root
  // ---------------------------------------------------------------------
  function render() {
    var view = state.currentView;
    var html = renderTopbar(view) + '<div class="stage-wrap" id="stageWrap"></div>';
    app.innerHTML = html;
    var wrap = document.getElementById("stageWrap");

    switch (view) {
      case 0: renderWelcome(wrap); break;
      case 1: renderStage1(wrap); break;
      case 2: renderStage1Success(wrap); break;
      case 3: renderGate(wrap); break;
      case 4: renderStage2(wrap); break;
      case 5: renderStage3(wrap); break;
      case 6: renderStage4(wrap); break;
      case 7: renderStage5(wrap); break;
      case 8: renderFinale(wrap); break;
      default: renderWelcome(wrap);
    }
  }

  function renderTopbar(view) {
    if (view === 0) {
      return (
        '<div class="topbar">' +
        '<div class="topbar__brand"><span class="badge">C</span> ' + esc(C.meta.orgName) + " · " + esc(C.meta.appTitle) + "</div>" +
        "</div>"
      );
    }
    var dots = "";
    for (var i = 0; i < 5; i++) {
      var cls = "progress-dot";
      if (view >= STAGE_VIEW_END[i]) cls += " done";
      else if (view >= STAGE_VIEW_START[i] && view < STAGE_VIEW_END[i]) cls += " active";
      dots += '<div class="' + cls + '"></div>';
    }
    var caption = view >= 8 ? "All stages complete" : "Stage " + Math.min(currentStageNumber(view), 5) + " of 5";
    return (
      '<div class="topbar">' +
      '<div class="topbar__brand"><span class="badge">C</span> ' + esc(C.meta.orgName) + "</div>" +
      '<div class="progress-track">' + dots + "</div>" +
      '<div class="progress-caption">' + caption + "</div>" +
      "</div>"
    );
  }

  function currentStageNumber(view) {
    for (var i = 0; i < 5; i++) {
      if (view < STAGE_VIEW_END[i]) return i + 1;
    }
    return 5;
  }

  // ---------------------------------------------------------------------
  // Welcome
  // ---------------------------------------------------------------------
  function renderWelcome(wrap) {
    var w = C.welcome;
    var paras = w.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    wrap.innerHTML =
      '<div class="card card--navy">' +
      '<span class="eyebrow">' + esc(w.heading) + "</span>" +
      "<h1>" + esc(C.meta.appTitle) + "</h1>" +
      paras +
      '<button class="btn btn--primary" id="startBtn" style="margin-top:10px">' + esc(w.startButton) + "</button>" +
      "</div>" +
      '<div class="footer-link">' + esc(C.meta.tagline) +
      '<br><button id="resetLink">Facilitator: reset progress</button></div>';

    document.getElementById("startBtn").addEventListener("click", function () {
      unlock(Math.max(1, state.maxUnlocked));
    });
    document.getElementById("resetLink").addEventListener("click", function () {
      confirmDialog("Reset all progress on this device? This cannot be undone.", resetAll);
    });
  }

  // ---------------------------------------------------------------------
  // Stage 1 — founding date
  // ---------------------------------------------------------------------
  function renderStage1(wrap) {
    var s = C.stage1;
    var fragments = s.fragments
      .map(function (f) {
        return (
          '<div class="fragment"><span class="fragment__year">' + esc(f.year) + "</span><p>" + esc(f.text) + "</p></div>"
        );
      })
      .join("");

    wrap.innerHTML =
      '<div class="card">' +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(s.intro) + "</p>" +
      fragments +
      '<label class="field-label" for="s1input">' + esc(s.inputLabel) + "</label>" +
      '<input type="tel" inputmode="numeric" maxlength="4" id="s1input" placeholder="' + esc(s.inputPlaceholder) + '" autocomplete="off" />' +
      '<div class="error-text" id="s1error"></div>' +
      '<button class="btn btn--primary" id="s1submit" style="margin-top:10px">Submit Code</button>' +
      "</div>";

    var input = document.getElementById("s1input");
    var errorEl = document.getElementById("s1error");
    var card = wrap.querySelector(".card");

    document.getElementById("s1submit").addEventListener("click", function () {
      var val = input.value.replace(/\D/g, "");
      if (val === s.lockCode) {
        unlock(2);
      } else {
        errorEl.textContent = "That's not quite right. Re-check the timeline fragments.";
        shakeEl(card);
      }
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") document.getElementById("s1submit").click();
    });
  }

  function renderStage1Success(wrap) {
    var s = C.stage1;
    var digits = s.lockCode
      .split("")
      .map(function (d) { return '<div class="lock-code__digit">' + esc(d) + "</div>"; })
      .join("");

    wrap.innerHTML =
      '<div class="card card--navy">' +
      "<h2>" + esc(s.successHeading) + "</h2>" +
      "<p>" + esc(s.successBody) + "</p>" +
      '<div class="lock-code">' + digits + "</div>" +
      "<p>" + esc(s.lockInstruction) + "</p>" +
      '<button class="btn btn--primary" id="toGate">' + esc(s.continueButton) + "</button>" +
      "</div>";

    document.getElementById("toGate").addEventListener("click", function () {
      unlock(3);
    });
  }

  // ---------------------------------------------------------------------
  // Gate — password from physical lock
  // ---------------------------------------------------------------------
  function renderGate(wrap) {
    var g = C.gate;
    wrap.innerHTML =
      '<div class="card">' +
      "<h2>" + esc(g.heading) + "</h2>" +
      "<p>" + esc(g.body) + "</p>" +
      '<label class="field-label" for="gateInput">' + esc(g.inputLabel) + "</label>" +
      '<input type="text" id="gateInput" placeholder="' + esc(g.inputPlaceholder) + '" autocomplete="off" autocapitalize="characters" />' +
      '<div class="error-text" id="gateError"></div>' +
      '<button class="btn btn--primary" id="gateSubmit" style="margin-top:10px">' + esc(g.submitButton) + "</button>" +
      "</div>";

    var input = document.getElementById("gateInput");
    var errorEl = document.getElementById("gateError");
    var card = wrap.querySelector(".card");

    document.getElementById("gateSubmit").addEventListener("click", function () {
      if (normalize(input.value) === normalize(g.password)) {
        unlock(4);
      } else {
        errorEl.textContent = g.errorMessage;
        shakeEl(card);
      }
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") document.getElementById("gateSubmit").click();
    });
  }

  // ---------------------------------------------------------------------
  // Stage 2 — emails
  // ---------------------------------------------------------------------
  function renderStage2(wrap) {
    var s = C.stage2;
    var pd = state.progressData.stage2;

    if (activeEmail === null) {
      var items = s.emails
        .map(function (email, i) {
          var readCls = pd.solved[i] ? " read" : "";
          return (
            '<div class="email-item' + readCls + '" data-open="' + i + '">' +
            '<div class="email-item__meta">' +
            '<div class="email-item__from">' + esc(email.from) + (pd.solved[i] ? " ✓" : "") + "</div>" +
            '<div class="email-item__subject">' + esc(email.subject) + "</div>" +
            "</div>" +
            '<div class="email-item__time">' + esc(email.time) + "</div>" +
            '<div class="email-item__chevron">›</div>' +
            "</div>"
          );
        })
        .join("");

      var allSolved = pd.solved.every(Boolean);
      wrap.innerHTML =
        '<div class="card">' +
        "<h2>" + esc(s.title) + "</h2>" +
        "<p>" + esc(s.intro) + "</p>" +
        '<div class="email-list">' + items + "</div>" +
        (allSolved
          ? '<div class="success-banner">' + esc(s.successMessage) + "</div>" +
            '<button class="btn btn--primary" id="s2continue" style="margin-top:10px">' + esc(s.continueButton) + "</button>"
          : "") +
        "</div>";

      Array.prototype.forEach.call(wrap.querySelectorAll("[data-open]"), function (el) {
        el.addEventListener("click", function () {
          activeEmail = parseInt(el.getAttribute("data-open"), 10);
          renderStage2(wrap);
        });
      });
      if (allSolved) {
        document.getElementById("s2continue").addEventListener("click", function () { unlock(5); });
      }
      return;
    }

    // Reading view
    var email = s.emails[activeEmail];
    var idx = activeEmail;
    var paras = email.paragraphs.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    var solved = pd.solved[idx];

    wrap.innerHTML =
      '<button class="btn btn--ghost btn--small" id="backToInbox">‹ Back to inbox</button>' +
      '<div class="email-open">' +
      '<div class="email-open__subject">' + esc(email.subject) + "</div>" +
      '<div class="email-open__from">' + esc(email.from) + " · " + esc(email.time) + "</div>" +
      paras +
      "</div>" +
      '<div class="card">' +
      '<label class="field-label" for="emailAnswer">' + esc(email.answerLabel) + "</label>" +
      '<input type="text" id="emailAnswer" autocomplete="off" autocapitalize="characters" value="' + esc(pd.inputs[idx] || "") + '" ' + (solved ? "disabled" : "") + " />" +
      '<div class="error-text" id="emailError"></div>' +
      (solved
        ? '<div class="success-banner">Correct — well spotted.</div>'
        : '<button class="btn btn--primary" id="emailSubmit" style="margin-top:10px">Check word</button>') +
      "</div>";

    document.getElementById("backToInbox").addEventListener("click", function () {
      activeEmail = null;
      renderStage2(wrap);
    });

    var input = document.getElementById("emailAnswer");
    input.addEventListener("input", function () {
      pd.inputs[idx] = input.value;
      save();
    });

    if (!solved) {
      var errorEl = document.getElementById("emailError");
      document.getElementById("emailSubmit").addEventListener("click", function () {
        if (normalize(input.value) === normalize(email.answer)) {
          pd.solved[idx] = true;
          save();
          activeEmail = null;
          renderStage2(wrap);
        } else {
          errorEl.textContent = "Not quite — look at the first letter of each paragraph.";
          shakeEl(wrap.querySelector(".card"));
        }
      });
    }
  }

  // ---------------------------------------------------------------------
  // Stage 3 — mission statement tiles
  // ---------------------------------------------------------------------
  function renderStage3(wrap) {
    var s = C.stage3;
    var pd = state.progressData.stage3;
    if (!pd.shuffled) {
      var order = s.tiles.map(function (_, i) { return i; });
      var shuf = shuffle(order);
      // avoid trivially-already-correct shuffle
      if (shuf.join(",") === order.join(",")) shuf = shuffle(order);
      pd.shuffled = shuf;
      save();
    }

    var placedSet = pd.placedOrder;
    var pool = pd.shuffled.filter(function (i) { return placedSet.indexOf(i) === -1; });

    var poolHtml = pool
      .map(function (i) { return '<button class="tile" data-tile="' + i + '">' + esc(s.tiles[i]) + "</button>"; })
      .join("");
    var placedHtml = placedSet
      .map(function (i, pos) { return '<button class="tile tile--placed" data-remove="' + pos + '">' + esc(s.tiles[i]) + "</button>"; })
      .join("");

    var isComplete = placedSet.length === s.tiles.length;
    var isCorrect = isComplete && placedSet.every(function (v, i) { return v === i; });

    wrap.innerHTML =
      '<div class="card">' +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(s.intro) + "</p>" +
      '<div class="field-label">Your sentence</div>' +
      '<div class="tile-row tile-row--target" id="targetRow">' + (placedHtml || '<span style="color:#8a92a6;font-size:0.85rem">Tap phrases below to build the sentence</span>') + "</div>" +
      '<div class="field-label" style="margin-top:14px">Available phrases</div>' +
      '<div class="tile-row" id="poolRow">' + poolHtml + "</div>" +
      '<div class="error-text" id="s3error"></div>' +
      (isComplete
        ? '<button class="btn btn--primary" id="s3check" style="margin-top:10px">Check Order</button>'
        : "") +
      "</div>";

    Array.prototype.forEach.call(wrap.querySelectorAll("[data-tile]"), function (el) {
      el.addEventListener("click", function () {
        var i = parseInt(el.getAttribute("data-tile"), 10);
        pd.placedOrder.push(i);
        save();
        renderStage3(wrap);
      });
    });
    Array.prototype.forEach.call(wrap.querySelectorAll("[data-remove]"), function (el) {
      el.addEventListener("click", function () {
        var pos = parseInt(el.getAttribute("data-remove"), 10);
        pd.placedOrder.splice(pos, 1);
        save();
        renderStage3(wrap);
      });
    });

    if (isComplete) {
      document.getElementById("s3check").addEventListener("click", function () {
        if (isCorrect) {
          unlock(6);
        } else {
          document.getElementById("s3error").textContent = "The order isn't right yet. Tap a phrase in your sentence to remove it and try again.";
          shakeEl(document.getElementById("targetRow"));
        }
      });
    }
  }

  // ---------------------------------------------------------------------
  // Stage 4 — numbers
  // ---------------------------------------------------------------------
  function renderStage4(wrap) {
    var s = C.stage4;
    var pd = state.progressData.stage4;

    var rows = s.blanks
      .map(function (b) {
        var val = pd[b.id] || "";
        var status = "";
        if (val !== "") status = val === b.answer ? "✓" : "✗";
        return (
          '<div class="equation-row">' +
          '<div class="equation-row__eq">' + esc(b.equation) + "</div>" +
          '<input type="tel" inputmode="numeric" maxlength="3" data-field="' + b.id + '" value="' + esc(val) + '" />' +
          '<div class="equation-row__status">' + status + "</div>" +
          "</div>"
        );
      })
      .join("");

    var allCorrect = s.blanks.every(function (b) { return pd[b.id] === b.answer; });
    var summary = s.summaryTemplate
      .replace("{m1}", pd.m1 || "_")
      .replace("{m2}", pd.m2 || "_")
      .replace("{p1}", pd.p1 || "__");

    wrap.innerHTML =
      '<div class="card">' +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(s.intro) + "</p>" +
      rows +
      "</div>" +
      '<div class="card card--navy">' +
      '<div class="number-summary">' + esc(summary) + "</div>" +
      (allCorrect
        ? '<button class="btn btn--primary" id="s4continue" style="margin-top:14px">' + esc(s.continueButton) + "</button>"
        : "") +
      "</div>";

    Array.prototype.forEach.call(wrap.querySelectorAll("[data-field]"), function (el) {
      el.addEventListener("input", function () {
        var field = el.getAttribute("data-field");
        pd[field] = el.value.replace(/\D/g, "");
        save();
        renderStage4(wrap);
      });
    });

    if (allCorrect) {
      document.getElementById("s4continue").addEventListener("click", function () { unlock(7); });
    }
  }

  // ---------------------------------------------------------------------
  // Stage 5 — anagrams
  // ---------------------------------------------------------------------
  function renderStage5(wrap) {
    var s = C.stage5;
    var pd = state.progressData.stage5;

    if (!pd.shuffled) {
      pd.shuffled = s.words.map(function (w) { return shuffledLetters(w.answer); });
      save();
    }

    var cards = s.words
      .map(function (w, i) {
        var val = pd.inputs[i] || "";
        var correct = normalize(val) === normalize(w.answer);
        return (
          '<div class="anagram-card">' +
          '<div class="anagram-word">' + esc(pd.shuffled[i]) + "</div>" +
          '<div class="anagram-clue">' + esc(w.clue) + "</div>" +
          '<input type="text" data-anagram="' + i + '" autocomplete="off" autocapitalize="characters" value="' + esc(val) + '" ' +
          (correct ? "disabled" : "") + " />" +
          (correct ? '<div class="success-banner" style="margin-top:8px">✓ ' + esc(w.answer) + "</div>" : "") +
          "</div>"
        );
      })
      .join("");

    var allCorrect = s.words.every(function (w, i) { return normalize(pd.inputs[i]) === normalize(w.answer); });

    wrap.innerHTML =
      '<div class="card">' +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(s.intro) + "</p>" +
      cards +
      (allCorrect
        ? '<button class="btn btn--primary" id="s5continue" style="margin-top:10px">' + esc(s.continueButton) + "</button>"
        : "") +
      "</div>";

    Array.prototype.forEach.call(wrap.querySelectorAll("[data-anagram]"), function (el) {
      el.addEventListener("input", function () {
        var i = parseInt(el.getAttribute("data-anagram"), 10);
        pd.inputs[i] = el.value;
        save();
        var isNowCorrect = normalize(el.value) === normalize(s.words[i].answer);
        if (isNowCorrect) renderStage5(wrap);
      });
    });

    if (allCorrect) {
      document.getElementById("s5continue").addEventListener("click", function () { unlock(8); });
    }
  }

  // ---------------------------------------------------------------------
  // Finale
  // ---------------------------------------------------------------------
  function renderFinale(wrap) {
    var f = C.finale;
    var mission = C.stage3.tiles.join(" ");
    var vision = f.slide2.visionTemplate
      .replace("{word1}", "<mark>" + esc(C.stage5.words[0].answer) + "</mark>")
      .replace("{word2}", "<mark>" + esc(C.stage5.words[1].answer) + "</mark>")
      .replace("{word3}", "<mark>" + esc(C.stage5.words[2].answer) + "</mark>");
    var pd4 = state.progressData.stage4;
    var elapsed = state.startedAt && state.completedAt ? formatTime(state.completedAt - state.startedAt) : "—";

    wrap.innerHTML =
      '<div class="timer-chip">⏱ ' + esc(elapsed) + "</div>" +
      '<div class="slide">' +
      '<div class="slide__title">' + esc(f.slide1.title) + "</div>" +
      '<div class="slide__label">' + esc(f.slide1.founded) + "</div>" +
      '<div class="slide__label">' + esc(f.slide1.missionLabel) + "</div>" +
      '<div class="slide__text">' + esc(mission) + "</div>" +
      "</div>" +
      '<div class="slide">' +
      '<div class="slide__title">' + esc(f.slide2.title) + "</div>" +
      '<div class="slide__label">' + esc(f.slide2.visionLabel) + "</div>" +
      '<div class="slide__text slide__vision">' + vision + "</div>" +
      '<div class="slide__label">' + esc(f.slide2.statsLabel) + "</div>" +
      '<div class="slide__stats">' +
      '<div><div class="slide__stat-num">' + esc(pd4.m1) + "." + esc(pd4.m2) + "M</div><div class=\"slide__stat-label\">Members served</div></div>" +
      '<div><div class="slide__stat-num">' + esc(pd4.p1) + '</div><div class="slide__stat-label">National projects</div></div>' +
      "</div>" +
      "</div>" +
      '<div class="card card--navy">' +
      "<h2>" + esc(f.completionHeading) + "</h2>" +
      "<p>" + esc(f.completionBody) + "</p>" +
      '<button class="btn btn--primary" id="restartBtn">' + esc(f.restartButton) + "</button>" +
      "</div>";

    document.getElementById("restartBtn").addEventListener("click", function () {
      confirmDialog("Reset progress on this device for the next team?", resetAll);
    });
  }
})();
