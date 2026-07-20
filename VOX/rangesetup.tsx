import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { PitchDetector } from 'react-native-pitch-detector';
import { Pitch, Pitches } from './API/pitch';
import { Profile } from './profile';
import styles from './UI/styles';

const DESC_SOLFEGE  = ['do', 'ti', 'la', 'so', 'la', 'ti', 'do'];
const ASC_SOLFEGE   = ['do', 'mi', 'so', 'mi', 'do'];
const LISTEN_MS     = 9000;
const MIN_HZ        = 75;
const MAX_HZ        = 1300;
const MAX_ROUNDS    = 7;
const LIMIT_LOW     = Pitches.C4.id - 36;  // C1: 3 octaves below C4
const LIMIT_HIGH    = Pitches.C4.id + 36;  // C7: 3 octaves above C4

type Phase     = 'idle' | 'playing' | 'listening' | 'result' | 'transition';
type Direction = 'descending' | 'ascending';

function buildDescSequence(start: Pitch): Pitch[] {
  const pool = Pitches.filteredPitches();
  const f    = (offset: number) => pool.find(p => p.id === start.id + offset);
  const ti = f(-1), la = f(-3), so = f(-5);
  if (!ti || !la || !so) return [];
  return [start, ti, la, so, la, ti, start];
}

function buildAscSequence(start: Pitch): Pitch[] {
  const pool = Pitches.filteredPitches();
  const f    = (offset: number) => pool.find(p => p.id === start.id + offset);
  const mi = f(4), so = f(7);
  if (!mi || !so) return [];
  return [start, mi, so, mi, start];
}

interface Props {
  onBack: () => void;
  onSetRange: () => void;
}

