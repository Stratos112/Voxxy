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
 } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

import styles, { pitchBoxWidth } from './VOX/UI/styles';
import RangeGate from './VOX/UI/rangeGate';
import PitchMatchScreen from './VOX//pitchmatch';
import IntervalScreen from './VOX//intervals';
import SequenceScreen from './VOX//sequences';
import SetRangeScreen from './VOX/setrange';
import RangeSetupScreen from './VOX/rangesetup';
import ProfileScreen, {Profile} from './VOX/profile';
import OnboardingScreen from './VOX/onboarding';

//Everything happens in here?
const App = () => { 

  const user = new Profile();

  const requestPermissions = async () => {
    const permission = Platform.select({
      android: PERMISSIONS.ANDROID.RECORD_AUDIO,
      ios: PERMISSIONS.IOS.MICROPHONE,
    });
    if (!permission) return;
    const status = await check(permission);
    if (status === RESULTS.DENIED) {
      await request(permission);
    }
  };

  // The empty dependency array [] ensures it only runs once on mount.
  useEffect(() => {
    Pitches.setupPlayer();
    requestPermissions();
    user.RetreiveProfile().then(() => {
      setRangeSet(user.range_set);
      setProfileLoaded(true);
      if (!user.range_set) setShowOnboarding(true);
    });
  }, []);

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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

  const handleRangeSetupPress = () => {
    setProfileScreen(false);
    setCurrentScreen('rangeSetup');
  };

  switch(currentScreen){
    case 'rangeSetup':
      return <RangeSetupScreen onBack={handleGoBack} onSetRange={handleSetRangePress} />;
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
      {showOnboarding && profileLoaded && (
        <OnboardingScreen
          onDone={() => setShowOnboarding(false)}
          onRangeSetup={() => { setShowOnboarding(false); setCurrentScreen('rangeSetup'); }}
        />
      )}
      {!profileScreen &&
          <TouchableOpacity onPress={handleProfile} style={{position:'absolute'}}>
            <Image source={require('./static/gear.png')} style={styles.settingsButton}/>
          </TouchableOpacity>
        }
      <View style={styles.mainContent}>
        <Text style={styles.titleText}>Voxxy</Text>
        
        {/* The buttons for handle changing screens*/}
        <TouchableOpacity style={styles.button} onPress={handleSetRangePress}>
          <Text style={styles.buttonText}>Range Expansion</Text>
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
      {profileScreen && <ProfileScreen done={handleProfile} onRangeSetup={handleRangeSetupPress}/>}
    </SafeAreaView>
  );
};

export default App;
