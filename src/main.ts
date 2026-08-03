import type { AddonValues, CanvasAddonMountContext, JsonValue } from '../generated/mywallpaper-runtime'
import './styles.css'

type MediaType = 'auto' | 'image' | 'video' | 'audio' | 'embed'
type ResourceValue = { kind: 'live'; url: string }

interface Settings {
  media: ResourceValue | null
  mediaType: MediaType
  autoplay: boolean
  loop: boolean
  muted: boolean
  volume: number
  playbackRate: number
  startAtSeconds: number
  showControls: boolean
  clickToToggle: boolean
  objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  objectPosition: string
  backgroundColor: string
  borderRadius: number
  opacity: number
  blur: number
  brightness: number
  contrast: number
  saturation: number
  hueRotate: number
  refreshInterval: number
  fallbackText: string
}

const defaults: Settings = {
  media: null,
  mediaType: 'auto',
  autoplay: true,
  loop: true,
  muted: true,
  volume: 80,
  playbackRate: 1,
  startAtSeconds: 0,
  showControls: false,
  clickToToggle: false,
  objectFit: 'contain',
  objectPosition: 'center',
  backgroundColor: '#00000000',
  borderRadius: 0,
  opacity: 100,
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hueRotate: 0,
  refreshInterval: 0,
  fallbackText: 'Media unavailable',
}

export function mount({ layer }: CanvasAddonMountContext): () => void {
  const root = document.createElement('main')
  root.className = 'media-viewer'
  layer.root.replaceChildren(root)

  let settings = readSettings(layer.settings.get())
  let refreshTimer = 0
  let resolutionGeneration = 0
  let disposed = false

  const showEmpty = (message: string): void => {
    const empty = document.createElement('div')
    const icon = document.createElement('span')
    const label = document.createElement('strong')
    empty.className = 'empty'
    icon.ariaHidden = 'true'
    icon.textContent = '▶'
    label.textContent = message
    empty.append(icon, label)
    root.replaceChildren(empty)
  }

  const applyMediaStyle = (element: HTMLElement): void => {
    element.classList.add('media')
    element.style.objectFit = settings.objectFit
    element.style.objectPosition = settings.objectPosition
    element.style.borderRadius = `${clamp(settings.borderRadius, 0, 200)}px`
    element.style.opacity = String(clamp(settings.opacity, 0, 100) / 100)
    element.style.filter = `blur(${clamp(settings.blur, 0, 50)}px) brightness(${clamp(settings.brightness, 0, 200)}%) contrast(${clamp(settings.contrast, 0, 200)}%) saturate(${clamp(settings.saturation, 0, 200)}%) hue-rotate(${clamp(settings.hueRotate, 0, 360)}deg)`
  }

  const configurePlayable = (element: HTMLMediaElement): void => {
    element.volume = clamp(settings.volume, 0, 100) / 100
    element.playbackRate = clamp(settings.playbackRate, 0.25, 2)
    if (settings.startAtSeconds > 0 && Number.isFinite(element.duration) && settings.startAtSeconds < element.duration) {
      element.currentTime = settings.startAtSeconds
    }
    if (settings.autoplay) void element.play().catch(() => undefined)
  }

  const addPlaybackToggle = (element: HTMLMediaElement, target: HTMLElement): void => {
    if (!settings.clickToToggle) return
    target.style.pointerEvents = 'auto'
    target.addEventListener('click', () => {
      if (element.paused) void element.play().catch(() => undefined)
      else element.pause()
    })
  }

  const renderResolved = (url: string): void => {
    if (disposed) return
    root.style.background = settings.backgroundColor
    root.style.borderRadius = `${clamp(settings.borderRadius, 0, 200)}px`
    const type = detectMediaType(url, settings.mediaType)

    if (type === 'image') {
      const image = document.createElement('img')
      image.alt = ''
      image.src = url
      image.addEventListener('error', () => showEmpty(settings.fallbackText), { once: true })
      applyMediaStyle(image)
      root.replaceChildren(image)
      return
    }

    if (type === 'video' || type === 'audio') {
      const media = document.createElement(type)
      media.src = url
      media.autoplay = settings.autoplay
      media.loop = settings.loop
      media.muted = settings.muted
      media.controls = settings.showControls
      media.preload = 'auto'
      if (media instanceof HTMLVideoElement) media.playsInline = true
      media.addEventListener('loadedmetadata', () => configurePlayable(media), { once: true })
      media.addEventListener('error', () => showEmpty(settings.fallbackText), { once: true })

      if (type === 'video') {
        applyMediaStyle(media)
        addPlaybackToggle(media, media)
        root.replaceChildren(media)
      } else {
        const card = document.createElement('section')
        const mark = document.createElement('span')
        card.className = 'audio-card'
        mark.className = 'audio-mark'
        mark.ariaHidden = 'true'
        mark.textContent = '♪'
        card.append(mark, media)
        applyMediaStyle(card)
        addPlaybackToggle(media, card)
        root.replaceChildren(card)
      }
      return
    }

    const embedUrl = buildEmbedUrl(url, settings)
    if (!embedUrl) {
      showEmpty('This URL is not a supported browser embed')
      return
    }
    const frame = document.createElement('iframe')
    frame.className = 'embed'
    frame.src = embedUrl
    frame.title = 'Embedded media'
    frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture'
    frame.allowFullscreen = true
    frame.referrerPolicy = 'strict-origin-when-cross-origin'
    applyMediaStyle(frame)
    root.replaceChildren(frame)
  }

  const resolveAndRender = (): void => {
    const generation = ++resolutionGeneration
    root.style.background = settings.backgroundColor
    if (!settings.media) {
      showEmpty('Choose a media resource')
      return
    }
    showEmpty('Loading media…')
    void layer.resources.resolve(settings.media).then((url) => {
      if (!disposed && generation === resolutionGeneration) renderResolved(url)
    }).catch(() => {
      if (!disposed && generation === resolutionGeneration) showEmpty(settings.fallbackText)
    })
  }

  const scheduleRefresh = (): void => {
    window.clearInterval(refreshTimer)
    refreshTimer = 0
    const minutes = clamp(settings.refreshInterval, 0, 1_440)
    if (minutes > 0) refreshTimer = window.setInterval(resolveAndRender, minutes * 60_000)
  }

  const unsubscribe = layer.settings.subscribe((values) => {
    settings = readSettings(values)
    scheduleRefresh()
    resolveAndRender()
  })

  scheduleRefresh()
  resolveAndRender()

  return () => {
    disposed = true
    resolutionGeneration += 1
    unsubscribe()
    window.clearInterval(refreshTimer)
    for (const media of root.querySelectorAll<HTMLMediaElement>('audio, video')) {
      media.pause()
      media.removeAttribute('src')
      media.load()
    }
    layer.root.replaceChildren()
  }
}

