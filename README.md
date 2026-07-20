# Backend Assignment

A Node.js/Express backend with SQLite for task management.

## Setup

```bash
npm install
```

## Run

```bash
node server.js
```

Server starts on `http://localhost:3000`.

## API

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | Get all tasks |
| GET | `/tasks/:id` | Get task by ID |
| POST | `/tasks` | Create task (body: `{ "title": "..." }`) |
| PUT | `/tasks/:id` | Update task (body: `{ "title": "...", "done": 0/1 }`) |
| DELETE | `/tasks/:id` | Delete task |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages` | Get all messages |
| POST | `/messages` | Create message (body: `{ "text": "..." }`) |

## Database

- `tasks.db` — SQLite database (auto-created on first run)
- Seeds with "Learn Node", "Learn Express", "Learn SQLite" if empty
