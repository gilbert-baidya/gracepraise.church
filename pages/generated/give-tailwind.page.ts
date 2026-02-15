import { BasePage } from '../base-page';

export class GiveTailwindPage extends BasePage {
  readonly path = '/give-tailwind.html';
  readonly pageName = "give-tailwind.html";
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
