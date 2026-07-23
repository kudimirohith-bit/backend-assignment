const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const authMiddleware = require("../middleware/authMiddleware");

// POST /auth/signup
router.post("/signup", async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({
            message: "User created successfully",
            user: data.user,
            session: data.session
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /auth/login
router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ error: error.message || "Invalid credentials" });
        }

        const token = data.session ? data.session.access_token : null;

        return res.status(200).json({
            token,
            access_token: token,
            user: data.user
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /auth/logout or /logout
router.post(["/logout", "/auth/logout"], authMiddleware, async (req, res) => {
    try {
        await supabase.auth.signOut();
    } catch (err) {
        // ignore errors on signout
    }
    return res.status(204).send();
});

// GET /auth/profile or /profile
router.get("/profile", authMiddleware, async (req, res) => {
    return res.json({
        id: req.user.id,
        email: req.user.email,
        user: req.user
    });
});

module.exports = router;
