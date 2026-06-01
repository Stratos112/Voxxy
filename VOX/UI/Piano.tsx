import React, { useState } from 'react';
import { View, Image, LayoutChangeEvent } from 'react-native';
import { Pitch } from '../API/pitch';

type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface PianoProps {
  pressedKeys?: string[];  // e.g. ['C4', 'E4', 'G4', 'C#3']
  octaves?: number[];      // explicit octave range, e.g. [3, 4, 5] — auto-derived if omitted
}

const WHITE_KEYS: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS: NoteName[] = ['C#', 'D#', 'F#', 'G#', 'A#'];
const ADJACENT_WHITE_PAIRS = ['C-D', 'D-E', 'E-F', 'F-G', 'G-A', 'A-B'] as const;

// Asset dimensions: all piano PNGs are 420x224
const ASSET_ASPECT = 420 / 224;

const BASE = require('../../static/piano/Paino.png');

const BLACK_UNPRESSED: Record<string, any> = {
  'C#': require('../../static/piano/Cs.png'),
  'D#': require('../../static/piano/Ds.png'),
  'F#': require('../../static/piano/Fs.png'),
  'G#': require('../../static/piano/Gs.png'),
  'A#': require('../../static/piano/As.png'),
};

const BLACK_PRESSED: Record<string, any> = {
  'C#': require('../../static/piano/Cs_pressed.png'),
  'D#': require('../../static/piano/Ds_pressed.png'),
  'F#': require('../../static/piano/Fs_pressed.png'),
  'G#': require('../../static/piano/Gs_pressed.png'),
  'A#': require('../../static/piano/As_pressed.png'),
};

const WHITE_PRESSED: Record<string, any> = {
  'C': require('../../static/piano/C_pressed.png'),
  'D': require('../../static/piano/D_pressed.png'),
  'E': require('../../static/piano/E_pressed.png'),
  'F': require('../../static/piano/F_pressed.png'),
  'G': require('../../static/piano/G_pressed.png'),
  'A': require('../../static/piano/A_pressed.png'),
  'B': require('../../static/piano/B_pressed.png'),
};

const BOTH_PRESSED: Record<string, any> = {
  'C-D': require('../../static/piano/C-D_both-pressed.png'),
  'D-E': require('../../static/piano/D-E_both-pressed.png'),
  'E-F': require('../../static/piano/E-F_both-pressed.png'),
  'F-G': require('../../static/piano/F-G_both-pressed.png'),
  'G-A': require('../../static/piano/G-A_both-pressed.png'),
  'A-B': require('../../static/piano/A-B_both-pressed.png'),
  'B-C': require('../../static/piano/B-C_both-pressed.png'),
};

const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

export function pitchToKey(pitch: Pitch): string {
  const match = pitch.name.match(/^([A-G]b?)(\d+)$/);
  if (!match) return pitch.name;
  const note = FLAT_TO_SHARP[match[1]] ?? match[1];
  return `${note}${match[2]}`;
}

export function pitchesToKeys(pitches: Pitch[]): string[] {
  return pitches.map(pitchToKey);
}

function parseNote(note: string): { name: NoteName; octave: number } | null {
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return null;
  return { name: match[1] as NoteName, octave: parseInt(match[2]) };
}

function deriveOctaves(pressedKeys: string[]): number[] {
  if (pressedKeys.length === 0) return [4];
  const nums = pressedKeys.map(parseNote).filter(Boolean).map(n => n!.octave);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

const Piano: React.FC<PianoProps> = ({ pressedKeys = [], octaves }) => {
  const [containerWidth, setContainerWidth] = useState(0);

  const octaveList = octaves ?? deriveOctaves(pressedKeys);
  const numOctaves = Math.max(octaveList.length, 1);

  const pressedSet = new Set(pressedKeys);
  const isPressed = (name: NoteName, octave: number) => pressedSet.has(`${name}${octave}`);

  const octaveW = containerWidth / numOctaves;
  const containerH = (octaveW * numOctaves) / (ASSET_ASPECT * numOctaves);

  const img = (source: any, x: number, w: number, key: string) => (
    <Image
      key={key}
      source={source}
      style={{ position: 'absolute', left: x, top: 0, width: w, height: containerH }}
      resizeMode="stretch"
    />
  );

  const layers: React.ReactElement[] = [];

  if (containerWidth > 0) {
    octaveList.forEach((octave, idx) => {
      const x = idx * octaveW;

      // 1. White key base
      layers.push(img(BASE, x, octaveW, `base-${octave}`));

      // 2. Pressed white keys
      WHITE_KEYS.forEach(key => {
        if (isPressed(key as NoteName, octave)) {
          layers.push(img(WHITE_PRESSED[key], x, octaveW, `wk-${key}-${octave}`));
        }
      });

      // 3. Adjacent pressed white key connectors within this octave
      ADJACENT_WHITE_PAIRS.forEach(pair => {
        const [a, b] = pair.split('-') as [NoteName, NoteName];
        if (isPressed(a, octave) && isPressed(b, octave)) {
          layers.push(img(BOTH_PRESSED[pair], x, octaveW, `bp-${pair}-${octave}`));
        }
      });

      // 4. B-C connector across octave boundary
      const nextOctave = octaveList[idx + 1];
      if (nextOctave !== undefined && isPressed('B', octave) && isPressed('C', nextOctave)) {
        layers.push(img(BOTH_PRESSED['B-C'], x, octaveW, `bp-B-C-${octave}`));
      }

      // 5. Black keys on top of everything — always in front
      BLACK_KEYS.forEach(key => {
        const src = isPressed(key as NoteName, octave) ? BLACK_PRESSED[key] : BLACK_UNPRESSED[key];
        layers.push(img(src, x, octaveW, `bk-${key}-${octave}`));
      });
    });
  }

  return (
    <View
      style={{ width: '100%', height: containerWidth > 0 ? containerH : undefined }}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {layers}
    </View>
  );
};

export default Piano;
