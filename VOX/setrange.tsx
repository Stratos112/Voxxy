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

import React , {useState, useEffect, useCallback} from 'react';
import { 
  SafeAreaView, 
  Text, 
  View,
  TouchableOpacity,
 } from 'react-native';
import { PitchDetector } from 'react-native-pitch-detector';
import { Pitches } from './API/pitches';
import {Grade} from './API/grade';
import { Profile } from './profile';
import styles from './UI/styles';
import BackButton from './UI/backButton';

import Sound from 'react-native-sound';
import { Range_Class } from './API/ranges';

 interface setRangeScreenProps {
  onBack: () => void;
}


 //pitch match screen
const SetRangeScreen: React.FC<setRangeScreenProps> = ({ onBack }) => { 

  const [hz, setHz] = useState(0);
  const [note, setNote] = useState("C4");
  const [low_max, setLow_max] = useState("C4");
  const [high_max, setHigh_max] = useState("C4");
  const [expected, setExpected] = useState(Pitches.C4);
  const [grade, setGrade] = useState(1.0);
  const [failCount, setFailCount] = useState(0);
  const [increasing, setIncreasing] = useState(true);
  const [message, setMessage] = useState('');
  const [avgGrade, setAvgGrade] = useState(0.0);
  const [tonality, setTonality] = useState(0);
  const [listening, setListening] = useState(false);
  
  Sound.setCategory('Playback');
  
  function start(){
    // Stop listening
    setListening(false);
    setAvgGrade(0.0);
    //play current target
    expected.play();
    
    //wait for note to finish before listening
    const timerId = setTimeout(() => {
          evaluate();
      }, 3000);
  }

  function nextPitch(pivot:boolean){
    //if they passed going up
    if(increasing && !pivot){
      setFailCount(0);
      increment();
    }//if they fail going up
    else if(increasing && pivot){
      setFailCount(0);
      setIncreasing(false);
      setExpected(Pitches.C4);
    }//if they succeed going down.
    else if(!increasing && !pivot){
      setFailCount(0);
      decrement();
    }else if(!increasing && pivot){
      let high = Pitches.noteToPitch(high_max);
      let low = Pitches.noteToPitch(low_max);
      setMessage("Congrats, you're a "+Range_Class.classify(high, low));
      //TODO Save range to profile.
      // end activity. 
    }
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

          //woah, so apparently there is an internal promise to force the most current version of a hook through the setter, so I can read it from the setter, then set it to the same value without changing it. 
          setAvgGrade(latestAvgGrade => {
              if (latestAvgGrade >= 70) { 
                  pass(latestAvgGrade)
              } else if(failCount >=3){
                  pivot();
              } else {
                  // if you are sharp on the way up, or flat on the way down, its a pass.
                  if ((increasing && tonality == 1) || (!increasing && tonality == -1)) {
                    pass(latestAvgGrade);
                  }
                  fail(latestAvgGrade);
              }
              // We return the same value because we just wanted to read it, not change it.
              return latestAvgGrade; 
          });
      }, 3000); 

    return () => clearTimeout(timerId);
  }, [setListening, setAvgGrade, failCount]);

  function pass(latestAvgGrade: number){
    setMessage("Your got "+ latestAvgGrade.toFixed(2) + "! Great job, lets adjust the pitch!")
    nextPitch(false);
  }

  function pivot(){ 
    setMessage("Ok that must be the edge of your range, lets go the other way.");
    nextPitch(true);
  }

  function fail(latestAvgGrade: number){  
    setMessage("Your grade was "+ latestAvgGrade.toFixed(2) + ", hmmm keep working at it!")
    setFailCount(failCount+1);
  }

  //playback effect
  useEffect(() =>{
    Pitches.loadAll();
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
          let current = Grade.grade(expected.frequency, value.frequency);
          let tone = (value.frequency < expected.frequency)?-1:0;
          tone = (value.frequency > expected.frequency)?1:tone;
          tone = (value.frequency == expected.frequency)?0:tone;
          setTonality(tone);
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
    <SafeAreaView style={{top:25}}>
        <TouchableOpacity style={[styles.backButton, { position:"absolute", right:10}]} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text> 
        </TouchableOpacity>
        <View style={{flexDirection:'row', marginBottom:0}}>
          <Text style={[styles.titleText, {marginBottom: 2}]}>Range Game</Text> 
        </View>
      <View style={styles.controls}>
        <Text style={styles.subtitleText}>
          Expected: {expected.name}
        </Text>
      </View>
      <View style={styles.controls}>
        <Text style={styles.subtitleText}>
          Grade: {avgGrade}
        </Text>
      </View>
      <View style={styles.dividerBox}>
        <Text style={[styles.bodyText, {color:'#d5dbe7ff'}]}>Your Current Pitch:</Text>
        <View style={styles.controls}>
          <Text style={styles.subtitleText}>
            Pitch: {note}
          </Text>
        </View>
        <View style={styles.controls}>
          <Text style={styles.subtitleText}>
            Fqz: {hz}
          </Text>
        </View>
      </View>
      <View style={styles.controls}>
          <Text style={[styles.bodyText, {color:'#2bc0a0ff', marginLeft:10}]}>
            {message}
          </Text>
      </View>
      <View style={styles.dividerBox}>
        <Text style={[styles.bodyText, {color:'#d5dbe7ff'}]}>Your Range:</Text>
        <View style={styles.controls}>
          <Text style={styles.subtitleText}>
            Highest: {high_max}
          </Text>
        </View>
        <View style={styles.controls}>
          <Text style={styles.subtitleText}>
            Lowest: {low_max}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.button]} onPress={start}>
          <Text style={styles.buttonText}>Start!</Text> 
        </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SetRangeScreen;