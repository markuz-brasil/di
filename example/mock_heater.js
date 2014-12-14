import {Provide, annotate} from 'di';
import {Heater} from './coffee_maker/heater';

export class MockHeater {
  constructor() {}

  on() {
    console.log('Turning on the MOCK heater...');
  }

  off() {}
}
annotate(MockHeater, new Provide(Heater))
