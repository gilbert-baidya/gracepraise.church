import { BasePage } from '../../base-page';

export class PartialsFooterPage extends BasePage {
  readonly path = '/partials/footer.html';
  readonly pageName = "partials/footer.html";
  readonly isFullDocument = false;
  readonly criticalSelectors = ["body"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
