import {
  Plugin,
  Notice,
  TFile
} from 'obsidian';
import fetch from 'node-fetch';
import { SettingsTab, DEFAULT_SETTINGS, SmartsheetSettings } from './settings';

interface SmartsheetRow {
  id: number;
  modifiedAt: string;
  cells: {
    columnId: number;
    columnName: string;
    value: any;
  }[];
}

interface SmartsheetSheet {
  rows: SmartsheetRow[];
}

export default class SmartsheetPlugin extends Plugin {
  settings: SmartsheetSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this.app, this));

    this.addCommand({
      id: 'sync-smartsheet',
      name: 'Sync Smartsheet Rows',
      callback: () => this.syncRows()
    });
  }

  async syncRows() {
    if (!this.settings.apiToken || !this.settings.sheetId) {
      new Notice('Please set API Token & Sheet ID in settings');
      return;
    }

    const fldr = this.settings.targetFolder;
    await this.app.vault.createFolder(fldr).catch(() => {});

    try {
      const sheet = await this.fetchSheet();
      for (const row of sheet.rows) {
        await this.processRow(row);
      }
      new Notice('✅ Smartsheet sync complete');
    } catch (e) {
      console.error(e);
      new Notice('❌ Smartsheet sync failed');
    }
  }

  private async fetchSheet(): Promise<SmartsheetSheet> {
    const resp = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${this.settings.sheetId}`,
      {
        headers: {
          Authorization: `Bearer ${this.settings.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!resp.ok) throw new Error(`Smartsheet fetch failed: ${resp.status}`);
    const sheet = await resp.json();
    return sheet;
  }

  private formatMk(row: SmartsheetRow): string {
    const fm: string[] = [];
    const body: string[] = [];

    for (const c of row.cells) {
      const columnName = c.columnName;
      const value = c.value ?? '';

      const map = this.settings.columnMap[columnName];
      if (map === 'frontmatter') {
        fm.push(`${columnName}: "${value}"`);
      } else if (map === 'body') {
        body.push(`- **${columnName}**: ${value}`);
      }
    }

    const frontmatter = [`---`, ...fm, `modifiedAt: "${row.modifiedAt}"`, `id: ${row.id}`, `---`];
    return [...frontmatter, '', ...body].join('\n');
  }

  private async processRow(row: SmartsheetRow) {
    const fname = `row-${row.id}.md`;
    const fpath = `${this.settings.targetFolder}/${fname}`;
    const existing = this.app.vault.getAbstractFileByPath(fpath) as TFile;

    const newMd = this.formatMk(row);

    if (!existing) {
      await this.app.vault.create(fpath, newMd);
      return;
    }

    const content = await this.app.vault.read(existing);
    const modMatch = content.match(/modifiedAt: "(.+)"/);
    const oldDate = modMatch ? new Date(modMatch[1]) : null;
    const newDate = new Date(row.modifiedAt);
    if (!oldDate || newDate > oldDate) {
      await this.app.vault.modify(existing, newMd);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) || {});
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
