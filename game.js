import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// ==================== GAME STATE ====================
const gameState = {
  isRunning: false,
  isPaused: false,
  hp: 300,
  pizza: 0,
  score: 0,
};

// ==================== SCENE ====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 10, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ==================== LIGHT ====================
scene.add(new THREE.AmbientLight(0xffffff, 2));

const dirLight = new THREE.DirectionalLight(0xffffff, 3);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// ==================== GROUND ====================
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x228b22 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ==================== CAT ====================
class FatCat {
  constructor() {
    this.group = new THREE.Group();

    this.speed = 0.15;
    this.isMoving = false;

    this.originalPosition = new THREE.Vector3(0, 1, 0);
    this.originalRotationX = 0;

    this.loadModel();
  }

  loadModel() {
    const loader = new OBJLoader();
    loader.load('./cat.obj', (obj) => {
      obj.scale.set(1, 1, 1);

      obj.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.group.add(obj);
      this.group.position.copy(this.originalPosition);
      this.originalRotationX = this.group.rotation.x;

      // kecilkan di awal biar nggak memenuhi layar
      this.group.scale.set(0.25, 0.25, 0.25);

      // Hadapkan model kucing agar membelakangi player sesuai model
      // (penyesuaian: biar saat mundur/maju tidak terasa aneh)
      this.group.rotation.y = Math.PI;

      scene.add(this.group);
    });
  }

  move(direction) {
    const isMoving = Boolean(
      direction.forward ||
      direction.backward ||
      direction.left ||
      direction.right
    );

    this.isMoving = isMoving;

    // Rotasi (hadapkan model) supaya forward/backward terasa benar
    // Agar tetap membelakangi saat mundur, kita tidak memaksa rotation kembali
    // kecuali tombol forward/left/right ditekan.
    if (direction.backward) {
      this.group.rotation.y = 0;
    } else if (direction.forward) {
      this.group.rotation.y = Math.PI;
    }

    // Translasi
    // Jika mundur, gerakan tetap kita hitung sama (sumbu), rotasi yang menyesuaikan.


    // NOTE: sumbu gerak dibuat sesuai input WASD.
    // WASD:
    // - W: maju (x+)
    // - S: mundur (x-)
    // - A: kiri (z+)
    // - D: kanan (z-)

    const move = new THREE.Vector3();

    if (direction.forward) move.x += this.speed;
    if (direction.backward) move.x -= this.speed;
    if (direction.left) move.z += this.speed;
    if (direction.right) move.z -= this.speed;

    this.group.position.add(move);

    // clamp
    this.group.position.x = Math.max(-20, Math.min(20, this.group.position.x));
    this.group.position.z = Math.max(-20, Math.min(20, this.group.position.z));
  }

  rotate(angle) {
    this.group.rotation.y += angle;
  }

  scale(factor) {
    this.group.scale.multiplyScalar(factor);
  }

  resetTransform() {
    this.group.position.set(0, 1, 0);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.set(1, 1, 1);
    this.originalRotationX = 0;
  }

  update() {
    const t = Date.now() * 0.003;

    if (this.isMoving) {
      const rollAmt = Math.sin(t * 6) * 0.9;
      const bobAmt = Math.abs(Math.sin(t * 6)) * 0.25;

      this.group.position.y = 1 + Math.sin(t) * 0.05 + bobAmt;
      this.group.rotation.x = this.originalRotationX + rollAmt;
    } else {
      // kembali smooth saat tidak bergerak
      this.group.position.y = 1 + Math.sin(t) * 0.03;
      this.group.rotation.x = this.originalRotationX;
    }
  }
}

// ==================== PIZZA ====================
class Pizza {
  constructor() {
    this.group = new THREE.Group();
    this.isCollected = false;

    this.loadModel();
    this.randomPosition();
  }

  loadModel() {
    const loader = new OBJLoader();
    loader.load('./pizza.obj', (obj) => {
      obj.scale.set(0.5, 0.5, 0.5);
      this.group.add(obj);
      scene.add(this.group);
    });
  }

  randomPosition() {
    this.group.position.set(
      (Math.random() - 0.5) * 30,
      0.5,
      (Math.random() - 0.5) * 30
    );
  }

