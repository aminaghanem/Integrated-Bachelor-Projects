// // routes/proxy.js
// const express = require("express")
// const router = express.Router()
// const fetch = require("node-fetch") // npm install node-fetch@2

// router.get("/", async (req, res) => {

//   const { url } = req.query
//   if (!url) return res.status(400).send("Missing url param")

//   try {

//     const response = await fetch(url, {
//       headers: {
//         "User-Agent": "Mozilla/5.0 (compatible; SmartGuard/1.0)"
//       }
//     })

//     if (!response.ok) {
//       return res.status(500).send("Failed to load page")
//     }

//     const contentType = response.headers.get("content-type") || "text/html"

//     const html = await response.text()   // ✅ THIS WAS MISSING

//     // ✅ Allow iframe embedding
//     res.setHeader("Content-Type", contentType)
//     res.setHeader("X-Frame-Options", "ALLOWALL")

//     // ⚠️ Remove CSP if exists
//     res.removeHeader("Content-Security-Policy")

//     // ✅ Send ONLY ONCE
//     res.send(html)

//   } catch (err) {

//     console.error("Proxy failed:", err)
//     res.status(500).send("Failed to fetch page: " + err.message)

//   }

// })

// module.exports = router

const express = require("express")
const router = express.Router()

const axios = require('axios');
const cheerio = require('cheerio');

router.get("/", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL is required');

  try {
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(response.data);

    // FIX: Convert relative links (like /style.css) to absolute links
    // so images and styles actually load.
    const urlObj = new URL(targetUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    $('link, script, img, a').each((i, el) => {
      const attr = $(el).attr('href') ? 'href' : 'src';
      const val = $(el).attr(attr);
      if (val && val.startsWith('/')) {
        $(el).attr(attr, baseUrl + val);
      }
    });

    $('a').each((i, el) => {
      $(el).attr('target', '_self');
    });

    // 3. Optional: Inject a base tag to help with relative assets
    $('head').prepend(`<base href="${baseUrl}/">`);

    // Remove scripts if you want a "Safe Mode" for students
    // $('script').remove(); 

    res.send($.html());
  } catch (error) {
    console.error("Proxy Error:", error.message);
    res.status(500).send("Could not load page");
  }
});

module.exports = router