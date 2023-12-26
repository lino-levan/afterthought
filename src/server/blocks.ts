import {
  getBlockFromChunks,
  getChunkFromPosition,
  getLocalPosition,
} from "../constants.ts";

/**
 * Returns list of "dirty" chunks given global coordinates. Regenerate chunk meshes if dirty.
 */
export function randomBlockTick(
  x: number,
  y: number,
  z: number,
  chunks: Record<string, string[][][]>,
): string[] {
  const chunkName = getChunkFromPosition(x, y, z);
  const block = getBlockFromChunks(x, y, z, chunks);

  switch (block) {
    case "dirt": {
      if (Math.random() > 0.01) break;
      if (getBlockFromChunks(x, y, z, chunks) !== "") {
        break;
      }

      const blocks = [
        getBlockFromChunks(x - 1, y, z, chunks),
        getBlockFromChunks(x + 1, y, z, chunks),
        getBlockFromChunks(x, y, z - 1, chunks),
        getBlockFromChunks(x, y, z + 1, chunks),
        getBlockFromChunks(x - 1, y - 1, z, chunks),
        getBlockFromChunks(x + 1, y - 1, z, chunks),
        getBlockFromChunks(x, y - 1, z - 1, chunks),
        getBlockFromChunks(x, y - 1, z + 1, chunks),
        getBlockFromChunks(x - 1, y + 1, z, chunks),
        getBlockFromChunks(x + 1, y + 1, z, chunks),
        getBlockFromChunks(x, y + 1, z - 1, chunks),
        getBlockFromChunks(x, y + 1, z + 1, chunks),
      ];

      if (blocks.indexOf("grass") !== -1) {
        chunks[chunkName][x][y][z] = "grass";
        return [chunkName];
      }

      break;
    }
    case "grass": {
      if (
        getBlockFromChunks(x, y + 1, z, chunks) !== ""
      ) {
        chunks[chunkName][x][y][z] = "dirt";
        return [chunkName];
      }

      break;
    }
  }
  return [];
}

export function blockUpdate(
  [x, y, z]: number[],
  chunks: Record<string, string[][][]>,
) {
  let modifiedChunks: string[] = [];
  const chunkName = getChunkFromPosition(x, y, z);
  const [localX, localY, localZ] = getLocalPosition(x, y, z);
  const block = chunks[chunkName][localX][localY][localZ];

  switch (block) {
    case "short_grass": {
      if (
        getBlockFromChunks(x, y - 1, z, chunks) === ""
      ) {
        chunks[chunkName][localX][localY][localZ] = "";
        modifiedChunks = [
          chunkName,
        ];
      }
      break;
    }

    case "short_cactus": {
      if (
        getBlockFromChunks(x, y - 1, z, chunks) === ""
      ) {
        chunks[chunkName][localX][localY][localZ] = "";
        modifiedChunks = [chunkName];
      }
      break;
    }
  }
  return modifiedChunks;
}
