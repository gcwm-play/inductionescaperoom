/**
 * room-sync.js — wraps the vendored Firebase Firestore bundle into a
 * small global API (window.CPFRoomSync) that plain classic scripts
 * (app.js, the follower page) can call without themselves being modules.
 *
 * This file must be loaded with <script type="module">. Module scripts
 * are deferred automatically (run after HTML parsing, before
 * DOMContentLoaded), so window.CPFRoomSync is guaranteed to exist by the
 * time any user-triggered handler in app.js could call it — app.js's own
 * top-level code runs synchronously during parsing and never calls into
 * CPFRoomSync at that point, only from later event handlers.
 *
 * Firestore document shape, collection "rooms", doc id = room code:
 *   { teamName: string, stageIndex: number, createdAt, updatedAt }
 * Deliberately minimal — puzzle text itself lives in content.js on every
 * device already; only "which stage is the team on" needs to sync.
 */
import {
  initializeApp,
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "./vendor/firebase-firestore.bundle.js";

var app = null;
var db = null;
function ensureDb() {
  if (!db) {
    app = initializeApp(window.CPF_FIREBASE_CONFIG);
    db = getFirestore(app);
  }
  return db;
}

// Excludes visually ambiguous characters (0/O, 1/I/L) since the code may
// be read aloud or typed by hand as a fallback to scanning the QR.
var ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateRoomCode() {
  var code = "";
  for (var i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

async function createRoom(teamName) {
  var database = ensureDb();
  var code = generateRoomCode();
  var ref = doc(database, "rooms", code);
  await setDoc(ref, {
    teamName: teamName,
    stageIndex: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return code;
}

// Fire-and-forget by design: a flaky connection on the leader's phone
// must never block or break local gameplay. Followers simply catch up
// whenever connectivity returns and the next stage transition succeeds.
async function advanceStage(roomCode, stageIndex) {
  if (!roomCode) return;
  var database = ensureDb();
  var ref = doc(database, "rooms", roomCode);
  try {
    await updateDoc(ref, { stageIndex: stageIndex, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn("room-sync: advanceStage failed (will retry on next stage change)", e);
  }
}

// Returns an unsubscribe function.
function subscribeRoom(roomCode, onUpdate, onError) {
  var database = ensureDb();
  var ref = doc(database, "rooms", roomCode);
  return onSnapshot(
    ref,
    function (snap) {
      if (!snap.exists()) {
        if (onError) onError(new Error("Room not found"));
        return;
      }
      onUpdate(snap.data());
    },
    function (err) {
      if (onError) onError(err);
    }
  );
}

window.CPFRoomSync = {
  createRoom: createRoom,
  advanceStage: advanceStage,
  subscribeRoom: subscribeRoom,
  generateRoomCode: generateRoomCode,
};
