import { BasePage } from '../base-page';

export class GalleryPage extends BasePage {
  readonly path = '/gallery.html';
  readonly pageName = "gallery.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Church Gallery - Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content","#lightboxTitle",".mobile-menu-btn"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
