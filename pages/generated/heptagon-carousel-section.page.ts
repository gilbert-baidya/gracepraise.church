import { BasePage } from '../base-page';

export class HeptagonCarouselSectionPage extends BasePage {
  readonly path = '/heptagon-carousel-section.html';
  readonly pageName = "heptagon-carousel-section.html";
  readonly isFullDocument = false;
  readonly criticalSelectors = ["body","nav"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
