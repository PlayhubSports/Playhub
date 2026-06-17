'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/context/AuthContext'
import { type SportKey } from '@/lib/types'
import {
  loadLocalGames,
  type LocalGameInput,
  type LocalGameAdmissionMode,
} from '@/lib/localGames'
import { createSupabaseGame } from '@/lib/supabaseGames'

// ── Tipos internos do formulário ──────────────
type Level = 'iniciante' | 'intermediario' | 'avancado' | 'todos'
type Privacy = 'publico' | 'privado'
type StatusTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral'
type SaveScope = 'shared' | 'local'

type IconName =
  | 'sport'
  | 'racket'
  | 'volleyball'
  | 'arena'
  | 'location'
  | 'calendar'
  | 'clock'
  | 'finish'
  | 'timer'
  | 'users'
  | 'level'
  | 'price'
  | 'receipt'
  | 'shield'
  | 'manual'
  | 'check'
  | 'hourglass'
  | 'warning'
  | 'x'
  | 'spark'
  | 'info'
  | 'plus'
  | 'minus'
  | 'arrow'
  | 'globe'
  | 'lock'
  | 'edit'
  | 'document'
  | 'success'

interface FormData {
  sport:           SportKey | null
  title:           string
  date:            string
  time:            string
  endTime:         string
  level:           Level | null
  maxPlayers:      number
  privacy:         Privacy
  arenaName:       string
  city:            string
  address:         string
  notes:           string
  durationMinutes: number
  pricePerHour:    number
  admissionMode:   LocalGameAdmissionMode
}

// ── Sistema visual semântico ──────────────────
const TONE: Record<StatusTone, {
  text: string
  bg: string
  border: string
  glow: string
}> = {
  pending: {
    text: 'text-amber-400',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.24)',
    glow: 'rgba(245,158,11,0.18)',
  },
  success: {
    text: 'text-ph-green',
    bg: 'rgba(126,211,33,0.08)',
    border: 'rgba(126,211,33,0.24)',
    glow: 'rgba(126,211,33,0.18)',
  },
  danger: {
    text: 'text-red-400',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.26)',
    glow: 'rgba(239,68,68,0.18)',
  },
  info: {
    text: 'text-ph-blue',
    bg: 'rgba(29,161,242,0.08)',
    border: 'rgba(29,161,242,0.24)',
    glow: 'rgba(29,161,242,0.18)',
  },
  neutral: {
    text: 'text-ph-muted',
    bg: 'rgba(255,255,255,0.045)',
    border: 'rgba(255,255,255,0.08)',
    glow: 'rgba(255,255,255,0.07)',
  },
}

// ── Constantes de UI ──────────────────────────
const SPORTS_LIST: {
  key: SportKey
  icon: IconName
  label: string
  desc: string
  tone: StatusTone
}[] = [
  {
    key: 'futevolei',
    icon: 'sport',
    label: 'Futevôlei',
    desc: 'Jogo de areia com ritmo, técnica e explosão.',
    tone: 'info',
  },
  {
    key: 'beach_tenis',
    icon: 'racket',
    label: 'Beach Tênis',
    desc: 'Partida com raquete, bola e dinâmica de praia.',
    tone: 'success',
  },
  {
    key: 'volei',
    icon: 'volleyball',
    label: 'Vôlei',
    desc: 'Vôlei de praia em duplas ou equipes.',
    tone: 'pending',
  },
]

const LEVELS: {
  key: Level
  icon: IconName
  label: string
  desc: string
  tone: StatusTone
}[] = [
  { key: 'iniciante',     icon: 'level', label: 'Iniciante',       desc: 'Para quem está começando', tone: 'success' },
  { key: 'intermediario', icon: 'spark', label: 'Intermediário',   desc: 'Com alguma experiência', tone: 'info' },
  { key: 'avancado',      icon: 'shield', label: 'Avançado',        desc: 'Nível competitivo', tone: 'pending' },
  { key: 'todos',         icon: 'users', label: 'Todos os níveis', desc: 'Todos são bem-vindos', tone: 'neutral' },
]

const ADMISSION_MODES: {
  key: LocalGameAdmissionMode
  icon: IconName
  tone: StatusTone
  label: string
  desc: string
  detail: string
}[] = [
  {
    key: 'automatic',
    icon: 'check',
    tone: 'success',
    label: 'Entrada automática',
    desc: 'Jogadores entram direto enquanto houver vagas.',
    detail: 'Ideal para jogos abertos, peladas simples e partidas sem filtro manual.',
  },
  {
    key: 'manual',
    icon: 'manual',
    tone: 'pending',
    label: 'Aprovação manual',
    desc: 'Jogadores solicitam entrada e o organizador aprova.',
    detail: 'Ideal para jogos avançados, treinos, grupos fechados ou partidas com seleção por nível.',
  },
]

const START_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
]

const MAX_RESERVATION_HOURS = 4
const TITLE_BLOCK_WINDOW_DAYS = 3

const ARENA_PRICES: Record<string, number> = {
  'Arena 11 Esperanças': 20,
  'Arena Faro Beach': 25,
  'Sport Center Algarve': 18,
  'Praia de Faro (Livre)': 0,
}

const ARENAS_SUGERIDAS = [
  'Arena 11 Esperanças',
  'Arena Faro Beach',
  'Sport Center Algarve',
  'Praia de Faro (Livre)',
]

const STEP_LABELS = ['Esporte', 'Arena', 'Detalhes', 'Confirmação']

