import { BasePage } from '../base-page';

export class SongbookPage extends BasePage {
  readonly path = '/songbook.html';
  readonly pageName = "songbook.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "GPBC Song Book - Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","footer","h1","#darkModeToggle","#authButton","#searchInput","#savePlaylistBtn",".mobile-menu-btn"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
