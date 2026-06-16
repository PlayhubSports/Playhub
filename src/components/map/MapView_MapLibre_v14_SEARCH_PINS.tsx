'use client'

import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_GAMES, MOCK_ARENAS } from '@/lib/hooks/useMockData'
import { type Game, type SportKey } from '@/lib/types'
import { loadLocalGames } from '@/lib/localGames'

type StatusTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral'

type IconName =
  | 'map'
  | 'arena'
  | 'sand'
  | 'racket'
  | 'volleyball'
  | 'location'
  | 'star'
  | 'court'
  | 'games'
  | 'user'
  | 'route'
  | 'plus'
  | 'close'
  | 'info'
  | 'spark'
  | 'empty'
  | 'signal'
  | 'search'

interface ArenaPin {
  id: string
  routeParam: string
  name: string
  shortName: string
  subtitle: string
  address: string
  city: string
  distance: string
  rating: number
  reviews: number
  courts: number
  priceLabel: string
  isPro?: boolean
  sports: SportKey[]
  coordinates: {
    lat: number
    lng: number
  }
  aliases: string[]
  icon: IconName
  tone: StatusTone
}

interface UserLocation {
  lat: number
  lng: number
}

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'error'

const FARO_CENTER: UserLocation = {
  lat: 37.0194,
  lng: -7.9304,
}

// PlayHub MapLibre v14 — mapa real vetorial + busca de pins/arenas.
// Objetivo: pins em primeiro plano, POIs desligados, ruas/nomes surgindo só no zoom alto.
const PLAYHUB_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const STREET_NAME_MIN_ZOOM = 15.7
const LOCAL_ROAD_MIN_ZOOM = 14.9
const MAJOR_ROAD_MIN_ZOOM = 11.6
const PLAYHUB_SCAN_DURATION_MS = 850
const PLAYHUB_ROUTE_PREFETCH_TARGETS = ['/mapa', '/jogos', '/criar', '/feed', '/arenas', '/reservas', '/historico', '/perfil']

type PlayHubStyle = Record<string, any>
type PlayHubLayer = Record<string, any>

function includesAny(value: string, tokens: string[]) {
  return tokens.some(token => value.includes(token))
}

function getLayerSignature(layer: PlayHubLayer) {
  return `${String(layer.id ?? '')} ${String(layer['source-layer'] ?? '')}`.toLowerCase()
}

function isTransportationLayer(layer: PlayHubLayer) {
  const signature = getLayerSignature(layer)
  return (
    signature.includes('transportation') ||
    signature.includes('road') ||
    signature.includes('street') ||
    signature.includes('highway') ||
    signature.includes('bridge') ||
    signature.includes('tunnel')
  )
}

function isMajorRoadLayer(layer: PlayHubLayer) {
  const signature = getLayerSignature(layer)
  return includesAny(signature, [
    'highway',
    'motorway',
    'trunk',
    'primary',
    'secondary',
    'major',
    'main',
  ])
}

function isRoadLabelLayer(layer: PlayHubLayer) {
  if (layer.type !== 'symbol') return false

  const signature = getLayerSignature(layer)

  return (
    signature.includes('transportation_name') ||
    signature.includes('road_name') ||
    signature.includes('road-label') ||
    signature.includes('street-label') ||
    signature.includes('street_name')
  )
}

function isPlaceLabelLayer(layer: PlayHubLayer) {
  if (layer.type !== 'symbol') return false

  const signature = getLayerSignature(layer)

  return (
    signature.includes('place') ||
    signature.includes('country') ||
    signature.includes('state') ||
    signature.includes('province') ||
    signature.includes('region') ||
    signature.includes('city') ||
    signature.includes('town') ||
    signature.includes('village') ||
    signature.includes('suburb') ||
    signature.includes('neighbourhood') ||
    signature.includes('neighborhood')
  )
}

function isPoiOrVisualNoiseLayer(layer: PlayHubLayer) {
  const signature = getLayerSignature(layer)

  return includesAny(signature, [
    'poi',
    'housenumber',
    'house-number',
    'address',
    'shop',
    'restaurant',
    'cafe',
    'bar',
    'hotel',
    'hospital',
    'school',
    'college',
    'university',
    'parking',
    'transit',
    'station',
    'aeroway',
    'airport',
    'railway',
    'ferry_label',
    'water_name',
    'mountain_peak',
    'park_label',
  ])
}

function getPlaceMinZoom(layer: PlayHubLayer) {
  const signature = getLayerSignature(layer)

  if (includesAny(signature, ['country', 'continent'])) return 3
  if (includesAny(signature, ['state', 'province', 'region'])) return 5
  if (includesAny(signature, ['city', 'town'])) return 7
  if (includesAny(signature, ['village'])) return 10
  if (includesAny(signature, ['suburb', 'neighbourhood', 'neighborhood'])) return 12.8

  return 7
}

