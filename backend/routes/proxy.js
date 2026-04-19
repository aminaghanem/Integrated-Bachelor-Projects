const express = require("express")
const router = express.Router()
const axios = require('axios');
const cheerio = require('cheerio');

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL is required');

  try {
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    const urlObj = new URL(targetUrl);
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    // Base path for resolving relative URLs like "css/main.css"
    const basePath = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

    // Resolves any URL (relative, root-relative, or absolute) to absolute
    const toAbsolute = (val) => {
      if (!val) return val;
      if (/^(https?:\/\/|\/\/|data:|mailto:|javascript:|#)/.test(val)) return val;
      if (val.startsWith('/')) return origin + val;
      return basePath + val;  // ← THIS is what fixes hero_slides/left.png and css/main.css
    };

    // Fix href and src on all elements
    $('[href]').each((_, el) => {
      const val = $(el).attr('href');
      $(el).attr('href', toAbsolute(val));
    });

    $('[src]').each((_, el) => {
      const val = $(el).attr('src');
      $(el).attr('src', toAbsolute(val));
    });

    // Fix srcset (e.g. <img srcset="img-2x.png 2x, img-1x.png 1x">)
    $('[srcset]').each((_, el) => {
      const srcset = $(el).attr('srcset');
      const fixed = srcset.split(',').map(part => {
        const [url, descriptor] = part.trim().split(/\s+/);
        return descriptor ? `${toAbsolute(url)} ${descriptor}` : toAbsolute(url);
      }).join(', ');
      $(el).attr('srcset', fixed);
    });

    // Fix url(...) inside <style> tags
    $('style').each((_, el) => {
      const css = $(el).html();
      const fixed = css.replace(/url\(['"]?([^'")]+)['"]?\)/g, (match, path) => {
        return `url("${toAbsolute(path)}")`;
      });
      $(el).html(fixed);
    });

    // Fix url(...) inside inline style attributes
    $('[style]').each((_, el) => {
      const style = $(el).attr('style');
      const fixed = style.replace(/url\(['"]?([^'")]+)['"]?\)/g, (match, path) => {
        return `url("${toAbsolute(path)}")`;
      });
      $(el).attr('style', fixed);
    });

    // Keep _self so ShadowViewer link interception works
    $('a').each((_, el) => {
      $(el).attr('target', '_self');
    });

    // Remove the base tag — toAbsolute handles everything now,
    // and a <base> tag can interfere with the Shadow DOM context
    $('base').remove();

    res.send($.html());
  } catch (error) {
    console.error("Proxy Error:", error.message);
    res.status(500).send("Could not load page");
  }
});

module.exports = router;