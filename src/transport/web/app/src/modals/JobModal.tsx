import { useState, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { geocodeCity } from '../api/weather'
import { createJob, updateJob } from '../api/jobs'
import type { ScheduledJob } from '../api/jobs'

// ── Schedule builder (croner 5-field format: minute hour dom month dow) ───────

type Mode = 'recurring' | 'one-time'

const DAYS = [
  { label: 'Mon', value: '1' },
  { label: 'Tue', value: '2' },
  { label: 'Wed', value: '3' },
  { label: 'Thu', value: '4' },
  { label: 'Fri', value: '5' },
  { label: 'Sat', value: '6' },
  { label: 'Sun', value: '0' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, '0')}:00`,
}))

const MINUTES = ['00', '15', '30', '45'].map(m => ({ value: m === '00' ? '0' : String(parseInt(m)), label: `:${m}` }))

function buildCron(mode: Mode, hour: string, minute: string, days: string[], oneTimeDate: string): string {
  if (mode === 'one-time') return oneTimeDate
  const dow = days.length === 0 ? '*' : days.join(',')
  return `${minute} ${hour} * * ${dow}`
}

function parseCron(schedule: string): { mode: Mode; hour: string; minute: string; days: string[]; oneTimeDate: string } {
  if (/^\d{4}-\d{2}-\d{2}T/.test(schedule)) {
    return { mode: 'one-time', hour: '8', minute: '0', days: [], oneTimeDate: schedule }
  }
  const parts = schedule.trim().split(/\s+/)
  if (parts.length === 5) {
    const [min, hr, , , dow] = parts
    const days = dow === '*' ? [] : dow.split(',').filter(Boolean)
    return { mode: 'recurring', hour: hr, minute: min, days, oneTimeDate: '' }
  }
  return { mode: 'recurring', hour: '8', minute: '0', days: [], oneTimeDate: '' }
}

interface SchedulePickerProps {
  value: string
  onChange: (cron: string) => void
}

function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const parsed = parseCron(value)
  const [mode, setMode] = useState<Mode>(parsed.mode)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [days, setDays] = useState<string[]>(parsed.days)
  const [oneTimeDate, setOneTimeDate] = useState(parsed.oneTimeDate)

  function emit(mo = mode, h = hour, m = minute, d = days, dt = oneTimeDate) {
    onChange(buildCron(mo, h, m, d, dt))
  }

  function toggleDay(val: string) {
    const next = days.includes(val) ? days.filter(d => d !== val) : [...days, val]
    setDays(next)
    emit(mode, hour, minute, next)
  }

  const labelClass = 'text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] mb-1 block'
  const selectClass = 'border-2 border-[#111] px-2 py-1.5 text-sm font-mono outline-none focus:bg-[#f0f0f0] bg-white'

  return (
    <div className="flex flex-col gap-3">
      {/* Mode */}
      <div>
        <span className={labelClass}>Mode</span>
        <div className="flex gap-1">
          {(['recurring', 'one-time'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); emit(m) }}
              className={`flex-1 py-2 text-[10px] font-bold font-mono uppercase tracking-[0.06em] border-2 transition-colors
                ${mode === m ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#111] border-[#111] hover:bg-[#f0f0f0]'}`}
            >
              {m === 'one-time' ? 'One-time' : 'Recurring'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'one-time' ? (
        <div>
          <span className={labelClass}>Date & Time</span>
          <input
            type="datetime-local"
            value={oneTimeDate}
            onChange={e => { setOneTimeDate(e.target.value); emit(mode, hour, minute, days, e.target.value) }}
            className={`${selectClass} w-full`}
          />
        </div>
      ) : (
        <>
          {/* Day-of-week multi-select (inspired by n8n ScheduleTrigger) */}
          <div>
            <span className={labelClass}>Days — leave all off for every day</span>
            <div className="flex gap-1 flex-wrap">
              {DAYS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`px-2 py-1.5 text-[10px] font-bold font-mono border-2 transition-colors
                    ${days.includes(d.value)
                      ? 'bg-[#111] text-white border-[#111]'
                      : 'bg-white text-[#111] border-[#111] hover:bg-[#f0f0f0]'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <span className={labelClass}>Hour</span>
              <select
                value={hour}
                onChange={e => { setHour(e.target.value); emit(mode, e.target.value, minute, days) }}
                className={`${selectClass} w-full`}
              >
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>

            <div>
              <span className={labelClass}>Min</span>
              <select
                value={minute}
                onChange={e => { setMinute(e.target.value); emit(mode, hour, e.target.value, days) }}
                className={`${selectClass}`}
              >
                {MINUTES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Preview */}
      <p className="text-[9px] font-mono text-[#aaa]">
        Schedule: <span className="text-[#555]">{value || '—'}</span>
      </p>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface JobModalProps {
  job?: ScheduledJob
  onClose: () => void
  onSaved: (job: ScheduledJob) => void
}

export function JobModal({ job, onClose, onSaved }: JobModalProps) {
  const isEdit = !!job
  const type = job?.type ?? 'daily_outfit'

  const [name, setName] = useState(job?.name ?? '')
  const [schedule, setSchedule] = useState(job?.schedule ?? '0 8 * * *')

  const existingParams = job?.params ?? {}
  const [city, setCity] = useState(
    (existingParams.locationName as string) ?? (() => {
      try {
        const saved = localStorage.getItem('closet-location')
        return saved ? (JSON.parse(saved) as { name: string }).name : ''
      } catch { return '' }
    })()
  )
  const [theme, setTheme] = useState((existingParams.theme as string) ?? '')
  const [chatId, setChatId] = useState<string>(
    String((existingParams.chatId as number) || localStorage.getItem('closet-telegram-chat-id') || '')
  )

  useEffect(() => {
    if (chatId) return
    fetch('/api/config', { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('closet-token') ?? ''}` } })
      .then(r => r.ok ? r.json() : null)
      .then((cfg: { telegramChatId: number | null } | null) => {
        if (cfg?.telegramChatId) setChatId(String(cfg.telegramChatId))
      })
      .catch(() => {})
  }, [])
  const [geoError, setGeoError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) setSchedule('0 8 * * *')
  }, [type, isEdit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !schedule) return
    setSaving(true)
    setError(null)

    try {
      let params: Record<string, unknown> = {}

      if (type === 'daily_outfit' || (isEdit && job?.type === 'daily_outfit')) {
        setGeoError(null)
        let loc: { lat: number; lon: number; name: string } | null = null
        try {
          const saved = localStorage.getItem('closet-location')
          if (saved) loc = JSON.parse(saved) as { lat: number; lon: number; name: string }
        } catch { /* ignore */ }

        if (city.trim() && city.trim() !== loc?.name) {
          const result = await geocodeCity(city.trim())
          loc = { lat: result.lat, lon: result.lon, name: result.name }
        }

        if (!loc) {
          setGeoError('Enter a city name to set the location')
          setSaving(false)
          return
        }

        const chatIdNum = parseInt(chatId.trim(), 10)
        if (!chatIdNum) {
          setGeoError('Enter your Telegram Chat ID')
          setSaving(false)
          return
        }
        localStorage.setItem('closet-telegram-chat-id', chatId.trim())
        params = { chatId: chatIdNum, lat: loc.lat, lon: loc.lon, locationName: loc.name, ...(theme.trim() ? { theme: theme.trim() } : {}) }
      }

      const saved = isEdit
        ? await updateJob(job!.id, { name: name.trim(), schedule, params })
        : await createJob({ name: name.trim(), type, schedule, params })

      onSaved(saved)
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white border-2 border-[#111] p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold leading-none">
            {isEdit ? 'Edit Job' : 'New Job'}
          </h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#111] font-mono text-sm leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <Input
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning Outfit"
            required
          />

          {/* Schedule picker */}
          <div>
            <span className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] mb-2 block">
              Schedule
            </span>
            <SchedulePicker value={schedule} onChange={setSchedule} />
          </div>

          {/* daily_outfit: city + theme */}
          {(type === 'daily_outfit' || (isEdit && job?.type === 'daily_outfit')) && (
            <>
              <div className="flex flex-col gap-1">
                <Input
                  label="Location (city)"
                  value={city}
                  onChange={e => { setCity(e.target.value); setGeoError(null) }}
                  placeholder="e.g. Toronto"
                  error={geoError ?? undefined}
                />
                <p className="text-[9px] font-mono text-[#aaa]">Used for weather lookup</p>
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  label="Telegram Chat ID"
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                  placeholder="e.g. 123456789"
                />
                <p className="text-[9px] font-mono text-[#aaa]">
                  Send <span className="text-[#555]">/start</span> to @userinfobot on Telegram to get your ID
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888]">
                  Theme / Prompt (optional)
                </label>
                <textarea
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="e.g. formal business meeting, casual weekend, gym day..."
                  rows={2}
                  className="border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0] bg-white resize-none"
                />
                <p className="text-[9px] font-mono text-[#aaa]">Guides the AI outfit suggestion</p>
              </div>
            </>
          )}

          {error && <p className="text-[11px] font-mono text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={saving} className="flex-1">
              {isEdit ? 'Save changes' : 'Create job'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
