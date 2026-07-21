/**
 * range determination page for Voxxy app 
 * used by the profile section
 * by @author Sky Vercauteren 
 * August 2025
**/

//TODO: some kind of visual for target, and progress so far

import React , {useState, useEffect, useCallback, useRef} from 'react';
import {
  Image,
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
 } from 'react-native';
import { PitchDetector } from 'react-native-pitch-detector';
import { Pitches } from './API/pitch';
import {Grade} from './API/grade';
import { Profile } from './profile';
import styles from './UI/styles';


 interface setRangeScreenProps {
  onBack: () => void;
  onComplete?: () => void;
}


 //pitch match screen
const SetRangeScreen: React.FC<setRangeScreenProps> = ({ onBack, onComplete }) => {

  const profileRef = useRef(new Profile());
  const increasingRef = useRef(true);
  const failCountRef = useRef(0);
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hz, setHz] = useState(0);
  const [note, setNote] = useState("C4");
  const [low_max, setLow_max] = useState(Pitches.C4.name);
  const [high_max, setHigh_max] = useState(Pitches.C4.name);
  const [expected, setExpected] = useState(Pitches.C4);
  const [grade, setGrade] = useState(1.0);
  const [failCount, setFailCount] = useState(0);
  const [increasing, setIncreasing] = useState(true);
  const [message, setMessage] = useState('');
  const [avgGrade, setAvgGrade] = useState(0.0);
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'active' | 'result' | 'done'>('idle');
  
  
  function clearActiveTimer() {
    if (activeTimerRef.current) {
      clearTimeout(activeTimerRef.current);
      activeTimerRef.current = null;
    }
  }

  function start(){
    clearActiveTimer();
    setListening(false);
    setAvgGrade(0.0);
    setGrade(0);
    setPhase('active');
    Pitches.playSingle(expected);
    activeTimerRef.current = setTimeout(() => {
      evaluate();
    }, 3000);
  }

  function surrender() {
    clearActiveTimer();
    setListening(false);
    setMessage("No worries — that's your limit.");
    const done = nextPitch(true);
    if (!done) {
      setPhase('result');
      activeTimerRef.current = setTimeout(() => setPhase('idle'), 2000);
    }
  }

  function nextPitch(pivot:boolean): boolean {
    if(increasingRef.current && !pivot){
      failCountRef.current = 0;
      setFailCount(0);
      increment();
    } else if(increasingRef.current && pivot){
      failCountRef.current = 0;
      setFailCount(0);
      increasingRef.current = false;
      setIncreasing(false);
      setExpected(profileRef.current.low_range);
    } else if(!increasingRef.current && !pivot){
      failCountRef.current = 0;
      setFailCount(0);
      decrement();
    } else if(!increasingRef.current && pivot){
      let high = Pitches.noteToPitch(high_max);
      let low = Pitches.noteToPitch(low_max);
      const classes = Pitches.classify(high, low);
      const label = classes.map(r => r.name).join(' / ');
      profileRef.current.high_range = high;
      profileRef.current.low_range = low;
      profileRef.current.range_class = label;
      profileRef.current.range_set = true;
      profileRef.current.SaveProfile();
      setMessage("a " + label);
      setPhase('done');
      return true;
    }
    return false;
  }

  const increment = useCallback(() => {
    setExpected(oldPitch => {
      setHigh_max(oldPitch.name);

      const newPitch = Pitches.increment(oldPitch);
      return newPitch;
    });
  }, []);

  const decrement = useCallback(() => {
    setExpected(oldPitch => {
      setLow_max(oldPitch.name);

      const newPitch = Pitches.decrement(oldPitch);
      return newPitch;
    });
  }, []);


  const evaluate = useCallback(() => {
      setListening(true);

      activeTimerRef.current = setTimeout(() => {
          setListening(false);
          setPhase('result');

          setAvgGrade(latestAvgGrade => {
              let done = false;
              if (latestAvgGrade >= 70) {
                  setMessage("Nice! Let's increment again.");
                  nextPitch(false);
              } else if(failCountRef.current >= 3){
                  setMessage("That's your top. Going lower.");
                  done = nextPitch(true);
              } else {
                  setMessage(latestAvgGrade.toFixed(0) + "% — Try again [insert breathing/vocalization tip]");
                  failCountRef.current += 1;
                  setFailCount(failCountRef.current);
              }
              if (!done) activeTimerRef.current = setTimeout(() => setPhase('idle'), 2000);
              return latestAvgGrade;
          });
      }, 3000);
  }, [setListening, setAvgGrade]);


  //playback effect
  useEffect(() =>{
    Pitches.setupPlayer();
    const loadProfile = async () => {
      await profileRef.current.RetreiveProfile();
      const p = profileRef.current;
      setExpected(p.high_range);
      setHigh_max(p.high_range.name);
      setLow_max(p.low_range.name);
    };
    loadProfile();
    return () => {}
  }, []);

  // THis is what you can copy/paste for grading on another game, this whole effect will update current note/hz grade and avgGrade.
   useEffect(() => {
    let subscription: any; 
  
    if(listening == true){
      try {
        PitchDetector.start();
        subscription = PitchDetector.addListener((value: { frequency: number, tone: string}) => {
          setHz(value.frequency); // the fqz of what you are singing
          setNote(value.tone);    // the name of the pitch you are singing. 
          let current = Grade.grade(expected.frequency, value.frequency, increasingRef.current ? 'sharp' : 'flat')
          setAvgGrade(prev => (prev + current) / 2);
          setGrade(current);

      });
        console.log("Pitch detection started.");
      } catch (e) {
        console.error("Failed to start pitch detector:", e);
      }
    }
    
    // The cleanup function
    return () => {
      // Check if the subscription object exists before trying to remove it
      if (subscription) {
        PitchDetector.stop();
        PitchDetector.removeListener();
        console.log("Pitch detection stopped and listener removed.");
      }
    };
  }, [listening]); 

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#16083dff' }}>

      {phase === 'idle' && (
        <>
          <TouchableOpacity style={[styles.backButton, { position: 'absolute', left: 10 }]} onPress={onBack}>
            <Image
              source={require('../static/back-arrow.png')}
              style={{ width: 20, height: 20, tintColor: '#ffffff' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.titleText}>Try to sing this pitch.</Text>
            <Text style={[styles.subtitleText, { marginTop: 16 }]}>Target: {Pitches.displayName(expected)}</Text>
            <Text style={[styles.bodyText, { color: '#d5dbe7ff', marginTop: 8 }]}>
              {Pitches.displayName(Pitches.noteToPitch(high_max))} — {Pitches.displayName(Pitches.noteToPitch(low_max))}
            </Text>
            <TouchableOpacity style={[styles.primaryButton, { marginTop: 40 }]} onPress={start}>
              <Text style={styles.backButtonText}>Start!</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {phase === 'active' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[styles.bodyText, { color: '#d5dbe7ff' }]}>Target</Text>
          <Text style={[styles.titleText, { fontSize: 64, marginTop: 4 }]}>{Pitches.displayName(expected)}</Text>
          <Text style={[styles.subtitleText, { color: '#2bc0a0ff', marginTop: 32 }]}>
            {listening ? Pitches.displayTone(note) : '...'}
          </Text>
          {listening && (
            <Text style={[styles.bodyText, { color: '#d5dbe7ff', marginTop: 8 }]}>
              {avgGrade.toFixed(0)}%
            </Text>
          )}
          <TouchableOpacity
            style={[styles.button, { marginTop: 48, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ffffff44' }]}
            onPress={surrender}
          >
            <Text style={[styles.buttonText, { color: '#ffffff88' }]}>My Voice is Straining.</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'result' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[styles.subtitleText, { textAlign: 'center', paddingHorizontal: 30 }]}>
            {message}
          </Text>
          <Text style={[styles.bodyText, { color: '#2bc0a0ff', marginTop: 10 }]}>
            {avgGrade.toFixed(0)}%
          </Text>
        </View>
      )}

      {phase === 'done' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[styles.bodyText, { color: '#d5dbe7ff' }]}>Your range is</Text>
          <Text style={[styles.titleText, { fontSize: 36, marginTop: 8 }]}>
            {low_max} to {high_max}
          </Text>
          <Text style={[styles.bodyText, { color: '#2bc0a0ff', marginTop: 12 }]}>
            that's like {message}
          </Text>
          <TouchableOpacity style={[styles.button, { marginTop: 40 }]} onPress={onComplete ?? onBack}>
            <Text style={styles.buttonText}>{onComplete ? 'Continue' : 'Done'}</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
};

export default SetRangeScreen;