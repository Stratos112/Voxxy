/**
 * Idk I needed someplace to do pitch processing so my files didnt get too messy.
 * @author Sky Vercauteren
*/

import { heightRange } from '../UI/styles';
import { Profile } from '../profile';
import { Platform } from 'react-native';
import TrackPlayer, { Event, Track } from 'react-native-track-player';

export class Pitch {
    public name!: string;
    public frequency!: number;
    public file!: string;
    public id!: number;
    public index!: number;

    constructor(note: string, frequency: number, file: string, id: number, index: number) {
        this.name = note;
        this.frequency = frequency;
        this.file = file;
        this.id = id;
        this.index = index;
    }
}

export class Range_Class {
  public name!: string;
  public high!: Pitch;
  public low!: Pitch;
  public center!: Pitch;
  public range!: number;

  constructor(name: string, high:Pitch, low:Pitch){
    this.name=name;
    this.high=high;
    this.low=low;
    this.range = (high.id - low.id);
    this.center = Pitches.allPitches[Math.floor(this.low.id+(this.range/2))];
  }
}
export class Pitches {

  // Octave 0 (partial: A0–B0)
  public static readonly A0  = new Pitch("A0",   27.50,  "a0.mp3",   0,   0);
  public static readonly As0 = new Pitch("A#0",  29.14,  "as0.mp3",  1,   1);
  public static readonly Bb0 = new Pitch("Bb0",  29.14,  "as0.mp3",  1,   2);
  public static readonly B0  = new Pitch("B0",   30.87,  "b0.mp3",   2,   3);

  // Octave 1
  public static readonly C1  = new Pitch("C1",   32.70,  "c1.mp3",   3,   4);
  public static readonly Cs1 = new Pitch("C#1",  34.65,  "cs1.mp3",  4,   5);
  public static readonly Db1 = new Pitch("Db1",  34.65,  "cs1.mp3",  4,   6);
  public static readonly D1  = new Pitch("D1",   36.71,  "d1.mp3",   5,   7);
  public static readonly Ds1 = new Pitch("D#1",  38.89,  "ds1.mp3",  6,   8);
  public static readonly Eb1 = new Pitch("Eb1",  38.89,  "ds1.mp3",  6,   9);
  public static readonly E1  = new Pitch("E1",   41.20,  "e1.mp3",   7,  10);
  public static readonly F1  = new Pitch("F1",   43.65,  "f1.mp3",   8,  11);
  public static readonly Fs1 = new Pitch("F#1",  46.25,  "fs1.mp3",  9,  12);
  public static readonly Gb1 = new Pitch("Gb1",  46.25,  "fs1.mp3",  9,  13);
  public static readonly G1  = new Pitch("G1",   49.00,  "g1.mp3",  10,  14);
  public static readonly Gs1 = new Pitch("G#1",  51.91,  "gs1.mp3", 11,  15);
  public static readonly Ab1 = new Pitch("Ab1",  51.91,  "gs1.mp3", 11,  16);
  public static readonly A1  = new Pitch("A1",   55.00,  "a1.mp3",  12,  17);
  public static readonly As1 = new Pitch("A#1",  58.27,  "as1.mp3", 13,  18);
  public static readonly Bb1 = new Pitch("Bb1",  58.27,  "as1.mp3", 13,  19);
  public static readonly B1  = new Pitch("B1",   61.74,  "b1.mp3",  14,  20);

  // Octave 2
  public static readonly C2  = new Pitch("C2",   65.41,  "c2.mp3",  15,  21);
  public static readonly Cs2 = new Pitch("C#2",  69.30,  "cs2.mp3", 16,  22);
  public static readonly Db2 = new Pitch("Db2",  69.30,  "cs2.mp3", 16,  23);
  public static readonly D2  = new Pitch("D2",   73.42,  "d2.mp3",  17,  24);
  public static readonly Ds2 = new Pitch("D#2",  77.78,  "ds2.mp3", 18,  25);
  public static readonly Eb2 = new Pitch("Eb2",  77.78,  "ds2.mp3", 18,  26);
  public static readonly E2  = new Pitch("E2",   82.41,  "e2.mp3",  19,  27);
  public static readonly F2  = new Pitch("F2",   87.31,  "f2.mp3",  20,  28);
  public static readonly Fs2 = new Pitch("F#2",  92.50,  "fs2.mp3", 21,  29);
  public static readonly Gb2 = new Pitch("Gb2",  92.50,  "fs2.mp3", 21,  30);
  public static readonly G2  = new Pitch("G2",   98.00,  "g2.mp3",  22,  31);
  public static readonly Gs2 = new Pitch("G#2", 103.83,  "gs2.mp3", 23,  32);
  public static readonly Ab2 = new Pitch("Ab2", 103.83,  "gs2.mp3", 23,  33);
  public static readonly A2  = new Pitch("A2",  110.00,  "a2.mp3",  24,  34);
  public static readonly As2 = new Pitch("A#2", 116.54,  "as2.mp3", 25,  35);
  public static readonly Bb2 = new Pitch("Bb2", 116.54,  "as2.mp3", 25,  36);
  public static readonly B2  = new Pitch("B2",  123.47,  "b2.mp3",  26,  37);

