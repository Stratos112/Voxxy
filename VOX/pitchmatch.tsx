/**
 * Pitch matching page for Voxxy app
 * by @author Sky Vercauteren
 * August 2025
**/

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { PitchDetector } from 'react-native-pitch-detector';
import styles, { pitchBoxHeight, pitchBoxWidth, heightRange } from './UI/styles';
import { Pitch, Pitches } from './API/pitch';
import { Profile } from './profile';

const MAX_TAIL = 120;
const TICK_SKIP = 2; // only update state every Nth detector tick

interface PitchMatchScreenProps {
  onBack: () => void;
}

const PitchMatchScreen: React.FC<PitchMatchScreenProps> = ({ onBack }) => {
  const [userProfile, setUserProfile] = useState(new Profile());
  const [position, setPosition] = useState(250);
  const [hz, setHz] = useState(0);
  const [note, setNote] = useState('');
  const [pitchLine, setPitchLine] = useState<number[]>([]);

  const [started, setStarted] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);
  const [targetPitch, setTargetPitch] = useState<Pitch | null>(null);

  const targetAnimY = useRef(new Animated.Value(pitchBoxHeight / 2)).current;
  // stable animated value for label so we don't recreate it every render
  const labelAnimY = useRef(new Animated.Value(pitchBoxHeight / 2 - 20)).current;
  const tickRef = useRef(0);

  useEffect(() => {
    const loadProfile = async () => {
      const user = new Profile();
      await user.RetreiveProfile();
      setUserProfile(user);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (!started) return;
    let subscription: any;
    try {
      PitchDetector.start();
      subscription = PitchDetector.addListener((value: { frequency: number; tone: string }) => {
        tickRef.current += 1;
        if (tickRef.current % TICK_SKIP !== 0) return;

        const pos = heightRange - Pitches.fqzToPosition(value.frequency) - 3;
        setPitchLine(prev => {
          const next = [pos + 1, ...prev];
          return next.length > MAX_TAIL ? next.slice(0, MAX_TAIL) : next;
        });
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
    const start = userProfile.low_range;
    const end = userProfile.high_range;
    if (!start || !end) return [];
    return Pitches.filteredPitches().filter(
      p => p.frequency >= start.frequency && p.frequency <= end.frequency
    );
  }, [userProfile]);

  // pitch grid never changes — render once
  const pitchGrid = useMemo(() => (
    Pitches.allPitches.map(p => (
      <View
        key={p.name}
        style={[styles.pitchGrid, { top: heightRange - Pitches.fqzToPosition(p.frequency) }]}
      />
    ))
  ), []);

  function newTarget() {
    if (userRange.length === 0) return;
    const pick = userRange[Math.floor(Math.random() * userRange.length)];
    const finalY = (heightRange - 2) - Pitches.fqzToPosition(pick.frequency);
    const midY   = (heightRange - 2) / 2;
    // slide from bottom if target is in top half, from top if in bottom half
    const startY = finalY < midY ? heightRange : 0;

    targetAnimY.setValue(startY);
    labelAnimY.setValue(startY - 20);

    setStarted(true);
    setHasTarget(false);

    Animated.parallel([
      Animated.timing(targetAnimY, {
        toValue: finalY,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(labelAnimY, {
        toValue: finalY - 20,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setTargetPitch(pick);
      setHasTarget(true);
      Pitches.playSingle(pick);
    });
  }

  return (
    <SafeAreaView style={styles.pitchmatchContainer}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', marginBottom: 0 }}>
        <Text style={[styles.titleText, { marginBottom: 2 }]}>Pitch Match</Text>
        <TouchableOpacity
          style={[styles.button, { width: '40%', height: '80%', margin: 2, marginLeft: 20, paddingVertical: 5 }]}
          onPress={newTarget}
        >
          <Text style={styles.backButtonText}>{started ? 'New Target' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pitchBox}>
        {pitchGrid}

        {started && (
          <>
            <Animated.View style={[styles.targetLine, { top: targetAnimY }]} />
            {hasTarget && targetPitch && (
              <Animated.Text style={[styles.targetText, { top: labelAnimY }]}>
                {Pitches.displayName(targetPitch)}
              </Animated.Text>
            )}
          </>
        )}

        {started && <View style={[styles.pitchSquare, { top: position }]} />}

        {started && pitchLine.map((item, index) => (
          <View
            key={index}
            style={[
              styles.pitchTail,
              {
                position: 'absolute',
                top: item,
                left: pitchBoxWidth / 2 - index - 12,
                opacity: 1 - index / (MAX_TAIL * 0.5),
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
