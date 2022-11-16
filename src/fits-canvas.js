import { LitElement } from 'lit';
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

export function dynamicRange(image, scaleCutoff) {
  let min = 0;
  let index = 0;
  const sorted = image.slice().sort();
  const maxPercentile = Math.ceil(sorted.length * scaleCutoff);
  const max = sorted[maxPercentile];
  while (min === 0 && index < sorted.length) {
    min = sorted[(index += 1)];
  }
  const range = max - min;
  return [min, range];
}

export class FitsCanvas extends LitElement {
  constructor() {
    super();
    this.src = '';
    this.stretch = 'linear';
    this.colormap = 'gray';
    this.width = 0;
    this.height = 0;
    this.depth = 1;
    this.frameIndex = 0;
    this.scaleCutoff = 0.999;
    this._rawImageData = null;
    this.header = {};
    this._canvas = null;
    this._ctx = null;
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

  firstUpdated() {
    this._canvas = this.renderRoot.querySelector('canvas');
    if (this._canvas) {
      this._ctx = this._canvas.getContext('2d');
      this.draw();
    }
  }

  draw() {
    const hidden = this._canvas?.offsetParent === null;
    if (hidden || !this._rawImageData || !this._ctx) return;

    let image = this.imageFrame(this.frameIndex);
    image = this._applyStretch(image);
    image = this._applyColormap(image);
    this._ctx.putImageData(image, 0, 0);
  }

  imageFrame(frameIndex) {
    const frameSize = this.width * this.height;
    const frameStart = frameSize * frameIndex;
    const frameEnd = frameStart + frameSize;
    return this._rawImageData.slice(frameStart, frameEnd);
  }

  _applyStretch(image) {
    const tmpImageData = new Uint8ClampedArray(image.length);
    const [min, range] = dynamicRange(image, this.scaleCutoff);

    let j = 0;
    for (let i = 0; i < tmpImageData.length; i += 1, j += 1) {
      let val = this._stretchFunctions[this.stretch](image[i], min, range);
      if (Number.isNaN(val)) val = 0;
      else if (val < 0) val = 0;
      else if (val > 254) val = 254;
      tmpImageData[j] = val;
    }
    return tmpImageData;
  }

  _applyColormap(image) {
    let index = 0;
    const fullOpacity = 0xff;
    const rgbImage = this._ctx.createImageData(this.width, this.height);
    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        const pos = ((this.height - row) * this.width + col) * 4;
        const rgb = this._colormaps[this.colormap](image[index]);
        rgbImage.data[pos] = rgb.r;
        rgbImage.data[pos + 1] = rgb.g;
        rgbImage.data[pos + 2] = rgb.b;
        rgbImage.data[pos + 3] = fullOpacity;
        index += 1;
      }
    }
    return rgbImage;
  }
}

FitsCanvas.properties = {
  src: { type: String },
  stretch: { type: String, reflect: true },
  colormap: { type: String, reflect: true },
  width: { type: Number },
  height: { type: Number },
  depth: { type: Number, reflect: true },
  frameIndex: {
    type: Number,
    attribute: 'frame-index',
  },
  scaleCutoff: {
    type: Number,
    attribute: 'scale-cutoff',
    reflect: true,
  },
};
