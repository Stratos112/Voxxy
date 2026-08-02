/**
 * Interval Singing - Voxxy
 * by @author Sky Vercauteren
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Animated, Dimensions, Image, StatusBar, Text, View, TouchableOpacity,
} from 'react-native';
import { PitchDetector } from 'react-native-pitch-detector';
import TrackPlayer, { Event } from 'react-native-track-player';
import Orientation from 'react-native-orientation-locker';
import styles, { pitchBoxWidth } from './UI/styles';
import { Pitch, Pitches } from './API/pitch';
import { Grade } from './API/grade';
import { Profile } from './profile';
import Piano, { pitchToKey } from './UI/Piano';

const { height: SCREEN_H } = Dimensions.get('window');

const IS_BOX_H      = Math.round(SCREEN_H * 0.54);
const GRID_MARGIN   = 10;
const ROLLING_N     = 8;
const ZOOM_ALPHA    = 0.28;
const CUMULATIVE_THRESHOLD = 150;
const MAX_DURATION_MS = 10000;
const BAND_WEIGHTS = [5, 4, 3, 2, 0];
const NUM_PARTICLES = 10;
const MAX_TAIL      = 200;
const SCORE_X0      = 10;
const BAR_LEFT      = 24;
const BAR_RIGHT     = pitchBoxWidth - 20;
const BAR_WIDTH     = BAR_RIGHT - BAR_LEFT;
const SCORE_X1      = BAR_RIGHT;

// Cabinet (1407 × 329 px asset)
const CAB_MARGIN = 10;
const CAB_W      = pitchBoxWidth;
const CAB_H      = Math.round(CAB_W * (329 / 1407));
const CAB_KEY_L  = Math.round(CAB_W * (109 / 1407));
const CAB_KEY_T  = Math.round(CAB_H * (100 / 329));
const CAB_KEYS_W = Math.round(CAB_W * (1182 / 1407));

const BANDS = [
  { min: 99, color: '#b8f0ff' },
  { min: 96, color: '#0f854c' },
  { min: 90, color: '#768808' },
  { min: 85, color: '#7f5011' },
  { min: 0,  color: '#571707' },
];
const INTERVAL_NAMES: Record<number, string> = {
  1: 'Min 2nd', 2: 'Maj 2nd',  3: 'Min 3rd',  4: 'Maj 3rd',
  5: 'Perf 4th', 6: 'Tritone', 7: 'Perf 5th', 8: 'Min 6th',
  9: 'Maj 6th', 10: 'Min 7th', 11: 'Maj 7th', 12: 'Octave',
};
const ALL_SEMITONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function timeLabel(ms: number): string {
  if (ms < 3000) return 'INSTANT';
  if (ms < 5000) return 'QUICK';
  if (ms < 7000) return 'SOLID';
  if (ms < 10000) return 'SLOW';
  return 'KEEP TRYING';
}
function timeColor(ms: number): string {
  if (ms < 3000) return '#b8f0ff';
  if (ms < 5000) return '#00e676';
  if (ms < 7000) return '#7a8c5a';
  if (ms < 10000) return '#5f7878';
  return '#607080';
}
function bandColor(score: number): string {
  for (const band of BANDS) {
    if (score >= band.min) return band.color;
  }
  return BANDS[BANDS.length - 1].color;
}
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
function freqToY(freq: number, lo: number, hi: number): number {
  if (hi <= lo) return Math.round(IS_BOX_H / 2);
  const clamped = Math.min(Math.max(freq, lo), hi);
  const norm = (Math.log(clamped) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return Math.round(GRID_MARGIN + (1 - norm) * (IS_BOX_H - 1 - 2 * GRID_MARGIN));
}
function octaveOf(p: Pitch): number {
  const m = p.name.match(/(\d+)$/);
  return m ? parseInt(m[1]) : 4;
}

interface IntervalSingingScreenProps {
  onBack: () => void;
}

const IntervalSingingScreen: React.FC<IntervalSingingScreenProps> = ({ onBack }) => {
  const [userProfile, setUserProfile]   = useState(new Profile());
  const [hz, setHz]                     = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  const liveSumRef   = useRef(0);
  const liveCountRef = useRef(0);
  const [pitchLine, setPitchLine]       = useState<Array<{ top: number; left: number; color: string; born: number }>>([]);
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [started, setStarted]           = useState(false);
  const [hasTarget, setHasTarget]       = useState(false);
  const [barVisible, setBarVisible]     = useState(false);
  const [rootBarVisible, setRootBarVisible] = useState(false);
  const [targetPitch, setTargetPitch]   = useState<Pitch | null>(null);
  const [rootPitch, setRootPitch]       = useState<Pitch | null>(null);
  const [intervalSemitones, setIntervalSemitones] = useState<number | null>(null);
  const [intervalDirection, setIntervalDirection] = useState<'up' | 'down' | null>(null);
  const [displayLo, setDisplayLo]       = useState(65.41);
  const [displayHi, setDisplayHi]       = useState(1046.5);

  const targetAnimY        = useRef(new Animated.Value(-100)).current;
  const rootAnimY          = useRef(new Animated.Value(-100)).current;
  const scoreX             = useRef(new Animated.Value(SCORE_X0)).current;
  const targetPitchRef     = useRef<Pitch | null>(null);
  const rootFreqRef        = useRef(0);
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
  const glowAnim           = useRef(new Animated.Value(0)).current;
  const scoreLandAnim      = useRef(new Animated.Value(1)).current;
  const lastPerfectFireRef = useRef(0);
  const timerIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef      = useRef<number>(0);
  const thresholdMetRef    = useRef(false);
  const cumulativeScoreRef = useRef(0);
  const scoringDotsRef     = useRef<Array<{ top: number; left: number; color: string; born: number }>>([]);
  const onScoringEndRef    = useRef<(elapsed?: number) => void>(() => {});
  const [animTail, setAnimTail] = useState<Array<{
    top: number; left: number; color: string; born: number;
    tx: Animated.Value; ty: Animated.Value; op: Animated.Value;
  }>>([]);
  const [boxFull, setBoxFull]         = useState(false);
  const [finalScore, setFinalScore]   = useState(0);
  const [timerMs, setTimerMs]         = useState(0);
  const particles = useRef(
    Array.from({ length: NUM_PARTICLES }, () => ({
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      op: new Animated.Value(0),
    }))
  ).current;
  const [perfectPos, setPerfectPos] = useState({ x: -100, y: -100 });

  useEffect(() => {
    Orientation.lockToPortrait();
    const init = async () => {
      await Pitches.setupPlayer();
      const profile = new Profile();
      await profile.RetreiveProfile();
      setUserProfile(profile);
    };
    init();
    return () => { Orientation.unlockAllOrientations(); };
  }, []);

  const lo = userProfile.low_range?.frequency  ?? 65.41;
  const hi = userProfile.high_range?.frequency ?? 1046.5;
  loRef.current = lo;
  hiRef.current = hi;

  useEffect(() => {
    if (!hasTargetRef.current) {
      animLo.setValue(lo);
      animHi.setValue(hi);
    }
  }, [lo, hi]);

  useEffect(() => {
    const subLo = animLo.addListener(({ value }) => {
      displayLoRef.current = value;
      setDisplayLo(value);
      if (rootFreqRef.current > 0) {
        rootAnimY.setValue(freqToY(rootFreqRef.current, value, displayHiRef.current) - 2);
      }
    });
    const subHi = animHi.addListener(({ value }) => {
      displayHiRef.current = value;
      setDisplayHi(value);
      if (targetPitchRef.current) {
        targetAnimY.setValue(freqToY(targetPitchRef.current.frequency, displayLoRef.current, value) - 2);
      }
      if (rootFreqRef.current > 0) {
        rootAnimY.setValue(freqToY(rootFreqRef.current, displayLoRef.current, value) - 2);
      }
    });
    const subScoreX = scoreX.addListener(({ value }) => { squareLeftRef.current = value; });
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
        let color = '#ffffff';

        if (hasTargetRef.current && targetPitchRef.current && value.frequency > 0) {
          const score = Grade.grade(targetPitchRef.current.frequency, value.frequency);
          color = bandColor(score);

          if (!isZoomSettledRef.current) {
            recentFreqsRef.current = [value.frequency, ...recentFreqsRef.current].slice(0, ROLLING_N);
            const avg = recentFreqsRef.current.reduce((a, b) => a + b, 0) / recentFreqsRef.current.length;
            const tf        = targetPitchRef.current.frequency;
            const hardLo    = tf * Math.pow(2, -2 / 12);
            const hardHi    = tf * Math.pow(2,  2 / 12);
            const naturalLo = Math.min(avg, tf) * Math.pow(2, -0.5 / 12);
            const naturalHi = Math.max(avg, tf) * Math.pow(2,  0.5 / 12);
            let desiredLo = Math.max(hardLo, Math.min(naturalLo, loRef.current));
            let desiredHi = Math.min(hardHi, Math.max(naturalHi, hiRef.current));
            const rootF = rootFreqRef.current;
            if (rootF > 0) {
              const rootMargin = Math.pow(2, 2 / 12);
              desiredLo = Math.min(desiredLo, rootF / rootMargin);
              desiredHi = Math.max(desiredHi, rootF * rootMargin);
            }
            const newLo = displayLoRef.current + (desiredLo - displayLoRef.current) * ZOOM_ALPHA;
            const newHi = displayHiRef.current + (desiredHi - displayHiRef.current) * ZOOM_ALPHA;
            if (Math.abs(newLo - displayLoRef.current) / displayLoRef.current < 0.001) {
              isZoomSettledRef.current = true;
            }
            animLo.setValue(newLo);
            animHi.setValue(newHi);
          }

          const nowMs = Date.now();
          if (score >= 99 && isZoomSettledRef.current && nowMs - lastPerfectFireRef.current > 700) {
            lastPerfectFireRef.current = nowMs;
            const cx = squareLeftRef.current;
            const cy = freqToY(value.frequency, displayLoRef.current, displayHiRef.current);
            setPerfectPos({ x: cx, y: cy });
            glowAnim.setValue(0.18);
            Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start();
            particles.forEach((p, i) => {
              const angle = (i / NUM_PARTICLES) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
              const dist  = 30 + Math.random() * 50;
              p.tx.setValue(0); p.ty.setValue(0); p.op.setValue(1);
              Animated.parallel([
                Animated.timing(p.tx, { toValue: Math.cos(angle) * dist, duration: 650, useNativeDriver: true }),
                Animated.timing(p.ty, { toValue: Math.sin(angle) * dist, duration: 650, useNativeDriver: true }),
                Animated.timing(p.op, { toValue: 0,                      duration: 650, useNativeDriver: true }),
              ]).start();
            });
          }

          if (isZoomSettledRef.current && !horizontalStartRef.current) {
            horizontalStartRef.current = true;
            timerStartRef.current = Date.now();
            timerIntervalRef.current = setInterval(() => {
              setTimerMs(Date.now() - timerStartRef.current);
            }, 100);
            Animated.timing(scoreX, { toValue: SCORE_X1, duration: MAX_DURATION_MS, useNativeDriver: false })
              .start(() => { onScoringEndRef.current(); });
          }

          if (isZoomSettledRef.current && !thresholdMetRef.current) {
            const bandIdx = BANDS.findIndex(b => score >= b.min);
            cumulativeScoreRef.current += bandIdx >= 0 ? BAND_WEIGHTS[bandIdx] : 0;
            if (cumulativeScoreRef.current >= CUMULATIVE_THRESHOLD) {
              thresholdMetRef.current = true;
              scoreX.stopAnimation();
              timerIntervalRef.current && clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
              const elapsed = Date.now() - timerStartRef.current;
              setTimerMs(elapsed);
              onScoringEndRef.current(elapsed);
            }
          }
        }

        if (isZoomSettledRef.current && squareLeftRef.current < BAR_RIGHT) {
          const top  = freqToY(value.frequency, displayLoRef.current, displayHiRef.current) - 2;
          const left = squareLeftRef.current;
          const born = dotCounterRef.current++;
          const dot  = { top, left, color, born };
          scoringDotsRef.current = [dot, ...scoringDotsRef.current].slice(0, MAX_TAIL);
          setPitchLine(prev => {
            const next = [dot, ...prev];
            return next.length > MAX_TAIL ? next.slice(0, MAX_TAIL) : next;
          });
          if (hasTargetRef.current && targetPitchRef.current && value.frequency > 0) {
            const rawScore = Grade.grade(targetPitchRef.current.frequency, value.frequency);
            liveSumRef.current   += rawScore;
            liveCountRef.current += 1;
            setLiveAccuracy(Math.round(liveSumRef.current / liveCountRef.current));
          }
        }

        setCurrentColor(color);
        setHz(value.frequency);
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
        <View key={p.name} style={[styles.pitchGrid, { top: freqToY(p.frequency, displayLo, displayHi) }]} />
      ));
  }, [displayLo, displayHi]);

  onScoringEndRef.current = (elapsed?: number) => {
    const dots = scoringDotsRef.current;
    if (dots.length === 0 && elapsed === undefined) return;
    const ms = elapsed ?? (Date.now() - timerStartRef.current);
    setFinalScore(ms);
    setBoxFull(true);
    scoreLandAnim.setValue(1);
    Animated.sequence([
      Animated.timing(scoreLandAnim, { toValue: 1.25, duration: 140, useNativeDriver: true }),
      Animated.timing(scoreLandAnim, { toValue: 1.0,  duration: 220, useNativeDriver: true }),
    ]).start();
    const items = dots.map(dot => ({
      ...dot,
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      op: new Animated.Value(1),
    }));
    setAnimTail(items);
    setPitchLine([]);
    Animated.stagger(3, items.map(item =>
      Animated.timing(item.op, { toValue: 0, duration: 400, useNativeDriver: true })
    )).start(() => setAnimTail([]));
  };

  function newTarget() {
    if (userRange.length === 0) return;
    const root = gaussianPick(userRange);

    const shuffled = [...ALL_SEMITONES].sort(() => Math.random() - 0.5);
    let target: Pitch | null = null;
    let semitones = 0;
    for (const st of shuffled) {
      const upPitch = userRange.find(p => p.id === root.id + st);
      const dnPitch = userRange.find(p => p.id === root.id - st);
      if (upPitch || dnPitch) {
        target = upPitch && (!dnPitch || Math.random() > 0.5) ? upPitch : dnPitch!;
        semitones = st;
        break;
      }
    }
    if (!target) return;

    // Reset
    hasTargetRef.current       = false;
    isZoomSettledRef.current   = false;
    horizontalStartRef.current = false;
    lastPerfectFireRef.current = 0;
    thresholdMetRef.current    = false;
    cumulativeScoreRef.current = 0;
    scoringDotsRef.current     = [];
    rootFreqRef.current        = 0;
    timerIntervalRef.current && clearInterval(timerIntervalRef.current);
    timerIntervalRef.current   = null;
    setTargetPitch(null);
    setHasTarget(false);
    setBarVisible(false);
    setRootBarVisible(false);
    setIntervalDirection(null);
    setAnimTail([]);
    setBoxFull(false);
    setFinalScore(0);
    setTimerMs(0);
    setLiveAccuracy(0);
    liveSumRef.current   = 0;
    liveCountRef.current = 0;
    scoreLandAnim.setValue(1);
    recentFreqsRef.current = [];
    setPitchLine([]);
    scoreX.stopAnimation();
    scoreX.setValue(SCORE_X0);
    targetPitchRef.current = null;

    // Reveal root + interval info immediately
    setRootPitch(root);
    setIntervalSemitones(semitones);
    setIntervalDirection(target.id > root.id ? 'up' : 'down');

    // Show root reference line and play root
    Animated.parallel([
      Animated.timing(animLo, { toValue: loRef.current, duration: 300, useNativeDriver: false }),
      Animated.timing(animHi, { toValue: hiRef.current, duration: 300, useNativeDriver: false }),
    ]).start(() => {
      rootFreqRef.current = root.frequency;
      rootAnimY.setValue(freqToY(root.frequency, loRef.current, hiRef.current) - 2);
      setRootBarVisible(true);

      Pitches.playSingle(root);
      const rootSub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
        rootSub.remove();

        // Enter listening phase — target does NOT play
        const finalY = freqToY(target!.frequency, loRef.current, hiRef.current) - 2;
        const startY = finalY < IS_BOX_H / 2 ? IS_BOX_H + 10 : -10;
        targetAnimY.stopAnimation();
        targetAnimY.setValue(startY);
        setStarted(true);
        setBarVisible(true);

        Animated.timing(targetAnimY, { toValue: finalY, duration: 600, useNativeDriver: false }).start(() => {
          targetPitchRef.current = target!;
          setTargetPitch(target!);
          setHasTarget(true);
          hasTargetRef.current = true;
        });
      });
    });
  }

  const squareY    = freqToY(hz, displayLo, displayHi) - 3;
  const coverWidth = useMemo(() => scoreX.interpolate({
    inputRange:  [BAR_LEFT, BAR_RIGHT],
    outputRange: [0, BAR_WIDTH],
    extrapolate: 'clamp',
  }), []);

  const pianoOctaves = useMemo(() => {
    if (!rootPitch) return [3, 4];
    const rOct  = octaveOf(rootPitch);
    const tOct  = targetPitch ? octaveOf(targetPitch) : rOct;
    const minOct = Math.min(rOct, tOct);
    const maxOct = Math.max(minOct + 1, Math.max(rOct, tOct));
    return Array.from({ length: maxOct - minOct + 1 }, (_, i) => minOct + i);
  }, [rootPitch, targetPitch]);

  // Root key shows while root is playing; target key added when listening phase starts
  const pianoPressedKeys = useMemo(() => {
    const keys: string[] = [];
    if (rootPitch)  keys.push(pitchToKey(rootPitch));
    if (targetPitch) keys.push(pitchToKey(targetPitch));
    return keys;
  }, [rootPitch, targetPitch]);

  const safeTop = (StatusBar.currentHeight ?? 24) + 10;

  return (
    <View style={styles.pitchmatchContainer}>

      {/* Compact header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: safeTop, paddingBottom: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#04756cff', justifyContent: 'center', alignItems: 'center', elevation: 8 }}
        >
          <Image source={require('../static/back-arrow.png')} style={{ width: 20, height: 20, tintColor: '#ffffff' }} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 10 }}>Interval Singing</Text>
        <TouchableOpacity
          style={[styles.primaryButton, { width: 100, marginVertical: 0, paddingVertical: 8 }]}
          onPress={newTarget}
        >
          <Text style={styles.backButtonText}>{started ? 'Next' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      {/* Pitch box — 2/3 of screen height */}
      <View style={{
        width: pitchBoxWidth,
        height: IS_BOX_H,
        marginHorizontal: 10,
        borderColor: '#84d3ebff',
        borderWidth: 1,
        backgroundColor: 'black',
        overflow: 'hidden',
      }}>
        {pitchGrid}

        {/* Root reference line (blue) */}
        {rootBarVisible && (
          <Animated.View style={{
            position: 'absolute',
            top: rootAnimY,
            left: BAR_LEFT,
            width: BAR_WIDTH,
            height: 3,
            backgroundColor: '#5a9fd4',
            opacity: 0.65,
          }} />
        )}

        {/* Target line (green) */}
        {barVisible && (
          <Animated.View style={[styles.targetLine, { top: targetAnimY, left: BAR_LEFT, width: BAR_WIDTH }]} />
        )}
        {barVisible && (
          <Animated.View style={{
            position: 'absolute', top: targetAnimY, left: BAR_LEFT,
            height: 5, width: coverWidth, backgroundColor: 'black',
          }} />
        )}

        {/* Root label */}
        {rootBarVisible && rootPitch && (
          <Text style={{
            position: 'absolute',
            top: Math.max(2, freqToY(rootPitch.frequency, displayLo, displayHi) - 18),
            left: BAR_LEFT,
            width: BAR_WIDTH,
            textAlign: 'center',
            color: '#5a9fd4',
            fontSize: 10,
            fontWeight: '600',
            opacity: 0.85,
          }}>
            {Pitches.displayName(rootPitch)}
          </Text>
        )}

        {/* Target label */}
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

        {/* Pitch square */}
        {started && hz > 0 && (
          <Animated.View style={[styles.pitchSquare, { top: squareY, left: scoreX, backgroundColor: currentColor }]} />
        )}

        {/* Dot trail */}
        {started && pitchLine.map(item => (
          <View key={item.born} style={[styles.pitchTail, { top: item.top, left: item.left, backgroundColor: item.color }]} />
        ))}

        {/* Animated tail (fade out on score) */}
        {animTail.map(item => (
          <Animated.View
            key={`at${item.born}`}
            pointerEvents="none"
            style={{
              position: 'absolute', width: 5, height: 5,
              top: item.top, left: item.left,
              backgroundColor: item.color, opacity: item.op,
              transform: [{ translateX: item.tx }, { translateY: item.ty }],
            }}
          />
        ))}

        {/* Perfect-hit glow */}
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#b8f0ff', opacity: glowAnim }}
        />

        {/* Particles */}
        {particles.map((p, i) => (
          <Animated.View
            key={`p${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute', width: 4, height: 4, borderRadius: 2,
              backgroundColor: '#b8f0ff',
              top: perfectPos.y - 2, left: perfectPos.x - 2,
              opacity: p.op,
              transform: [{ translateX: p.tx }, { translateY: p.ty }],
            }}
          />
        ))}
      </View>

      {/* Mini keyboard + cabinet */}
      <View style={{ marginTop: 6, marginLeft: CAB_MARGIN }}>
        <View style={{ position: 'relative', width: CAB_W, height: CAB_H }}>
          <Image
            source={require('../static/piano/cabinet.png')}
            style={{ width: CAB_W, height: CAB_H }}
            resizeMode="stretch"
          />
          <View style={{ position: 'absolute', left: CAB_KEY_L, top: CAB_KEY_T, width: CAB_KEYS_W, height: CAB_H - CAB_KEY_T, overflow: 'hidden' }}>
            <Piano pressedKeys={pianoPressedKeys} octaves={pianoOctaves} />
          </View>
        </View>
      </View>

      {/* Info boxes */}
      <View style={{ flexDirection: 'row', marginHorizontal: CAB_MARGIN, paddingTop: 12, gap: 14 }}>
        <View style={{ flex: 1, backgroundColor: '#0b1714', borderRadius: 8, borderWidth: 1, borderColor: '#2bc0a030', paddingVertical: 5, alignItems: 'center' }}>
          <Text style={{ color: '#2bc0a055', fontSize: 8, letterSpacing: 2, fontWeight: '600' }}>ROOT</Text>
          <Text style={{ color: '#2bc0a0', fontSize: 14, fontWeight: '700' }}>
            {rootPitch ? Pitches.displayName(rootPitch) : '—'}
          </Text>
        </View>

        <View style={{ flex: 1, backgroundColor: '#120e06', borderRadius: 8, borderWidth: 1, borderColor: '#9e751435', paddingVertical: 5, alignItems: 'center' }}>
          <Text style={{ color: '#9e751455', fontSize: 8, letterSpacing: 2, fontWeight: '600' }}>INTERVAL</Text>
          <Text style={{ color: '#c4991e', fontSize: 11, fontWeight: '700' }}>
            {intervalSemitones !== null
              ? `${intervalDirection === 'up' ? '↑' : intervalDirection === 'down' ? '↓' : ''} ${INTERVAL_NAMES[intervalSemitones]}`
              : '—'}
          </Text>
        </View>

        <View style={{ flex: 1, backgroundColor: '#0d1018', borderRadius: 8, borderWidth: 1, borderColor: '#00d46030', paddingVertical: 5, alignItems: 'center' }}>
          <Text style={{ color: '#00d46055', fontSize: 8, letterSpacing: 2, fontWeight: '600' }}>TARGET</Text>
          <Text style={{ color: '#00d460', fontSize: 14, fontWeight: '700' }}>
            {targetPitch ? Pitches.displayName(targetPitch) : '—'}
          </Text>
        </View>
      </View>

      {/* Timer / score */}
      {boxFull ? (
        <View style={{ alignItems: 'center', paddingTop: 12 }}>
          <Animated.Text style={{
            fontSize: 52, fontWeight: '800', color: timeColor(finalScore),
            transform: [{ scale: scoreLandAnim }], letterSpacing: -2,
          }}>
            {(finalScore / 1000).toFixed(1)}s
          </Animated.Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: timeColor(finalScore), letterSpacing: 5, opacity: 0.85 }}>
            {timeLabel(finalScore)}
          </Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingTop: 12 }}>
          {timerMs > 0 ? (
            <Text style={{ fontSize: 36, fontWeight: '700', color: '#ffffff55', letterSpacing: -1 }}>
              {(timerMs / 1000).toFixed(1)}s
            </Text>
          ) : liveAccuracy > 0 && (
            <Text style={{ fontSize: 28, fontWeight: '700', color: bandColor(liveAccuracy), letterSpacing: -1 }}>
              {liveAccuracy}%
            </Text>
          )}
        </View>
      )}

    </View>
  );
};

export default IntervalSingingScreen;
