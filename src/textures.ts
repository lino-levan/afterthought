import * as THREE from "three";
import config from "./config.json"

export const textures: Record<string, {raw: THREE.MeshBasicMaterial, textures: string[]}> = {}

export function loadTextures() {
  for(let [type, data] of Object.entries(config.textures)) {
    let loader = new THREE.TextureLoader();

    const t = loader.load(`./${type}.png`)
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter

    const material = new THREE.MeshBasicMaterial({map: t })

    textures[type] = {
      raw: material,
      textures: data
    }
  }
}