function readSettings(values: AddonValues): Settings {
  return {
    media: isResourceValue(values.media) ? values.media : null,
    mediaType: enumValue(values.mediaType, ['auto', 'image', 'video', 'audio', 'embed'], defaults.mediaType),
    autoplay: booleanValue(values.autoplay, defaults.autoplay),
    loop: booleanValue(values.loop, defaults.loop),
    muted: booleanValue(values.muted, defaults.muted),
    volume: numberValue(values.volume, defaults.volume),
    playbackRate: numberValue(values.playbackRate, defaults.playbackRate),
    startAtSeconds: numberValue(values.startAtSeconds, defaults.startAtSeconds),
    showControls: booleanValue(values.showControls, defaults.showControls),
    clickToToggle: booleanValue(values.clickToToggle, defaults.clickToToggle),
    objectFit: enumValue(values.objectFit, ['contain', 'cover', 'fill', 'none', 'scale-down'], defaults.objectFit),
    objectPosition: stringValue(values.objectPosition, defaults.objectPosition),
    backgroundColor: stringValue(values.backgroundColor, defaults.backgroundColor),
    borderRadius: numberValue(values.borderRadius, defaults.borderRadius),
    opacity: numberValue(values.opacity, defaults.opacity),
    blur: numberValue(values.blur, defaults.blur),
    brightness: numberValue(values.brightness, defaults.brightness),
    contrast: numberValue(values.contrast, defaults.contrast),
    saturation: numberValue(values.saturation, defaults.saturation),
    hueRotate: numberValue(values.hueRotate, defaults.hueRotate),
    refreshInterval: numberValue(values.refreshInterval, defaults.refreshInterval),
    fallbackText: stringValue(values.fallbackText, defaults.fallbackText),
  }
}

function isResourceValue(value: JsonValue | undefined): value is ResourceValue {
  return isRecord(value) && value.kind === 'live' && typeof value.url === 'string'
}

function detectMediaType(url: string, requested: MediaType): Exclude<MediaType, 'auto'> {
  if (requested !== 'auto') return requested
  if (buildEmbedUrl(url, defaults)) return 'embed'
  const clean = url.split(/[?#]/, 1)[0]?.toLowerCase() ?? ''
  if (/\.(?:mp4|webm|ogv|mov|m4v)$/.test(clean)) return 'video'
  if (/\.(?:mp3|wav|ogg|flac|aac|m4a|opus|weba)$/.test(clean)) return 'audio'
  return 'image'
}

function buildEmbedUrl(url: string, settings: Pick<Settings, 'autoplay' | 'loop' | 'muted'>): string | null {
  let parsed: URL
  try { parsed = new URL(url) } catch { return null }
  const host = parsed.hostname.replace(/^www\./, '')
  const params = new URLSearchParams({
    autoplay: settings.autoplay ? '1' : '0',
    loop: settings.loop ? '1' : '0',
    mute: settings.muted ? '1' : '0',
  })
  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const id = host === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop()
    if (!id) return null
    if (settings.loop) params.set('playlist', id)
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`
  }
  if (host.endsWith('vimeo.com')) {
    const id = parsed.pathname.split('/').filter(Boolean).pop()
    return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?${params}` : null
  }
  if (host.endsWith('dailymotion.com') || host === 'dai.ly') {
    const id = host === 'dai.ly' ? parsed.pathname.slice(1) : parsed.pathname.split('/').filter(Boolean).pop()
    return id ? `https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}?${params}` : null
  }
  if (host.endsWith('twitch.tv')) {
    const channel = parsed.pathname.split('/').filter(Boolean)[0]
    const parent = location.hostname || 'dev.mywallpaper.online'
    return channel ? `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}&autoplay=${settings.autoplay}` : null
  }
  return null
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function booleanValue(value: unknown, fallback: boolean): boolean { return typeof value === 'boolean' ? value : fallback }
function numberValue(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
function stringValue(value: unknown, fallback: string): string { return typeof value === 'string' ? value : fallback }
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
}
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}
