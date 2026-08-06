/**
 * Sequences page for Voxxy app
 * by @author Sky Vercauteren
 * August 2025
**/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, StatusBar, ScrollView, useWindowDimensions,
} from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { Pitch, Pitches } from './API/pitch';
import { Profile } from './profile';
import Piano, { pitchToKey } from './UI/Piano';
import styles from './UI/styles';
import TutorialModal from './UI/TutorialModal';

const TUTORIAL_LINES = [
  "Tap keys on the piano to record a sequence of notes — each tap plays the note and adds it to your list.",
  "Tap a note above the keyboard to remove it from your sequence.",
  "When you're happy with it, hit Continue to move on.",
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
  return INTERVAL_NAMES[Math.abs(n)] ?? `${Math.abs(n)} st`;
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

const SequenceScreen: React.FC<SequenceScreenProps> = ({ onBack }) => {
  const { width: W } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>('record');
  const [sequence, setSequence] = useState<Pitch[]>([]);
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [displayOctaves, setDisplayOctaves] = useState<number[]>([3, 4]);
  const [playingBack, setPlayingBack] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const filtered = useRef<Pitch[]>([]);
  const abortPlay = useRef<(() => void) | null>(null);

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
    };
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
    setPhase('perform');
  };

  const handleBackToEditing = () => setPhase('record');

  const handleBack = () => {
    abortPlay.current?.();
    onBack();
  };

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
          <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Stage 2 coming soon</Text>
          <Text style={{ color: '#d5dbe7ff', textAlign: 'center', marginBottom: 20 }}>
            You'll sing each note back in order and get scored on accuracy. For now, here's what you recorded:
          </Text>
          <Text style={{ color: '#2cf7baff', fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
            {sequence.map(p => Pitches.displayName(p)).join('  ·  ')}
          </Text>
        </View>
        <TouchableOpacity style={[styles.primaryButton, { alignSelf: 'center', marginBottom: 40 }]} onPress={handleBackToEditing}>
          <Text style={styles.backButtonText}>Back to Editing</Text>
        </TouchableOpacity>
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
                    <View style={{ alignItems: 'center', marginHorizontal: 2, width: 44 }}>
                      <Text style={{ color: intervalColor(diff), fontSize: 13, fontWeight: '700' }}>
                        {intervalArrow(diff)}
                      </Text>
                      <Text style={{ color: intervalColor(diff), fontSize: 8, fontWeight: '600', opacity: 0.8 }} numberOfLines={1}>
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
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14, paddingHorizontal: CAB_MARGIN }}>
        <TouchableOpacity
          disabled={sequence.length === 0}
          onPress={clearSequence}
          style={[styles.button, { width: undefined, flex: 1, opacity: sequence.length === 0 ? 0.4 : 1, backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: '#ff4444' }]}
        >
          <Text style={{ color: '#ff4444', fontWeight: '700' }}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={sequence.length === 0 || playingBack}
          onPress={playBack}
          style={[styles.button, { width: undefined, flex: 1, opacity: sequence.length === 0 ? 0.4 : 1 }]}
        >
          <Text style={styles.buttonText}>▶ Play Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={sequence.length === 0}
          onPress={handleContinue}
          style={[styles.primaryButton, { width: undefined, flex: 1, margin: 0, opacity: sequence.length === 0 ? 0.4 : 1 }]}
        >
          <Text style={styles.backButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SequenceScreen;
