const express = require("express");
const router = express.Router();

// GET /public/info or /info
router.get(["/info", "/public/info"], (req, res) => {
    res.send("Welcome stranger!");
});

module.exports = router;
