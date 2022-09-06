import config from "./config.json"

export function mod(n, m) {
  return ((n % m) + m) % m;
}

export function getBlockFromChunk(chunkName: string, x: number, y: number, z: number, chunks: Record<string, string[][][]>) {
  let chunk = chunkName.split("|").map((n)=>parseInt(n))

  if(x === -1) {
    return chunks[`${chunk[0]-1}|${chunk[1]}|${chunk[2]}`][15][y][z]
  }
  if(x === 16) {
    return chunks[`${chunk[0]+1}|${chunk[1]}|${chunk[2]}`][0][y][z]
  }
  if(y === -1) {
    return chunks[`${chunk[0]}|${chunk[1]-1}|${chunk[2]}`][x][15][z]
  }
  if(y === 16) {
    return chunks[`${chunk[0]}|${chunk[1]+1}|${chunk[2]}`][x][0][z]
  }
  if(z === -1) {
    return chunks[`${chunk[0]}|${chunk[1]}|${chunk[2]-1}`][x][y][15]
  }
  if(z === 16) {
    return chunks[`${chunk[0]}|${chunk[1]}|${chunk[2]+1}`][x][y][0]
  }

  return chunks[chunkName][x][y][z]
}

export function generateMesh(chunkX, chunkY, chunkZ, chunkName, chunks) {
  const colliders: number[][] = [] // collider data
  const positions: number[] = [] // vertex buffer
  const uv: number[] = [] // uv buffer

  const b = (1/config.textures["blocks"].length) // the size of each texture
  const e = 0 // error correction amount

  for(let x = 0; x<16; x++) {
    for(let y = 0; y < 16; y++) {
      for(let z = 0; z < 16; z++) {
        let block = getBlockFromChunk(chunkName,x,y,z,chunks)
        if(block === "") continue

        let visible = false

        // draw top face
        if(getBlockFromChunk(chunkName,x,y+1,z,chunks) === "") {
          const k = config.textures["blocks"].findIndex((val)=>val===config.blocks[block].textures[0])

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
        if(getBlockFromChunk(chunkName,x,y-1,z,chunks) === "") {
          const k = config.textures["blocks"].findIndex((val)=>val===config.blocks[block].textures[1])

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
        if(getBlockFromChunk(chunkName,x-1,y,z,chunks) === "") {
          const k = config.textures["blocks"].findIndex((val)=>val===config.blocks[block].textures[2])

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
        if(getBlockFromChunk(chunkName,x+1,y,z,chunks) === "") {
          const k = config.textures["blocks"].findIndex((val)=>val===config.blocks[block].textures[3])
          
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
        if(getBlockFromChunk(chunkName,x,y,z-1,chunks) === "") {
          const k = config.textures["blocks"].findIndex((val)=>val===config.blocks[block].textures[4])

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
        if(getBlockFromChunk(chunkName,x,y,z+1,chunks) === "") {
          const k = config.textures["blocks"].findIndex((val)=>val===config.blocks[block].textures[5])

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
          colliders.push([x + chunkX * 16, y + chunkY * 16, z + chunkZ * 16])
        }
      }
    }
  }

  return {positions, uv, chunkX, chunkY, chunkZ, chunkName, colliders}
}