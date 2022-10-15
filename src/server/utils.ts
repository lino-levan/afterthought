export function getBlockFromChunk(
  chunkName: string,
  x: number,
  y: number,
  z: number,
  chunks: Record<string, string[][][]>,
) {
  const chunk = chunkName.split("|").map((n) => parseInt(n));

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

  chunkName = `${chunk[0]}|${chunk[1]}|${chunk[2]}`

  if(chunks[chunkName] === undefined) {
    return ''
  }

  return chunks[`${chunk[0]}|${chunk[1]}|${chunk[2]}`][x][y][z];
}