  // Octave 3
  public static readonly C3  = new Pitch("C3",  130.81,  "c3.mp3",  27,  38);
  public static readonly Cs3 = new Pitch("C#3", 138.59,  "cs3.mp3", 28,  39);
  public static readonly Db3 = new Pitch("Db3", 138.59,  "cs3.mp3", 28,  40);
  public static readonly D3  = new Pitch("D3",  146.83,  "d3.mp3",  29,  41);
  public static readonly Ds3 = new Pitch("D#3", 155.56,  "ds3.mp3", 30,  42);
  public static readonly Eb3 = new Pitch("Eb3", 155.56,  "ds3.mp3", 30,  43);
  public static readonly E3  = new Pitch("E3",  164.81,  "e3.mp3",  31,  44);
  public static readonly F3  = new Pitch("F3",  174.61,  "f3.mp3",  32,  45);
  public static readonly Fs3 = new Pitch("F#3", 185.00,  "fs3.mp3", 33,  46);
  public static readonly Gb3 = new Pitch("Gb3", 185.00,  "fs3.mp3", 33,  47);
  public static readonly G3  = new Pitch("G3",  196.00,  "g3.mp3",  34,  48);
  public static readonly Gs3 = new Pitch("G#3", 207.65,  "gs3.mp3", 35,  49);
  public static readonly Ab3 = new Pitch("Ab3", 207.65,  "gs3.mp3", 35,  50);
  public static readonly A3  = new Pitch("A3",  220.00,  "a3.mp3",  36,  51);
  public static readonly As3 = new Pitch("A#3", 233.08,  "as3.mp3", 37,  52);
  public static readonly Bb3 = new Pitch("Bb3", 233.08,  "as3.mp3", 37,  53);
  public static readonly B3  = new Pitch("B3",  246.94,  "b3.mp3",  38,  54);

  // Octave 4 (Middle C)
  public static readonly C4  = new Pitch("C4",  261.63,  "c4.mp3",  39,  55);
  public static readonly Cs4 = new Pitch("C#4", 277.18,  "cs4.mp3", 40,  56);
  public static readonly Db4 = new Pitch("Db4", 277.18,  "cs4.mp3", 40,  57);
  public static readonly D4  = new Pitch("D4",  293.66,  "d4.mp3",  41,  58);
  public static readonly Ds4 = new Pitch("D#4", 311.13,  "ds4.mp3", 42,  59);
  public static readonly Eb4 = new Pitch("Eb4", 311.13,  "ds4.mp3", 42,  60);
  public static readonly E4  = new Pitch("E4",  329.63,  "e4.mp3",  43,  61);
  public static readonly F4  = new Pitch("F4",  349.23,  "f4.mp3",  44,  62);
  public static readonly Fs4 = new Pitch("F#4", 369.99,  "fs4.mp3", 45,  63);
  public static readonly Gb4 = new Pitch("Gb4", 369.99,  "fs4.mp3", 45,  64);
  public static readonly G4  = new Pitch("G4",  392.00,  "g4.mp3",  46,  65);
  public static readonly Gs4 = new Pitch("G#4", 415.30,  "gs4.mp3", 47,  66);
  public static readonly Ab4 = new Pitch("Ab4", 415.30,  "gs4.mp3", 47,  67);
  public static readonly A4  = new Pitch("A4",  440.00,  "a4.mp3",  48,  68);
  public static readonly As4 = new Pitch("A#4", 466.16,  "as4.mp3", 49,  69);
  public static readonly Bb4 = new Pitch("Bb4", 466.16,  "as4.mp3", 49,  70);
  public static readonly B4  = new Pitch("B4",  493.88,  "b4.mp3",  50,  71);

