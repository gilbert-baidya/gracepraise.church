import { BasePage } from '../base-page';

export class TestimoniesPage extends BasePage {
  readonly path = '/testimonies.html';
  readonly pageName = "testimonies.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Testimonies - Grace and Praise Bangladeshi Church | GPBC";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
