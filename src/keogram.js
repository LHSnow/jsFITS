/*
 * Javascript FITS Reader 0.2
 * Copyright (c) 2010 Stuart Lowe http://lcogt.net/
 *
 * Licensed under MIT
 *
 */

import { html, LitElement } from 'lit';
import {
  colormapA,
  colormapB,
  colormapGray,
  colormapHeat,
} from './colormap.js';
import {
  stretchCuberoot,
  stretchLinear,
  stretchLog,
  stretchLoglog,
  stretchSqrt,
  stretchSqrtlog,
} from './stretch.js';

export function createKeogramFrom(slices) {
  const width = slices.length;
  const height = slices[0].length;
  const rawKeogram = new slices[0].constructor(width * height);
  for (let i = 0; i < width; i += 1) {
    for (let j = 0; j < height; j += 1) {
      rawKeogram[j * width + i] = slices[i][j];
    }
  }
  return rawKeogram;
}

export class Keogram extends LitElement {
  constructor() {
    super();
    this._rawImageData = null;
    this._canvas = null;
    this._ctx = null;
    this._rgbImage = null;
    this.stretch = 'linear';
    this.colormap = 'gray';
    this.width = 0;
    this.height = 0;
    this.frame = 0;
    this.scaleCutoff = 0.999;
    this._colormaps = {
      blackbody: colormapHeat,
      heat: colormapHeat,
      A: colormapA,
      B: colormapB,
      gray: colormapGray,
    };
    this._stretchFunctions = {
      linear: stretchLinear,
      sqrt: stretchSqrt,
      cuberoot: stretchCuberoot,
      log: stretchLog,
      loglog: stretchLoglog,
      sqrtlog: stretchSqrtlog,
    };
  }

  async handleSlotchange(e) {
    const children = e.target.assignedElements({ selector: 'fits-img' });

    Promise.all(children.map(child => child.keogramSlice())).then(slices => {
      this.width = slices.length;
      this.height = slices[0].length;
      this._rgbImage = this._ctx.createImageData(this.width, this.height);
      this._rawImageData = createKeogramFrom(slices);
      this.draw();
    });
  }

  willUpdate() {
    this.draw();
  }

  firstUpdated() {
    this._canvas = this.renderRoot.querySelector('canvas');
    if (this._canvas) {
      this._ctx = this._canvas.getContext('2d');
      this.draw();
    }
  }

  render() {
    return html`<canvas width="${this.width}" height="${this.height}"></canvas>
      <slot @slotchange=${this.handleSlotchange} hidden></slot> `;
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

Keogram.properties = {
  stretch: { type: String, reflect: true },
  colormap: { type: String, reflect: true },
  scaleCutoff: {
    type: Number,
    attribute: 'scale-cutoff',
    reflect: true,
  },
};
