import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import '../fits-img.js';

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
});
