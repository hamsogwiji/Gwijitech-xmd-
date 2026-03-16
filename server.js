import express from "express";
import makeWASocket, { 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    Browsers, 
    delay 
} from "@whiskeysockets/baileys";
import P from "pino";

const app = express();
app.use(express.json());

let sock;

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState("sessions");

    sock = makeWASocket({
        auth: state,
        version,
        logger: P({ level: 'silent' }),
        // Mandatory: You must set a specific browser for pairing to work
        browser: Browsers.macOS("Chrome"), 
        printQRInTerminal: false // Disable QR if using Pairing Code
    });

    // Handle Pairing Code Request
    if (!sock.authState.creds.registered) {
        // Replace with your actual phone number in E.164 format (e.g., 254712345678)
        const phoneNumber = "YOUR_PHONE_NUMBER_HERE"; 
        
        // Brief delay ensures the socket is ready before requesting the code
        await delay(5000); 
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n\n[PAIRING CODE]: ${code}\n\n`);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") console.log("Bot Connected!");
        if (connection === "close") startBot();
    });
}

startBot();
app.listen(3000, () => console.log("Server running on port 3000"));
