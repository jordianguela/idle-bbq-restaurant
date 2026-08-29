import { MEAT, COOK } from './definitions.js';
import { upgradeCost } from './economy.js';

export function moneyPerServe(state) {
  return 1 + state.meatLevel * MEAT.perServeBonus;
}

export function incomePerSec(state) {
  return state.cookCount * COOK.incomePerSec;
}

export function serve(state) {
  return { ...state, money: state.money + moneyPerServe(state) };
}

export function meatCost(state) {
  return upgradeCost(MEAT.baseCost, MEAT.growth, state.meatLevel);
}

export function cookCost(state) {
  return upgradeCost(COOK.baseCost, COOK.growth, state.cookCount);
}

export function buyMeat(state) {
  const cost = meatCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, meatLevel: state.meatLevel + 1 };
}

export function buyCook(state) {
  const cost = cookCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, cookCount: state.cookCount + 1 };
}
