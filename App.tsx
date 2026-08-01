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
  useWindowDimensions,
 } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

import { Pitches } from './VOX/API/pitch';
import styles, { pitchBoxWidth } from './VOX/UI/styles';
import RangeGate from './VOX/UI/rangeGate';
import PitchMatchScreen from './VOX//pitchmatch';
import IntervalScreen from './VOX//intervals';
import SequenceScreen from './VOX//sequences';
import SetRangeScreen from './VOX/setrange';
import RangeSetupScreen from './VOX/rangesetup';
import ProfileScreen, {Profile} from './VOX/profile';
import FoxxyScreen from './VOX/foxxy';

//Everything happens in here?
const App = () => {

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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
      if (!user.range_set) { setShowOnboarding(true); setOnboardingFlow(true); }
    });
  }, []);

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRangeBridge, setShowRangeBridge] = useState(false);
  const [showFinalFoxxy, setShowFinalFoxxy] = useState(false);
  const [onboardingFlow, setOnboardingFlow] = useState(false);
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

  const handleRangeSetupComplete = () => {
    setCurrentScreen('main');
    setShowRangeBridge(true);
  };

  const handleSetRangeComplete = () => {
    setOnboardingFlow(false);
    setCurrentScreen('main');
    setShowFinalFoxxy(true);
  };

  const handleShowTutorial = () => {
    setProfileScreen(false);
    setShowFinalFoxxy(true);
  };

  switch(currentScreen){
    case 'rangeSetup':
      return <RangeSetupScreen onBack={handleGoBack} onSetRange={handleRangeSetupComplete} />;
    case 'setRange':
      return <SetRangeScreen onBack={handleGoBack} onComplete={onboardingFlow ? handleSetRangeComplete : undefined} />;
    case 'pitchMatch':
      return <View style={{ flex: 1 }}><PitchMatchScreen onBack={handleGoBack} />{!rangeSet && <RangeGate onSetRange={handleSetRangePress} onBack={handleGoBack} />}</View>;
    case 'intervals':
      return <View style={{ flex: 1 }}><IntervalScreen onBack={handleGoBack} />{!rangeSet && <RangeGate onSetRange={handleSetRangePress} onBack={handleGoBack} />}</View>;
    case 'sequence':
      return <View style={{ flex: 1 }}><SequenceScreen onBack={handleGoBack} />{!rangeSet && <RangeGate onSetRange={handleSetRangePress} onBack={handleGoBack} />}</View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#2cf7baff' }}>
      <SafeAreaView style={styles.mainContainer}>
        {showOnboarding && profileLoaded && (
          <FoxxyScreen
            onDone={() => setShowOnboarding(false)}
            onRangeSetup={() => { setShowOnboarding(false); setCurrentScreen('rangeSetup'); }}
          />
        )}
        {showRangeBridge && (
          <FoxxyScreen
            bridgeMode
            bridgeDialog={[
              "Nice work! We have a rough idea of your range.",
              "Try to hit one note at a time on the edge of your range.",
            ]}
            finalLabel="Let's do it ▶"
            onDone={() => { setShowRangeBridge(false); setCurrentScreen('setRange'); }}
            onRangeSetup={() => {}}
          />
        )}
        {showFinalFoxxy && (
          <FoxxyScreen
            finalMode
            onDone={() => { setShowFinalFoxxy(false); user.RetreiveProfile().then(() => setRangeSet(user.range_set)); }}
            onRangeSetup={() => {}}
          />
        )}
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
        {profileScreen && <ProfileScreen done={handleProfile} onRangeSetup={handleRangeSetupPress} onShowTutorial={handleShowTutorial}/>}
      </SafeAreaView>
      {!profileScreen &&
        <TouchableOpacity onPress={handleProfile} style={{ position: 'absolute', top: 45, right: isLandscape ? width * 0.1 : 10, padding: 10, zIndex: 10 }}>
          <Image source={require('./static/gear.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
        </TouchableOpacity>
      }
    </View>
  );
};

export default App;
