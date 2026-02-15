import { BasePage } from '../../base-page';

export class PartialsHeaderPage extends BasePage {
  readonly path = '/partials/header.html';
  readonly pageName = "partials/header.html";
  readonly isFullDocument = false;
  readonly criticalSelectors = ["body","header","nav","#darkModeToggle",".mobile-menu-btn",".nav-links",".dropdown-menu"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
