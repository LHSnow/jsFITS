import { html } from 'lit';
import { parseFITSHeader, parseFITSImage } from './fits-parser.js';
import { FitsCanvas } from './fits-canvas.js';

export class FitsImg extends FitsCanvas {
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
      fetch(this.src, {
        headers: { Accept: 'application/octet-stream' },
      })
        .then(response => response.arrayBuffer())
        .then(buf => {
          const [header, headerOffset] = parseFITSHeader(buf);

          if (header.NAXIS > 2 && typeof header.NAXIS3 === 'number') {
            self._frames = header.NAXIS3 > 1 ? header.NAXIS3 : 1;
          }

          if (header.NAXIS >= 2) {
            if (typeof header.NAXIS1 === 'number') self.width = header.NAXIS1;
            if (typeof header.NAXIS2 === 'number') self.height = header.NAXIS2;
          }

          self.header = header;
          Object.freeze(self.header);

          if (header.NAXIS >= 2) {
            this._rawImageData = parseFITSImage(
              buf,
              headerOffset,
              header.BITPIX,
              self.width,
              self.height
            );
            resolve();
          }
        });
    });
    return this.ready;
  }
}

window.customElements.define('fits-img', FitsImg);
