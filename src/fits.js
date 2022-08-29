import { html } from 'lit';
import { readFITSHeader, readFITSImage } from './fits-parser.js';
import { FITSCanvas } from './fits-canvas.js';

export class FITS extends FITSCanvas {
  willUpdate(changedProperties) {
    if (changedProperties.has('src')) {
      this._fetch().then(() => {
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

  _fetch() {
    const self = this;

    this.ready = new Promise(resolve => {
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
          self.header = header;
          Object.freeze(self.header);
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
    return this.ready;
  }
}
