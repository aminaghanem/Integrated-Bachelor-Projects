// routes/proxy.js
const express = require("express")
const router = express.Router()
const fetch = require("node-fetch") // npm install node-fetch@2

// router.get("/", async (req, res) => {
//   const { url } = req.query
//   if (!url) return res.status(400).send("Missing url param")

//   try {
//     const response = await fetch(url, {
//       headers: { "User-Agent": "Mozilla/5.0 (compatible; SmartGuard/1.0)" }
//     })
//     const contentType = response.headers.get("content-type") || "text/html"
//     res.setHeader("Content-Type", contentType)
//     // Remove headers that would block iframe embedding
//     res.removeHeader("X-Frame-Options")
//     res.removeHeader("Content-Security-Policy")

//     const html = await response.text()
    
//     const script = `<script>
//         document.addEventListener('scroll', () => window.parent.postMessage({type:'scroll'}, '*'), {once: true});
//         document.addEventListener('click', () => window.parent.postMessage({type:'click'}, '*'));
//     </script>`
//     const injected = html.replace("</body>", script + "</body>")
//     res.send(injected)

//   } catch (err) {
//     res.status(500).send("Failed to fetch page: " + err.message)
//   }
// })

router.get("/", async (req, res) => {

  const { url } = req.query
  if (!url) return res.status(400).send("Missing url param")

  try {

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SmartGuard/1.0)"
      }
    })

    const contentType = response.headers.get("content-type") || "text/html"

    const html = await response.text()   // ✅ THIS WAS MISSING

    res.setHeader("Content-Type", contentType)

    // script to capture activity
    const script = `
    <script>
      document.addEventListener('scroll', () => {
        window.parent.postMessage({type:'scroll'}, '*')
      }, {once:true});

      document.addEventListener('click', () => {
        window.parent.postMessage({type:'click'}, '*')
      });
    </script>
    `

    const injected = html.includes("</body>")
    ? html.replace("</body>", script + "</body>")
    : html + script

    
    res.send(injected)

  } catch (err) {

    console.error("Proxy failed:", err)
    res.status(500).send("Failed to fetch page: " + err.message)

  }

})

module.exports = router