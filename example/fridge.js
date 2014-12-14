import {Inject, annotate} from 'di';
import {Electricity} from './electricity';

export class Fridge {
  constructor(electricity) {
    this.electricity = electricity;
  }

  getEggs() {
    return '3 eggs';
  }
}
annotate(Fridge, new Inject(Electricity))
