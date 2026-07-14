const pool = require("../db");

async function getAllMessages() {
    const result = await pool.query(
        "SELECT * FROM messages ORDER BY id"
    );

    return result.rows;
}

async function addMessage(text) {
    const result = await pool.query(
        "INSERT INTO messages(text) VALUES($1) RETURNING *",
        [text]
    );

    return result.rows[0];
}

module.exports = {
    getAllMessages,
    addMessage
};
