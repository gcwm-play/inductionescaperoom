/**
 * qr.js — thin ES module wrapper exposing the vendored QR encoder as
 * window.CPFQRCode, so the classic-script app.js can call it directly.
 * See room-sync.js for why module scripts are safe to depend on from
 * classic scripts here (they're deferred, so they finish before any
 * user-triggered handler could call into them).
 */
import qrcode from "./vendor/qrcode-generator.bundle.js";
window.CPFQRCode = qrcode;
