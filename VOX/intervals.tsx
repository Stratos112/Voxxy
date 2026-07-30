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
const SIDE_PAD = 48;

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
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

function calcDisplayOctaves(rootOct: number, intervalOct: number): number[] {
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
  const { width: W, height: H } = useWindowDimensions();

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
    Orientation.lockToLandscape();
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
      Orientation.unlockAllOrientations();
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

    const octaves = calcDisplayOctaves(octaveOf(root), octaveOf(interval));
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

  const KEY_BED_PAD = 10;
  const EXTRA_RIGHT = 16;
  const KEY_BED_BORDER = 6;
  const pianoWidth = W - 2 * SIDE_PAD - EXTRA_RIGHT - 2 * KEY_BED_PAD - 2 * KEY_BED_BORDER;
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

  return (
    <View style={{ flex: 1, backgroundColor: '#282c2eff' }}>
      <StatusBar hidden />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={handleBack}
          style={{
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

        <View style={{ flex: 1, alignItems: 'center' }}>
          {(phase === 'idle' || phase === 'guessing') && (
            <TouchableOpacity
              style={[styles.primaryButton, { width: 160, marginVertical: 0 }]}
              onPress={playRound}
            >
              <Text style={styles.buttonText}>
                {phase === 'idle' ? '▶  Play' : '▶  Play Again'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ width: 36 }} />
      </View>

      <View style={{ paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD + EXTRA_RIGHT, paddingTop: 8, paddingBottom: 28 }}>
        {/* Outer cabinet — dark ebony/rosewood shell */}
        <View style={{
          backgroundColor: '#130700',
          borderRadius: 14,
          borderWidth: 2,
          borderColor: '#5c2410',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 18 },
          shadowOpacity: 1,
          shadowRadius: 28,
          elevation: 36,
          overflow: 'hidden',
        }}>
          {/* Brass accent rail */}
          <View style={{ height: 7, backgroundColor: '#9e7514', borderBottomWidth: 1, borderBottomColor: '#6b4e0e' }} />

          {/* Fallboard / name plate area */}
          <View style={{
            backgroundColor: '#0b0401',
            paddingVertical: 7,
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#2e1408',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#9e7514',
              paddingHorizontal: 18,
              paddingVertical: 3,
            }}>
              <Text style={{ color: '#c4991e', fontSize: 10, letterSpacing: 7, fontWeight: '200' }}>◆  VOXXY  ◆</Text>
            </View>
          </View>

          {/* Shadow gap under fallboard */}
          <View style={{ height: 3, backgroundColor: '#040200' }} />

          {/* Key bed — recessed with thick side cheeks */}
          <View style={{
            backgroundColor: '#060300',
            paddingHorizontal: KEY_BED_PAD,
            paddingTop: 6,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderLeftColor: '#1e0c03',
            borderRightColor: '#1e0c03',
          }}>
            <View style={{ position: 'relative' }}>
              <Piano pressedKeys={pressedKeys} octaves={displayOctaves} />
              {keyOverlay}
            </View>
          </View>

          {/* Key slip — decorative bottom strip */}
          <View style={{
            height: 14,
            backgroundColor: '#130700',
            borderTopWidth: 2,
            borderTopColor: '#2e1408',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{ width: 40, height: 2, backgroundColor: '#9e7514', borderRadius: 1, opacity: 0.5 }} />
          </View>
        </View>
      </View>
    </View>
  );
};

export default IntervalScreen;