function buildPlayHubVectorStyle(rawStyle: PlayHubStyle): PlayHubStyle {
  const compactLayers: PlayHubLayer[] = []

  ;(rawStyle.layers ?? []).forEach((layer: PlayHubLayer) => {
    const nextLayer: PlayHubLayer = {
      ...layer,
      layout: { ...(layer.layout ?? {}) },
      paint: { ...(layer.paint ?? {}) },
    }

    const signature = getLayerSignature(nextLayer)

    if (nextLayer.type === 'background') {
      nextLayer.paint = {
        ...nextLayer.paint,
        'background-color': '#010606',
      }
      compactLayers.push(nextLayer)
      return
    }

    if (isPoiOrVisualNoiseLayer(nextLayer)) {
      return
    }

    if (nextLayer.type === 'symbol') {
      if (isRoadLabelLayer(nextLayer)) {
        nextLayer.minzoom = Math.max(Number(nextLayer.minzoom ?? 0), STREET_NAME_MIN_ZOOM)
        nextLayer.maxzoom = 22
        nextLayer.layout.visibility = 'visible'
        delete nextLayer.layout['icon-image']
        nextLayer.layout['text-field'] = [
          'coalesce',
          ['get', 'name:pt'],
          ['get', 'name:latin'],
          ['get', 'name'],
        ]
        nextLayer.layout['text-font'] = ['Noto Sans Regular']
        nextLayer.layout['text-size'] = [
          'interpolate', ['linear'], ['zoom'],
          15.7, 10,
          17, 11.5,
          19, 13,
        ]
        nextLayer.paint = {
          ...nextLayer.paint,
          'text-color': 'rgba(178, 211, 218, 0.60)',
          'text-halo-color': 'rgba(1, 6, 6, 0.94)',
          'text-halo-width': 1.2,
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            15.5, 0,
            16, 0.45,
            17.4, 0.70,
          ],
        }
        compactLayers.push(nextLayer)
        return
      }

      if (isPlaceLabelLayer(nextLayer)) {
        const placeMinZoom = getPlaceMinZoom(nextLayer)
        nextLayer.minzoom = Math.max(Number(nextLayer.minzoom ?? 0), placeMinZoom)
        nextLayer.maxzoom = Math.min(Number(nextLayer.maxzoom ?? 22), 15.8)
        nextLayer.layout.visibility = 'visible'
        delete nextLayer.layout['icon-image']
        nextLayer.layout['text-field'] = [
          'coalesce',
          ['get', 'name:pt'],
          ['get', 'name:latin'],
          ['get', 'name'],
        ]
        nextLayer.layout['text-font'] = ['Noto Sans Bold']
        nextLayer.layout['text-size'] = [
          'interpolate', ['linear'], ['zoom'],
          5, 10,
          10, 12,
          14, 14,
        ]
        nextLayer.paint = {
          ...nextLayer.paint,
          'text-color': [
            'interpolate', ['linear'], ['zoom'],
            7, 'rgba(146, 183, 194, 0.48)',
            12, 'rgba(179, 222, 228, 0.56)',
            15, 'rgba(206, 248, 239, 0.60)',
          ],
          'text-halo-color': 'rgba(1, 6, 6, 0.95)',
          'text-halo-width': 1.25,
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            4, 0.40,
            9, 0.52,
            13, 0.62,
            15.7, 0.16,
          ],
        }
        compactLayers.push(nextLayer)
        return
      }

      return
    }

    if (nextLayer.type === 'line') {
      if (isTransportationLayer(nextLayer)) {
        const majorRoad = isMajorRoadLayer(nextLayer)

        nextLayer.minzoom = Math.max(Number(nextLayer.minzoom ?? 0), majorRoad ? MAJOR_ROAD_MIN_ZOOM : LOCAL_ROAD_MIN_ZOOM)
        nextLayer.paint = {
          ...nextLayer.paint,
          'line-color': majorRoad
            ? [
                'interpolate', ['linear'], ['zoom'],
                11, '#071214',
                14, '#102528',
                16, '#1f4145',
                18, '#2e5c61',
              ]
            : [
                'interpolate', ['linear'], ['zoom'],
                14.9, '#071011',
                16, '#15282a',
                18, '#244144',
              ],
          'line-opacity': majorRoad
            ? [
                'interpolate', ['linear'], ['zoom'],
                10.8, 0,
                12, 0.08,
                14.5, 0.15,
                16, 0.32,
                18, 0.45,
              ]
            : [
                'interpolate', ['linear'], ['zoom'],
                14.6, 0,
                15.6, 0.11,
                16.4, 0.25,
                18, 0.35,
              ],
          'line-width': majorRoad
            ? [
                'interpolate', ['linear'], ['zoom'],
                11, 0.32,
                14, 0.68,
                16, 1.04,
                18, 1.60,
              ]
            : [
                'interpolate', ['linear'], ['zoom'],
                15, 0.22,
                16, 0.48,
                18, 0.92,
              ],
        }
        compactLayers.push(nextLayer)
        return
      }

      if (includesAny(signature, ['waterway'])) {
        nextLayer.paint = {
          ...nextLayer.paint,
          'line-color': '#07383a',
          'line-opacity': 0.10,
          'line-width': 0.6,
        }
        compactLayers.push(nextLayer)
        return
      }

      return
    }

    if (nextLayer.type === 'fill') {
      if (signature.includes('water')) {
        nextLayer.paint = {
          ...nextLayer.paint,
          'fill-color': '#020f11',
          'fill-opacity': 0.76,
        }
        compactLayers.push(nextLayer)
        return
      }

      if (includesAny(signature, ['landcover', 'landuse', 'park', 'forest', 'grass'])) {
        nextLayer.paint = {
          ...nextLayer.paint,
          'fill-color': '#02100c',
          'fill-opacity': 0.12,
        }
        compactLayers.push(nextLayer)
        return
      }

      return
    }
  })

  return {
    ...rawStyle,
    name: 'PlayHub Dark Pulse Vector v13',
    metadata: {
      ...(rawStyle.metadata ?? {}),
      'playhub:purpose': 'Mapa esportivo real, compacto e otimizado: cidades/bairros/ruas por zoom, POIs desligados, pins em destaque e navegação leve.',
      'playhub:layers': `compact:${compactLayers.length}`,
    },
    glyphs: rawStyle.glyphs,
    sprite: rawStyle.sprite,
    layers: compactLayers,
  }
}

let playHubStylePromise: Promise<PlayHubStyle> | null = null

