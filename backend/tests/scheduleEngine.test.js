import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSchedulePlan,
  dedupeScheduledInterviews,
  filterScheduledInterviewsByPublishedVersion,
  intervalsOverlap,
  matchesSkills,
} from "../utils/scheduleEngine.js";

const now = new Date("2026-10-27T00:00:00.000Z");
const window = (ownerType, ownerId, startTime = "2026-10-27T09:00:00.000Z", endTime = "2026-10-27T13:00:00.000Z") => ({
  ownerType,
  ownerId,
  startTime: new Date(startTime),
  endTime: new Date(endTime),
});

const makePlan = (overrides = {}) => buildSchedulePlan({
  rounds: [{ _id: "round-1", name: "Technical", sequence: 1, durationMinutes: 45, requiredSkills: ["DSA"] }],
  candidateParticipants: [
    { userId: { _id: "candidate-1", name: "Candidate One" } },
    { userId: { _id: "candidate-2", name: "Candidate Two" } },
  ],
  interviewerParticipants: [
    { userId: { _id: "interviewer-1" }, metadata: { skills: ["DSA"], maxDailyInterviews: 4 } },
  ],
  rooms: [{ _id: "room-1" }],
  availabilities: [
    window("candidate", "candidate-1"),
    window("candidate", "candidate-2"),
    window("interviewer", "interviewer-1"),
    window("room", "room-1"),
  ],
  now,
  ...overrides,
});

test("generated appointments do not overlap on any shared resource", () => {
  const { assignments } = makePlan();
  assert.equal(assignments.length, 2);

  for (let left = 0; left < assignments.length; left += 1) {
    for (let right = left + 1; right < assignments.length; right += 1) {
      const a = assignments[left];
      const b = assignments[right];
      for (const key of ["candidateId", "interviewerId", "roomId"]) {
        if (a[key] === b[key]) {
          assert.equal(intervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime), false);
        }
      }
    }
  }
});

test("appointments that meet at an endpoint do not count as overlapping", () => {
  assert.equal(
    intervalsOverlap("2026-10-27T09:00:00Z", "2026-10-27T09:45:00Z", "2026-10-27T09:45:00Z", "2026-10-27T10:30:00Z"),
    false
  );
});

test("carried copies of one active appointment count as one booking", () => {
  const item = {
    candidate: "candidate-1",
    round: "round-1",
    startTime: new Date("2026-10-27T09:00:00.000Z"),
    endTime: new Date("2026-10-27T09:45:00.000Z"),
  };
  assert.equal(dedupeScheduledInterviews([item, { ...item }]).length, 1);
});

test("candidate pipeline only treats interviews in published schedules as scheduled", () => {
  const interviews = [
    { status: "scheduled", scheduleVersion: "published-version" },
    { status: "scheduled", scheduleVersion: "draft-version" },
    { status: "completed", scheduleVersion: "published-version" },
  ];

  const scheduled = filterScheduledInterviewsByPublishedVersion(interviews, ["published-version"]);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].scheduleVersion, "published-version");
});

test("every required skill must match exactly", () => {
  assert.equal(matchesSkills(["DSA", "System Design"], ["DSA", "System Design"]), true);
  assert.equal(matchesSkills(["DSA"], ["DSA", "System Design"]), false);
  assert.equal(matchesSkills([], ["DSA"]), false);
});

test("missing candidate, interviewer, or room availability never gets synthesized", () => {
  const base = makePlan();
  assert.equal(base.assignments.length, 2);

  const noCandidateWindows = makePlan({
    availabilities: [window("interviewer", "interviewer-1"), window("room", "room-1")],
  });
  assert.equal(noCandidateWindows.assignments.length, 0);
  assert.ok(noCandidateWindows.unassigned.every((item) => item.reason.includes("candidate")));

  const noRoomWindows = makePlan({
    availabilities: [
      window("candidate", "candidate-1"),
      window("candidate", "candidate-2"),
      window("interviewer", "interviewer-1"),
    ],
  });
  assert.equal(noRoomWindows.assignments.length, 0);
});

test("an active published appointment is carried forward and blocks conflicting slots", () => {
  const activeInterviews = [{
    candidate: "candidate-1",
    interviewer: "interviewer-1",
    room: "room-1",
    round: "round-1",
    startTime: new Date("2026-10-27T09:00:00.000Z"),
    endTime: new Date("2026-10-27T09:45:00.000Z"),
    status: "scheduled",
  }];
  const { assignments } = makePlan({ activeInterviews });
  assert.equal(assignments.filter((item) => item.carriedForward).length, 1);
  assert.equal(assignments.filter((item) => !item.carriedForward).length, 1);
  assert.ok(assignments.every((item) => item.startTime >= now));
});