  // Octave 5
  public static readonly C5  = new Pitch("C5",  523.25,  "c5.mp3",  51,  72);
  public static readonly Cs5 = new Pitch("C#5", 554.37,  "cs5.mp3", 52,  73);
  public static readonly Db5 = new Pitch("Db5", 554.37,  "cs5.mp3", 52,  74);
  public static readonly D5  = new Pitch("D5",  587.33,  "d5.mp3",  53,  75);
  public static readonly Ds5 = new Pitch("D#5", 622.25,  "ds5.mp3", 54,  76);
  public static readonly Eb5 = new Pitch("Eb5", 622.25,  "ds5.mp3", 54,  77);
  public static readonly E5  = new Pitch("E5",  659.25,  "e5.mp3",  55,  78);
  public static readonly F5  = new Pitch("F5",  698.46,  "f5.mp3",  56,  79);
  public static readonly Fs5 = new Pitch("F#5", 739.99,  "fs5.mp3", 57,  80);
  public static readonly Gb5 = new Pitch("Gb5", 739.99,  "fs5.mp3", 57,  81);
  public static readonly G5  = new Pitch("G5",  783.99,  "g5.mp3",  58,  82);
  public static readonly Gs5 = new Pitch("G#5", 830.61,  "gs5.mp3", 59,  83);
  public static readonly Ab5 = new Pitch("Ab5", 830.61,  "gs5.mp3", 59,  84);
  public static readonly A5  = new Pitch("A5",  880.00,  "a5.mp3",  60,  85);
  public static readonly As5 = new Pitch("A#5", 932.33,  "as5.mp3", 61,  86);
  public static readonly Bb5 = new Pitch("Bb5", 932.33,  "as5.mp3", 61,  87);
  public static readonly B5  = new Pitch("B5",  987.77,  "b5.mp3",  62,  88);

  // Octave 6
  public static readonly C6  = new Pitch("C6",  1046.50, "c6.mp3",  63,  89);
  public static readonly Cs6 = new Pitch("C#6", 1108.73, "cs6.mp3", 64,  90);
  public static readonly Db6 = new Pitch("Db6", 1108.73, "cs6.mp3", 64,  91);
  public static readonly D6  = new Pitch("D6",  1174.66, "d6.mp3",  65,  92);
  public static readonly Ds6 = new Pitch("D#6", 1244.51, "ds6.mp3", 66,  93);
  public static readonly Eb6 = new Pitch("Eb6", 1244.51, "ds6.mp3", 66,  94);
  public static readonly E6  = new Pitch("E6",  1318.51, "e6.mp3",  67,  95);
  public static readonly F6  = new Pitch("F6",  1396.91, "f6.mp3",  68,  96);
  public static readonly Fs6 = new Pitch("F#6", 1479.98, "fs6.mp3", 69,  97);
  public static readonly Gb6 = new Pitch("Gb6", 1479.98, "fs6.mp3", 69,  98);
  public static readonly G6  = new Pitch("G6",  1567.98, "g6.mp3",  70,  99);
  public static readonly Gs6 = new Pitch("G#6", 1661.22, "gs6.mp3", 71, 100);
  public static readonly Ab6 = new Pitch("Ab6", 1661.22, "gs6.mp3", 71, 101);
  public static readonly A6  = new Pitch("A6",  1760.00, "a6.mp3",  72, 102);
  public static readonly As6 = new Pitch("A#6", 1864.66, "as6.mp3", 73, 103);
  public static readonly Bb6 = new Pitch("Bb6", 1864.66, "as6.mp3", 73, 104);
  public static readonly B6  = new Pitch("B6",  1975.53, "b6.mp3",  74, 105);

  // Octave 7 (partial: C7–F7)
  public static readonly C7  = new Pitch("C7",  2093.00, "c7.mp3",  75, 106);
  public static readonly Cs7 = new Pitch("C#7", 2217.46, "cs7.mp3", 76, 107);
  public static readonly Db7 = new Pitch("Db7", 2217.46, "cs7.mp3", 76, 108);
  public static readonly D7  = new Pitch("D7",  2349.32, "d7.mp3",  77, 109);
  public static readonly Ds7 = new Pitch("D#7", 2489.02, "ds7.mp3", 78, 110);
  public static readonly Eb7 = new Pitch("Eb7", 2489.02, "ds7.mp3", 78, 111);
  public static readonly E7  = new Pitch("E7",  2637.02, "e7.mp3",  79, 112);
  public static readonly F7  = new Pitch("F7",  2793.83, "f7.mp3",  80, 113);

