const Country = require("../models/Country");

// GET all countries
const getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find({}).sort({ name: 1 });
    res.status(200).json(countries);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET countries by continent
const getCountriesByContinent = async (req, res) => {
  try {
    const countries = await Country.find({
      continent: req.params.continent,
    }).sort({ name: 1 });
    res.status(200).json(countries);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET single country by name
const getCountryByName = async (req, res) => {
  try {
    const country = await Country.findOne({
      name: new RegExp(`^${req.params.name}$`, "i"),
    });
    if (!country) return res.status(404).json({ message: "Country not found" });
    res.status(200).json(country);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST create country (admin/seed use)
const createCountry = async (req, res) => {
  const { name, continent } = req.body;
  try {
    const existing = await Country.findOne({ name });
    if (existing)
      return res.status(400).json({ message: "Country already exists" });
    const country = await Country.create({ name, continent });
    res.status(201).json(country);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE country
const deleteCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndDelete(req.params.id);
    if (!country) return res.status(404).json({ message: "Country not found" });
    res.status(200).json({ message: "Country deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllCountries,
  getCountriesByContinent,
  getCountryByName,
  createCountry,
  deleteCountry,
};
