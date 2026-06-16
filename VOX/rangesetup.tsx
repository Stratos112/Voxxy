import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import styles from './UI/styles';

interface RangeSetupProps {
  onBack: () => void;
  onSetRange: () => void;
}

const RangeSetupScreen: React.FC<RangeSetupProps> = ({ onBack, onSetRange }) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#16083dff' }}>
      <TouchableOpacity style={[styles.backButton, { position: 'absolute', right: 10, top: 10 }]} onPress={onBack}>
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.titleText}>Range Setup</Text>
      </View>
      <TouchableOpacity style={[styles.button, { alignSelf: 'center', marginBottom: 40 }]} onPress={onSetRange}>
        <Text style={styles.buttonText}>Determine My Range</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default RangeSetupScreen;
