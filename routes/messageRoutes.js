const express = require("express");
const router = express.Router();

const repository = require("../repository/postgresRepository");

router.get("/", async (req, res) => {
    const messages = await repository.getAllMessages();
    res.json(messages);
});

router.post("/", async (req, res) => {
    const { text } = req.body;

    const message = await repository.addMessage(text);

    res.status(201).json(message);
});

module.exports = router;
