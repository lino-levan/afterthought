import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { loadTextures } from "./textures";
import { Physics } from "./physics";
import { Player } from "./player";
import { World } from "./world";
import { getServer } from "./server";
import { Gui } from "./gui";

const canvas = document.querySelector("#c") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas });
const scene = new THREE.Scene();

const guiCanvas = document.querySelector("#gui") as HTMLCanvasElement;
const ctx = guiCanvas.getContext("2d") as CanvasRenderingContext2D;

RAPIER.init().then(async () => {
  await loadTextures();

  const gui = new Gui(ctx)

  async function renderGui(time) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    guiCanvas.width = window.innerWidth;
    guiCanvas.height = window.innerHeight;

    gui.update()
    requestAnimationFrame(renderGui)
  }
  requestAnimationFrame(renderGui)

  await gui.start()

  await getServer().connection();

  const physics = new Physics(RAPIER);

  const world = new World(scene, physics);
  const player = new Player(renderer, canvas, physics, world);

  // update the world and player of the world
  gui.world = world
  gui.player = player

  world.update(player, true);

  async function render(time) {
    player.camera.aspect = canvas.width / canvas.height;
    player.camera.updateProjectionMatrix();
    renderer.setSize(canvas.width, canvas.height);

    renderer.render(scene, player.camera);

    physics.step();
    await player.update();
    await world.update(player);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
