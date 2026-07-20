import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import styles from './styles';

interface Props {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}

const NextButton: React.FC<Props> = ({ onPress, label = 'Next ▶', disabled = false }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[styles.button, { opacity: disabled ? 0.25 : 1, alignSelf: 'flex-end', marginTop: 24 }]}
  >
    <Text style={styles.buttonText}>{label}</Text>
  </TouchableOpacity>
);

export default NextButton;
