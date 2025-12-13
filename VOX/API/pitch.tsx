/**
 * Idk I needed someplace to do pitch processing so my files didnt get too messy.
 * @author Sky Vercauteren 
*/

import Sound from 'react-native-sound';

export class Pitch {
    public name!: string;
    public frequency!: number;
    public file!: string;
    public sound!: Sound;
    public id!: number;
    public index!:number;

    constructor(note: string, frequency: number, file:string, id:number, index:number) {
        this.name = note;
        this.frequency = frequency;
        this.file = file;
        this.id= id;
        this.index=index;
        const sound = this.load();
        sound.setVolume(1);
    }
    
    public load():Sound {
      const s = new Sound(this.file, Sound.MAIN_BUNDLE, (error: any) => {
          if (error) {
            console.log('failed to load the sound', error);
            return;
          }
      });
      return s;
    }

    public release = () => {
      if (this.sound) {
        this.sound.release();
      }
    }

    // Modified play() method with retry logic
    public play(retryCount: number = 0) {
      let max = 5;
      let delay = 1000;
      if (!this.sound) {
          console.log(`needed to reload ${this.name}`);
          this.sound = this.load();
      }
      
      if (this.sound) {
        this.sound.play((success) => {
          console.log(`[Attempt ${retryCount + 1}] trying to play ${this.name}`);
          
          if (success) {
            console.log(`-- played successfully --`);
            this.sound?.setCurrentTime(0); // Reset for next play
          } else {
            console.warn(`[Attempt ${retryCount + 1}] couldn't play (probably encoding).`);
            this.sound?.setCurrentTime(0);
            
            if (retryCount < max) {
              setTimeout(() => {
                this.play(retryCount + 1); 
              }, delay);
            } else {
              console.error(`Failed to play ${this.name} after ${max + 1} attempts. Giving up.`);
            }
          }
        });
      } else {
          // This happens if load() failed and set this.sound = null
          console.error(`Fatal Error: Cannot play ${this.name}. Sound failed to initialize.`);
      }
    }
} 

