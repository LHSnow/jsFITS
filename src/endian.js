export function systemBigEndian() {
  const arrayBuffer = new ArrayBuffer(2);
  const uint8Array = new Uint8Array(arrayBuffer);
  const uint16array = new Uint16Array(arrayBuffer);
  uint8Array[0] = 0xaa; // set first byte
  uint8Array[1] = 0xbb; // set second byte
  if (uint16array[0] === 0xbbaa) return false;
  if (uint16array[0] === 0xaabb) return true;
  throw new Error('Neither big or little endian, what!?');
}

export function swap16(val) {
  /* eslint-disable no-bitwise */
  return ((val & 0xff) << 8) | ((val >> 8) & 0xff);
}
