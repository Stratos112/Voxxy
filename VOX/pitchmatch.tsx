/**
 * Pitch matching page for Voxxy app
 * by @author Sky Vercauteren
 * August 2025
**/

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Image,
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { PitchDetector } from 'react-native-pitch-detector';
import TrackPlayer, { Event } from 'react-native-track-player';
import styles, { pitchBoxHeight, pitchBoxWidth } from './UI/styles';
import { Pitch, Pitches } from './API/pitch';
import { Grade } from './API/grade';
import { Profile } from './profile';

const MAX_TAIL = 120;
const TICK_SKIP = 2;
const GRID_MARGIN = 10;
const ROLLING_N = 8;
const ZOOM_ALPHA = 0.05;

const BANDS = [
  { min: 96, color: '#b8f0ff' }, // perfect — diamond (icy blue-white)
  { min: 90, color: '#00e676' }, // excellent — bright green
  { min: 82, color: '#2cf7ba' }, // great — mint
  { min: 72, color: '#7a8c5a' }, // good — pea soup green-grey
  { min: 60, color: '#5f7878' }, // average — steel grey, blue-green cast
  { min: 45, color: '#7a6858' }, // close — warm brown-grey
  { min: 0,  color: '#607080' }, // off — slate grey
];

function bandColor(score: number): string {
  for (const band of BANDS) {
    if (score >= band.min) return band.color;
  }
  return BANDS[BANDS.length - 1].color;
}

