/**
 * Simmilar to pitches but for range classification
 * @author Sky Vercauteren 
*/

import {Pitch} from './pitch';
import {Pitches} from './pitches';


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
    this.center = Pitches.allPitches[this.low.id+(this.range/2)];
  }

  public static readonly bass = new Range_Class("Bass", Pitches.E4, Pitches.C2);
  public static readonly barritone = new Range_Class("Barritone", Pitches.A4, Pitches.A2);
  public static readonly tenor = new Range_Class("Tenor", Pitches.C5, Pitches.C3);
  public static readonly contralto = new Range_Class("Contralto", Pitches.F5, Pitches.F3);
  public static readonly alto = new Range_Class("Alto", Pitches.E5, Pitches.G3);
  public static readonly mezzo = new Range_Class("Mezzo-Soprano", Pitches.A5, Pitches.A3);
  public static readonly soprano = new Range_Class("Soprano", Pitches.C6, Pitches.C4);

  public static allClasses: Range_Class[] = [
    this.bass,
    this.barritone,
    this.tenor,
    this.contralto,
    this.alto,
    this.mezzo,
    this.soprano
  ];

  public static classify(high: Pitch, low:Pitch){
    console.count('Pitches.classify');
    console.trace('Pitches.classify called from'); 
    let center = Pitches.centerPitch(high, low).id;
    let classification = this.bass;
    let minDeviation = 100;
    for(const range of this.allClasses){
      console.log(range.name+": "+range.center.id);
      let deviation = Math.abs(center - range.center.id);
      if(deviation < minDeviation){
        minDeviation = deviation;
        classification = range;
      }
    }
    return classification;
  }
}