import {Inject, annotate} from 'di';
import {Electricity} from '../electricity';

export class Grinder {
  constructor(electricity) {
    this.electricity = electricity;
  }

  grind() {
    console.log('Grinding coffee beans...');
  }
}
annotate(Grinder, new Inject(Electricity))
