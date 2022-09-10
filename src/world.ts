import * as THREE from "three";
import { textures } from "./textures";
import { Physics } from "./physics";
import { Player } from "./player";
import { generateMesh, mod } from "./constants";
import { Biomes } from "./biomes";

const generateMeshWorker = new Worker(new URL('./workers/generateMesh.ts', import.meta.url), {
  type: 'module'
})

export class World {
  // A world is made up of many 16x16x16 chunks
  private chunks: Record<string, string[][][]> = {}
  private tempChunkData: Record<string, {mesh:THREE.Mesh | null, colliders: string[] | null}> = {}
  scene: THREE.Scene
  private physics: Physics
  private seed: string
  private biomes: Biomes

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene
    this.physics = physics
    this.seed = (Math.random() + 1).toString(36).substring(2)
    this.biomes = new Biomes(this.seed)

    generateMeshWorker.onmessage = (event) => {
      const { positions, uv, chunkX, chunkY, chunkZ, chunkName, colliders } = JSON.parse(event.data)

      if(positions.length === 0) return

      this.addChunk(positions, uv, chunkX, chunkY, chunkZ, chunkName, colliders)
    }
  }

  generateTerrain(chunkX, chunkY, chunkZ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`

    if(this.chunks.hasOwnProperty(chunkName)) return chunkName

    this.chunks[chunkName] = this.biomes.getChunk(chunkX, chunkY, chunkZ)

    return chunkName
  }

  buildMesh(chunkX: number, chunkY: number, chunkZ: number, sync?: boolean) {
    this.unloadChunk(chunkX, chunkY, chunkZ)

    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`
    if(!this.chunks.hasOwnProperty(chunkName)) throw "Tried to build mesh before chunk was generated"
    
    let validChunks = {}
    let chunk = chunkName
    validChunks[chunkName] = this.chunks[chunkName]

    chunk = this.generateTerrain(chunkX+1, chunkY, chunkZ)
    validChunks[chunk] = this.chunks[chunk]
    chunk = this.generateTerrain(chunkX-1, chunkY, chunkZ)
    validChunks[chunk] = this.chunks[chunk]
    chunk = this.generateTerrain(chunkX, chunkY+1, chunkZ)
    validChunks[chunk] = this.chunks[chunk]
    chunk = this.generateTerrain(chunkX, chunkY-1, chunkZ)
    validChunks[chunk] = this.chunks[chunk]
    chunk = this.generateTerrain(chunkX, chunkY, chunkZ+1)
    validChunks[chunk] = this.chunks[chunk]
    chunk = this.generateTerrain(chunkX, chunkY, chunkZ-1)
    validChunks[chunk] = this.chunks[chunk]

    this.tempChunkData[chunkName] = {
      mesh: null,
      colliders: null
    } 

    if(sync) {
      const { positions, uv, colliders } = generateMesh(chunkX, chunkY, chunkZ, chunkName, validChunks)

      this.addChunk(positions, uv, chunkX, chunkY, chunkZ, chunkName, colliders)
    } else {
      generateMeshWorker.postMessage({
        chunkX,
        chunkY,
        chunkZ,
        chunks: validChunks
      })
    }
  }

  addChunk(positions, uv, chunkX, chunkY, chunkZ, chunkName, colliders) {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.Float32BufferAttribute( positions, 3 ) );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute( uv, 2 ) );
    geometry.setAttribute('uv2', new THREE.Float32BufferAttribute( uv, 2 ) );
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({map: textures["blocks"].raw}));
    mesh.translateX(chunkX*16)
    mesh.translateY(chunkY*16)
    mesh.translateZ(chunkZ*16)
    this.scene.add(mesh);

    // add colliders
    let physColliders: string[] = []
    for(let pos of colliders) {
      physColliders.push(this.physics.addBlock(pos[0], pos[1], pos[2]))
    }

    this.tempChunkData[chunkName] = {
      mesh,
      colliders: physColliders
    }
  }

  unloadChunk(chunkX, chunkY, chunkZ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`

    if(this.tempChunkData[chunkName]) {
      const mesh = this.tempChunkData[chunkName].mesh
      if(mesh !== null) {
        mesh.removeFromParent()
        mesh.geometry.dispose()

        if(Array.isArray(mesh.material)) {
          mesh.material.map((mat)=>mat.dispose())
        } else {
          mesh.material.dispose()
        }
      }

      const colliders = this.tempChunkData[chunkName].colliders
      if(colliders !== null) {
        for(let collider of colliders) {
          this.physics.removeBlock(collider)
        }
      }

      // Remove mesh from rendering
      delete this.tempChunkData[chunkName]
    }
  }

  update(player: Player, sync?: boolean) {
    let position = player.physicsObject.translation()
    let chunkPos = [
      Math.floor(position.x/16),
      Math.floor(position.y/16),
      Math.floor(position.z/16)
    ]

    // unload chunks too far away
    for (let chunkName of Object.keys(this.tempChunkData)) {
      let chunk = chunkName.split("|").map((n)=>parseInt(n))
      if(Math.abs(chunkPos[0]-chunk[0]) > 3) {
        this.unloadChunk(chunk[0], chunk[1], chunk[2])
      }
      if(Math.abs(chunkPos[1]-chunk[1]) > 3) {
        this.unloadChunk(chunk[0], chunk[1], chunk[2])
      }
      if(Math.abs(chunkPos[2]-chunk[2]) > 3) {
        this.unloadChunk(chunk[0], chunk[1], chunk[2])
      }
    }

    // load close chunks
    for(let x = -3; x < 3; x++) {
      for(let y = -2; y < 2; y++) {
        for(let z = -3; z < 3; z++) {
          let chunkName = this.generateTerrain(x + chunkPos[0], y + chunkPos[1], z + chunkPos[2])

          if(this.tempChunkData.hasOwnProperty(chunkName)) continue

          this.buildMesh(x + chunkPos[0], y + chunkPos[1], z + chunkPos[2], sync)
        }
      }
    }
  }

  removeBlock(globalX, globalY, globalZ) {
    const chunkX = Math.floor(globalX/16)
    const chunkY = Math.floor(globalY/16)
    const chunkZ = Math.floor(globalZ/16)

    const chunkName = this.generateTerrain(chunkX, chunkY, chunkZ)
    const x = mod(globalX, 16)
    const y = mod(globalY, 16)
    const z = mod(globalZ, 16)

    this.chunks[chunkName][x][y][z] = ""

    this.buildMesh(chunkX, chunkY, chunkZ, true)

    // deal with chunk boundaries
    if(x === 0) {
      this.buildMesh(chunkX-1, chunkY, chunkZ, true)
    }
    if(x === 15) {
      this.buildMesh(chunkX+1, chunkY, chunkZ, true)
    }
    if(y === 0) {
      this.buildMesh(chunkX, chunkY-1, chunkZ, true)
    }
    if(y === 15) {
      this.buildMesh(chunkX, chunkY+1, chunkZ, true)
    }
    if(z === 0) {
      this.buildMesh(chunkX, chunkY, chunkZ-1, true)
    }
    if(z === 15) {
      this.buildMesh(chunkX, chunkY, chunkZ+1, true)
    }
  }

  getBlock(globalX, globalY, globalZ) {
    const chunkX = Math.floor(globalX/16)
    const chunkY = Math.floor(globalY/16)
    const chunkZ = Math.floor(globalZ/16)

    const chunkName = this.generateTerrain(chunkX, chunkY, chunkZ)

    const x = mod(globalX, 16)
    const y = mod(globalY, 16)
    const z = mod(globalZ, 16)

    return this.chunks[chunkName][x][y][z]
  }

  setBlock(globalX, globalY, globalZ, block) {
    const chunkX = Math.floor(globalX/16)
    const chunkY = Math.floor(globalY/16)
    const chunkZ = Math.floor(globalZ/16)

    const chunkName = this.generateTerrain(chunkX, chunkY, chunkZ)

    const x = mod(globalX, 16)
    const y = mod(globalY, 16)
    const z = mod(globalZ, 16)

    this.chunks[chunkName][x][y][z] = block
    this.buildMesh(chunkX, chunkY, chunkZ, true)
  }
}