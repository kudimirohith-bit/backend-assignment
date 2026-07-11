const express = require("express");

const app = express();

const PORT = 3000;

app.get("/", (req, res) => {
    res.json({
        message: "Backend is running"
    });
});

app.get("/hello", (req, res) => {
    res.json({
        message: "Hello from Backend!"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});