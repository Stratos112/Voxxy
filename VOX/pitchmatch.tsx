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

const MAX_TAIL = 120;
const TICK_SKIP = 2;
const GRID_MARGIN = 10;

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

// Maps freq to `top` pixel within pitchBox.
// hi freq → GRID_MARGIN (near top), lo freq → pitchBoxHeight - 1 - GRID_MARGIN (near bottom).
// Guard against hi <= lo to prevent divide-by-zero.
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
  const [position, setPosition] = useState(Math.round(pitchBoxHeight / 2));
  const [hz, setHz] = useState(0);
  const [note, setNote] = useState('');
  const [pitchLine, setPitchLine] = useState<Array<{top: number, color: string}>>([]);
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [started, setStarted] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);
  const [targetPitch, setTargetPitch] = useState<Pitch | null>(null);

  const targetAnimY = useRef(new Animated.Value(-100)).current;
  const tickRef = useRef(0);
  const targetPitchRef = useRef<Pitch | null>(null);
  const hasTargetRef = useRef(false);

  useEffect(() => {
    const loadProfile = async () => {
      const user = new Profile();
      await user.RetreiveProfile();
      setUserProfile(user);
    };
    loadProfile();
  }, []);

  // Derive lo/hi each render so they're always current.
  const lo = userProfile.low_range?.frequency ?? 65.41;
  const hi = userProfile.high_range?.frequency ?? 1046.5;

  // Refs so the detector callback always reads the latest lo/hi without re-subscribing.
  const loRef = useRef(lo);
  const hiRef = useRef(hi);
  loRef.current = lo;
  hiRef.current = hi;

  useEffect(() => {
    if (!started) return;
    let subscription: any;
    try {
      PitchDetector.start();
      subscription = PitchDetector.addListener((value: { frequency: number; tone: string }) => {
        tickRef.current += 1;
        if (tickRef.current % TICK_SKIP !== 0) return;

        const pos = freqToY(value.frequency, loRef.current, hiRef.current) - 3;

        let color = '#ffffff';
        if (hasTargetRef.current && targetPitchRef.current && value.frequency > 0) {
          const score = Grade.grade(targetPitchRef.current.frequency, value.frequency);
          color = bandColor(score);
        }

        setPitchLine(prev => {
          const next = [{top: pos + 1, color}, ...prev];
          return next.length > MAX_TAIL ? next.slice(0, MAX_TAIL) : next;
        });
        setCurrentColor(color);
        setHz(value.frequency);
        setNote(value.tone);
        setPosition(pos);
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
    if (hi <= lo) return null;
    return Pitches.filteredPitches()
      .filter(p => p.frequency >= lo && p.frequency <= hi)
      .map(p => (
        <View
          key={p.name}
          style={[styles.pitchGrid, { top: freqToY(p.frequency, lo, hi) }]}
        />
      ));
  }, [userProfile]);

  function newTarget() {
    if (userRange.length === 0) return;
    const pick = userRange[Math.floor(Math.random() * userRange.length)];

    // Center the 5px bar on the 1px grid line: bar top = gridY - 2, bar center = gridY + 0.5.
    const finalY = freqToY(pick.frequency, lo, hi) - 2;

    // Enter from whichever edge gives more travel distance.
    const startY = finalY < pitchBoxHeight / 2 ? pitchBoxHeight + 10 : -10;

    targetAnimY.stopAnimation();
    targetAnimY.setValue(startY);
    setStarted(true);
    hasTargetRef.current = false;
    setHasTarget(false);

    Animated.timing(targetAnimY, {
      toValue: finalY,
      duration: 600,
      useNativeDriver: false,
    }).start(() => {
      targetPitchRef.current = pick;
      hasTargetRef.current = true;
      setTargetPitch(pick);
      setHasTarget(true);
      Pitches.playSingle(pick);
    });
  }

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

        {started && (
          <Animated.View style={[styles.targetLine, { top: targetAnimY }]} />
        )}

        {hasTarget && targetPitch && (
          <Text style={[styles.targetText, {
            top: Math.max(2, freqToY(targetPitch.frequency, lo, hi) - 22),
          }]}>
            {Pitches.displayName(targetPitch)}
          </Text>
        )}

        {started && (
          <View style={[styles.pitchSquare, { top: position, backgroundColor: currentColor }]} />
        )}

        {started && pitchLine.map((item, index) => (
          <View
            key={index}
            style={[
              styles.pitchTail,
              {
                position: 'absolute',
                top: item.top,
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