test("daily interviewer capacity is enforced across candidates", () => {
  const { assignments } = makePlan({
    interviewerParticipants: [
      { userId: { _id: "interviewer-1" }, metadata: { skills: ["DSA"], maxDailyInterviews: 1 } },
    ],
  });
  assert.equal(assignments.length, 1);
});

test("conflicting published appointments are not copied into a new draft", () => {
  const activeInterviews = [
    {
      candidate: { _id: "candidate-1", name: "Candidate One" },
      interviewer: { _id: "interviewer-1" },
      room: { _id: "room-1" },
      round: { _id: "round-1", name: "Technical" },
      startTime: new Date("2026-10-27T09:00:00.000Z"),
      endTime: new Date("2026-10-27T09:45:00.000Z"),
      status: "scheduled",
    },
    {
      candidate: { _id: "candidate-2", name: "Candidate Two" },
      interviewer: { _id: "interviewer-1" },
      room: { _id: "room-1" },
      round: { _id: "round-1", name: "Technical" },
      startTime: new Date("2026-10-27T09:15:00.000Z"),
      endTime: new Date("2026-10-27T10:00:00.000Z"),
      status: "scheduled",
    },
  ];
  const { assignments } = makePlan({ activeInterviews });
  assert.equal(assignments.length, 2);
  assert.equal(assignments.filter((item) => item.carriedForward).length, 1);
  assert.equal(assignments.filter((item) => !item.carriedForward).length, 1);
  assert.equal(intervalsOverlap(assignments[0].startTime, assignments[0].endTime, assignments[1].startTime, assignments[1].endTime), false);
});

test("dependent rounds stay unassigned when their prerequisite cannot be placed", () => {
  const rounds = [
    { _id: "round-1", name: "Technical", sequence: 1, durationMinutes: 45, requiredSkills: ["DSA"] },
    { _id: "round-2", name: "System Design", sequence: 2, durationMinutes: 45, requiredSkills: ["System Design"], prerequisiteRound: ["round-1"] },
  ];
  const { assignments, unassigned } = makePlan({
    rounds,
    interviewerParticipants: [
      { userId: { _id: "interviewer-1" }, metadata: { skills: ["System Design"] } },
    ],
    availabilities: [
      window("candidate", "candidate-1"),
      window("candidate", "candidate-2"),
      window("interviewer", "interviewer-1"),
      window("room", "room-1"),
    ],
  });
  assert.equal(assignments.length, 0);
  assert.ok(unassigned.some((item) => item.roundId === "round-1"));
  assert.ok(unassigned.some((item) => item.roundId === "round-2" && item.reason.includes("prerequisite")));
});

test("when candidate completes round 1, round 2 is unlocked and scheduled conflict-free", () => {
  const rounds = [
    { _id: "round-1", name: "OA", sequence: 1, durationMinutes: 30, requiredSkills: ["DSA"] },
    { _id: "round-2", name: "HR", sequence: 2, durationMinutes: 45, requiredSkills: ["Communication"], prerequisiteRound: ["round-1"] },
  ];
  const completedInterviews = [
    {
      candidate: "candidate-1",
      round: "round-1",
      status: "completed",
      startTime: new Date("2026-10-26T09:00:00.000Z"),
      endTime: new Date("2026-10-26T09:30:00.000Z"),
    },
  ];
  const candidateParticipants = [
    {
      userId: { _id: "candidate-1", name: "Candidate One" },
      eligibleRoundIds: ["round-1", "round-2"],
    },
  ];
  const interviewerParticipants = [
    {
      userId: { _id: "interviewer-hr", name: "HR Lead" },
      metadata: { skills: ["Communication"], maxDailyInterviews: 4 },
    },
  ];
  const availabilities = [
    window("candidate", "candidate-1", "2026-10-27T10:00:00.000Z", "2026-10-27T12:00:00.000Z"),
    window("interviewer", "interviewer-hr", "2026-10-27T10:00:00.000Z", "2026-10-27T12:00:00.000Z"),
    window("room", "room-1", "2026-10-27T10:00:00.000Z", "2026-10-27T12:00:00.000Z"),
  ];

  const plan = buildSchedulePlan({
    rounds,
    candidateParticipants,
    interviewerParticipants,
    rooms: [{ _id: "room-1" }],
    availabilities,
    completedInterviews,
    now,
  });

  assert.equal(plan.assignments.length, 1);
  assert.equal(plan.assignments[0].candidateId, "candidate-1");
  assert.equal(plan.assignments[0].roundId, "round-2");
  assert.equal(plan.assignments[0].roundName, "HR");
});

