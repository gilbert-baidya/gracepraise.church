import { BasePage } from '../base-page';

export class GiveBootstrapPage extends BasePage {
  readonly path = '/give-bootstrap.html';
  readonly pageName = "give-bootstrap.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Give | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content","#panel-card",".mobile-menu-btn"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
