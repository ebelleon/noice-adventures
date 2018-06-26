PlayState = {};

var Button = document.getElementById('startGame');
Button.addEventListener('click', () => {
  let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
  game.state.add('play', PlayState);
  game.state.start('play', true, false, {level: 0});
  Button.style.display = 'none';
});

/* Hero START */
function Hero(game, x, y) {
  // call the Phaser.Sprite constructor
  Phaser.Sprite.call(this, game, x, y, 'hero');
  this.anchor.set(0.5, 0.5);
  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;

  this.animations.add('stop', [0]);
  this.animations.add('run', [1, 2], 8, true);
  this.animations.add('jump', [3]);
  this.animations.add('fall', [4]);
  this.animations.add('die', [5, 6, 5, 6, 5, 6], 10);
}

Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function(direction) {
  const SPEED = 200;
  this.body.velocity.x = direction * SPEED;

  this.body.velocity.x < 0 ? this.scale.x = -1 : this.scale.x = 1;

  if (this.body.onFloor()) {
    this.die();
    this.events.onKilled.addOnce(function() {
      this.game.state.restart(true, false, {level: PlayState.level});
    }, this);
  }
};

Hero.prototype.jump = function() {
  const JUMP_SPEED = 580;
  let canJump = this.body.touching.down;

  if(canJump) {
    this.body.velocity.y = -JUMP_SPEED;
  }

  return canJump;
};

Hero.prototype.bounce = function() {
  const BOUNCE_SPEED = 200;
  this.body.velocity.y = -BOUNCE_SPEED;
};

Hero.prototype._getAnimationName = function() {
  let name = '';

  !this.alive ? name = 'die' :
  this.body.velocity.y < 0 ? name = 'jump' :
  this.body.velocity.y >= 0 && !this.body.touching.down ? name = 'fall' :
  this.body.velocity.x !== 0 && this.body.touching.down ? name = 'run' : name = 'stop';

  return name;
}

Hero.prototype.update = function() {
  let animationName = this._getAnimationName();
  if (this.animations.name !== animationName) {
    this.animations.play(animationName);
  }
};

Hero.prototype.die = function() {
  this.alive = false;
  this.body.enable = false;

  this.animations.play('die').onComplete.addOnce(function() {
    this.kill();
  }, this);
}
/* Hero END */

/* Spider START */
function Spider(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'spider');

  this.anchor.set(0.5);

  this.animations.add('crawl', [0, 1, 2], 7, true);
  this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 10);
  this.animations.play('crawl');

  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;
  this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 200;

Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

Spider.prototype.update = function() {
  this.body.touching.right || this.body.blocked.right ? this.body.velocity.x = -Spider.SPEED :
  this.body.touching.left || this.body.blocked.left ? this.body.velocity.x = Spider.SPEED : null;
}

Spider.prototype.die = function() {
  this.body.enable = false;

  this.animations.play('die').onComplete.addOnce(function() {
    this.kill();
  }, this);
}
/* Spider END */

// create game entities and set up world
PlayState.create = function() {
  this.game.add.image(0,0, 'background');
  this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));

  this.sfx = {
    jump:  this.game.add.audio('sfx:jump'),
    coin:  this.game.add.audio('sfx:coin'),
    stomp: this.game.add.audio('sfx:stomp'),
    key:   this.game.add.audio('sfx:key'),
    door:  this.game.add.audio('sfx:door')
  };

  this._createHud();
};

const LEVEL_COUNT = 3;

PlayState.init = function(data) {
  this.game.renderer.renderSession.roundPixels = true;
  this.keys = this.game.input.keyboard.addKeys({
    left: Phaser.KeyCode.LEFT,
    right: Phaser.KeyCode.RIGHT,
    up: Phaser.KeyCode.UP
  });

  this.keys.up.onDown.add(function() {
    let didJump = this.hero.jump();
    if(didJump) {
      this.sfx.jump.play();
    }
  }, this);

  this.coinCount = 0;
  this.hasKey = false;
  this.level = (data.level || 0) % LEVEL_COUNT;
};

// load all necessary resources
PlayState.preload = function() {
  this.game.load.image('background', 'images/background.png');
  this.game.load.image('ground', 'images/ground.png');
  this.game.load.image('grass:8x1', 'images/grass_8x1.png');
  this.game.load.image('grass:6x1', 'images/grass_6x1.png');
  this.game.load.image('grass:4x1', 'images/grass_4x1.png');
  this.game.load.image('grass:2x1', 'images/grass_2x1.png');
  this.game.load.image('grass:1x1', 'images/grass_1x1.png');
  this.game.load.image('invisible-wall', 'images/invisible_wall.png');
  this.game.load.image('icon:coin', 'images/coin_icon.png');
  this.game.load.image('font:numbers', 'images/numbers.png');
  this.game.load.image('key', 'images/key.png');
  this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30);
  this.game.load.spritesheet('door', 'images/door.png', 42, 66);
  this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
  this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
  this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
  this.game.load.audio('sfx:jump', 'audio/jump.wav');
  this.game.load.audio('sfx:coin', 'audio/coin.wav');
  this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
  this.game.load.audio('sfx:key', 'audio/key.wav');
  this.game.load.audio('sfx:door', 'audio/door.wav');
  this.game.load.json('level:0', 'data/level00.json');
  this.game.load.json('level:1', 'data/level01.json');
  this.game.load.json('level:2', 'data/level02.json');
};

