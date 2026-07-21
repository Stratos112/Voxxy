import React from 'react';
import { Text, View, TextStyle, StyleSheet } from 'react-native';

interface Props {
  style?: TextStyle | TextStyle[];
  children: string;
}

const OFFSETS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const OutlinedText: React.FC<Props> = ({ style, children }) => {
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <View>
      {OFFSETS.map(([x, y]) => (
        <Text
          key={`${x},${y}`}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[flat, { color: '#000000', position: 'absolute', top: y, left: x }]}
        >
          {children}
        </Text>
      ))}
      <Text style={[flat, { color: '#ffffff' }]}>{children}</Text>
    </View>
  );
};

export default OutlinedText;
