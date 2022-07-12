/*
 * Javascript FITS Reader 0.2
 * Copyright (c) 2010 Stuart Lowe http://lcogt.net/
 *
 * Licensed under the MPL http://www.mozilla.org/MPL/MPL-1.1.txt
 *
 */

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

export class FITS {
  constructor(input) {
    this.src = typeof input === 'string' ? input : '';
    this.stretch = 'linear';
    this.color = 'gray';
    this.depth = 0;
    this.z = 0;
    this.scaleCutoff = 0.999;
    this.events = { load: '', click: '', mousemove: '' }; // Let's define some events
    this.data = { load: '', click: '', mousemove: '' }; // Let's define some event data
    this.stretchFunctions = {
      linear: stretchLinear,
      sqrt: stretchSqrt,
      cuberoot: stretchCuberoot,
      log: stretchLog,
      loglog: stretchLoglog,
      sqrtlog: stretchSqrtlog,
    };
    // Colour scales defined by SAOImage
    this.colormaps = {
      blackbody: colormapHeat,
      heat: colormapHeat,
      A: colormapA,
      B: colormapB,
      gray: colormapGray,
    };
  }

  // Loads the FITS file using an ajax request. To call your own function after
  // the FITS file is loaded, you should either provide a callback directly or have
  // already set the load function.
  load(source, fnCallback) {
    if (typeof source === 'string') this.src = source;
    if (typeof this.src === 'string') {
      this.image = null;
      if (typeof fnCallback === 'function') this.bind('load', fnCallback);
      const oReq = new XMLHttpRequest();
      oReq.open('GET', this.src, true);
      oReq.responseType = 'blob';
      const self = this;

      oReq.onload = () => {
        self.readFITSHeader(oReq.response).then(headerOffset => {
          if (self.header.NAXIS >= 2) {
            self.readFITSImage(oReq.response, headerOffset).then(() => {
              self.triggerEvent('load');
            });
          }
        });
      };
      oReq.send();
    }
    return this;
  }

  // Parse the ASCII header from the FITS file. It should be at the start.
  readFITSHeader(blob) {
    const iLength = blob.size;
    let iOffset = 0;
    const header = {};
    let inHeader = true;
    const headerUnitChars = 80;

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
        if (typeof header.NAXIS1 === 'number') this.width = header.NAXIS1;
        if (typeof header.NAXIS2 === 'number') this.height = header.NAXIS2;
      }

      if (header.NAXIS > 2 && typeof header.NAXIS3 === 'number')
        this.depth = header.NAXIS3;
      else this.depth = 1;

      if (typeof header.BSCALE === 'undefined') header.BSCALE = 1;
      if (typeof header.BZERO === 'undefined') header.BZERO = 0;

      // Remove any space padding
      while (iOffset < iLength && asText[iOffset] === ' ') iOffset += 1;

