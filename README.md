# Playto Community Feed

A prototype community feed with threaded discussions and a 24-hour karma
leaderboard.

## Links

- Repo: https://github.com/Xxdinesh04xX/playto-challenge
- Live demo: https://playto-challenge-3.onrender.com/
- API base: https://playto-challenge-1.onrender.com/api/

## Highlights

- Threaded comments with efficient tree loading
- Like toggle (like/unlike) with race-safe unique constraints
- 24h leaderboard (dynamic aggregation, no cached totals)
- Login/Signup flow with passwords
- Search + sorting (new/top/discussed) and infinite scroll
- Profiles (stats + recent posts/comments)
- Notifications (likes, replies, comments, mentions)
- @mentions + mention notifications
- Basic abuse filter for banned words (client + server)
 - Inline reply composer (no alerts)

## Local Setup

### Backend (Django + DRF)

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The API runs at `http://localhost:8000/api/`.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Optionally set `VITE_API_URL` if your backend is running elsewhere:

```bash
VITE_API_URL=http://localhost:8000/api npm run dev
```

### Docker (Bonus)

```bash
docker compose up --build
```

Backend will be on `http://localhost:8000/api/`, frontend on `http://localhost:5173/`.

## API Summary

- `POST /api/auth/signup/` `{ "username": "alice", "password": "secret" }`
- `POST /api/auth/login/` `{ "username": "alice", "password": "secret" }`
- `GET /api/posts/?search=&sort=new|top|discussed&limit=10&offset=0`
- `POST /api/posts/` `{ "author_id": 1, "content": "hello" }`
- `GET /api/posts/:id/`
- `GET /api/posts/:id/comments/?limit=10&offset=0` (threaded tree, paginated roots)
- `POST /api/posts/:id/comments/` `{ "author_id": 1, "content": "hi", "parent_id": null }`
- `POST /api/posts/:id/like/` `{ "user_id": 1 }`
- `POST /api/comments/:id/like/` `{ "user_id": 1 }`
- `GET /api/leaderboard/`
- `GET /api/users/:id/profile/`
- `GET /api/users/lookup/?username=alice`
- `GET /api/notifications/?user_id=1`
- `POST /api/notifications/mark-read/` `{ "user_id": 1, "notification_id": null }`

## Notes

- Likes are protected with unique constraints to prevent double likes.
- The leaderboard is computed dynamically from likes in the last 24 hours.
- Run tests with `python manage.py test`.
