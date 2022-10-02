import * as THREE from "three";
import config from "./config.json";

type TextureMap = Record<string, {three: THREE.Texture, image: HTMLImageElement}>

export const textures: Record<
  string,
  { combined: THREE.CanvasTexture; images: TextureMap }
> = {};

function loadImage(path): Promise<HTMLImageElement> {
  return new Promise((resolve)=>{
    const img = new Image()
    img.src = path

    img.onload = (e) => {
      resolve(img)
    }
  })
}

export async function loadTextures() {
  const loader = new THREE.TextureLoader();

  for (let [name, data] of Object.entries(config.textures)) {
    let textureMap: TextureMap = {}

    for(let textureName of data.textures) {
      const path = `/${name}/${textureName}.png`
      const img = await loadImage(path)

      textureMap[textureName] = {
        three: loader.load(path),
        image: img,
      }
    }

    // The following block of code builds an image by combining all of the textures vertically
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.height = 0
    canvas.width = 0
    Object.values(textureMap).map((cur)=>{
      canvas.height += cur.image.height
      canvas.width = Math.max(canvas.width, cur.image.width)
    })
    let curHeight = 0
    Object.values(textureMap).reverse().map((cur)=>{
      ctx?.drawImage(cur.image, 0, curHeight)
      curHeight += cur.image.height
    })

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;


    textures[name] = {
      combined: texture,
      images: textureMap,
    };
  }
}
