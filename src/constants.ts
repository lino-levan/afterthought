import config from "./config.json" assert { type: "json" };

export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export function createChunkName(
  chunkX: number,
  chunkY: number,
  chunkZ: number,
) {
  return `${chunkX}|${chunkY}|${chunkZ}`;
}

export function getChunkPosition(chunkName: string) {
  return chunkName.split("|").map((i) => parseInt(i));
}

export function getChunkFromPosition(x: number, y: number, z: number) {
  const chunkX = Math.floor(x / 16);
  const chunkY = Math.floor(y / 16);
  const chunkZ = Math.floor(z / 16);

  return createChunkName(chunkX, chunkY, chunkZ);
}

export function getLocalPosition(x: number, y: number, z: number) {
  return [mod(x, 16), mod(y, 16), mod(z, 16)];
}

export function generateHitboxFromPoints(points: number[]) {
  let minX = Number.MAX_SAFE_INTEGER;
  let maxX = Number.MIN_SAFE_INTEGER;
  let minY = Number.MAX_SAFE_INTEGER;
  let maxY = Number.MIN_SAFE_INTEGER;
  let minZ = Number.MAX_SAFE_INTEGER;
  let maxZ = Number.MIN_SAFE_INTEGER;

  for (let i = 0; i < points.length; i += 3) {
    minX = Math.min(minX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    minZ = Math.min(minZ, points[i + 2]);
    maxX = Math.max(maxX, points[i]);
    maxY = Math.max(maxY, points[i + 1]);
    maxZ = Math.max(maxZ, points[i + 2]);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * Gets a block's name given global coordinates. If the chunk is unloaded, returns air
 */
export function getBlockFromChunks(
  x: number,
  y: number,
  z: number,
  chunks: Record<string, string[][][]>,
) {
  const chunkName = getChunkFromPosition(x, y, z);
  const [localX, localY, localZ] = getLocalPosition(x, y, z);

  if (chunks[chunkName] === undefined) {
    return "";
  }

  return chunks[chunkName][localX][localY][localZ];
}

export function generateMesh(chunkName, chunks) {
  const [chunkX, chunkY, chunkZ] = getChunkPosition(chunkName);
  const colliders: number[][] = []; // collider data
  const meshData: Record<string, {
    positions: number[]; // vertex buffer
    uv: number[]; // uv buffer
    uv2: number[]; // uv buffer (for lightmap specifically)
  }> = {};

  meshData.base = {
    positions: [],
    uv: [],
    uv2: [],
  };

  meshData.transparent = {
    positions: [],
    uv: [],
    uv2: [],
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
    const [localX, localY, localZ] = getLocalPosition(x, y, z);
    const p = config.faces[face].positions;
    const u = config.faces[face].uvs;

    for (let i = 0; i < p.length; i += 3) {
      meshData[meshLayer].positions.push(
        localX + p[i],
        localY + p[i + 1],
        localZ + p[i + 2],
      );
    }

    for (let i = 0; i < u.length; i += 2) {
      meshData[meshLayer].uv.push(
        u[i],
        (k + u[i + 1]) * b,
      );
    }
  };

  const isTransparent = (x, y, z, chunks) => {
    const block = getBlockFromChunks(x, y, z, chunks);

    return block === "" || config.blocks[block].transparent;
  };

  const isSolid = (x, y, z, chunks) => {
    const block = getBlockFromChunks(x, y, z, chunks);

    return block !== "" && config.blocks[block].solid;
  };

  for (let x = chunkX * 16; x < 16 + chunkX * 16; x++) {
    for (let y = chunkY * 16; y < 16 + chunkY * 16; y++) {
      for (let z = chunkZ * 16; z < 16 + chunkZ * 16; z++) {
        let block = getBlockFromChunks(x, y, z, chunks);
        if (block === "") continue;

        const blockConfig = config.blocks[block];
        const blockModel = config.models[blockConfig.model];

        for (let face of Object.keys(blockModel)) {
          if (blockConfig.transparent) {
            if (
              face === "top" &&
              (!isTransparent(x, y + 1, z, chunks) ||
                getBlockFromChunks(x, y + 1, z, chunks) === block)
            ) {
              continue;
            }
            if (
              face === "bottom" &&
              (!isTransparent(x, y - 1, z, chunks) ||
                getBlockFromChunks(x, y - 1, z, chunks) === block)
            ) {
              continue;
            }
            if (
              face === "north" &&
              (!isTransparent(x + 1, y, z, chunks) ||
                getBlockFromChunks(x + 1, y, z, chunks) === block)
            ) {
              continue;
            }
            if (
              face === "south" &&
              (!isTransparent(x - 1, y, z, chunks) ||
                getBlockFromChunks(x - 1, y, z, chunks) === block)
            ) {
              continue;
            }
            if (
              face === "west" &&
              (!isTransparent(x, y, z + 1, chunks) ||
                getBlockFromChunks(x, y, z + 1, chunks) === block)
            ) {
              continue;
            }
            if (
              face === "east" &&
              (!isTransparent(x, y, z - 1, chunks) ||
                getBlockFromChunks(x, y, z - 1, chunks) === block)
            ) {
              continue;
            }
          } else {
            if (face === "top" && !isTransparent(x, y + 1, z, chunks)) {
              continue;
            }
            if (face === "bottom" && !isTransparent(x, y - 1, z, chunks)) {
              continue;
            }
            if (face === "north" && !isTransparent(x + 1, y, z, chunks)) {
              continue;
            }
            if (face === "south" && !isTransparent(x - 1, y, z, chunks)) {
              continue;
            }
            if (face === "west" && !isTransparent(x, y, z + 1, chunks)) {
              continue;
            }
            if (face === "east" && !isTransparent(x, y, z - 1, chunks)) {
              continue;
            }
          }

          if (
            face === "top" || face === "bottom" || face === "north" ||
            face === "south" || face === "east" || face === "west"
          ) {
            const p = config.faces[face].positions;
            for (let i = 0; i < p.length; i += 3) {
              let [vX, vY, vZ] = [p[i], p[i + 1], p[i + 2]];
              let side1, side2;

              if (face === "top" || face === "bottom") {
                side1 = !isTransparent(
                  vX === 0 ? x - 1 : x + 1,
                  vY === 0 ? y - 1 : y + 1,
                  z,
                  chunks,
                );
                side2 = !isTransparent(
                  x,
                  vY === 0 ? y - 1 : y + 1,
                  vZ === 0 ? z - 1 : z + 1,
                  chunks,
                );
              } else if (face === "north" || face === "south") {
                side1 = !isTransparent(
                  vX === 0 ? x - 1 : x + 1,
                  vY === 0 ? y - 1 : y + 1,
                  z,
                  chunks,
                );
                side2 = !isTransparent(
                  vX === 0 ? x - 1 : x + 1,
                  y,
                  vZ === 0 ? z - 1 : z + 1,
                  chunks,
                );
              } else if (face === "east" || face === "west") {
                side1 = !isTransparent(
                  x,
                  vY === 0 ? y - 1 : y + 1,
                  vZ === 0 ? z - 1 : z + 1,
                  chunks,
                );
                side2 = !isTransparent(
                  vX === 0 ? x - 1 : x + 1,
                  y,
                  vZ === 0 ? z - 1 : z + 1,
                  chunks,
                );
              }

              let corner = !isTransparent(
                vX === 0 ? x - 1 : x + 1,
                vY === 0 ? y - 1 : y + 1,
                vZ === 0 ? z - 1 : z + 1,
                chunks,
              );

              if (side1 && side2) {
                meshData[blockConfig.transparent ? "transparent" : "base"].uv2
                  .push(
                    0.25,
                    0,
                  );
              } else if (!(side1 && side2) && (side1 || side2) && corner) {
                meshData[blockConfig.transparent ? "transparent" : "base"].uv2
                  .push(
                    0.5,
                    0,
                  );
              } else if (side1 || side2 || corner) {
                meshData[blockConfig.transparent ? "transparent" : "base"].uv2
                  .push(
                    0.75,
                    0,
                  );
              } else {
                meshData[blockConfig.transparent ? "transparent" : "base"].uv2
                  .push(
                    1,
                    0,
                  );
              }
            }
          } else {
            const u = config.faces[face].uvs;
            for (let i = 0; i < u.length; i += 2) {
              meshData[blockConfig.transparent ? "transparent" : "base"].uv2
                .push(
                  1,
                  0,
                );
            }
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
          isSolid(x, y + 1, z, chunks) &&
          isSolid(x, y - 1, z, chunks) &&
          isSolid(x + 1, y, z, chunks) &&
          isSolid(x - 1, y, z, chunks) &&
          isSolid(x, y, z + 1, chunks) &&
          isSolid(x, y, z - 1, chunks)
        ) {
          continue;
        }

        colliders.push([x, y, z]);
      }
    }
  }

  return { meshData, chunkX, chunkY, chunkZ, chunkName, colliders };
}