  public static allPitches: Pitch[] = [
    // Octave 0
    Pitches.A0,
    Pitches.As0, Pitches.Bb0,
    Pitches.B0,
    // Octave 1
    Pitches.C1,
    Pitches.Cs1, Pitches.Db1,
    Pitches.D1,
    Pitches.Ds1, Pitches.Eb1,
    Pitches.E1,
    Pitches.F1,
    Pitches.Fs1, Pitches.Gb1,
    Pitches.G1,
    Pitches.Gs1, Pitches.Ab1,
    Pitches.A1,
    Pitches.As1, Pitches.Bb1,
    Pitches.B1,
    // Octave 2
    Pitches.C2,
    Pitches.Cs2, Pitches.Db2,
    Pitches.D2,
    Pitches.Ds2, Pitches.Eb2,
    Pitches.E2,
    Pitches.F2,
    Pitches.Fs2, Pitches.Gb2,
    Pitches.G2,
    Pitches.Gs2, Pitches.Ab2,
    Pitches.A2,
    Pitches.As2, Pitches.Bb2,
    Pitches.B2,
    // Octave 3
    Pitches.C3,
    Pitches.Cs3, Pitches.Db3,
    Pitches.D3,
    Pitches.Ds3, Pitches.Eb3,
    Pitches.E3,
    Pitches.F3,
    Pitches.Fs3, Pitches.Gb3,
    Pitches.G3,
    Pitches.Gs3, Pitches.Ab3,
    Pitches.A3,
    Pitches.As3, Pitches.Bb3,
    Pitches.B3,
    // Octave 4 (Middle C)
    Pitches.C4,
    Pitches.Cs4, Pitches.Db4,
    Pitches.D4,
    Pitches.Ds4, Pitches.Eb4,
    Pitches.E4,
    Pitches.F4,
    Pitches.Fs4, Pitches.Gb4,
    Pitches.G4,
    Pitches.Gs4, Pitches.Ab4,
    Pitches.A4,
    Pitches.As4, Pitches.Bb4,
    Pitches.B4,
    // Octave 5
    Pitches.C5,
    Pitches.Cs5, Pitches.Db5,
    Pitches.D5,
    Pitches.Ds5, Pitches.Eb5,
    Pitches.E5,
    Pitches.F5,
    Pitches.Fs5, Pitches.Gb5,
    Pitches.G5,
    Pitches.Gs5, Pitches.Ab5,
    Pitches.A5,
    Pitches.As5, Pitches.Bb5,
    Pitches.B5,
    // Octave 6
    Pitches.C6,
    Pitches.Cs6, Pitches.Db6,
    Pitches.D6,
    Pitches.Ds6, Pitches.Eb6,
    Pitches.E6,
    Pitches.F6,
    Pitches.Fs6, Pitches.Gb6,
    Pitches.G6,
    Pitches.Gs6, Pitches.Ab6,
    Pitches.A6,
    Pitches.As6, Pitches.Bb6,
    Pitches.B6,
    // Octave 7 (partial)
    Pitches.C7,
    Pitches.Cs7, Pitches.Db7,
    Pitches.D7,
    Pitches.Ds7, Pitches.Eb7,
    Pitches.E7,
    Pitches.F7,
  ];

  public static readonly bass      = new Range_Class("Bass",           Pitches.E4,  Pitches.C2);
  public static readonly baritone  = new Range_Class("Baritone",       Pitches.A4,  Pitches.A2);
  public static readonly tenor     = new Range_Class("Tenor",          Pitches.C5,  Pitches.C3);
  public static readonly contralto = new Range_Class("Contralto",      Pitches.F5,  Pitches.F3);
  public static readonly alto      = new Range_Class("Alto",           Pitches.E5,  Pitches.G3);
  public static readonly mezzo     = new Range_Class("Mezzo-Soprano",  Pitches.A5,  Pitches.A3);
  public static readonly soprano   = new Range_Class("Soprano",        Pitches.C6,  Pitches.C4);

