/**
 * range determination page for Voxxy app 
 * used by the profile section
 * by @author Sky Vercauteren 
 * August 2025
**/

//TODO: 
// - play pitch
// - show target
// - if score is good enough for long enough (how to check??) - increment pitch
// - if score is bad enough for long enough (how to check??) - say "try again!"
// - if failed twice in a row- -> set pitch as range!! 
// Some Kind of visual?? 

import React , {useState, useEffect, useCallback, useRef} from 'react';
import { 
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

import Sound from 'react-native-sound';

 interface setRangeScreenProps {
  onBack: () => void;
}


 //pitch match screen
const SetRangeScreen: React.FC<setRangeScreenProps> = ({ onBack }) => { 

  const profileRef = useRef(new Profile());
  const increasingRef = useRef(true);

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
  
  Sound.setCategory('Playback');
  
  function start(){
    setListening(false);
    setAvgGrade(0.0);
    setPhase('active');
    expected.play();
    const timerId = setTimeout(() => {
      evaluate();
    }, 3000);
  }

  function nextPitch(pivot:boolean): boolean {
    if(increasing && !pivot){
      setFailCount(0);
      increment();
    } else if(increasing && pivot){
      setFailCount(0);
      setIncreasing(false);
      increasingRef.current = false;
      setExpected(profileRef.current.low_range);
    } else if(!increasing && !pivot){
      setFailCount(0);
      decrement();
    } else if(!increasing && pivot){
      let high = Pitches.noteToPitch(high_max);
      let low = Pitches.noteToPitch(low_max);
      const classification = Pitches.classify(high, low);
      profileRef.current.high_range = high;
      profileRef.current.low_range = low;
      profileRef.current.range_class = classification.name;
      profileRef.current.range_set = true;
      profileRef.current.SaveProfile();
      setMessage("Congrats, you're a " + classification.name + "!");
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

      const timerId = setTimeout(() => {
          setListening(false);
          setPhase('result');

          setAvgGrade(latestAvgGrade => {
              let done = false;
              if (latestAvgGrade >= 70) {
                  setMessage("Nice! Moving up.");
                  nextPitch(false);
              } else if(failCount >= 3){
                  setMessage("That's your top. Going lower.");
                  done = nextPitch(true);
              } else {
                  setMessage(latestAvgGrade.toFixed(0) + "% — Try again [insert breathing/vocalization tip]");
                  setFailCount(failCount + 1);
              }
              if (!done) setTimeout(() => setPhase('idle'), 2000);
              return latestAvgGrade;
          });
      }, 3000);

    return () => clearTimeout(timerId);
  }, [setListening, setAvgGrade, failCount]);


  //playback effect
  useEffect(() =>{
    Pitches.loadAll();
    const loadProfile = async () => {
      await profileRef.current.RetreiveProfile();
      const p = profileRef.current;
      setExpected(p.high_range);
      setHigh_max(p.high_range.name);
      setLow_max(p.low_range.name);
    };
    loadProfile();
    return () => {
      Pitches.releaseAll();
    }
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
          setAvgGrade((grade + current) / 2);
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
          <TouchableOpacity style={[styles.backButton, { position: 'absolute', right: 10 }]} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.titleText}>Range Determination</Text>
            <Text style={[styles.subtitleText, { marginTop: 16 }]}>Target: {expected.name}</Text>
            <Text style={[styles.bodyText, { color: '#d5dbe7ff', marginTop: 8 }]}>
              {high_max} — {low_max}
            </Text>
            <TouchableOpacity style={[styles.button, { marginTop: 40 }]} onPress={start}>
              <Text style={styles.buttonText}>Start!</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {phase === 'active' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[styles.bodyText, { color: '#d5dbe7ff' }]}>Target</Text>
          <Text style={[styles.titleText, { fontSize: 64, marginTop: 4 }]}>{expected.name}</Text>
          <Text style={[styles.subtitleText, { color: '#2bc0a0ff', marginTop: 32 }]}>
            {listening ? note : '...'}
          </Text>
          {listening && (
            <Text style={[styles.bodyText, { color: '#d5dbe7ff', marginTop: 8 }]}>
              {avgGrade.toFixed(0)}%
            </Text>
          )}
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
          <Text style={[styles.titleText, { textAlign: 'center', paddingHorizontal: 24 }]}>
            {message}
          </Text>
          <Text style={[styles.bodyText, { color: '#d5dbe7ff', marginTop: 20 }]}>
            {high_max} — {low_max}
          </Text>
          <TouchableOpacity style={[styles.button, { marginTop: 40 }]} onPress={onBack}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
};

export default SetRangeScreen;