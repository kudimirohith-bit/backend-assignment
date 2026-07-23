const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// GET /protected/profile or /profile
router.get(["/profile", "/protected/profile"], async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Missing Authorization header" });
    }

    const parts = authHeader.split(" ");
    const token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : authHeader;

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ message: "Invalid token" });
        }

        return res.status(200).json({
            id: user.id,
            email: user.email,
            user: user
        });
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
});

module.exports = router;
