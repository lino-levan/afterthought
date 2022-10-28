import config from "./config.json";

export function getBlockFromChunk(
  chunkName: string,
  x: number,
  y: number,
  z: number,
  chunks: Record<string, string[][][]>,
) {
  let chunk = chunkName.split("|").map((n) => parseInt(n));

  if (x === -1) {
    chunk[0] -= 1;
    x = 15;
  }
  if (x === 16) {
    chunk[0] += 1;
    x = 0;
  }
  if (y === -1) {
    chunk[1] -= 1;
    y = 15;
  }
  if (y === 16) {
    chunk[1] += 1;
    y = 0;
  }
  if (z === -1) {
    chunk[2] -= 1;
    z = 15;
  }
  if (z === 16) {
    chunk[2] += 1;
    z = 0;
  }

  return chunks[`${chunk[0]}|${chunk[1]}|${chunk[2]}`][x][y][z];
}

export function generateMesh(chunkX, chunkY, chunkZ, chunkName, chunks) {
  const colliders: number[][] = []; // collider data
  const meshData: Record<string, {
    positions: number[]; // vertex buffer
    uv: number[]; // uv buffer
  }> = {};

  meshData.base = {
    positions: [],
    uv: [],
  };

  meshData.transparent = {
    positions: [],
    uv: [],
  };

  const b = (1 / config.textures["blocks"].textures.length); // the size of each texture

  const setData = (
    face: string,
    meshLayer: string,
    k: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const p = config.faces[face].positions;
    const u = config.faces[face].uvs;

    for (let i = 0; i < p.length; i += 3) {
      meshData[meshLayer].positions.push(
        x + p[i],
        y + p[i + 1],
        z + p[i + 2],
      );
    }

    for (let i = 0; i < u.length; i += 2) {
      meshData[meshLayer].uv.push(
        u[i],
        (k + u[i + 1]) * b,
      );
    }
  };

  const isTransparent = (chunkName, x, y, z, chunks) => {
    const block = getBlockFromChunk(chunkName, x, y, z, chunks);

    return block === "" || config.blocks[block].transparent;
  };

  const isSolid = (chunkName, x, y, z, chunks) => {
    const block = getBlockFromChunk(chunkName, x, y, z, chunks);

    return block !== "" && config.blocks[block].solid;
  };

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      for (let z = 0; z < 16; z++) {
        let block = getBlockFromChunk(chunkName, x, y, z, chunks);
        if (block === "") continue;

        const blockConfig = config.blocks[block];
        const blockModel = config.models[blockConfig.model];

        for (let face of Object.keys(blockModel)) {
          if (blockConfig.transparent) {
            if (
              face === "top" &&
              getBlockFromChunk(chunkName, x, y + 1, z, chunks) !== ""
            ) continue;
            if (
              face === "bottom" &&
              getBlockFromChunk(chunkName, x, y - 1, z, chunks) !== ""
            ) continue;
            if (
              face === "north" &&
              getBlockFromChunk(chunkName, x + 1, y, z, chunks) !== ""
            ) continue;
            if (
              face === "south" &&
              getBlockFromChunk(chunkName, x - 1, y, z, chunks) !== ""
            ) continue;
            if (
              face === "west" &&
              getBlockFromChunk(chunkName, x, y, z + 1, chunks) !== ""
            ) continue;
            if (
              face === "east" &&
              getBlockFromChunk(chunkName, x, y, z - 1, chunks) !== ""
            ) continue;
          } else {
            if (
              face === "top" && !isTransparent(chunkName, x, y + 1, z, chunks)
            ) continue;
            if (
              face === "bottom" &&
              !isTransparent(chunkName, x, y - 1, z, chunks)
            ) continue;
            if (
              face === "north" && !isTransparent(chunkName, x + 1, y, z, chunks)
            ) continue;
            if (
              face === "south" && !isTransparent(chunkName, x - 1, y, z, chunks)
            ) continue;
            if (
              face === "west" && !isTransparent(chunkName, x, y, z + 1, chunks)
            ) continue;
            if (
              face === "east" && !isTransparent(chunkName, x, y, z - 1, chunks)
            ) continue;
          }

          const k = config.textures["blocks"].textures.findIndex((val) =>
            val === blockConfig.textures[blockModel[face]]
          );

          setData(
            face,
            blockConfig.transparent ? "transparent" : "base",
            k,
            x,
            y,
            z,
          );
        }

        if (!blockConfig.solid) continue;
        if (
          isSolid(chunkName, x, y + 1, z, chunks) &&
          isSolid(chunkName, x, y - 1, z, chunks) &&
          isSolid(chunkName, x + 1, y, z, chunks) &&
          isSolid(chunkName, x - 1, y, z, chunks) &&
          isSolid(chunkName, x, y, z + 1, chunks) &&
          isSolid(chunkName, x, y, z - 1, chunks)
        ) {
          continue;
        }

        colliders.push([x + chunkX * 16, y + chunkY * 16, z + chunkZ * 16]);
      }
    }
  }

  return { meshData, chunkX, chunkY, chunkZ, chunkName, colliders };
}

export function generateHitboxFromPoints(points: number[]) {
  let minX = Number.MAX_SAFE_INTEGER;
  let maxX = Number.MIN_SAFE_INTEGER;
  let minY = Number.MAX_SAFE_INTEGER;
  let maxY = Number.MIN_SAFE_INTEGER;
  let minZ = Number.MAX_SAFE_INTEGER;
  let maxZ = Number.MIN_SAFE_INTEGER;

  for(let i = 0; i < points.length; i+=3) {
    minX = Math.min(minX, points[i])
    minY = Math.min(minY, points[i+1])
    minZ = Math.min(minZ, points[i+2])
    maxX = Math.max(maxX, points[i])
    maxY = Math.max(maxY, points[i+1])
    maxZ = Math.max(maxZ, points[i+2])
  }

  return { minX, maxX, minY, maxY, minZ, maxZ}
}
