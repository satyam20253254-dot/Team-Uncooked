# Interview Scheduler Backend

Starter backend for the interview scheduling platform, using Node.js, Express, and MongoDB/Mongoose.

## Setup

1. Install Node.js LTS and run MongoDB locally, or create a MongoDB Atlas database.
2. In this `backend` directory, install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and set `MONGODB_URI`.
4. Start development mode:
   ```bash
   npm run dev
   ```

The API uses port 5000 by default. `GET /api/health` returns a health response.

## Initial models

- `User.js`: coordinator, candidate, and interviewer.
- `Drive.js`: a recruitment/placement drive.
- `DriveParticipant.js`: users participating in a drive.

Authentication, authorization, validation middleware, rounds, rooms, availability,
schedule versions, interviews, and scheduling logic are not implemented yet.