// hi → top=GRID_MARGIN, lo → top=pitchBoxHeight-1-GRID_MARGIN
function freqToY(freq: number, lo: number, hi: number): number {
  if (hi <= lo) return Math.round(pitchBoxHeight / 2);
  const clamped = Math.min(Math.max(freq, lo), hi);
  const norm = (Math.log(clamped) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return Math.round(GRID_MARGIN + (1 - norm) * (pitchBoxHeight - 1 - 2 * GRID_MARGIN));
}

interface PitchMatchScreenProps {
  onBack: () => void;
}

const PitchMatchScreen: React.FC<PitchMatchScreenProps> = ({ onBack }) => {
  const [userProfile, setUserProfile] = useState(new Profile());
  const [hz, setHz] = useState(0);
  const [note, setNote] = useState('');
  const [pitchLine, setPitchLine] = useState<Array<{freq: number, color: string}>>([]);
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [started, setStarted] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [targetPitch, setTargetPitch] = useState<Pitch | null>(null);
  const [displayLo, setDisplayLo] = useState(65.41);
  const [displayHi, setDisplayHi] = useState(1046.5);

  const targetAnimY = useRef(new Animated.Value(-100)).current;
  const tickRef = useRef(0);
  const targetPitchRef = useRef<Pitch | null>(null);
  const hasTargetRef = useRef(false);
  const displayLoRef = useRef(65.41);
  const displayHiRef = useRef(1046.5);
  const loRef = useRef(65.41);
  const hiRef = useRef(1046.5);
  const recentFreqsRef = useRef<number[]>([]);
  const animLo = useRef(new Animated.Value(65.41)).current;
  const animHi = useRef(new Animated.Value(1046.5)).current;

  useEffect(() => {
    const loadProfile = async () => {
      const user = new Profile();
      await user.RetreiveProfile();
      setUserProfile(user);
    };
    loadProfile();
  }, []);

  const lo = userProfile.low_range?.frequency ?? 65.41;
  const hi = userProfile.high_range?.frequency ?? 1046.5;
  loRef.current = lo;
  hiRef.current = hi;

  // Sync Animated range to user's full range when profile loads (not mid-game)
  useEffect(() => {
    if (!hasTargetRef.current) {
      animLo.setValue(lo);
      animHi.setValue(hi);
    }
  }, [lo, hi]);

  // Wire listeners once — they are the single source of truth for displayLo/Hi state and refs
  useEffect(() => {
    const subLo = animLo.addListener(({ value }) => {
      displayLoRef.current = value;
      setDisplayLo(value);
      // Keep target bar locked to its pitch as range shifts
      if (targetPitchRef.current) {
        targetAnimY.setValue(freqToY(targetPitchRef.current.frequency, value, displayHiRef.current) - 2);
      }
    });
    const subHi = animHi.addListener(({ value }) => {
      displayHiRef.current = value;
      setDisplayHi(value);
    });
    return () => {
      animLo.removeListener(subLo);
      animHi.removeListener(subHi);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    let subscription: any;
    try {
      PitchDetector.start();
      subscription = PitchDetector.addListener((value: { frequency: number; tone: string }) => {
        tickRef.current += 1;
        if (tickRef.current % TICK_SKIP !== 0) return;

        let color = '#ffffff';

        if (hasTargetRef.current && targetPitchRef.current && value.frequency > 0) {
          const score = Grade.grade(targetPitchRef.current.frequency, value.frequency);
          color = bandColor(score);

          // Rolling zoom: gently close in on target as user gets closer
          recentFreqsRef.current = [value.frequency, ...recentFreqsRef.current].slice(0, ROLLING_N);
          const avg = recentFreqsRef.current.reduce((a, b) => a + b, 0) / recentFreqsRef.current.length;

          const tf = targetPitchRef.current.frequency;
          // Hard floor/ceiling: never zoom past ±2 semitones from target
          const hardLo = tf * Math.pow(2, -2 / 12);
          const hardHi = tf * Math.pow(2,  2 / 12);

          // Desired range: encompass both user's rolling avg and the target, with breathing room
          const naturalLo = Math.min(avg, tf) * Math.pow(2, -0.5 / 12);
          const naturalHi = Math.max(avg, tf) * Math.pow(2,  0.5 / 12);
          const desiredLo = Math.max(hardLo, Math.min(naturalLo, loRef.current));
          const desiredHi = Math.min(hardHi, Math.max(naturalHi, hiRef.current));

          const newLo = displayLoRef.current + (desiredLo - displayLoRef.current) * ZOOM_ALPHA;
          const newHi = displayHiRef.current + (desiredHi - displayHiRef.current) * ZOOM_ALPHA;

          // setValue triggers listeners → updates refs, state, and targetAnimY
          animLo.setValue(newLo);
          animHi.setValue(newHi);
        }

        setPitchLine(prev => {
          const next = [{ freq: value.frequency, color }, ...prev];
          return next.length > MAX_TAIL ? next.slice(0, MAX_TAIL) : next;
        });
        setCurrentColor(color);
        setHz(value.frequency);
        setNote(value.tone);
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
  }, [started]);

  const userRange: Pitch[] = useMemo(() => {
    if (hi <= lo) return [];
    return Pitches.filteredPitches().filter(p => p.frequency >= lo && p.frequency <= hi);
  }, [userProfile]);

  // Grid re-renders as display range changes during zoom
  const pitchGrid = useMemo(() => {
    if (displayHi <= displayLo) return null;
    return Pitches.filteredPitches()
      .filter(p => p.frequency >= displayLo && p.frequency <= displayHi)
      .map(p => (
        <View
          key={p.name}
          style={[styles.pitchGrid, { top: freqToY(p.frequency, displayLo, displayHi) }]}
        />
      ));
  }, [displayLo, displayHi]);

  function newTarget() {
    if (userRange.length === 0) return;
    const pick = userRange[Math.floor(Math.random() * userRange.length)];

    hasTargetRef.current = false;
    setHasTarget(false);
    setBarVisible(false);
    recentFreqsRef.current = [];
    setPitchLine([]);

    // Ease the range back out to full, then slide the new target bar in
    Animated.parallel([
      Animated.timing(animLo, { toValue: loRef.current, duration: 500, useNativeDriver: false }),
      Animated.timing(animHi, { toValue: hiRef.current, duration: 500, useNativeDriver: false }),
    ]).start(() => {
      const finalY = freqToY(pick.frequency, loRef.current, hiRef.current) - 2;
      const startY = finalY < pitchBoxHeight / 2 ? pitchBoxHeight + 10 : -10;

      targetAnimY.stopAnimation();
      targetAnimY.setValue(startY);
      setStarted(true);
      setBarVisible(true);

      Animated.timing(targetAnimY, {
        toValue: finalY,
        duration: 600,
        useNativeDriver: false,
      }).start(() => {
        targetPitchRef.current = pick;
        setTargetPitch(pick);
        setHasTarget(true);
        Pitches.playSingle(pick);
        // Only open scoring after the note finishes playing
        const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
          hasTargetRef.current = true;
          sub.remove();
        });
      });
    });
  }

  const squareY = freqToY(hz, displayLo, displayHi) - 3;

  return (
    <SafeAreaView style={styles.pitchmatchContainer}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Image
          source={require('../static/back-arrow.png')}
          style={{ width: 20, height: 20, tintColor: '#ffffff' }}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', marginBottom: 0 }}>
        <Text style={[styles.titleText, { marginBottom: 2 }]}>Pitch Match</Text>
        <TouchableOpacity
          style={[styles.primaryButton, { width: '40%', height: '80%', margin: 2, marginLeft: 20, paddingVertical: 5 }]}
          onPress={newTarget}
        >
          <Text style={styles.backButtonText}>{started ? 'New Target' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pitchBox}>
        {pitchGrid}

        {barVisible && (
          <Animated.View style={[styles.targetLine, { top: targetAnimY }]} />
        )}

        {hasTarget && targetPitch && (
          <Text style={[styles.targetText, {
            top: Math.max(2, freqToY(targetPitch.frequency, displayLo, displayHi) - 22),
          }]}>
            {Pitches.displayName(targetPitch)}
          </Text>
        )}

        {started && hz > 0 && (
          <View style={[styles.pitchSquare, { top: squareY, backgroundColor: currentColor }]} />
        )}

        {started && pitchLine.map((item, index) => (
          <View
            key={index}
            style={[
              styles.pitchTail,
              {
                position: 'absolute',
                top: freqToY(item.freq, displayLo, displayHi) - 2,
                left: pitchBoxWidth / 2 - index - 12,
                backgroundColor: item.color,
                opacity: Math.max(0, 1 - index / (MAX_TAIL * 0.5)),
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.controls}>
        <Text style={styles.titleText}>
          {note ? `Pitch: ${Pitches.displayTone(note)}` : ''}
        </Text>
      </View>
      <View style={styles.controls}>
        <Text style={styles.titleText}>
          {hz > 0 ? hz.toFixed(1) : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default PitchMatchScreen;
