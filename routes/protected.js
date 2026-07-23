const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// GET /protected/profile or /profile
router.get(["/profile", "/protected/profile"], authMiddleware, (req, res) => {
    return res.status(200).json({
        id: req.user.id,
        email: req.user.email,
        user: req.user
    });
});

// GET /protected/dashboard or /dashboard
router.get(["/dashboard", "/protected/dashboard"], authMiddleware, (req, res) => {
    return res.status(200).json({
        message: "Welcome to dashboard",
        id: req.user.id,
        email: req.user.email,
        user: req.user
    });
});

module.exports = router;
