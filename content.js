/**
 * ============================================================================
 * CPF BOARD INDUCTION ESCAPE ROOM — CONTENT CONFIG
 * ============================================================================
 * Everything a facilitator needs to customise lives in this one file.
 * No other file needs to change to re-word puzzles, swap the physical lock
 * code/password, or correct any fact once the real slide references are
 * available.
 *
 * IMPORTANT — physical prop setup:
 *   1. Set a 4-digit combination lock to STAGE1.lockCode (default "0107").
 *   2. Inside the lock box, place a note with GATE.password written on it
 *      (default "SECUREFUTURE"). New joiners type this into the app to
 *      unlock Stage 2.
 * ============================================================================
 */
window.CPF_CONTENT = {
  meta: {
    orgName: "CPF Board",
    appTitle: "Operation Board Briefing",
    tagline: "An induction escape room for new joiners",
  },

  // ---------------------------------------------------------------------
  // WELCOME / BRIEFING
  // ---------------------------------------------------------------------
  welcome: {
    heading: "Incident Briefing",
    body: [
      "President Tharman is visiting CPF Board this week to be briefed on who we are.",
      "Last night, a network outage wiped out the two summary slides prepared for his visit — the ones covering our history, our mission, and our vision.",
      "IT could not recover the files in time. It's down to your team to rebuild both slides before he arrives.",
      "You'll need to solve a series of puzzles to recover the facts, piece the statements back together, and reconstruct the deck.",
    ],
    startButton: "Begin the Rebuild",
  },

  // ---------------------------------------------------------------------
  // STAGE 1 — Find the Board's birthday → physical 4-digit lock code
  // ---------------------------------------------------------------------
  stage1: {
    title: "Stage 1 - Find the passcode, unlock the lock!",
    intro:
      "Solve the puzzle below to get a 4 digit code to open the physical lock given to your team:",
    // Worked examples teaching the cipher rule (shape -> number of sides).
    // Shape keys must match SHAPES in app.js: circle, triangle, square, pentagon.
    legend: [
      { shape: "circle", label: "1" },
      { shape: "triangle", label: "3" },
    ],
    // The puzzle itself: two groups of shapes to decode and add.
    // Each group's shapes read left-to-right as digits of a number, e.g.
    // [pentagon, square] -> 5 and 4 -> 54. Player must add the two numbers
    // and enter the total as a 4-digit code (54 + 53 = 107 -> "0107").
    puzzleGroups: [
      ["pentagon", "square"],
      ["pentagon", "triangle"],
    ],
    inputLabel: "Enter the answer as a 4-digit code",
    inputPlaceholder: "0000",
    // The 4-digit code the player must type in-app AND dial on the physical lock.
    // Must equal the sum of the decoded puzzleGroups above, zero-padded to 4 digits.
    lockCode: "0107",
    successHeading: "Code cracked.",
    successBody:
      "54 + 53 = 107 — that's the day CPF Board was founded: 1 July 1955. Take this code to the physical lock in the room:",
    lockInstruction:
      "Dial 0 – 1 – 0 – 7 on the combination lock. Inside, you'll find a password.",
    continueButton: "I've opened the lock",
  },

  // ---------------------------------------------------------------------
  // GATE — password recovered from the physical lock unlocks Stage 2
  // ---------------------------------------------------------------------
  gate: {
    heading: "Password Required",
    body: "Enter the password you found inside the lock to reconnect to the network drive.",
    inputLabel: "Password",
    inputPlaceholder: "Enter password",
    // Must match the note the facilitator places inside the physical lock.
    password: "SECUREFUTURE",
    submitButton: "Reconnect",
    errorMessage: "That password doesn't match our records. Check the note from the lock and try again.",
  },

  // ---------------------------------------------------------------------
  // STAGE 2 — Two emails, acrostic first letters spell MISSION / VISION
  // ---------------------------------------------------------------------
  stage2: {
    title: "Stage 2 · Recovered Mail",
    intro:
      "The network drive is back up. Two emails from around the time of the outage might hold a clue. Read carefully — the first letter of each paragraph spells something out.",
    emails: [
      {
        from: "IT Support <it-support@cpf.internal>",
        subject: "Slide Recovery — Update",
        time: "8:41 AM",
        answerLabel: "Word found in this email",
        answer: "MISSION",
        paragraphs: [
          "Morning team, I wanted to give you a quick update on the recovery attempt for yesterday's incident.",
          "Initial checks show the backup drive was mid-sync when the outage hit, so some files may be incomplete.",
          "Several folders have already been restored, including the shared drive for the Board Briefing materials.",
          "Since the two summary slides aren't in the recovered set yet, please hold off recreating them until end of day.",
          "IT will keep scanning the network logs for a possible secondary backup on the file server.",
          "Once we find anything usable, I'll forward it straight to your team so you're not duplicating effort.",
          "Note: please don't reply-all on this thread, just ping me directly if you spot the missing files.",
        ],
      },
      {
        from: "Priya Nair <priya.nair@cpf.internal>",
        subject: "Re: Briefing Prep for Mr Tharman's Visit",
        time: "9:15 AM",
        answerLabel: "Word found in this email",
        answer: "VISION",
        paragraphs: [
          "Very glad to hear the team is stepping up to rebuild the missing slides before the visit.",
          "It's important that whatever we present is accurate, since this will go straight to the President's office.",
          "Sharing a reminder: the briefing deck should stick to our approved facts and figures, nothing off the cuff.",
          "In case it helps, our comms folder has the last approved version of our org overview for reference.",
          "Once the two slides are rebuilt, send them to me for a quick check before they're added back to the deck.",
          "No pressure, but the visit is fast approaching, so let's aim to have this wrapped up today.",
        ],
      },
    ],
    successMessage: "Both words confirmed. Slide 1 needs MISSION, Slide 2 needs VISION.",
    continueButton: "Continue",
  },

  // ---------------------------------------------------------------------
  // STAGE 3 — Reassemble the Mission Statement
  // ---------------------------------------------------------------------
  stage3: {
    title: "Stage 3 · Rebuild the Mission Statement",
    intro:
      "A fragment of Slide 1's mission statement was salvaged, but the phrases are out of order. Tap them in the correct sequence to rebuild it.",
    // The full statement, split into tap-in-order tiles. Order below = correct order.
    tiles: [
      "To enable Singaporeans",
      "to have a secure retirement",
      "through lifelong income,",
      "healthcare financing",
      "and home financing.",
    ],
    successHeading: "Mission statement restored.",
    continueButton: "Continue",
  },

  // ---------------------------------------------------------------------
  // STAGE 4 — Number puzzle: 4.2 million members, 30 national projects
  // ---------------------------------------------------------------------
  stage4: {
    title: "Stage 4 · The Numbers",
    intro:
      "Slide 2 needs two figures. Solve each equation to reveal the missing digits.",
    blanks: [
      {
        id: "m1",
        equation: "9 − 5 = ?",
        answer: "4",
        resultLabel: "million members (whole number)",
      },
      {
        id: "m2",
        equation: "1 + 1 = ?",
        answer: "2",
        resultLabel: "million members (decimal)",
      },
      {
        id: "p1",
        equation: "6 × 5 = ?",
        answer: "30",
        resultLabel: "national projects",
      },
    ],
    summaryTemplate: "CPF Board serves {m1}.{m2} million members through {p1} national projects.",
    continueButton: "Continue",
  },

  // ---------------------------------------------------------------------
  // STAGE 5 — Anagrams: TRUSTED, RESPECTED, COMMITTED
  // ---------------------------------------------------------------------
  stage5: {
    title: "Stage 5 · The Final Words",
    intro:
      "Three words from our Vision statement got scrambled in the outage. Unscramble each using its clue.",
    words: [
      {
        answer: "TRUSTED",
        clue: "Millions place their life savings in our hands — we must always be ______.",
      },
      {
        answer: "RESPECTED",
        clue: "Held in high regard across Singapore for decades of reliable service — ______.",
      },
      {
        answer: "COMMITTED",
        clue: "Devoted to serving every member, for life — ______.",
      },
    ],
    continueButton: "Reconstruct the Slides",
  },

  // ---------------------------------------------------------------------
  // FINALE — Reconstructed slides
  // ---------------------------------------------------------------------
  finale: {
    heading: "Slides Reconstructed",
    subheading: "Ready for Mr Tharman's briefing.",
    slide1: {
      title: "CPF Board — Who We Are",
      founded: "Founded 1 July 1955",
      missionLabel: "Our Mission",
    },
    slide2: {
      title: "CPF Board — Vision & Impact",
      visionLabel: "Our Vision",
      visionTemplate:
        "To be a {word1}, {word2} and {word3} partner, enabling every Singaporean to achieve a secure retirement.",
      statsLabel: "By the Numbers",
    },
    completionHeading: "Mission Complete",
    completionBody:
      "Both slides are rebuilt and ready. Show this screen to your facilitator to confirm your team is done.",
    restartButton: "Reset for Next Team",
  },
};
