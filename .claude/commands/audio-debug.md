# audio-debug

Diagnose audio behavior problems in Voxxy without re-reading every file from scratch.

You already know the pipeline:
- **`VOX/API/pitch.tsx`** — `Pitch` class (load/play/retry), `Pitches` static registry (all notes A0–F7, `allPitches[]`, voice range classes, `increment`/`decrement`, `fqzToPosition`, `setRange`)
- **`VOX/API/grade.tsx`** — `Grade.grade(expected, current, bias)` scores a sung frequency 0–100 over ±3 semitones; bias `'sharp'`/`'flat'` gives 100 if the user overshoots in the allowed direction
- **`VOX/setrange.tsx`** — range determination flow; phases `idle → active → result → done`; plays expected pitch then listens for 3s; grades via `avgGrade = (grade + current) / 2`; `failCount >= 3` triggers pivot; `surrender()` also pivots
- **`VOX/pitchmatch.tsx`** — live pitch display; `fqzToPosition` maps frequency to pixel `top`; stores trailing positions in `pitchLine[]`; `userRange` slice of `allPitches` between profile low/high
- **`VOX/profile.tsx`** — persists `low_range`, `high_range`, `range_class`, `range_set` via AsyncStorage
- **`VOX/intervals.tsx`** / **`VOX/sequences.tsx`** — early-stage screens, minimal audio logic

## Known recurring issues (from git history)

- **Volume too hot / too quiet** — `Pitch` constructor calls `sound.setVolume(1)` but `Sound.setCategory('Playback')` is called inside the render body of `SetRangeScreen` (line 56), not in an effect — this re-runs on every render
- **Samples not playing** — `play()` has 5-retry logic with 1s delay; silent failure means `load()` returned before the sound was ready (async gap)
- **`avgGrade` stale closure** — `evaluate` captures `grade` and `failCount` from render time; `avgGrade` is computed as `(grade + current) / 2` which ignores history and resets each listener tick
- **`increment`/`decrement` skip enharmonics** — they skip by 2 indices when the adjacent pitch shares the same `.file` (e.g. As0 and Bb0 share `as0.mp3`), so natural navigation jumps a half-step

## How to use this skill

When the user describes an audio problem, map it to the pipeline above and check only the relevant file(s). Do NOT re-read files you already know unless the user says something has changed.

**Diagnose by symptom:**

| Symptom | Where to look |
|---|---|
| Sound too loud / too quiet | `setrange.tsx:56` (`Sound.setCategory` in render), `Pitch` constructor `setVolume(1)` |
| Sound doesn't play at all | `Pitch.play()` retry logic, `load()` timing, `Pitches.loadAll()` call in `setrange.tsx` effect |
| Grade always 0 or 100 | `Grade.grade()` bias logic, `avgGrade` formula in `setrange.tsx:187` |
| Range never advances | `failCount` stale closure in `evaluate`, `nextPitch` pivot conditions |
| Wrong note after increment/decrement | Enharmonic skip logic in `Pitches.increment/decrement` |
| Pitch display drifts or jitters | `fqzToPosition` log scale, `pitchLine` array length cap (500), position offset math |
| Profile not saving | `Profile.SaveProfile()` in `nextPitch` when `!increasing && pivot` |

If the symptom isn't listed, read only the most likely file — state the assumption before reading so the user can redirect.

## Response format

1. **Symptom** — restate what's wrong in one sentence
2. **Most likely cause** — file + line, no preamble
3. **Fix** — the minimal change; show a diff if it's under ~10 lines
4. **Side effects** — anything else this change could affect
