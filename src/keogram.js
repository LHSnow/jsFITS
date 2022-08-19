import { html } from 'lit';
import { FITSCanvas } from './fits-canvas.js';

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

export class Keogram extends FITSCanvas {
  handleSlotchange(e) {
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

  render() {
    return html`<canvas width="${this.width}" height="${this.height}"></canvas>
      <slot @slotchange=${this.handleSlotchange} hidden></slot> `;
  }
}
