import * as THREE from "three";
import RAPIER from '@dimforge/rapier3d-compat';
import { loadTextures } from "./textures";
import { Physics } from "./physics";
import { Player } from "./player";
import { World } from "./world";

const canvas = document.querySelector('#c') as HTMLCanvasElement
const renderer = new THREE.WebGLRenderer({canvas});
const scene = new THREE.Scene()

RAPIER.init().then(() => {
  const physics = new Physics(RAPIER)

  const world = new World(scene, physics)
  const player = new Player(renderer, canvas, physics, world)

  loadTextures()
  
  world.update(player, true)


  function render(time) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    player.camera.aspect = canvas.width / canvas.height
    player.camera.updateProjectionMatrix()
    renderer.setSize(canvas.width, canvas.height)
    
    renderer.render(scene, player.camera);

    player.update()

    world.update(player)
    physics.step()
    
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})