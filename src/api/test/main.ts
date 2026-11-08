import * as api from '..'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const val = (id: string) => $<HTMLInputElement | HTMLSelectElement>(id).value

const logEl = $('log')
function log(label: string, ok: boolean | null, detail: unknown = '') {
  const line = document.createElement('div')
  line.className = ok === null ? 'muted' : ok ? 'ok' : 'err'
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)
  line.textContent = `${new Date().toLocaleTimeString()}  ${ok === null ? '…' : ok ? '✔' : '✘'} ${label}${text ? `\n${text}` : ''}`
  logEl.prepend(line)
}

function showResult<T>(label: string, res: api.ApiResult<T>) {
  if (res.ok) log(`${label} → ${res.status}`, true, res.data)
  else log(`${label} → ${res.status}`, false, res.error)
  return res
}

function fill(sel: string, values: string[]) {
  $<HTMLSelectElement>(sel).innerHTML = values.map((v) => `<option>${v}</option>`).join('')
}

async function voice(label: string, run: () => Promise<string | null>) {
  log(label, null, 'requesting…')
  const t0 = performance.now()
  const caption = await run()
  const ms = Math.round(performance.now() - t0)
  $('caption').textContent = caption ?? '(no audio — failed or voice off)'
  log(`${label} (${ms} ms incl. playback)`, caption !== null, caption ?? 'returned null')
}

// ---------- load ids ----------
async function loadIds() {
  const [stops, creatures] = await Promise.all([api.getStops(), api.getCreatures()])
  if (stops.ok) {
    fill('stopSel', stops.data.map((s) => s.id))
    fill('narrStopSel', stops.data.map((s) => s.id))
  }
  if (creatures.ok) fill('creatureSel', creatures.data.map((c) => c.id))
}

// ---------- run all ----------
async function runAll() {
  const results: [string, boolean][] = []
  const check = (name: string, pass: boolean, detail?: unknown) => {
    results.push([name, pass])
    log(name, pass, detail ?? '')
  }

  check('checkHealth', await api.checkHealth())

  const stops = await api.getStops()
  check('getStops returns array', stops.ok && Array.isArray(stops.data) && stops.data.length > 0, stops.ok ? `${stops.data.length} stops` : stops.error)

  const firstStop = stops.ok ? stops.data[0]?.id : 'mock-a'
  const stop = await api.getStop(firstStop)
  check(`getStop(${firstStop})`, stop.ok && stop.data.id === firstStop)

  const badStop = await api.getStop('does-not-exist')
  check('getStop(unknown) → 404', !badStop.ok && badStop.status === 404, badStop.ok ? '' : badStop.error)

  const creatures = await api.getCreatures()
  check('getCreatures hides answerIndex', creatures.ok && creatures.data.every((c) => !c.question || !('answerIndex' in c.question)))

  const cid = creatures.ok ? creatures.data[0]?.id : 'mock-creature-a'
  const creature = await api.getCreature(cid)
  check(`getCreature(${cid})`, creature.ok && creature.data.id === cid)

  const answers = await Promise.all([0, 1, 2].map((i) => api.checkAnswer(cid, i)))
  const corrects = answers.filter((a) => a.ok && a.data.correct).length
  check('checkAnswer: exactly one of 0..2 correct', answers.every((a) => a.ok) && corrects === 1, `${corrects} correct`)

  const badAns = await api.checkAnswer(cid, 7)
  check('checkAnswer(7) → 400', !badAns.ok && badAns.status === 400, badAns.ok ? '' : badAns.error)

  const status = await api.getVoiceStatus(true)
  check('getVoiceStatus', typeof status.narration === 'boolean', status)

  const clip = await api.fetchNarration('welcome')
  check('fetchNarration(welcome) returns audio + caption', !!clip && clip.caption.length > 0, clip?.caption)
  if (clip) URL.revokeObjectURL(clip.url)

  const badNarr = await api.fetchNarration('arrival', 'does-not-exist')
  check('fetchNarration(arrival, unknown) → null', badNarr === null)

  const token = await api.fetchGuideToken()
  check('fetchGuideToken', !!token?.conversationToken || !!token?.signedUrl, token ? 'token received' : 'null')

  const passed = results.filter(([, p]) => p).length
  $('summary').textContent = `${passed}/${results.length} passed`
  $('summary').className = passed === results.length ? 'ok' : 'err'
}

