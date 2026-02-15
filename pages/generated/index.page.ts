import { BasePage } from '../base-page';

export class IndexPage extends BasePage {
  readonly path = '/index.html';
  readonly pageName = "index.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Grace and Praise Bangladeshi Church - San Bernardino, CA";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content","#heroVideoModal","#heroStoryVideo"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