const RangeSetupScreen: React.FC<Props> = ({ onBack, onSetRange }) => {
  const profileRef      = useRef(new Profile());
  const timersRef       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortPlayRef    = useRef<(() => void) | null>(null);
  const seqStartRef     = useRef<Pitch>(Pitches.C4);
  const directionRef    = useRef<Direction>('descending');
  const lowestHzRef     = useRef(Infinity);
  const highestHzRef    = useRef(0);
  const lowRangeRef     = useRef<Pitch>(Pitches.C4);

  const [phase, setPhase]             = useState<Phase>('idle');
  const [direction, setDirection]     = useState<Direction>('descending');
  const [round, setRound]             = useState(1);
  const [solfegeIdx, setSolfegeIdx]   = useState(-1);
  const [currentNote, setCurrentNote] = useState('');
  const [lowestNote, setLowestNote]   = useState('');
  const [highestNote, setHighestNote] = useState('');
  const [listening, setListening]     = useState(false);

  useEffect(() => {
    profileRef.current.RetreiveProfile();
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  function clearTimers() {
    abortPlayRef.current?.();
    abortPlayRef.current = null;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function startGame(start: Pitch, roundNum: number, dir: Direction) {
    const seq  = dir === 'descending' ? buildDescSequence(start) : buildAscSequence(start);
    if (seq.length === 0) {
      if (dir === 'descending') { lowRangeRef.current = start; setPhase('transition'); }
      else finishGame(start);
      return;
    }

    seqStartRef.current  = start;
    directionRef.current = dir;
    lowestHzRef.current  = Infinity;
    highestHzRef.current = 0;
    clearTimers();
    setDirection(dir);
    setRound(roundNum);
    setSolfegeIdx(-1);
    setCurrentNote('');
    if (dir === 'descending') setLowestNote('');
    else setHighestNote('');
    setPhase('playing');

    abortPlayRef.current = Pitches.playMono(
      seq,
      923,
      () => {
        setSolfegeIdx(-1);
        setPhase('listening');
        setListening(true);
        const listenEnd = setTimeout(() => {
          setListening(false);
          setPhase('result');
        }, LISTEN_MS);
        timersRef.current.push(listenEnd);
      },
      (index) => setSolfegeIdx(index)
    );
  }

  function finishGame(high: Pitch) {
    const low = lowRangeRef.current;
    profileRef.current.low_range  = low;
    profileRef.current.high_range = high;
    profileRef.current.range_set  = true;
    profileRef.current.range_class = Pitches.classify(high, low).map(r => r.name).join(' / ');
    profileRef.current.SaveProfile();
    onSetRange();
  }

  useEffect(() => {
    let subscription: any;
    if (listening) {
      try {
        PitchDetector.start();
        subscription = PitchDetector.addListener(({ frequency, tone }: { frequency: number; tone: string }) => {
          if (frequency < MIN_HZ || frequency > MAX_HZ) return;
          setCurrentNote(tone);
          if (directionRef.current === 'descending') {
            if (frequency < lowestHzRef.current) {
              lowestHzRef.current = frequency;
              setLowestNote(tone);
            }
          } else {
            if (frequency > highestHzRef.current) {
              highestHzRef.current = frequency;
              setHighestNote(tone);
            }
          }
        });
      } catch (e) {
        console.error('Pitch detector error:', e);
      }
    }
    return () => {
      if (subscription) { PitchDetector.stop(); PitchDetector.removeListener(); }
    };
  }, [listening]);

  const handleContinue = () => {
    if (direction === 'descending') {
      const current  = (lowestNote ? Pitches.noteToPitch(lowestNote) : null) ?? seqStartRef.current;
      const nextSeq  = buildDescSequence(current);
      const stop =
        (round > 1 && current.frequency >= seqStartRef.current.frequency) ||
        current.id < LIMIT_LOW  ||
        nextSeq.length === 0    ||
        round >= MAX_ROUNDS;

      if (stop) { lowRangeRef.current = current; setPhase('transition'); }
      else startGame(current, round + 1, 'descending');

    } else {
      const current  = (highestNote ? Pitches.noteToPitch(highestNote) : null) ?? seqStartRef.current;
      const nextSeq  = buildAscSequence(current);
      const stop =
        (round > 1 && current.frequency <= seqStartRef.current.frequency) ||
        current.id > LIMIT_HIGH ||
        nextSeq.length === 0    ||
        round >= MAX_ROUNDS;

      if (stop) finishGame(current);
      else startGame(current, round + 1, 'ascending');
    }
  };

  const trackedNote = direction === 'descending' ? lowestNote : highestNote;
  const trackLabel  = direction === 'descending' ? 'lowest' : 'highest';
  const solfege     = direction === 'descending' ? DESC_SOLFEGE : ASC_SOLFEGE;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#16083dff' }}>
      <TouchableOpacity style={[styles.backButton, { position: 'absolute', right: 10, top: 10 }]} onPress={onBack}>
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }}>

        {phase === 'idle' && (
          <>
            <Text style={[styles.subtitleText, { marginBottom: 48, color: '#d5dbe7ff' }]}>
              sing this back to me
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => startGame(Pitches.C4, 1, 'descending')}>
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          </>
        )}

        {(phase === 'playing' || phase === 'listening' || phase === 'result') && (
          <Text style={[styles.subtitleText, { marginBottom: 48, color: '#d5dbe7ff' }]}>
            sing this back to me
          </Text>
        )}

        {phase === 'playing' && (
          <>
            <Text style={[styles.titleText, { fontSize: 72, marginBottom: 16 }]}>♪</Text>
            <Text style={[styles.subtitleText, { color: '#2bc0a0ff', fontSize: 28 }]}>
              {solfegeIdx >= 0 ? solfege[solfegeIdx] : ''}
            </Text>
          </>
        )}

        {phase === 'listening' && (
          <>
            <Text style={[styles.subtitleText, { color: '#2bc0a0ff', fontSize: 48, marginBottom: 12 }]}>
              {currentNote ? Pitches.displayTone(currentNote) : '...'}
            </Text>
            {trackedNote !== '' && (
              <Text style={[styles.bodyText, { color: '#d5dbe7ff' }]}>
                {trackLabel}: {Pitches.displayTone(trackedNote)}
              </Text>
            )}
          </>
        )}

        {phase === 'result' && (
          <>
            <Text style={[styles.bodyText, { color: '#d5dbe7ff', marginBottom: 20 }]}>
              your {trackLabel} note:
            </Text>
            <Text style={[styles.titleText, { fontSize: 64 }]}>
              {trackedNote ? Pitches.displayTone(trackedNote) : '—'}
            </Text>
            <Text style={[styles.bodyText, { color: '#ffffff44', marginTop: 8, fontSize: 12 }]}>
              round {round} / {MAX_ROUNDS}
            </Text>
            <TouchableOpacity style={[styles.button, { marginTop: 40 }]} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'transition' && (
          <>
            <Text style={[styles.titleText, { fontSize: 28, textAlign: 'center', marginBottom: 16 }]}>
              Now let's find how high you can go.
            </Text>
            <Text style={[styles.bodyText, { color: '#d5dbe7ff', textAlign: 'center', marginBottom: 40 }]}>
              Same idea — sing it back.
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => startGame(Pitches.C4, 1, 'ascending')}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </SafeAreaView>
  );
};

export default RangeSetupScreen;
