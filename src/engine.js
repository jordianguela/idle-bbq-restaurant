import { MEAT, COOK } from './definitions.js';

export function moneyPerServe(state) {
  return 1 + state.meatLevel * MEAT.perServeBonus;
}

export function incomePerSec(state) {
  return state.cookCount * COOK.incomePerSec;
}

export function serve(state) {
  return { ...state, money: state.money + moneyPerServe(state) };
}
