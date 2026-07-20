import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { PitchDetector } from 'react-native-pitch-detector';
import Sound from 'react-native-sound';
import { Pitches } from './API/pitch';
import { Profile } from './profile';
import styles from './UI/styles';

const SEQUENCE = [Pitches.C4, Pitches.B3, Pitches.A3, Pitches.B3, Pitches.C4];
const SOLFEGE  = ['do', 'ti', 'la', 'ti', 'do'];
const NOTE_MS  = 1100;
const LISTEN_MS = 9000;
const MIN_HZ = 75;
const MAX_HZ = 1300;

interface Props {
  onBack: () => void;
  onSetRange: () => void;
}

type Phase = 'idle' | 'playing' | 'listening' | 'result';

const RangeSetupScreen: React.FC<Props> = ({ onBack, onSetRange }) => {
  const profileRef  = useRef(new Profile());
  const timersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lowestHzRef = useRef(Infinity);

  const [phase, setPhase]           = useState<Phase>('idle');
  const [solfegeIdx, setSolfegeIdx] = useState(-1);
  const [currentNote, setCurrentNote] = useState('');
  const [lowestNote, setLowestNote]   = useState('');
  const [listening, setListening]     = useState(false);

  useEffect(() => {
    Sound.setCategory('Playback');
    Pitches.loadAll();
    profileRef.current.RetreiveProfile();
    return () => {
      Pitches.releaseAll();
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function startGame() {
    clearTimers();
    lowestHzRef.current = Infinity;
    setLowestNote('');
    setCurrentNote('');
    setSolfegeIdx(-1);
    setPhase('playing');

    SEQUENCE.forEach((pitch, i) => {
      const t = setTimeout(() => {
        pitch.play();
        setSolfegeIdx(i);
      }, i * NOTE_MS);
      timersRef.current.push(t);
    });

    const listenStart = setTimeout(() => {
      setSolfegeIdx(-1);
      setPhase('listening');
      setListening(true);

      const listenEnd = setTimeout(() => {
        setListening(false);
        setPhase('result');
      }, LISTEN_MS);
      timersRef.current.push(listenEnd);
    }, SEQUENCE.length * NOTE_MS);
    timersRef.current.push(listenStart);
  }

  useEffect(() => {
    let subscription: any;
    if (listening) {
      try {
        PitchDetector.start();
        subscription = PitchDetector.addListener(({ frequency, tone }: { frequency: number; tone: string }) => {
          if (frequency < MIN_HZ || frequency > MAX_HZ) return;
          setCurrentNote(tone);
          if (frequency < lowestHzRef.current) {
            lowestHzRef.current = frequency;
            setLowestNote(tone);
          }
        });
      } catch (e) {
        console.error('Pitch detector error:', e);
      }
    }
    return () => {
      if (subscription) {
        PitchDetector.stop();
        PitchDetector.removeListener();
      }
    };
  }, [listening]);

  const handleContinue = () => {
    if (lowestNote) {
      const pitch = Pitches.noteToPitch(lowestNote) ?? Pitches.C4;
      profileRef.current.low_range = pitch;
      profileRef.current.SaveProfile();
    }
    onSetRange();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#16083dff' }}>
      <TouchableOpacity style={[styles.backButton, { position: 'absolute', right: 10, top: 10 }]} onPress={onBack}>
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }}>
        <Text style={[styles.subtitleText, { marginBottom: 48, color: '#d5dbe7ff' }]}>
          sing this back to me
        </Text>

        {phase === 'idle' && (
          <TouchableOpacity style={styles.button} onPress={startGame}>
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        )}

        {phase === 'playing' && (
          <>
            <Text style={[styles.titleText, { fontSize: 72, marginBottom: 16 }]}>♪</Text>
            <Text style={[styles.subtitleText, { color: '#2bc0a0ff', fontSize: 28 }]}>
              {solfegeIdx >= 0 ? SOLFEGE[solfegeIdx] : ''}
            </Text>
          </>
        )}

        {phase === 'listening' && (
          <>
            <Text style={[styles.subtitleText, { color: '#2bc0a0ff', fontSize: 48, marginBottom: 12 }]}>
              {currentNote ? Pitches.displayTone(currentNote) : '...'}
            </Text>
            {lowestNote !== '' && (
              <Text style={[styles.bodyText, { color: '#d5dbe7ff' }]}>
                lowest: {Pitches.displayTone(lowestNote)}
              </Text>
            )}
          </>
        )}

        {phase === 'result' && (
          <>
            <Text style={[styles.bodyText, { color: '#d5dbe7ff', marginBottom: 20 }]}>
              your lowest note:
            </Text>
            <Text style={[styles.titleText, { fontSize: 64 }]}>
              {lowestNote ? Pitches.displayTone(lowestNote) : '—'}
            </Text>
            <TouchableOpacity style={[styles.button, { marginTop: 48 }]} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { marginTop: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ffffff44' }]}
              onPress={startGame}
            >
              <Text style={[styles.buttonText, { color: '#ffffff88' }]}>Try Again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default RangeSetupScreen;
