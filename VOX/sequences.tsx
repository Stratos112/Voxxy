/**
 * Sequences page for Voxxy app
 * by @author Sky Vercauteren
 * August 2025
**/

import React, { useState } from 'react';
import { SafeAreaView, Text, View, TouchableOpacity } from 'react-native';
import styles from './UI/styles';
import BackButton from './UI/backButton';
import Piano from './UI/Piano';

interface SequenceScreenProps {
  onBack: () => void;
}

const MELODY: string[][] = [
  [],
  ['C4', 'E4', 'G4'],            // C major — no black keys
  ['C4', 'D4'],                  // adjacent white keys (C-D connector)
  ['D4', 'E4', 'F#4'],           // D major — one black key
  ['F4', 'G4', 'A4', 'A#4'],    // adjacent whites + black key on top
  ['C#4', 'E4', 'G#4'],          // C# minor — two black keys
  ['B3', 'C4', 'E4', 'G4'],     // B-C cross-octave adjacent pair
  ['D4', 'E4', 'F#4', 'A4', 'C#5'], // D major spread across octaves
  ['C4', 'D4', 'E4', 'F4'],     // four adjacent whites
];

const SequenceScreen: React.FC<SequenceScreenProps> = ({ onBack }) => {
  const [step, setStep] = useState(0);

  const advance = () => setStep(s => (s + 1) % MELODY.length);

  return (
    <SafeAreaView style={[styles.sequenceContainer, { flex: 1 }]}>
      <BackButton onBack={onBack} />
      <Text style={[styles.titleText, { marginTop: 16 }]}>Sequences</Text>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10 }}>
        <Piano pressedKeys={MELODY[step]} octaves={[3, 4, 5]} />
        <Text style={[styles.bodyText, { color: '#d5dbe7ff', textAlign: 'center', marginTop: 12 }]}>
          {MELODY[step].length > 0 ? MELODY[step].join('  ') : '—'}
        </Text>
      </View>
      <TouchableOpacity style={[styles.primaryButton, { alignSelf: 'center', marginBottom: 40 }]} onPress={advance}>
        <Text style={styles.backButtonText}>Next</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SequenceScreen;
