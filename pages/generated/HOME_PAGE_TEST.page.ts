import { BasePage } from '../base-page';

export class HomePageTestPage extends BasePage {
  readonly path = '/HOME_PAGE_TEST.html';
  readonly pageName = "HOME_PAGE_TEST.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Home Page Test Checklist";
  readonly criticalSelectors = ["body","h1"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
