import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, View, StyleSheet, TextInput, Text, TouchableOpacity, Pressable } from 'react-native';
import AnimatedText from './UI/AnimatedText';
import NextButton from './UI/NextButton';
import Dropdown from './UI/dropdown';
import { Pitches } from './API/pitch';
import { Profile } from './profile';

const { height } = Dimensions.get('window');

const DIALOG = [
  "Every singer is unique. Before we dive in, let's figure out your vocal range.",
  "We'll play a short sequence of notes and listen as you sing them back. No pressure — just listen and try.",
  "Ready? Let's find your voice.",
];

interface Props {
  onDone: () => void;
  onRangeSetup: () => void;
  bridgeMode?: boolean;
  bridgeDialog?: string[];
  finalLabel?: string;
}

const OnboardingScreen: React.FC<Props> = ({ onDone, onRangeSetup, bridgeMode, bridgeDialog, finalLabel }) => {
  const slideY = useRef(new Animated.Value(-height)).current;
  const profileRef = useRef(new Profile());
  const [step, setStep] = useState(bridgeMode ? 1 : 0);
  const [textDone, setTextDone] = useState(false);
  const [username, setUsername] = useState('');
  const [subView, setSubView] = useState<'dialog' | 'range-select'>('dialog');
  const [skip, setSkip] = useState(false);
  const [lowRange, setLowRange] = useState(Pitches.C2.name);
  const [highRange, setHighRange] = useState(Pitches.C6.name);
  const [rangeClass, setRangeClass] = useState('');

  useEffect(() => {
    profileRef.current.RetreiveProfile();
    Animated.spring(slideY, {
      toValue: 0,
      tension: 55,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, []);

  const slideAway = (cb: () => void) => {
    Animated.timing(slideY, {
      toValue: -height,
      duration: 380,
      useNativeDriver: true,
    }).start(cb);
  };

  const lines = bridgeMode && bridgeDialog ? bridgeDialog : DIALOG;
  const isFinalStep = step === lines.length + (bridgeMode ? 0 : 1);

  const handleNext = () => {
    setSkip(false);
    if (step === 0) {
      profileRef.current.name = username;
      profileRef.current.SaveProfile();
      setTextDone(false);
      setStep(1);
    } else if (!isFinalStep) {
      setTextDone(false);
      setStep(s => s + 1);
    }
  };

  const handleLowChange = (item: string | null) => {
    const pitch = item ? Pitches.noteToPitch(item) : Pitches.C2;
    profileRef.current.low_range = pitch;
    profileRef.current.range_set = true;
    const cls = Pitches.classify(profileRef.current.high_range, pitch);
    profileRef.current.range_class = cls.map(r => r.name).join(' / ');
    setLowRange(pitch.name);
    setRangeClass(profileRef.current.range_class);
  };

  const handleHighChange = (item: string | null) => {
    const pitch = item ? Pitches.noteToPitch(item) : Pitches.C6;
    profileRef.current.high_range = pitch;
    profileRef.current.range_set = true;
    const cls = Pitches.classify(pitch, profileRef.current.low_range);
    profileRef.current.range_class = cls.map(r => r.name).join(' / ');
    setHighRange(pitch.name);
    setRangeClass(profileRef.current.range_class);
  };

  const lowItems = Pitches.filteredPitches()
    .filter(p => p.frequency <= Pitches.noteToPitch(highRange).frequency)
    .map(p => ({ label: p.name, value: p.name }));

  const highItems = Pitches.filteredPitches()
    .filter(p => p.frequency >= Pitches.noteToPitch(lowRange).frequency)
    .map(p => ({ label: p.name, value: p.name }));

  if (subView === 'range-select') {
    return (
      <Animated.View style={[local.container, { transform: [{ translateY: slideY }] }]}>
        <Pressable style={local.card}>
          <Text style={local.text}>What's your range?</Text>
          <Text style={local.label}>Lowest note</Text>
          <Dropdown placeholder={lowRange} items={lowItems} value={lowRange} onChangeValue={handleLowChange} />
          <Text style={[local.label, { marginTop: 14 }]}>Highest note</Text>
          <Dropdown placeholder={highRange} items={highItems} value={highRange} onChangeValue={handleHighChange} />
          {rangeClass !== '' && (
            <Text style={local.rangeClass}>{rangeClass}</Text>
          )}
          <NextButton
            onPress={() => {
              const low = Pitches.noteToPitch(lowRange);
              const high = Pitches.noteToPitch(highRange);
              profileRef.current.low_range = low;
              profileRef.current.high_range = high;
              profileRef.current.range_set = true;
              profileRef.current.range_class = Pitches.classify(high, low).map(r => r.name).join(' / ');
              profileRef.current.SaveProfile();
              slideAway(onDone);
            }}
            label="Save & Continue ▶"
          />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[local.container, { transform: [{ translateY: slideY }] }]}>
      <Pressable style={local.card} onPress={() => { if (!textDone) setSkip(true); }}>

        {step === 0 ? (
          <>
            <AnimatedText
              text="Hey! Welcome to Voxxy. What can we call you?"
              style={local.text}
              skip={skip}
              onDone={() => setTextDone(true)}
            />
            <TextInput
              style={local.input}
              placeholder="Your name..."
              placeholderTextColor="#aaa"
              value={username}
              onChangeText={setUsername}
            />
            <NextButton
              onPress={handleNext}
              disabled={!textDone || username.trim().length === 0}
            />
          </>
        ) : isFinalStep ? (
          <>
            <AnimatedText
              text={lines[lines.length - 1]}
              style={local.text}
              skip={skip}
              onDone={() => setTextDone(true)}
            />
            <NextButton
              onPress={() => slideAway(bridgeMode ? onDone : onRangeSetup)}
              label={finalLabel ?? "Let's go ▶"}
              disabled={!textDone}
            />
            {!bridgeMode && (
              <TouchableOpacity
                onPress={() => setSubView('range-select')}
                disabled={!textDone}
                style={[local.secondaryBtn, { opacity: textDone ? 1 : 0.25 }]}
              >
                <Text style={local.secondaryText}>I already know my range</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <AnimatedText
              text={lines[step - 1]}
              style={local.text}
              skip={skip}
              onDone={() => setTextDone(true)}
            />
            <NextButton onPress={handleNext} disabled={!textDone} />
          </>
        )}

      </Pressable>
    </Animated.View>
  );
};

const local = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#d4f5edff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    width: '82%',
    backgroundColor: '#ffffffee',
    borderRadius: 18,
    padding: 30,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  text: {
    fontSize: 18,
    color: '#16083dff',
    lineHeight: 30,
    fontWeight: '500',
  },
  input: {
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2bc0a0ff',
    fontSize: 16,
    color: '#16083dff',
    paddingVertical: 6,
  },
  label: {
    marginTop: 8,
    fontSize: 13,
    color: '#16083dff',
    fontWeight: '600',
  },
  rangeClass: {
    marginTop: 14,
    fontSize: 15,
    color: '#2bc0a0ff',
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryBtn: {
    marginTop: 12,
    alignSelf: 'center',
  },
  secondaryText: {
    fontSize: 13,
    color: '#888',
    textDecorationLine: 'underline',
  },
});

export default OnboardingScreen;
