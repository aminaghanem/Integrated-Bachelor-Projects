// ─── countryRoutes.js ───────────────────────────────────────
const express = require("express");
const router = express.Router();
const {
  getAllCountries,
  getCountriesByContinent,
  getCountryByName,
  createCountry,
  deleteCountry,
} = require("../controllers/countryController");

router.get("/", getAllCountries);
router.get("/continent/:continent", getCountriesByContinent);
router.get("/:name", getCountryByName);
router.post("/", createCountry);
router.delete("/:id", deleteCountry);

module.exports = router;
