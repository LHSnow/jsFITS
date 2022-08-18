import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import '../fits-img.js';
import { extractKeogramSlice } from '../src/parse-fits.js';
import { createKeogramFrom } from '../src/keogram.js';

describe('FitsImg', () => {
  it('has default values for attributes', async () => {
    const el = await fixture(html`<fits-img></fits-img>`);

    expect(el.scaleCutoff).to.equal(0.999);
    expect(el.stretch).to.equal('linear');
    expect(el.colormap).to.equal('gray');
  });

  it('can override defaults with attributes', async () => {
    const el = await fixture(
      html`<fits-img
        scale-cutoff="0.998"
        stretch="sqrt"
        colormap="heat"
      ></fits-img>`
    );

    expect(el.scaleCutoff).to.equal(0.998);
    expect(el.stretch).to.equal('sqrt');
    expect(el.colormap).to.equal('heat');
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(html`<fits-img></fits-img>`);

    await expect(el).shadowDom.to.be.accessible();
  });

  it('extracts the right center column from a even width image for a keogram', () => {
    const imageData = new Uint16Array([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    const keogramSlice = extractKeogramSlice(imageData, 4);
    expect(keogramSlice.toString()).to.equal('2,6,10,14');
  });

  it('extracts the center column from a odd width image for a keogram', () => {
    const imageData = new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const keogramSlice = extractKeogramSlice(imageData, 3);
    expect(keogramSlice.toString()).to.equal('1,4,7');
  });

  it('a keogram slice is a multiple of the image height', () => {
    const imageData = new Uint16Array(256 * 256);
    const keogramSlice = extractKeogramSlice(imageData, 256);
    expect(keogramSlice.length).to.equal(256);
  });

  it('concatenates keogram slices into a keogram', () => {
    const slices = [
      new Uint16Array([0, 0, 0]),
      new Uint16Array([1, 1, 1]),
      new Uint16Array([2, 2, 2]),
      new Uint16Array([3, 3, 3]),
    ];
    const keogram = createKeogramFrom(slices);
    expect(keogram.toString()).to.equal('0,1,2,3,0,1,2,3,0,1,2,3');
  });
});
