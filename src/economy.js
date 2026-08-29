export function upgradeCost(baseCost, growth, level) {
  return Math.ceil(baseCost * growth ** level);
}
