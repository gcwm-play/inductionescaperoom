/**
 * CPF Board Induction Escape Room — app logic.
 * No build step, no dependencies. Content lives in content.js.
 */
(function () {
  "use strict";

  var C = window.CPF_CONTENT;
  var STORAGE_KEY = "cpf_escape_progress_v1";
  // Photo lives under its own key so a large/failed image save can never
  // take the core progress save down with it.
  var PHOTO_STORAGE_KEY = "cpf_escape_photo_v1";

  // View indices:
  // 0 welcome | 1 stage1 | 2 stage1success | 3 gate     | 4 stage2
  // 5 stage3  | 6 stage3b (logo photo) | 7 stage4 | 8 stage5 | 9 finale
  var STAGE_VIEW_START = [1, 4, 5, 7, 8];
  var STAGE_VIEW_END = [4, 5, 7, 8, 9];

  var app = document.getElementById("app");
  var state = loadState();
  var activeEmail = null; // ephemeral, not persisted
  var capturedPhoto = loadPhoto();

  // Safety net: catch errors raised outside render()'s own try/catch too
  // (e.g. inside a click handler), so a bug never leaves a dead screen.
  window.addEventListener("error", function (e) {
    try {
      var wrap = document.getElementById("stageWrap");
      if (wrap) renderCrash(wrap, e.error || e.message);
    } catch (ignored) {}
  });

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
        stage3: {
          deptSolved: false,
          deptSelected: [],
          deptAttempts: 0,
          deptShuffled: null,
          placedOrder: [],
          shuffled: null,
        },
        stage3b: { done: false },
        stage4: { a: "", b: "" },
        stage5: { inputs: ["", "", ""] },
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

  // Photo is stored separately from the main progress save (see
  // PHOTO_STORAGE_KEY) so a large or failed image write never risks the
  // rest of the team's progress.
  function loadPhoto() {
    try {
      return localStorage.getItem(PHOTO_STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function savePhoto(dataUrl) {
    try {
      localStorage.setItem(PHOTO_STORAGE_KEY, dataUrl);
      return true;
    } catch (e) {
      return false;
    }
  }

  function resetAll() {
    state = defaultState();
    activeEmail = null;
    capturedPhoto = null;
    try { localStorage.removeItem(PHOTO_STORAGE_KEY); } catch (e) {}
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
    if (view >= 9 && !state.completedAt) state.completedAt = Date.now();
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

  function normalize(str) {
    return (str || "").trim().toUpperCase();
  }

  // Shape cipher (Stage 1): each shape's value is its number of sides.
  // A circle has no straight sides, so it's a fixed special case (value 1).
  var SHAPES = {
    circle: { sides: 0, value: 1 },
    triangle: { sides: 3, value: 3 },
    square: { sides: 4, value: 4 },
    pentagon: { sides: 5, value: 5 },
    hexagon: { sides: 6, value: 6 },
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
      // Axis-aligned square rather than the diamond a rotated 4-gon would draw.
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

    try {
      switch (view) {
        case 0: renderWelcome(wrap); break;
        case 1: renderStage1(wrap); break;
        case 2: renderStage1Success(wrap); break;
        case 3: renderGate(wrap); break;
        case 4: renderStage2(wrap); break;
        case 5: renderStage3(wrap); break;
        case 6: renderStage3Camera(wrap); break;
        case 7: renderStage4(wrap); break;
        case 8: renderStage5(wrap); break;
        case 9: renderFinale(wrap); break;
        default: renderWelcome(wrap);
      }
    } catch (err) {
      renderCrash(wrap, err);
    }
  }

  // Last-resort fallback so a bug or a stale/corrupted save never leaves a
  // blank screen — always gives the player a way to recover.
  function renderCrash(wrap, err) {
    if (window.console && console.error) console.error("CPF escape room render error:", err);
    wrap.innerHTML =
      '<div class="card">' +
      "<h2>This stage didn't load</h2>" +
      "<p>Something went wrong showing this puzzle. Try again, or reset your progress on this device and re-enter your codes.</p>" +
      '<div class="error-text">' + esc(err && err.message ? err.message : String(err)) + "</div>" +
      '<button class="btn btn--primary" id="crashRetry" style="margin-top:10px">Try Again</button>' +
      '<button class="btn btn--dark" id="crashReset" style="margin-top:10px">Reset My Progress</button>' +
      "</div>";
    document.getElementById("crashRetry").addEventListener("click", render);
    document.getElementById("crashReset").addEventListener("click", function () {
      confirmDialog("Reset your progress on this device? You'll need to re-enter any codes you've found.", resetAll);
    });
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

    var legendHtml = s.legend
      .map(function (item) {
        return (
          '<div class="shape-legend__item">' +
          shapeSVG(item.shape) +
          '<span class="shape-legend__eq">= ' + esc(item.label) + "</span>" +
          "</div>"
        );
      })
      .join("");

    var groupsHtml = s.puzzleGroups
      .map(function (group, gi) {
        var icons = group.map(function (shapeKey) { return shapeSVG(shapeKey); }).join("");
        var op = gi < s.puzzleGroups.length - 1 ? '<div class="shape-op">+</div>' : '<div class="shape-op">=</div>';
        return '<div class="shape-group">' + icons + "</div>" + op;
      })
      .join("");

    wrap.innerHTML =
      '<div class="card">' +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(s.intro) + "</p>" +
      '<div class="shape-legend">' + legendHtml + "</div>" +
      '<div class="shape-puzzle">' + groupsHtml + '<div class="shape-op shape-op--query">?</div></div>' +
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
        errorEl.textContent = s.errorMessage;
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
          errorEl.textContent = s.errorMessage;
          shakeEl(wrap.querySelector(".card"));
        }
      });
    }
  }

  // ---------------------------------------------------------------------
  // Stage 3a — real-department gate (shown before the phrase tiles)
  // ---------------------------------------------------------------------
  function renderStage3DeptChallenge(wrap, s, pd) {
    var dc = s.deptChallenge;

    if (!pd.deptShuffled) {
      pd.deptShuffled = shuffle(dc.departments.map(function (_, i) { return i; }));
      save();
    }

    var itemsHtml = pd.deptShuffled
      .map(function (idx) {
        var dept = dc.departments[idx];
        var checked = pd.deptSelected.indexOf(idx) !== -1;
        return (
          '<label class="dept-item' + (checked ? " selected" : "") + '">' +
          '<input type="checkbox" data-dept="' + idx + '" ' + (checked ? "checked" : "") + " />" +
          '<span class="dept-code">' + esc(dept.code) + "</span>" +
          "</label>"
        );
      })
      .join("");

    var lt = s.logoTask;
    var cluesHtml = lt.clues.map(function (c) { return '<div class="clue-item">' + esc(c) + "</div>"; }).join("");
    var logoTaskHtml =
      '<div class="card card--navy">' +
      '<span class="eyebrow">' + esc(lt.eyebrow) + "</span>" +
      "<h3>" + esc(lt.heading) + "</h3>" +
      "<p>" + esc(lt.intro) + "</p>" +
      '<div class="clue-list">' + cluesHtml + "</div>" +
      "<p>" + esc(lt.note) + "</p>" +
      "</div>";

    wrap.innerHTML =
      logoTaskHtml +
      '<div class="card">' +
      (dc.eyebrow ? '<span class="eyebrow">' + esc(dc.eyebrow) + "</span>" : "") +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(dc.question) + "</p>" +
      "<p>" + esc(dc.instructions) + "</p>" +
      '<div class="dept-grid">' + itemsHtml + "</div>" +
      '<div class="error-text" id="deptError"></div>' +
      '<button class="btn btn--primary" id="deptSubmit" style="margin-top:10px">' + esc(dc.submitButton) + "</button>" +
      "</div>";

    Array.prototype.forEach.call(wrap.querySelectorAll("[data-dept]"), function (el) {
      el.addEventListener("change", function () {
        var idx = parseInt(el.getAttribute("data-dept"), 10);
        var pos = pd.deptSelected.indexOf(idx);
        if (el.checked && pos === -1) pd.deptSelected.push(idx);
        if (!el.checked && pos !== -1) pd.deptSelected.splice(pos, 1);
        save();
        el.closest(".dept-item").classList.toggle("selected", el.checked);
      });
    });

    document.getElementById("deptSubmit").addEventListener("click", function () {
      var correct = dc.departments
        .map(function (d, i) { return d.correct ? i : -1; })
        .filter(function (i) { return i !== -1; })
        .sort();
      var selected = pd.deptSelected.slice().sort();
      var isCorrect = selected.length === correct.length && selected.every(function (v, i) { return v === correct[i]; });

      if (isCorrect) {
        pd.deptSolved = true;
        save();
        renderStage3(wrap);
      } else {
        pd.deptAttempts += 1;
        save();
        var msg = dc.failureMessage;
        if (pd.deptAttempts >= dc.hintAfterAttempts) msg += " " + dc.hintMessage;
        document.getElementById("deptError").textContent = msg;
        shakeEl(wrap.querySelector(".card"));
      }
    });
  }

  // ---------------------------------------------------------------------
  // Stage 3 — mission statement tiles
  // ---------------------------------------------------------------------
  function renderStage3(wrap) {
    var s = C.stage3;
    var pd = state.progressData.stage3;

    if (!pd.deptSolved) {
      renderStage3DeptChallenge(wrap, s, pd);
      return;
    }

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
  // Stage 3B — photograph the team's logo drawing
  // ---------------------------------------------------------------------

  // Resizes/re-encodes a captured photo client-side before it's stored, so
  // a multi-MB phone photo becomes a small JPEG data URL (~100-300KB).
  function compressImageFile(file, maxDim, quality, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        try {
          callback(canvas.toDataURL("image/jpeg", quality));
        } catch (err) {
          callback(null);
        }
      };
      img.onerror = function () { callback(null); };
      img.src = e.target.result;
    };
    reader.onerror = function () { callback(null); };
    reader.readAsDataURL(file);
  }

  function renderStage3Camera(wrap) {
    var s = C.stage3b;
    var pd = state.progressData.stage3b;

    var previewHtml = capturedPhoto
      ? '<img class="photo-preview" src="' + capturedPhoto + '" alt="Team logo drawing" />'
      : "";

    wrap.innerHTML =
      '<div class="card">' +
      (s.eyebrow ? '<span class="eyebrow">' + esc(s.eyebrow) + "</span>" : "") +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(s.intro) + "</p>" +
      previewHtml +
      (capturedPhoto ? "" : '<p style="font-size:0.82rem">' + esc(s.permissionNote) + "</p>") +
      '<div class="error-text" id="photoError"></div>' +
      '<input type="file" accept="image/*" capture="environment" id="photoInput" hidden />' +
      '<button class="btn btn--primary" id="photoCaptureBtn" style="margin-top:10px">' +
      esc(capturedPhoto ? s.retakeButton : s.captureButton) +
      "</button>" +
      (capturedPhoto
        ? '<button class="btn btn--dark" id="photoContinueBtn" style="margin-top:10px">' + esc(s.continueButton) + "</button>"
        : "") +
      "</div>";

    var fileInput = document.getElementById("photoInput");
    document.getElementById("photoCaptureBtn").addEventListener("click", function () {
      fileInput.click();
    });

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      compressImageFile(file, 900, 0.7, function (dataUrl) {
        if (!dataUrl) {
          document.getElementById("photoError").textContent = "That photo didn't load — try again.";
          return;
        }
        capturedPhoto = dataUrl;
        var ok = savePhoto(dataUrl);
        pd.done = true;
        save();
        if (!ok) document.getElementById("photoError").textContent = s.storageWarning;
        renderStage3Camera(wrap);
      });
    });

    if (capturedPhoto) {
      document.getElementById("photoContinueBtn").addEventListener("click", function () {
        unlock(7);
      });
    }
  }

  // ---------------------------------------------------------------------
  // Stage 4 — numbers
  // ---------------------------------------------------------------------
  function renderStage4(wrap) {
    var s = C.stage4;
    var pd = state.progressData.stage4;

    var aCorrect = pd.a !== "" && !isNaN(parseFloat(pd.a)) && parseFloat(pd.a) === parseFloat(s.challengeA.answer);
    var bCorrect = pd.b !== "" && !isNaN(parseInt(pd.b, 10)) && parseInt(pd.b, 10) === parseInt(s.challengeB.answer, 10);

    var summary = s.summaryTemplate
      .replace("{members}", aCorrect ? pd.a : "_._")
      .replace("{projects}", bCorrect ? pd.b : "__");

    function challengeCard(idPrefix, challenge, correct, currentVal) {
      return (
        '<div class="card" id="' + idPrefix + 'Card">' +
        '<span class="eyebrow">' + esc(challenge.label) + "</span>" +
        "<p>" + esc(challenge.prompt) + "</p>" +
        '<label class="field-label" for="' + idPrefix + 'Input">' + esc(challenge.inputLabel) + "</label>" +
        '<input type="text" inputmode="decimal" id="' + idPrefix + 'Input" placeholder="' + esc(challenge.inputPlaceholder) + '" value="' + esc(currentVal) + '" ' + (correct ? "disabled" : "") + " />" +
        '<div class="error-text" id="' + idPrefix + 'Error"></div>' +
        (correct
          ? '<div class="success-banner">Correct.</div>'
          : '<button class="btn btn--primary" id="' + idPrefix + 'Submit" style="margin-top:10px">' + esc(challenge.submitButton) + "</button>") +
        "</div>"
      );
    }

    wrap.innerHTML =
      '<div class="card">' +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(s.intro) + "</p>" +
      "</div>" +
      challengeCard("s4a", s.challengeA, aCorrect, pd.a) +
      challengeCard("s4b", s.challengeB, bCorrect, pd.b) +
      '<div class="card card--navy">' +
      '<div class="number-summary">' + esc(summary) + "</div>" +
      (aCorrect && bCorrect
        ? '<button class="btn btn--primary" id="s4continue" style="margin-top:14px">' + esc(s.continueButton) + "</button>"
        : "") +
      "</div>";

    if (!aCorrect) {
      document.getElementById("s4aSubmit").addEventListener("click", function () {
        var val = document.getElementById("s4aInput").value.trim();
        pd.a = val;
        save();
        if (val !== "" && !isNaN(parseFloat(val)) && parseFloat(val) === parseFloat(s.challengeA.answer)) {
          renderStage4(wrap);
        } else {
          document.getElementById("s4aError").textContent = s.challengeA.errorMessage;
          shakeEl(document.getElementById("s4aCard"));
        }
      });
    }

    if (!bCorrect) {
      document.getElementById("s4bSubmit").addEventListener("click", function () {
        var val = document.getElementById("s4bInput").value.trim();
        pd.b = val;
        save();
        if (val !== "" && !isNaN(parseInt(val, 10)) && parseInt(val, 10) === parseInt(s.challengeB.answer, 10)) {
          renderStage4(wrap);
        } else {
          document.getElementById("s4bError").textContent = s.challengeB.errorMessage;
          shakeEl(document.getElementById("s4bCard"));
        }
      });
    }

    if (aCorrect && bCorrect) {
      document.getElementById("s4continue").addEventListener("click", function () { unlock(8); });
    }
  }

  // ---------------------------------------------------------------------
  // Stage 5 — 3 key Vision words, unlocked by a physical crossword
  // ---------------------------------------------------------------------
  function renderStage5(wrap) {
    var s = C.stage5;
    var pd = state.progressData.stage5;

    function isTargetWord(val) {
      var n = normalize(val);
      return n !== "" && s.answers.indexOf(n) !== -1;
    }

    var fields = s.wordLabels
      .map(function (label, i) {
        var val = pd.inputs[i] || "";
        var correct = isTargetWord(val);
        return (
          '<label class="field-label" for="s5word' + i + '">' + esc(label) + "</label>" +
          '<input type="text" class="word-input ' + (correct ? "word-input--correct" : "word-input--wrong") + '" ' +
          'id="s5word' + i + '" data-word="' + i + '" autocomplete="off" value="' + esc(val) + '" />'
        );
      })
      .join("");

    // Stage is solved once the 3 typed words, as a set, exactly match the
    // 3 target words — this also rules out typing the same word 3 times.
    var sortedInputs = pd.inputs.map(normalize).slice().sort();
    var sortedAnswers = s.answers.slice().sort();
    var allCorrect = sortedInputs.length === sortedAnswers.length && sortedInputs.every(function (v, i) { return v === sortedAnswers[i]; });

    wrap.innerHTML =
      '<div class="card">' +
      "<h2>" + esc(s.title) + "</h2>" +
      "<p>" + esc(s.intro) + "</p>" +
      "<p>" + esc(s.hint) + "</p>" +
      fields +
      '<div class="hint-box">' + esc(s.colorHint) + "</div>" +
      (allCorrect
        ? '<button class="btn btn--primary" id="s5continue" style="margin-top:10px">' + esc(s.continueButton) + "</button>"
        : "") +
      "</div>";

    Array.prototype.forEach.call(wrap.querySelectorAll("[data-word]"), function (el) {
      el.addEventListener("input", function () {
        var i = parseInt(el.getAttribute("data-word"), 10);
        var caret = el.selectionStart;
        el.value = el.value.toUpperCase();
        if (caret !== null) el.setSelectionRange(caret, caret);
        pd.inputs[i] = el.value;
        save();
        el.classList.toggle("word-input--correct", isTargetWord(el.value));
        el.classList.toggle("word-input--wrong", !isTargetWord(el.value));
        var sorted = pd.inputs.map(normalize).slice().sort();
        var isNowAllCorrect = sorted.length === sortedAnswers.length && sorted.every(function (v, idx) { return v === sortedAnswers[idx]; });
        if (isNowAllCorrect) renderStage5(wrap);
      });
    });

    if (allCorrect) {
      document.getElementById("s5continue").addEventListener("click", function () { unlock(9); });
    }
  }

  // ---------------------------------------------------------------------
  // Finale
  // ---------------------------------------------------------------------
  function renderFinale(wrap) {
    var f = C.finale;
    var mission = C.stage3.tiles.join(" ");
    var vision = f.slide2.visionTemplate
      .replace("{word1}", "<mark>" + esc(C.stage5.answers[0]) + "</mark>")
      .replace("{word2}", "<mark>" + esc(C.stage5.answers[1]) + "</mark>")
      .replace("{word3}", "<mark>" + esc(C.stage5.answers[2]) + "</mark>");
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
      '<div><div class="slide__stat-num">' + esc(pd4.a) + "M</div><div class=\"slide__stat-label\">Members served</div></div>" +
      '<div><div class="slide__stat-num">' + esc(pd4.b) + '</div><div class="slide__stat-label">National projects</div></div>' +
      "</div>" +
      "</div>" +
      (capturedPhoto
        ? '<div class="slide">' +
          '<div class="slide__title">' + esc(f.logoLabel) + "</div>" +
          '<img class="photo-preview" src="' + capturedPhoto + '" alt="Team logo drawing" />' +
          "</div>"
        : "") +
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
