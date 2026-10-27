const DEFAULT_STEP_MS = 15 * 60 * 1000;

export const idOf = (value) => String(value?._id ?? value ?? "");

export function intervalsOverlap(startA, endA, startB, endB) {
  return new Date(startA).getTime() < new Date(endB).getTime() &&
    new Date(endA).getTime() > new Date(startB).getTime();
}

export function dedupeScheduledInterviews(interviews = []) {
  const unique = new Map();
  for (const item of interviews) {
    const key = [
      idOf(item.candidate),
      idOf(item.round),
      new Date(item.startTime).getTime(),
      new Date(item.endTime).getTime(),
    ].join("_");
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

export function matchesSkills(interviewerSkills = [], requiredSkills = []) {
  const available = new Set(
    interviewerSkills.map((skill) => String(skill).trim().toLocaleLowerCase()).filter(Boolean)
  );
  return requiredSkills.every((skill) =>
    available.has(String(skill).trim().toLocaleLowerCase())
  );
}

const coversSlot = (availability, start, end) =>
  new Date(availability.startTime).getTime() <= start.getTime() &&
  new Date(availability.endTime).getTime() >= end.getTime();

const dateKey = (date) => new Date(date).toISOString().slice(0, 10);

export function buildSchedulePlan({
  rounds = [],
  candidateParticipants = [],
  interviewerParticipants = [],
  rooms = [],
  availabilities = [],
  activeInterviews = [],
  completedInterviews = [],
  now = new Date(),
  stepMs = DEFAULT_STEP_MS,
}) {
  const nowMs = new Date(now).getTime();
  const firstFutureSlot = Math.ceil(nowMs / stepMs) * stepMs;
  const assignments = [];
  const occupiedSlots = [];
  const interviewerDailyCounts = new Map();
  const unassigned = [];

  const reserve = (assignment) => {
    for (const [ownerType, ownerId] of [
      ["candidate", assignment.candidateId],
      ["interviewer", assignment.interviewerId],
      ["room", assignment.roomId],
    ]) {
      if (!ownerId) continue;
      occupiedSlots.push({ ownerType, ownerId, startTime: assignment.startTime, endTime: assignment.endTime });
    }

    const key = `${assignment.interviewerId}_${dateKey(assignment.startTime)}`;
    interviewerDailyCounts.set(key, (interviewerDailyCounts.get(key) || 0) + 1);
  };

  const activeAssignments = activeInterviews
    .filter((item) => ["scheduled", "rescheduled"].includes(item.status) && new Date(item.endTime).getTime() > nowMs)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .map((item) => ({
      candidateId: idOf(item.candidate),
      interviewerId: idOf(item.interviewer),
      roomId: idOf(item.room),
      roundId: idOf(item.round),
      candidateName: item.candidate?.name || "Candidate",
      roundName: item.round?.name || "Interview round",
      startTime: new Date(item.startTime),
      endTime: new Date(item.endTime),
      carriedForward: item.status === "scheduled",
      pendingReschedule: item.status === "rescheduled",
    }));

  for (const assignment of activeAssignments) {
    if (assignment.pendingReschedule) {
      unassigned.push({
        candidateId: assignment.candidateId,
        candidateName: assignment.candidateName,
        roundId: assignment.roundId,
        roundName: assignment.roundName,
        reason: "This published interview is pending reassignment.",
      });
      reserve(assignment);
      continue;
    }

    const conflicts = occupiedSlots.some((slot) =>
      [["candidate", assignment.candidateId], ["interviewer", assignment.interviewerId], ["room", assignment.roomId]]
        .some(([ownerType, ownerId]) => ownerId && slot.ownerType === ownerType && slot.ownerId === ownerId &&
          intervalsOverlap(slot.startTime, slot.endTime, assignment.startTime, assignment.endTime))
    );
    if (conflicts) {
      unassigned.push({
        candidateId: assignment.candidateId,
        candidateName: assignment.candidateName,
        roundId: assignment.roundId,
        roundName: assignment.roundName,
        reason: "The current published schedule already has a resource conflict; this appointment was left out of the new draft.",
      });
      continue;
    }
    assignments.push(assignment);
    reserve(assignment);
  }

  const completedByCandidate = new Map();
  for (const item of completedInterviews) {
    if (item.status !== "completed") continue;
    const candidateId = idOf(item.candidate);
    if (!completedByCandidate.has(candidateId)) completedByCandidate.set(candidateId, new Set());
    completedByCandidate.get(candidateId).add(idOf(item.round));

    if (dateKey(item.startTime) === dateKey(now)) {
      const key = `${idOf(item.interviewer)}_${dateKey(item.startTime)}`;
      interviewerDailyCounts.set(key, (interviewerDailyCounts.get(key) || 0) + 1);
    }
  }

  const orderedRounds = [...rounds].sort((a, b) => a.sequence - b.sequence);
  const validRoundIds = new Set(orderedRounds.map((round) => idOf(round._id)));
  for (const participant of candidateParticipants) {
    const candidate = participant.userId;
    if (!candidate?._id) continue;

    const candidateId = idOf(candidate._id);
    const candidateAvailability = availabilities
      .filter((item) =>
        item.ownerType === "candidate" &&
        idOf(item.ownerId) === candidateId &&
        new Date(item.endTime).getTime() > nowMs
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const completedRounds = new Set(completedByCandidate.get(candidateId) || []);
    const alreadyScheduledRounds = new Set(
      assignments
        .filter((item) => item.candidateId === candidateId)
        .map((item) => item.roundId)
    );
    const fulfilledRounds = new Set([...completedRounds, ...alreadyScheduledRounds]);
    const eligibleRounds = new Set((participant.eligibleRoundIds || []).map(idOf));
    const candidateAssignments = assignments.filter((item) => item.candidateId === candidateId);
    let lastScheduledEndTime = candidateAssignments.reduce(
      (latest, item) => Math.max(latest, item.endTime.getTime()),
      0
    );

    for (const round of orderedRounds) {
      const roundId = idOf(round._id);
      if (fulfilledRounds.has(roundId)) continue;

      if (eligibleRounds.size > 0 && !eligibleRounds.has(roundId)) {
        unassigned.push({
          candidateId,
          candidateName: candidate.name || "Candidate",
          roundId,
          roundName: round.name,
          reason: "This round is not unlocked for the candidate.",
        });
        continue;
      }

      const prerequisites = (round.prerequisiteRound || []).map(idOf);
      const invalidPrerequisite = prerequisites.some((id) => !validRoundIds.has(id));
      const unmetPrerequisites = prerequisites.filter((id) => !fulfilledRounds.has(id));
      if (invalidPrerequisite || unmetPrerequisites.length > 0) {
        unassigned.push({
          candidateId,
          candidateName: candidate.name || "Candidate",
          roundId,
          roundName: round.name,
          reason: invalidPrerequisite
            ? "A prerequisite points to a round outside this drive."
            : "A prerequisite round is not completed or scheduled first.",
        });
        continue;
      }

      const durationMs = Number(round.durationMinutes) * 60 * 1000;
      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        unassigned.push({ candidateId, candidateName: candidate.name || "Candidate", roundId, roundName: round.name, reason: "The round duration is invalid." });
        continue;
      }

      let assignment = null;

      for (const candidateWindow of candidateAvailability) {
        const candidateStart = new Date(candidateWindow.startTime).getTime();
        const candidateEnd = new Date(candidateWindow.endTime).getTime();
        let startMs = Math.ceil(Math.max(candidateStart, firstFutureSlot) / stepMs) * stepMs;

        for (; startMs + durationMs <= candidateEnd; startMs += stepMs) {
          const slotStart = new Date(startMs);
          const slotEnd = new Date(startMs + durationMs);
          if (lastScheduledEndTime && startMs < lastScheduledEndTime) continue;

          const candidateBusy = occupiedSlots.some((slot) =>
            slot.ownerType === "candidate" &&
            slot.ownerId === candidateId &&
            intervalsOverlap(slot.startTime, slot.endTime, slotStart, slotEnd)
          );
          if (candidateBusy) continue;

          for (const interviewerPart of interviewerParticipants) {
            const interviewer = interviewerPart.userId;
            if (!interviewer?._id) continue;
            const interviewerId = idOf(interviewer._id);
            const skills = interviewerPart.metadata?.skills || [];
            if (!matchesSkills(skills, round.requiredSkills || [])) continue;

            const capacityValue = interviewerPart.metadata?.maxDailyInterviews;
            const maxDaily = Number.isFinite(Number(capacityValue)) ? Number(capacityValue) : 4;
            const dailyKey = `${interviewerId}_${dateKey(slotStart)}`;
            if ((interviewerDailyCounts.get(dailyKey) || 0) >= maxDaily) continue;

            const interviewerHasWindow = availabilities.some((window) =>
              window.ownerType === "interviewer" &&
              idOf(window.ownerId) === interviewerId &&
              coversSlot(window, slotStart, slotEnd)
            );
            if (!interviewerHasWindow) continue;

            const interviewerBusy = occupiedSlots.some((slot) =>
              slot.ownerType === "interviewer" &&
              slot.ownerId === interviewerId &&
              intervalsOverlap(slot.startTime, slot.endTime, slotStart, slotEnd)
            );
            if (interviewerBusy) continue;

            const room = rooms.find((candidateRoom) => {
              const roomId = idOf(candidateRoom._id);
              const hasRoomWindow = availabilities.some((window) =>
                window.ownerType === "room" &&
                idOf(window.ownerId) === roomId &&
                coversSlot(window, slotStart, slotEnd)
              );
              if (!hasRoomWindow) return false;

              return !occupiedSlots.some((slot) =>
                slot.ownerType === "room" &&
                slot.ownerId === roomId &&
                intervalsOverlap(slot.startTime, slot.endTime, slotStart, slotEnd)
              );
            });
            if (!room) continue;

            assignment = {
              candidateId,
              candidateName: candidate.name || "Candidate",
              interviewerId,
              roomId: idOf(room._id),
              roundId,
              roundName: round.name,
              startTime: slotStart,
              endTime: slotEnd,
              carriedForward: false,
            };
            break;
          }
          if (assignment) break;
        }
        if (assignment) break;
      }

      if (!assignment) {
        unassigned.push({
          candidateId,
          candidateName: candidate.name || "Candidate",
          roundId,
          roundName: round.name,
          reason: candidateAvailability.length === 0
            ? "No future availability was submitted for this candidate."
            : "No future slot matches candidate, interviewer skills and availability, room availability, and conflict rules.",
        });
        continue;
      }

      assignments.push(assignment);
      reserve(assignment);
      fulfilledRounds.add(roundId);
      lastScheduledEndTime = assignment.endTime.getTime();
    }
  }

  const assignedRoundKeys = new Set(
    assignments.map((item) => `${item.candidateId}_${item.roundId}`)
  );
  return {
    assignments,
    unassigned: unassigned.filter((item) => !assignedRoundKeys.has(`${item.candidateId}_${item.roundId}`)),
  };
}
