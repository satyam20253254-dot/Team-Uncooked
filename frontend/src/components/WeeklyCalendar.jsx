
import { useState } from 'react'
import { API_BASE_URL } from '../services/api'
import {
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Clock,
    UserRound,
    Download,
} from 'lucide-react'
import { useMemo } from 'react'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMonday(date) {
    const monday = new Date(date)
    monday.setHours(0, 0, 0, 0)

    const day = monday.getDay()
    monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day))

    return monday
}

function addDays(date, days) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

function dateKey(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function parseTime(time) {
    if (!time || time === 'Not assigned') return null

    // Matches 12-hour time like "07:00 PM", "7:00 pm", "07:00:00 PM" with normal or non-breaking spaces
    const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?[\s\u202f\u00a0]*(AM|PM)$/i)

    if (match) {
        let hour = Number(match[1])
        const minute = Number(match[2])
        const period = match[3].toUpperCase()

        if (period === 'PM' && hour !== 12) hour += 12
        if (period === 'AM' && hour === 12) hour = 0

        return hour + minute / 60
    }

    // Also supports HTML time input format or 24-hr format, e.g. "14:30" or "19:00:00".
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)

    if (timeMatch) {
        return Number(timeMatch[1]) + Number(timeMatch[2]) / 60
    }

    return null
}