  update() {
    this.group.rotation.y += 0.02;
  }

  collect() {
    this.isCollected = true;
    scene.remove(this.group);
  }
}

// ==================== ENEMY ====================
class Enemy {
  constructor() {
    this.group = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x444444 })
    );

    scene.add(this.group);

    this.speed = 0.03 + Math.random() * 0.02;
    this.randomPosition();
  }

  randomPosition() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 5;

    this.group.position.set(
      Math.cos(angle) * distance,
      0.5,
      Math.sin(angle) * distance
    );
  }

  update(targetPos) {
    const dir = new THREE.Vector3().subVectors(targetPos, this.group.position).normalize();
    this.group.position.add(dir.multiplyScalar(this.speed));
  }
}

// ==================== GAME OBJECTS ====================
let cat;
let pizzas = [];
let enemies = [];

// ==================== HUD ====================
function updateHUD() {
  document.getElementById('hp').textContent = gameState.hp;
  document.getElementById('pizza').textContent = gameState.pizza;
  document.getElementById('score').textContent = gameState.score;
}

// ==================== GAME FLOW ====================
function initGame() {
  pizzas = [];
  enemies = [];
  cat = new FatCat();

  for (let i = 0; i < 5; i++) pizzas.push(new Pizza());
  for (let i = 0; i < 3; i++) enemies.push(new Enemy());

  gameState.hp = 300;
  gameState.pizza = 0;
  gameState.score = 0;

  updateHUD();
}

function endGame() {
  gameState.isRunning = false;
  gameState.isPaused = false;

  document.getElementById('final-score').textContent = gameState.score;
  document.getElementById('game-over').style.display = 'block';

  document.getElementById('hud').style.display = 'none';
  document.getElementById('controls-panel').style.display = 'none';
}

function checkCollisions() {
  if (!cat) return;
  if (gameState.hp <= 0) return;
  if (!gameState.isRunning) return;

  const pos = cat.group.position;

  pizzas.forEach((pizza, i) => {
    if (pizza.isCollected) return;

    if (pos.distanceTo(pizza.group.position) < 2) {
      pizza.collect();

      gameState.pizza += 1;
      gameState.score += 100;
      updateHUD();

      pizzas[i] = new Pizza();
    }
  });

  enemies.forEach((enemy) => {
    if (pos.distanceTo(enemy.group.position) < 2) {
      gameState.hp -= 1;
      updateHUD();
    }
  });

  if (gameState.hp <= 0) endGame();
}

// ==================== INPUT ====================
const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// ==================== BUTTONS ====================
document.getElementById('btn-restart')?.addEventListener('click', () => {
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('controls-panel').style.display = 'flex';

  gameState.isRunning = true;
  initGame();
});

document.getElementById('btn-start')?.addEventListener('click', () => {
  gameState.isRunning = true;
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('controls-panel').style.display = 'flex';
  initGame();
});

document.getElementById('btn-rotate')?.addEventListener('click', () => {
  if (cat) cat.rotate(Math.PI / 4);
});

document.getElementById('btn-scale-up')?.addEventListener('click', () => {
  if (cat) cat.scale(1.2);
});

document.getElementById('btn-scale-down')?.addEventListener('click', () => {
  if (cat) cat.scale(0.8);
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
  if (cat) cat.resetTransform();
});

// ==================== LOOP ====================
function animate() {
  requestAnimationFrame(animate);

  if (gameState.isRunning && !gameState.isPaused) {
    if (cat) {
      cat.move({
        // Arrow keys
        forward: keys['ArrowUp'],
        backward: keys['ArrowDown'],
        left: keys['ArrowLeft'],
        right: keys['ArrowRight'],
      });
      cat.update();
    }

    pizzas.forEach((pizza) => {
      if (!pizza.isCollected) pizza.update();
    });

    if (cat) {
      enemies.forEach((enemy) => {
        enemy.update(cat.group.position);
      });

      checkCollisions();

      camera.position.x = cat.group.position.x;
      camera.position.z = cat.group.position.z + 15;
      camera.lookAt(cat.group.position);
    }
  }

  renderer.render(scene, camera);
}

animate();

