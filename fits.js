/*
 * Javascript FITS Reader 0.2
 * Copyright (c) 2010 Stuart Lowe http://lcogt.net/
 *
 * Licensed under MIT
 *
 */

import { html, LitElement } from 'lit';
import {
  stretchCuberoot,
  stretchLinear,
  stretchLog,
  stretchLoglog,
  stretchSqrt,
  stretchSqrtlog,
} from './src/stretch.js';
import {
  colormapA,
  colormapB,
  colormapGray,
  colormapHeat,
} from './src/colormap.js';
import {
  isBoolean,
  isDate,
  isFloat,
  isString,
} from './src/parse-fits-header.js';
import { swap16, systemBigEndian } from './src/endian.js';

export class FITS extends LitElement {
  constructor() {
    super();
    this.src = '';
    this.stretch = 'linear';
    this.color = 'gray';
    this.width = 0;
    this.height = 0;
    this.z = 0;
    this.scaleCutoff = 0.999;
    this._binaryImage = null;
    this._depth = 0;
    this._header = {};
    this._canvas = null;
    this._ctx = null;
    this._rgbImage = null;
    this._stretchFunctions = {
      linear: stretchLinear,
      sqrt: stretchSqrt,
      cuberoot: stretchCuberoot,
      log: stretchLog,
      loglog: stretchLoglog,
      sqrtlog: stretchSqrtlog,
    };
    // Colour scales defined by SAOImage
    this._colormaps = {
      blackbody: colormapHeat,
      heat: colormapHeat,
      A: colormapA,
      B: colormapB,
      gray: colormapGray,
    };
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('src')) {
      this.fetch().then(() => {
        if (!this._rgbImage && this._ctx) {
          this._rgbImage = this._ctx.createImageData(this.width, this.height);
        }
        this.draw();
      });
    }
  }

  render() {
    return html`<canvas
      id="canvas"
      width="${this.width}"
      height="${this.height}"
    ></canvas>`;
  }

  // Loads the FITS file using an ajax request
  fetch() {
    const self = this;
    return new Promise(resolve => {
      if (this.src.length) {
        self._binaryImage = null;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', this.src, true);
        xhr.responseType = 'blob';

        xhr.onload = () => {
          self.readFITSHeader(xhr.response).then(headerOffset => {
            if (self._header.NAXIS >= 2) {
              self.readFITSImage(xhr.response, headerOffset).then(() => {
                resolve();
              });
            }
          });
        };
        xhr.send();
      }
    });
  }

  // Parse the ASCII header from the FITS file. It should be at the start.
  readFITSHeader(blob) {
    const iLength = blob.size;
    let iOffset = 0;
    const header = {};
    let inHeader = true;
    const headerUnitChars = 80;
    const self = this;

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

      if (header.NAXIS >= 2) {
        if (typeof header.NAXIS1 === 'number') self.width = header.NAXIS1;
        if (typeof header.NAXIS2 === 'number') self.height = header.NAXIS2;
      }

      if (header.NAXIS > 2 && typeof header.NAXIS3 === 'number')
        self._depth = header.NAXIS3;
      else this._depth = 1;

      if (typeof header.BSCALE === 'undefined') header.BSCALE = 1;
      if (typeof header.BZERO === 'undefined') header.BZERO = 0;

      // Remove any space padding
      while (iOffset < iLength && asText[iOffset] === ' ') iOffset += 1;

      self._header = header;
      return iOffset;
    });
  }

  readFITSImage(blob, headerOffset) {
    return blob
      .slice(headerOffset)
      .arrayBuffer()
      .then(buf => {
        switch (this._header.BITPIX) {
          case 16:
            this._binaryImage = new Uint16Array(buf);
            if (!systemBigEndian()) {
              this._binaryImage = this._binaryImage.map(swap16);
            }
            return true;
          case -32:
            this._binaryImage = new Float32Array(buf);
            return true;
          default:
            return false;
        }
      });
  }

  firstUpdated() {
    this._canvas = this.renderRoot.querySelector('#canvas');
    if (this._canvas) {
      this._ctx = this._canvas.getContext('2d');
      this.draw();
    }
  }

  // Calculate the pixel values using a defined stretch type and draw onto the canvas
  draw() {
    if (!this._binaryImage || !this._ctx) return;

    const image = new Uint8ClampedArray(this.width * this.height);
    const frameStart = this.width * this.height * this.z;
    let min = 0;
    const frameEnd = frameStart + image.length;
    let index = 0;

    const frame = this._binaryImage.slice(frameStart, frameEnd);
    const sorted = frame.slice().sort();
    const maxPercentile = Math.ceil(image.length * this.scaleCutoff);
    const max = sorted[maxPercentile];
    while (min === 0 && index < image.length) {
      min = sorted[(index += 1)];
    }
    const range = max - min;

    let j = 0;
    for (let i = frameStart; i < frameEnd; i += 1, j += 1) {
      let val = this._stretchFunctions[this.stretch](frame[i], min, range);
      if (Number.isNaN(val)) val = 0;
      else if (val < 0) val = 0;
      else if (val > 255) val = 255;
      image[j] = val;
    }

    index = 0;
    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        const pos = ((this.height - row) * this.width + col) * 4;
        const rgb = this._colormaps[this.color](image[index]);
        this._rgbImage.data[pos] = rgb.r;
        this._rgbImage.data[pos + 1] = rgb.g;
        this._rgbImage.data[pos + 2] = rgb.b;
        this._rgbImage.data[pos + 3] = 0xff; // alpha
        index += 1;
      }
    }

    this._ctx.putImageData(this._rgbImage, 0, 0);
  }
}

FITS.properties = {
  src: { type: String },
  stretch: { type: String },
  color: { type: String },
  width: { type: Number },
  height: { type: Number },
  z: { type: Number },
  scaleCutoff: { type: Number },
};