function formatHour(hour) {
    const wholeHour = Math.floor(hour)
    const minutes = Math.round((hour - wholeHour) * 60)
    const period = wholeHour >= 12 ? 'PM' : 'AM'
    const displayHour = wholeHour % 12 || 12

    return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

function getInterviewColor(interview) {
    if (
        interview.status === 'Unassigned' ||
        interview.interviewer === 'Unassigned'
    ) {
        return 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
    }

    const round = (interview.round || '').toLowerCase()

    if (round.includes('hr')) {
        return 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
    }

    if (round.includes('manager')) {
        return 'border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300'
    }

    if (round.includes('coding') || round.includes('oa') || round.includes('technical')) {
        return 'border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
    }

    if (round.includes('final')) {
        return 'border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300'
    }

    return 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
}

function WeeklyCalendar({ interviews = [] }) {
    const [weekOffset, setWeekOffset] = useState(0)
    const [selectedInterview, setSelectedInterview] = useState(null)

    const monday = getMonday(new Date())
    monday.setDate(monday.getDate() + weekOffset * 7)

    const days = DAY_NAMES.map((name, index) => {
        const date = addDays(monday, index)

        return {
            name,
            date,
            key: dateKey(date),
        }
    })

    const endOfWeek = addDays(monday, 6)

    const dateRange = `${monday.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
    })} – ${endOfWeek.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })}`

    // Compute dynamic hour range: default 8 AM to 8 PM (8 to 20), but expand if interviews fall outside
    const calendarHours = useMemo(() => {
        let minH = 8
        let maxH = 20

        interviews.forEach((interview) => {
            const parsed = parseTime(interview.time)
            if (parsed !== null) {
                minH = Math.min(minH, Math.floor(parsed))
                maxH = Math.max(maxH, Math.ceil(parsed))
            }
        })

        const hours = []
        for (let h = minH; h <= maxH; h++) {
            hours.push(h)
        }
        return hours
    }, [interviews])

    const scheduledCount = interviews.filter(
        (interview) =>
            interview.status === 'Scheduled' &&
            parseTime(interview.time) !== null
    ).length

    const weekStartKey = days[0].key
    const weekEndKey = days[6].key

    const currentWeekCount = interviews.filter(
        (interview) =>
            interview.date >= weekStartKey &&
            interview.date <= weekEndKey &&
            parseTime(interview.time) !== null
    ).length

    // Helper to jump to the week of the first scheduled interview
    const jumpToInterviewWeek = () => {
        const target = interviews.find((i) => i.date && parseTime(i.time) !== null)
        if (!target) return
        const parts = target.date.split('-').map(Number)
        if (parts.length === 3) {
            const targetDate = new Date(parts[0], parts[1] - 1, parts[2])
            const targetMonday = getMonday(targetDate)
            const currentMonday = getMonday(new Date())
            const diffDays = Math.round((targetMonday - currentMonday) / (1000 * 60 * 60 * 24))
            const offset = Math.round(diffDays / 7)
            setWeekOffset(offset)
        }
    }

    return (
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 p-2.5 text-amber-600 dark:text-amber-400">
                        <CalendarDays size={21} />
                    </div>

                    <div>
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                            Weekly Calendar
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{dateRange}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            {scheduledCount} scheduled interviews with assigned times
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWeekOffset(0)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Today
                    </button>

                    <button
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        aria-label="Previous week"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <button
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        aria-label="Next week"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Calendar grid */}
            <div className="w-full max-w-full overflow-x-auto">
                <div className="min-w-[850px]">
                    {/* Day headings */}
                    <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-slate-800">
                        <div className="border-r border-slate-100 dark:border-slate-800" />

                        {days.map((day) => {
                            const isToday =
                                day.date.toDateString() === new Date().toDateString()

                            return (
                                <div
                                    key={day.key}
                                    className="border-r border-slate-100 dark:border-slate-800 px-2 py-3 text-center last:border-r-0"
                                >
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {day.name}
                                    </p>

                                    <p
                                        className={`mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold ${isToday
                                            ? 'bg-amber-600 text-white'
                                            : 'text-slate-800 dark:text-slate-200'
                                            }`}
                                    >
                                        {day.date.getDate()}
                                    </p>
                                </div>
                            )
                        })}
                    </div>

                    {/* Empty week helper banner */}
                    {currentWeekCount === 0 && scheduledCount > 0 && (
                        <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 px-5 py-2.5 text-xs text-amber-900 dark:text-amber-300">
                            <span>No interviews scheduled in this week view ({scheduledCount} scheduled in total).</span>
                            <button
                                onClick={jumpToInterviewWeek}
                                className="font-bold underline hover:text-amber-950 dark:hover:text-amber-200"
                            >
                                Jump to scheduled week &rarr;
                            </button>
                        </div>
                    )}

                    {/* Hour rows */}
                    {calendarHours.map((hour) => (
                        <div
                            key={hour}
                            className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))]"
                        >
                            <div className="border-r border-b border-slate-100 dark:border-slate-800 px-2 pt-2 text-right text-[11px] text-slate-400 dark:text-slate-500">
                                {formatHour(hour)}
                            </div>

                            {days.map((day) => {
                                const dayInterviews = interviews.filter((interview) => {
                                    const start = parseTime(interview.time)

                                    return (
                                        interview.date === day.key &&
                                        start !== null &&
                                        Math.floor(start) === hour
                                    )
                                })

                                return (
                                    <div
                                        key={`${day.key}-${hour}`}
                                        className="min-h-[76px] space-y-1 border-r border-b border-slate-100 dark:border-slate-800 p-1 last:border-r-0"
                                    >
                                        {dayInterviews.map((interview) => (
                                            <button
                                                key={interview.id}
                                                onClick={() => setSelectedInterview(interview)}
                                                className={`w-full rounded-lg border p-2 text-left transition hover:shadow-sm ${getInterviewColor(interview)}`}
                                            >
                                                <p className="break-words text-xs font-semibold leading-4">
                                                    {interview.candidate}
                                                </p>

                                                <p className="mt-1 text-[10px] leading-4 opacity-80">
                                                    {interview.time}
                                                </p>

                                                <p className="mt-1 break-words text-[10px] leading-4 opacity-80">
                                                    {interview.round}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 border-t border-slate-100 dark:border-slate-800 px-5 py-4">
                <Legend color="bg-rose-400" label="Technical / OA" />
                <Legend color="bg-emerald-400" label="HR" />
                <Legend color="bg-teal-400" label="Managerial" />
                <Legend color="bg-purple-400" label="Final Round" />
                <Legend color="bg-amber-400" label="Other / Unassigned" />
            </div>

            {/* Interview details */}
            {selectedInterview && (
                <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                Interview Details
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                                {selectedInterview.candidate}
                            </h3>

                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {selectedInterview.round}
                            </p>

                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                <UserRound size={15} className="mr-1 inline" />
                                {selectedInterview.interviewer}
                            </p>

                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                <Clock size={15} className="mr-1 inline" />
                                {selectedInterview.date} · {selectedInterview.time}
                            </p>

                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                Room: {selectedInterview.room}
                            </p>

                            {selectedInterview.id && (
                                <div className="mt-3">
                                    <a
                                        href={`${API_BASE_URL}/interviews/${selectedInterview.id}/calendar.ics`}
                                        download
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                                    >
                                        <Download size={13} />
                                        Download .ics Calendar Invite
                                    </a>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedInterview(null)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function Legend({ color, label }) {
    return (
        <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${color}`} />
            <span className="text-xs text-slate-500">{label}</span>
        </div>
    )
}

export default WeeklyCalendar
