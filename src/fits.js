import { html } from 'lit';
import {
  extractKeogramSlice,
  readFITSHeader,
  readFITSImage,
} from './fits-parser.js';
import { FITSCanvas } from './fits-canvas.js';

export class FITS extends FITSCanvas {
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
              header.BITPIX,
              width,
              height
            );
            resolve();
          }
        });
    });
  }

  keogramSlice() {
    if (this._rawImageData && this.width) {
      return new Promise(extractKeogramSlice(this._rawImageData, this.width));
    }
    return this.fetch().then(() =>
      extractKeogramSlice(this._rawImageData, this.width)
    );
  }
}
