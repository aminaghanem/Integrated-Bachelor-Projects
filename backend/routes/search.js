const express = require("express")
const router = express.Router()
const axios = require("axios")
const cheerio = require("cheerio")

router.get("/", async (req, res) => {
  const { q } = req.query

  if (!q) {
    return res.status(400).json({ error: "Missing query" })
  }

  try {
    const response = await axios.get(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    )

    const $ = cheerio.load(response.data)

    const results = []

    $(".result").each((i, el) => {
    const title = $(el).find(".result__a").text()

    let link = $(el).find(".result__a").attr("href")

    if (link && link.includes("uddg=")) {
        const params = new URLSearchParams(link.split("?")[1])
        link = decodeURIComponent(params.get("uddg"))
    }

    const snippet = $(el).find(".result__snippet").text()

    if (title && link) {
        results.push({ title, link, snippet })
    }
    })
    
    res.json({ results: results.slice(0, 10) }) // limit to 10

  } catch (err) {
    console.error("DuckDuckGo search error:", err.message)
    res.status(500).json({ error: "Search failed" })
  }
})

module.exports = router