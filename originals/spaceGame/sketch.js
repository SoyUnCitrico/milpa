const canvas = document.querySelector("canvas");
canvas.width = innerWidth;
canvas.height = innerHeight;
const contextCanvas = canvas.getContext("2d");
const scoreElt = document.querySelector("#scoreElt");
const scoreFinal = document.querySelector("#score_final");
const scoreButton = document.querySelector("#score_button");
const modal = document.querySelector(".modal");
// console.log(contextCanvas);

class Player {
  constructor(x, y, rad, col) {
    this.x = x;
    this.y = y;
    this.radio = rad;
    this.color = col;
  }

  draw() {
    contextCanvas.beginPath();
    contextCanvas.arc(this.x, this.y, this.radio, 0, Math.PI * 2, true);
    contextCanvas.fillStyle = this.color;
    contextCanvas.fill();
  }
}

class Proyectil{
    constructor(x,y,rad,col,vel) {
      this.x = x;
      this.y = y;
      this.radio = rad
      this.color = col
      this.velocity = vel;
    }
    draw() {
      contextCanvas.beginPath();
      contextCanvas.arc(this.x, this.y, this.radio, 0, Math.PI * 2, true);
      contextCanvas.fillStyle = this.color;
      contextCanvas.fill();
    }
  
    update() {
      this.draw();
      this.x = this.x + this.velocity.x;
      this.y = this.y + this.velocity.y;
    }
  }

  class Enemy{
    constructor(x,y,rad,col,vel) {
      this.x = x;
      this.y = y;
      this.radio = rad
      this.color = col
      this.velocity = vel;
    }
    draw() {
      contextCanvas.beginPath();
      contextCanvas.arc(this.x, this.y, this.radio, 0, Math.PI * 2, true);
      contextCanvas.fillStyle = this.color;
      contextCanvas.fill();
    }
  
    update() {
      this.draw();
      this.x = this.x + this.velocity.x;
      this.y = this.y + this.velocity.y;
    }
  }
  
  const friction = 0.99;
  class Particle{
    constructor(x,y,rad,col,vel) {
      this.x = x;
      this.y = y;
      this.radio = rad
      this.color = col
      this.velocity = vel;
      this.alpha = 1;
    }
    draw() {
      contextCanvas.save();
      contextCanvas.globalAlpha = this.alpha;
      contextCanvas.beginPath();
      contextCanvas.arc(this.x, this.y, this.radio, 0, Math.PI * 2, true);
      contextCanvas.fillStyle = this.color;
      contextCanvas.fill();
      contextCanvas.restore();
    }
  
    update() {
      this.draw();
      this.velocity.x *= friction;
      this.velocity.y *= friction;
      this.x = this.x + this.velocity.x;
      this.y = this.y + this.velocity.y;
      this.alpha-=0.01;
    }
  }

////////////////// -- MAIN SKETCH -- /////////////

////////////////// VARIABLES GLOBALES
let widthC = canvas.width;
let heightC = canvas.height;
let proyectileVel = 8;
let score;
let scoreFInal = 0;
// let headerOffset = document.querySelector("header").offsetHeight;

// UTILIDADES
const mapValue = (value, in_min, in_max, out_min, out_max) => {
  return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

const drawBackground = (col) => {
  contextCanvas.fillStyle = col;
  contextCanvas.fillRect(0,0,widthC,heightC);
};

let player = new Player(widthC/2,heightC/2, 10,"white");
let proyectiles = [];
let enemies = [];
let particles = [];

const init = () => {
  player = new Player(widthC/2,heightC/2, 10,"white");
  proyectiles = [];
  enemies = [];
  particles = [];
  score = 0;
  scoreFinal.innerHTML = score
  scoreElt,innerHTML = score;
}
const crearEnemigos = () => {
  setInterval(() => {
    const min = 5;
    const max = 30;
    const radius = Math.random() * (max - min) + min;
    // const x = Math.random() * widthC;
    let x, y;
    if (Math.random() < 0.5) {
      x = (Math.random() < 0.5) ? 0 - radius : widthC + radius;
      y = Math.random() * heightC;
    } else {
      x = Math.random() * widthC;
      y = (Math.random() < 0.5) ? 0 - radius : heightC + radius;
    }
    // let c = colors[Math.floor((Math.random()*colors.length))];
    const c = `hsl(${Math.random() * 360}, 50% , 50%)`
    const angle = Math.atan2(player.y - y, player.x - x);
    const vel = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    }
    enemies.push(new Enemy(x,y,radius,c,vel))
  }, 1000);
}


