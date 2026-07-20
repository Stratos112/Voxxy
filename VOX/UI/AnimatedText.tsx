import React, { useState, useEffect, useRef } from 'react';
import { Text, TextStyle } from 'react-native';

interface Props {
  text: string;
  speed?: number;
  style?: TextStyle | TextStyle[];
  onDone?: () => void;
}

const AnimatedText: React.FC<Props> = ({ text, speed = 38, style, onDone }) => {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;
    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return <Text style={style}>{displayed}</Text>;
};

export default AnimatedText;
