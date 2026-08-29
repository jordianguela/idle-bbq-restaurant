import { moneyPerServe, incomePerSec, meatCost, cookCost } from './engine.js';

const $ = id => document.getElementById(id);

export function render(state) {
  $('money').textContent = Math.floor(state.money);
  $('rate').textContent = incomePerSec(state);
  $('perserve').textContent = moneyPerServe(state);
  $('serveval').textContent = moneyPerServe(state);

  const mCost = meatCost(state);
  const cCost = cookCost(state);
  $('meat-cost').textContent = mCost;
  $('meat-level').textContent = state.meatLevel;
  $('cook-cost').textContent = cCost;
  $('cook-count').textContent = state.cookCount;

  $('buy-meat').disabled = state.money < mCost;
  $('buy-cook').disabled = state.money < cCost;
}

export function wireButtons({ onServe, onBuyMeat, onBuyCook }) {
  $('serve').addEventListener('click', onServe);
  $('buy-meat').addEventListener('click', onBuyMeat);
  $('buy-cook').addEventListener('click', onBuyCook);
}

export function showOffline(earnings) {
  if (earnings <= 0) return;
  const el = $('offline');
  el.textContent = `Mentre no hi eres, el teu restaurant ha guanyat ${earnings} €! 🍖`;
  el.classList.remove('hidden');
}
