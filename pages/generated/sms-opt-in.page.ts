import { BasePage } from '../base-page';

export class SmsOptInPage extends BasePage {
  readonly path = '/sms-opt-in.html';
  readonly pageName = "sms-opt-in.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "SMS Opt-In – Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","main","footer","h1"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
