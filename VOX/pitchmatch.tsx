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

const MAX_TAIL      = 200;
const GRID_MARGIN   = 10;
const ROLLING_N     = 8;
const ZOOM_ALPHA    = 0.28;
const DURATION_MS   = 5000;
const NUM_PARTICLES = 10;

const BOX_W         = 48;
const BOX_H         = 40;
const BOX_GAP       = 5;
const BOX_LEFT_START = Math.round(((pitchBoxWidth) - (5 * BOX_W +  BOX_GAP)) / 2);
const BOX_Y         = pitchBoxHeight - 42;

const PIPE_IMAGES = [
  require('../static/pipes/white_scorepipe.png'),
  require('../static/pipes/green_scorepipe.png'),
  require('../static/pipes/yellow_scorepipe.png'),
  require('../static/pipes/orange_scorepipe.png'),
  require('../static/pipes/red_scorepipe.png'),
];
const PIPEBOARD = require('../static/pipes/pipeboard_voxxy.png');

const SCORE_X0  = 10;
const BAR_LEFT  = 24;
const BAR_RIGHT = pitchBoxWidth - 20;
const BAR_WIDTH = BAR_RIGHT - BAR_LEFT;

const SCORE_X1 = BAR_RIGHT;

const BANDS = [
  { min: 99, color: '#b8f0ff' }, // perfect — diamond
  { min: 96, color: '#0f854c' }, // excellent — bright green
  { min: 90, color: '#768808' }, // good — pea soup
  { min: 85, color: '#7f5011' }, // average — steel blue-green
  { min: 0,  color: '#571707' }, // off — slate grey
];
const BAND_WEIGHTS = [5, 4, 3, 2, 0];

function bandIndexFromColor(color: string): number {
  const idx = BANDS.findIndex(b => b.color === color);
  return idx >= 0 ? idx : BANDS.length - 1;
}
function boxCenterX(bandIdx: number): number {
  return BOX_LEFT_START + bandIdx * (BOX_W + BOX_GAP) + BOX_W / 2;
}

