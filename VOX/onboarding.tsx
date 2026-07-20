import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, View, StyleSheet } from 'react-native';
import AnimatedText from './UI/AnimatedText';
import NextButton from './UI/NextButton';

const { height } = Dimensions.get('window');

const DIALOG = [
  "Welcome to Voxxy.",
  "Every singer is unique. Before we dive in, let's figure out your vocal range.",
  "We'll play a note and listen as you sing it back. No pressure — just listen and try.",
  "Ready? Let's find your voice.",
];

interface Props {
  onDone: () => void;
}

const OnboardingScreen: React.FC<Props> = ({ onDone }) => {
  const slideY = useRef(new Animated.Value(-height)).current;
  const [step, setStep] = useState(0);
  const [textDone, setTextDone] = useState(false);

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0,
      tension: 55,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleNext = () => {
    if (step < DIALOG.length - 1) {
      setStep(s => s + 1);
      setTextDone(false);
    } else {
      Animated.timing(slideY, {
        toValue: -height,
        duration: 380,
        useNativeDriver: true,
      }).start(onDone);
    }
  };

  return (
    <Animated.View style={[local.container, { transform: [{ translateY: slideY }] }]}>
      <View style={local.card}>
        <AnimatedText
          text={DIALOG[step]}
          style={local.text}
          onDone={() => setTextDone(true)}
        />
        <NextButton
          onPress={handleNext}
          label={step === DIALOG.length - 1 ? "Let's go ▶" : "Next ▶"}
          disabled={!textDone}
        />
      </View>
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
});

export default OnboardingScreen;