function Icon({
  name,
  size = 17,
}: {
  name: IconName
  size?: number
}) {
  if (name === 'sport') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M7.5 16.5c3.8-4.2 5.3-6.8 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 7.2c2.9-.8 5.9-.4 8.2 1.4 2.4 1.8 3.6 4.5 3.8 7.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'racket') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <ellipse cx="10" cy="8.5" rx="4.4" ry="5.4" transform="rotate(-35 10 8.5)" stroke="currentColor" strokeWidth="2" />
        <path d="M13.5 12.8l5 5M17.5 16.8l-2.2 2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7.8 5.4l5 5M5.9 8.2l4.7 4.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      </svg>
    )
  }

  if (name === 'volleyball') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 4c1.5 2.5 1.8 5.1.8 7.8-1 2.5-3 4.4-5.8 5.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5.3 8.2c2.8-.4 5.2.2 7.1 1.8 1.9 1.6 3.1 3.8 3.6 6.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M18.7 8.4c-2.1.2-4 .8-5.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'arena') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4.5 18.5V9.6L12 5l7.5 4.6v8.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 18.5v-6.3h9v6.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9.2 9.8h5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'location') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'calendar') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5.5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8 3.8v3.4M16 3.8v3.4M4.5 10h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'clock') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7.8v4.6l3 1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'finish') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M6 4.5v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 5.5h10l-2 3 2 3H7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'timer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M9 3.8h6M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (name === 'users') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M4 19c.7-3.2 2.5-5 5-5s4.3 1.8 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 11.5c1.5-.2 2.7-1.5 2.7-3s-1.2-2.8-2.7-3M16 14.2c2.1.5 3.4 2 4 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'level') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 18h14M7 18v-5M12 18V8M17 18v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 13l5-5 3 3 3-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    )
  }

  if (name === 'price') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 8.5V6.8A2.8 2.8 0 0 1 7.8 4H16a3 3 0 0 1 3 3v10.2A2.8 2.8 0 0 1 16.2 20H7.8A2.8 2.8 0 0 1 5 17.2v-1.7" stroke="currentColor" strokeWidth="2" />
        <path d="M4 12h9M10 9l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'receipt') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9.5 8h5M9.5 12h5M9.5 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'shield') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s7-3.4 7-10.2V6.2L12 3.5 5 6.2v4.6C5 17.6 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8.8 12l2.2 2.2 4.4-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'manual') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 12.5V8.2a1.7 1.7 0 0 1 3.4 0v4M10.4 12V6.8a1.7 1.7 0 0 1 3.4 0V12M13.8 12.2V8.3a1.6 1.6 0 0 1 3.2 0v6.2c0 3.2-2.4 5.5-5.4 5.5h-.8c-2.4 0-4.1-1.1-5.2-3.1L4.4 14.7a1.6 1.6 0 0 1 2.7-1.7l1.1 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'check') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 12.2l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'hourglass') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10M7 20h10M8 4c0 4.2 2.3 5.8 4 8-1.7 2.2-4 3.8-4 8M16 4c0 4.2-2.3 5.8-4 8 1.7 2.2 4 3.8 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'warning') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4l8 15H4l8-15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9v4M12 16.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'x') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'spark') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'info') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11.5V16M12 8h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'plus') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'minus') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'arrow') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M8 12h8M13 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'globe') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M4 12h16M12 4c2.2 2.2 3.2 4.8 3.2 8s-1 5.8-3.2 8M12 4c-2.2 2.2-3.2 4.8-3.2 8s1 5.8 3.2 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'lock') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8 10V7.8a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'edit') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 19h4l10-10-4-4L5 15v4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M13.8 6.2l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'document') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 4h7l3 3v13H7V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 4v4h4M9.5 12h5M9.5 15.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2.1 6.2H20l-4.8 3.6 1.8 6.2L12 15.2 7 19l1.8-6.2L4 9.2h5.9L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

