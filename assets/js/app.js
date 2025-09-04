(() => {
  // 背景: 金粉（粒子）アニメーション（軽量）
  const dustCanvas = document.getElementById('goldDust');
  if (dustCanvas) {
    const ctx = dustCanvas.getContext('2d', { alpha: true });
    let width, height, dpr;
    const particles = [];
    const MAX_PARTICLES = 150; // 赤スパーク追加でやや増量

    const rand = (min, max) => Math.random() * (max - min) + min;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = dustCanvas.clientWidth = window.innerWidth;
      height = dustCanvas.clientHeight = window.innerHeight;
      dustCanvas.width = Math.floor(width * dpr);
      dustCanvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = () => {
      while (particles.length < MAX_PARTICLES) {
        const isRed = Math.random() < 0.28; // 28%は赤いスパーク
        particles.push({
          x: rand(0, width),
          y: rand(0, height),
          r: isRed ? rand(0.8, 2.2) : rand(0.6, 1.8),
          vx: rand(-0.1, 0.1),
          vy: isRed ? rand(0.02, 0.22) : rand(-0.05, 0.15),
          life: rand(3, 8),
          t: 0,
          hue: isRed ? rand(350, 5) : rand(42, 48), // 赤 or 金
        });
      }
    };
    spawn();

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.033); // 上限で安定
      last = now;

      ctx.clearRect(0, 0, width, height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += dt;
        p.x += p.vx + Math.sin((p.t + i) * 0.8) * 0.02;
        p.y += p.vy;
        if (p.y > height + 5) { p.y = -5; p.x = rand(0, width); }
        const alpha = Math.sin((p.t / p.life) * Math.PI) * 0.9; // フェードイン/アウト
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 70%, 62%, ${alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // 微小なグロー
        const glow = p.r * 6;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        grad.addColorStop(0, `hsla(${p.hue}, 85%, 70%, ${alpha * 0.35})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fill();

        if (p.t > p.life) {
          particles.splice(i, 1);
        }
      }
      spawn();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
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


