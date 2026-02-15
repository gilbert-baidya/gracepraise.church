import { BasePage } from '../base-page';

export class ShapeSectionsPage extends BasePage {
  readonly path = '/shape-sections.html';
  readonly pageName = "shape-sections.html";
  readonly isFullDocument = false;
  readonly criticalSelectors = ["body","#circle-hero","#theme-title"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
