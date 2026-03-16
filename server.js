const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@adiwajshing/baileys");
const P = require("pino");

const app = express();
app.use(express.json());

let sock; // WhatsApp socket instance

// Start the WhatsApp bot
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState("sessions");

  sock = makeWASocket({
    auth: state,
    version,
    logger: P({ level: 'silent' })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR code generated for pairing:", qr);
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("Connection closed. Reason:", reason);
      startBot(); // auto-reconnect
    }

    if (connection === "open") {
      console.log("WhatsApp bot connected!");
    }
  });
}

startBot();

// Endpoint to request pairing QR
app.get("/pair", async (req, res) => {
  try {
    if (!sock) return res.status(500).json({ error: "Bot not ready" });

    // Listen for a QR event (wait max 25s)
    let qrSent = false;
    const timeout = setTimeout(() => {
      if (!qrSent) res.status(500).json({ error: "QR not generated in time" });
    }, 25000);

    const qrHandler = (update) => {
      if (update.qr && !qrSent) {
        qrSent = true;
        clearTimeout(timeout);
        res.json({ qr: update.qr });
      }
    };

    sock.ev.once("connection.update", qrHandler);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Optional: send test message using saved session
app.post("/send", async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).json({ error: "Missing fields" });

    await sock.sendMessage(number + "@s.whatsapp.net", { text: message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Bot server running on port 3000");
});
