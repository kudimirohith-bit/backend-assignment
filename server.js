require("dotenv").config();
const express = require("express");
const db = require("./database");
const messageRoutes = require("./routes/messageRoutes");
const app = express();

app.use(express.json());

app.use("/messages", messageRoutes);

const PORT = process.env.PORT || 3000;

app.get("/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
});

app.delete("/tasks/:id", (req, res) => {
    const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
        return res.status(404).json({ error: "Task not found" });
    }
    res.json({ message: "Task deleted" });
});

app.put("/tasks/:id", (req, res) => {
    const { title, done } = req.body;
    const result = db.prepare("UPDATE tasks SET title = COALESCE(?, title), done = COALESCE(?, done) WHERE id = ?").run(title, done, req.params.id);
    if (result.changes === 0) {
        return res.status(404).json({ error: "Task not found" });
    }
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    res.json(task);
});

app.post("/tasks", (req, res) => {
    const { title } = req.body;
    if (!title) {
        return res.status(400).json({ error: "Title is required" });
    }
    const result = db.prepare("INSERT INTO tasks (title, done) VALUES (?, 0)").run(title);
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(task);
});

app.get("/tasks/:id", (req, res) => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!task) {
        return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
});

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
const row = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();
console.log(`Database Connected! Tasks: ${row.count}`);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});