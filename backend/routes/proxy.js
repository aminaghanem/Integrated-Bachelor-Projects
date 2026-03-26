// routes/proxy.js
const express = require("express")
const router = express.Router()
const fetch = require("node-fetch") // npm install node-fetch@2

router.get("/", async (req, res) => {

  const { url } = req.query
  if (!url) return res.status(400).send("Missing url param")

  try {

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SmartGuard/1.0)"
      }
    })

    if (!response.ok) {
      return res.status(500).send("Failed to load page")
    }

    const contentType = response.headers.get("content-type") || "text/html"

    const html = await response.text()   // ✅ THIS WAS MISSING

    // ✅ Allow iframe embedding
    res.setHeader("Content-Type", contentType)
    res.setHeader("X-Frame-Options", "ALLOWALL")

    // ⚠️ Remove CSP if exists
    res.removeHeader("Content-Security-Policy")

    // ✅ Send ONLY ONCE
    res.send(html)

  } catch (err) {

    console.error("Proxy failed:", err)
    res.status(500).send("Failed to fetch page: " + err.message)

  }

})

module.exports = router