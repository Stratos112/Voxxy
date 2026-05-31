/**
 * Main page for Voxxy app 
 * Collaborators include Reesie Lane and Sean Thornton :)
 * This is a demo comment for committing.
 * by @author Sky Vercauteren 
 * August 2025
**/

import React , {useState, useEffect} from 'react';
import { 
  Button, 
  Image,
  SafeAreaView, 
  Text, 
  View,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
 } from 'react-native';

import styles, { pitchBoxWidth } from './VOX/UI/styles';
import RangeGate from './VOX/UI/rangeGate';
import PitchMatchScreen from './VOX//pitchmatch';
import IntervalScreen from './VOX//intervals';
import SequenceScreen from './VOX//sequences';
import SetRangeScreen from './VOX/setrange';
import ProfileScreen, {Profile} from './VOX/profile';

//Everything happens in here?
const App = () => { 

  const user = new Profile();

    // Function to request microphone permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to record audio.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Microphone permission granted');
        } else {
          console.log('Microphone permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // The empty dependency array [] ensures it only runs once on mount.
  useEffect(() => {
    requestPermissions();
    user.RetreiveProfile().then(() => setRangeSet(user.range_set));
  }, []);
  
  const [rangeSet, setRangeSet] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('main');
  const [profileScreen, setProfileScreen] = useState(false);

  // This will be called when the "Pitch Match" button is pressed.
  const handlePitchMatchPress = () => {
    setCurrentScreen('pitchMatch');
  };

  const handleSetRangePress = () => {
    setCurrentScreen('setRange');
  }

  //when Interval button is pressed
  const handleIntervalsPress = () => {
    setCurrentScreen('intervals');
  };

  //when sequence is pressed
  const handleSequencePress = () => {
    setCurrentScreen('sequence');
  };

  const handleGoBack = () => {
    user.RetreiveProfile().then(() => setRangeSet(user.range_set));
    setCurrentScreen('main');
  };

  const handleProfile = () =>{
    if(profileScreen == true){
      user.RetreiveProfile().then(() => setRangeSet(user.range_set));
      setProfileScreen(false);
    }else{
      setProfileScreen(true);
      user.RetreiveProfile();
    }
  };

  switch(currentScreen){
    case 'setRange':
      return <SetRangeScreen onBack={handleGoBack} />;
    case 'pitchMatch':
      return <View style={{ flex: 1 }}><PitchMatchScreen onBack={handleGoBack} />{!rangeSet && <RangeGate onSetRange={handleSetRangePress} onBack={handleGoBack} />}</View>;
    case 'intervals':
      return <View style={{ flex: 1 }}><IntervalScreen onBack={handleGoBack} />{!rangeSet && <RangeGate onSetRange={handleSetRangePress} onBack={handleGoBack} />}</View>;
    case 'sequence':
      return <View style={{ flex: 1 }}><SequenceScreen onBack={handleGoBack} />{!rangeSet && <RangeGate onSetRange={handleSetRangePress} onBack={handleGoBack} />}</View>;
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      {!profileScreen && 
          <TouchableOpacity onPress={handleProfile} style={{position:'absolute'}}>
            <Image source={require('./static/gear.png')} style={styles.settingsButton}/>
          </TouchableOpacity>
        }
      <View style={styles.mainContent}>
        <Text style={styles.titleText}>Voxxy</Text>
        
        {/* The buttons for handle changing screens*/}
        <TouchableOpacity style={styles.button} onPress={handleSetRangePress}>
          <Text style={styles.buttonText}>Determine Range</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handlePitchMatchPress}>
          <Text style={styles.buttonText}>Pitch Match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleIntervalsPress}>
          <Text style={styles.buttonText}>Interval Training</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleSequencePress}>
          <Text style={styles.buttonText}>Sequences</Text>
        </TouchableOpacity>
      </View>
      {profileScreen && <ProfileScreen done={handleProfile}/>}
    </SafeAreaView>
  );
};

export default App;
