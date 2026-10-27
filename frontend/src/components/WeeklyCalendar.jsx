
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

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16]
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

    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)

    if (match) {
        let hour = Number(match[1])
        const minute = Number(match[2])
        const period = match[3].toUpperCase()

        if (period === 'PM' && hour !== 12) hour += 12
        if (period === 'AM' && hour === 12) hour = 0

        return hour + minute / 60
    }

    // Also supports HTML time input format, e.g. "14:30".
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/)

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
        return 'border-amber-200 bg-amber-50 text-amber-800'
    }

    const round = interview.round.toLowerCase()

    if (round.includes('hr')) {
        return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }

    if (round.includes('manager')) {
        return 'border-teal-200 bg-teal-50 text-teal-800'
    }

    if (round.includes('coding')) {
        return 'border-rose-200 bg-rose-50 text-rose-800'
    }

    return 'border-amber-200 bg-amber-50 text-amber-800'
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

    const scheduledCount = interviews.filter(
        (interview) =>
            interview.status === 'Scheduled' &&
            parseTime(interview.time) !== null
    ).length

    return (
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                        <CalendarDays size={21} />
                    </div>

                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Weekly Calendar
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">{dateRange}</p>
                        <p className="mt-1 text-xs text-slate-400">
                            {scheduledCount} scheduled interviews with assigned times
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWeekOffset(0)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        Today
                    </button>

                    <button
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                        aria-label="Previous week"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <button
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
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
                    <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] border-b border-slate-200">
                        <div className="border-r border-slate-100" />

                        {days.map((day) => {
                            const isToday =
                                day.date.toDateString() === new Date().toDateString()

                            return (
                                <div
                                    key={day.key}
                                    className="border-r border-slate-100 px-2 py-3 text-center last:border-r-0"
                                >
                                    <p className="text-xs font-medium text-slate-500">
                                        {day.name}
                                    </p>

                                    <p
                                        className={`mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold ${isToday
                                            ? 'bg-amber-600 text-white'
                                            : 'text-slate-800'
                                            }`}
                                    >
                                        {day.date.getDate()}
                                    </p>
                                </div>
                            )
                        })}
                    </div>

                    {/* Hour rows */}
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))]"
                        >
                            <div className="border-r border-b border-slate-100 px-2 pt-2 text-right text-[11px] text-slate-400">
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
                                        className="min-h-[76px] space-y-1 border-r border-b border-slate-100 p-1 last:border-r-0"
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
            <div className="flex flex-wrap gap-4 border-t border-slate-100 px-5 py-4">
                <Legend color="bg-amber-400" label="Technical" />
                <Legend color="bg-emerald-400" label="HR" />
                <Legend color="bg-teal-400" label="Managerial" />
                <Legend color="bg-amber-400" label="Unassigned" />
            </div>

            {/* Interview details */}
            {selectedInterview && (
                <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                                Interview Details
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-slate-900">
                                {selectedInterview.candidate}
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                                {selectedInterview.round}
                            </p>

                            <p className="mt-2 text-sm text-slate-600">
                                <UserRound size={15} className="mr-1 inline" />
                                {selectedInterview.interviewer}
                            </p>

                            <p className="mt-2 text-sm text-slate-600">
                                <Clock size={15} className="mr-1 inline" />
                                {selectedInterview.date} · {selectedInterview.time}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
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
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
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
