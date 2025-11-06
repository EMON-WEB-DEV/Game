/*
      index.js - simple jumping game (self-contained)
      - Creates a canvas and UI in the document
      - Player can jump (Space / ArrowUp / click / touch)
      - Obstacles spawn and move left
      - Score increases over time; high score saved to localStorage
*/

(function () {
      // --- Setup DOM ---
      const style = document.createElement('style');
      style.textContent = `
            html,body{height:100%;margin:0;background:#111;color:#eee;font-family:system-ui,Segoe UI,Roboto}
            #gameRoot{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px}
            canvas{background:linear-gradient(#77c,#034);border-radius:8px;box-shadow:0 6px 30px rgba(0,0,0,.6)}
            .hud{display:flex;gap:12px;align-items:center}
            .btn{background:#0a84ff;color:#fff;padding:8px 12px;border-radius:6px;border:0;cursor:pointer}
            .info{opacity:.9;font-size:14px}
      `;
      document.head.appendChild(style);

      const root = document.createElement('div');
      root.id = 'gameRoot';
      document.body.appendChild(root);

      const hud = document.createElement('div');
      hud.className = 'hud';
      const scoreLabel = document.createElement('div');
      scoreLabel.className = 'info';
      const highLabel = document.createElement('div');
      highLabel.className = 'info';
      const restartBtn = document.createElement('button');
      restartBtn.className = 'btn';
      restartBtn.textContent = 'Restart';
      hud.appendChild(scoreLabel);
      hud.appendChild(highLabel);
      hud.appendChild(restartBtn);
      root.appendChild(hud);

      const canvas = document.createElement('canvas');
      root.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      // --- Canvas size handling ---
      const baseW = 800, baseH = 400;
      function resizeCanvas() {
            const ratio = devicePixelRatio || 1;
            // Fit to window while keeping aspect ratio
            const maxW = Math.min(window.innerWidth - 40, baseW);
            const maxH = Math.min(window.innerHeight - 120, baseH);
            const scale = Math.min(maxW / baseW, maxH / baseH, 1);
            canvas.style.width = baseW * scale + 'px';
            canvas.style.height = baseH * scale + 'px';
            canvas.width = Math.round(baseW * ratio);
            canvas.height = Math.round(baseH * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      // --- Game variables ---
      let running = false;
      let lastTime = 0;
      let spawnTimer = 0;
      let score = 0;
      let speed = 240; // px/sec
      const gravity = 1600;
      const groundY = baseH - 60;
      const player = {
            x: 80,
            y: groundY,
            w: 40,
            h: 40,
            vy: 0,
            onGround: true,
            color: '#ffd54a'
      };
      const obstacles = [];
      const obstaclePool = [];
      const highKey = 'jumper_highscore_v1';
      let highScore = parseInt(localStorage.getItem(highKey) || '0', 10);

      // --- Helpers ---
      function rand(min, max) { return Math.random() * (max - min) + min; }
      function spawnObstacle() {
            let ob = obstaclePool.pop() || {};
            ob.w = Math.random() < 0.4 ? 20 + Math.random() * 20 : 30 + Math.random() * 40;
            ob.h = 20 + Math.random() * 40;
            ob.x = baseW + 20;
            ob.y = groundY + (player.h - ob.h);
            ob.color = '#ef5350';
            ob.passed = false;
            obstacles.push(ob);
      }
      function resetGame() {
            obstacles.length = 0;
            obstaclePool.length = 0;
            player.y = groundY;
            player.vy = 0;
            player.onGround = true;
            score = 0;
            spawnTimer = 0;
            speed = 240;
            running = true;
            lastTime = performance.now();
            loop(lastTime);
      }
      function gameOver() {
            running = false;
            if (score > highScore) {
                  highScore = Math.floor(score);
                  localStorage.setItem(highKey, String(highScore));
            }
      }

      // --- Input ---
      function doJump() {
            if (!running) { resetGame(); return; }
            if (player.onGround) {
                  player.vy = -720;
                  player.onGround = false;
            }
      }
      window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); doJump(); } });
      canvas.addEventListener('mousedown', () => doJump());
      canvas.addEventListener('touchstart', (e) => { e.preventDefault(); doJump(); }, { passive: false });
      restartBtn.addEventListener('click', () => resetGame());

      // --- Physics & Collision ---
      function rectsOverlap(a, b) {
            return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      }

      // --- Main loop ---
      function loop(now) {
            if (!running) {
                  render();
                  return;
            }
            const dt = Math.min((now - lastTime) / 1000, 0.033);
            lastTime = now;

            // Update score & speed
            score += dt * 10;
            speed += dt * 2; // slowly increase difficulty

            // Spawn obstacles
            spawnTimer -= dt;
            if (spawnTimer <= 0) {
                  spawnObstacle();
                  spawnTimer = rand(0.9, 1.6) - Math.min(0.5, speed / 1000);
            }

            // Player physics
            player.vy += gravity * dt;
            player.y += player.vy * dt;
            if (player.y >= groundY) {
                  player.y = groundY;
                  player.vy = 0;
                  player.onGround = true;
            }

            // Obstacles movement & recycle
            for (let i = obstacles.length - 1; i >= 0; i--) {
                  const ob = obstacles[i];
                  ob.x -= speed * dt;
                  if (!ob.passed && ob.x + ob.w < player.x) {
                        ob.passed = true;
                        score += 5;
                  }
                  if (ob.x + ob.w < -40) {
                        obstacles.splice(i, 1);
                        obstaclePool.push(ob);
                  } else {
                        // collision
                        if (rectsOverlap(player, ob)) {
                              gameOver();
                        }
                  }
            }

            render();
            requestAnimationFrame(loop);
      }

      // --- Render ---
      function render() {
            // clear
            ctx.clearRect(0, 0, baseW, baseH);

            // ground
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(0, groundY + player.h, baseW, baseH - (groundY + player.h));

            // draw horizon / ground texture
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(0, 0, baseW, groundY);

            // player
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y - player.h, player.w, player.h);
            // simple eye
            ctx.fillStyle = '#0008';
            ctx.fillRect(player.x + player.w * 0.6, player.y - player.h + 10, 6, 6);

            // obstacles
            for (const ob of obstacles) {
                  ctx.fillStyle = ob.color;
                  ctx.fillRect(ob.x, ob.y - ob.h, ob.w, ob.h);
            }

            // UI
            scoreLabel.textContent = 'Score: ' + Math.floor(score);
            highLabel.textContent = 'High: ' + highScore;
            if (!running) {
                  // overlay
                  ctx.fillStyle = 'rgba(0,0,0,0.45)';
                  ctx.fillRect(0, 0, baseW, baseH);
                  ctx.fillStyle = '#fff';
                  ctx.font = '28px system-ui';
                  ctx.textAlign = 'center';
                  ctx.fillText('Jumping Game', baseW / 2, baseH / 2 - 20);
                  ctx.font = '18px system-ui';
                  ctx.fillText('Press Space / Click / Tap to start and jump', baseW / 2, baseH / 2 + 10);
                  if (score > 0) {
                        ctx.fillText('Final Score: ' + Math.floor(score), baseW / 2, baseH / 2 + 40);
                  }
                  ctx.textAlign = 'start';
            }
      }

      // initial render before start
      render();

      // make sure game starts when user interacts (some browsers require gesture to play)
      const startOnFirstInteraction = () => {
            window.removeEventListener('keydown', startOnFirstInteraction);
            window.removeEventListener('mousedown', startOnFirstInteraction);
            window.removeEventListener('touchstart', startOnFirstInteraction);
            resetGame();
      };
      window.addEventListener('keydown', startOnFirstInteraction, { once: true });
      window.addEventListener('mousedown', startOnFirstInteraction, { once: true });
      window.addEventListener('touchstart', startOnFirstInteraction, { once: true });
})();

// End of index.js