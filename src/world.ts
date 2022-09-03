import * as THREE from "three";
import { createNoise3D, createNoise2D } from 'simplex-noise';
import { textures } from "./blocks";
import { Physics } from "./physics";
import { Player } from "./player";

export class World {
  // A world is made up of many 16x16x16 chunks
  private chunks: Record<string, string[][][]> = {}
  private tempChunkData: Record<string, {meshes:Record<string, THREE.InstancedMesh>, colliders: string[]}> = {}
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

    let biomes = ["snow", "grass", "sand"]
    const chunkBiome = biomes[Math.floor((this.noise2d(chunkX/20, chunkZ/20) + 1)/2 * biomes.length)]

    for(let x = 0; x<16; x++) {
      this.chunks[chunkName].push([])
      for(let y = 0; y < 16; y++) {
        this.chunks[chunkName][x].push([])
        for(let z = 0; z < 16; z++) {
          let rockDensity = this.noise3d((x + chunkX * 16)/100, (y + chunkY * 16)/100, (z + chunkZ * 16)/100)

          let height = Math.round(this.noise2d((x + chunkX * 16)/100, (z + chunkZ * 16)/100) * 8) + 64
          height += Math.round(this.noise2d((x + chunkX * 16)/50, (z + chunkZ * 16)/50) * 4)

          let tile = ''

          if(rockDensity < 0.7) {
            switch (chunkBiome) {
              case "grass":
                if(y + chunkY * 16 < height) {
                  if(y + (chunkY * 16) + 1 >= height) {
                    tile = 'grass'
                  } else if(y + (chunkY * 16) + 4 >= height) {
                    tile = 'dirt'
                  } else {
                    tile = 'rock'
                  }
                }
                break;

              case "snow":
                if(y + chunkY * 16 < height) {
                  if(y + (chunkY * 16) + 4 >= height) {
                    tile = 'snow'
                  } else {
                    tile = 'rock'
                  }
                }
                break;

              case "sand":
                if(y + chunkY * 16 < height) {
                  if(y + (chunkY * 16) + 4 >= height) {
                    tile = 'sand'
                  } else {
                    tile = 'sandstone'
                  }
                }
                break;
            }
          }
          

          this.chunks[chunkName][x][y].push(tile)
        }
      }
    }

    // Vegetation Passs
    for(let x = 0; x<16; x++) {
      for(let y = 1; y < 16; y++) {
        for(let z = 0; z < 16; z++) {
          let block = this.getBlockFromChunk(chunkName,x,y-1,z)

          let foliageNoise = this.noise2d((x + chunkX * 16)/2, (z + chunkZ * 16)/2)
          if(block === "grass") {

            if(foliageNoise < -0.9 && y < 12 && x > 2 && x < 14 && z > 2 && z < 14) {
              this.chunks[chunkName][x][y][z] = "wood"
              this.chunks[chunkName][x][y+1][z] = "wood"
              this.chunks[chunkName][x][y+2][z] = "wood"
              this.chunks[chunkName][x][y+3][z] = "leaves"
              this.chunks[chunkName][x+1][y+2][z] = "leaves"
              this.chunks[chunkName][x-1][y+2][z] = "leaves"
              this.chunks[chunkName][x][y+2][z+1] = "leaves"
              this.chunks[chunkName][x][y+2][z-1] = "leaves"
            }
          }
        }
      }
    }

    return chunkName
  }

  buildMesh(chunkX, chunkY, chunkZ) {
    this.unloadChunk(chunkX, chunkY, chunkZ)

    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`
    if(!this.chunks.hasOwnProperty(chunkName)) throw "Tried to build mesh before chunk was generated"
    
    // variables used to keep track of data to cleanup later
    const meshes: Record<string, THREE.InstancedMesh> = {}
    const colliders: string[] = []

    // temporary variable to optimize chunk loading
    const count: Record<string, number[][]> = {}

    // pass through the terrain and count the number of blocks of each type
    for(let x = 0; x < 16; x++) {
      for(let y = 0; y < 16; y++) {
        for(let z = 0; z < 16; z++) {
          const block = this.chunks[chunkName][x][y][z]
          if(!this.chunks[chunkName][x][y][z]) continue

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

          if(count[block]) {
            count[block].push([x, y, z])
          } else {
            count[block] = [[x, y, z]]
          }
        }
      }
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    // generate the instanced meshes
    for(let [type, blocks] of Object.entries(count)) {
      meshes[type] = new THREE.InstancedMesh(geometry, textures[type], blocks.length)
    }

    // position the cubes of the instanced meshes correctly
    const dummy = new THREE.Object3D()

    for(let [blockType, placements] of Object.entries(count)) {
      for(let i = 0; i < placements.length; i++) {
        let [x, y, z] = placements[i]
        dummy.position.set(x + chunkX * 16, y + chunkY * 16, z + chunkZ * 16)
        colliders.push(this.physics.addBlock(x + chunkX * 16, y + chunkY * 16, z + chunkZ * 16))
        dummy.updateMatrix()
        meshes[blockType].setMatrixAt(i, dummy.matrix)
      }
    }

    Object.values(meshes).forEach((mesh) => {
      this.scene.add(mesh)
    })
    this.tempChunkData[chunkName] = {
      meshes,
      colliders
    }
  }

  unloadChunk(chunkX, chunkY, chunkZ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`

    if(this.tempChunkData[chunkName]) {
      this.tempChunkData[chunkName].colliders.forEach((collider) => {
        this.physics.removeBlock(collider)
      })

      // Remove mesh from rendering
      Object.values(this.tempChunkData[chunkName].meshes).forEach((mesh) => {
        mesh.removeFromParent()
      })
  
      delete this.tempChunkData[chunkName]
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
      for(let y = -3; y < 3; y++) {
        for(let z = -3; z < 3; z++) {
          let chunkName = this.generateTerrain(x + chunkPos[0], y + chunkPos[1], z + chunkPos[2])

          if(this.tempChunkData.hasOwnProperty(chunkName)) continue

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