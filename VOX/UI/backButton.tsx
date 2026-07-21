/**
 * simple back button interface
 * @author Sky Vercauteren 2025
 */

import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import styles from './styles';

interface props {
  onBack: () => void;
}

const BackButton: React.FC<props> = ({ onBack }) => {
  return (
    <TouchableOpacity style={styles.backButton} onPress={onBack}>
      <Image
        source={require('../../static/back-arrow.png')}
        style={{ width: 20, height: 20, tintColor: '#ffffff' }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

export default BackButton;
