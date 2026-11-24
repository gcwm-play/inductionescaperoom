/**
 * figure.js — the scoreboard's stick figure, drawn as SVG.
 *
 * One <svg> per team holds every pose; CSS shows one at a time via the
 * runner's data-pose attribute (see scoreboard.css). Poses: rest, run
 * (4 frames), think, yay (hands up, neutral face), jolt (surprised),
 * stumble (surprised, falling back), cheer (finished).
 *
 * Coordinates are in a 90 x 112 box; the ground is at y = 108.
 * window.CPFFigure.svg(teamColor) returns the markup.
 */
(function () {
  "use strict";

  var INK = "#231b2b";
  var HEAD = "#eef1f7";
  var SHADE = "#b9c3d7";

  function f(n) { return Math.round(n * 10) / 10; }

  // A slightly bowed line, so limbs look drawn rather than ruled.
  function limb(a, b, bow) {
    bow = bow || 0;
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var cx = mx - (dy / len) * bow, cy = my + (dx / len) * bow;
    return '<path d="M' + f(a[0]) + " " + f(a[1]) + " Q" + f(cx) + " " + f(cy) + " " + f(b[0]) + " " + f(b[1]) + '"/>';
  }
  function chain(points, bow) {
    var out = "";
    for (var i = 0; i < points.length - 1; i++) out += limb(points[i], points[i + 1], bow);
    return out;
  }
  // Oval hand/foot pointing along the direction it was reached from.
  function blob(at, from, rx, ry, color) {
    var ang = Math.atan2(at[1] - from[1], at[0] - from[0]) * 180 / Math.PI;
    return '<ellipse cx="' + f(at[0]) + '" cy="' + f(at[1]) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + f(ang) + " " + f(at[0]) + " " + f(at[1]) + ')" fill="' + color + '" stroke="' + INK + '" stroke-width="2.2"/>';
  }
  function foot(at, dir, color) {
    return '<ellipse cx="' + f(at[0] + dir * 2.5) + '" cy="' + f(at[1]) + '" rx="5.6" ry="2.6" fill="' + color + '" stroke="' + INK + '" stroke-width="2.2"/>';
  }
  function spreadHand(at, color) {
    // open palm with three short fingers, for the hands-up poses
    var s = '<g fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round">';
    [-40, -75, -105, -140].forEach(function (deg) {
      var r = deg * Math.PI / 180;
      s += limb([at[0] + Math.cos(r) * 2.4, at[1] + Math.sin(r) * 2.4], [at[0] + Math.cos(r) * 6.6, at[1] + Math.sin(r) * 6.6]);
    });
    return s + "</g>" + blob(at, [at[0], at[1] + 5], 3.4, 3, color);
  }

  function head(c, rx, ry, rot, face) {
    var cx = c[0], cy = c[1];
    var t = "rotate(" + rot + " " + cx + " " + cy + ")";
    var s = '<g transform="' + t + '">' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + HEAD + '"/>' +
      // shaded crescent, lower right
      '<path d="M' + f(cx + rx * 0.95) + " " + f(cy - ry * 0.25) + " A" + rx + " " + ry + " 0 0 1 " + f(cx - rx * 0.3) + " " + f(cy + ry * 0.96) +
      " A" + f(rx * 0.85) + " " + f(ry * 0.8) + " 0 0 0 " + f(cx + rx * 0.95) + " " + f(cy - ry * 0.25) + 'Z" fill="' + SHADE + '"/>' +
      '<ellipse cx="' + f(cx - rx * 0.4) + '" cy="' + f(cy - ry * 0.45) + '" rx="' + f(rx * 0.22) + '" ry="' + f(ry * 0.14) + '" fill="#fff" transform="rotate(-30 ' + f(cx - rx * 0.4) + " " + f(cy - ry * 0.45) + ')"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="' + INK + '" stroke-width="2.8"/>' +
      "</g>";
    return s + faceMarks(cx, cy, face);
  }
  function dot(x, y, r) { return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + (r || 1.2) + '" fill="' + INK + '"/>'; }
  function faceMarks(cx, cy, face) {
    var st = 'fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"';
    switch (face) {
      case "think":
        return dot(cx - 3.5, cy - 1) + dot(cx + 3, cy - 1.5) +
          '<path d="M' + (cx + 1) + " " + (cy - 5) + " q2.5 -1.6 4.4 0.2" + '" ' + st + "/>" +
          '<path d="M' + (cx - 2) + " " + (cy + 4.5) + " q1.5 -1 3 0 t3 0" + '" ' + st + "/>";
      case "neutral":
        return dot(cx - 3, cy - 0.5) + dot(cx + 3, cy - 0.5) +
          '<path d="M' + (cx - 1.8) + " " + (cy + 4) + " h3.6" + '" ' + st + "/>";
      case "o":
        return '<circle cx="' + (cx - 3.4) + '" cy="' + (cy - 1) + '" r="1.9" ' + st + "/>" + dot(cx - 3.4, cy - 1, 0.7) +
          '<circle cx="' + (cx + 3.4) + '" cy="' + (cy - 1) + '" r="1.9" ' + st + "/>" + dot(cx + 3.4, cy - 1, 0.7) +
          '<ellipse cx="' + cx + '" cy="' + (cy + 4.6) + '" rx="1.4" ry="1.8" ' + st + "/>";
      case "shock":
        return '<circle cx="' + (cx - 3.6) + '" cy="' + (cy - 2) + '" r="2.5" fill="#fff" stroke="' + INK + '" stroke-width="1.4"/>' + dot(cx - 3.2, cy - 2, 0.9) +
          '<circle cx="' + (cx + 3.6) + '" cy="' + (cy - 2) + '" r="2.5" fill="#fff" stroke="' + INK + '" stroke-width="1.4"/>' + dot(cx + 4, cy - 2, 0.9) +
          '<path d="M' + (cx - 3.4) + " " + (cy + 3.6) + " q3.4 -2.4 6.8 0 q-1 4 -3.4 4 q-2.4 0 -3.4 -4z" + '" fill="#c2364d" stroke="' + INK + '" stroke-width="1.4"/>';
      case "happy":
        return '<path d="M' + (cx - 5) + " " + (cy - 0.5) + " q1.6 -2.4 3.2 0 M" + (cx + 1.8) + " " + (cy - 0.5) + " q1.6 -2.4 3.2 0" + '" ' + st + "/>" +
          '<path d="M' + (cx - 3.4) + " " + (cy + 3) + " q3.4 3.6 6.8 0" + '" ' + st + "/>";
      default:
        return "";
    }
  }
  // Little "!" burst lines, like the surprised poses in the reference.
  function burst(x, y, color, size) {
    var s = '<g class="fig__burst" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round">';
    [-150, -115, -80, -45, -10].forEach(function (deg) {
      var r = deg * Math.PI / 180, a = size * 0.55, b = size;
      s += '<path d="M' + f(x + Math.cos(r) * a) + " " + f(y + Math.sin(r) * a) + " L" + f(x + Math.cos(r) * b) + " " + f(y + Math.sin(r) * b) + '"/>';
    });
    return s + "</g>";
  }
  function speedLines() {
    var s = '<g class="fig__speed" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round" opacity="0.75">';
    [[2, 30, 22], [0, 40, 26], [6, 50, 18], [1, 60, 24], [8, 72, 12]].forEach(function (l) {
      s += '<path d="M' + l[0] + " " + l[1] + " h" + l[2] + '"/>';
    });
    s += "</g>";
    s += dot(14, 66, 1.1) + dot(20, 66, 1.1) + dot(9, 46, 0.9);
    return s;
  }

  // body: neck -> hip; arms [shoulder, elbow, hand]; legs [hip, knee, foot]
  function figure(p, color) {
    var s = '<g fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">';
    s += limb(p.neck, p.hip, p.bodyBow || 0);
    p.arms.forEach(function (a) { s += chain(a, 1.2); });
    p.legs.forEach(function (l) { s += chain(l, -1); });
    s += "</g>";
    p.arms.forEach(function (a) {
      s += p.spread ? spreadHand(a[2], color) : blob(a[2], a[1], 3.6, 2.9, color);
    });
    p.legs.forEach(function (l) { s += foot(l[2], l[2][0] >= l[1][0] ? 1 : -1, color); });
    s += head(p.head, p.rx || 11, p.ry || 11, p.rot || 0, p.face);
    return s;
  }

  function poses(color) {
    var runBase = { head: [60, 28], rx: 10, ry: 12.2, rot: 28, neck: [53, 39], hip: [39, 70], bodyBow: 1 };
    function run(arms, legs, lift) {
      var shift = function (pt) { return [pt[0], pt[1] - (lift || 0)]; };
      var p = Object.assign({}, runBase);
      p.head = shift(p.head); p.neck = shift(p.neck); p.hip = shift(p.hip);
      p.arms = arms.map(function (a) { return a.map(shift); });
      p.legs = legs.map(function (l) { return [p.hip].concat(l.map(shift)); });
      return figure(p, color);
    }
    var sh = [50, 45];
    return {
      rest: figure({
        head: [45, 18], neck: [45, 29], hip: [45, 66],
        arms: [[[45, 35], [38, 50], [36, 64]], [[45, 35], [52, 50], [54, 64]]],
        legs: [[[45, 66], [41, 86], [39, 105]], [[45, 66], [49, 86], [51, 105]]],
      }, color),
      run: [
        run([[sh, [40, 54], [28, 52]], [sh, [60, 58], [68, 48]]], [[[52, 84], [60, 104]], [[26, 80], [14, 88]]], 0),
        run([[sh, [44, 58], [36, 62]], [sh, [58, 55], [62, 47]]], [[[46, 86], [44, 104]], [[38, 84], [26, 92]]], 3),
        run([[sh, [60, 58], [66, 66]], [sh, [42, 52], [30, 46]]], [[[54, 82], [62, 100]], [[24, 82], [12, 92]]], 0),
        run([[sh, [55, 59], [52, 66]], [sh, [46, 54], [40, 48]]], [[[44, 84], [48, 104]], [[34, 86], [22, 98]]], 3),
      ],
      think: figure({
        head: [46, 30], face: "think", neck: [46, 41], hip: [46, 76],
        arms: [[[46, 47], [57, 60], [48, 44]], [[46, 47], [35, 60], [53, 61]]],
        legs: [[[46, 76], [43, 92], [41, 106]], [[46, 76], [50, 92], [52, 106]]],
      }, color),
      yay: figure({
        head: [45, 42], rx: 10, ry: 10, face: "neutral", neck: [45, 52], hip: [45, 80], spread: true,
        arms: [[[45, 57], [32, 54], [26, 40]], [[45, 57], [58, 54], [64, 40]]],
        legs: [[[45, 80], [37, 92], [36, 106]], [[45, 80], [53, 92], [55, 106]]],
      }, color) + burst(55, 33, "#c2364d", 9),
      jolt: figure({
        head: [41, 28], face: "o", neck: [42, 39], hip: [47, 76], bodyBow: -2,
        arms: [[[43, 47], [30, 56], [32, 70]], [[43, 47], [60, 50], [60, 66]]],
        legs: [[[47, 76], [43, 92], [39, 106]], [[47, 76], [57, 90], [62, 104]]],
      }, color) + burst(54, 18, "#c2364d", 9),
      stumble: figure({
        head: [61, 30], face: "shock", neck: [56, 41], hip: [42, 74], bodyBow: 2,
        arms: [[[53, 48], [36, 50], [22, 46]], [[53, 48], [66, 58], [67, 72]]],
        legs: [[[42, 74], [28, 84], [14, 92]], [[42, 74], [46, 92], [42, 106]]],
      }, color) + burst(71, 20, "#c2364d", 9),
      cheer: figure({
        head: [45, 30], face: "happy", neck: [45, 41], hip: [45, 76], spread: true,
        arms: [[[45, 47], [35, 36], [31, 20]], [[45, 47], [55, 36], [59, 20]]],
        legs: [[[45, 76], [39, 92], [36, 106]], [[45, 76], [51, 92], [54, 106]]],
      }, color),
    };
  }

  function svg(color) {
    var p = poses(color);
    var q = '<g class="fig__q"><text x="54" y="14" font-family="Georgia, serif" font-size="20" font-weight="700" fill="' + color + '" stroke="' + INK + '" stroke-width="0.8">?</text></g>';
    var z = '<g class="fig__z"><text x="58" y="12" font-family="Georgia, serif" font-size="12" font-weight="700" fill="' + INK + '">z</text><text x="66" y="5" font-family="Georgia, serif" font-size="9" font-weight="700" fill="' + INK + '">z</text></g>';
    return '<svg class="fig" viewBox="0 0 90 112" aria-hidden="true">' +
      '<g class="pose pose--rest"><g class="fig__breathe">' + p.rest + "</g>" + z + "</g>" +
      '<g class="pose pose--run">' + speedLines() + p.run.map(function (fr, i) { return '<g class="fig__frame fig__frame--' + (i + 1) + '">' + fr + "</g>"; }).join("") + "</g>" +
      '<g class="pose pose--think">' + p.think + q + "</g>" +
      '<g class="pose pose--yay">' + p.yay + "</g>" +
      '<g class="pose pose--jolt">' + p.jolt + "</g>" +
      '<g class="pose pose--stumble">' + p.stumble + "</g>" +
      '<g class="pose pose--cheer">' + p.cheer + "</g>" +
      "</svg>";
  }

  window.CPFFigure = { svg: svg };
})();
