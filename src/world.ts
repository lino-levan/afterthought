import * as THREE from "three";
import { createNoise3D, createNoise2D } from 'simplex-noise';
import { textures } from "./blocks";
import { Physics } from "./physics";
import { Player } from "./player";

export class World {
  // A world is made up of many 16x16x16 chunks
  private chunks: Record<string, string[][][]> = {}
  private chunkMeshes: Record<string, Record<string, THREE.InstancedMesh>> = {}
  private scene: THREE.Scene
  private physics: Physics
  private noise3d = createNoise3D()
  private noise2d = createNoise2D()

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene
    this.physics = physics
  }

  generateTerrain(chunkX, chunkY, chunkZ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`

    if(this.chunks.hasOwnProperty(chunkName)) return chunkName

    this.chunks[chunkName] = []

    for(let x = 0; x<16; x++) {
      this.chunks[chunkName].push([])
      for(let y = 0; y < 16; y++) {
        this.chunks[chunkName][x].push([])
        for(let z = 0; z < 16; z++) {
          let density = this.noise3d((x + chunkX * 16)/100, (y + chunkY * 16)/100, (z + chunkZ * 16)/100)
          let height = Math.round(this.noise2d((x + chunkX * 16)/100, (z + chunkZ * 16)/100) * 8) + 64
          height += Math.round(this.noise2d((x + chunkX * 16)/50, (z + chunkZ * 16)/50) * 4)
          height += Math.round(this.noise2d((x + chunkX * 16)/25, (z + chunkZ * 16)/25) * 2)

          let tile = ''

          if(density < 0.5) {
            if(y + chunkY * 16 < height) {
              if(y + (chunkY * 16) + 1 >= height) {
                tile = 'grass'
              } else if(y + (chunkY * 16) + 4 >= height) {
                tile = 'dirt'
              } else {
                tile = 'rock'
              }
            }
          }

          this.chunks[chunkName][x][y].push(tile)
        }
      }
    }

    return chunkName
  }

  buildMesh(chunkX, chunkY, chunkZ) {
    this.unloadChunk(chunkX, chunkY, chunkZ)

    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`
    if(!this.chunks.hasOwnProperty(chunkName)) throw "Tried to build mesh before chunk was generated"
    
    const meshes: Record<string, THREE.InstancedMesh> = {}
    const count: Record<string, number> = {}

    // pass through the terrain and count the number of blocks of each type
    for(let x = 0; x < 16; x++) {
      for(let y = 0; y < 16; y++) {
        for(let z = 0; z < 16; z++) {
          const block = this.chunks[chunkName][x][y][z]
          if(!this.chunks[chunkName][x][y][z]) continue

          if(count[block]) {
            count[block]++
          } else {
            count[block] = 1
          }
        }
      }
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    // generate the instanced meshes
    for(let [type, num] of Object.entries(count)) {
      meshes[type] = new THREE.InstancedMesh(geometry, textures[type], num)

      count[type] = 0 // reset count to use it later
    }

    // position the cubes of the instanced meshes correctly
    const dummy = new THREE.Object3D()

    for(let x = 0; x < 16; x++) {
      for(let y = 0; y < 16; y++) {
        for(let z = 0; z < 16; z++) {
          const block = this.getBlockFromChunk(chunkName, x, y, z)
          if(!block) continue

          let neighbors = [
            [1, 0, 0],
            [-1, 0, 0],
            [0, 1, 0],
            [0, -1, 0],
            [0, 0, 1],
            [0, 0, -1]
          ]

          const surroundedByBlocks = neighbors.reduce((prev, cur) => {
            return prev && this.getBlockFromChunk(chunkName, x + cur[0], y + cur[1], z + cur[2]) !== ""
          }, true)

          if(surroundedByBlocks) continue

          dummy.position.set(x + chunkX * 16, y + chunkY * 16, z + chunkZ * 16)
          this.physics.addBlock(x + chunkX * 16, y + chunkY * 16, z + chunkZ * 16)
          dummy.updateMatrix()
          meshes[block].setMatrixAt(count[block], dummy.matrix)

          if(count[block]) {
            count[block]++
          } else {
            count[block] = 1
          }
        }
      }
    }

    Object.values(meshes).forEach((mesh) => {
      this.scene.add(mesh)
    })
    this.chunkMeshes[chunkName] = meshes
  }

  unloadChunk(chunkX, chunkY, chunkZ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`

    if(this.chunkMeshes[chunkName]) {
      // Remove physics for blocks
      for(let x = 0; x < 16; x++) {
        for(let y = 0; y < 16; y++) {
          for(let z = 0; z < 16; z++) {
            this.physics.removeBlock(x + chunkX * 16, y + chunkY * 16, z + chunkZ * 16)
          }
        }
      }

      // Remove mesh from rendering
      Object.values(this.chunkMeshes[chunkName]).forEach((mesh) => {
        mesh.removeFromParent()
      })
  
      delete this.chunkMeshes[chunkName]
    }
  }

  update(player: Player) {
    let position = player.physicsObject.translation()
    let chunkPos = [
      Math.floor(position.x/16),
      Math.floor(position.y/16),
      Math.floor(position.z/16)
    ]

    // unload chunks too far away
    Object.keys(this.chunkMeshes).forEach((chunkName)=>{
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
    })

    // load close chunks
    for(let x = -3; x < 3; x++) {
      for(let y = -3; y < 3; y++) {
        for(let z = -3; z < 3; z++) {
          let chunkName = this.generateTerrain(x + chunkPos[0], y + chunkPos[1], z + chunkPos[2])

          if(this.chunkMeshes.hasOwnProperty(chunkName)) continue

          this.buildMesh(x + chunkPos[0], y + chunkPos[1], z + chunkPos[2])
        }
      }
    }
  }

  private getBlockFromChunk(chunkName: string, x: number, y: number, z: number) {
    let chunk = chunkName.split("|").map((n)=>parseInt(n))
    
    if(x === -1) {
      let chunkName = this.generateTerrain(chunk[0]-1, chunk[1], chunk[2])
      return this.getBlockFromChunk(chunkName, 15, y, z)
    }
    if(x === 16) {
      let chunkName = this.generateTerrain(chunk[0]+1, chunk[1], chunk[2])
      return this.getBlockFromChunk(chunkName, 0, y, z)
    }
    if(y === -1) {
      let chunkName = this.generateTerrain(chunk[0], chunk[1]-1, chunk[2])
      return this.getBlockFromChunk(chunkName, x, 15, z)
    }
    if(y === 16) {
      let chunkName = this.generateTerrain(chunk[0], chunk[1]+1, chunk[2])
      return this.getBlockFromChunk(chunkName, x, 0, z)
    }
    if(z === -1) {
      let chunkName = this.generateTerrain(chunk[0], chunk[1], chunk[2]-1)
      return this.getBlockFromChunk(chunkName, x, y, 15)
    }
    if(z === 16) {
      let chunkName = this.generateTerrain(chunk[0], chunk[1], chunk[2]+1)
      return this.getBlockFromChunk(chunkName, x, y, 0)
    }

    return this.chunks[chunkName][x][y][z]
  }
}