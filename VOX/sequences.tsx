/**
 * Sequences page for Voxxy app
 * by @author Sky Vercauteren
 * August 2025
**/

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image, StatusBar, ScrollView, Animated, useWindowDimensions,
} from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { PitchDetector } from 'react-native-pitch-detector';
import { Pitch, Pitches } from './API/pitch';
import { Grade } from './API/grade';
import { Profile } from './profile';
import Piano, { pitchToKey } from './UI/Piano';
import styles from './UI/styles';
import TutorialModal from './UI/TutorialModal';

const TUTORIAL_LINES = [
  "Tap keys on the piano to record a sequence of notes — each tap plays the note and adds it to your list.",
  "Tap a note above the keyboard to remove it from your sequence.",
  "When you're happy with it, hit Continue — you'll sing the sequence back against staggered target bars, one second per note.",
];

interface SequenceScreenProps {
  onBack: () => void;
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = [
  { name: 'C#', pos: 1 }, { name: 'D#', pos: 2 },
  { name: 'F#', pos: 4 }, { name: 'G#', pos: 5 }, { name: 'A#', pos: 6 },
];
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

const INTERVAL_NAMES: Record<number, string> = {
  0: 'Unison', 1: 'Min 2nd', 2: 'Maj 2nd', 3: 'Min 3rd', 4: 'Maj 3rd',
  5: 'Perf 4th', 6: 'Tritone', 7: 'Perf 5th', 8: 'Min 6th',
  9: 'Maj 6th', 10: 'Min 7th', 11: 'Maj 7th', 12: 'Octave',
};
function intervalName(n: number): string {
  const abs = Math.abs(n);
  if (abs <= 12) return INTERVAL_NAMES[abs] ?? `${abs} st`;
  const octaves = Math.floor(abs / 12);
  const rem = abs % 12;
  if (rem === 0) return `${octaves} Octave${octaves > 1 ? 's' : ''}`;
  return `${INTERVAL_NAMES[rem] ?? `${rem} st`} + ${octaves} Octave${octaves > 1 ? 's' : ''}`;
}
function intervalArrow(diff: number): string {
  return diff > 0 ? '↑' : diff < 0 ? '↓' : '•';
}
function intervalColor(diff: number): string {
  return diff > 0 ? '#2bc0a0' : diff < 0 ? '#ff9944' : '#888888';
}

const CAB_MARGIN = 10;
const MIN_OCTAVE_W = 130;
// Cabinet asset proportions (1407 x 329 px source)
const CAB_ASPECT = 329 / 1407;
const CAB_KEY_LEFT = 109 / 1407;
const CAB_KEY_TOP = 100 / 329;
const CAB_KEYS_W = 1182 / 1407;

function octaveOf(p: Pitch): number {
  const m = p.name.match(/(\d+)$/);
  return m ? parseInt(m[1]) : 4;
}

function octaveRange(low: Pitch, high: Pitch): number[] {
  const lo = octaveOf(low);
  const hi = octaveOf(high);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

type Phase = 'record' | 'perform';

// --- Perform stage: sing the sequence back against staggered target bars ---
const PB_NOTE_MS = 1000;
const PB_GRID_MARGIN = 10;
const PB_MAX_TAIL = 200;
const PB_BANDS = [
  { min: 99, color: '#b8f0ff' },
  { min: 96, color: '#0f854c' },
  { min: 90, color: '#768808' },
  { min: 85, color: '#7f5011' },
  { min: 0,  color: '#571707' },
];
function pbBandColor(score: number): string {
  for (const band of PB_BANDS) {
    if (score >= band.min) return band.color;
  }
  return PB_BANDS[PB_BANDS.length - 1].color;
}
function pbScoreLabel(s: number): string {
  if (s >= 90) return 'STELLAR';
  if (s >= 75) return 'GREAT';
  if (s >= 55) return 'SOLID';
  if (s >= 40) return 'KEEP AT IT';
  return 'NEEDS WORK';
}
// hi -> top=margin, lo -> top=boxH-1-margin (log scale, like the other activities)
function pbFreqToY(freq: number, lo: number, hi: number, boxH: number): number {
  if (hi <= lo) return Math.round(boxH / 2);
  const clamped = Math.min(Math.max(freq, lo), hi);
  const norm = (Math.log(clamped) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return Math.round(PB_GRID_MARGIN + (1 - norm) * (boxH - 1 - 2 * PB_GRID_MARGIN));
}

const SequenceScreen: React.FC<SequenceScreenProps> = ({ onBack }) => {
  const { width: W, height: H } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>('record');
  const [sequence, setSequence] = useState<Pitch[]>([]);
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [displayOctaves, setDisplayOctaves] = useState<number[]>([3, 4]);
  const [playingBack, setPlayingBack] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const filtered = useRef<Pitch[]>([]);
  const abortPlay = useRef<(() => void) | null>(null);

  // --- Perform stage state ---
  const [pbRunning, setPbRunning] = useState(false);
  const [pbDone, setPbDone] = useState(false);
  const [pbHz, setPbHz] = useState(0);
  const [pbColor, setPbColor] = useState('#ffffff');
  const [pbPitchLine, setPbPitchLine] = useState<Array<{ top: number; left: number; color: string; born: number }>>([]);
  const [pbNoteScores, setPbNoteScores] = useState<number[]>([]);
  const [pbOverallScore, setPbOverallScore] = useState(0);
  const [pbActiveNoteIdx, setPbActiveNoteIdx] = useState(-1);

  const pbScoreX = useRef(new Animated.Value(0)).current;
  const pbSquareLeftRef = useRef(0);
  const pbStartTimeRef = useRef(0);
  const pbNoteSumsRef = useRef<number[]>([]);
  const pbNoteCountsRef = useRef<number[]>([]);
  const pbDotCounterRef = useRef(0);
  const pbActiveRef = useRef(false);

  useEffect(() => {
    Orientation.lockToLandscape();
    const init = async () => {
      await Pitches.setupPlayer();
      const profile = new Profile();
      await profile.RetreiveProfile();
      filtered.current = Pitches.filteredPitches();
      setDisplayOctaves(octaveRange(profile.low_range, profile.high_range));
    };
    init();
    return () => {
      Orientation.unlockAllOrientations();
      abortPlay.current?.();
      pbScoreX.stopAnimation();
    };
  }, []);

  useEffect(() => {
    const sub = pbScoreX.addListener(({ value }) => { pbSquareLeftRef.current = value; });
    return () => pbScoreX.removeListener(sub);
  }, []);

  const handleNotePress = useCallback((noteName: string, octave: number) => {
    abortPlay.current?.();
    const flat = SHARP_TO_FLAT[noteName] ?? noteName;
    const pitch = filtered.current.find(
      p => p.name === `${noteName}${octave}` || p.name === `${flat}${octave}`
    );
    if (!pitch) return;
    setPressedKeys([pitchToKey(pitch)]);
    setSequence(prev => [...prev, pitch]);
    abortPlay.current = Pitches.playMono([pitch], undefined, () => setPressedKeys([]));
  }, []);

  const removeNoteAt = useCallback((idx: number) => {
    setSequence(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const clearSequence = useCallback(() => {
    abortPlay.current?.();
    setPressedKeys([]);
    setSequence([]);
  }, []);

  const playBack = useCallback(() => {
    if (sequence.length === 0) return;
    abortPlay.current?.();
    setPlayingBack(true);
    abortPlay.current = Pitches.playMono(
      sequence,
      undefined,
      () => { setPlayingBack(false); setPressedKeys([]); },
      (_i, pitch) => setPressedKeys([pitchToKey(pitch)])
    );
  }, [sequence]);

  const handleContinue = () => {
    if (sequence.length === 0) return;
    abortPlay.current?.();
    setPressedKeys([]);
    setPbDone(false);
    setPbPitchLine([]);
    setPbNoteScores([]);
    setPbOverallScore(0);
    setPbActiveNoteIdx(-1);
    setPhase('perform');
  };

  const handleBackToEditing = () => {
    pbScoreX.stopAnimation();
    pbActiveRef.current = false;
    setPbRunning(false);
    setPhase('record');
  };

  const handleBack = () => {
    abortPlay.current?.();
    pbScoreX.stopAnimation();
    pbActiveRef.current = false;
    onBack();
  };

  // --- Perform stage: fixed range = sequence's lowest→highest note, +/- 2 semitones ---
  const pbRange = useMemo(() => {
    if (sequence.length === 0) return { lo: 65.41, hi: 1046.5 };
    const freqs = sequence.map(p => p.frequency);
    const minF = Math.min(...freqs);
    const maxF = Math.max(...freqs);
    return { lo: minF * Math.pow(2, -2 / 12), hi: maxF * Math.pow(2, 2 / 12) };
  }, [sequence]);

  const PB_BOX_W = W - CAB_MARGIN * 2;
  const PB_BOX_H = Math.max(120, Math.round(H * 0.5));
  const PB_BAR_LEFT = 14;
  const PB_BAR_RIGHT = PB_BOX_W - 14;
  const PB_BAR_WIDTH = PB_BAR_RIGHT - PB_BAR_LEFT;
  const pbTotalMs = sequence.length * PB_NOTE_MS;
  const pbSegW = sequence.length > 0 ? PB_BAR_WIDTH / sequence.length : PB_BAR_WIDTH;

  const pbTargetSegments = useMemo(() => sequence.map((p, i) => ({
    pitch: p,
    left: PB_BAR_LEFT + i * pbSegW,
    top: pbFreqToY(p.frequency, pbRange.lo, pbRange.hi, PB_BOX_H),
  })), [sequence, pbSegW, pbRange, PB_BOX_H]);

  const finishPerform = useCallback(() => {
    pbActiveRef.current = false;
    setPbRunning(false);
    setPbActiveNoteIdx(-1);
    const scores = pbNoteSumsRef.current.map((sum, i) => {
      const count = pbNoteCountsRef.current[i];
      return count > 0 ? Math.round(sum / count) : 0;
    });
    setPbNoteScores(scores);
    const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    setPbOverallScore(overall);
    setPbDone(true);
  }, []);

  const pbStart = useCallback(() => {
    if (sequence.length === 0 || pbRunning) return;
    pbNoteSumsRef.current = new Array(sequence.length).fill(0);
    pbNoteCountsRef.current = new Array(sequence.length).fill(0);
    pbDotCounterRef.current = 0;
    setPbPitchLine([]);
    setPbDone(false);
    setPbNoteScores([]);
    setPbOverallScore(0);
    setPbActiveNoteIdx(0);
    pbScoreX.setValue(PB_BAR_LEFT);
    pbSquareLeftRef.current = PB_BAR_LEFT;
    pbStartTimeRef.current = Date.now();
    pbActiveRef.current = true;
    setPbRunning(true);
    Animated.timing(pbScoreX, { toValue: PB_BAR_RIGHT, duration: pbTotalMs, useNativeDriver: false })
      .start(({ finished }) => { if (finished) finishPerform(); });
  }, [sequence, pbRunning, pbTotalMs, PB_BAR_LEFT, PB_BAR_RIGHT, finishPerform]);

  useEffect(() => {
    if (!pbRunning) return;
    let subscription: any;
    try {
      PitchDetector.start();
      subscription = PitchDetector.addListener((value: { frequency: number; tone: string }) => {
        if (!pbActiveRef.current) return;
        const elapsed = Date.now() - pbStartTimeRef.current;
        const noteIdx = Math.min(sequence.length - 1, Math.max(0, Math.floor(elapsed / PB_NOTE_MS)));
        const target = sequence[noteIdx];
        let color = '#ffffff';
        if (target && value.frequency > 0) {
          const score = Grade.grade(target.frequency, value.frequency);
          color = pbBandColor(score);
          pbNoteSumsRef.current[noteIdx] += score;
          pbNoteCountsRef.current[noteIdx] += 1;
        }
        setPbActiveNoteIdx(noteIdx);
        if (pbSquareLeftRef.current <= PB_BAR_RIGHT) {
          const top = pbFreqToY(value.frequency, pbRange.lo, pbRange.hi, PB_BOX_H) - 2;
          const left = pbSquareLeftRef.current;
          const born = pbDotCounterRef.current++;
          setPbPitchLine(prev => {
            const next = [{ top, left, color, born }, ...prev];
            return next.length > PB_MAX_TAIL ? next.slice(0, PB_MAX_TAIL) : next;
          });
        }
        setPbColor(color);
        setPbHz(value.frequency);
      });
    } catch (e) {
      console.error('Failed to start pitch detector:', e);
    }
    return () => {
      if (subscription) {
        PitchDetector.stop();
        PitchDetector.removeListener();
      }
    };
  }, [pbRunning, sequence, pbRange, PB_BAR_RIGHT, PB_BOX_H]);

  const pbActiveKey = pbActiveNoteIdx >= 0 && sequence[pbActiveNoteIdx] ? [pitchToKey(sequence[pbActiveNoteIdx])] : [];

  const numOctaves = Math.max(displayOctaves.length, 1);
  const availableW = W - CAB_MARGIN * 2;
  const neededPianoW = numOctaves * MIN_OCTAVE_W;
  const cabinetW = Math.max(availableW, neededPianoW / CAB_KEYS_W);
  const cabinetH = cabinetW * CAB_ASPECT;
  const pianoWidth = cabinetW * CAB_KEYS_W;
  const keyLeft = cabinetW * CAB_KEY_LEFT;
  const keyTop = cabinetH * CAB_KEY_TOP;
  const octaveW = pianoWidth / numOctaves;
  const whiteW = octaveW / 7;
  const blackW = whiteW * 0.6;

  const keyOverlay = phase === 'record' && !playingBack ? (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {WHITE_KEYS.map((name, ki) =>
        displayOctaves.map((octave, oi) => (
          <TouchableOpacity
            key={`w-${name}-${octave}`}
            activeOpacity={0.2}
            style={{ position: 'absolute', left: oi * octaveW + ki * whiteW, width: whiteW, top: 0, bottom: 0 }}
            onPress={() => handleNotePress(name, octave)}
          />
        ))
      )}
      {BLACK_KEYS.map(({ name, pos }) =>
        displayOctaves.map((octave, oi) => (
          <TouchableOpacity
            key={`b-${name}-${octave}`}
            activeOpacity={0.2}
            style={{ position: 'absolute', left: oi * octaveW + pos * whiteW - blackW / 2, width: blackW, top: 0, height: '60%' }}
            onPress={() => handleNotePress(name, octave)}
          />
        ))
      )}
    </View>
  ) : null;

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
      <TouchableOpacity
        onPress={handleBack}
        style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#04756cff', justifyContent: 'center', alignItems: 'center', elevation: 8 }}
      >
        <Image source={require('../static/back-arrow.png')} style={{ width: 20, height: 20, tintColor: '#ffffff' }} resizeMode="contain" />
      </TouchableOpacity>
      <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 10 }}>Sequences</Text>
      <TouchableOpacity
        onPress={() => setShowTutorial(true)}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#04756cff', justifyContent: 'center', alignItems: 'center', elevation: 8 }}
      >
        <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>?</Text>
      </TouchableOpacity>
    </View>
  );

  if (phase === 'perform') {
    return (
      <View style={styles.sequenceContainer}>
        <StatusBar hidden />
        {header}
        <TutorialModal visible={showTutorial} title="Sequences" lines={TUTORIAL_LINES} onClose={() => setShowTutorial(false)} />

        {/* Pitch box with staggered target bars */}
        <View style={{
          width: PB_BOX_W, height: PB_BOX_H, marginHorizontal: CAB_MARGIN,
          borderColor: '#84d3ebff', borderWidth: 1, backgroundColor: 'black', overflow: 'hidden', position: 'relative',
        }}>
          {pbTargetSegments.map((seg, i) => {
            const scoreForSeg = pbDone ? pbNoteScores[i] : undefined;
            const barColor = scoreForSeg !== undefined ? pbBandColor(scoreForSeg) : '#00d460ff';
            return (
              <React.Fragment key={`seg-${i}`}>
                <View style={{
                  position: 'absolute', left: seg.left, top: seg.top, width: pbSegW - 3, height: 4,
                  backgroundColor: barColor, opacity: pbActiveNoteIdx === i && pbRunning ? 1 : 0.75,
                }} />
                <Text
                  numberOfLines={1}
                  style={{
                    position: 'absolute', left: seg.left, width: pbSegW - 3, top: Math.max(2, seg.top - 16),
                    textAlign: 'center', color: barColor, fontSize: 10, fontWeight: '700',
                  }}
                >
                  {Pitches.displayName(seg.pitch)}
                </Text>
              </React.Fragment>
            );
          })}

          {/* Moving playhead */}
          {pbRunning && (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#ffffff50', left: pbScoreX }} />
          )}

          {/* Live pitch square */}
          {pbRunning && pbHz > 0 && (
            <Animated.View style={[styles.pitchSquare, { top: pbFreqToY(pbHz, pbRange.lo, pbRange.hi, PB_BOX_H) - 3, left: pbScoreX, backgroundColor: pbColor }]} />
          )}

          {/* Dot trail */}
          {pbPitchLine.map(item => (
            <View key={item.born} style={[styles.pitchTail, { top: item.top, left: item.left, backgroundColor: item.color }]} />
          ))}
        </View>

        {/* Mini cabinet + keyboard — highlights the note currently being scored */}
        <View style={{ marginTop: 8, marginHorizontal: CAB_MARGIN, position: 'relative', width: cabinetW, height: cabinetH }}>
          <Image source={require('../static/piano/cabinet.png')} style={{ width: cabinetW, height: cabinetH }} resizeMode="stretch" />
          <View style={{ position: 'absolute', left: keyLeft, top: keyTop, width: pianoWidth }}>
            <Piano pressedKeys={pbActiveKey} octaves={displayOctaves} />
          </View>
        </View>

        {/* Score */}
        <View style={{ alignItems: 'center', paddingTop: 6, minHeight: 44 }}>
          {pbDone ? (
            <>
              <Text style={{ fontSize: 30, fontWeight: '800', color: pbBandColor(pbOverallScore), letterSpacing: -1 }}>
                {pbOverallScore}%
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: pbBandColor(pbOverallScore), letterSpacing: 3, opacity: 0.85 }}>
                {pbScoreLabel(pbOverallScore)}
              </Text>
            </>
          ) : pbRunning ? (
            <Text style={{ fontSize: 12, color: '#ffffff60', fontWeight: '600' }}>Sing each note as the line reaches it…</Text>
          ) : null}
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 2, paddingHorizontal: CAB_MARGIN }}>
          <TouchableOpacity onPress={handleBackToEditing} style={{ backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: '#ff4444', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 }}>
            <Text style={{ color: '#ff4444', fontWeight: '700', fontSize: 14 }}>Back to Editing</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={pbRunning || playingBack} onPress={playBack} style={{ backgroundColor: '#04756cff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, opacity: pbRunning ? 0.4 : 1 }}>
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>▶ Hear Sequence</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={pbRunning} onPress={pbStart} style={{ backgroundColor: '#2cf7baff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, opacity: pbRunning ? 0.4 : 1 }}>
            <Text style={{ color: '#000000', fontWeight: '700', fontSize: 14 }}>{pbDone ? 'Try Again' : pbRunning ? 'Listening…' : 'Start'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sequenceContainer}>
      <StatusBar hidden />
      {header}
      <TutorialModal visible={showTutorial} title="Sequences" lines={TUTORIAL_LINES} onClose={() => setShowTutorial(false)} />

      {/* Recorded sequence — touchable, tap a note to remove it */}
      <View style={{
        marginHorizontal: CAB_MARGIN, marginBottom: 8, minHeight: 50,
        backgroundColor: '#0b1714', borderRadius: 8, borderWidth: 1, borderColor: '#2bc0a030',
        justifyContent: 'center', paddingVertical: 6,
      }}>
        <Text style={{ color: '#2bc0a055', fontSize: 8, letterSpacing: 2, fontWeight: '600', marginLeft: 12, marginBottom: 4 }}>
          YOUR SEQUENCE
        </Text>
        {sequence.length === 0 ? (
          <Text style={{ color: '#ffffff40', textAlign: 'center', fontSize: 13 }}>
            Tap keys below to add notes
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center' }}>
            {sequence.map((pitch, idx) => {
              const next = sequence[idx + 1];
              const diff = next ? next.id - pitch.id : 0;
              return (
                <React.Fragment key={`${pitch.name}-${idx}`}>
                  <TouchableOpacity
                    onPress={() => removeNoteAt(idx)}
                    style={{
                      backgroundColor: '#04756cff', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10,
                      marginHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                      {Pitches.displayName(pitch)}
                    </Text>
                  </TouchableOpacity>
                  {next && (
                    <View style={{ alignItems: 'center', marginHorizontal: 2, width: 60 }}>
                      <Text style={{ color: intervalColor(diff), fontSize: 13, fontWeight: '700' }}>
                        {intervalArrow(diff)}
                      </Text>
                      <Text style={{ color: intervalColor(diff), fontSize: 8, fontWeight: '600', opacity: 0.8, textAlign: 'center' }} numberOfLines={2}>
                        {intervalName(diff)}
                      </Text>
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Cabinet + keyboard */}
      <ScrollView horizontal showsHorizontalScrollIndicator={cabinetW > availableW} style={{ flexGrow: 0 }}>
        <View style={{ width: cabinetW, height: cabinetH, marginHorizontal: CAB_MARGIN, position: 'relative' }}>
          <Image
            source={require('../static/piano/cabinet.png')}
            style={{ width: cabinetW, height: cabinetH }}
            resizeMode="stretch"
          />
          <View style={{ position: 'absolute', left: keyLeft, top: keyTop, width: pianoWidth }}>
            <Piano pressedKeys={pressedKeys} octaves={displayOctaves} />
            {keyOverlay}
          </View>
        </View>
      </ScrollView>

      {/* Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 10, paddingHorizontal: CAB_MARGIN }}>
        <TouchableOpacity
          disabled={sequence.length === 0}
          onPress={clearSequence}
          style={{
            backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: '#ff4444', borderRadius: 8,
            paddingVertical: 10, paddingHorizontal: 20, opacity: sequence.length === 0 ? 0.4 : 1,
          }}
        >
          <Text style={{ color: '#ff4444', fontWeight: '700', fontSize: 14 }}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={sequence.length === 0 || playingBack}
          onPress={playBack}
          style={{
            backgroundColor: '#04756cff', borderRadius: 8,
            paddingVertical: 10, paddingHorizontal: 20, opacity: sequence.length === 0 ? 0.4 : 1,
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>▶ Play Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={sequence.length === 0}
          onPress={handleContinue}
          style={{
            backgroundColor: '#2cf7baff', borderRadius: 8,
            paddingVertical: 10, paddingHorizontal: 20, opacity: sequence.length === 0 ? 0.4 : 1,
          }}
        >
          <Text style={{ color: '#000000', fontWeight: '700', fontSize: 14 }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SequenceScreen;