PlayState.update = function() {
  this._handleCollisions();
  this._handleInput();
  this.coinFont.text = `x${this.coinCount}`;
  this.keyIcon.frame = !this.hasKey ? 0 : 1;
};

PlayState._loadLevel = function(data) {
  this.bgDecoration = this.game.add.group();
  this.platforms = this.game.add.group();
  this.coins = this.game.add.group();
  this.spiders = this.game.add.group();
  this.enemyWalls = this.game.add.group();
  this.enemyWalls.visible = false;

  // spawn heros and enemies
  data.platforms.forEach(this._spawnPlatform, this);
  this._spawnCharacters({hero: data.hero, spiders: data.spiders});

  data.coins.forEach(this._spawnCoins, this);
  this._spawnDoor(data.door.x, data.door.y);
  this._spawnKey(data.key.x, data.key.y);

  const GRAVITY = 1200;
  this.game.physics.arcade.gravity.y = GRAVITY;
};

PlayState._spawnPlatform = function(platform) {
  let sprite = this.platforms.create(
    platform.x, platform.y, platform.image);
  this.game.physics.enable(sprite);

  this._spawnEnemyWall(platform.x, platform.y, 'left');
  this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');

  sprite.body.allowGravity = false;
  sprite.body.immovable = true;
};

PlayState._spawnEnemyWall = function(x, y, side) {
  let sprite = this.enemyWalls.create(x, y, 'invisible-wall');

  sprite.anchor.set(side === 'left' ? 1 : 0, 1);

  this.game.physics.enable(sprite);
  sprite.body.immovable = true;
  sprite.body.allowGravity = false;
};

PlayState._spawnCharacters = function(data) {
  this.hero = new Hero(this.game, data.hero.x, data.hero.y);
  this.game.add.existing(this.hero);

  data.spiders.forEach(function(spider) {
    let sprite = new Spider(this.game, spider.x, spider.y);
    this.spiders.add(sprite);
  }, this);
};

PlayState._spawnCoins = function(coin) {
  let sprite = this.coins.create(coin.x, coin.y, 'coin');
  sprite.anchor.set(0.5, 0.5);
  sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps, looped
  sprite.animations.play('rotate');

  this.game.physics.enable(sprite);
  sprite.body.allowGravity = false;
};

PlayState._spawnDoor = function(x, y) {
  this.door = this.bgDecoration.create(x, y, 'door');
  this.door.anchor.setTo(0.5, 1);
  this.game.physics.enable(this.door);
  this.door.body.allowGravity = false;
};

PlayState._spawnKey = function(x, y) {
  this.key = this.bgDecoration.create(x, y, 'key');
  this.key.anchor.setTo(0.5, 0.5);
  this.game.physics.enable(this.key);
  this.key.body.allowGravity = false;

  this.key.y -= 3;
  this.game.add.tween(this.key)
    .to({y: this.key.y +6}, 800, Phaser.Easing.Sinusoidal.InOut)
    .yoyo(true)
    .loop()
    .start();
};

PlayState._handleCollisions = function() {
  this.game.physics.arcade.collide(this.hero, this.platforms);
  this.game.physics.arcade.collide(this.spiders, this.platforms);
  this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
  this.game.physics.arcade.overlap(this.hero, this.coins, this._heroVsCoin, null, this);
  this.game.physics.arcade.overlap(this.hero, this.spiders, this._heroVsEnemy, null, this);
  this.game.physics.arcade.overlap(this.hero, this.key, this._heroVsKey, null, this);
  this.game.physics.arcade.overlap(this.hero, this.door, this._heroVsDoor,
    function(hero, door) {
      if (this.level === (LEVEL_COUNT - 1) && this.hasKey && hero.body.touching.down) {
        this.game.destroy();
        window.alert('Well Done!\nDu hast unser Spiel durchgespielt.');
        Button.style.display = 'block';
      } else {
        return this.hasKey && hero.body.touching.down;
      }
    }, this);
};

PlayState._heroVsCoin = function(hero, coin) {
  this.sfx.coin.play();
  coin.kill();
  this.coinCount++;
};

PlayState._heroVsEnemy = function(hero, enemy) {
  hero.body.velocity.y > 0 ? (
    this.sfx.stomp.play(),
    hero.bounce(),
    enemy.die()
  ) : (
    this.sfx.stomp.play(),
    hero.die(),
    hero.events.onKilled.addOnce(function() {
      this.game.state.restart(true, false, {level: this.level});
    }, this)
  );
};

PlayState._heroVsKey = function(hero, key) {
  this.sfx.key.play();
  key.kill();
  this.hasKey = true;
};

PlayState._heroVsDoor = function() {
  this.sfx.door.play();
  this.game.state.restart(true, false, {level: this.level + 1});
};

PlayState._handleInput = function() {
  this.keys.left.isDown ? this.hero.move(-1) : this.keys.right.isDown ? this.hero.move(1) : this.hero.move(0);

  this.keys.up.onDown.add(function() {
    this.hero.jump();
  }, this);
};

PlayState._createHud = function() {
  this.keyIcon = this.game.make.image(0, 19, 'icon:key');
  this.keyIcon.anchor.set(0, 0.5);

  const NUMBERS_STR = '0123456789X ';
  this.coinFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR);

  let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
  let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width, coinIcon.height / 2, this.coinFont);
  coinScoreImg.anchor.set(0, 0.5);

  this.hud = this.game.add.group();
  this.hud.add(coinIcon);
  this.hud.position.set(10, 10);
  this.hud.add(coinScoreImg);
  this.hud.add(this.keyIcon);
};
