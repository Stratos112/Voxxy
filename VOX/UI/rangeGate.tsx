import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './styles';

interface RangeGateProps {
  onSetRange: () => void;
  onBack: () => void;
}

const RangeGate: React.FC<RangeGateProps> = ({ onSetRange, onBack }) => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={[styles.subtitleText, { textAlign: 'center', paddingHorizontal: 40, marginBottom: 4 }]}>
      Your vocal range hasn't been set yet.
    </Text>
    <Text style={[styles.bodyText, { color: '#d5dbe7ff', textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 }]}>
      Complete the range game first to unlock this activity.
    </Text>
    <TouchableOpacity style={[styles.button, { width: '55%' }]} onPress={onSetRange}>
      <Text style={styles.buttonText}>Play Range Game</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={onBack} style={{ marginTop: 12 }}>
      <Text style={[styles.bodyText, { color: '#d5dbe7ff' }]}>Go Back</Text>
    </TouchableOpacity>
  </View>
);

export default RangeGate;