      this.header = header;
      return iOffset;
    });
  }

  readFITSImage(blob, headerOffset) {
    return blob
      .slice(headerOffset)
      .arrayBuffer()
      .then(buf => {
        switch (this.header.BITPIX) {
          case 16:
            this.image = new Uint16Array(buf);
            if (!systemBigEndian()) {
              this.image = this.image.map(swap16);
            }
            return true;
          case -32:
            this.image = new Float32Array(buf);
            return true;
          default:
            return false;
        }
      });
  }

  // Use <canvas> to draw a 2D image
  draw(id, type) {
    if (id) {
      this.id = id;
    }
    if (type) {
      this.stretch = type;
    }

    // Now we want to build the <canvas> element that will hold our image
    const el = document.getElementById(id);
    if (el != null) {
      // Look for a <canvas> with the specified ID or fall back on a <div>
      if (typeof el === 'object' && el.tagName !== 'CANVAS') {
        // Looks like the element is a container for our <canvas>
        el.setAttribute('id', `${this.id}holder`);
        const canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.setAttribute('width', this.width);
        canvas.setAttribute('height', this.height);
        canvas.setAttribute('id', this.id);
        el.appendChild(canvas);
      } else {
        el.setAttribute('width', this.width);
        el.setAttribute('height', this.height);
      }
      this.canvas = document.getElementById(this.id);
    } else this.canvas = el;
    this.ctx = this.canvas.getContext('2d');
    const self = this;
    // The object didn't exist before so we add a click event to it
    if (typeof this.events.click === 'function')
      this.canvas.addEventListener('click', e => {
        self.clickListener(e);
      });
    if (typeof this.events.mousemove === 'function')
      this.canvas.addEventListener('mousemove', e => {
        self.moveListener(e);
      });

    // create a new batch of pixels with the same
    // dimensions as the image:
    this.imageData = this.ctx.createImageData(this.width, this.height);

    this.update(this.stretch, 0);
  }

  // Calculate the pixel values using a defined stretch type and draw onto the canvas
  update(input) {
    const inp = { ...input };
    if (typeof inp === 'object') {
      this.stretch =
        typeof inp.stretch === 'string' ? inp.stretch : this.stretch;
      if (typeof inp.index !== 'number' && this.z) inp.index = this.z;
      this.z = Math.max(0, Math.min(this.depth - 1, Math.abs(inp.index || 0)));
      this.color = typeof inp.color === 'string' ? inp.color : this.color;
    } else if (typeof inp === 'string') this.stretch = inp;
    if (this.image == null) return;

    const image = new Uint8ClampedArray(this.width * this.height);
    const frameStart = this.width * this.height * this.z;
    let min = 0;
    const frameEnd = frameStart + image.length;
    let index = 0;

    const frame = this.image.slice(frameStart, frameEnd);
    const sorted = frame.slice().sort();
    const maxPercentile = Math.ceil(image.length * this.scaleCutoff);
    const max = sorted[maxPercentile];
    while (min === 0 && index < image.length) {
      min = sorted[(index += 1)];
    }
    const range = max - min;

    for (let i = frameStart; i < frameEnd; i += 1) {
      let val = this.stretchFunctions[this.stretch](frame[i], min, range);
      if (Number.isNaN(val)) val = 0;
      else if (val < 0) val = 0;
      else if (val > 255) val = 255;
      image.push(val);
    }

    index = 0;
    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        const pos = ((this.height - row) * this.width + col) * 4;
        const rgb = this.colormaps[this.color](image[index]);
        this.imageData.data[pos] = rgb.r;
        this.imageData.data[pos + 1] = rgb.g;
        this.imageData.data[pos + 2] = rgb.b;
        this.imageData.data[pos + 3] = 0xff; // alpha
        index += 1;
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  getCursor(e) {
    let x;
    let y;
    let { target } = e;

    if (e.pageX !== undefined && e.pageY !== undefined) {
      x = e.pageX;
      y = e.pageY;
    } else {
      x =
        e.clientX +
        document.body.scrollLeft +
        document.body.scrollLeft +
        document.documentElement.scrollLeft;
      y =
        e.clientY +
        document.body.scrollTop +
        document.body.scrollTop +
        document.documentElement.scrollTop;
    }

    while (target) {
      x -= target.offsetLeft;
      y -= target.offsetTop;
      target = target.offsetParent;
    }
    this.cursor = { x, y };
  }

  clickListener(e) {
    this.getCursor(e);
    this.triggerEvent('click', { x: this.cursor.x, y: this.cursor.y });
  }

  moveListener(e) {
    this.getCursor(e);
    this.triggerEvent('mousemove', { x: this.cursor.x, y: this.cursor.y });
  }

  bind(ev, fn, data = {}) {
    if (typeof ev !== 'string' || typeof fn !== 'function') return this;
    if (this.events[ev]) this.events[ev].push(fn);
    else this.events[ev] = [fn];
    if (this.data[ev]) this.data[ev].push(data);
    else this.data[ev] = [data];
    return this;
  }

  // Trigger a defined event with arguments.
  triggerEvent(ev, args = {}) {
    if (typeof ev !== 'string') return;
    if (typeof this.events[ev] === 'object') {
      for (let i = 0; i < this.events[ev].length; i += 1) {
        const tmpargs = args;
        tmpargs.data = this.data[ev][i];
        if (typeof this.events[ev][i] === 'function')
          this.events[ev][i].call(this, tmpargs);
      }
    }
  }
}