async function getCachedPlayHubVectorStyle() {
  if (!playHubStylePromise) {
    playHubStylePromise = fetch(PLAYHUB_MAP_STYLE_URL)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Style load failed: ${response.status}`)
        }

        return response.json()
      })
      .then(rawStyle => buildPlayHubVectorStyle(rawStyle))
  }

  return playHubStylePromise
}

const TONE: Record<StatusTone, {
  text: string
  bg: string
  border: string
  glow: string
  color: string
}> = {
  pending: {
    text: 'text-amber-400',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.32)',
    glow: 'rgba(245,158,11,0.22)',
    color: '#F59E0B',
  },
  success: {
    text: 'text-ph-green',
    bg: 'rgba(126,211,33,0.10)',
    border: 'rgba(126,211,33,0.30)',
    glow: 'rgba(126,211,33,0.24)',
    color: '#7ED321',
  },
  danger: {
    text: 'text-red-400',
    bg: 'rgba(239,68,68,0.09)',
    border: 'rgba(239,68,68,0.30)',
    glow: 'rgba(239,68,68,0.20)',
    color: '#EF4444',
  },
  info: {
    text: 'text-cyan-300',
    bg: 'rgba(0,209,178,0.10)',
    border: 'rgba(0,209,178,0.30)',
    glow: 'rgba(0,209,178,0.24)',
    color: '#00D1B2',
  },
  neutral: {
    text: 'text-ph-muted',
    bg: 'rgba(216,239,227,0.055)',
    border: 'rgba(216,239,227,0.10)',
    glow: 'rgba(216,239,227,0.08)',
    color: '#8FA99D',
  },
}

const ARENA_PINS: ArenaPin[] = [
  {
    id: 'arena-11-esperancas',
    routeParam: 'arena-11-esperancas',
    name: 'Futebol Clube 11 Esperanças',
    shortName: '11 Esperanças',
    subtitle: 'Clube esportivo em Faro',
    address: 'Faro, Portugal',
    city: 'Faro',
    distance: '1 min',
    rating: 4.2,
    reviews: 176,
    courts: 1,
    priceLabel: '20€/h',
    isPro: true,
    sports: ['futevolei', 'beach_tenis', 'volei'],
    coordinates: {
      lat: 37.0199,
      lng: -7.9311,
    },
    icon: 'sand',
    tone: 'info',
    aliases: [
      'futebol clube 11 esperancas',
      'arena 11 esperancas',
      '11 esperancas',
      '11 esperancas beach arena',
    ],
  },
  {
    id: 'arena-faro-beach',
    routeParam: 'arena-faro-beach',
    name: 'Arena Faro Beach',
    shortName: 'Arena Faro Beach',
    subtitle: 'Arena de areia em Faro',
    address: 'Praia de Faro, Portugal',
    city: 'Faro',
    distance: '8 min',
    rating: 4.7,
    reviews: 89,
    courts: 3,
    priceLabel: '25€/h',
    sports: ['futevolei', 'beach_tenis'],
    coordinates: {
      lat: 36.9975,
      lng: -7.9947,
    },
    icon: 'racket',
    tone: 'success',
    aliases: [
      'arena faro beach',
      'faro beach',
      'praia de faro',
    ],
  },
  {
    id: 'beach-sports-algarve',
    routeParam: 'beach-sports-algarve',
    name: 'Beach Sports Algarve',
    shortName: 'Beach Sports',
    subtitle: 'Centro esportivo no Algarve',
    address: 'Algarve, Portugal',
    city: 'Algarve',
    distance: '15 min',
    rating: 4.5,
    reviews: 52,
    courts: 2,
    priceLabel: '18€/h',
    sports: ['beach_tenis', 'volei'],
    coordinates: {
      lat: 37.0277,
      lng: -7.9484,
    },
    icon: 'volleyball',
    tone: 'pending',
    aliases: [
      'beach sports algarve',
      'sport center algarve',
      'sport center',
    ],
  },
]

const FILTERS: {
  key: string
  label: string
  icon: IconName
  tone: StatusTone
}[] = [
  { key: 'all',         label: 'Todas',       icon: 'map',        tone: 'info' },
  { key: 'futevolei',   label: 'Futevôlei',   icon: 'sand',       tone: 'info' },
  { key: 'beach_tenis', label: 'Beach Tênis', icon: 'racket',     tone: 'success' },
  { key: 'volei',       label: 'Vôlei',       icon: 'volleyball', tone: 'pending' },
  { key: 'pro',         label: 'Destaque',    icon: 'spark',      tone: 'pending' },
]

const SPORT_LABEL: Record<string, string> = {
  futevolei: 'Futevôlei',
  beach_tenis: 'Beach Tênis',
  volei: 'Vôlei',
}

const SPORT_ICON: Record<string, IconName> = {
  futevolei: 'sand',
  beach_tenis: 'racket',
  volei: 'volleyball',
}

const SPORT_TONE: Record<string, StatusTone> = {
  futevolei: 'info',
  beach_tenis: 'success',
  volei: 'pending',
}

const MOCK_WITH_ARENAS = MOCK_GAMES.map(g => ({
  ...g,
  arena: MOCK_ARENAS.find(a => a.id === g.arena_id),
})) as Game[]

function Icon({
  name,
  size = 17,
}: {
  name: IconName
  size?: number
}) {
  if (name === 'map') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4.5 7.2v12.1l5-2.5 5 2.5 5-2.5V4.7l-5 2.5-5-2.5-5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 4.7v12.1M14.5 7.2v12.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'sand') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 17.5c2.2-1 4.4-1 6.6 0 2.2 1 4.4 1 6.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.5 14.2c2.6-.8 5-.8 7.2.1 1.5.6 2.8.7 3.8.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
        <path d="M8 11.5c.5-2.5 2-4.2 4-5.2 2 1 3.5 2.7 4 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6.3v7.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (name === 'location') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'star') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 4l2.2 4.7 5.1.7-3.7 3.6.9 5.1L12 15.7 7.5 18.1l.9-5.1-3.7-3.6 5.1-.7L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'court') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 5v14M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'games') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M7.6 16.6c3.5-4.3 5.2-6.8 8.8-9.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.3 8.2c3.1-.9 6.2-.5 8.6 1.4 2.1 1.6 3.2 3.9 3.4 6.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'user') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="2" />
        <path d="M6 19c.8-3.4 3-5.2 6-5.2s5.2 1.8 6 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'route') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M6 18c3.5-5.5 8.5-6.5 12-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="6" cy="18" r="2.2" stroke="currentColor" strokeWidth="2" />
        <circle cx="18" cy="6" r="2.2" stroke="currentColor" strokeWidth="2" />
        <path d="M9 5H5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

  if (name === 'close') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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

  if (name === 'spark') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'empty') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 17.5V8l7-4 7 4v9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 17.5h8M9.5 12.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'signal') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 16.5a10 10 0 0 1 14 0M8.5 13a5 5 0 0 1 7 0M12 18h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'search') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="10.8" cy="10.8" r="5.8" stroke="currentColor" strokeWidth="2" />
        <path d="M15.2 15.2L20 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  return null
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function gameBelongsToArena(game: Game, arena: ArenaPin) {
  const gameArenaId = normalizeText(game.arena_id ?? '')
  const gameArenaName = normalizeText(game.arena?.name ?? '')
  const arenaId = normalizeText(arena.id)
  const arenaName = normalizeText(arena.name)
  const aliases = arena.aliases.map(normalizeText)

  if (gameArenaId && gameArenaId === arenaId) return true

  if (gameArenaName) {
    if (gameArenaName === arenaName) return true

    return aliases.some(alias =>
      gameArenaName.includes(alias) ||
      alias.includes(gameArenaName)
    )
  }

  return false
}

function getFutureGamesForArena(games: Game[], arena: ArenaPin) {
  const today = todayISO()

  return games
    .filter(game => gameBelongsToArena(game, arena))
    .filter(game => game.date >= today)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.start_time.localeCompare(b.start_time)
    })
}

function getNextGameLabel(games: Game[], arena: ArenaPin) {
  const nextGame = getFutureGamesForArena(games, arena)[0]

  if (!nextGame) return 'Sem jogos'

  if (nextGame.date === todayISO()) {
    return `Hoje ${nextGame.start_time}`
  }

  return `${nextGame.date.split('-').reverse().join('/')} ${nextGame.start_time}`
}

function getArenaSports(arena: ArenaPin) {
  return arena.sports.map(sport => ({
    key: sport,
    label: SPORT_LABEL[sport] ?? sport,
    icon: SPORT_ICON[sport] ?? 'games',
    tone: SPORT_TONE[sport] ?? 'info',
  }))
}

function getArenaSearchText(arena: ArenaPin) {
  return normalizeText([
    arena.name,
    arena.shortName,
    arena.subtitle,
    arena.address,
    arena.city,
    arena.priceLabel,
    ...arena.aliases,
    ...arena.sports.map(sport => SPORT_LABEL[sport] ?? sport),
  ].join(' '))
}

function getArenaSearchMeta(arena: ArenaPin) {
  return getArenaSports(arena).map(sport => sport.label).join(' · ')
}

function getArenaGamesCount(games: Game[], arena: ArenaPin) {
  return getFutureGamesForArena(games, arena).length
}

function getDistanceKm(from: UserLocation, to: UserLocation) {
  const earthRadiusKm = 6371
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

function formatDistance(userLocation: UserLocation | null, arena: ArenaPin) {
  if (!userLocation) return arena.distance

  const km = getDistanceKm(userLocation, arena.coordinates)

  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }

  return `${km.toFixed(1).replace('.', ',')} km`
}

function getArenaVisual(arena: ArenaPin) {
  if (arena.isPro) {
    return {
      color: '#F4B63A',
      color2: '#FFF2A6',
      border: '#FFE18A',
      glow: 'rgba(244,182,58,0.46)',
      ink: '#fffaf0',
      icon: 'star',
    }
  }

  if (arena.icon === 'racket') {
    return {
      color: '#A855F7',
      color2: '#E9D5FF',
      border: '#C084FC',
      glow: 'rgba(168,85,247,0.42)',
      ink: '#fdf7ff',
      icon: 'racket',
    }
  }

  if (arena.icon === 'volleyball') {
    return {
      color: '#7ED321',
      color2: '#D8FF72',
      border: '#B9FF4A',
      glow: 'rgba(126,211,33,0.40)',
      ink: '#fbffe9',
      icon: 'volleyball',
    }
  }

  return {
    color: '#00D1B2',
    color2: '#8DFFE7',
    border: '#44FDE0',
    glow: 'rgba(0,209,178,0.42)',
    ink: '#effffb',
    icon: 'sand',
  }
}

function getPinSymbolSvg(arena: ArenaPin, cx: number, cy: number, ink: string) {
  if (arena.isPro) {
    return `
      <path d="M${cx} ${cy - 10}l3 6.3 7 .9-5.1 4.9 1.2 7-6.1-3.4-6.1 3.4 1.2-7-5.1-4.9 7-.9L${cx} ${cy - 10}Z"
        fill="none" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round" />
    `
  }

  if (arena.icon === 'racket') {
    return `
      <ellipse cx="${cx - 3}" cy="${cy - 4}" rx="5.6" ry="7.5" transform="rotate(-35 ${cx - 3} ${cy - 4})"
        fill="none" stroke="${ink}" stroke-width="2.4" />
      <path d="M${cx + 4} ${cy + 5}l7.2 7.2M${cx + 9.2} ${cy + 10.2}l-3.1 3.1"
        stroke="${ink}" stroke-width="2.4" stroke-linecap="round" />
      <path d="M${cx - 8.8} ${cy - 7.2}l8 8M${cx - 10.4} ${cy - 3.4}l6.8 6.8"
        stroke="${ink}" stroke-width="1.35" stroke-linecap="round" opacity="0.62" />
    `
  }

  if (arena.icon === 'volleyball') {
    return `
      <circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="${ink}" stroke-width="2.4" />
      <path d="M${cx} ${cy - 10}c2 3.3 2.2 6.7.8 10-1.3 3.1-3.8 5.3-7.4 6.6"
        fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" />
      <path d="M${cx - 8.2} ${cy - 5.8}c4-.8 7.4 0 10.1 2.1 2.7 2.1 4.3 5.1 5 9"
        fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" />
      <path d="M${cx + 8.6} ${cy - 5.5}c-2.9.3-5.2 1.2-7.1 2.6"
        fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" />
    `
  }

  return `
    <path d="M${cx - 10} ${cy + 7.5}c4-1.9 8.1-1.9 12.1 0 4 1.9 8.1 1.9 11.7 0"
      fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" />
    <path d="M${cx - 7} ${cy + 1.8}c4.7-1.4 9-1.3 12.9.2 2.4.9 4.7 1.1 6.8.3"
      fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" opacity="0.7" />
    <path d="M${cx - 5.5} ${cy - 3.2}c1-4.8 3.8-7.9 8-9.9 4.2 2 7 5.1 8 9.9"
      fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M${cx + 2.4} ${cy - 12.8}v16.8"
      stroke="${ink}" stroke-width="1.9" stroke-linecap="round" opacity="0.78" />
  `
}

function createArenaMarkerElement(arena: ArenaPin, isActive: boolean, onClick: () => void) {
  const visual = getArenaVisual(arena)
  const size = isActive ? 58 : 50
  const viewWidth = 64
  const viewHeight = 74
  const cx = 32
  const cy = 27
  const core = isActive ? 16 : 14

  const element = document.createElement('button')
  element.type = 'button'
  element.title = arena.name
  element.setAttribute('aria-label', arena.name)
  element.className = `playhub-map-pin ${isActive ? 'playhub-map-pin-active' : ''}`
  element.style.width = `${size}px`
  element.style.height = `${Math.round(size * 1.16)}px`
  element.style.border = '0'
  element.style.padding = '0'
  element.style.background = 'transparent'
  element.style.cursor = 'pointer'
  element.style.overflow = 'visible'
  element.style.position = 'absolute'
  element.style.top = '0'
  element.style.left = '0'
  element.style.margin = '0'
  element.style.lineHeight = '0'
  element.style.willChange = 'transform'
  element.style.zIndex = isActive ? '70' : arena.isPro ? '45' : '35'
  element.style.setProperty('--pin-glow', visual.glow)

  // Correção crítica: o elemento raiz precisa ficar absoluto porque o MapLibre
  // posiciona o pin com transform inline neste próprio nó.
  // Animações e hover só podem acontecer no filho interno.
  element.innerHTML = `
    <span class="playhub-map-pin-inner" aria-hidden="true">
      <svg width="${size}" height="${Math.round(size * 1.16)}" viewBox="0 0 ${viewWidth} ${viewHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="aura-${arena.id}" cx="50%" cy="43%" r="62%">
            <stop offset="0%" stop-color="${visual.color2}" stop-opacity="0.34" />
            <stop offset="55%" stop-color="${visual.color}" stop-opacity="0.12" />
            <stop offset="100%" stop-color="${visual.color}" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="pin-${arena.id}" x1="20%" y1="12%" x2="80%" y2="88%">
            <stop offset="0%" stop-color="${visual.color2}" />
            <stop offset="48%" stop-color="${visual.color}" />
            <stop offset="100%" stop-color="#031013" />
          </linearGradient>
          <linearGradient id="glass-${arena.id}" x1="28%" y1="10%" x2="72%" y2="90%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.72)" />
            <stop offset="45%" stop-color="rgba(255,255,255,0.10)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <ellipse cx="32" cy="29" rx="29" ry="29" fill="url(#aura-${arena.id})" opacity="${isActive ? '0.88' : '0.58'}" />
        <path d="M32 70C25 59 15 50.5 15 31.2 15 21 22.5 13 32 13s17 8 17 18.2C49 50.5 39 59 32 70Z"
          fill="rgba(2,8,10,0.94)" stroke="${visual.border}" stroke-width="${isActive ? '2.5' : '2'}" />
        <circle cx="32" cy="31" r="23" fill="rgba(2,8,10,0.78)" stroke="rgba(255,255,255,0.10)" stroke-width="1" />
        <circle cx="32" cy="31" r="${core}" fill="url(#pin-${arena.id})" stroke="rgba(255,255,255,0.56)" stroke-width="1.35" />
        <circle cx="25" cy="23" r="7" fill="url(#glass-${arena.id})" opacity="0.46" />
        ${getPinSymbolSvg(arena, cx, cy + 4, visual.ink)}
        ${arena.isPro ? `
          <g>
            <rect x="43" y="18" width="18" height="13" rx="6.5" fill="#F4B63A" stroke="rgba(1,6,6,0.78)" stroke-width="1.1" />
            <text x="52" y="26.6" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="7.5" font-weight="900" fill="#07100a">PRO</text>
          </g>
        ` : ''}
      </svg>
    </span>
  `

  element.addEventListener('click', event => {
    event.stopPropagation()
    onClick()
  })

  return element
}

function createUserMarkerElement() {
  const element = document.createElement('div')
  element.className = 'playhub-user-pin'
  element.style.position = 'absolute'
  element.style.top = '0'
  element.style.left = '0'
  element.style.margin = '0'
  element.style.willChange = 'transform'
  element.style.zIndex = '80'
  element.innerHTML = `
    <span class="playhub-user-pin-pulse"></span>
    <span class="playhub-user-pin-core"></span>
  `
  return element
}

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

function PopupStat({
  icon,
  val,
  label,
  tone = 'info',
}: {
  icon: IconName
  val: string
  label: string
  tone?: StatusTone
}) {
  const t = TONE[tone]

  return (
    <div className="text-center min-w-0">
      <div className={`flex justify-center mb-1 ${t.text}`}>
        <Icon name={icon} size={15} />
      </div>

      <div className="text-[14px] font-extrabold text-ph-text leading-tight break-words">
        {val}
      </div>

      <div className="text-[10px] text-ph-muted">
        {label}
      </div>
    </div>
  )
}

function locationStatusCopy(status: LocationStatus) {
  if (status === 'loading') return 'Localizando...'
  if (status === 'granted') return 'Localização ativa'
  if (status === 'denied') return 'Localização negada'
  if (status === 'unsupported') return 'GPS indisponível'
  if (status === 'error') return 'Erro ao localizar'
  return 'Usar minha localização'
}


function getPlayHubMapPadding() {
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 768

  return {
    top: isNarrow ? 150 : 130,
    bottom: isNarrow ? 185 : 130,
    left: isNarrow ? 56 : 95,
    right: isNarrow ? 56 : 95,
  }
}

function getPlayHubMotionDuration(duration: number) {
  if (typeof window === 'undefined') return duration

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const isNarrow = window.innerWidth < 768

  if (reduceMotion) return 0
  if (isNarrow) return Math.min(duration, 260)

  return duration
}

function stopMapWork(map: any) {
  if (!map) return

  try { map.stop?.() } catch {}
}

function frameArenasOnMap(map: any, maplibregl: any, arenas: ArenaPin[], animated = true) {
  if (!map || !maplibregl || arenas.length === 0) return

  const padding = getPlayHubMapPadding()

  if (arenas.length === 1) {
    const arena = arenas[0]

    map.easeTo({
      center: [arena.coordinates.lng, arena.coordinates.lat],
      zoom: Math.max(map.getZoom(), 14.4),
      duration: animated ? getPlayHubMotionDuration(360) : 0,
      essential: true,
    })
    return
  }

  const bounds = new maplibregl.LngLatBounds()

  arenas.forEach(arena => {
    bounds.extend([arena.coordinates.lng, arena.coordinates.lat])
  })

  map.fitBounds(bounds, {
    padding,
    maxZoom: 14.5,
    duration: animated ? getPlayHubMotionDuration(420) : 0,
    essential: true,
  })
}

export function MapView() {
  const router = useRouter()

  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapLibRef = useRef<any>(null)
  const mapRef = useRef<any>(null)
  const arenaMarkersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const lastAutoFrameKeyRef = useRef('')

  const [mapReady, setMapReady] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState('')
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeArena, setActiveArena] = useState<ArenaPin | null>(null)
  const [localGames, setLocalGames] = useState<Game[]>([])
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [isScanningPins, setIsScanningPins] = useState(true)

  const refreshLocalGames = () => {
    setLocalGames(loadLocalGames())
  }

  const allGames = useMemo(() => {
    return [...localGames, ...MOCK_WITH_ARENAS]
  }, [localGames])

  const normalizedSearchQuery = useMemo(() => normalizeText(searchQuery), [searchQuery])

  const filteredArenas = useMemo(() => {
    return ARENA_PINS.filter(arena => {
      if (filter === 'all') return true
      if (filter === 'pro') return !!arena.isPro

      return arena.sports.includes(filter as SportKey)
    })
  }, [filter])

  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) return []

    return ARENA_PINS
      .filter(arena => getArenaSearchText(arena).includes(normalizedSearchQuery))
      .slice(0, 6)
  }, [normalizedSearchQuery])

  const visibleArenas = useMemo(() => {
    if (normalizedSearchQuery) return searchResults

    return filteredArenas
  }, [filteredArenas, normalizedSearchQuery, searchResults])

  useEffect(() => {
    PLAYHUB_ROUTE_PREFETCH_TARGETS.forEach(target => {
      try {
        router.prefetch(target)
      } catch {}
    })
  }, [router])

  useEffect(() => {
    const stopBeforeNavigation = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null

      if (!target?.closest('a,button,[role="button"]')) return

      stopMapWork(mapRef.current)
    }

    document.addEventListener('pointerdown', stopBeforeNavigation, true)

    return () => {
      document.removeEventListener('pointerdown', stopBeforeNavigation, true)
    }
  }, [])

  useEffect(() => {
    if (!mapReady || mapLoading) return

    setActiveArena(null)
    setIsScanningPins(true)

    const timer = window.setTimeout(() => {
      setIsScanningPins(false)
    }, PLAYHUB_SCAN_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [filter, mapLoading, mapReady])

  const requestUserLocation = useCallback((centerMap = true) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unsupported')
      return
    }

    setLocationStatus('loading')

    navigator.geolocation.getCurrentPosition(
      position => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setUserLocation(nextLocation)
        setLocationStatus('granted')

        if (centerMap && mapRef.current) {
          mapRef.current.flyTo({
            center: [nextLocation.lng, nextLocation.lat],
            zoom: 14.2,
            duration: getPlayHubMotionDuration(180),
            essential: true,
          })
        }
      },
      () => {
        setLocationStatus('denied')

        if (centerMap && mapRef.current) {
          mapRef.current.flyTo({
            center: [FARO_CENTER.lng, FARO_CENTER.lat],
            zoom: 12.7,
            duration: getPlayHubMotionDuration(320),
            essential: true,
          })
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 60000,
      }
    )
  }, [])

  useEffect(() => {
    refreshLocalGames()

    const handleLocalGamesUpdated = () => {
      refreshLocalGames()
    }

    const handleStorageUpdate = (event: StorageEvent) => {
      if (
        event.key === 'playhub:local_games' ||
        event.key === 'playhub:game_history'
      ) {
        refreshLocalGames()
      }
    }

    window.addEventListener('playhub:local-games-updated', handleLocalGamesUpdated)
    window.addEventListener('storage', handleStorageUpdate)

    return () => {
      window.removeEventListener('playhub:local-games-updated', handleLocalGamesUpdated)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function initMap() {
      if (!mapElementRef.current || mapRef.current) return

      try {
        setMapLoading(true)
        setMapError('')

        const maplibregl = (await import('maplibre-gl')) as any

        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          try {
            maplibregl.workerCount = 1
          } catch {}
        }

        const playHubStyle = await getCachedPlayHubVectorStyle()

        if (cancelled || !mapElementRef.current) return

        mapLibRef.current = maplibregl

        const map = new maplibregl.Map({
          container: mapElementRef.current,
          style: playHubStyle,
          center: [FARO_CENTER.lng, FARO_CENTER.lat],
          zoom: 12.7,
          minZoom: 7,
          maxZoom: 19,
          attributionControl: true,
          dragRotate: false,
          pitchWithRotate: false,
          keyboard: false,
          logoPosition: 'bottom-left',
          fadeDuration: 0,
          refreshExpiredTiles: false,
          renderWorldCopies: false,
          crossSourceCollisions: false,
          collectResourceTiming: false,
          maxTileCacheSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 24 : 40,
          antialias: false,
        })

        map.touchZoomRotate.disableRotation()
        map.doubleClickZoom.disable()
        map.boxZoom.disable()
        mapRef.current = map

        map.on('click', () => {
          setActiveArena(null)
        })

        map.on('load', () => {
          if (cancelled) return

          window.requestAnimationFrame(() => {
            map.resize()
          })

          setMapReady(true)
          setMapLoading(false)
          requestUserLocation(false)
        })

        window.setTimeout(() => {
          if (!cancelled) map.resize()
        }, 120)
      } catch (error) {
        console.error('[PlayHub] Erro ao carregar mapa PlayHub:', error)
        setMapLoading(false)
        setMapError('Não foi possível carregar o mapa vetorial. Verifique a internet e a instalação do MapLibre.')
      }
    }

    void initMap()

    return () => {
      cancelled = true

      const mapToRemove = mapRef.current
      const markersToRemove = arenaMarkersRef.current.splice(0)
      const userMarkerToRemove = userMarkerRef.current

      userMarkerRef.current = null
      mapRef.current = null
      mapLibRef.current = null

      stopMapWork(mapToRemove)

      const disposeMap = () => {
        markersToRemove.forEach(marker => {
          try { marker.remove() } catch {}
        })

        try { userMarkerToRemove?.remove() } catch {}
        try { mapToRemove?.remove() } catch {}
      }

      if (typeof window !== 'undefined') {
        window.setTimeout(disposeMap, 120)
      } else {
        disposeMap()
      }
    }
  }, [requestUserLocation])

  useEffect(() => {
    const map = mapRef.current
    const maplibregl = mapLibRef.current

    if (!map || !maplibregl || !mapReady || isScanningPins || visibleArenas.length === 0) return

    const frameKey = `${filter}:${visibleArenas.map(arena => arena.id).join('|')}`

    if (lastAutoFrameKeyRef.current === frameKey) return

    lastAutoFrameKeyRef.current = frameKey

    const timer = window.setTimeout(() => {
      frameArenasOnMap(map, maplibregl, visibleArenas, false)
    }, 90)

    return () => window.clearTimeout(timer)
  }, [filter, isScanningPins, mapReady, visibleArenas])

  useEffect(() => {
    const map = mapRef.current
    const maplibregl = mapLibRef.current

    if (!map || !maplibregl || !mapReady) return

    arenaMarkersRef.current.forEach(marker => marker.remove())
    arenaMarkersRef.current = []

    if (isScanningPins) return

    visibleArenas.forEach(arena => {
      const isActive = activeArena?.id === arena.id
      const coordinates: [number, number] = [arena.coordinates.lng, arena.coordinates.lat]

      const markerElement = createArenaMarkerElement(arena, isActive, () => {
        setActiveArena(current => current?.id === arena.id ? null : arena)
        map.easeTo({
          center: coordinates,
          zoom: Math.max(map.getZoom(), 15.2),
          duration: getPlayHubMotionDuration(180),
          essential: true,
        })
      })

      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'bottom',
        offset: [0, 0],
      })
        .setLngLat(coordinates)
        .addTo(map)

      arenaMarkersRef.current.push(marker)
    })

    return () => {
      arenaMarkersRef.current.forEach(marker => marker.remove())
      arenaMarkersRef.current = []
    }
  }, [activeArena?.id, allGames, isScanningPins, mapReady, visibleArenas])

  useEffect(() => {
    const map = mapRef.current
    const maplibregl = mapLibRef.current

    if (!map || !maplibregl || !mapReady || !userLocation) return

    userMarkerRef.current?.remove()

    userMarkerRef.current = new maplibregl.Marker({
      element: createUserMarkerElement(),
      anchor: 'center',
    })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map)

    return () => {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
    }
  }, [mapReady, userLocation])

  useEffect(() => {
    if (!activeArena) return

    const stillVisible = visibleArenas.some(arena => arena.id === activeArena.id)

    if (!stillVisible) {
      setActiveArena(null)
    }
  }, [activeArena, visibleArenas])

  const prepareMapForRouteChange = () => {
    stopMapWork(mapRef.current)
    setActiveArena(null)
    setIsScanningPins(false)
  }

  const handleOpenArena = () => {
    if (!activeArena) return

    const target = `/arenas?arena=${encodeURIComponent(activeArena.routeParam)}`

    prepareMapForRouteChange()
    router.push(target)
  }

  const handleCreateGame = () => {
    prepareMapForRouteChange()
    router.push('/criar')
  }

  const handleCenterArena = (arena: ArenaPin) => {
    mapRef.current?.easeTo({
      center: [arena.coordinates.lng, arena.coordinates.lat],
      zoom: 15.8,
      duration: getPlayHubMotionDuration(320),
      essential: true,
    })
  }

  const handleSelectArenaFromSearch = (arena: ArenaPin) => {
    setSearchQuery(arena.shortName)
    setSearchFocused(false)
    setActiveArena(arena)
    setIsScanningPins(false)
    handleCenterArena(arena)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchFocused(false)
    setActiveArena(null)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return

    const firstResult = searchResults[0]

    if (!firstResult) return

    event.preventDefault()
    handleSelectArenaFromSearch(firstResult)
  }

  const handleOpenRoute = () => {
    if (!activeArena) return

    const destination = `${activeArena.coordinates.lat},${activeArena.coordinates.lng}`
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex gap-2 overflow-x-auto px-4 py-2.5 flex-shrink-0 scrollbar-none"
        style={{
          background: 'linear-gradient(180deg, rgba(5,8,13,0.99), rgba(6,13,12,1))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {FILTERS.map(f => {
          const active = filter === f.key
          const t = TONE[f.tone]

          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-extrabold flex-shrink-0 ${active ? t.text : 'text-ph-muted'}`}
              style={{
                background: active ? t.bg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? t.border : 'rgba(255,255,255,0.07)'}`,
                boxShadow: active ? `0 0 18px ${t.glow}` : 'none',
              }}
            >
              <Icon name={f.icon} size={13} />
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="relative flex-1 overflow-hidden bg-ph-dark2">
        <style jsx global>{`
          @keyframes playhub-radar-pulse {
            0% {
              opacity: 0;
              transform: scale(0.35);
            }
            18% {
              opacity: 0.88;
            }
            100% {
              opacity: 0;
              transform: scale(1.85);
            }
          }

          @keyframes playhub-radar-core {
            0%, 100% {
              transform: scale(0.94);
              opacity: 0.62;
            }
            50% {
              transform: scale(1.06);
              opacity: 1;
            }
          }

          .playhub-radar-ring {
            animation: playhub-radar-pulse 1.35s ease-out infinite;
          }

          .playhub-radar-core {
            animation: playhub-radar-core 1.35s ease-in-out infinite;
          }

          .maplibregl-map {
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
            font: 12px/20px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .maplibregl-canvas-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          }

          .maplibregl-canvas {
            position: absolute;
            left: 0;
            top: 0;
          }

          .maplibregl-control-container {
            pointer-events: none;
          }

          .maplibregl-ctrl {
            pointer-events: auto;
          }

          .maplibregl-marker {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            will-change: transform;
            transform-origin: center bottom;
            opacity: 1;
            transition: opacity 140ms ease;
            user-select: none;
          }

          .playhub-maplibre-map {
            background: #010606 !important;
            isolation: isolate;
          }

          .playhub-maplibre-map .maplibregl-canvas {
            outline: none;
          }

          .playhub-maplibre-map .maplibregl-canvas-container,
          .playhub-maplibre-map .maplibregl-map {
            background: #010606 !important;
          }

          .playhub-maplibre-map .maplibregl-ctrl-attrib {
            background: rgba(1, 6, 6, 0.62) !important;
            color: rgba(190, 220, 218, 0.54) !important;
            font-size: 10px !important;
            line-height: 16px !important;
            border-top-left-radius: 8px;
            backdrop-filter: blur(8px);
          }

          .playhub-maplibre-map .maplibregl-ctrl-attrib a {
            color: rgba(190, 241, 232, 0.66) !important;
          }

          .playhub-map-pin {
            position: relative;
            display: block;
            overflow: visible;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }

          .playhub-map-pin-inner {
            display: block;
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 11px 16px var(--pin-glow));
            transform: translateY(0) scale(1);
            transform-origin: 50% 92%;
            transition: transform 180ms ease, filter 180ms ease, opacity 180ms ease;
            pointer-events: none;
          }

          .playhub-map-pin:hover {
            z-index: 50;
          }

          .playhub-map-pin:hover .playhub-map-pin-inner {
            transform: translateY(-3px) scale(1.04);
            filter: drop-shadow(0 14px 22px var(--pin-glow));
          }

          .playhub-map-pin-active {
            z-index: 60;
          }

          .playhub-map-pin-active .playhub-map-pin-inner {
            filter: drop-shadow(0 16px 26px var(--pin-glow));
          }

          .playhub-user-pin {
            position: relative;
            width: 30px;
            height: 30px;
            border-radius: 999px;
          }

          .playhub-user-pin-pulse {
            position: absolute;
            inset: 0;
            border-radius: 999px;
            background: rgba(0, 209, 178, 0.18);
            border: 1px solid rgba(141, 255, 231, 0.42);
            animation: playhub-radar-pulse 1.45s ease-out infinite;
          }

          .playhub-user-pin-core {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 15px;
            height: 15px;
            transform: translate(-50%, -50%);
            border-radius: 999px;
            background: linear-gradient(135deg, #8DFFE7, #00D1B2);
            border: 3px solid rgba(255,255,255,0.86);
            box-shadow: 0 0 22px rgba(0,209,178,0.42);
          }

          @media (max-width: 768px) {
            .playhub-map-pin-inner {
              filter: drop-shadow(0 8px 12px var(--pin-glow));
              transition: transform 120ms ease, opacity 120ms ease;
            }


            .playhub-user-pin-pulse {
              animation: none;
              opacity: 0.42;
            }

            .playhub-map-pin:hover .playhub-map-pin-inner {
              transform: none;
            }

            .playhub-maplibre-map .maplibregl-ctrl-attrib {
              font-size: 9px !important;
              line-height: 14px !important;
            }
          }
        `}</style>

        <div
          ref={mapElementRef}
          className="absolute inset-0 z-0 playhub-maplibre-map"
          style={{
            background: '#03070b',
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              'radial-gradient(circle at 50% 43%, rgba(0,209,178,0.08), transparent 42%), radial-gradient(circle at 76% 70%, rgba(126,211,33,0.055), transparent 30%), linear-gradient(180deg, rgba(3,7,11,0.18) 0%, rgba(3,7,11,0.06) 38%, rgba(3,7,11,0.26) 100%)',
            mixBlendMode: 'multiply',
          }}
        />

        {isScanningPins && !mapLoading && !mapError && (
          <div className="pointer-events-none absolute inset-0 z-[7] flex items-center justify-center">
            <div className="relative h-[250px] w-[250px] rounded-full">
              <span
                className="playhub-radar-ring absolute inset-0 rounded-full"
                style={{
                  border: '1px solid rgba(0,209,178,0.42)',
                  background: 'radial-gradient(circle, rgba(0,209,178,0.16), rgba(0,209,178,0.04) 42%, transparent 68%)',
                  boxShadow: '0 0 42px rgba(0,209,178,0.18)',
                }}
              />

              <span
                className="playhub-radar-ring absolute inset-[34px] rounded-full"
                style={{
                  animationDelay: '0.32s',
                  border: '1px solid rgba(126,211,33,0.40)',
                  background: 'radial-gradient(circle, rgba(126,211,33,0.12), rgba(126,211,33,0.035) 42%, transparent 70%)',
                  boxShadow: '0 0 36px rgba(126,211,33,0.16)',
                }}
              />

              <span
                className="playhub-radar-core absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #00D1B2, #7ED321)',
                  border: '2px solid rgba(255,255,255,0.72)',
                  boxShadow: '0 0 34px rgba(0,209,178,0.46), 0 0 52px rgba(126,211,33,0.32)',
                }}
              />
            </div>
          </div>
        )}

        <div
          className="absolute top-2.5 right-2.5 z-[13] flex flex-col items-end gap-2"
          style={{
            width: 'min(330px, calc(100vw - 24px))',
          }}
        >
          <div
            className="relative w-full rounded-[17px] backdrop-blur-md"
            style={{
              background: 'rgba(5,8,13,0.92)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.30)',
            }}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-ph-blue flex-shrink-0">
                <Icon name="search" size={14} />
              </span>

              <input
                value={searchQuery}
                onChange={event => {
                  setSearchQuery(event.target.value)
                  setSearchFocused(true)
                  setActiveArena(null)
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchFocused(false), 120)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar arena ou esporte"
                className="min-w-0 flex-1 bg-transparent text-[12px] font-bold text-ph-text placeholder:text-ph-muted outline-none"
                aria-label="Buscar arenas e pins esportivos"
              />

              {searchQuery && (
                <button
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={handleClearSearch}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-ph-muted hover:text-ph-text"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  aria-label="Limpar busca"
                >
                  <Icon name="close" size={13} />
                </button>
              )}
            </div>

            {searchFocused && normalizedSearchQuery && (
              <div
                className="absolute left-0 right-0 top-[calc(100%+6px)] overflow-hidden rounded-[17px]"
                style={{
                  background: 'rgba(5,8,13,0.96)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 16px 38px rgba(0,0,0,0.44)',
                }}
              >
                {searchResults.length > 0 ? (
                  searchResults.map(arena => (
                    <button
                      key={arena.id}
                      type="button"
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => handleSelectArenaFromSearch(arena)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <IconOrb icon={arena.icon} tone={arena.tone} size="sm" />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-extrabold text-ph-text">
                          {arena.shortName}
                        </span>

                        <span className="block truncate text-[10px] font-semibold text-ph-muted">
                          {getArenaSearchMeta(arena)} · {arena.city}
                        </span>
                      </span>

                      {arena.isPro && (
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-black text-amber-300"
                          style={{
                            background: 'rgba(245,158,11,0.12)',
                            border: '1px solid rgba(245,158,11,0.28)',
                          }}
                        >
                          PRO
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-[12px] font-semibold text-ph-muted">
                    Nenhum pin encontrado.
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => requestUserLocation(true)}
            className="flex items-center gap-1.5 rounded-[14px] px-3 py-2 text-[11px] font-extrabold text-ph-text backdrop-blur-md"
            style={{
              background: 'rgba(5,8,13,0.91)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.30)',
            }}
          >
            <span className={locationStatus === 'granted' ? 'text-ph-green' : 'text-ph-blue'}>
              <Icon name="location" size={14} />
            </span>
            {locationStatusCopy(locationStatus)}
          </button>
        </div>

        <div
          className="absolute bottom-20 left-3 rounded-[14px] p-3 z-[10] backdrop-blur-md"
          style={{
            background: 'rgba(5,8,13,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.30)',
          }}
        >
          {[
            { tone: 'info' as StatusTone, label: 'Arenas', icon: 'arena' as IconName },
            { tone: 'pending' as StatusTone, label: 'Destaque', icon: 'spark' as IconName },
            { tone: 'neutral' as StatusTone, label: 'Você', icon: 'user' as IconName },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 text-[11px] text-ph-muted mb-1.5 last:mb-0"
            >
              <span className={TONE[item.tone].text}>
                <Icon name={item.icon} size={12} />
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {mapLoading && (
          <div
            className="absolute inset-0 z-[20] flex items-center justify-center text-center px-6"
            style={{
              background: 'linear-gradient(180deg, rgba(5,8,13,0.94), rgba(6,13,12,0.98))',
            }}
          >
            <div>
              <div className="flex justify-center mb-3">
                <IconOrb icon="map" tone="info" size="lg" />
              </div>

              <p className="text-[15px] font-extrabold text-ph-text">
                Carregando mapa PlayHub...
              </p>

              <p className="text-[12px] text-ph-muted mt-1">
                Buscando arenas e localização.
              </p>
            </div>
          </div>
        )}

        {mapError && (
          <div
            className="absolute left-4 right-4 top-24 z-[25] rounded-[22px] p-5 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(10,18,18,0.98), rgba(5,8,13,0.99))',
              border: '1px solid rgba(239,68,68,0.28)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            }}
          >
            <div className="flex justify-center mb-3">
              <IconOrb icon="info" tone="danger" size="lg" />
            </div>

            <p className="text-[15px] font-extrabold text-red-400">
              Mapa não carregou
            </p>

            <p className="text-[12px] text-ph-muted mt-1 leading-relaxed">
              {mapError}
            </p>
          </div>
        )}

        {visibleArenas.length === 0 && !mapLoading && (
          <div
            className="absolute left-4 right-4 top-24 rounded-[22px] p-6 text-center z-[12]"
            style={{
              background: 'linear-gradient(180deg, rgba(10,18,18,0.98), rgba(5,8,13,0.99))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            }}
          >
            <div className="flex justify-center mb-3">
              <IconOrb icon="empty" tone="info" size="lg" />
            </div>

            <p className="text-[15px] font-extrabold">
              {normalizedSearchQuery ? 'Nenhum pin encontrado' : 'Nenhuma arena encontrada'}
            </p>

            <p className="text-[12px] text-ph-muted mt-1">
              {normalizedSearchQuery ? 'Tente buscar pelo nome da arena, cidade ou modalidade.' : 'Ainda não há instituições cadastradas para este filtro.'}
            </p>
          </div>
        )}

        {!activeArena && !mapLoading && (
          <button
            type="button"
            onClick={handleCreateGame}
            className="absolute right-4 flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-extrabold text-white z-[15] transition-transform hover:scale-[1.03]"
            style={{
              bottom: '82px',
              background: 'linear-gradient(135deg,#7ED321,#00D1B2,#D7FF5E)',
              boxShadow: '0 10px 28px rgba(126,211,33,0.35)',
              border: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <Icon name="plus" size={16} />
            Criar Jogo
          </button>
        )}

        {activeArena && (
          <button
            type="button"
            className="absolute inset-0 z-[20]"
            style={{
              background:
                'linear-gradient(180deg, rgba(5,8,13,0.12), rgba(5,8,13,0.46))',
              backdropFilter: 'blur(1px)',
              WebkitBackdropFilter: 'blur(1px)',
            }}
            onClick={e => {
              e.stopPropagation()
              setActiveArena(null)
            }}
            aria-label="Fechar painel da arena"
          />
        )}

        {activeArena && (
          <div
            className="absolute inset-x-0 bottom-0 z-[30] px-4 pb-4 pt-16"
            style={{
              pointerEvents: 'auto',
            }}
          >
            <div
              className="mx-auto w-full max-w-sm max-h-[calc(100dvh-220px)] overflow-y-auto overscroll-contain rounded-[24px] p-[1px]"
              style={{
                background: `linear-gradient(135deg, ${TONE[activeArena.tone].border}, rgba(255,255,255,0.07), rgba(126,211,33,0.16))`,
                boxShadow: '0 18px 52px rgba(0,0,0,0.62)',
              }}
            >
              <div
                className="relative rounded-[23px] p-4"
                style={{
                  background: 'linear-gradient(180deg, rgba(10,18,18,0.99), rgba(5,8,13,0.99))',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveArena(null)}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-[12px] text-ph-muted hover:text-ph-text"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  aria-label="Fechar arena"
                >
                  <Icon name="close" size={16} />
                </button>

                <div className="flex items-start gap-3 mb-3 pr-8">
                  <IconOrb icon={activeArena.icon} tone={activeArena.tone} size="md" />

                  <div className="min-w-0">
                    <p className="text-[16px] font-extrabold leading-snug break-words">
                      {activeArena.name}
                    </p>

                    <p className="text-[12px] text-ph-muted mt-0.5 leading-relaxed">
                      {activeArena.subtitle}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <ToneBadge tone="info" icon="arena" label="Instituição esportiva" />

                      {activeArena.isPro && (
                        <ToneBadge tone="pending" icon="spark" label="Destaque PRO" />
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-[16px] p-3 mb-3"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <p className="flex items-center gap-1.5 text-[12px] text-ph-muted mb-2 leading-relaxed">
                    <span className="text-ph-blue flex-shrink-0">
                      <Icon name="location" size={13} />
                    </span>
                    <span>{activeArena.address} · {formatDistance(userLocation, activeArena)}</span>
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {getArenaSports(activeArena).map(sport => (
                      <span
                        key={sport.key}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[sport.tone].text}`}
                        style={{
                          background: TONE[sport.tone].bg,
                          border: `1px solid ${TONE[sport.tone].border}`,
                        }}
                      >
                        <Icon name={sport.icon} size={11} />
                        {sport.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <PopupStat icon="court" val={`${activeArena.courts}`} label="Quadras" tone="success" />
                  <PopupStat icon="games" val={getNextGameLabel(allGames, activeArena)} label="Próximo" tone="info" />
                  <PopupStat icon="star" val={`${activeArena.rating}`} label="Avaliação" tone="pending" />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div
                    className="rounded-[14px] p-3 text-center"
                    style={{
                      background: TONE.info.bg,
                      border: `1px solid ${TONE.info.border}`,
                    }}
                  >
                    <p className="text-[10px] text-ph-muted uppercase tracking-wider">
                      Jogos ativos
                    </p>

                    <p className="text-[18px] font-extrabold text-ph-blue mt-0.5">
                      {getArenaGamesCount(allGames, activeArena)}
                    </p>
                  </div>

                  <div
                    className="rounded-[14px] p-3 text-center"
                    style={{
                      background: TONE.success.bg,
                      border: `1px solid ${TONE.success.border}`,
                    }}
                  >
                    <p className="text-[10px] text-ph-muted uppercase tracking-wider">
                      Preço base
                    </p>

                    <p className="text-[18px] font-extrabold text-ph-green mt-0.5">
                      {activeArena.priceLabel}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenArena}
                    className="py-2.5 rounded-[13px] text-[12px] font-extrabold text-white inline-flex items-center justify-center gap-1.5"
                    style={{
                      background: 'linear-gradient(135deg,#00D1B2,#7ED321)',
                      boxShadow: '0 8px 22px rgba(29,161,242,0.24)',
                    }}
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCenterArena(activeArena)}
                    className="py-2.5 rounded-[13px] text-[12px] font-extrabold text-ph-muted bg-ph-dark2 inline-flex items-center justify-center gap-1"
                    style={{
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <Icon name="location" size={13} />
                    Focar
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenRoute}
                    className="py-2.5 rounded-[13px] text-[12px] font-extrabold text-ph-muted bg-ph-dark2 inline-flex items-center justify-center gap-1"
                    style={{
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <Icon name="route" size={13} />
                    Rota
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateGame}
                    className="py-2.5 rounded-[13px] text-[12px] font-extrabold text-ph-muted bg-ph-dark2 inline-flex items-center justify-center gap-1"
                    style={{
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <Icon name="plus" size={13} />
                    Criar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