// ── Helpers de data/hora ──────────────────────
function dateToLocalISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseISODateLocal(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

function daysBetweenISO(a: string, b: string) {
  const dateA = parseISODateLocal(a)
  const dateB = parseISODateLocal(b)

  if (!dateA || !dateB) return Number.POSITIVE_INFINITY

  const dayMs = 24 * 60 * 60 * 1000
  return Math.abs(Math.round((dateA.getTime() - dateB.getTime()) / dayMs))
}

function formatDatePT(iso: string) {
  if (!iso) return '—'

  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayISO() {
  return dateToLocalISO(new Date())
}

function tomorrowISO() {
  const date = new Date()
  date.setDate(date.getDate() + 1)

  return dateToLocalISO(date)
}

function isTodayISO(value: string) {
  return value === todayISO()
}

function timeToMinutes(time: string) {
  if (!time) return 0

  const [hours, minutes] = time.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0

  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  if (totalMinutes === 24 * 60) return '24:00'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getNextFullHourTime() {
  const now = new Date()
  let nextHour = now.getHours()

  if (now.getMinutes() > 0 || now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    nextHour += 1
  }

  if (nextHour < 6) {
    nextHour = 6
  }

  if (nextHour > 23) {
    return null
  }

  return `${String(nextHour).padStart(2, '0')}:00`
}

// ── Helpers de normalização/título ────────────
function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function normalizeArenaName(value: string) {
  return normalizeText(value)
}

function normalizeTitle(value: string) {
  const clean = normalizeText(value)
  const chars = clean.split('')

  const leetFixed = chars.map((char, index) => {
    if (!/[0-9]/.test(char)) return char

    const previous = chars[index - 1] ?? ''
    const next = chars[index + 1] ?? ''

    const isInsideWord = /[a-z]/.test(previous) && /[a-z]/.test(next)

    if (!isInsideWord) return char

    const map: Record<string, string> = {
      '0': 'o',
      '1': 'i',
      '3': 'e',
      '4': 'a',
      '5': 's',
      '7': 't',
    }

    return map[char] ?? char
  }).join('')

  return leetFixed
    .replace(/[^a-z0-9]/g, '')
    .replace(/\d+/g, number => String(Number(number)))
}

function getTitleDigits(value: string) {
  return normalizeTitle(value).match(/\d+/g)?.join('|') ?? ''
}

function getTitleTextWithoutDigits(value: string) {
  return normalizeTitle(value).replace(/\d+/g, '')
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[b.length][a.length]
}

function titlesAreTooSimilar(a: string, b: string) {
  const titleA = normalizeTitle(a)
  const titleB = normalizeTitle(b)

  if (!titleA || !titleB) return false

  if (titleA === titleB) return true

  const digitsA = getTitleDigits(a)
  const digitsB = getTitleDigits(b)

  if (digitsA || digitsB) {
    if (digitsA !== digitsB) return false

    const textA = getTitleTextWithoutDigits(a)
    const textB = getTitleTextWithoutDigits(b)

    if (!textA || !textB) return false
    if (textA === textB) return true

    const minLength = Math.min(textA.length, textB.length)
    const maxLength = Math.max(textA.length, textB.length)

    if (minLength < 5) return false

    const distance = levenshteinDistance(textA, textB)
    const allowedDistance = maxLength <= 8 ? 1 : Math.floor(maxLength * 0.15)

    return distance <= allowedDistance
  }

  const minLength = Math.min(titleA.length, titleB.length)
  const maxLength = Math.max(titleA.length, titleB.length)

  if (minLength < 6) return false

  const shorter = titleA.length <= titleB.length ? titleA : titleB
  const longer = titleA.length > titleB.length ? titleA : titleB
  const coverage = minLength / maxLength

  if (longer.includes(shorter) && coverage >= 0.85) return true

  const distance = levenshteinDistance(titleA, titleB)
  const allowedDistance = maxLength <= 8 ? 1 : Math.floor(maxLength * 0.12)

  return distance <= allowedDistance
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart
}

function getReservedIntervalsForArenaDate(selectedDate: string, arenaName: string) {
  if (!selectedDate || !arenaName) return []

  const arenaKey = normalizeArenaName(arenaName)

  return loadLocalGames()
    .filter(game => {
      const gameArenaName = normalizeArenaName(game.arena?.name ?? '')
      return game.date === selectedDate && gameArenaName === arenaKey
    })
    .map(game => {
      const start = timeToMinutes(game.start_time)
      const duration = game.duration_minutes || 60
      const end = start + duration

      return { start, end }
    })
    .filter(interval => interval.start > 0 && interval.end > interval.start)
}

function titleAlreadyExistsForArenaWindow(title: string, selectedDate: string, arenaName: string) {
  if (!title.trim() || !selectedDate || !arenaName.trim()) return false

  const arenaKey = normalizeArenaName(arenaName)

  return loadLocalGames().some(game => {
    const gameArenaKey = normalizeArenaName(game.arena?.name ?? '')
    const isSameArena = gameArenaKey === arenaKey
    const isNearDate = daysBetweenISO(game.date, selectedDate) <= TITLE_BLOCK_WINDOW_DAYS
    const isSimilarTitle = titlesAreTooSimilar(title, game.title ?? '')

    return isSameArena && isNearDate && isSimilarTitle
  })
}

function getBaseStartTimes(selectedDate: string) {
  if (!selectedDate) return START_TIMES

  if (!isTodayISO(selectedDate)) {
    return START_TIMES
  }

  const nextAvailable = getNextFullHourTime()

  if (!nextAvailable) {
    return []
  }

  const minimumMinutes = timeToMinutes(nextAvailable)

  return START_TIMES.filter(time => timeToMinutes(time) >= minimumMinutes)
}

function getEndTimeOptions(startTime: string, selectedDate: string, arenaName: string) {
  const start = timeToMinutes(startTime || '18:00')
  const options: string[] = []
  const reservedIntervals = getReservedIntervalsForArenaDate(selectedDate, arenaName)

  if (!start) return []

  for (let h = 1; h <= MAX_RESERVATION_HOURS; h++) {
    const end = start + h * 60

    if (end > 24 * 60) break

    const hasConflict = reservedIntervals.some(interval =>
      intervalsOverlap(start, end, interval.start, interval.end)
    )

    if (hasConflict) break

    options.push(minutesToTime(end))
  }

  return options
}

function getAvailableStartTimes(selectedDate: string, arenaName: string) {
  const baseTimes = getBaseStartTimes(selectedDate)

  if (!arenaName) {
    return baseTimes
  }

  return baseTimes.filter(startTime =>
    getEndTimeOptions(startTime, selectedDate, arenaName).length > 0
  )
}

function getDefaultDateISO() {
  const today = todayISO()
  const todayOptions = getAvailableStartTimes(today, '')

  return todayOptions.length > 0 ? today : tomorrowISO()
}

function getDefaultStartTime(date: string, arenaName = '') {
  const options = getAvailableStartTimes(date, arenaName)

  if (isTodayISO(date)) {
    return options[0] ?? '18:00'
  }

  return options.includes('18:00') ? '18:00' : options[0] ?? '18:00'
}

function getDurationMinutes(form: FormData) {
  const start = timeToMinutes(form.time)
  const end = timeToMinutes(form.endTime)

  if (!start || !end || end <= start) return 60

  return end - start
}

function formatDuration(minutes: number) {
  const hours = minutes / 60

  if (Number.isInteger(hours)) {
    return hours === 1 ? '1h' : `${hours}h`
  }

  return `${minutes} min`
}

function moneyEUR(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function reservationTotal(form: FormData) {
  const durationMinutes = getDurationMinutes(form)

  return Number(((form.pricePerHour * durationMinutes) / 60).toFixed(2))
}

function pricePerPlayer(form: FormData) {
  const total = reservationTotal(form)
  const players = Math.max(1, form.maxPlayers)

  return Number((total / players).toFixed(2))
}

function getSportLabel(sport: SportKey | null) {
  return SPORTS_LIST.find(item => item.key === sport)?.label ?? 'Jogo'
}

function getLevelTitleLabel(level: Level | null) {
  if (level === 'iniciante') return 'iniciante'
  if (level === 'intermediario') return 'intermediário'
  if (level === 'avancado') return 'avançado'
  if (level === 'todos') return 'aberto'

  return 'aberto'
}

function formatTimeForTitle(time: string) {
  if (!time) return ''

  if (time.endsWith(':00')) {
    return time.replace(':00', 'h')
  }

  return time
}

function getSuggestedTitle(form: FormData) {
  const sport = getSportLabel(form.sport)
  const level = getLevelTitleLabel(form.level)
  const time = formatTimeForTitle(form.time)

  if (!sport && !time) return ''

  return `${sport} ${level}${time ? ` — ${time}` : ''}`
}

function getAdmissionModeLabel(mode: LocalGameAdmissionMode) {
  return mode === 'manual' ? 'Aprovação manual' : 'Entrada automática'
}

function getAdmissionModeDescription(mode: LocalGameAdmissionMode) {
  return mode === 'manual'
    ? 'Jogadores solicitam entrada e o organizador aprova ou recusa.'
    : 'Jogadores entram direto enquanto houver vagas disponíveis.'
}

function getReservationRules(form: FormData) {
  return [
    'A reserva fica aguardando confirmação da arena.',
    'Horários ocupados não aparecem para novas reservas.',
    'O criador entra automaticamente como primeiro participante e organizador.',
    form.admissionMode === 'manual'
      ? 'Novos jogadores precisarão de aprovação manual do organizador.'
      : 'Novos jogadores poderão entrar automaticamente enquanto houver vagas.',
    'O valor por jogador é uma estimativa baseada no limite de vagas.',
    'Chegue com antecedência e respeite o nível escolhido.',
  ]
}

function createInitialForm(): FormData {
  const defaultDate = getDefaultDateISO()
  const defaultStart = getDefaultStartTime(defaultDate)
  const defaultEnd = getEndTimeOptions(defaultStart, defaultDate, '')[0] ?? '19:00'

  const draft: FormData = {
    sport: null,
    title: '',
    date: defaultDate,
    time: defaultStart,
    endTime: defaultEnd,
    level: null,
    maxPlayers: 4,
    privacy: 'publico',
    arenaName: '',
    city: 'Faro',
    address: '',
    notes: '',
    durationMinutes: 60,
    pricePerHour: 20,
    admissionMode: 'automatic',
  }

  return {
    ...draft,
    durationMinutes: getDurationMinutes(draft),
  }
}

// ── Componentes visuais ───────────────────────
function ToneBadge({
  tone,
  icon,
  label,
}: {
  tone: StatusTone
  icon: IconName
  label: string
}) {
  const t = TONE[tone]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${t.text}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
      }}
    >
      <Icon name={icon} size={12} />
      {label}
    </span>
  )
}

function IconOrb({
  icon,
  tone,
  size = 'md',
}: {
  icon: IconName
  tone: StatusTone
  size?: 'sm' | 'md' | 'lg'
}) {
  const t = TONE[tone]

  const dimension = {
    sm: 'h-8 w-8 rounded-[11px]',
    md: 'h-12 w-12 rounded-[16px]',
    lg: 'h-16 w-16 rounded-[22px]',
  }[size]

  const iconSize = {
    sm: 15,
    md: 21,
    lg: 29,
  }[size]

  return (
    <div
      className={`${dimension} flex items-center justify-center ${t.text} flex-shrink-0`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 24px ${t.glow}, inset 0 0 18px rgba(255,255,255,0.035)`,
      }}
    >
      <Icon name={icon} size={iconSize} />
    </div>
  )
}

function StatusCard({
  tone,
  icon,
  title,
  description,
}: {
  tone: StatusTone
  icon: IconName
  title: string
  description: string
}) {
  const t = TONE[tone]

  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-[16px] p-4"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 24px ${t.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full blur-3xl"
        style={{ background: t.glow }}
      />

      <div className="relative z-[1]">
        <p className={`flex items-center gap-2 text-[13px] font-extrabold ${t.text}`}>
          <Icon name={icon} size={16} />
          {title}
        </p>

        <p className="mt-1 text-[12px] leading-relaxed text-ph-muted break-words">
          {description}
        </p>
      </div>
    </div>
  )
}

function SectionTitle({
  icon,
  children,
}: {
  icon: IconName
  children: ReactNode
}) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-extrabold text-ph-blue uppercase tracking-widest">
      <Icon name={icon} size={15} />
      {children}
    </p>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 flex items-start gap-1.5 text-[12px] text-red-400">
      <Icon name="warning" size={13} />
      <span>{children}</span>
    </p>
  )
}

function OptionCheck({ active }: { active: boolean }) {
  return (
    <div
      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
      style={{
        border: `2px solid ${active ? '#1DA1F2' : '#5A7A94'}`,
        background: active ? '#1DA1F2' : 'transparent',
      }}
    >
      {active && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
  )
}

function FormPanel({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: StatusTone
}) {
  const t = TONE[tone]

  return (
    <div
      className="rounded-[18px] p-4"
      style={{
        background: tone === 'neutral'
          ? 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))'
          : t.bg,
        border: `1px solid ${tone === 'neutral' ? 'rgba(255,255,255,0.08)' : t.border}`,
        boxShadow: tone === 'neutral' ? '0 14px 34px rgba(0,0,0,0.22)' : `0 0 24px ${t.glow}`,
      }}
    >
      {children}
    </div>
  )
}

// ── Componente principal ──────────────────────
export function CreateGameForm() {
  const router = useRouter()
  const { user } = useAuth()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(() => createInitialForm())
  const [success, setSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveScope, setSaveScope] = useState<SaveScope>('shared')
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [step])

  const set = (field: keyof FormData, value: unknown) => {
    setForm(current => {
      const updated = { ...current, [field]: value } as FormData

      if (field === 'title') {
        updated.title = String(value)
      }

      if (field === 'arenaName') {
        const arenaName = String(value)
        updated.arenaName = arenaName

        if (arenaName in ARENA_PRICES) {
          updated.pricePerHour = ARENA_PRICES[arenaName]
        }

        const availableTimes = getAvailableStartTimes(updated.date, arenaName)

        if (availableTimes.length === 0) {
          updated.time = ''
          updated.endTime = ''
          updated.durationMinutes = 60
          return updated
        }

        if (!availableTimes.includes(updated.time)) {
          updated.time = availableTimes[0]
        }

        const endOptions = getEndTimeOptions(updated.time, updated.date, updated.arenaName)
        updated.endTime = endOptions.includes(updated.endTime)
          ? updated.endTime
          : endOptions[0] ?? ''

        updated.durationMinutes = getDurationMinutes(updated)
      }

      if (field === 'date') {
        const requestedDate = String(value)
        const availableTimes = getAvailableStartTimes(requestedDate, updated.arenaName)

        updated.date = requestedDate

        if (availableTimes.length === 0) {
          updated.time = ''
          updated.endTime = ''
          updated.durationMinutes = 60
          return updated
        }

        if (!availableTimes.includes(updated.time)) {
          updated.time = availableTimes[0]
        }

        const endOptions = getEndTimeOptions(updated.time, updated.date, updated.arenaName)
        updated.endTime = endOptions.includes(updated.endTime)
          ? updated.endTime
          : endOptions[0] ?? ''

        updated.durationMinutes = getDurationMinutes(updated)
      }

      if (field === 'time') {
        const endOptions = getEndTimeOptions(String(value), updated.date, updated.arenaName)

        updated.time = String(value)
        updated.endTime = endOptions.includes(updated.endTime)
          ? updated.endTime
          : endOptions[0] ?? ''

        updated.durationMinutes = getDurationMinutes(updated)
      }

      if (field === 'endTime') {
        updated.endTime = String(value)
        updated.durationMinutes = getDurationMinutes(updated)
      }

      return updated
    })

    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const e: typeof errors = {}

    if (step === 0 && !form.sport) {
      e.sport = 'Escolha um esporte'
    }

    if (step === 1 && !form.arenaName.trim()) {
      e.arenaName = 'Escolha ou informe a arena antes de escolher o horário'
    }

    if (step === 2) {
      const duration = getDurationMinutes(form)
      const availableTimes = getAvailableStartTimes(form.date, form.arenaName)

      if (!form.title.trim()) {
        e.title = 'Dê um título ao jogo'
      } else if (titleAlreadyExistsForArenaWindow(form.title, form.date, form.arenaName)) {
        e.title = `Já existe uma reserva/jogo com título igual ou muito parecido nesta arena dentro de ${TITLE_BLOCK_WINDOW_DAYS} dias`
      }

      if (!form.date) e.date = 'Selecione a data'
      if (!form.time) e.time = 'Não há horários disponíveis para esta arena nesta data'
      if (!form.endTime) e.endTime = 'Defina o horário de término'
      if (!form.level) e.level = 'Escolha o nível'

      if (availableTimes.length === 0) {
        e.time = 'Não há horários disponíveis para esta arena nesta data'
      }

      if (duration < 60 || duration % 60 !== 0) {
        e.endTime = 'A reserva deve ser feita em blocos de hora cheia'
      }

      if (form.pricePerHour < 0) {
        e.pricePerHour = 'Informe um preço válido'
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (validate()) setStep(s => s + 1)
  }

  const back = () => {
    setStep(s => Math.max(0, s - 1))
  }

  const handleCreate = async () => {
    if (isSaving) return

    const durationMinutes = getDurationMinutes(form)

    if (!form.sport || !form.level) {
      alert('Falta escolher o esporte ou o nível do jogo.')
      return
    }

    if (!form.arenaName || !form.time || !form.endTime) {
      alert('Falta escolher arena, data ou horário disponível.')
      return
    }

    if (!user?.id) {
      alert('Você precisa estar logado para criar um jogo compartilhado.')
      return
    }

    if (titleAlreadyExistsForArenaWindow(form.title, form.date, form.arenaName)) {
      alert(`Já existe uma reserva/jogo com título igual ou muito parecido nesta arena dentro de ${TITLE_BLOCK_WINDOW_DAYS} dias. Use um nome mais específico.`)
      return
    }

    const gameInput = {
      sport: form.sport,
      title: form.title,
      date: form.date,
      time: form.time,
      level: form.level,
      maxPlayers: form.maxPlayers,
      privacy: form.privacy,
      arenaName: form.arenaName,
      city: form.city,
      address: form.address,
      notes: form.notes,
      durationMinutes,
      pricePerHour: form.pricePerHour,
      admissionMode: form.admissionMode,
    } satisfies LocalGameInput

    setIsSaving(true)

    try {
      const remoteResult = await createSupabaseGame(gameInput, user.id)

      if (!remoteResult.ok) {
        console.error('[PlayHub] Erro ao criar jogo no Supabase:', remoteResult.error)

        alert(
          'O jogo NÃO foi salvo no Supabase.\n\n' +
          'Erro técnico:\n' +
          remoteResult.error + '\n\n' +
          'Tire print desta mensagem e me envie.'
        )

        return
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('playhub:local-games-updated'))
      }

      setSaveScope('shared')
      setSuccess(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'

      console.error('[PlayHub] Erro inesperado ao criar jogo compartilhado:', error)

      alert(
        'Erro inesperado ao criar jogo compartilhado.\n\n' +
        'Erro técnico:\n' +
        message + '\n\n' +
        'Tire print desta mensagem e me envie.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (success) {
    return (
      <SuccessScreen
        form={form}
        saveScope={saveScope}
        onBack={() => {
          setSuccess(false)
          router.push('/jogos')
          router.refresh()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-ph-dark overflow-hidden">
      <div
        ref={topRef}
        className="flex-shrink-0 px-4 pt-4 pb-3"
        style={{
          background:
            'radial-gradient(circle at 88% 10%, rgba(29,161,242,0.14), transparent 32%), linear-gradient(180deg, rgba(15,28,42,0.99), rgba(7,18,31,1))',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-extrabold text-ph-muted uppercase tracking-widest mb-0.5">
              Etapa {step + 1} de {STEP_LABELS.length}
            </p>

            <h2 className="text-[19px] font-extrabold">
              {STEP_LABELS[step]}
            </h2>
          </div>

          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-1.5 text-[13px] text-ph-muted hover:text-ph-text transition-colors px-3 py-1.5 rounded-[11px]"
              style={{
                background:'rgba(255,255,255,0.045)',
                border:'1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ transform: 'rotate(180deg)' }}>
                <Icon name="arrow" size={14} />
              </span>
              Voltar
            </button>
          )}
        </div>

        <div className="flex gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: i < step ? '100%' : i === step ? '60%' : '0%',
                  background: 'linear-gradient(90deg,#1DA1F2,#00C9A7,#7ED321)',
                  boxShadow: i <= step ? '0 0 12px rgba(29,161,242,0.65)' : 'none',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-5 pb-44 space-y-5">
          {step === 0 && <StepSport form={form} set={set} errors={errors} />}
          {step === 1 && <StepLocal form={form} set={set} errors={errors} />}
          {step === 2 && <StepDetails form={form} set={set} errors={errors} />}
          {step === 3 && <StepConfirm form={form} />}
        </div>
      </div>

      <div
        className="flex-shrink-0 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        style={{
          background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(7,18,31,1))',
          borderTop:'1px solid rgba(255,255,255,0.08)',
          boxShadow:'0 -18px 45px rgba(0,0,0,0.32)',
        }}
      >
        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className="w-full rounded-[15px] py-3.5 text-[14px] font-extrabold text-white inline-flex items-center justify-center gap-2"
            style={{
              background:'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
              boxShadow:'0 10px 28px rgba(29,161,242,0.28)',
              border:'1px solid rgba(255,255,255,0.16)',
            }}
          >
            Continuar
            <Icon name="arrow" size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving}
            className="w-full rounded-[15px] py-3.5 text-[14px] font-extrabold text-white inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background:'linear-gradient(135deg,#7ED321,#00C9A7,#39ff14)',
              boxShadow:'0 10px 28px rgba(126,211,33,0.28)',
              border:'1px solid rgba(255,255,255,0.16)',
            }}
          >
            <Icon name={isSaving ? 'hourglass' : 'check'} size={16} />
            {isSaving ? 'Salvando reserva...' : 'Solicitar reserva'}
          </button>
        )}
      </div>
    </div>
  )
}

// ══ ETAPA 1 — Esporte ════════════════════════
function StepSport({ form, set, errors }: StepProps) {
  return (
    <div className="space-y-3">
      <StatusCard
        tone="info"
        icon="spark"
        title="Escolha o esporte principal"
        description="A modalidade define a categoria do jogo, os filtros e como ele aparecerá para outros atletas."
      />

      {errors.sport && <ErrorText>{errors.sport}</ErrorText>}

      {SPORTS_LIST.map(s => {
        const active = form.sport === s.key
        const tone = TONE[s.tone]

        return (
          <button
            type="button"
            key={s.key}
            onClick={() => set('sport', s.key)}
            className="w-full flex items-center gap-4 p-4 rounded-[20px] text-left transition-all hover:-translate-y-0.5"
            style={{
              background: active ? tone.bg : 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
              border: `1.5px solid ${active ? tone.border : 'rgba(255,255,255,0.08)'}`,
              boxShadow: active ? `0 0 28px ${tone.glow}` : '0 12px 30px rgba(0,0,0,0.20)',
            }}
          >
            <IconOrb icon={s.icon} tone={s.tone} size="lg" />

            <div className="flex-1 min-w-0">
              <p className={`text-[16px] font-extrabold ${active ? tone.text : 'text-ph-text'}`}>
                {s.label}
              </p>

              <p className="text-[12px] text-ph-muted mt-0.5 leading-relaxed">
                {s.desc}
              </p>
            </div>

            <OptionCheck active={active} />
          </button>
        )
      })}
    </div>
  )
}

// ══ ETAPA 2 — Arena/Local ════════════════════
function StepLocal({ form, set, errors }: StepProps) {
  const handleArenaSelect = (arenaName: string) => {
    set('arenaName', arenaName)
  }

  return (
    <div className="space-y-4">
      <StatusCard
        tone="pending"
        icon="hourglass"
        title="A reserva depende da confirmação da arena"
        description="Escolha primeiro a arena. Os horários disponíveis dependem da agenda de cada local."
      />

      <div>
        <SectionTitle icon="arena">Arenas em Faro</SectionTitle>

        <div className="flex gap-2 flex-wrap mt-2">
          {ARENAS_SUGERIDAS.map(a => {
            const active = form.arenaName === a

            return (
              <button
                type="button"
                key={a}
                onClick={() => handleArenaSelect(a)}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
                style={{
                  background: active ? TONE.info.bg : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${active ? TONE.info.border : 'rgba(255,255,255,0.07)'}`,
                  color: active ? '#1DA1F2' : '#5A7A94',
                }}
              >
                {a}
                {ARENA_PRICES[a] > 0 && (
                  <span className="ml-1 text-[10px] opacity-80">
                    · {moneyEUR(ARENA_PRICES[a])}/h
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="ph-label">Nome do local *</label>
        <input
          type="text"
          value={form.arenaName}
          onChange={e => set('arenaName', e.target.value)}
          className="ph-input"
          placeholder="Nome da arena ou local"
        />
        {errors.arenaName && <ErrorText>{errors.arenaName}</ErrorText>}
      </div>

      <div>
        <label className="ph-label">Cidade</label>
        <input
          type="text"
          value={form.city}
          onChange={e => set('city', e.target.value)}
          className="ph-input"
          placeholder="Ex: Faro"
        />
      </div>

      <div>
        <label className="ph-label">
          Endereço <span className="normal-case font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={form.address}
          onChange={e => set('address', e.target.value)}
          className="ph-input"
          placeholder="Rua, número, referência..."
        />
      </div>

      <div>
        <label className="ph-label">
          Observações <span className="normal-case font-normal">(opcional)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="ph-input resize-none"
          rows={3}
          placeholder="Informações extras para os participantes..."
        />
      </div>

      {form.arenaName && (
        <StatusCard
          tone="info"
          icon="price"
          title={`Valor da arena: ${moneyEUR(form.pricePerHour)} / hora`}
          description="Valor fixo definido pela arena. Na versão MVP usamos dados simulados."
        />
      )}

      <ReservationStatusCard />
    </div>
  )
}

// ══ ETAPA 3 — Detalhes/Data/Horário ══════════
function StepDetails({ form, set, errors }: StepProps) {
  const duration = getDurationMinutes(form)
  const total = reservationTotal(form)
  const perPlayer = pricePerPlayer(form)
  const startOptions = getAvailableStartTimes(form.date, form.arenaName)
  const endOptions = form.time ? getEndTimeOptions(form.time, form.date, form.arenaName) : []
  const suggestedTitle = getSuggestedTitle(form)

  const duplicateTitle =
    !!form.title.trim() &&
    titleAlreadyExistsForArenaWindow(form.title, form.date, form.arenaName)

  const showSuggestedTitle =
    !!suggestedTitle &&
    normalizeTitle(form.title) !== normalizeTitle(suggestedTitle)

  return (
    <div className="space-y-4">
      <div>
        <label className="ph-label">Título do jogo *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          className="ph-input"
          placeholder="Ex: Pelada na Praia — Faro"
          maxLength={60}
        />
        {errors.title && <ErrorText>{errors.title}</ErrorText>}

        {!errors.title && duplicateTitle && (
          <ErrorText>
            Já existe uma reserva/jogo com título igual ou muito parecido nesta arena dentro de {TITLE_BLOCK_WINDOW_DAYS} dias.
          </ErrorText>
        )}

        {showSuggestedTitle && (
          <div
            className="mt-2 rounded-[16px] p-3 flex items-center justify-between gap-3"
            style={{
              background:TONE.info.bg,
              border:`1px solid ${TONE.info.border}`,
            }}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-ph-blue uppercase tracking-widest">
                <Icon name="spark" size={12} />
                Sugestão profissional
              </p>

              <p className="text-[13px] font-semibold truncate mt-0.5">
                {suggestedTitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => set('title', suggestedTitle)}
              className="px-3 py-2 rounded-[10px] text-[12px] font-extrabold text-white flex-shrink-0"
              style={{background:'linear-gradient(135deg,#1DA1F2,#00C9A7)'}}
            >
              Usar
            </button>
          </div>
        )}
      </div>

      <FormPanel>
        <SectionTitle icon="arena">Arena selecionada</SectionTitle>

        <p className="text-[15px] font-extrabold mt-2">
          {form.arenaName || '—'}
        </p>

        <p className="text-[12px] text-ph-muted mt-1">
          {moneyEUR(form.pricePerHour)} / hora
        </p>
      </FormPanel>

      <div>
        <label className="ph-label">Data *</label>
        <input
          type="date"
          value={form.date}
          min={todayISO()}
          onChange={e => set('date', e.target.value)}
          className="ph-input"
        />
        {errors.date && <ErrorText>{errors.date}</ErrorText>}

        {isTodayISO(form.date) && (
          <p className="text-[11px] text-ph-muted mt-1">
            Hoje, o app mostra apenas horários futuros.
          </p>
        )}
      </div>

      {startOptions.length === 0 ? (
        <StatusCard
          tone="danger"
          icon="calendar"
          title="Sem horários disponíveis nesta data"
          description="Escolha outra data para ver horários livres nesta arena."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="ph-label">Início *</label>
              <select
                value={form.time}
                onChange={e => set('time', e.target.value)}
                className="ph-input"
              >
                {startOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errors.time && <ErrorText>{errors.time}</ErrorText>}
            </div>

            <div>
              <label className="ph-label">Término *</label>
              <select
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
                className="ph-input"
              >
                {endOptions.map(t => (
                  <option key={t} value={t}>
                    {t} ({formatDuration(timeToMinutes(t) - timeToMinutes(form.time))})
                  </option>
                ))}
              </select>
              {errors.endTime && <ErrorText>{errors.endTime}</ErrorText>}
            </div>
          </div>

          <StatusCard
            tone="success"
            icon="timer"
            title={`${form.time} até ${form.endTime} · ${formatDuration(duration)}`}
            description="Horários ocupados nesta arena não aparecem na lista."
          />
        </>
      )}

      <div>
        <label className="ph-label">Nível *</label>
        {errors.level && <ErrorText>{errors.level}</ErrorText>}

        <div className="space-y-2 mt-2">
          {LEVELS.map(l => {
            const active = form.level === l.key
            const tone = TONE[l.tone]

            return (
              <button
                type="button"
                key={l.key}
                onClick={() => set('level', l.key)}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] text-left transition-all"
                style={{
                  background: active ? tone.bg : 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
                  border: `1.5px solid ${active ? tone.border : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <IconOrb icon={l.icon} tone={l.tone} size="sm" />

                <div className="flex-1">
                  <p className={`text-[13px] font-extrabold ${active ? tone.text : 'text-ph-text'}`}>
                    {l.label}
                  </p>
                  <p className="text-[11px] text-ph-muted">{l.desc}</p>
                </div>

                <OptionCheck active={active} />
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="ph-label">Entrada de jogadores</label>

        <div className="space-y-2 mt-2">
          {ADMISSION_MODES.map(mode => {
            const active = form.admissionMode === mode.key
            const tone = TONE[mode.tone]

            return (
              <button
                type="button"
                key={mode.key}
                onClick={() => set('admissionMode', mode.key)}
                className="w-full flex items-start gap-3 px-3.5 py-3 rounded-[14px] text-left transition-all"
                style={{
                  background: active ? tone.bg : 'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
                  border: `1.5px solid ${active ? tone.border : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <IconOrb icon={mode.icon} tone={mode.tone} size="sm" />

                <div className="flex-1">
                  <p className={`text-[13px] font-extrabold ${active ? tone.text : 'text-ph-text'}`}>
                    {mode.label}
                  </p>

                  <p className="text-[11px] text-ph-muted mt-0.5 leading-relaxed">
                    {mode.desc}
                  </p>

                  <p className="text-[11px] text-ph-muted/80 mt-1 leading-relaxed">
                    {mode.detail}
                  </p>
                </div>

                <OptionCheck active={active} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="ph-label">Máx. jogadores</label>

          <div
            className="flex items-center rounded-[14px] overflow-hidden"
            style={{
              background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
              border:'1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => set('maxPlayers', Math.max(2, form.maxPlayers - 1))}
              className="w-11 h-11 flex items-center justify-center text-ph-blue hover:bg-ph-blue/10 transition-colors flex-shrink-0"
            >
              <Icon name="minus" size={18} />
            </button>

            <span className="flex-1 text-center font-extrabold text-[18px]">
              {form.maxPlayers}
            </span>

            <button
              type="button"
              onClick={() => set('maxPlayers', Math.min(20, form.maxPlayers + 1))}
              className="w-11 h-11 flex items-center justify-center text-ph-green hover:bg-ph-green/10 transition-colors flex-shrink-0"
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
        </div>

        <div>
          <label className="ph-label">Visibilidade</label>

          <div
            className="flex rounded-[14px] overflow-hidden p-1 gap-1"
            style={{
              background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
              border:'1px solid rgba(255,255,255,0.08)',
            }}
          >
            {(['publico','privado'] as Privacy[]).map(p => {
              const active = form.privacy === p

              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => set('privacy', p)}
                  className="flex-1 py-2 rounded-[10px] text-[12px] font-extrabold transition-all inline-flex items-center justify-center gap-1.5"
                  style={
                    active
                      ? {background:'linear-gradient(135deg,#1DA1F2,#00C9A7)',color:'white'}
                      : {color:'#5A7A94'}
                  }
                >
                  <Icon name={p === 'publico' ? 'globe' : 'lock'} size={13} />
                  {p === 'publico' ? 'Público' : 'Privado'}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <FormPanel tone="info">
        <SectionTitle icon="price">Estimativa da reserva</SectionTitle>

        <div className="grid grid-cols-2 gap-2 text-[12px] mt-3">
          <div>
            <p className="text-ph-muted">Total da quadra</p>
            <p className="font-extrabold text-[15px]">{moneyEUR(total)}</p>
          </div>

          <div>
            <p className="text-ph-muted">Estimativa por jogador</p>
            <p className="font-extrabold text-[15px] text-ph-green">{moneyEUR(perPlayer)}</p>
          </div>
        </div>

        <p className="text-[11px] text-ph-muted leading-relaxed mt-3">
          O valor por jogador é estimado com base no número máximo de participantes.
          A confirmação e pagamento da arena serão conectados em etapa futura.
        </p>
      </FormPanel>
    </div>
  )
}

// ══ ETAPA 4 — Confirmação ════════════════════
function StepConfirm({ form }: { form: FormData }) {
  const sport = SPORTS_LIST.find(s => s.key === form.sport)
  const level = LEVELS.find(l => l.key === form.level)
  const duration = getDurationMinutes(form)
  const total = reservationTotal(form)
  const perPlayer = pricePerPlayer(form)

  return (
    <div className="space-y-4">
      <ReservationStatusCard />

      <p className="text-[13px] text-ph-muted">
        Revise os detalhes antes de solicitar a reserva.
      </p>

      <div
        className="rounded-[22px] overflow-hidden"
        style={{
          background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
          border:'1px solid rgba(29,161,242,0.20)',
          boxShadow:'0 18px 48px rgba(0,0,0,0.36)',
        }}
      >
        <div className="h-1.5" style={{background:'linear-gradient(90deg,#1DA1F2,#00C9A7,#7ED321)'}} />

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <IconOrb icon={sport?.icon ?? 'sport'} tone={sport?.tone ?? 'info'} size="md" />

            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-ph-blue font-extrabold uppercase tracking-wider">
                {sport?.label}
              </p>

              <p className="text-[17px] font-extrabold leading-tight break-words">
                {form.title || 'Sem título'}
              </p>
            </div>
          </div>

          <div className="h-px" style={{background:'rgba(255,255,255,0.07)'}} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoItem icon="arena" label="Arena" value={form.arenaName || '—'} />
            <InfoItem icon="calendar" label="Data" value={formatDatePT(form.date)} />
            <InfoItem icon="clock" label="Início" value={form.time || '—'} />
            <InfoItem icon="finish" label="Término" value={form.endTime || '—'} />
            <InfoItem icon="timer" label="Duração" value={formatDuration(duration)} />
            <InfoItem icon="users" label="Jogadores" value={`Até ${form.maxPlayers}`} />
            <InfoItem icon="level" label="Nível" value={level?.label || '—'} />
            <InfoItem
              icon={form.privacy === 'publico' ? 'globe' : 'lock'}
              label="Visibilidade"
              value={form.privacy === 'publico' ? 'Público' : 'Privado'}
            />
          </div>

          <div className="h-px" style={{background:'rgba(255,255,255,0.07)'}} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoItem icon="price" label="Preço/hora" value={moneyEUR(form.pricePerHour)} />
            <InfoItem icon="price" label="Total reserva" value={moneyEUR(total)} />
            <InfoItem icon="receipt" label="Por jogador" value={moneyEUR(perPlayer)} />
            <InfoItem icon="hourglass" label="Status" value="Aguardando arena" tone="pending" />
            <InfoItem
              icon={form.admissionMode === 'manual' ? 'manual' : 'shield'}
              label="Entrada"
              value={getAdmissionModeLabel(form.admissionMode)}
              tone={form.admissionMode === 'manual' ? 'pending' : 'success'}
            />
          </div>

          <div className="h-px" style={{background:'rgba(255,255,255,0.07)'}} />

          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-ph-blue">
              <Icon name="location" size={16} />
            </span>

            <div>
              <p className="text-[13px] font-semibold">{form.arenaName || '—'}</p>
              {form.city && <p className="text-[12px] text-ph-muted">{form.city}</p>}
              {form.address && <p className="text-[12px] text-ph-muted">{form.address}</p>}
              {form.notes && (
                <p className="text-[12px] text-ph-muted mt-1 italic">"{form.notes}"</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AdmissionSummaryCard form={form} />

      <ReservationRulesCard form={form} />

      <p className="text-[12px] text-ph-muted text-center leading-relaxed px-4">
        Ao solicitar, o jogo ficará visível para outros atletas.<br />
        Horários ocupados nesta arena não aparecerão para novas reservas.
      </p>
    </div>
  )
}

// ══ TELA DE SUCESSO ══════════════════════════
function SuccessScreen({ form, saveScope, onBack }: { form: FormData; saveScope: SaveScope; onBack: () => void }) {
  const sport = SPORTS_LIST.find(s => s.key === form.sport)
  const duration = getDurationMinutes(form)
  const total = reservationTotal(form)
  const perPlayer = pricePerPlayer(form)

  return (
    <div
      className="h-full overflow-y-auto bg-ph-dark px-6 py-8"
      style={{
        background:
          'radial-gradient(circle at 50% 20%, rgba(126,211,33,0.16), transparent 35%), radial-gradient(circle at 80% 80%, rgba(29,161,242,0.12), transparent 34%), #060D14',
      }}
    >
      <div className="min-h-full flex flex-col items-center justify-center text-center">
        <div className="mb-4">
          <IconOrb icon="check" tone="success" size="lg" />
        </div>

      <p className="text-[11px] font-extrabold text-ph-green uppercase tracking-widest mb-2">
        {saveScope === 'shared' ? 'Pedido enviado' : 'Salvo localmente'}
      </p>

      <h2
        className="text-[24px] font-extrabold mb-2"
        style={{
          background:'linear-gradient(90deg,#1DA1F2,#7ED321)',
          WebkitBackgroundClip:'text',
          WebkitTextFillColor:'transparent',
          backgroundClip:'text',
        }}
      >
        {saveScope === 'shared' ? 'Reserva solicitada' : 'Reserva salva no aparelho'}
      </h2>

      <p className="text-[15px] font-semibold mb-1">{form.title}</p>

      <p className="text-[13px] text-ph-muted mb-4">
        {sport?.label} · {form.arenaName} · {formatDatePT(form.date)} · {form.time} às {form.endTime} · {formatDuration(duration)}
      </p>

      <div className="w-full max-w-xs mb-4">
        {saveScope === 'shared' ? (
          <ReservationStatusCard />
        ) : (
          <StatusCard
            tone="pending"
            icon="hourglass"
            title="Reserva salva localmente"
            description="O app não conseguiu salvar online neste momento. O jogo ficou salvo neste aparelho como fallback seguro."
          />
        )}
      </div>

      <div className="w-full max-w-xs mb-4">
        <AdmissionSummaryCard form={form} />
      </div>

      <div
        className="rounded-[16px] p-3.5 mb-5 w-full max-w-xs"
        style={{
          background:'linear-gradient(180deg, rgba(15,28,42,0.98), rgba(8,17,29,0.99))',
          border:'1px solid rgba(255,255,255,0.08)',
        }}
      >
        <p className="text-[12px] text-ph-muted">Total estimado da quadra</p>
        <p className="text-[18px] font-extrabold">{moneyEUR(total)}</p>
        <p className="text-[12px] text-ph-green mt-1">
          Aproximadamente {moneyEUR(perPlayer)} por jogador
        </p>
      </div>

      <p className="text-[13px] text-ph-muted mb-8 leading-relaxed max-w-xs">
        Você já está incluído como primeiro participante e organizador.
        {form.admissionMode === 'manual'
          ? ' Novos jogadores precisarão da sua aprovação.'
          : ' Outros atletas poderão entrar enquanto houver vagas.'}
      </p>

      <button
        type="button"
        onClick={onBack}
        className="max-w-xs w-full rounded-[15px] py-3.5 text-[14px] font-extrabold text-white inline-flex items-center justify-center gap-2"
        style={{
          background:'linear-gradient(135deg,#1DA1F2,#00C9A7,#7ED321)',
          boxShadow:'0 10px 28px rgba(29,161,242,0.28)',
          border:'1px solid rgba(255,255,255,0.16)',
        }}
      >
        Ver lista de jogos
        <Icon name="arrow" size={16} />
      </button>
      </div>
    </div>
  )
}

// ── Componentes auxiliares ────────────────────
function ReservationStatusCard() {
  return (
    <StatusCard
      tone="pending"
      icon="hourglass"
      title="Pedido de reserva"
      description="A reserva fica como aguardando confirmação da arena. No MVP, ela já ocupa o horário localmente para evitar conflito entre jogos."
    />
  )
}

function AdmissionSummaryCard({ form }: { form: FormData }) {
  const isManual = form.admissionMode === 'manual'

  return (
    <StatusCard
      tone={isManual ? 'pending' : 'success'}
      icon={isManual ? 'manual' : 'shield'}
      title={isManual ? 'Aprovação manual pelo organizador' : 'Entrada automática'}
      description={getAdmissionModeDescription(form.admissionMode)}
    />
  )
}

function ReservationRulesCard({ form }: { form: FormData }) {
  const rules = getReservationRules(form)

  return (
    <FormPanel>
      <SectionTitle icon="document">Regras rápidas da reserva</SectionTitle>

      <p className="text-[12px] text-ph-muted mt-1">
        Confirme que os participantes entendem as regras básicas antes de publicar.
      </p>

      <div className="space-y-2 mt-3">
        {rules.map(rule => (
          <div key={rule} className="flex items-start gap-2">
            <span className="text-ph-green mt-0.5">
              <Icon name="check" size={13} />
            </span>

            <p className="text-[12px] text-ph-muted leading-relaxed">{rule}</p>
          </div>
        ))}
      </div>
    </FormPanel>
  )
}

function InfoItem({
  icon,
  label,
  value,
  tone = 'info',
}: {
  icon: IconName
  label: string
  value: string
  tone?: StatusTone
}) {
  const t = TONE[tone]

  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className={`flex-shrink-0 ${t.text}`}>
        <Icon name={icon} size={15} />
      </span>

      <div className="min-w-0">
        <p className="text-[10px] text-ph-muted uppercase tracking-wider break-words">{label}</p>
        <p className="text-[13px] font-semibold leading-snug break-words whitespace-normal">{value}</p>
      </div>
    </div>
  )
}

interface StepProps {
  form: FormData
  set: (field: keyof FormData, value: unknown) => void
  errors: Partial<Record<keyof FormData, string>>
}