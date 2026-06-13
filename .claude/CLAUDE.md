## RULES:
1.) Use minimal tokens, optimize tasks for efficient use of tokens. 
2.) Avoid reading large files, and if you do, compress the summary for context next time you need to read through. NOTE this does not apply to our active files, only to documentation, specs, node_modules or external resources. 
3.) Avoid comments in code unless absolutely necessary. IF you find comments that where already there, leave them in. 
4.) If you find yourself repeating a task for the third time, ask me about making it into a skill. 
5.) Think outside the box. Be creative. I like irregular suggestions and ideas.

---

## PROJECT: Voxxy
React Native (0.80.2 / React 19) vocal training app. Helps singers find their range and practice pitch matching. Author: Sky Vercauteren.

### Stack
- `react-native-sound` — audio playback (mp3 samples in MAIN_BUNDLE)
- `react-native-pitch-detector` — mic input → `{ frequency, tone }`
- `@react-native-async-storage/async-storage` — profile persistence
- No backend. No auth. Local-only.

### File map (`VOX/`)
| File | What it does |
|---|---|
| `API/pitch.tsx` | `Pitch` class + `Pitches` static registry (A0–F7, 114 entries). Handles load/play/retry, increment/decrement, fqzToPosition (log scale), voice range classification |
| `API/grade.tsx` | `Grade.grade(expected, current, bias)` → 0–100 over ±3 semitones. `bias='sharp'/'flat'` gives 100 if user overshoots in allowed direction |
| `profile.tsx` | `Profile` class. Stores `low_range`, `high_range`, `range_class`, `range_set` in AsyncStorage |
| `setrange.tsx` | Range determination. Phases: `idle→active→result→done`. Plays note, listens 3s, grades, increments/decrements. `failCount>=3` or `surrender()` pivots direction |
| `pitchmatch.tsx` | Live pitch display. Renders `pitchLine[]` trail (max 500 pts). `userRange` = allPitches slice between profile low/high |
| `intervals.tsx` | Stub screen — counter only, no audio yet |
| `sequences.tsx` | Piano key highlighting. `Piano` component, hardcoded `MELODY[]` test data |
| `UI/Piano.tsx` | Renders piano octaves, highlights `pressedKeys` prop |
| `UI/styles.tsx` | All shared styles + layout constants (`heightRange`, `pitchBoxHeight`, `pitchBoxWidth`) |

### Known bugs / watch out
- `Sound.setCategory('Playback')` is called in the **render body** of `setrange.tsx:56` — runs every render, should be in a `useEffect(()=>{}, [])` 
- `avgGrade` in `setrange.tsx` is `(grade + current) / 2` — not a real running average, resets each tick
- `evaluate` in `setrange.tsx` captures `failCount` and `grade` via closure — stale on re-render
- `Pitches.increment/decrement` skip by 2 when adjacent pitch shares the same `.file` (enharmonics like As0/Bb0) — intentional to stay on natural notes, but can surprise

### Skills
- `/audio-debug` — symptom-to-cause lookup for audio pipeline issues. Use before reading any audio file.