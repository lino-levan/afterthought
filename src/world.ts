import * as THREE from "three";
import { createNoise3D, createNoise2D } from 'simplex-noise';
import { textures } from "./textures";
import { Physics } from "./physics";
import { Player } from "./player";
import config from "./config.json";
import { mod } from "./constants";

export class World {
  // A world is made up of many 16x16x16 chunks
  private chunks: Record<string, string[][][]> = {}
  private tempChunkData: Record<string, {mesh:THREE.Mesh | null, colliders: string[] | null}> = {}
  scene: THREE.Scene
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
          let rockDensity = this.noise3d((x + chunkX * 16)/50, (y + chunkY * 16)/50, (z + chunkZ * 16)/50)

          let height = Math.round(this.noise2d((x + chunkX * 16)/100, (z + chunkZ * 16)/100) * 8) + 64
          height += Math.round(this.noise2d((x + chunkX * 16)/50, (z + chunkZ * 16)/50) * 4)

          let tile = ''

          if(rockDensity < 0.5) {
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
                let copiumDensity = this.noise3d((x + chunkX * 16)/2, (y + chunkY * 16)/2, (z + chunkZ * 16)/2)

                if(y + chunkY * 16 < height) {
                  if(y + (chunkY * 16) + 4 >= height) {
                    tile = 'snow'
                  } else {
                    if(copiumDensity < -0.85) {
                      tile = 'copium'
                    } else {
                      tile = 'rock'
                    }
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
    const geometry = new THREE.BufferGeometry();
    const colliders: string[] = []

    let positions: number[] = [] // vertex buffer
    let uv: number[] = [] // uv buffer

    const b = (1/textures["blocks"].textures.length) // the size of each texture
    const e = 0 // error correction amount

    for(let x = 0; x<16; x++) {
      for(let y = 0; y < 16; y++) {
        for(let z = 0; z < 16; z++) {
          let block = this.getBlockFromChunk(chunkName,x,y,z)
          if(block === "") continue

          let visible = false

          // draw top face
          if(this.getBlockFromChunk(chunkName,x,y+1,z) === "") {
            const k = textures["blocks"].textures.findIndex((val)=>val===config.blocks[block].textures[0])

            positions.push(
              x + 1, y+1, z,
              x, y+1, z+1,
              x+1, y+1, z+1,
              x + 1, y+1, z,
              x, y+1, z,
              x, y+1, z+1,
            )
            uv.push(
              1, (k+e)*b,
              0, (k+1-e)*b,
              1, (k+1-e)*b,
              1, (k+e)*b,
              0, (k+e)*b,
              0, (k+1-e)*b,
            )

            visible = true
          }

          // draw bottom face
          if(this.getBlockFromChunk(chunkName,x,y-1,z) === "") {
            const k = textures["blocks"].textures.findIndex((val)=>val===config.blocks[block].textures[1])

            positions.push(
              x, y, z+1,
              x + 1, y, z,
              x+1, y, z+1,
              x + 1, y, z,
              x, y, z+1,
              x, y, z,
            )
            uv.push(
              0, (k+1-e)*b,
              1, (k+e)*b,
              1, (k+1-e)*b,
              1, (k+e)*b,
              0, (k+1-e)*b,
              0, (k+e)*b,
            )

            visible = true
          }

          // draw west face
          if(this.getBlockFromChunk(chunkName,x-1,y,z) === "") {
            const k = textures["blocks"].textures.findIndex((val)=>val===config.blocks[block].textures[2])

            positions.push(
              x,y,z+1,
              x,y+1,z+1,
              x,y,z,
              x,y+1,z+1,
              x,y+1,z,
              x,y,z
            )
            uv.push(
              0, (k+e)*b,
              0, (k+1-e)*b,
              1, (k+e)*b,
              0, (k+1-e)*b,
              1, (k+1-e)*b,
              1, (k+e)*b,
            )

            visible = true
          }

          // draw east face
          if(this.getBlockFromChunk(chunkName,x+1,y,z) === "") {
            const k = textures["blocks"].textures.findIndex((val)=>val===config.blocks[block].textures[3])
            
            positions.push(
              x+1,y,z+1,
              x+1,y,z,
              x+1,y+1,z+1,
              x+1,y+1,z+1,
              x+1,y,z,
              x+1,y+1,z
            )
            uv.push(
              0, (k+e)*b,
              1, (k+e)*b,
              0, (k+1-e)*b,
              0, (k+1-e)*b,
              1, (k+e)*b,
              1, (k+1-e)*b,
            )

            visible = true
          }

          // draw north face
          if(this.getBlockFromChunk(chunkName,x,y,z-1) === "") {
            const k = textures["blocks"].textures.findIndex((val)=>val===config.blocks[block].textures[4])

            positions.push(
              x,y,z,
              x,y+1,z,
              x+1,y,z,
              x+1,y,z,
              x,y+1,z,
              x+1,y+1,z,
            )
            uv.push(
              0, (k+e)*b,
              0, (k+1-e)*b,
              1, (k+e)*b,
              1, (k+e)*b,
              0, (k+1-e)*b,
              1, (k+1-e)*b,
            )

            visible = true
          }

          // draw south face
          if(this.getBlockFromChunk(chunkName,x,y,z+1) === "") {
            const k = textures["blocks"].textures.findIndex((val)=>val===config.blocks[block].textures[5])

            positions.push(
              x,y,z+1,
              x+1,y,z+1,
              x,y+1,z+1,
              x+1,y,z+1,
              x+1,y+1,z+1,
              x,y+1,z+1
            )
            uv.push(
              0, (k+e)*b,
              1, (k+e)*b,
              0, (k+1-e)*b,
              1, (k+e)*b,
              1, (k+1-e)*b,
              0, (k+1-e)*b,
            )

            visible = true
          }

          if(visible) {
            colliders.push(this.physics.addBlock(x + chunkX * 16, y + chunkY * 16, z + chunkZ * 16))
          }
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute( positions, 3 ) );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute( uv, 2 ) );
    geometry.setAttribute('uv2', new THREE.Float32BufferAttribute( uv, 2 ) );
    geometry.computeVertexNormals();

    // lighting texture (WIP)
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    canvas.width = 200;
    canvas.height = 200;
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, 200, 200)
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    if(positions.length > 0) {
      const mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({map: textures["blocks"].raw, lightMap:texture}));
      mesh.translateX(chunkX*16)
      mesh.translateY(chunkY*16)
      mesh.translateZ(chunkZ*16)
      this.scene.add(mesh);

      // const physicsMesh = this.physics.addMesh(chunkX*16, chunkY*16, chunkZ*16, Float32Array.from(positions), Uint32Array.from(triangles))

      this.tempChunkData[chunkName] = {
        mesh,
        colliders
      }
    } else {
      this.tempChunkData[chunkName] = {
        mesh: null,
        colliders: null
      }
    }
  }

  unloadChunk(chunkX, chunkY, chunkZ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`

    if(this.tempChunkData[chunkName]) {
      const mesh = this.tempChunkData[chunkName].mesh
      if(mesh !== null) {
        mesh.removeFromParent()
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

  removeBlock(globalX, globalY, globalZ) {
    const chunkX = Math.floor(globalX/16)
    const chunkY = Math.floor(globalY/16)
    const chunkZ = Math.floor(globalZ/16)

    const chunkName = this.generateTerrain(chunkX, chunkY, chunkZ)
    const x = mod(globalX, 16)
    const y = mod(globalY, 16)
    const z = mod(globalZ, 16)

    this.chunks[chunkName][x][y][z] = ""

    this.buildMesh(chunkX, chunkY, chunkZ)

    // deal with chunk boundaries
    if(x === 0) {
      this.buildMesh(chunkX-1, chunkY, chunkZ)
    }
    if(x === 15) {
      this.buildMesh(chunkX+1, chunkY, chunkZ)
    }
    if(y === 0) {
      this.buildMesh(chunkX, chunkY-1, chunkZ)
    }
    if(y === 15) {
      this.buildMesh(chunkX, chunkY+1, chunkZ)
    }
    if(z === 0) {
      this.buildMesh(chunkX, chunkY, chunkZ-1)
    }
    if(z === 15) {
      this.buildMesh(chunkX, chunkY, chunkZ+1)
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
    this.buildMesh(chunkX, chunkY, chunkZ)
  }
}