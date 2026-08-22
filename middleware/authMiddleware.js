const supabase = require("../config/supabase");

const authMiddleware = async (req, res, next) => {
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

        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;