function scoreLabel(s: number): string {
  if (s >= 90) return 'STELLAR';
  if (s >= 75) return 'EXCELLENT';
  if (s >= 55) return 'SOLID';
  if (s >= 40) return 'KEEP AT IT';
  return 'NEEDS WORK';
}
function scoreColor(s: number): string {
  if (s >= 90) return '#b8f0ff';
  if (s >= 75) return '#00e676';
  if (s >= 55) return '#7a8c5a';
  if (s >= 40) return '#5f7878';
  return '#607080';
}

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
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  const liveSumRef   = useRef(0);
  const liveCountRef = useRef(0);
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
  const animLo              = useRef(new Animated.Value(65.41)).current;
  const animHi              = useRef(new Animated.Value(1046.5)).current;
  const glowAnim            = useRef(new Animated.Value(0)).current;
  const scoreCountAnim      = useRef(new Animated.Value(0)).current;
  const scoreLandAnim       = useRef(new Animated.Value(1)).current;
  const lastPerfectFireRef  = useRef(0);
  const scoringDotsRef      = useRef<Array<{top: number, left: number, color: string, born: number}>>([]);
  const onScoringEndRef     = useRef<() => void>(() => {});
  const [animTail, setAnimTail] = useState<Array<{
    top: number, left: number, color: string, born: number,
    tx: Animated.Value, ty: Animated.Value, op: Animated.Value,
  }>>([]);
  const [boxFull, setBoxFull]         = useState(false);
  const [tierCounts, setTierCounts]   = useState<number[]>([0,0,0,0,0]);
  const [finalScore, setFinalScore]           = useState(0);
  const [displayedScore, setDisplayedScore]   = useState(0);
  const particles          = useRef(
    Array.from({ length: NUM_PARTICLES }, () => ({
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      op: new Animated.Value(0),
    }))
  ).current;
  const [perfectPos, setPerfectPos] = useState({ x: -100, y: -100 });

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
    const subCount = scoreCountAnim.addListener(({ value }) => {
      setDisplayedScore(Math.floor(value));
    });
    return () => {
      animLo.removeListener(subLo);
      animHi.removeListener(subHi);
      scoreX.removeListener(subScoreX);
      scoreCountAnim.removeListener(subCount);
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

          // One-shot: start horizontal progress animation the moment zoom settles
          if (isZoomSettledRef.current && !horizontalStartRef.current) {
            horizontalStartRef.current = true;
            Animated.timing(scoreX, {
              toValue: SCORE_X1,
              duration: DURATION_MS,
              useNativeDriver: false,
            }).start(() => { onScoringEndRef.current(); });
          }

        }

        // Store dot — only while square is over the target bar
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
        <View
          key={p.name}
          style={[styles.pitchGrid, { top: freqToY(p.frequency, displayLo, displayHi) }]}
        />
      ));
  }, [displayLo, displayHi]);

  onScoringEndRef.current = () => {
    const dots = scoringDotsRef.current;
    if (dots.length === 0) return;
    const counts = [0, 0, 0, 0, 0];
    dots.forEach(d => { counts[bandIndexFromColor(d.color)]++; });
    const totalDots   = counts.reduce((a, b) => a + b, 0);
    const totalPoints = counts.reduce((sum, cnt, i) => sum + cnt * BAND_WEIGHTS[i], 0);
    const weighted    = totalDots > 0 ? Math.round((totalPoints / (totalDots * 5)) * 100) : 0;
    setFinalScore(weighted);
    setTierCounts(counts);
    setBoxFull(true);
    scoreCountAnim.setValue(0);
    scoreLandAnim.setValue(1);
    Animated.timing(scoreCountAnim, {
      toValue: weighted,
      duration: 1400,
      useNativeDriver: false,
    }).start(() => {
      Animated.sequence([
        Animated.timing(scoreLandAnim, { toValue: 1.25, duration: 140, useNativeDriver: true }),
        Animated.timing(scoreLandAnim, { toValue: 1.0,  duration: 220, useNativeDriver: true }),
      ]).start();
    });
    const items = dots.map(dot => ({
      ...dot,
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      op: new Animated.Value(1),
    }));
    setAnimTail(items);
    setPitchLine([]);
    const anims = items.map(item => {
      const idx     = bandIndexFromColor(item.color);
      const targetX = boxCenterX(idx) - item.left;
      const targetY = BOX_Y + BOX_H / 2 - item.top;
      return Animated.parallel([
        Animated.timing(item.tx, { toValue: targetX, duration: 700, useNativeDriver: true }),
        Animated.timing(item.ty, { toValue: targetY, duration: 700, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(item.op, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]);
    });
    Animated.stagger(3, anims).start(() => setAnimTail([]));
  };

  function newTarget() {
    if (userRange.length === 0) return;
    const pick = gaussianPick(userRange);

    hasTargetRef.current       = false;
    isZoomSettledRef.current   = false;
    horizontalStartRef.current = false;
    lastPerfectFireRef.current = 0;
    scoringDotsRef.current     = [];
    setHasTarget(false);
    setBarVisible(false);
    setAnimTail([]);
    setBoxFull(false);
    setTierCounts([0,0,0,0,0]);
    setFinalScore(0);
    setDisplayedScore(0);
    setLiveAccuracy(0);
    liveSumRef.current   = 0;
    liveCountRef.current = 0;
    scoreCountAnim.setValue(0);
    scoreLandAnim.setValue(1);
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
        const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
          hasTargetRef.current = true;
          sub.remove();
        });
      });
    });
  }

  const squareY  = freqToY(hz, displayLo, displayHi) - 3;
  const coverWidth = useMemo(() => scoreX.interpolate({
    inputRange: [BAR_LEFT, BAR_RIGHT],
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

      <View style={{ position: 'relative' }}>
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

        {animTail.map(item => (
          <Animated.View
            key={`at${item.born}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 5, height: 5,
              top: item.top,
              left: item.left,
              backgroundColor: item.color,
              opacity: item.op,
              transform: [{ translateX: item.tx }, { translateY: item.ty }],
            }}
          />
        ))}

        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#b8f0ff', opacity: glowAnim }}
        />

        {particles.map((p, i) => (
          <Animated.View
            key={`p${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 4, height: 4, borderRadius: 2,
              backgroundColor: '#b8f0ff',
              top: perfectPos.y - 2,
              left: perfectPos.x - 2,
              opacity: p.op,
              transform: [{ translateX: p.tx }, { translateY: p.ty }],
            }}
          />
        ))}

      </View>

        <Image
          source={PIPEBOARD}
          style={{ position: 'absolute', left: 10, top: BOX_Y +25, width: pitchBoxWidth, height: BOX_H }}
          resizeMode="stretch"
        />

        {BANDS.map((_, i) => (
          <View
            key={`cast${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: BOX_LEFT_START + i * (BOX_W + BOX_GAP) -9,
              top: BOX_Y+21,
              width: 30,
              height: BOX_H - 23,
              backgroundColor: 'rgba(0,0,0,0.38)',
              borderRadius: 8,
              transform: [{ rotate: '18deg' }],
            }}
          />
        ))}

        {BANDS.map((_, i) => (
          <View
            key={`box${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: BOX_LEFT_START + i * (BOX_W + BOX_GAP),
              top: BOX_Y,
              width: BOX_W,
              height: BOX_H,
              overflow: 'hidden',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Image source={PIPE_IMAGES[i]} style={{ width: BOX_H, left:2, height: BOX_W, transform: [{ rotate: '-90deg' }] }} resizeMode="stretch" />
            {boxFull && tierCounts[i] > 0 && (
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 3, position: 'absolute', paddingTop: 4, paddingLeft: 3 }}>
                {tierCounts[i]}
              </Text>
            )}
          </View>
        ))}
      </View>

      {boxFull ? (
        <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6 }}>
          <Animated.Text style={{
            fontSize: 72,
            fontWeight: '800',
            color: '#ffffff',
            transform: [{ scale: scoreLandAnim }],
            letterSpacing: -2,
          }}>
            {displayedScore}
          </Animated.Text>
          <Text style={{
            fontSize: 13,
            fontWeight: '700',
            color: scoreColor(finalScore),
            letterSpacing: 5,
            marginTop: 2,
            opacity: 0.85,
          }}>
            {scoreLabel(finalScore)}
          </Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingTop: 16 }}>
          {liveAccuracy > 0 && (
            <Text style={{ fontSize: 36, fontWeight: '700', color: bandColor(liveAccuracy), letterSpacing: -1 }}>
              {liveAccuracy}%
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default PitchMatchScreen;
