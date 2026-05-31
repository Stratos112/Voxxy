/**
 * Profile page for Voxxy App.
 * by @author Sky Vercauteren 
 * August 2025
**/

import React , {useState, useEffect} from 'react';
import { 
  Text, 
  View,
  TouchableOpacity,
  TextInput
 } from 'react-native';
 import SetRangeScreen from './setrange';
 import styles, {pitchBoxWidth} from './UI/styles';
 import { Pitch, Pitches } from './API/pitch';
 import Dropdown from './UI/dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileProps{
  done: () => void;
}

export class Profile {
  public name!: string;
  public low_range!: Pitch;
  public high_range!: Pitch;
  public range_class!: string;
  public range_set!: boolean;

  constructor(){
    this.name = "username";
    this.range_class = "undecided";
    this.low_range = Pitches.C2;
    this.high_range = Pitches.C6;
    this.range_set = false;
  }

  public setClass(high:Pitch, low:Pitch){
    this.range_class = Pitches.classify(high, low).name;
  }

  public RetreiveProfile = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('user_profile');
        if(jsonValue != null) {
          const parsedData = JSON.parse(jsonValue);
          this.name = parsedData.name;

          const savedLowRangeName = parsedData.low_range?.name;
          const savedHighRangeName = parsedData.high_range?.name;
            
            this.low_range = savedLowRangeName ? Pitches.noteToPitch(savedLowRangeName)
              : Pitches.C2;

            this.high_range = savedHighRangeName ? Pitches.noteToPitch(savedHighRangeName)
              : Pitches.C6;

            this.range_class = parsedData.range_class || "undecided";
            this.range_set = parsedData.range_set || false;
        }
      } catch (e) {
        console.error('Error loading user data:', e);
      }
    };

  public SaveProfile = async () => {
    try {
      const jsonValue = JSON.stringify(this); 
      await AsyncStorage.setItem('user_profile', jsonValue);
      console.log('User data saved successfully.', jsonValue);
    } catch (e) {
      console.error('Error saving user data:', e);
    }
  }
}

const ProfileScreen: React.FC<ProfileProps> = ({done}) => {
  const [user, setUser] = useState(new Profile());
  const [name, setName] = useState<string>(user.name);
  const [low_range, setLow_range] = useState<string>(user.low_range.name);
  const [high_range, setHigh_range] = useState<string>(user.high_range.name);
  const [range_class, setRange_class] = useState<string>(user.range_class);
  const [rangeGame, setRangeGame] = useState<boolean>(false);

   useEffect(() => {
        const loadProfile = async () => {
            const user = new Profile();
            await user.RetreiveProfile(); 
            setUser(user);
            setName(user.name);
            setLow_range(user.low_range.name);
            setHigh_range(user.high_range.name);
            setRange_class(user.range_class);
        };
        loadProfile();
        
    }, []);

 const handleSetLowRange = (item: string | null) => {
    const validPitch = item ? Pitches.noteToPitch(item) : Pitches.C2;
    user.low_range = validPitch;
    user.setClass(user.high_range, validPitch);
    user.range_set = true;
    setLow_range(validPitch.name);
    setRange_class(user.range_class);
    user.SaveProfile();
  }

  const handleSetHighRange = (item: string | null) => {
    const validPitch = item ? Pitches.noteToPitch(item) : Pitches.C6;
    user.high_range = validPitch;
    user.setClass(validPitch, user.low_range);
    user.range_set = true;
    setHigh_range(validPitch.name);
    setRange_class(user.range_class);
    user.SaveProfile();
  }

  const handleSetRangeGame = () => {
    if(rangeGame == true)
    {
      setRangeGame(false);
    }else{
      setRangeGame(true);
    }
  }

  const setProfile = () => {
    user.name = name;
    user.high_range = Pitches.noteToPitch(high_range);
    user.low_range = Pitches.noteToPitch(low_range);
    user.SaveProfile();
    Pitches.setRange();
  }

  const handleDone = () => {
    setProfile();
    done();
  }


const lowRangeItems = React.useMemo(() => {
    return Pitches.allPitches
        .filter(pitch => pitch.frequency <= user.high_range.frequency)
        .map(pitch => ({ label: pitch.name, value: pitch.name }));
}, [user]);

const highRangeItems = React.useMemo(() => {
    return Pitches.allPitches
        .filter(pitch => pitch.frequency >= user.low_range.frequency)
        .map(pitch => ({ label: pitch.name, value: pitch.name })); 
}, [user]);

  return (
    <View style={styles.profileContainer}>
      {rangeGame && <SetRangeScreen onBack={handleSetRangeGame} /> }
      {!rangeGame &&
        <View style={styles.profileContainer}>
          <Text style={[styles.titleText,{marginTop:40}]}>Profile</Text>
          <View style={styles.form}>
          <Text style={styles.label}>Enter your name:</Text>
          <TextInput
            style={[styles.input,{marginBottom:10}]}
            onChangeText={newText => setName(newText)}
            value={name}
            placeholder={name}
          />
          <Text style={styles.label}>Vocal Range: Lowest Note</Text>
          <Dropdown 
            placeholder={low_range || "Select Low Note"} 
            items={lowRangeItems}
            value={low_range}
            onChangeValue ={handleSetLowRange}
          />
          <Text style={styles.label}>Vocal Range: Highest Note</Text>
          <Dropdown
            placeholder={high_range || "Select High Note"}
            items={highRangeItems}
            value={high_range}
            onChangeValue ={item => handleSetHighRange(item)}
          />
          <Text style={styles.label}>Voice Type</Text>
          <Text style={[styles.subtitleText, {color:'#2bc0a0ff', marginLeft:10}]}>{range_class}</Text>
          </View>
          <TouchableOpacity style={[styles.button, {backgroundColor:"#09c9b9ff", left:10}]} onPress={handleSetRangeGame}>
            <Text >Determine Your Range</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, {position:'absolute', bottom:80, left:(pitchBoxWidth/2)-30}]} onPress={handleDone}>
            <Text >Done</Text>
          </TouchableOpacity>
        </View>
      }
      
    </View>
  );
};

export default ProfileScreen;