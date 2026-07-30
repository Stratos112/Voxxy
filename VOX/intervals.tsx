/**
 * Intervals game for Voxxy app
 * by @author Sky Vercauteren
 * August 2025
**/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, Text, Image, StatusBar, useWindowDimensions,
} from 'react-native';
import { Profile } from './profile';
import { Pitch, Pitches } from './API/pitch';
import Piano, { pitchToKey } from './UI/Piano';
import styles from './UI/styles';

interface IntervalScreenProps {
  onBack: () => void;
}

const ALL_SEMITONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SIDE_PAD = 48;

// White keys in octave order
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// Black keys: pos = how many white-key-widths from the octave left edge to this key's center
const BLACK_KEYS = [
  { name: 'C#', pos: 1 },
  { name: 'D#', pos: 2 },
  { name: 'F#', pos: 4 },
  { name: 'G#', pos: 5 },
  { name: 'A#', pos: 6 },
];

function octaveOf(p: Pitch): number {
  const m = p.name.match(/(\d+)$/);
  return m ? parseInt(m[1]) : 4;
}

function calcDisplayOctaves(rootOct: number, intervalOct: number, lW: number): number[] {
  const count = Math.max(2, Math.min(4, Math.floor(lW / 130)));
  const minOct = Math.min(rootOct, intervalOct);
  const maxOct = Math.max(rootOct, intervalOct);
  let start = minOct;
  if (maxOct - start >= count) start = rootOct;
  start = Math.max(1, Math.min(start, 7 - count + 1));
  return Array.from({ length: count }, (_, i) => start + i);
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
  const { width: W, height: H } = useWindowDimensions();
  const lW = Math.max(W, H);
  const lH = Math.min(W, H);
  const needsRotation = W < H;

  const lWRef = useRef(lW);
  useEffect(() => { lWRef.current = lW; }, [lW]);

  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [displayOctaves, setDisplayOctaves] = useState<number[]>([3, 4, 5]);

  const userLow = useRef<Pitch>(Pitches.C2);
  const userHigh = useRef<Pitch>(Pitches.C6);
  const filtered = useRef<Pitch[]>([]);
  const abortPlay = useRef<(() => void) | null>(null);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const init = async () => {
      await Pitches.setupPlayer();
      const profile = new Profile();
      await profile.RetreiveProfile();
      userLow.current = profile.low_range;
      userHigh.current = profile.high_range;
      filtered.current = Pitches.filteredPitches();
      setReady(true);
    };
    init();
    return () => {
      gapTimer.current && clearTimeout(gapTimer.current);
      abortPlay.current?.();
    };
  }, []);

  const playRound = useCallback(() => {
    gapTimer.current && clearTimeout(gapTimer.current);
    abortPlay.current?.();
    setPressedKeys([]);

    const root = pickRoot(filtered.current, userLow.current, userHigh.current);
    const interval = pickIntervalPitch(root, userLow.current, userHigh.current, filtered.current);
    if (!interval) return;

    const octaves = calcDisplayOctaves(octaveOf(root), octaveOf(interval), lWRef.current);
    setDisplayOctaves(octaves);
    setPhase('playing');
    setPressedKeys([pitchToKey(root)]);

    abortPlay.current = Pitches.playMono([root], undefined, () => {
      setPressedKeys([]);
      gapTimer.current = setTimeout(() => {
        abortPlay.current = Pitches.playMono([interval], undefined, () => {
          setPhase('guessing');
        });
      }, 350);
    });
  }, []);

  useEffect(() => { if (ready) playRound(); }, [ready]);

  // Called by overlay key cells — no coordinate math needed
  const handleNotePress = useCallback((noteName: string, octave: number) => {
    abortPlay.current?.();
    const pitch = filtered.current.find(p => p.name === `${noteName}${octave}`);
    if (!pitch) return;
    setPressedKeys([pitchToKey(pitch)]);
    abortPlay.current = Pitches.playMono([pitch], undefined, () => {
      setPressedKeys([]);
    });
  }, []);

  const handleBack = () => {
    gapTimer.current && clearTimeout(gapTimer.current);
    abortPlay.current?.();
    onBack();
  };

  // Invisible key cells overlay — rendered in the same coordinate space as the Piano,
  // so no screen-to-local conversion is needed. White cells first, black cells on top.
  const pianoWidth = lW - 2 * SIDE_PAD;
  const octW = pianoWidth / displayOctaves.length;
  const whiteW = octW / 7;
  const blackW = whiteW * 0.6;

  const keyOverlay = phase === 'guessing' ? (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="box-none"
    >
      {WHITE_KEYS.map((name, ki) =>
        displayOctaves.map((octave, oi) => (
          <TouchableOpacity
            key={`w-${name}-${octave}`}
            activeOpacity={0.2}
            style={{
              position: 'absolute',
              left: oi * octW + ki * whiteW,
              width: whiteW,
              top: 0,
              bottom: 0,
            }}
            onPress={() => handleNotePress(name, octave)}
          />
        ))
      )}
      {BLACK_KEYS.map(({ name, pos }) =>
        displayOctaves.map((octave, oi) => (
          <TouchableOpacity
            key={`b-${name}-${octave}`}
            activeOpacity={0.2}
            style={{
              position: 'absolute',
              left: oi * octW + pos * whiteW - blackW / 2,
              width: blackW,
              top: 0,
              height: '60%',
            }}
            onPress={() => handleNotePress(name, octave)}
          />
        ))
      )}
    </View>
  ) : null;

  const landscapeContent = (
    <View style={{ width: lW, height: lH, backgroundColor: '#282c2eff' }}>
      {/* Back button */}
      <TouchableOpacity
        onPress={handleBack}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 10,
          width: 36, height: 36, borderRadius: 6,
          backgroundColor: '#04756cff',
          justifyContent: 'center', alignItems: 'center',
          elevation: 8,
        }}
      >
        <Image
          source={require('../static/back-arrow.png')}
          style={{ width: 20, height: 20, tintColor: '#ffffff' }}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Piano + key overlay */}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SIDE_PAD }}>
        <View style={{ position: 'relative' }}>
          <Piano pressedKeys={pressedKeys} octaves={displayOctaves} />
          {keyOverlay}
        </View>
      </View>

      {/* Play Again */}
      {phase === 'guessing' && (
        <View style={{ alignItems: 'center', paddingBottom: 16 }}>
          <TouchableOpacity
            style={[styles.primaryButton, { width: 200 }]}
            onPress={playRound}
          >
            <Text style={styles.buttonText}>▶  Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (!needsRotation) {
    return (
      <View style={{ flex: 1, backgroundColor: '#282c2eff' }}>
        <StatusBar hidden />
        {landscapeContent}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#282c2eff' }}>
      <StatusBar hidden />
      <View
        style={{
          position: 'absolute',
          width: lW,
          height: lH,
          top: (H - lH) / 2,
          left: (W - lW) / 2,
          transform: [{ rotate: '-90deg' }],
        }}
      >
        {landscapeContent}
      </View>
    </View>
  );
};

export default IntervalScreen;
