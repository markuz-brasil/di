import {Inject, annotate} from 'di';

import {Grinder} from './grinder';
import {Pump} from './pump';
import {Heater} from './heater';


export class CoffeeMaker {
  constructor(grinder, pump, heater) {
    this.grinder = grinder;
    this.pump = pump;
    this.heater = heater;
  }

  brew() {
    console.log('Brewing a coffee...');
    this.grinder.grind();
    this.heater.on();
    this.pump.pump();
    this.heater.off();
    console.log('A coffee is ready.');
  }
}
annotate(CoffeeMaker, new Inject(Grinder, Pump, Heater))
