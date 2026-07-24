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
import styles, { pitchBoxHeight, pitchBoxWidth } from './UI/styles';
import { Pitch, Pitches } from './API/pitch';
import { Grade } from './API/grade';
import { Profile } from './profile';

const MAX_TAIL    = 200;
const TICK_SKIP   = 0.5;
const GRID_MARGIN = 10;
const ROLLING_N   = 8;
const ZOOM_ALPHA  = 0.28;
const DURATION_MS = 5000;
const BAR_LEFT    = 150;
const BAR_WIDTH   = pitchBoxWidth - 170;
const BAR_RIGHT   = BAR_LEFT + BAR_WIDTH;

// Horizontal lane the square travels across during scoring
const SCORE_X0 = pitchBoxWidth - BAR_RIGHT; // mirrors the bar's right-side gap
const SCORE_X1 = pitchBoxWidth - 10;

const BANDS = [
  { min: 99, color: '#b8f0ff' }, // perfect — diamond
  { min: 96, color: '#00e676' }, // excellent — bright green
  { min: 90, color: '#7a8c5a' }, // good — pea soup
  { min: 85, color: '#5f7878' }, // average — steel blue-green
  { min: 0,  color: '#607080' }, // off — slate grey
];

function bandColor(score: number): string {
  for (const band of BANDS) {
    if (score >= band.min) return band.color;
  }
  return BANDS[BANDS.length - 1].color;
}

