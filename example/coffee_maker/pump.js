import {Inject, annotate} from 'di';
import {Heater} from './heater';
import {Electricity} from '../electricity';

export class Pump {
  constructor(heater, electricity) {
    this.heater = heater;
    this.electricity = electricity;
  }

  pump() {
    console.log('Pumping the water...');
  }
}
annotate(Pump, new Inject(Heater, Electricity))
