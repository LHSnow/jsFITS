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
} from './stretch.js';
import {
  colormapA,
  colormapB,
  colormapGray,
  colormapHeat,
} from './colormap.js';
import { readFITSHeader, readFITSImage } from './parse-fits.js';

export class FITS extends LitElement {
  constructor() {
    super();
    this.src = '';
    this.stretch = 'linear';
    this.colormap = 'gray';
    this.width = 0;
    this.height = 0;
    this.frame = 0;
    this.scaleCutoff = 0.999;
    this._rawImageData = null;
    this._frames = 1;
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
          this.draw();
        }
      });
    } else {
      this.draw();
    }
  }

  render() {
    return html`<canvas
      width="${this.width}"
      height="${this.height}"
    ></canvas>`;
  }

  fetch() {
    const self = this;

    return new Promise(resolve => {
      self._rawImageData = null;
      let header;
      let headerOffset;
      let width;
      let height;
      let frames;
      fetch(this.src, {
        headers: { Accept: 'application/octet-stream' },
      })
        .then(response => response.arrayBuffer())
        .then(buf => {
          [header, headerOffset, width, height, frames] = readFITSHeader(buf);
          self._header = header;
          self.height = height;
          self.width = width;
          self._frames = frames > 1 ? frames : 1;

          if (header.NAXIS >= 2) {
            this._rawImageData = readFITSImage(
              buf,
              headerOffset,
              header.BITPIX
            );
            resolve();
          }
        });
    });
  }

  firstUpdated() {
    this._canvas = this.renderRoot.querySelector('canvas');
    if (this._canvas) {
      this._ctx = this._canvas.getContext('2d');
      this.draw();
    }
  }

  // Calculate the pixel values using a defined stretch type and draw onto the canvas
  draw() {
    if (!this._rawImageData || !this._ctx || !this._rgbImage) return;

    const tmpImageData = new Uint8ClampedArray(this.width * this.height);
    const frameStart = this.width * this.height * this.frame;
    let min = 0;
    const frameEnd = frameStart + tmpImageData.length;
    let index = 0;

    const frame = this._rawImageData.slice(frameStart, frameEnd);
    const sorted = frame.slice().sort();
    const maxPercentile = Math.ceil(tmpImageData.length * this.scaleCutoff);
    const max = sorted[maxPercentile];
    while (min === 0 && index < tmpImageData.length) {
      min = sorted[(index += 1)];
    }
    const range = max - min;

    let j = 0;
    for (let i = frameStart; i < frameEnd; i += 1, j += 1) {
      let val = this._stretchFunctions[this.stretch](frame[i], min, range);
      if (Number.isNaN(val)) val = 0;
      else if (val < 0) val = 0;
      else if (val > 254) val = 254;
      tmpImageData[j] = val;
    }

    index = 0;
    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        const pos = ((this.height - row) * this.width + col) * 4;
        const rgb = this._colormaps[this.colormap](tmpImageData[index]);
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
  stretch: { type: String, reflect: true },
  colormap: { type: String, reflect: true },
  width: { type: Number },
  height: { type: Number },
  frame: { type: Number },
  scaleCutoff: {
    type: Number,
    attribute: 'scale-cutoff',
    reflect: true,
  },
};
