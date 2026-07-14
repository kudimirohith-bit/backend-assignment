require("dotenv").config();
const express = require("express");
const pool = require("./db");
const messageRoutes = require("./routes/messageRoutes");
const app = express();

app.use(express.json());

app.use("/messages", messageRoutes);

const PORT = process.env.PORT || 3000;

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
pool.query("SELECT NOW()")
    .then((result) => {
        console.log("Database Connected!");
        console.log(result.rows[0]);
    })
    .catch((err) => {
        console.error("Database Error:", err.message);
    });
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});