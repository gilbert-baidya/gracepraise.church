import { BasePage } from '../base-page';

export class NavigationTemplatePage extends BasePage {
  readonly path = '/navigation-template.html';
  readonly pageName = "navigation-template.html";
  readonly isFullDocument = false;
  readonly criticalSelectors = ["body","header","nav",".mobile-menu-btn",".nav-links",".dropdown-menu"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
