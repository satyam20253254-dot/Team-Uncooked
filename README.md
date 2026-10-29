# The Ancient One’s Trials

Constraint-aware interview scheduling and recruitment pipeline management for campus placement drives.

- **Repository:** [Team-Uncooked on GitHub](https://github.com/satyam20253254-dot/Team-Uncooked)
- **Live demo:** Not published in this repository yet.
- **Demo video:** No video link is currently available.

## Overview

The Ancient One’s Trials coordinates candidates, interviewers, rooms, interview rounds, availability, and evaluations in one application. Coordinators can generate a versioned schedule draft using candidate and interviewer availability, interviewer skills and daily capacity, room availability, round prerequisites, and conflict checks. They review and publish the draft; candidates and interviewers then see assignments from the published schedule.

The application has three main roles:

- **Coordinator:** configures drives, candidates, interviewers, rounds, rooms, availability, and schedules; reviews evaluations and rankings.
- **Candidate:** submits availability, views pipeline progress, self-books eligible open slots, and accesses confirmed interview details.
- **Interviewer:** submits availability, views assigned interviews, records evaluations, and can request reassignment for an interview.

## Features

- Placement drive and participant management.
- Configurable interview rounds with duration, required skills, sequence, and prerequisite rounds.
- Physical and virtual interview rooms with availability windows.
- Automated schedule generation with resource conflict, skill, capacity, availability, and progression checks.
- Versioned schedule drafts, conflict validation, publishing, and draft discard.
- Candidate self-booking with a server-side recheck under a per-drive write lock.
- Candidate pipeline progression based on interview evaluations and round outcomes.
- Interview scorecards with a 1–10 rating, feedback, and recommendation; candidate ranking matrix.
- Interview rescheduling to a qualified, available interviewer when one can be found.
- Downloadable `.ics` calendar invites and Google Calendar links.
- In-app notifications for schedule and interview events.
- Role-based access control and password-protected accounts.

## Technology

- **Frontend:** React, Vite, React Router, Tailwind CSS, Axios.
- **Backend:** Node.js, Express, Mongoose, MongoDB.
- **Authentication:** JWT with HTTP-only cookies and bearer-token support.
- **Database:** MongoDB (MongoDB Atlas is suitable for hosted deployments).

## Project structure

```text
Team-Uncooked/
├── backend/
│   ├── controllers/       # Request handlers and application workflows
│   ├── db/                # MongoDB connection
│   ├── middleware/        # Authentication and role checks
│   ├── models/            # Mongoose data models
│   ├── routes/            # REST API routes
│   ├── tests/             # Node test-runner tests
│   └── utils/             # Scheduling engine and shared utilities
└── frontend/
    └── src/
        ├── components/    # Shared layout and UI components
        ├── context/       # Authentication, drive, and theme state
        ├── pages/         # Dashboard and role workflows
        └── services/      # API client
```

## Requirements

- Node.js **20.19+** or **22.12+** (Vite 8 requirement).
- npm.
- A MongoDB database and connection string.

## Local setup

### 1. Configure the backend

From the repository root:

```bash
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```dotenv
PORT=8000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
ACCESS_TOKEN_SECRET=<long-random-secret>
ACCESS_TOKEN_EXPIRY=1d
CORS_ORIGIN=http://localhost:5173
COORDINATOR_EMAIL=<coordinator-email>
COORDINATOR_PASSWORD=<strong-bootstrap-password>
```

`COORDINATOR_PASSWORD` is used only to create the reserved coordinator account the first time it signs in to a database where that account does not yet exist. After creation, the account password is checked against the stored password hash; changing the password does not require changing the bootstrap variable.

Start the backend from the `backend` directory:

```bash
npm run dev
```

The example configuration uses port `8000`. The API health endpoint is `http://localhost:8000/health`.

### 2. Configure and start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
```

Create `frontend/.env.local` with the local backend URL:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Start Vite:

```bash
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Keep both development servers running while using the app.

## Environment variables

### Backend

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port. Defaults to `8000`; hosting platforms can provide their own value. |
| `MONGO_URI` | MongoDB connection string. |
| `ACCESS_TOKEN_SECRET` | Secret used to sign and verify access tokens. Use a long, random value. |
| `ACCESS_TOKEN_EXPIRY` | JWT lifetime; defaults to `1d`. |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins, such as `http://localhost:5173`. For production, use the deployed frontend origin. |
| `COORDINATOR_EMAIL` | Reserved email for the single coordinator account. |
| `COORDINATOR_PASSWORD` | One-time bootstrap password for creating the coordinator account if it does not exist. |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base URL, including `/api/v1`, for example `http://localhost:8000/api/v1`. |

Frontend environment variables are embedded during the Vite build. Set the production value in the frontend hosting provider and rebuild/redeploy after changing it. Do not put secrets in `VITE_*` variables; they are visible in the browser bundle.

## API overview

API routes are rooted at `/api/v1`. Except for registration and login, routes require authentication unless their route definition says otherwise.

| Area | Route prefix | Examples |
|---|---|---|
| Authentication and profile | `/auth` | `POST /register`, `POST /login`, `GET /me`, `PATCH /profile` |
| Drives | `/drives` | Create and manage drives; list drives and participants |
| Rounds, rooms, availability | `/drives/:driveId` | `/rounds`, `/rooms`, `/availabilities` |
| Schedules and self-booking | `/drives/:driveId` | `/schedules/generate`, `/schedules/:versionId/publish`, `/rounds/:roundId/available-slots`, `/rounds/:roundId/self-book`, `/my-pipeline` |
| Interviews and evaluations | `/interviews` | `/my-interviews`, `/:interviewId/evaluation`, `/:interviewId/calendar.ics`, `/:interviewId/reschedule` |
| Ranking matrix | `/drives/:driveId` | `/ranking-matrix` |
| Notifications | `/notifications` | List notifications; mark one or all as read |

The backend also exposes `GET /health` for hosting health checks. Check the route files in `backend/routes/` for request methods and role requirements.

## Scheduling workflow

1. A coordinator creates a drive and configures interview rounds and rooms.
2. Candidates and interviewers join the drive and submit availability; the coordinator can set room availability.
3. The coordinator generates a schedule. This creates a **draft** for review.
4. The coordinator publishes the draft. Candidates and interviewers see scheduled assignments from published schedule versions.
5. Candidates can self-book eligible open slots. The booking endpoint revalidates availability and conflicts before saving.
6. Interviewers submit scorecards. Recommendations can advance a candidate to the next round or disqualify them.

## Run checks

Backend tests:

```bash
cd backend
npm test
```

Frontend lint and production build:

```bash
cd frontend
npm run lint
npm run build
```

## Deployment

The project can use **Render for the API**, **Vercel for the frontend**, and **MongoDB Atlas** for data storage.

### Backend on Render

- Connect the GitHub repository as a **Web Service**.
- Set **Root Directory** to `backend`.
- Set **Build Command** to `npm ci` and **Start Command** to `npm start`.
- Set the backend environment variables from the table above in Render's Environment settings. Do not upload or commit a real `.env` file.
- Set `CORS_ORIGIN` to the exact deployed Vercel frontend origin.
- Use `/health` as the health-check path.
- Configure Atlas Network Access to allow the Render service's outbound IP ranges.

### Frontend on Vercel

- Import the same GitHub repository as a Vercel project.
- Set **Root Directory** to `frontend`, build command to `npm run build`, and output directory to `dist`.
- Add `VITE_API_BASE_URL` in Vercel's Environment Variables, using the deployed Render API URL with `/api/v1` appended.
- `frontend/vercel.json` contains the SPA rewrite needed for React Router direct links and refreshes.
- Redeploy after setting or changing the environment variable.

After deployment, verify the frontend can sign in and call the API, the Render `/health` endpoint responds, and Atlas accepts connections from Render. The live application URL and demonstration video link should be added here once published.

## Security notes

- Keep `backend/.env`, frontend local environment files, and all real credentials out of Git.
- Use strong, unique MongoDB and JWT secrets in production; rotate any credential that has been exposed.
- Set `CORS_ORIGIN` to the exact production frontend origin(s), not a wildcard.
- The `VITE_API_BASE_URL` value is public configuration, not a secret.
