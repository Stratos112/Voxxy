/**
 * Pitch matching page for Voxxy app 
 * by @author Sky Vercauteren 
 * August 2025
**/

// TODO: PLay pitch!!!
// TODO: Different GUI (like a bubble in a level)

import React , {useState, useEffect} from 'react';
import { 
  SafeAreaView, 
  Text, 
  View,
  TouchableOpacity,
 } from 'react-native';
 import { PitchDetector } from 'react-native-pitch-detector';
 import styles, { pitchBoxHeight, pitchBoxWidth, heightRange } from './UI/styles';
 import { Pitch, Pitches } from './API/pitch';
 import { Profile } from './profile';

 interface PitchMatchScreenProps {
  onBack: () => void;
}

 //pitch match screen
const PitchMatchScreen: React.FC<PitchMatchScreenProps> = ({ onBack }) => {

    // can I do statehooks here?
    const [userProfile, setUserProfile] = useState(new Profile());
    const [position, setPosition] = useState(250);
    const [hz, setHz] = useState(0);
    const [note, setNote] = useState("C");
    const [pitchLine, setPitchLine] = useState<number[]>([]);
    const [targetLine, setTargetLine] = useState(440);
    const [targetText, setTargetText] = useState('A4');

    function setTarget(note: Pitch)
    {
      setTargetText(note.note);
      setTargetLine(note.frequency);
    }

    function newTarget() {
      const keys = userRange;
      const randomIndex = Math.floor(Math.random() * keys.length);
      const randomKey = keys[randomIndex];
      setTarget(randomKey);
    }

   useEffect(() => {
    // Define an async function inside useEffect
        const loadProfile = async () => {
            const user = new Profile();
            await user.RetreiveProfile(); // Now we wait for retrieval
            setUserProfile(user); // Update state with loaded data
        };
        loadProfile();
      }, []);

    useEffect(() => {
      let subscription: any; 
    try {
      PitchDetector.start();
      subscription = PitchDetector.addListener((value: { frequency: number, tone: string}) => {
        setPitchLine(prev => {
          const updated = [(heightRange) - Pitches.fqzToPosition(value.frequency) - 2, ...prev]; // - 2 is half of the tail block height, so the pitch goes through the center
            const MAX_LENGTH = 500;
            return updated.slice(0, MAX_LENGTH);
          });

        setHz(value.frequency);
        setNote(value.tone);
        let position = (heightRange) -Pitches. fqzToPosition(value.frequency) - 3; // - 3 is half of the pitch block height so the pitch goes through the center
        setPosition(position);

      });
      console.log("Pitch detection started.");
    } catch (e) {
      console.error("Failed to start pitch detector:", e);
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
  }, []); 

  const startPitch = userProfile.low_range;
  const endPitch = userProfile.high_range;
  const userRange: Pitch[] = React.useMemo(() => {
        if (!startPitch || !endPitch) return []; 
        
        return Pitches.allPitches.slice(
            Pitches.allPitches.findIndex(p => p.name === startPitch.name),
            Pitches.allPitches.findIndex(p => p.name === endPitch.name) + 1
        );
    }, [startPitch, endPitch]);

  return (
    <SafeAreaView style={styles.pitchmatchContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text> 
        </TouchableOpacity>
        <View style={{flexDirection:'row', marginBottom: 0}}>
          <Text style={[styles.titleText, {marginBottom: 2}]}>Pitch Match</Text> 
          <TouchableOpacity style={[styles.button, {width:'40%', height:'80%', margin:2, marginLeft:20, paddingVertical:5}]} onPress={newTarget}>
            <Text style={styles.backButtonText}>New Target</Text> 
          </TouchableOpacity>
        </View>
        
        <View style={styles.pitchBox}>
          {
            Pitches.allPitches.map((pitchObject) => (
              <View key={pitchObject.name} style={[styles.pitchGrid, {top:heightRange - Pitches.fqzToPosition(pitchObject.frequency)}]}></View>
            ))
          }
          <Text style={[styles.targetText, {top: (heightRange - 18) - Pitches.fqzToPosition(targetLine)}]}>{targetText}</Text>
          <View style={[styles.targetLine, {top: (heightRange - 2) - Pitches.fqzToPosition(targetLine)}]}/>
          <View style={[styles.pitchSquare, {top: position}]} />
          {
            pitchLine.map((item, index) => (
            <View
              key={index}
              style={[
                styles.pitchTail,
                {
                  position: 'absolute',
                  top: item,
                  left: pitchBoxWidth - (pitchBoxWidth/2) - index - 12, // optional horizontal spacing
                  opacity: 1 - index / (pitchLine.length *0.35)// fade effect
                }
              ]}></View>
          ))}

        </View>  
      <View style={styles.controls}>
        <Text style={styles.titleText}>
          Pitch: {Pitches.displayTone(note)}
        </Text>
      </View>
      <View style={styles.controls}>
        <Text style={styles.titleText}>
          {hz}
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default PitchMatchScreen;