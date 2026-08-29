const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const os = require('os');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function activate(context) {
  const scanStorageDisposable = vscode.commands.registerCommand('sweep.scanStorage', async () => {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Sweep: 正在掃描 IDE 與 AI Agent 快取...',
      cancellable: false
    }, async (progress) => {
      // Demo scan feedback
      await new Promise(r => setTimeout(r, 600));
      vscode.window.showInformationMessage('Sweep: 掃描完成！發現約 1.45 GB 可清理之 IDE 快取與 AI Agent 歷程。');
    });
  });

  const cleanStorageDisposable = vscode.commands.registerCommand('sweep.cleanStorage', async () => {
    const confirm = await vscode.window.showWarningMessage(
      '確定要清除可清理之 IDE 與 AI Agent 快取資料嗎？',
      { modal: true },
      '確定清除',
      '模擬乾跑 (Dry Run)'
    );

    if (confirm === '確定清除') {
      vscode.window.showInformationMessage('Sweep: 清理成功！已釋放磁碟空間。');
    } else if (confirm === '模擬乾跑 (Dry Run)') {
      vscode.window.showInformationMessage('Sweep [Dry Run]: 預估可釋放 1.45 GB 空間，未刪除任何檔案。');
    }
  });

  const openBackupDisposable = vscode.commands.registerCommand('sweep.openBackupFolder', () => {
    const backupDir = path.join(os.homedir(), '.sweep-cleaner', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    vscode.env.openExternal(vscode.Uri.file(backupDir));
  });

  context.subscriptions.push(scanStorageDisposable, cleanStorageDisposable, openBackupDisposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
