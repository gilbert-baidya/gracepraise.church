import { BasePage } from '../base-page';

export class GivePage extends BasePage {
  readonly path = '/give.html';
  readonly pageName = "give.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Give | Support Our Ministry | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","form","h1","#darkModeToggle","#main-content","#online-content"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
