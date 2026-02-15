import { BasePage } from '../base-page';

export class TestConnectionPage extends BasePage {
  readonly path = '/test-connection.html';
  readonly pageName = "test-connection.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Test Google Sheets Connection";
  readonly criticalSelectors = ["body","h1"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
