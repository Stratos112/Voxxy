/**
 * Intervals game for Voxxy app
 * by @author Sky Vercauteren
 * August 2025
**/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, Text, Image, StatusBar, useWindowDimensions,
} from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { Profile } from './profile';
import { Pitch, Pitches } from './API/pitch';
import Piano, { pitchToKey } from './UI/Piano';
import styles from './UI/styles';

interface IntervalScreenProps {
  onBack: () => void;
}

const ALL_SEMITONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const CAB_MARGIN = 6;
const CAB_KEY_LEFT = 109 / 1407;
const CAB_KEY_TOP = 100 / 329;

const INTERVAL_NAMES: Record<number, string> = {
  1: 'Minor 2nd', 2: 'Major 2nd', 3: 'Minor 3rd', 4: 'Major 3rd',
  5: 'Perfect 4th', 6: 'Tritone', 7: 'Perfect 5th', 8: 'Minor 6th',
  9: 'Major 6th', 10: 'Minor 7th', 11: 'Major 7th', 12: 'Octave',
};
function intervalName(n: number): string {
  return INTERVAL_NAMES[Math.abs(n)] ?? `${Math.abs(n)} st`;
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = [
  { name: 'C#', pos: 1 }, { name: 'D#', pos: 2 },
  { name: 'F#', pos: 4 }, { name: 'G#', pos: 5 }, { name: 'A#', pos: 6 },
];
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

function octaveOf(p: Pitch): number {
  const m = p.name.match(/(\d+)$/);
  return m ? parseInt(m[1]) : 4;
}

function calcDisplayOctaves(rootOct: number, _intervalOct: number): number[] {
  const start = Math.max(1, rootOct - 1);
  return [start, start + 1, start + 2];
}

function pickRoot(pitches: Pitch[], low: Pitch, high: Pitch): Pitch {
  const center = Pitches.centerPitch(high, low);
  const span = Math.max(1, high.id - low.id);
  const candidates = pitches.filter(p => p.id >= low.id && p.id <= high.id);
  const weights = candidates.map(p => {
    const norm = Math.abs(p.id - center.id) / (span / 2);
    return Math.exp(-2 * norm * norm);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[Math.floor(candidates.length / 2)];
}

function pickIntervalPitch(root: Pitch, low: Pitch, high: Pitch, pitches: Pitch[]): Pitch | null {
  const shuffled = [...ALL_SEMITONES].sort(() => Math.random() - 0.5);
  for (const semitones of shuffled) {
    const up = root.id + semitones;
    const dn = root.id - semitones;
    const canUp = up <= high.id && pitches.some(p => p.id === up);
    const canDn = dn >= low.id && pitches.some(p => p.id === dn);
    if (!canUp && !canDn) continue;
    const goUp = canUp && (!canDn || Math.random() > 0.5);
    return pitches.find(p => p.id === (goUp ? up : dn)) ?? null;
  }
  return null;
}

type Phase = 'idle' | 'playing' | 'guessing';

const IntervalScreen: React.FC<IntervalScreenProps> = ({ onBack }) => {
  const { width: W } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>('idle');
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [displayOctaves, setDisplayOctaves] = useState<number[]>([3, 4, 5]);
  const [guessKey, setGuessKey] = useState<string | null>(null);
  const [semitoneOff, setSemitoneOff] = useState<number | null>(null);
  const [guessedInterval, setGuessedInterval] = useState<number | null>(null);
  const [correctInterval, setCorrectInterval] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rootNoteName, setRootNoteName] = useState<string | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState(0);

  const userLow = useRef<Pitch>(Pitches.C2);
  const userHigh = useRef<Pitch>(Pitches.C6);
  const filtered = useRef<Pitch[]>([]);
  const abortPlay = useRef<(() => void) | null>(null);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootPitchRef = useRef<Pitch | null>(null);
  const intervalPitchRef = useRef<Pitch | null>(null);

  useEffect(() => {
    Orientation.lockToLandscape();
    const init = async () => {
      await Pitches.setupPlayer();
      const profile = new Profile();
      await profile.RetreiveProfile();
      userLow.current = profile.low_range;
      userHigh.current = profile.high_range;
      filtered.current = Pitches.filteredPitches();
    };
    init();
    return () => {
      Orientation.unlockAllOrientations();
      gapTimer.current && clearTimeout(gapTimer.current);
      abortPlay.current?.();
    };
  }, []);

  const playRound = useCallback(() => {
    gapTimer.current && clearTimeout(gapTimer.current);
    abortPlay.current?.();
    setPressedKeys([]);
    setGuessKey(null);
    setSemitoneOff(null);
    setGuessedInterval(null);
    setCorrectInterval(null);
    setRevealed(false);
    setWrongGuesses(0);

    const root = pickRoot(filtered.current, userLow.current, userHigh.current);
    const interval = pickIntervalPitch(root, userLow.current, userHigh.current, filtered.current);
    if (!interval) return;

    rootPitchRef.current = root;
    intervalPitchRef.current = interval;
    setRootNoteName(root.name.replace(/\d+$/, ''));
    setCorrectInterval(Math.abs(interval.id - root.id));

    const octaves = calcDisplayOctaves(octaveOf(root), octaveOf(interval));
    setDisplayOctaves(octaves);
    setPhase('playing');
    setPressedKeys([pitchToKey(root)]);

    abortPlay.current = Pitches.playMono([root], undefined, () => {
      gapTimer.current = setTimeout(() => {
        abortPlay.current = Pitches.playMono([interval], undefined, () => {
          setPressedKeys([pitchToKey(root)]);
          setPhase('guessing');
        });
      }, 350);
    });
  }, []);

  const handleNotePress = useCallback((noteName: string, octave: number) => {
    abortPlay.current?.();
    const flat = SHARP_TO_FLAT[noteName] ?? noteName;
    const pitch = filtered.current.find(
      p => p.name === `${noteName}${octave}` || p.name === `${flat}${octave}`
    );
    if (!pitch) return;
    const key = pitchToKey(pitch);
    const correct = intervalPitchRef.current;
    const root = rootPitchRef.current;
    const off = correct ? Math.abs(pitch.id - correct.id) : 99;
    setGuessKey(key);
    setSemitoneOff(off);
    setGuessedInterval(root ? Math.abs(pitch.id - root.id) : 0);
    if (off !== 0) setWrongGuesses(prev => Math.min(prev + 1, 3));
    const rootKey = root ? pitchToKey(root) : null;
    setPressedKeys(rootKey ? [rootKey, key] : [key]);
    abortPlay.current = Pitches.playMono([pitch], undefined, () => {
      setPressedKeys([]);
    });
  }, []);

  const handleHearAgain = useCallback(() => {
    gapTimer.current && clearTimeout(gapTimer.current);
    abortPlay.current?.();
    const root = rootPitchRef.current;
    const interval = intervalPitchRef.current;
    if (!root || !interval) return;
    setPressedKeys([pitchToKey(root)]);
    abortPlay.current = Pitches.playMono([root], undefined, () => {
      gapTimer.current = setTimeout(() => {
        abortPlay.current = Pitches.playMono([interval], undefined, () => {
          setPressedKeys([]);
        });
      }, 350);
    });
  }, []);

  const handleReveal = useCallback(() => {
    gapTimer.current && clearTimeout(gapTimer.current);
    abortPlay.current?.();
    const root = rootPitchRef.current;
    const interval = intervalPitchRef.current;
    if (!root || !interval) return;
    setRevealed(true);
    setPressedKeys([pitchToKey(root)]);
    abortPlay.current = Pitches.playMono([root], undefined, () => {
      gapTimer.current = setTimeout(() => {
        setPressedKeys([pitchToKey(root), pitchToKey(interval)]);
        abortPlay.current = Pitches.playMono([interval], undefined, () => {
          setPressedKeys([]);
        });
      }, 350);
    });
  }, []);

  const handleBack = () => {
    gapTimer.current && clearTimeout(gapTimer.current);
    abortPlay.current?.();
    onBack();
  };

  const cabinetW = W - 2 * CAB_MARGIN;
  const cabinetH = cabinetW * (329 / 1407);
  const pianoWidth = cabinetW * (1182 / 1407);
  const keyLeft = cabinetW * CAB_KEY_LEFT;
  const keyTop = cabinetH * CAB_KEY_TOP;
  const octW = pianoWidth / displayOctaves.length;
  const whiteW = octW / 7;
  const blackW = whiteW * 0.6;

  function keyPos(keyStr: string) {
    const m = keyStr.match(/^([A-G]#?)(\d+)$/);
    if (!m) return null;
    const oi = displayOctaves.indexOf(parseInt(m[2]));
    if (oi < 0) return null;
    const wIdx = WHITE_KEYS.indexOf(m[1]);
    if (wIdx >= 0) return { left: oi * octW + wIdx * whiteW, width: whiteW, isBlack: false };
    const bk = BLACK_KEYS.find(k => k.name === m[1]);
    if (bk) return { left: oi * octW + bk.pos * whiteW - blackW / 2, width: blackW, isBlack: true };
    return null;
  }

  const guessAccent = semitoneOff === 0 ? '#00e060' : semitoneOff === 1 ? '#ff9900' : '#ff3344';
  const guessAlpha = semitoneOff === 0 ? '#00e06060' : semitoneOff === 1 ? '#ff990060' : '#ff334460';

  function renderKeyHighlight(keyStr: string, color: string, label: string) {
    const pos = keyPos(keyStr);
    if (!pos) return null;
    const { left, width, isBlack } = pos;
    const sizeStyle = isBlack
      ? { top: 0, height: '60%' as any }
      : { top: 0, bottom: 0 };
    return (
      <View pointerEvents="none" key={`hl-${keyStr}-${label}`}>
        <View style={{ position: 'absolute', left, width, ...sizeStyle, backgroundColor: color }} />
        <View style={{
          position: 'absolute',
          left: left + width / 2 - 40,
          top: 6, width: 80,
          backgroundColor: color.slice(0, 7) + 'dd',
          borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2,
          alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700', letterSpacing: 0.3 }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>
    );
  }

  const keyOverlay = phase === 'guessing' && (guessKey === null || (semitoneOff !== 0 && wrongGuesses < 3)) ? (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {WHITE_KEYS.map((name, ki) =>
        displayOctaves.map((octave, oi) => (
          <TouchableOpacity
            key={`w-${name}-${octave}`}
            activeOpacity={0.2}
            style={{ position: 'absolute', left: oi * octW + ki * whiteW, width: whiteW, top: 0, bottom: 0 }}
            onPress={() => handleNotePress(name, octave)}
          />
        ))
      )}
      {BLACK_KEYS.map(({ name, pos }) =>
        displayOctaves.map((octave, oi) => (
          <TouchableOpacity
            key={`b-${name}-${octave}`}
            activeOpacity={0.2}
            style={{ position: 'absolute', left: oi * octW + pos * whiteW - blackW / 2, width: blackW, top: 0, height: '60%' }}
            onPress={() => handleNotePress(name, octave)}
          />
        ))
      )}
    </View>
  ) : null;

  const guessHighlight = guessKey
    ? renderKeyHighlight(guessKey, guessAlpha, guessedInterval !== null ? intervalName(guessedInterval) : '?')
    : null;

  const correctKey = intervalPitchRef.current ? pitchToKey(intervalPitchRef.current) : null;
  const revealHighlight = revealed && correctKey
    ? renderKeyHighlight(correctKey, '#00e06060', correctInterval !== null ? intervalName(correctInterval) : '?')
    : null;

  const guessNoteName = guessKey ? guessKey.replace(/\d+$/, '') : '—';

  return (
    <View style={{ flex: 1, backgroundColor: '#282c2eff' }}>
      <StatusBar hidden />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={handleBack}
          style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#04756cff', justifyContent: 'center', alignItems: 'center', elevation: 8 }}
        >
          <Image source={require('../static/back-arrow.png')} style={{ width: 20, height: 20, tintColor: '#ffffff' }} resizeMode="contain" />
        </TouchableOpacity>

        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          {(phase === 'idle' || phase === 'guessing') && (
            <TouchableOpacity style={[styles.primaryButton, { width: 150, marginVertical: 0 }]} onPress={playRound}>
              <Text style={styles.buttonText}>{phase === 'idle' ? '▶  Play' : '▶  Next'}</Text>
            </TouchableOpacity>
          )}
          {phase === 'guessing' && guessKey && wrongGuesses < 3 && (
            <TouchableOpacity
              style={[styles.primaryButton, { width: 140, marginVertical: 0, backgroundColor: '#2a1e00' }]}
              onPress={handleHearAgain}
            >
              <Text style={[styles.buttonText, { color: '#c4991e' }]}>♪  Hear Again</Text>
            </TouchableOpacity>
          )}
          {phase === 'guessing' && guessKey && !revealed && (
            <TouchableOpacity
              style={[styles.primaryButton, { width: 110, marginVertical: 0, backgroundColor: '#160e28' }]}
              onPress={handleReveal}
            >
              <Text style={[styles.buttonText, { color: '#9b7ee0' }]}>Reveal</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', width: 60, justifyContent: 'flex-end', marginRight: Math.round(W * 0.15) }}>
          {[0, 1, 2].map(i => {
            const isWrong = i < wrongGuesses;
            const isCorrect = i === wrongGuesses && semitoneOff === 0;
            return (
              <View key={i} style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: isCorrect ? '#00e060' : isWrong ? '#ff3344' : 'transparent',
                borderWidth: 1.5,
                borderColor: isCorrect ? '#00e06088' : '#ff334488',
              }} />
            );
          })}
        </View>
      </View>

      {/* Cabinet + Piano */}
      <View style={{ marginHorizontal: CAB_MARGIN, marginTop: 4 }}>
        <View style={{ position: 'relative', width: cabinetW, height: cabinetH }}>
          <Image
            source={require('../static/piano/cabinet.png')}
            style={{ width: cabinetW, height: cabinetH }}
            resizeMode="stretch"
          />
          <View style={{ position: 'absolute', left: keyLeft, top: keyTop, width: pianoWidth }}>
            <Piano pressedKeys={pressedKeys} octaves={displayOctaves} />
            {keyOverlay}
            {guessHighlight}
            {revealHighlight}
          </View>
        </View>
      </View>

      {/* Display panel */}
      <View style={{ flexDirection: 'row', marginHorizontal: CAB_MARGIN, paddingTop: 20, gap: 16 }}>
        <View style={{
          flex: 0.5, backgroundColor: '#0b1714', borderRadius: 8,
          borderWidth: 1, borderColor: '#2bc0a030',
          paddingVertical: 4, alignItems: 'center',
          marginLeft:70,
        }}>
          <Text style={{ color: '#2bc0a055', fontSize: 8, letterSpacing: 2, fontWeight: '600' }}>ROOT</Text>
          <Text style={{ color: '#2bc0a0', fontSize: 16, fontWeight: '700' }}>{rootNoteName ?? '—'}</Text>
        </View>

        <View style={{
          flex: 0.5, backgroundColor: '#0d1018', borderRadius: 8,
          borderWidth: 1, borderColor: guessKey ? guessAlpha : '#ffffff15',
          paddingVertical: 4, alignItems: 'center',
        }}>
          <Text style={{ color: '#ffffff44', fontSize: 8, letterSpacing: 2, fontWeight: '600' }}>YOUR NOTE</Text>
          <Text style={{ color: guessKey ? guessAccent : '#ffffff30', fontSize: 16, fontWeight: '700' }}>
            {guessNoteName}
          </Text>
        </View>

        <View style={{
          flex: 0.5, backgroundColor: '#120e06', borderRadius: 8,
          borderWidth: 1, borderColor: '#9e751435',
          paddingVertical: 4, paddingHorizontal: 25, alignItems: 'center',
          marginRight: 90, marginLeft:40,
        }}>
          <Text style={{ color: '#9e751455', fontSize: 8, letterSpacing: 2, fontWeight: '600' }}>SCORE</Text>
          <Text style={{ color: revealed ? '#c4991e' : '#9e751430', fontSize: 13, fontWeight: '700' }}>
            {revealed && correctInterval !== null ? intervalName(correctInterval) : '— — —'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default IntervalScreen;