// ---------- actions ----------
const leg = api.createLegTracker()
let guide: api.GuideSession | null = null

const actions: Record<string, () => unknown> = {
  health: async () => log('checkHealth', await api.checkHealth()),
  stops: async () => showResult('getStops', await api.getStops()),
  creatures: async () => showResult('getCreatures', await api.getCreatures()),
  stop: async () => showResult(`getStop(${val('stopSel')})`, await api.getStop(val('stopSel'))),
  creature: async () => showResult(`getCreature(${val('creatureSel')})`, await api.getCreature(val('creatureSel'))),
  answer: async () =>
    showResult(`checkAnswer(${val('creatureSel')}, ${val('answerSel')})`, await api.checkAnswer(val('creatureSel'), Number(val('answerSel')))),

  status: async () => log('getVoiceStatus', true, await api.getVoiceStatus(true)),
  stopVoice: () => api.stopVoice(),
  say: () => {
    const ev = val('eventSel') as api.NarrationEvent
    return voice(`say(${ev})`, () => api.say(ev, ev === 'welcome' ? undefined : val('narrStopSel')))
  },
  place: () => voice(`speakPlaceInfo(${val('placeSel')})`, () => api.speakPlaceInfo(val('placeText'), val('placeSel'))),
  orient: () => voice(`speakPlaceInfo(orient, ${val('placeSel')})`, () => api.speakPlaceInfo('orient me', val('placeSel'))),
  quizQ: () => voice(`speakQuizQuestion(${val('creatureSel')})`, () => api.speakQuizQuestion(val('creatureSel'))),
  quizR: () =>
    voice(`speakQuizReaction(${val('outcomeSel')})`, () =>
      api.speakQuizReaction(val('creatureSel'), val('outcomeSel') as api.QuizOutcome),
    ),
  legStart: () => {
    leg.startLeg(val('narrStopSel'), 200)
    log(`leg started → ${val('narrStopSel')} @ 200 m`, true)
  },
  leg150: () => {
    leg.update(150)
    log('leg.update(150) — should stay silent', true)
  },
  leg90: () => {
    leg.update(90)
    log('leg.update(90) — midpoint fires on first call only', true)
  },

  guideStart: async () => {
    if (guide) return log('guide already running', false)
    guide = await api.startGuide(val('guideTarget'), {
      onStatusChange: (s) => {
        $('guideStatus').textContent = s
        log(`guide status: ${s}`, s !== 'error')
        if (s === 'disconnected' || s === 'error') guide = null
      },
      onModeChange: (m) => ($('guideStatus').textContent = `connected · ${m}`),
      onMessage: ({ role, message }) => log(`guide ${role}`, null, message),
      onError: (e) => log('guide error', false, e),
    })
  },
  guideTarget: () => {
    guide?.setTarget(val('guideTarget'))
    log(`setTarget(${val('guideTarget')})`, !!guide)
  },
  guideSend: () => {
    guide?.sendText(val('guideText'))
    log(`sendText(${val('guideText')})`, !!guide)
  },
  guideEnd: async () => {
    await guide?.end()
    guide = null
  },
}

let unlocked = false
document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button')
  if (!btn) return
  if (!unlocked) {
    api.unlockAudio() // first tap unlocks audio
    unlocked = true
  }
  const act = btn.dataset.act
  if (act && actions[act]) void actions[act]()
})
$('runAll').addEventListener('click', () => void runAll())
$('clear').addEventListener('click', () => (logEl.innerHTML = ''))
$<HTMLInputElement>('mute').addEventListener('change', (e) => api.setVoiceMuted((e.target as HTMLInputElement).checked))

void loadIds()
