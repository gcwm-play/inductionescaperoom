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
      "A network outage has just wiped out the two summary slides prepared for his visit.",
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
    successBody: "Use the 4 digit code to open the lock given to you.",
    lockInstruction:
      "Dial 0 – 1 – 0 – 7 on the combination lock. Inside, you'll find a password.",
    continueButton: "I've opened the lock",
    errorMessage: "That's not the right code. Try again.",
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
    title: "Stage 2 - Recover the hidden word",
    intro: "Read each email below carefully. Something's hidden in each one.",
    errorMessage: "That's not the right word. Try again.",
    emails: [
      {
        from: "IT Support <it-support@cpf.gov.sg>",
        subject: "Slide Recovery — Update",
        time: "8:41 AM",
        answerLabel: "Word found in this email",
        answer: "MISSION",
        paragraphs: [
          "Morning team, I wanted to give you a quick update on the recovery attempt for today's incident.",
          "Initial checks show the backup drive was mid-sync when the outage hit, so some files may be incomplete.",
          "Several folders have already been restored, including the shared drive for the Board Briefing materials.",
          "Since the two summary slides aren't in the recovered set yet, please hold off recreating them until end of day.",
          "IT will keep scanning the network logs for a possible secondary backup on the file server.",
          "Once we find anything usable, I'll forward it straight to your team so you're not duplicating effort.",
          "Note: please don't reply-all on this thread, just ping me directly if you spot the missing files.",
        ],
      },
      {
        from: "Mr Tang <TangLH@cpf.gov.sg>",
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
    // -----------------------------------------------------------------
    // Real-world team task shown alongside Stage 3A: while some of the
    // team solves the department gate and tile puzzle, someone else
    // starts drawing the CPF Board logo from this description. They
    // photograph it in Stage 3B, right after the tiles are solved.
    // -----------------------------------------------------------------
    logoTask: {
      eyebrow: "Team Task",
      heading: "Meanwhile — draw the CPF Board logo",
      intro:
        "Split up the work. While someone tackles the puzzles below, have someone else start sketching the CPF Board logo on paper, using only this description:",
      clues: [
        "The Circle, Shield, and Three Keys: Symbolize the completeness of the national savings scheme, the protection of members' retirement security, and the tripartite unity of employees, employers, and the government.",
        "The Colour Green: Signifies constant growth, progress, and dynamism.",
      ],
      note: "You'll photograph the finished drawing right after piecing together the Mission statement below.",
    },
    // -----------------------------------------------------------------
    // Gate puzzle shown BEFORE the phrase tiles: pick the real CPF
    // departments out of a list of 15. Exactly 5 are real; the other 10
    // are decoys. Player must select the exact set of 5 correct codes.
    // For this test build, real ones start with "A" — swap in genuine
    // department names/codes later without touching any other file.
    // -----------------------------------------------------------------
    deptChallenge: {
      eyebrow: "Stage 3A",
      question: "You'll have to piece together the Board's Mission.",
      instructions: "Fragments of the Board's Mission are hidden in the folders below, but you'll have to select only the folders that are actual departments in CPF Board.",
      submitButton: "Submit Selection",
      failureMessage: "That's not right — recheck your selections and try again.",
      // Shown appended to the failure message once attempts reach hintAfterAttempts.
      hintMessage: "Hint: exactly 5 of these are genuine CPF departments.",
      hintAfterAttempts: 3,
      departments: [
        { code: "AMS", correct: true },
        { code: "ARD", correct: true },
        { code: "ACS", correct: true },
        { code: "APD", correct: true },
        { code: "AGR", correct: true },
        { code: "BXT", correct: false },
        { code: "CVR", correct: false },
        { code: "DKN", correct: false },
        { code: "ELQ", correct: false },
        { code: "FYP", correct: false },
        { code: "GNB", correct: false },
        { code: "HWS", correct: false },
        { code: "JQD", correct: false },
        { code: "KZM", correct: false },
        { code: "LTV", correct: false },
      ],
    },
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
  // STAGE 3B — Photograph the team's CPF Board logo drawing
  // ---------------------------------------------------------------------
  stage3b: {
    eyebrow: "Stage 3B",
    title: "Capture Your Team's Logo",
    intro: "Take a photo of the CPF Board logo your team drew.",
    permissionNote: "Tapping the button below will ask for camera access — allow it to continue.",
    captureButton: "Open Camera",
    retakeButton: "Retake Photo",
    continueButton: "Continue",
    // Shown if the photo can't be saved for later (e.g. device storage full) —
    // the player can still continue, it just may not survive a page reload.
    storageWarning: "Couldn't save your photo for later on this device, but it'll still show on the final screen for now.",
  },

  // ---------------------------------------------------------------------
  // STAGE 4 — Two split, physical/facilitator-led challenges: number of
  // members served (4A) and number of national projects (4B). Both are
  // solved outside the app; the app just collects and validates the two
  // answers. Shown together, solvable in either order/in parallel by
  // different teammates — Stage 5 unlocks only once BOTH are correct.
  // ---------------------------------------------------------------------
  stage4: {
    title: "Stage 4 · The Numbers",
    intro:
      "Slide 2 has missing figures. Split the challenges below between your team members. Solve each challenge and key in your answers to progress.",
    summaryTemplate: "CPF Board serves {members} million members through over {projects} national projects.",
    continueButton: "Continue",
    challengeA: {
      label: "Stage 4A",
      prompt: "Find out how many members we serve! Approach the facilitator for the tool you'll need.",
      inputLabel: "Your answer",
      inputPlaceholder: "",
      answer: "4.3",
      submitButton: "Submit",
      errorMessage: "That's not right. Try again.",
    },
    challengeB: {
      label: "Stage 4B",
      prompt:
        "Look behind each team's Character Board. Count and add up the total number of GREEN dots you find behind all the Character Boards to get the answer.",
      inputLabel: "Your answer",
      inputPlaceholder: "",
      answer: "30",
      submitButton: "Submit",
      errorMessage: "That's not right. Try again.",
    },
  },

  // ---------------------------------------------------------------------
  // STAGE 5 — Physical/facilitator-led crossword unlocks 3 key Vision
  // words. The app just collects the 3 typed answers, live-colouring each
  // field red/green as the team types, and validates the SET of all three
  // against the answers below (any answer in any of the 3 fields counts —
  // the app doesn't assume which field maps to which crossword word).
  // ---------------------------------------------------------------------
  stage5: {
    title: "Stage 5 · Find the Key Words",
    intro:
      "Find the key words in our Vision. Approach the facilitator for the 3 crossword puzzle for your team to solve to unlock the 3 key words in CPF Board's Vision.",
    hint: "Solve the crossword puzzle completely, and unscramble the highlighted boxes.",
    colorHint: "Hint: Get a word right and it'll turn green.",
    wordLabels: ["Word 1", "Word 2", "Word 3"],
    answers: ["TRUSTED", "RESPECTED", "COMMITTED"],
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
    logoLabel: "Your Team's Logo",
    completionHeading: "Mission Complete",
    completionBody:
      "Both slides are rebuilt and ready. Show this screen to your facilitator to confirm your team is done.",
    restartButton: "Reset for Next Team",
  },
};
