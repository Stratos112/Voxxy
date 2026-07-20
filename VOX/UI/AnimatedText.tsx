import React, { useState, useEffect, useRef } from 'react';
import { Text, TextStyle } from 'react-native';

interface Props {
  text: string;
  speed?: number;
  style?: TextStyle | TextStyle[];
  onDone?: () => void;
  skip?: boolean;
}

const AnimatedText: React.FC<Props> = ({ text, speed = 38, style, onDone, skip }) => {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        onDone?.();
      }
    }, speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [text]);

  useEffect(() => {
    if (skip && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setDisplayed(text);
      onDone?.();
    }
  }, [skip]);

  return <Text style={style}>{displayed}</Text>;
};

export default AnimatedText;
