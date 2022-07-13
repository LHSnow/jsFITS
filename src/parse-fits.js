function isString(val) {
  return val.startsWith("'");
}

function isDate(val) {
  return val.match(/\d+-\d+-\d+T.+/g);
}

function isBoolean(val) {
  return val.match(/^[TF]$/);
}

function isFloat(val) {
  return val.includes('.');
}

function systemBigEndian() {
  const arrayBuffer = new ArrayBuffer(2);
  const uint8Array = new Uint8Array(arrayBuffer);
  const uint16array = new Uint16Array(arrayBuffer);
  uint8Array[0] = 0xaa; // set first byte
  uint8Array[1] = 0xbb; // set second byte
  if (uint16array[0] === 0xbbaa) return false;
  if (uint16array[0] === 0xaabb) return true;
  throw new Error('Neither big or little endian, what!?');
}

function swap16(val) {
  /* eslint-disable no-bitwise */
  return ((val & 0xff) << 8) | ((val >> 8) & 0xff);
}

// Returns header as object, headerOffset as number (start of data, or end of file)
export function readFITSHeader(blob) {
  const iLength = blob.size;
  let iOffset = 0;
  const header = {};
  let inHeader = true;
  let width;
  let height;
  let depth;
  const headerUnitChars = 80;

  return blob.text().then(asText => {
    while (iOffset < iLength && inHeader) {
      const headerUnit = asText.slice(iOffset, iOffset + headerUnitChars);
      const hdu = headerUnit.split(/[=/]/);
      const key = hdu[0];
      let val = hdu[1];
      if (key.length > 0 && val) {
        val = val.trim();
        if (isString(val)) {
          val = val.replace(/'/g, '').trim();
          if (isDate(val)) {
            val = Date.parse(val);
          }
        } else if (isBoolean(val)) {
          val = val.includes('T');
        } else if (isFloat(val)) {
          val = parseFloat(val);
        } else {
          val = parseInt(val, 10);
        }
        header[key.trim()] = val;
      }
      if (headerUnit.startsWith('END')) inHeader = false;
      iOffset += headerUnitChars;
    }

    if (typeof header.BSCALE === 'undefined') header.BSCALE = 1;
    if (typeof header.BZERO === 'undefined') header.BZERO = 0;

    if (header.NAXIS > 2 && typeof header.NAXIS3 === 'number') {
      depth = header.NAXIS3;
    }

    if (header.NAXIS >= 2) {
      if (typeof header.NAXIS1 === 'number') width = header.NAXIS1;
      if (typeof header.NAXIS2 === 'number') height = header.NAXIS2;
    }

    // Remove any space padding
    while (iOffset < iLength && asText[iOffset] === ' ') iOffset += 1;

    return [header, iOffset, width, height, depth];
  });
}

export function readFITSImage(blob, headerOffset, bitpix) {
  let binaryImage;
  return blob
    .slice(headerOffset)
    .arrayBuffer()
    .then(buf => {
      switch (bitpix) {
        case 16:
          binaryImage = new Uint16Array(buf);
          if (!systemBigEndian()) {
            binaryImage = binaryImage.map(swap16);
          }
          return binaryImage;
        case -32:
          return new Float32Array(buf);
        default:
          return new Uint8Array(0);
      }
    });
}