const animate = () => {
    animationId = requestAnimationFrame(animate)
    drawBackground("rgba(0,0,0,0.07)");
    player.draw();
    // PRGRAMACION DE LOS PROYECTILES
    proyectiles.forEach((proyectil, index) => {
      proyectil.update();
    //   Revision de los bordes para eliminar los poryectiles cuando salen de la pantalla
      if(
        proyectil.x + proyectil.radio < 0 ||
        proyectil.x - proyectil.radio > widthC ||
        proyectil.y + proyectil.radio < 0 ||
        proyectil.y - proyectil.radio > heightC
      ) {
      setTimeout(()=>{
        proyectiles.splice(index, 1);
        // console.log("ADIOS");  
      }, 0);

      }

    });
    ///////// PROGRAMACION DE LOS ENEMIGOS
    enemies.forEach((enemy, index) => {
      enemy.update();
      // Si hay colision entre el enemigo y el player
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y)
      if (dist - enemy.radio -player.radio < 0) {
        scoreFinal.innerHTML = score
        modal.style.display = "flex";
        console.log("GAME OVER");
        cancelAnimationFrame(animationId);
      }

      proyectiles.forEach((proyectil, proyectilIndex) => {
        const dist = Math.hypot(proyectil.x - enemy.x, proyectil.y - enemy.y)
        // Si hay colision entre el enemigo y el proyectil
        if (dist - enemy.radio -proyectil.radio < 0) {
            
            if(enemy.radio - 10 > 10) {
              gsap.to(enemy, {
                  radio: enemy.radio - 10
              })
              setTimeout(()=>{
                proyectiles.splice(proyectilIndex, 1);    
              }, 0);
              score += 50;
              scoreElt.innerHTML = score;
            } else {
              score += 150;
              scoreElt.innerHTML = score;
            // CREANDO LAS EXPLOSIONES
              for (let i = 0; i < enemy.radio + 2; i++) {
                  particles.push(new Particle(
                    proyectil.x,
                    proyectil.y,
                    3,
                    enemy.color,
                    {
                      x: (Math.random() - 0.5) * (Math.random() * 6),
                      y: (Math.random() - 0.5) * (Math.random() * 6)
                    }
                  ))
              }    
              // Puesto dentro del setTimeout para corregir el parapadeo al eliminar el objeto
              setTimeout(()=>{
                enemies.splice(index, 1);
                proyectiles.splice(proyectilIndex, 1);    
              }, 0);
            }
        }
      });
    });

    particles.forEach((particle, index) => {
      if (particle.alpha <= 0) {
          particles.splice(index ,1);
      } else {
      particle.update();
      }
    });
  }


scoreButton.addEventListener("click", (event) => {
  init();
  animate();
  crearEnemigos();
  modal.style.display = "none";
})
window.addEventListener("click" , (event) => {
    console.log(proyectiles)
//   let xC = mapValue(Math.random(),0,1,-1,1);
//   let yC = mapValue(Math.random(),0,1,-1,1);
  const angle = Math.atan2(
    event.clientY  - player.y,
    event.clientX  - player.x
  )
//   console.log(angle)
  const velocity = {
    x: Math.cos(angle) * proyectileVel,
    y: Math.sin(angle) * proyectileVel
  }
  proyectiles.push(
    new Proyectil(
      widthC/2,
      heightC/2,
    //   Math.random() * 5,
      5,
    //   colors[Math.floor((Math.random()*colors.length))],
      "white",  
      velocity
    )
  )    
})