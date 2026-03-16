
const express = require("express")
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys")

const app = express()
app.use(express.json())

let sock

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("sessions")
  sock = makeWASocket({ auth: state })
  sock.ev.on("creds.update", saveCreds)
  sock.ev.on("connection.update", async (update) => {
    const { connection } = update
    if (connection === "open") console.log("Bot connected to WhatsApp")
  })
}

startBot()

// Generate pairing code
app.post("/pair", async (req,res)=>{
  const number=req.body.number
  try{
    // Simple mock pairing code for demo
    let code="XMD-"+Math.floor(Math.random()*999999)
    
    // Send session ID to user's WhatsApp after delay
    setTimeout(async()=>{
      try{
        await sock.sendMessage(number+"@s.whatsapp.net",{text:`✅ Pairing Successful!\nYour Session ID: ${code}`})
      }catch(e){console.log("Failed to send message",e)}
    },3000) // 3 seconds delay

    res.json({pairingCode:code})
  }catch(err){
    res.json({error:"Failed"})
  }
})

app.listen(3000,()=>console.log("Bot server running on port 3000"))