  public static allClasses: Range_Class[] = [
    Pitches.bass,
    Pitches.baritone,
    Pitches.tenor,
    Pitches.contralto,
    Pitches.alto,
    Pitches.mezzo,
    Pitches.soprano
  ];

  // Prevent instantiation for this utility class (optional but recommended)
  private constructor() {}

  public static async setupPlayer(): Promise<void> {
    try {
      await TrackPlayer.setupPlayer({ waitForBuffer: true });
    } catch (e) {
      // Already set up — safe to ignore
    }
  }

  public static toTrack(pitch: Pitch): Track {
    const url = Platform.OS === 'android'
      ? `file:///android_asset/${pitch.file}`
      : pitch.file;
    return { id: pitch.name, url, title: pitch.name, artist: 'Voxxy' };
  }

  public static playSingle(pitch: Pitch): void {
    TrackPlayer.reset()
      .then(() => TrackPlayer.add(Pitches.toTrack(pitch)))
      .then(() => TrackPlayer.play())
      .catch(e => console.error('playSingle error:', e));
  }

  public static increment(me: Pitch) {
    if(me.id == 80){
      return me;
    }else{
      let natural = (me.file == this.allPitches[me.index+1].file)?2:1;
      return this.allPitches[me.index+natural];
    }
  }
  public static decrement(me: Pitch) {
    if(me.id == 0){
      return me;
    }else{
      let natural = (me.file == this.allPitches[me.index-1].file)?2:1;
      return this.allPitches[me.index-natural];
    }
  }

  public static preferSharps: boolean = true;

