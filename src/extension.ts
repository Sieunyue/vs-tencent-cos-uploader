// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import * as vscode from 'vscode';
import { uploadToCos } from './utils';

function uploadFromEditor() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  let position = editor.selection.active;

  // 获取当前行的文本
  let line = editor.document.lineAt(position.line).text;

  // 匹配 Markdown 图片标记 ![...](...)
  let regex = /!\[.*?\]\((.*?)\)/g;

  const match = regex.exec(line);

  if (match === null) {
    return;
  }

  let imagePath = match[1];

  // 将相对路径转换为绝对路径
  let absolutePath = path.join(path.dirname(editor.document.uri.fsPath), imagePath);

  // 在控制台输出当前图片文件的绝对路径

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: '正在上传图片',
    cancellable: false
  }, async (progress) => {
    progress.report({ increment: 0 });

    try {
      const res = await uploadToCos(absolutePath);

      let newLine = line.replace(imagePath, 'https://' + res.Location);

      // 构造替换范围
      let start = new vscode.Position(position.line, match.index); // 起始位置，加 2 是因为 ![ 的长度为 2
      let end = new vscode.Position(position.line, match.index + match[0].length); // 结束位置，减 1 是因为 ) 不需要替换
      let range = new vscode.Range(start, end);

      // 执行替换操作
      editor?.edit(editBuilder => {
        editBuilder.replace(range, newLine);

        vscode.window.showInformationMessage('上传图片完成');
      });
    } catch (e: any) {
      vscode.window.showErrorMessage('上传图片出错！');
    } finally {
      progress.report({ increment: 100 });
    }



    progress.report({ increment: 100 });
  });
}

function uploadFromExplorer(uri: any) {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: '正在上传图片',
    cancellable: false
  }, async (progress) => {
    progress.report({ increment: 0 });

    try {
      const res = await uploadToCos(uri.path);
      vscode.env.clipboard.writeText('https://' + res.Location).then(() => {
        vscode.window.showInformationMessage('图片路径已复制到粘贴板');
      }, (error) => {
        vscode.window.showErrorMessage('复制到粘贴板错误！：' + error);
      });
    } catch (e: any) {
      vscode.window.showErrorMessage('上传图片出错！');
    } finally {
      progress.report({ increment: 100 });
    }

  });
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('tencent-cos-uploader.upload', (uri) => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    if (path.extname(uri.path) === '.md') {
      uploadFromEditor();
    } else {
      uploadFromExplorer(uri);
    }

  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
