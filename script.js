// 🔒 TAMPER-PROOF ISOLATION LAYER
(() => {
    const canvas = document.getElementById('aviaryCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('scoreVal');
    const levelEl = document.getElementById('levelVal');

    const homeScreenUI = document.getElementById('homeScreenUI');
    const startGameBtn = document.getElementById('startGameBtn');
    
    // 🟢 HTML5 Animation Elements
    const deadlineEl = document.getElementById('deadline');
    const cssCountdown = document.getElementById('cssCountdown');
    const countdownText = document.getElementById('countdownText');

    const nameInputUI = document.getElementById('nameInputUI');
    const playerNameInput = document.getElementById('playerNameInput');
    const generateCertBtn = document.getElementById('generateCertBtn');
    const certificateUI = document.getElementById('certificateUI');
    const certCanvas = document.getElementById('certCanvas');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const restartBtn = document.getElementById('restartBtn');

    const { Engine, World, Bodies, Composite, Events } = Matter;
    
    const engine = Engine.create({
        positionIterations: 16, 
        velocityIterations: 12
    });
    
    const world = engine.world;
    engine.gravity.y = 2.4; 

    let width, height;
    let floor, leftWall, rightWall;

    let gameState = 'HOME_SCREEN'; 
    let score = 0;
    let maxLevelReached = 0; 
    let playerName = ""; 
    let dangerTimer = 0; 
    let isGameOver = false; 

    const LIMIT_Y = 200; 
    let dropY = 165;     

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        if (floor) {
            Matter.Body.setPosition(floor, { x: width / 2, y: height + 50 });
            Matter.Body.setPosition(leftWall, { x: -50, y: height / 2 });
            Matter.Body.setPosition(rightWall, { x: width + 50, y: height / 2 });
        } else {
            const wallOptions = { isStatic: true, render: { visible: false } };
            floor = Bodies.rectangle(width / 2, height + 50, width * 2, 100, wallOptions);
            leftWall = Bodies.rectangle(-50, height / 2, 100, height * 2, wallOptions);
            rightWall = Bodies.rectangle(width + 50, height / 2, 100, height * 2, wallOptions);
            World.add(world, [floor, leftWall, rightWall]);
        }
    }
    window.addEventListener('resize', resize);
    resize();

    const PARROT_LEVELS = [
        { r: 14, color: '#ffdfba', emoji: '🥚', src: null }, 
        { r: 18, color: '#ffffba', emoji: '1️⃣', src: '1.jpg' },
        { r: 24, color: '#baffc9', emoji: '2️⃣', src: '2.jpg' },
        { r: 32, color: '#bae1ff', emoji: '3️⃣', src: '3.jpg' },
        { r: 40, color: '#ffbaff', emoji: '4️⃣', src: '4.jpg' }, 
        { r: 48, color: '#d3baff', emoji: '5️⃣', src: '5.jpg' },
        { r: 58, color: '#ffadd6', emoji: '6️⃣', src: '6.jpg' },
        { r: 68, color: '#d6ffad', emoji: '7️⃣', src: '7.jpg' }, 
        { r: 80, color: '#add6ff', emoji: '8️⃣', src: '8.jpg' },
        { r: 92, color: '#836ef9', emoji: '9️⃣', src: '9.jpg' }, 
        { r: 105, color: '#ff00c8', emoji: '🔟', src: '10.jpg' }, 
    ];

    PARROT_LEVELS.forEach(level => {
        if (level.src) {
            const img = new Image();
            img.crossOrigin = "Anonymous"; 
            level.imgLoaded = false; 
            img.onload = () => { level.imgLoaded = true; level.imgObj = img; };
            img.onerror = () => { level.imgLoaded = false; };
            img.src = level.src;
            level.imgObj = img; 
        }
    });

    const nestTextureCanvas = document.createElement('canvas');
    nestTextureCanvas.width = 280; 
    nestTextureCanvas.height = 140;
    const nCtx = nestTextureCanvas.getContext('2d');
    nCtx.scale(2, 2); 

    function generateRealisticNest() {
        const cx = 70; const cy = 20; 
        nCtx.fillStyle = '#2e1c05'; nCtx.beginPath(); nCtx.ellipse(cx, cy, 50, 35, 0, 0, Math.PI, false); nCtx.fill();

        const strawColors = ['#e8c872', '#d4af37', '#b38b22', '#8b5a2b', '#c29b40', '#cfb53b', '#6b4e16'];
        for (let i = 0; i < 800; i++) {
            nCtx.beginPath(); nCtx.strokeStyle = strawColors[Math.floor(Math.random() * strawColors.length)];
            nCtx.lineWidth = Math.random() * 1.5 + 0.5; nCtx.globalAlpha = Math.random() * 0.7 + 0.3; nCtx.lineCap = 'round';
            let angle = Math.random() * Math.PI; let radius = Math.random() * 55;
            if (i % 10 === 0) radius += Math.random() * 15; 
            let startX = cx + Math.cos(angle) * radius; let startY = cy + Math.sin(angle) * (radius * 0.65); 
            let endX = startX + (Math.random() - 0.5) * 40; let endY = startY + (Math.random() - 0.5) * 20;
            let controlX = (startX + endX) / 2 + (Math.random() - 0.5) * 20; let controlY = Math.max(cy, (startY + endY) / 2 + Math.random() * 15); 
            nCtx.moveTo(startX, startY); nCtx.quadraticCurveTo(controlX, controlY, endX, endY); nCtx.stroke();
        }
        
        nCtx.globalAlpha = 1.0;
        const gradient = nCtx.createRadialGradient(cx, cy - 10, 10, cx, cy, 45);
        gradient.addColorStop(0, 'rgba(20, 10, 0, 0.9)'); gradient.addColorStop(1, 'rgba(20, 10, 0, 0)');
        nCtx.fillStyle = gradient; nCtx.beginPath(); nCtx.ellipse(cx, cy, 45, 15, 0, 0, Math.PI * 2); nCtx.fill();
    }
    generateRealisticNest();

    let dropX = width / 2;
    let canDrop = true;

    function drawNest(x, y) {
        ctx.save(); ctx.translate(x, y);
        const nestBirdLevel = PARROT_LEVELS[9]; const birdRadius = 35; 
        ctx.save(); ctx.translate(0, -25); 

        if (nestBirdLevel.src && nestBirdLevel.imgLoaded) {
            ctx.beginPath(); ctx.arc(0, 0, birdRadius, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(nestBirdLevel.imgObj, -birdRadius, -birdRadius, birdRadius * 2, birdRadius * 2);
            ctx.beginPath(); ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
            ctx.lineWidth = 3; ctx.strokeStyle = nestBirdLevel.color; ctx.stroke();
        } else {
            ctx.beginPath(); ctx.arc(0, 0, birdRadius, 0, Math.PI * 2); ctx.fillStyle = nestBirdLevel.color; ctx.fill();
            ctx.font = `40px Arial`; ctx.fillStyle = "white"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🦅', 0, 0); 
        }
        ctx.restore();
        ctx.drawImage(nestTextureCanvas, -70, -20, 140, 70);
        ctx.restore();
    }

    let particles = [];
    class Particle {
        constructor(x, y, level) {
            this.x = x; this.y = y; this.level = level;
            this.life = 1.0; this.decay = 0.02 + Math.random() * 0.02;
            this.vx = (Math.random() - 0.5) * 6; this.vy = (Math.random() - 0.5) * 6;
            this.size = Math.random() * 10 + 5; this.color = 'white';
            
            if (this.level === 0) { this.color = '#ffdfba'; this.size = 4; } 
            else if (this.level === 10) { this.size = 15; this.decay = 0.01; } 
            else { this.color = `hsl(${Math.random()*360}, 100%, 60%)`; }
        }
        update() { this.x += this.vx; this.y += this.vy; this.life -= this.decay; if (this.level === 10) this.size += 15; }
        draw() {
            if (this.life <= 0) return;
            ctx.save(); ctx.globalAlpha = Math.max(0, this.life);
            if (this.level === 10) {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.strokeStyle = `hsl(${(this.size * 2) % 360}, 100%, 50%)`; ctx.lineWidth = 10 * this.life; ctx.stroke();
            } else {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill();
            }
            ctx.restore();
        }
    }

    function triggerEffect(x, y, level) {
        let count = level === 10 ? 1 : 15; 
        for (let i = 0; i < count; i++) { particles.push(new Particle(x, y, level)); }
    }

    let audioCtx;
    function initAudio() {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } 
            catch(e) { return; }
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playMergeSound(level) {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
            osc.frequency.setValueAtTime(400 - (level * 20), audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3); osc.type = 'sine';
            osc.connect(gainNode); gainNode.connect(audioCtx.destination);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        } catch(e) {} 
    }

    const SAVE_KEY = '10kSquad_Aviary_Save';

    function saveGameState() {
        const activeBodies = Composite.allBodies(world).filter(b => b.level !== undefined);
        if ((score === 0 && activeBodies.length === 0) || isGameOver) return; 

        const bodiesData = activeBodies.map(b => ({
            x: b.position.x,
            y: b.position.y,
            vx: b.velocity.x,
            vy: b.velocity.y,
            angle: b.angle,
            angularVelocity: b.angularVelocity,
            level: b.level
        }));

        const saveData = { score, maxLevelReached, dangerTimer, bodies: bodiesData };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }

    function loadGameState() {
        try {
            const savedRaw = localStorage.getItem(SAVE_KEY);
            if (!savedRaw) return;
            
            const saveData = JSON.parse(savedRaw);

            score = saveData.score || 0;
            scoreEl.innerText = score;
            maxLevelReached = saveData.maxLevelReached || 0;
            levelEl.innerText = maxLevelReached;
            dangerTimer = saveData.dangerTimer || 0;

            if (saveData.bodies && saveData.bodies.length > 0) {
                saveData.bodies.forEach(bData => {
                    const radius = PARROT_LEVELS[bData.level].r;
                    const newBody = Bodies.circle(bData.x, bData.y, radius, {
                        restitution: 0.2, friction: 0.5, level: bData.level 
                    });
                    Matter.Body.setAngle(newBody, bData.angle || 0);
                    Matter.Body.setVelocity(newBody, { x: bData.vx || 0, y: bData.vy || 0 });
                    Matter.Body.setAngularVelocity(newBody, bData.angularVelocity || 0);
                    World.add(world, newBody);
                });
            }
        } catch (e) {
            console.error("Save file corrupted, starting fresh.");
            localStorage.removeItem(SAVE_KEY);
        }
    }

    loadGameState();

    window.addEventListener('beforeunload', saveGameState);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveGameState();
    });
    setInterval(() => {
        if (gameState === 'PLAYING') saveGameState();
    }, 2000);

    history.replaceState({ screen: 'home' }, '', window.location.pathname + window.location.search);

    function resetGame() {
        const bodiesToRemove = Composite.allBodies(world).filter(body => body.level !== undefined);
        World.remove(world, bodiesToRemove);
        
        score = 0; scoreEl.innerText = score;
        maxLevelReached = 0; levelEl.innerText = maxLevelReached;
        dangerTimer = 0; 
        isGameOver = false; 
        
        deadlineEl.classList.remove('on-fire');
        cssCountdown.classList.add('hidden');
        
        playerNameInput.value = ""; 
        canDrop = true;
        
        localStorage.removeItem(SAVE_KEY); 
    }

    function switchScreen(screenName, pushHistory = true) {
        if (pushHistory) {
            history.pushState({ screen: screenName }, '', `#${screenName}`);
        }

        homeScreenUI.classList.add('hidden');
        nameInputUI.classList.add('hidden');
        certificateUI.classList.add('hidden');

        if (screenName === 'home') {
            homeScreenUI.classList.remove('hidden');
            gameState = 'HOME_SCREEN';
            
            const hasActiveGame = Composite.allBodies(world).some(body => body.level !== undefined);
            if (hasActiveGame && !isGameOver) {
                startGameBtn.innerText = "▶️ RESUME GAME";
            } else {
                startGameBtn.innerText = "🎮 PLAY NOW";
            }
            
        } else if (screenName === 'play') {
            gameState = 'PLAYING';
        } else if (screenName === 'gameover') {
            nameInputUI.classList.remove('hidden');
            gameState = 'INPUT_NAME';
        } else if (screenName === 'cert') {
            certificateUI.classList.remove('hidden');
            gameState = 'CERTIFICATE';
        }
    }

    window.addEventListener('popstate', (event) => {
        const targetScreen = event.state ? event.state.screen : 'home';
        switchScreen(targetScreen, false); 
    });

    switchScreen('home', false);

    startGameBtn.addEventListener('click', () => {
        initAudio(); 
        if (isGameOver) {
            resetGame();
        }
        switchScreen('play');
    });

    playerNameInput.addEventListener('input', () => {
        playerNameInput.classList.remove('error-shake');
        playerNameInput.placeholder = "Name or @Handle";
    });

    generateCertBtn.addEventListener('click', () => {
        initAudio();
        const input = playerNameInput.value.trim();
        
        if (input === "") {
            playerNameInput.classList.add('error-shake');
            playerNameInput.value = ""; 
            playerNameInput.placeholder = "⚠️ NAME IS REQUIRED!";
            setTimeout(() => { playerNameInput.classList.remove('error-shake'); }, 300);
            return; 
        }
        
        playerName = input;
        generateCertificate();
        
        history.replaceState({ screen: 'home' }, '', '#home');
        switchScreen('cert', true); 
    });

    restartBtn.addEventListener('click', () => {
        resetGame();
        switchScreen('play');
    });

    canvas.addEventListener('pointerdown', (e) => {
        if (gameState !== 'PLAYING') return;
        initAudio(); dropX = e.clientX;
    });

    canvas.addEventListener('pointermove', (e) => {
        if(!canDrop || gameState !== 'PLAYING') return;
        dropX = e.clientX;
    });

    window.addEventListener('pointerup', () => {
        if (!canDrop || gameState !== 'PLAYING') return;
        
        const eggData = PARROT_LEVELS[0];
        let safeX = Math.max(eggData.r + 40, Math.min(width - eggData.r - 40, dropX));
        
        const newBody = Bodies.circle(safeX, dropY + 5, eggData.r, {
            restitution: 0.2, friction: 0.5, level: 0
        });
        Matter.Body.setVelocity(newBody, { x: 0, y: 15 });
        World.add(world, newBody);
        
        canDrop = false;
        setTimeout(() => { if (gameState === 'PLAYING') canDrop = true; }, 350); 
    });

    let pendingMerges = [];
    Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            if (bodyA.level !== undefined && bodyB.level !== undefined) {
                if (bodyA.level === bodyB.level && bodyA.level < PARROT_LEVELS.length - 1) {
                    if (!bodyA.isMerging && !bodyB.isMerging) {
                        bodyA.isMerging = true; bodyB.isMerging = true;
                        pendingMerges.push({ bodyA, bodyB, level: bodyA.level });
                    }
                }
            }
        });
    });

    Events.on(engine, 'afterUpdate', () => {
        pendingMerges.forEach(merge => {
            const { bodyA, bodyB, level } = merge;
            World.remove(world, [bodyA, bodyB]);
            
            const nextTarget = level + 1;
            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2 - 5; 
            
            const mergedBody = Bodies.circle(newX, newY, PARROT_LEVELS[nextTarget].r, {
                restitution: 0.2, friction: 0.5, level: nextTarget
            });
            World.add(world, mergedBody);
            
            score += (nextTarget * 10); scoreEl.innerText = score;
            if (nextTarget > maxLevelReached) {
                maxLevelReached = nextTarget;
                levelEl.innerText = maxLevelReached;
            }

            playMergeSound(nextTarget);
            triggerEffect(newX, newY, nextTarget);
        });
        pendingMerges = [];
    });

    function generateCertificate() {
        const cCtx = certCanvas.getContext('2d');
        const cw = certCanvas.width; const ch = certCanvas.height;
        
        const bgGradient = cCtx.createLinearGradient(0, 0, 0, ch);
        bgGradient.addColorStop(0, '#150524'); bgGradient.addColorStop(1, '#050508');
        cCtx.fillStyle = bgGradient; cCtx.fillRect(0, 0, cw, ch);
        
        cCtx.strokeStyle = '#836ef9'; cCtx.lineWidth = 10; cCtx.strokeRect(20, 20, cw - 40, ch - 40);
        cCtx.strokeStyle = '#00ffd5'; cCtx.lineWidth = 2; cCtx.strokeRect(35, 35, cw - 70, ch - 70);

        const logoLevel = PARROT_LEVELS[9]; const logoRadius = 80; const logoY = 180;
        
        cCtx.save(); cCtx.translate(cw / 2, logoY);
        if (logoLevel.src && logoLevel.imgLoaded) {
            cCtx.beginPath(); cCtx.arc(0, 0, logoRadius, 0, Math.PI * 2); cCtx.closePath(); cCtx.clip();
            cCtx.drawImage(logoLevel.imgObj, -logoRadius, -logoRadius, logoRadius * 2, logoRadius * 2);
            cCtx.beginPath(); cCtx.arc(0, 0, logoRadius, 0, Math.PI * 2);
            cCtx.lineWidth = 5; cCtx.strokeStyle = '#ff00c8'; cCtx.stroke();
        } else {
            cCtx.beginPath(); cCtx.arc(0, 0, logoRadius, 0, Math.PI * 2); cCtx.fillStyle = '#836ef9'; cCtx.fill();
            cCtx.font = `80px Arial`; cCtx.fillStyle = "white"; cCtx.textAlign = 'center'; cCtx.textBaseline = 'middle'; cCtx.fillText('🦅', 0, 0); 
        }
        cCtx.restore();

        cCtx.textAlign = 'center';
        cCtx.fillStyle = '#836ef9'; cCtx.font = 'bold 35px Courier New'; cCtx.fillText('10kSQUAD Aviary Game', cw / 2, 340);
        cCtx.fillStyle = '#ffffff'; cCtx.font = 'bold 60px Courier New'; cCtx.fillText('CERTIFICATE OF', cw / 2, 420);
        cCtx.fillStyle = '#00ffd5'; cCtx.fillText('MASTERY', cw / 2, 490);
        cCtx.fillStyle = '#aaaaaa'; cCtx.font = '24px Courier New'; cCtx.fillText('This officially verifies that :', cw / 2, 580);
        cCtx.fillStyle = '#ff00c8'; cCtx.font = 'bold 55px Courier New'; cCtx.fillText(playerName.toUpperCase(), cw / 2, 650);
        cCtx.fillStyle = '#ffffff'; cCtx.font = '30px Courier New'; cCtx.fillText(`Achieved LEVEL: ${maxLevelReached} / 11`, cw / 2, 730);
        cCtx.fillText(`Final Score: ${score}`, cw / 2, 780);
        cCtx.fillStyle = '#aaaaaa'; cCtx.font = 'italic 18px Courier New';
        cCtx.fillText("Recognized by the 10kSquad NFT platform on the Monad Ecosystem.", cw / 2, 880);
        cCtx.fillText("Verified 10kSquad & diamond-handed resilience.", cw / 2, 910);
    }

    downloadBtn.addEventListener('click', () => {
        try {
            const link = document.createElement('a');
            link.download = `10kSquad_Level${maxLevelReached}_${playerName}.png`;
            link.href = certCanvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            alert("Security policy prevents local downloads. Host the site to download!");
        }
    });

    shareBtn.addEventListener('click', async () => {
        const text = `I just reached Level ${maxLevelReached} with a score of ${score} in the official 10kSquad Nest Drop game! 🦜 🔥 Can you beat my record? @the10kSquad @monad @buildanythingso`;
        if (navigator.canShare && navigator.share) {
            try {
                certCanvas.toBlob(async (blob) => {
                    const file = new File([blob], `10kSquad_Record.png`, { type: 'image/png' });
                    await navigator.share({
                        title: '10kSquad Avairy',
                        text: text,
                        files: [file]
                    });
                }, 'image/png');
                return;
            } catch (err) {
                console.log("Share API blocked or failed, falling back to intent.");
            }
        }
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    });

    let lastTime = performance.now();

    function animate(currentTime) {
        let delta = currentTime - lastTime;
        lastTime = currentTime;
        
        if (delta > 100) delta = 16; 
        else if (delta > 33) delta = 33; 

        ctx.clearRect(0, 0, width, height);

        if (gameState === 'PLAYING') Engine.update(engine, delta);

        const bodies = Composite.allBodies(world);
        let isDanger = false;

        bodies.forEach(body => {
            if (body.level !== undefined) {
                const levelData = PARROT_LEVELS[body.level];
                const { x, y } = body.position;
                const radius = levelData.r;
                
                if (y > height + 200) {
                    World.remove(world, body);
                    return;
                }

                // 🟢 FIXED: More forgiving speed threshold so wiggling balls aren't ignored
                if (y - radius < LIMIT_Y && body.speed < 3 && y > dropY + 20) { 
                    isDanger = true; 
                }
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(body.angle);
                
                if (levelData.src && levelData.imgLoaded) {
                    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
                    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(levelData.imgObj, -radius, -radius, radius * 2, radius * 2);
                    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    ctx.lineWidth = 2; ctx.strokeStyle = levelData.color; ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.arc(0, 0, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = levelData.color; ctx.fill(); 
                    ctx.font = `${radius * 1.2}px Arial`; ctx.fillStyle = "black"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; 
                    ctx.fillText(levelData.emoji, 0, 0);
                }
                ctx.restore();
            }
        });

        // 🟢 HTML5 / CSS3 LOGIC TRIGGER (Updated Algorithm)
        if (gameState === 'PLAYING') {
            // 1. Smoothly increment or decrement the timer (Soft Reset)
            if (isDanger) {
                dangerTimer += delta;
            } else {
                dangerTimer -= delta * 5; // Fast drain, but prevents instant wiping
                if (dangerTimer < 0) dangerTimer = 0;
            }

            // 2. Handle the UI and Game Over states
            if (dangerTimer > 0) {
                deadlineEl.classList.add('on-fire');
                cssCountdown.classList.remove('hidden');

                if (dangerTimer >= 4000) { // Exactly 4 seconds (3, 2, 1, 0)
                    isGameOver = true;
                    saveGameState();
                    
                    dangerTimer = 0; // Reset for next game
                    deadlineEl.classList.remove('on-fire');
                    cssCountdown.classList.add('hidden');
                    
                    switchScreen('gameover'); 
                } else {
                    let secondsLeft = 3 - Math.floor(dangerTimer / 1000);
                    secondsLeft = Math.max(0, Math.min(3, secondsLeft)); // Clamp between 0-3
                    
                    if (countdownText.innerText !== secondsLeft.toString()) {
                        countdownText.innerText = secondsLeft;
                        
                        countdownText.classList.remove('pulse-anim');
                        void countdownText.offsetWidth; 
                        countdownText.classList.add('pulse-anim');
                    }
                }
            } else {
                deadlineEl.classList.remove('on-fire');
                cssCountdown.classList.add('hidden');
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(); particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }

        if (gameState === 'PLAYING') {
            let safeX = Math.max(50, Math.min(width - 50, dropX));
            drawNest(safeX, dropY);
            
            ctx.beginPath(); ctx.setLineDash([10, 15]); ctx.moveTo(safeX, dropY + 20); ctx.lineTo(safeX, height);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke(); ctx.setLineDash([]);
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
})();
