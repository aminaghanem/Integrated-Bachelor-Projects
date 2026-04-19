// routes/policies.js  (add to the existing file)
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const express = require("express");

const router = express.Router();

router.post("/launch-gui", (req, res) => {
  const path = require("path");
  const { spawn } = require("child_process");
  
  const scriptPath = "..\\PolicyEngine\\run_agentvilm.py";
  const cwd = path.dirname(scriptPath);

  try {
    // Use pythonw to avoid the black console window
    const proc = spawn("pythonw", [scriptPath], {
      detached: true,
      shell: true,
      cwd,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      stdio: ["ignore", "pipe", "pipe"]  // capture stderr to see the crash reason
    });

    let errorOutput = "";
    let hasError = false;

    proc.stderr.on("data", d => {
      const text = d.toString();
      errorOutput += text;
      console.error("Python stderr:", text);
      // Detect real startup failures only, not normal INFO/WARNING logs
      if (/Traceback|Exception|AttributeError|ImportError|RuntimeError|SyntaxError/.test(text)) {
        hasError = true;
      }
    });

    proc.on("error", (err) => {
      console.error("Spawn error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to launch GUI", detail: err.message });
      }
    });

    proc.on("exit", (code) => {
      if (code !== null && code !== 0 && !res.headersSent) {
        res.status(500).json({ 
          error: "GUI crashed during startup", 
          detail: errorOutput || `Exit code: ${code}` 
        });
      }
    });

    // Give it 2.5 seconds — if it's still running, it launched successfully
    setTimeout(() => {
      if (!res.headersSent) {
        if (hasError) {
          res.status(500).json({ 
            error: "GUI failed to start", 
            detail: errorOutput.slice(-500) // Last 500 chars to avoid huge responses
          });
        } else {
          proc.unref();
          res.json({ ok: true, message: "Policy Manager GUI launched" });
        }
      }
    }, 2500);
  } catch (err) {
    console.error("Launch-GUI error:", err);
    res.status(500).json({ error: "Failed to launch GUI", detail: err.message });
  }
});

module.exports = router;

// Path to her text file — adjust this to wherever her Python project lives
// const POLICY_FILE = path.join(__dirname, "../../PolicyEngine/policy_output_agentvlm.txt");
// const OVERRIDE_LOG = path.join(__dirname, "../../agentvlm/output/policy_log.txt");

// // GET static pipeline policies (parsed from her .txt file)
// router.get("/pipeline", async (req, res) => {
//   try {
//     const content = fs.readFileSync(POLICY_FILE, "utf-8");
//     const policies = parsePolicyFile(content);
//     res.json(policies);
//   } catch (e) {
//     res.status(500).json({ error: "Could not read policy file", detail: e.message });
//   }
// });

// // GET admin overrides log
// router.get("/overrides", async (req, res) => {
//   try {
//     if (!fs.existsSync(OVERRIDE_LOG)) return res.json([]);
//     const content = fs.readFileSync(OVERRIDE_LOG, "utf-8");
//     res.json(parseOverrideLog(content));
//   } catch (e) {
//     res.status(500).json({ error: "Could not read override log" });
//   }
// });

// function parsePolicyFile(content) {
//   const policies = [];
//   // Split on the 80-dash separator lines
//   const blocks = content.split(/─{80}/);
  
//   for (const block of blocks) {
//     const get = (label) => {
//       const m = block.match(new RegExp(`${label}\\s*:\\s*(.+)`));
//       return m ? m[1].trim() : null;
//     };
    
//     const ruleId = get("Rule ID");
//     const url    = get("URL");
//     if (!ruleId || !url) continue;
    
//     policies.push({
//       rule_id:       ruleId,
//       school_level:  get("School Level"),
//       grade_range:   get("Grade Range"),
//       age_range:     get("Age Range"),
//       interest:      get("Interest"),
//       url,
//       decision:      get("Decision"),
//       risk_level:    get("Risk Level"),
//       reason:        get("Reason"),
//       alternatives:  get("Recommended Alternatives"),
//       accessible:    get("Disability Accessible"),
//     });
//   }
//   return policies;
// }

// function parseOverrideLog(content) {
//   const policies = [];
//   const blocks = content.split("-".repeat(80));
  
//   for (const block of blocks) {
//     const get = (label) => {
//       const m = block.match(new RegExp(`${label}:\\s*(.+)`));
//       return m ? m[1].trim() : null;
//     };
//     const url = get("URL");
//     if (!url) continue;
//     policies.push({
//       rule_id:      get("Rule ID"),
//       timestamp:    get("Timestamp"),
//       school_level: get("School Level"),
//       grade_range:  get("Grade Range"),
//       age_range:    get("Age Range"),
//       interest:     get("Interest"),
//       url,
//       decision:     get("Decision"),
//       reason:       get("Reason"),
//     });
//   }
//   return policies;
// }