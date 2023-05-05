const canvas = document.getElementById("phax_canvas");
canvas.style.border = "3px solid black";
const ctx = canvas.getContext("2d");

let lastUpdateTime = performance.now();
let colliders = [];

//#region Canvas resolution configuration

canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.8;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

document.body.appendChild(canvas);


const devicePixelRatio = window.devicePixelRatio || 1;
const backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                          ctx.mozBackingStorePixelRatio ||
                          ctx.msBackingStorePixelRatio ||
                          ctx.oBackingStorePixelRatio ||
                          ctx.backingStorePixelRatio || 1;
const ratio = devicePixelRatio / backingStoreRatio;

if (devicePixelRatio !== backingStoreRatio) 
{
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  canvas.width = oldWidth * ratio;
  canvas.height = oldHeight * ratio;
  canvas.style.width = oldWidth + "px";
  canvas.style.height = oldHeight + "px";
  ctx.scale(ratio, ratio);
}

//#endregion

//#region Class definitions

class Vector2 
{
    constructor(x, y) 
    {
        this.x = x;
        this.y = y;
    }

    add(other) 
    {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    subtract(other) 
    {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    multiply(scalar) 
    {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    divide(scalar) 
    {
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }

    magnitude() 
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() 
    {
        const mag = this.magnitude();
        if (mag !== 0) 
        {
            this.divide(mag);
        }
        return this;
    }

    static distance(vec1, vec2) 
    {
        const dx = vec2.x - vec1.x;
        const dy = vec2.y - vec1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
window.Vector2 = Vector2;

class Circle 
{
    constructor(position, radius, fillColor, strokeColor, lineWidth) 
    {
      this.position = position;
      this.radius = radius;
      this.fillColor = fillColor;
      this.strokeColor = strokeColor;
      this.lineWidth = lineWidth;
    }
  
    draw() 
    {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        if (this.fillColor) 
        {
            ctx.fillStyle = this.fillColor;
            ctx.fill();
        }
        if (this.strokeColor) 
        {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.lineWidth || 1;
            ctx.stroke();
        }
    }

    collidesWith(other) 
    {
        if (other instanceof Circle) 
        {
            const distance = Math.sqrt((other.position.x - this.position.x) ** 2 + (other.position.y - this.position.y) ** 2);
            return distance < this.radius + other.radius;
        } 
        else if (other instanceof Square) 
        {
            const closestX = Math.max(other.position.x - other.radius / 2, Math.min(this.position.x, other.position.x + other.radius / 2));
            const closestY = Math.max(other.position.y - other.radius / 2, Math.min(this.position.y, other.position.y + other.radius / 2));
            const distance = Math.sqrt((this.position.x - closestX) ** 2 + (this.position.y - closestY) ** 2);
            return distance < this.radius;
        }
    }

    update()
    {
        
    }
  
}
window.Circle = Circle;

class Square 
{
  constructor(position, radius, fillColor, strokeColor, lineWidth) 
  {
    this.position = position;
    this.radius = radius;
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
    this.lineWidth = lineWidth;
    colliders.push(this);
  }

  draw() 
  {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 10;
    ctx.beginPath();
    const halfSideLength = Math.sqrt(2) * (this.radius / 2);
    const startX = this.position.x - halfSideLength;
    const startY = this.position.y - halfSideLength;
    ctx.rect(startX, startY, this.radius, this.radius);
    if (this.fillColor) 
    {
      ctx.fillStyle = this.fillColor;
      ctx.fill();
    }

    if (this.strokeColor) 
    {
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.lineWidth || 1;
      ctx.stroke();
    }
  }

  
  collidesWith(otherObject) 
  {
    if (otherObject instanceof Square) 
    {
      const thisTopLeft = { x: this.position.x - this.radius, y: this.position.y - this.radius };
      const thisBottomRight = { x: this.position.x + this.radius, y: this.position.y + this.radius };
      const otherTopLeft = { x: otherObject.position.x - otherObject.width / 2, y: otherObject.position.y - otherObject.height / 2 };
      const otherBottomRight = { x: otherObject.position.x + otherObject.width / 2, y: otherObject.position.y + otherObject.height / 2 };
      if (thisTopLeft.x < otherBottomRight.x && thisBottomRight.x > otherTopLeft.x && thisTopLeft.y < otherBottomRight.y && thisBottomRight.y > otherTopLeft.y) {
        return true;
      }
      const dx = Math.min(Math.abs(this.position.x - otherTopLeft.x), Math.abs(this.position.x - otherBottomRight.x));
      const dy = Math.min(Math.abs(this.position.y - otherTopLeft.y), Math.abs(this.position.y - otherBottomRight.y));
      return Math.sqrt(dx * dx + dy * dy) < this.radius;
    }
    return false;
  }


  update()
  {
      
  }

  setPosition(pos)
  {
    this.position = pos;
  }

  destroy()
  {
    colliders.filter(c => c !== this);
  }
}
window.Square = Square;

class SquareMap 
{
    constructor(radius, map, position = new Vector2(0, 0), ) 
    {
        this.position = position;
        this.radius = radius;
        this.map = map;
        this.squares = [];

        for (let i = 0; i < map.length; i++) 
        {
            const row = [];
            for (let j = 0; j < map[i].length; j++) 
            {
            const squarePosition = new Vector2(
                this.position.x + (j / 2) * this.radius * 2,
                this.position.y + (i / 2) * this.radius * 2
            );

            const square = new Square(squarePosition,this.radius,getColorByCode(map[i][j]),getColorByCode(map[i][j]),1);
          row.push(square);
        }
        this.squares.push(row);
      }
    }

    update()
    {
        
    }
  
    draw() 
    {
      for (let i = 0; i < this.squares.length; i++) 
      {
        for (let j = 0; j < this.squares[i].length; j++) 
        {
            const squarePosition = new Vector2(
                this.position.x + (j / 2) * this.radius * 2,
                this.position.y + (i / 2) * this.radius * 2
            );
            this.squares[i][j].setPosition(squarePosition);
            this.squares[i][j].draw();
        }
      }
    }
  
    getSquareAt(position) 
    {
      const i = Math.floor((position.y - this.position.y) / (this.radius * 2));
      const j = Math.floor((position.x - this.position.x) / (this.radius * 2));
      if (i < 0 || i >= this.squares.length || j < 0 || j >= this.squares[i].length) 
      {
        return null;
      }
      return this.squares[i][j];
    }
} 
window.SquareMap = SquareMap;

class Animation2D 
{
    constructor(frames, frameInterval, position = new Vector2(0, 0)) 
    {
      this.frames = frames;
      this.currentFrameIndex = 0;
      this.frameInterval = frameInterval;
      this.timeSinceLastFrame = 0;
      this.position = position;
      this.isPlaying = false;
    }
  
    update(deltaTime) 
    {
        if(this.isPlaying)
        {
            this.timeSinceLastFrame += deltaTime;
        
            if (this.timeSinceLastFrame >= this.frameInterval) 
            {
                this.currentFrameIndex++;
                if (this.currentFrameIndex >= this.frames.length) 
                {
                this.currentFrameIndex = 0;
                }
                this.timeSinceLastFrame = 0;
            }
        }
        
        this.frames[this.currentFrameIndex].position = this.position;
    }

    play()
    {
        this.isPlaying = true;
    }

    pause()
    {
        this.isPlaying = false;
    }
  
    draw() 
    {
      this.frames[this.currentFrameIndex].draw();
    }
}
window.Animation2D = Animation2D;  

class Animation2DStack
{
    constructor(animations = new Map(), position = new Vector2(0, 0))
    {
        this.animations = animations;
        this.position = position;
        this.currentAnimation = null;
    }

    addAnimation(name, animation)
    {
        this.animations.set(name, animation);
    }

    removeAnimation(name)
    {
        this.animations.delete(name);
    }

    setCurrentAnimation(name)
    {
        this.currentAnimation = this.animations.get(name);
    }

    playCurrentAnimation()
    {
        if(this.currentAnimation !== null)
        {
            this.currentAnimation.play();
        }
    }

    pauseCurrentAnimation()
    {
        if(this.currentAnimation !== null)
        {
            this.currentAnimation.pause();
        }
    }

    update(dt)
    {
        if(this.currentAnimation !== null)
        {
            this.currentAnimation.position = this.position;
            this.currentAnimation.update(dt);
        }
    }

    draw()
    {
        if(this.currentAnimation !== null)
        {
            this.currentAnimation.draw();
        }
    }
}
window.Animation2DStack = Animation2DStack;

class Scene
{
    constructor(name) 
    {
        this.layer1 = [];
        this.layer2 = [];
        this.layer3 = [];
        this.layer4 = [];
        this.layer5 = [];
        this.name = name;
    }

    addGameObject(gameObject, layer)
    {
        switch(layer)
        {
        case 1: this.layer1.push(gameObject); break;
        case 2: this.layer2.push(gameObject); break;
        case 3: this.layer3.push(gameObject); break;
        case 4: this.layer4.push(gameObject); break;
        case 5: this.layer5.push(gameObject); break;
        }
    }

    removeGameObject(gameObject)
    {
        this.layer1 = this.layer1.filter(g => g !== gameObject);
        this.layer2 = this.layer2.filter(g => g !== gameObject);
        this.layer3 = this.layer3.filter(g => g !== gameObject);
        this.layer4 = this.layer4.filter(g => g !== gameObject);
        this.layer5 = this.layer5.filter(g => g !== gameObject);
    }
}
window.Scene = Scene;

class GameObject
{
    constructor(position, tag)
    {
        this.position = position;
        this.tag = tag;
        this.components = new Map();
    }

    update()
    {

    }

    draw()
    {
        this.drawComponents();
    }

    updateComponents(dt)
    {
        this.components.forEach((v, k) => {
            v.update(dt);
            v.position = this.position;
        });
    }

    drawComponents(dt)
    {
        this.components.forEach((v, k) => {
            v.draw();
        });
    }

    addComponent(name, component)
    {
        this.components.set(name, component);
    }

    removeComponent(name)
    {
        this.components.delete(name);
    }

    getComponent(name)
    {
        return this.components.get(name);
    }

    hasComponent(name)
    {
        return this.components.has(name);
    }

    colliding()
    {

    }
}
window.GameObject = GameObject;

//#endregion

//#region Events Manager

let keysPressed = new Map();
let keysLiberated = new Map();
let keysDown = new Map();

window.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    keysPressed.set(key, true);
    keysLiberated.set(key, false);

    if (!keysDown.get(key)) keysDown.set(key, true);
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    keysPressed.set(key, false);
    keysLiberated.set(key, true);
    keysDown.set(key, false);
});

//#endregion

//#region Game Data Structs

let scenes = new Map();
let currentScene = undefined;
let variables = new Map();

//#endregion

//#region Utils

function range(min, max) 
{
    return Math.floor(Math.random() * (max - min + 1) + min);
}
window.range = range;

function move(gameObject, direction, velocity, deltaTime)
{
    gameObject.position.add(direction.multiply(velocity).multiply(deltaTime));
}
window.move = move;

function isKeyPressed(key)
{
    return keysPressed.get(key);
}
window.isKeyPressed = isKeyPressed;

function isKeyLiberated(key)
{
    return keysLiberated.get(key);
}
window.isKeyLiberated = isKeyLiberated;

function isKeyDown(key)
{
    return keysDown.get(key);
}
window.isKeyDown = isKeyDown;

function addScene(scene)
{
    scenes.set(scene.name, scene);
}
window.addScene = addScene;

function setCurrentScene(name)
{
    currentScene = name;
}
window.setCurrentScene = setCurrentScene;

function setVariable(name, value)
{
    variables.set(name, value);
}
window.setVariable = setVariable;

function removeVariable(name)
{
    variables.delete(name);
}
window.removeVariable = removeVariable;

function getVariable(name)
{
    return variables.get(name);
}
window.getVariable = getVariable;

function getCurrentScene()
{
    return scenes.get(currentScene);
}
window.getCurrentScene = getCurrentScene;

function start()
{
    requestAnimationFrame(gameLoop);
}
window.start = start;

function getColorByCode(code) 
{
    switch (code) 
    {
      case -1: return "transparent";
      case 0: return "black";
      case 1: return "white";
      case 2: return "red";
      case 3: return "green";
      case 4: return "blue";
      case 5: return "yellow";
      case 6: return "purple";
      case 7: return "magenta";
      case 8: return "pink";
      case 9: return "brown";
      case 10: return "grey";
      case 11: return "orange";
      case 12: return "cyan";
      case 13: return "lime";
      case 14: return "indigo";
      case 15: return "teal";
      case 16: return "maroon";
      case 17: return "olive";
      case 18: return "navy";
      case 19: return "salmon";
      case 20: return "tan";
      case 21: return "coral";
      case 22: return "gold";
      case 23: return "khaki";
      case 24: return "lavender";
      case 25: return "orchid";
      case 26: return "plum";
      case 27: return "sienna";
      case 28: return "turquoise";
      default: return "none";
    }
  }
  
window.getColorByCode = getColorByCode;

//#endregion

function gameLoop() 
{
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    scenes.get(currentScene).layer5.forEach(gameObject => {
        gameObject.update(deltaTime);
        gameObject.updateComponents(deltaTime);
        gameObject.draw();
    });
    scenes.get(currentScene).layer4.forEach(gameObject => {
        gameObject.update(deltaTime);
        gameObject.updateComponents(deltaTime);
        gameObject.draw();
    });
    scenes.get(currentScene).layer3.forEach(gameObject => {
        gameObject.update(deltaTime);
        gameObject.updateComponents(deltaTime);
        gameObject.draw();
    });
    scenes.get(currentScene).layer2.forEach(gameObject => {
        gameObject.update(deltaTime);
        gameObject.updateComponents(deltaTime);
        gameObject.draw();
    });
    scenes.get(currentScene).layer1.forEach(gameObject => {
        gameObject.update(deltaTime);
        gameObject.updateComponents(deltaTime);
        gameObject.draw();
    });

    requestAnimationFrame(gameLoop);
}
