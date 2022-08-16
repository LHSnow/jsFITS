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

// Returns header as object, headerOffset as number (start of data, or end of file)
export function readFITSHeader(buffer) {
  const iLength = buffer.byteLength;
  let iOffset = 0;
  const header = {};
  let width;
  let height;
  let depth;
  const headerUnitChars = 80;
  const fitsHeaderByteMultiples = 2880;

  while (iOffset < iLength) {
    const line = buffer.slice(iOffset, iOffset + headerUnitChars);
    const headerUnit = String.fromCharCode.apply(null, new Uint8Array(line));
    if (headerUnit.startsWith('END')) break;

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

  iOffset += fitsHeaderByteMultiples - (iOffset % fitsHeaderByteMultiples);

  return [header, iOffset, width, height, depth];
}

export function readFITSImage(buf, headerOffset, bitpix) {
  let databytes;
  let binaryImage;
  let dataView;

  if (bitpix === 16) {
    databytes = 2;
    dataView = new DataView(buf, headerOffset);
    binaryImage = new Uint16Array(dataView.byteLength / databytes);

    for (let i = 0; i < binaryImage.length; i += 1) {
      binaryImage[i] = dataView.getUint16(i * databytes);
    }
    return binaryImage;
  }
  throw Error('Only supports Uint16 encoding (TODO: allow other BITPIX)');
}
