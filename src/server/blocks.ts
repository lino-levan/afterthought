import { getBlockFromChunk } from "./utils.ts";

/**
 * Returns list of "dirty" chunks. Regenerate chunk meshes if dirty.
 * @param block block type
 * @param pos position [x, y, z]
 * @param chunk position [x, y, z]
 * @param chunks world chunks
 * @returns boolean if dirty
 */
export function randomBlockTick(
  block: string,
  pos: number[],
  chunk: number[],
  chunks: Record<string, string[][][]>,
): string[] {
  const chunkName = `${chunk[0]}|${chunk[1]}|${chunk[2]}`;

  switch (block) {
    case "dirt": {
      if (Math.random() > 0.01) break;
      if (
        getBlockFromChunk(chunkName, pos[0], pos[1] + 1, pos[2], chunks) !== ""
      ) {
        break;
      }

      const blocks = [
        getBlockFromChunk(chunkName, pos[0] - 1, pos[1], pos[2], chunks),
        getBlockFromChunk(chunkName, pos[0] + 1, pos[1], pos[2], chunks),
        getBlockFromChunk(chunkName, pos[0], pos[1], pos[2] - 1, chunks),
        getBlockFromChunk(chunkName, pos[0], pos[1], pos[2] + 1, chunks),
        getBlockFromChunk(chunkName, pos[0] - 1, pos[1] - 1, pos[2], chunks),
        getBlockFromChunk(chunkName, pos[0] + 1, pos[1] - 1, pos[2], chunks),
        getBlockFromChunk(chunkName, pos[0], pos[1] - 1, pos[2] - 1, chunks),
        getBlockFromChunk(chunkName, pos[0], pos[1] - 1, pos[2] + 1, chunks),
        getBlockFromChunk(chunkName, pos[0] - 1, pos[1] + 1, pos[2], chunks),
        getBlockFromChunk(chunkName, pos[0] + 1, pos[1] + 1, pos[2], chunks),
        getBlockFromChunk(chunkName, pos[0], pos[1] + 1, pos[2] - 1, chunks),
        getBlockFromChunk(chunkName, pos[0], pos[1] + 1, pos[2] + 1, chunks),
      ];

      if (blocks.indexOf("grass") !== -1) {
        chunks[chunkName][pos[0]][pos[1]][pos[2]] = "grass";
        return [chunkName];
      }

      break;
    }
    case "grass": {
      if (
        getBlockFromChunk(chunkName, pos[0], pos[1] + 1, pos[2], chunks) !== ""
      ) {
        chunks[chunkName][pos[0]][pos[1]][pos[2]] = "dirt";
        return [chunkName];
      }

      break;
    }
  }
  return [];
}

export function blockUpdate(
  block: string,
  pos: number[],
  chunk: number[],
  chunks: Record<string, string[][][]>,
) {
  const chunkName = `${chunk[0]}|${chunk[1]}|${chunk[2]}`;

  switch (block) {
    case "short_grass": {
      if (
        getBlockFromChunk(chunkName, pos[0], pos[1] - 1, pos[2], chunks) === ""
      ) {
        chunks[chunkName][pos[0]][pos[1]][pos[2]] = "";
        return [chunkName];
      }
    }
  }
  return [];
}