// Bell-curve weighted pick — centre of range most likely, edges possible
function gaussianPick<T>(arr: T[]): T {
  const mid = (arr.length - 1) / 2;
  const sigma = arr.length / 4;
  const weights = arr.map((_, i) => Math.exp(-0.5 * ((i - mid) / sigma) ** 2));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
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
  const [userProfile, setUserProfile]   = useState(new Profile());
  const [hz, setHz]                     = useState(0);
  const [note, setNote]                 = useState('');
  const [pitchLine, setPitchLine]       = useState<Array<{top: number, left: number, color: string, born: number}>>([]);
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [started, setStarted]           = useState(false);
  const [hasTarget, setHasTarget]       = useState(false);
  const [barVisible, setBarVisible]     = useState(false);
  const [targetPitch, setTargetPitch]   = useState<Pitch | null>(null);
  const [displayLo, setDisplayLo]       = useState(65.41);
  const [displayHi, setDisplayHi]       = useState(1046.5);

  const targetAnimY        = useRef(new Animated.Value(-100)).current;
  const scoreX             = useRef(new Animated.Value(SCORE_X0)).current;
  const tickRef            = useRef(0);
  const targetPitchRef     = useRef<Pitch | null>(null);
  const hasTargetRef       = useRef(false);
  const displayLoRef       = useRef(65.41);
  const displayHiRef       = useRef(1046.5);
  const loRef              = useRef(65.41);
  const hiRef              = useRef(1046.5);
  const recentFreqsRef     = useRef<number[]>([]);
  const dotCounterRef      = useRef(0);
  const isZoomSettledRef   = useRef(false);
  const horizontalStartRef = useRef(false);
  const squareLeftRef      = useRef(SCORE_X0);
  const animLo             = useRef(new Animated.Value(65.41)).current;
  const animHi             = useRef(new Animated.Value(1046.5)).current;

  useEffect(() => {
    const loadProfile = async () => {
      const user = new Profile();
      await user.RetreiveProfile();
      setUserProfile(user);
    };
    loadProfile();
  }, []);

  const lo = userProfile.low_range?.frequency  ?? 65.41;
  const hi = userProfile.high_range?.frequency ?? 1046.5;
  loRef.current = lo;
  hiRef.current = hi;

  // Sync display range to full user range when profile loads (not mid-game)
  useEffect(() => {
    if (!hasTargetRef.current) {
      animLo.setValue(lo);
      animHi.setValue(hi);
    }
  }, [lo, hi]);

  // Wire all Animated listeners once
  useEffect(() => {
    const subLo = animLo.addListener(({ value }) => {
      displayLoRef.current = value;
      setDisplayLo(value);
    });
    const subHi = animHi.addListener(({ value }) => {
      displayHiRef.current = value;
      setDisplayHi(value);
      // Reposition target bar after BOTH lo and hi are updated
      if (targetPitchRef.current) {
        targetAnimY.setValue(freqToY(targetPitchRef.current.frequency, displayLoRef.current, value) - 2);
      }
    });
    const subScoreX = scoreX.addListener(({ value }) => {
      squareLeftRef.current = value;
    });
    return () => {
      animLo.removeListener(subLo);
      animHi.removeListener(subHi);
      scoreX.removeListener(subScoreX);
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

          // Zoom phase — only runs until settled
          if (!isZoomSettledRef.current) {
            recentFreqsRef.current = [value.frequency, ...recentFreqsRef.current].slice(0, ROLLING_N);
            const avg = recentFreqsRef.current.reduce((a, b) => a + b, 0) / recentFreqsRef.current.length;

            const tf = targetPitchRef.current.frequency;
            const hardLo   = tf * Math.pow(2, -2 / 12);
            const hardHi   = tf * Math.pow(2,  2 / 12);
            const naturalLo = Math.min(avg, tf) * Math.pow(2, -0.5 / 12);
            const naturalHi = Math.max(avg, tf) * Math.pow(2,  0.5 / 12);
            const desiredLo = Math.max(hardLo, Math.min(naturalLo, loRef.current));
            const desiredHi = Math.min(hardHi, Math.max(naturalHi, hiRef.current));

            const newLo = displayLoRef.current + (desiredLo - displayLoRef.current) * ZOOM_ALPHA;
            const newHi = displayHiRef.current + (desiredHi - displayHiRef.current) * ZOOM_ALPHA;

            const relChange = Math.abs(newLo - displayLoRef.current) / displayLoRef.current;
            if (relChange < 0.001) isZoomSettledRef.current = true;

            animLo.setValue(newLo);
            animHi.setValue(newHi);
          }

          // One-shot: start horizontal progress animation the moment zoom settles
          if (isZoomSettledRef.current && !horizontalStartRef.current) {
            horizontalStartRef.current = true;
            Animated.timing(scoreX, {
              toValue: SCORE_X1,
              duration: DURATION_MS,
              useNativeDriver: false,
            }).start();
          }
        }

        // Store dot — only while square is over the target bar
        if (isZoomSettledRef.current && squareLeftRef.current < BAR_RIGHT) {
          const top  = freqToY(value.frequency, displayLoRef.current, displayHiRef.current) - 2;
          const left = squareLeftRef.current;
          const born = dotCounterRef.current++;
          setPitchLine(prev => {
            const next = [{ top, left, color, born }, ...prev];
            return next.length > MAX_TAIL ? next.slice(0, MAX_TAIL) : next;
          });
        }

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
    const pick = gaussianPick(userRange);

    hasTargetRef.current     = false;
    isZoomSettledRef.current = false;
    horizontalStartRef.current = false;
    setHasTarget(false);
    setBarVisible(false);
    recentFreqsRef.current = [];
    setPitchLine([]);
    scoreX.stopAnimation();
    scoreX.setValue(SCORE_X0);

    // Ease range back to full, then slide the new target bar in
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
        // Open scoring after note's attack/body — don't wait for full decay tail
        setTimeout(() => { hasTargetRef.current = true; }, 1000);
      });
    });
  }

  const squareY  = freqToY(hz, displayLo, displayHi) - 3;
  const coverWidth = useMemo(() => scoreX.interpolate({
    inputRange: [BAR_LEFT, BAR_LEFT + BAR_WIDTH],
    outputRange: [0, BAR_WIDTH],
    extrapolate: 'clamp',
  }), []);

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
          <Animated.View style={[styles.targetLine, {
            top: targetAnimY,
            left: BAR_LEFT,
            width: BAR_WIDTH,
          }]} />
        )}

        {barVisible && (
          <Animated.View style={{
            position: 'absolute',
            top: targetAnimY,
            left: BAR_LEFT,
            height: 5,
            width: coverWidth,
            backgroundColor: 'black',
          }} />
        )}

        {hasTarget && targetPitch && (
          <Text style={[styles.targetText, {
            top: Math.max(2, freqToY(targetPitch.frequency, displayLo, displayHi) - 22),
            left: BAR_LEFT,
            width: BAR_WIDTH,
            textAlign: 'center',
          }]}>
            {Pitches.displayName(targetPitch)}
          </Text>
        )}

        {started && hz > 0 && (
          <Animated.View style={[styles.pitchSquare, {
            top: squareY,
            left: scoreX,
            backgroundColor: currentColor,
          }]} />
        )}

        {started && pitchLine.map(item => (
          <View
            key={item.born}
            style={[styles.pitchTail, {
              top: item.top,
              left: item.left,
              backgroundColor: item.color,
            }]}
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