  private static readonly SHARP_TO_FLAT: Record<string, string> = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
  };
  private static readonly FLAT_TO_SHARP: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };

  public static filteredPitches(): Pitch[] {
    return this.allPitches.filter(p =>
      this.preferSharps ? p.name[1] !== 'b' : p.name[1] !== '#'
    );
  }

  public static displayName(p: Pitch): string {
    if (this.preferSharps && p.name[1] === 'b') {
      const sharp = this.allPitches.find(x => x.file === p.file && x.name[1] === '#');
      return sharp ? sharp.name : p.name;
    }
    if (!this.preferSharps && p.name[1] === '#') {
      const flat = this.allPitches.find(x => x.file === p.file && x.name[1] === 'b');
      return flat ? flat.name : p.name;
    }
    return p.name;
  }

  public static displayTone(tone: string): string {
    if (this.preferSharps) {
      for (const [flat, sharp] of Object.entries(this.FLAT_TO_SHARP)) {
        if (tone.startsWith(flat)) return sharp + tone.slice(flat.length);
      }
    } else {
      for (const [sharp, flat] of Object.entries(this.SHARP_TO_FLAT)) {
        if (tone.startsWith(sharp)) return flat + tone.slice(sharp.length);
      }
    }
    return tone;
  }

  public static centerPitch(high: Pitch, low:Pitch){
    let span = high.id-low.id;
    return Pitches.allPitches[Math.floor((span/2)+low.id)];
  }

  public static classify(high: Pitch, low: Pitch): Range_Class[] {
    const center = this.centerPitch(high, low);
    const votes = new Map<string, number>();

    const nearestTo = (pitch: Pitch): Range_Class => {
      let best = Pitches.bass;
      let minDev = Infinity;
      for (const range of Pitches.allClasses) {
        const dev = Math.abs(pitch.id - range.center.id);
        if (dev < minDev) { minDev = dev; best = range; }
      }
      return best;
    };

    const cast = (range: Range_Class, weight: number) =>
      votes.set(range.name, (votes.get(range.name) || 0) + weight);

    cast(nearestTo(low), 1);
    cast(nearestTo(high), 1);
    cast(nearestTo(center), 2);

    const sorted = Pitches.allClasses
      .filter(r => votes.has(r.name))
      .sort((a, b) => (votes.get(b.name) || 0) - (votes.get(a.name) || 0));

    if (sorted.length >= 2 && (votes.get(sorted[1].name) || 0) >= 2) {
      return [sorted[0], sorted[1]];
    }
    return [sorted[0]];
  }


  public static nearestPitch(hz: number): Pitch {
    return this.filteredPitches().reduce((best, p) =>
      Math.abs(p.frequency - hz) < Math.abs(best.frequency - hz) ? p : best
    );
  }

  public static noteToPitch(name: string)
  {
    let pitch = Pitches.C4;
    for(let i =0; i< Pitches.allPitches.length; i++)
    {
      if(Pitches.allPitches[i].name == name){
        pitch =  Pitches.allPitches[i];
      }
    }
    return pitch;
  }


  private static minFreq: number = 65.40639;   // C2 (default vocal low)
  private static maxFreq: number = 1046.502;   // C6 (default vocal high)

  public static async setRange(){
    let user = new Profile();
    await user.RetreiveProfile();

    this.minFreq = user.low_range.frequency;
    this.maxFreq = user.high_range.frequency;
  }

  // used to translate frequency to position.
  //The box is 500px tall.
  //vocal range from c6(1046.502) to c2 (65.40639)
  // Sequential playback via RNTP queue.
  // With duration: skips tracks on a wall-clock schedule with a brief fade between notes.
  // Without duration: plays each track to natural end, uses PlaybackQueueEnded for completion.
  // onEachNote fires when each note begins. Returns an abort function.
  public static playMono(
    sequence: Pitch[],
    duration?: number,
    onComplete?: () => void,
    onEachNote?: (index: number, pitch: Pitch) => void
  ): () => void {
    let aborted = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const listeners: { remove: () => void }[] = [];

    const cleanup = () => {
      listeners.forEach(l => l.remove());
      listeners.length = 0;
      timers.forEach(clearTimeout);
      timers.length = 0;
    };

    const setup = async () => {
      await TrackPlayer.reset();
      await TrackPlayer.add(sequence.map(p => Pitches.toTrack(p)));

      if (duration === undefined) {
        listeners.push(TrackPlayer.addEventListener(Event.PlaybackTrackChanged, ({ nextTrack }) => {
          if (aborted || nextTrack == null) return;
          onEachNote?.(nextTrack, sequence[nextTrack]);
        }));
        listeners.push(TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
          if (!aborted) { cleanup(); onComplete?.(); }
        }));
        onEachNote?.(0, sequence[0]);
        await TrackPlayer.play();
      } else {
        const FADE_MS = 180;
        onEachNote?.(0, sequence[0]);

        sequence.slice(1).forEach((pitch, i) => {
          const noteStart = (i + 1) * duration;
          // Fade out tail of previous note
          timers.push(setTimeout(() => { if (!aborted) TrackPlayer.setVolume(0.5); }, noteStart - FADE_MS));
          timers.push(setTimeout(() => { if (!aborted) TrackPlayer.setVolume(0.15); }, noteStart - FADE_MS / 2));
          // Skip to next note, restore volume, notify
          timers.push(setTimeout(async () => {
            if (aborted) return;
            await TrackPlayer.setVolume(1);
            await TrackPlayer.skipToNext();
            onEachNote?.(i + 1, pitch);
          }, noteStart));
        });

        timers.push(setTimeout(() => {
          if (!aborted) { cleanup(); onComplete?.(); TrackPlayer.reset(); }
        }, sequence.length * duration));

        await TrackPlayer.play();;
      }
    };

    setup().catch(e => console.error('[playMono] setup error:', e));

    return () => {
      aborted = true;
      cleanup();
      TrackPlayer.reset().catch(() => {});
    };
  }

  // Polyphonic playback — TODO: RNTP is single-stream; full polyphonic needs a separate solution.
  public static playPoly(
    _sequence: Pitch[],
    _intervalMs: number,
    _duration?: number,
    _onComplete?: () => void
  ): () => void {
    console.warn('playPoly: not yet implemented with RNTP');
    return () => {};
  }

  public static fqzToPosition(freq: number){
    const scaleMax = heightRange;

    // Clamp input to valid range
    const clampedFreq = Math.min(Math.max(freq, Pitches.minFreq), Pitches.maxFreq);

    // Normalize and scale (log — equal spacing per octave)
    const normalized = (Math.log(clampedFreq) - Math.log(Pitches.minFreq)) / (Math.log(Pitches.maxFreq) - Math.log(Pitches.minFreq));

    // Loggy scale (old) — squishes low notes sometimes?:
    // const normalized = (clampedFreq - Pitches.minFreq) / (Pitches.maxFreq - Pitches.minFreq);

    const mappedValue = Math.round(normalized * scaleMax);
    return mappedValue;
  }
}
