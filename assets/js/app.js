(() => {
  // 国内向け課金パック（2025/09時点の一般的な構成）
  // amountYen: 税込円, vp: 付与VP, bonus: ボーナスVP (表示用)
  const packs = [
    { amountYen: 610, vp: 500, bonus: 0 },
    { amountYen: 1340, vp: 1150, bonus: 50 },
    { amountYen: 2440, vp: 2150, bonus: 150 },
    { amountYen: 4900, vp: 4400, bonus: 385 },
    { amountYen: 5980, vp: 5500, bonus: 600 },
    { amountYen: 11000, vp: 10500, bonus: 1485 }
  ];

  // 1VP≒1.22円（参考値）
  const yenPerVP = 1.22;

  const vpInput = document.getElementById('vpInput');
  const calcBtn = document.getElementById('calcBtn');
  const resultEl = document.getElementById('result');
  const errorEl = document.getElementById('error');
  const packsBody = document.getElementById('packsBody');

  // パック表を描画
  const formatYen = (n) => n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
  const renderPacks = () => {
    packsBody.innerHTML = packs.map(p => {
      const bonusText = p.bonus > 0 ? `<div class="bonus">(+${p.bonus}VPお得)</div>` : '';
      return `<tr><td>${formatYen(p.amountYen)}</td><td>${p.vp}VP ${bonusText}</td></tr>`;
    }).join('');
  };
  renderPacks();

  // 必要VPを満たす最小金額の組合せ（完全探索・小規模）
  const computeBestCombo = (needVP) => {
    // 上限を決めて探索（現実的な範囲: 20回購入まで）
    const MAX_COUNT = 20;
    let best = null;

    // 深さ優先で枚数組合せを探索
    const dfs = (index, accVP, accYen, counts) => {
      if (accVP >= needVP) {
        if (!best || accYen < best.totalYen || (accYen === best.totalYen && accVP < best.totalVP)) {
          best = { counts: counts.slice(), totalVP: accVP, totalYen: accYen };
        }
        return;
      }
      if (index >= packs.length) return;

      const pack = packs[index];
      // 0〜MAX_COUNT枚まで試す（枝刈り: 価格が既存bestを超えたら停止）
      const maxTry = MAX_COUNT;
      for (let k = 0; k <= maxTry; k++) {
        const nextYen = accYen + k * pack.amountYen;
        if (best && nextYen > best.totalYen) break;
        const nextVP = accVP + k * pack.vp;
        counts[index] = k;
        dfs(index + 1, nextVP, nextYen, counts);
      }
      counts[index] = 0;
    };

    dfs(0, 0, 0, new Array(packs.length).fill(0));
    return best;
  };

  const estimateYenByRate = (needVP) => Math.ceil(needVP * yenPerVP);

  const renderResult = (needVP) => {
    const best = computeBestCombo(needVP);
    if (!best) {
      resultEl.innerHTML = '<p>計算できませんでした。</p>';
      return;
    }

    const lines = [];
    lines.push(`<div class="total">最小課金額: <b>${formatYen(best.totalYen)}</b></div>`);
    lines.push(`<p>獲得合計: <b>${best.totalVP}VP</b>（必要 ${needVP}VP）</p>`);

    // 組合せの説明
    const comboParts = packs
      .map((p, i) => ({ pack: p, count: best.counts[i] }))
      .filter(x => x.count > 0)
      .map(x => `${formatYen(x.pack.amountYen)} × ${x.count}`);
    lines.push(`<div class="combo">内訳: ${comboParts.map(s => `<code>${s}</code>`).join(' + ')}</div>`);

    // 参考: 単純レート見積
    const est = estimateYenByRate(needVP);
    lines.push(`<p class="hint">参考見積（1VP≒${yenPerVP}円）: ${formatYen(est)}</p>`);

    resultEl.innerHTML = lines.join('');
  };

  const validateAndCalc = () => {
    errorEl.hidden = true;
    const raw = vpInput.value.trim();
    const num = Number(raw);
    if (!raw || !Number.isFinite(num) || num <= 0) {
      errorEl.textContent = '1以上の整数VPを入力してください。';
      errorEl.hidden = false;
      return;
    }
    const needVP = Math.round(num);
    renderResult(needVP);
  };

  calcBtn.addEventListener('click', validateAndCalc);
  vpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') validateAndCalc();
  });
})();


