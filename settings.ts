import { App, PluginSettingTab, Setting } from 'obsidian';
import SmartsheetPlugin from './main';

export interface ColumnMap {
  [columnName: string]: 'frontmatter' | 'body' | 'ignore';
}

export interface SmartsheetSettings {
  apiToken: string;
  sheetId: string;
  sheetName: string;
  columnMap: ColumnMap;
  targetFolder: string;
}

export const DEFAULT_SETTINGS: SmartsheetSettings = {
  apiToken: '',
  sheetId: '',
  sheetName: '',
  columnMap: {},
  targetFolder: 'Smartsheet'
};

export class SettingsTab extends PluginSettingTab {
  plugin: SmartsheetPlugin;

  constructor(app: App, plugin: SmartsheetPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Smartsheet Sync Settings' });

    new Setting(containerEl)
      .setName('API Token')
      .setDesc('Your Smartsheet API access token')
      .addText(text =>
        text
          .setPlaceholder('smartsheet token')
          .setValue(this.plugin.settings.apiToken)
          .onChange(async value => {
            this.plugin.settings.apiToken = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Sheet ID')
      .setDesc('ID of the Smartsheet to sync')
      .addText(text =>
        text
          .setPlaceholder('Smartsheet sheet ID')
          .setValue(this.plugin.settings.sheetId)
          .onChange(async value => {
            this.plugin.settings.sheetId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Target Folder')
      .setDesc('Where to save markdown files')
      .addText(text =>
        text
          .setPlaceholder('e.g. Smartsheet')
          .setValue(this.plugin.settings.targetFolder)
          .onChange(async value => {
            this.plugin.settings.targetFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );
  }
}
