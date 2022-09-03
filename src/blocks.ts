import * as THREE from "three";
import config from "./config.json"

export const textures: Record<string, THREE.MeshBasicMaterial[]> = {}

export function loadTextures() {
  for(let [block, data] of Object.entries(config.blocks)) {
    let loader = new THREE.TextureLoader();
    textures[block] = data.textures.map(
      (img)=>{
        const t = loader.load(`./blocks/${img}.png`)
        t.magFilter = THREE.NearestFilter
        t.minFilter = THREE.NearestFilter
        return new THREE.MeshBasicMaterial({map: t })
      }
    )
  }
}