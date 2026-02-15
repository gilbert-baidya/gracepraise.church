import { BasePage } from '../base-page';

export class TranslateTestPage extends BasePage {
  readonly path = '/translate-test.html';
  readonly pageName = "translate-test.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Translation Test";
  readonly criticalSelectors = ["body","h1"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
