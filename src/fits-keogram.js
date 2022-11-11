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
    const updatesCompleted = elements.map(element => element.updateComplete);
    Promise.all(updatesCompleted).then(() => {
      const readied = elements.map(element => element.ready);
      Promise.all(readied).then(() => {
        this._images = elements;
        this.requestUpdate();
      });
    });
  }

  updated() {
    if (this._images) {
      this.width = this._images
        .map(i => i.depth)
        .reduce((sum, depth) => sum + depth, 0);
      this.height = this._images[0].height;
      const slices = [];
      this._images.forEach(image => {
        for (let i = 0; i < image.depth; i += 1) {
          slices.push(extractKeogramSlice(image.imageFrame(i), image.width));
        }
      });
      this._rawImageData = createKeogramFrom(slices);
      this._rgbImage = this._ctx.createImageData(this.width, this.height);
      this.draw();
    }
  }

  render() {
    return html`
      <canvas width="${this.width}" height="${this.height}"></canvas>
      <slot @slotchange="${this.handleSlotchange}" hidden></slot>
    `;
  }
}

window.customElements.define('fits-keogram', FitsKeogram);
