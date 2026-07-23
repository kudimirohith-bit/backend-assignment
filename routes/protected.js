const express = require("express");
const router = express.Router();

// GET /protected/profile or /profile
router.get(["/profile", "/protected/profile"], (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization header" });
    }
    return res.json({
        message: "Access granted",
        authorization: authHeader
    });
});

module.exports = router;
