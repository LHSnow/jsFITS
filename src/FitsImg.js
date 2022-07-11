import { html, LitElement } from 'lit';

export class FitsImg extends LitElement {
  static get properties() {
    return {
      src: { type: String },
    };
  }

  constructor() {
    super();
    this.src = '';
  }

  render() {
    return html` <h2>${this.src}</h2> `;
  }
}
