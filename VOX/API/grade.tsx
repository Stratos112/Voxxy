/**
 * A place to develop scoring/grading methods
 * @author Sky Vercauteren 
*/
import { Pitch, Pitches } from './pitch';

export class Grade{
    public static grade(expected: number, current: number, bias: 'none' | 'sharp' | 'flat' = 'none'){
        if (bias === 'sharp' && current >= expected) return 100;
        if (bias === 'flat' && current <= expected) return 100;

        let grade = 1;
        //For now Im gping to start grading at 3 semitones.
        //The first 50% will cover the furthest 2 semitones, and the last 50% will be split up over 1 semitone
        // THis will happen on either side. so the "grading" will span 6 semitones.
        // anything further away than 3 on either side will be 0%
        const explus1 = this.sharpOne(expected)
        const explus2 = this.sharpOne(explus1)
        const explus3 = this.sharpOne(explus2)

        const exmin1 = this.flatOne(expected);
        const exmin2 = this.flatOne(exmin1);
        const exmin3 = this.flatOne(exmin2);

        if(current > explus3 || current < exmin3)
        {
            grade = 0;
        }else{
            let percent = 0;
            if(current >= explus1){
                percent = this.percent(current, explus1, explus3);
                grade = percent * 50; //you are *at least* one semi sharp. best you can do is 50% up to 3 semitones sharp.
            }
            else if(current >= expected){
                percent = this.percent(current, expected, explus1);
                grade = (percent * 50) + 50; //you are sharp, but not more than a semitone (first case). this smaller distance is measured over the top 50%-100%.
            }
            else if(current <= exmin1){
                percent = this.percent(current, exmin1, exmin3);
                grade = percent * 50; //if you are more than 1 semitone flat (and less than 3) you can only get between 0-50%
            } 
            else if(current > exmin1){
                percent = this.percent(current, expected, exmin1);
                grade = (percent * 50) + 50; // if you are less than 1 semitone flat, your score will be between 50 -100.
            }
        }
        return grade;
    }

    //the number of semitones between two frequencies
    private static between(fq1:number, fq2:number)
    {
        //undoing 2^(1/12)
         return Math.abs(12 * Math.log(fq2 / fq1) / Math.log(2)); 
    }

     private static percent(current: number, goal: number, benchmark: number) {
        const totalSemis = this.between(goal, benchmark);
        const currentSemis = this.between(current, benchmark);
        return Math.abs(currentSemis / totalSemis); 
    }


    public static sharpOne(pitch: number)
    {
        return pitch * Math.pow(2,1/12);
    }

    public static flatOne(pitch: number)
    {
        return pitch * Math.pow(2,(-1/12));
    }
}


