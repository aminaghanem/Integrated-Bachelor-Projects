const axios = require("axios")

const BASE = "http://localhost:4000/api/activity"
const TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2Q0NWI3NTRkMmUwZWQwZGJlMjcyNSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzc1NzY0MzAzLCJleHAiOjE3NzYzNjkxMDN9.pP8YHc-Sni4oFbhgaV05x5WTFM9Nt_ZQ_WQTR3_LtKI"
const headers = { Authorization: TOKEN, "Content-Type": "application/json" }

// Helper to run a test
const tests = [
  // Test 1: valid URL — expect 200 Allowed
  { name: "T1 valid URL",            url: "https://www.example.com",      expect: 200 },

  // Test 10: empty URL — expect 403 Blocked
  { name: "T10 empty URL",           url: "",                              expect: 403 },

  // Test 11: no scheme — expect 200 Allowed (orchestrator adds https)
  { name: "T11 no scheme",           url: "example.com",                  expect: 200 },

  // Test 12: ftp scheme — expect 403 Blocked
  { name: "T12 ftp scheme",          url: "ftp://example.com/file",        expect: 403 },

  // Test 13: malformed — expect 403 Blocked
  { name: "T13 malformed",           url: "https://",                      expect: 403 },

  // Test 17: restricted keyword — expect 403 Blocked
  { name: "T17 adult content",       url: "https://adult-content.com",     expect: 403 },

  // Test 18: localhost — expect 200 Allowed
  { name: "T18 localhost",           url: "http://localhost:3000",         expect: 200 },
]

async function runTests() {
  console.log("Running integration tests...\n")
  for (const t of tests) {
    try {
      const res = await axios.post(`${BASE}/check`, { url: t.url }, { headers })
      const pass = res.status === t.expect
      console.log(`${pass ? "✅" : "❌"} ${t.name} — got ${res.status}, expected ${t.expect}`)
      if (!pass) console.log("   Response:", res.data)
    } catch (err) {
      const status = err.response?.status
      const pass = status === t.expect
      console.log(`${pass ? "✅" : "❌"} ${t.name} — got ${status}, expected ${t.expect}`)
      if (!pass) console.log("   Response:", err.response?.data)
    }
  }
}

runTests()