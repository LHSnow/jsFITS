import { html } from 'lit';
import { FitsCanvas } from './fits-canvas.js';
import { extractKeogramSlice } from './fits-parser.js';

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

export class FitsKeogram extends FitsCanvas {
  constructor() {
    super();
    this._images = null;
  }

  handleSlotchange(e) {
    const elements = e.target.assignedElements({ selector: 'fits-img' });

    Promise.all(elements.map(fitsImg => fitsImg.ready)).then(() => {
      this._images = elements;
      this.requestUpdate();
    });
  }

  updated() {
    if (this._images) {
      this.width = this._images.length;
      this.height = this._images[0].height;
      this._rgbImage = this._ctx.createImageData(this.width, this.height);
      const slices = this._images.map(image =>
        extractKeogramSlice(image._rawImageData, this._images[0].width)
      );
      this._rawImageData = createKeogramFrom(slices);
      this.draw();
    }
  }

  render() {
    return html`<canvas width="${this.width}" height="${this.height}"></canvas>
      <slot @slotchange=${this.handleSlotchange} hidden></slot> `;
  }
}

window.customElements.define('fits-keogram', FitsKeogram);