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
 import styles, {pitchBoxWidth} from './UI/styles';
 import { Pitch, Pitches } from './API/pitch';
 import Dropdown from './UI/dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileProps{
  done: () => void;
  onRangeSetup: () => void;
  onShowTutorial?: () => void;
}

export class Profile {
  public name!: string;
  public low_range!: Pitch;
  public high_range!: Pitch;
  public range_class!: string;
  public range_set!: boolean;

  public prefer_sharps: boolean = true;

  constructor(){
    this.name = "username";
    this.range_class = "undecided";
    this.low_range = Pitches.C2;
    this.high_range = Pitches.C6;
    this.range_set = false;
    this.prefer_sharps = true;
  }

  public setClass(high:Pitch, low:Pitch){
    this.range_class = Pitches.classify(high, low).map(r => r.name).join(' / ');
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
            this.prefer_sharps = parsedData.prefer_sharps ?? true;
            Pitches.preferSharps = this.prefer_sharps;
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

const ProfileScreen: React.FC<ProfileProps> = ({done, onRangeSetup, onShowTutorial}) => {
  const [user, setUser] = useState(new Profile());
  const [name, setName] = useState<string>(user.name);
  const [low_range, setLow_range] = useState<string>(user.low_range.name);
  const [high_range, setHigh_range] = useState<string>(user.high_range.name);
  const [range_class, setRange_class] = useState<string>(user.range_class);
  const [preferSharps, setPreferSharps] = useState<boolean>(true);

   useEffect(() => {
        const loadProfile = async () => {
            const user = new Profile();
            await user.RetreiveProfile(); 
            setUser(user);
            setName(user.name);
            setLow_range(user.low_range.name);
            setHigh_range(user.high_range.name);
            setRange_class(user.range_class);
            setPreferSharps(user.prefer_sharps);
        };
        loadProfile();
        
    }, []);

  const checkReset = () => {
    if (user.high_range.name === Pitches.C4.name && user.low_range.name === Pitches.C4.name) {
      user.range_set = false;
      user.range_class = "undecided";
      setRange_class("undecided");
    }
  }

 const handleSetLowRange = (item: string | null) => {
    const validPitch = item ? Pitches.noteToPitch(item) : Pitches.C2;
    user.low_range = validPitch;
    user.setClass(user.high_range, validPitch);
    user.range_set = true;
    setLow_range(validPitch.name);
    setRange_class(user.range_class);
    checkReset();
    user.SaveProfile();
  }

  const handleSetHighRange = (item: string | null) => {
    const validPitch = item ? Pitches.noteToPitch(item) : Pitches.C6;
    user.high_range = validPitch;
    user.setClass(validPitch, user.low_range);
    user.range_set = true;
    setHigh_range(validPitch.name);
    setRange_class(user.range_class);
    checkReset();
    user.SaveProfile();
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

  const handleDebugReset = () => {
    user.low_range = Pitches.C4;
    user.high_range = Pitches.C4;
    user.range_set = false;
    user.range_class = "undecided";
    setLow_range(Pitches.C4.name);
    setHigh_range(Pitches.C4.name);
    setRange_class("undecided");
    user.SaveProfile();
  };

  const handleToggleAccidentals = () => {
    const next = !preferSharps;
    setPreferSharps(next);
    user.prefer_sharps = next;
    Pitches.preferSharps = next;
    user.SaveProfile();
  };

const lowRangeItems = React.useMemo(() => {
    return Pitches.filteredPitches()
        .filter(pitch => pitch.frequency <= user.high_range.frequency)
        .map(pitch => ({ label: pitch.name, value: pitch.name }));
}, [user, preferSharps]);

const highRangeItems = React.useMemo(() => {
    return Pitches.filteredPitches()
        .filter(pitch => pitch.frequency >= user.low_range.frequency)
        .map(pitch => ({ label: pitch.name, value: pitch.name }));
}, [user, preferSharps]);

  return (
    <View style={styles.profileContainer}>
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
          <Text style={styles.label}>Accidentals</Text>
          <View style={{ flexDirection: 'row', marginLeft: 10, marginTop: 4, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#2bc0a0ff', alignSelf: 'flex-start' }}>
            <TouchableOpacity
              onPress={handleToggleAccidentals}
              style={{ paddingVertical: 6, paddingHorizontal: 16, backgroundColor: preferSharps ? '#2bc0a0ff' : 'transparent' }}
            >
              <Text style={{ color: preferSharps ? '#16083dff' : '#2bc0a0ff', fontWeight: 'bold' }}>Sharps</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleToggleAccidentals}
              style={{ paddingVertical: 6, paddingHorizontal: 16, backgroundColor: !preferSharps ? '#2bc0a0ff' : 'transparent' }}
            >
              <Text style={{ color: !preferSharps ? '#16083dff' : '#2bc0a0ff', fontWeight: 'bold' }}>Flats</Text>
            </TouchableOpacity>
          </View>
          </View>
          <TouchableOpacity style={[styles.button, {backgroundColor:"#09c9b9ff", left:10}]} onPress={onRangeSetup}>
            <Text >Determine Your Range</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, {backgroundColor:"#3a1a1a", borderWidth:1, borderColor:"#ff4444", left:10, marginTop:6}]} onPress={handleDebugReset}>
            <Text style={{color:"#ff4444", fontSize:12}}>⚠ Reset Profile [DEBUG]</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, {backgroundColor:"transparent", borderWidth:1, borderColor:"#2bc0a0ff", left:10, marginTop:6}]} onPress={onShowTutorial}>
            <Text style={{color:"#2bc0a0ff", fontSize:13}}>Show tutorial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, {left: 10 + pitchBoxWidth * 0.2, marginTop: 6, width: '40%'}]} onPress={handleDone}>
            <Text style={styles.backButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
    </View>
  );
};

export default ProfileScreen;