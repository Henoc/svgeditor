"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {render} from "ejs";
let htmlPretty = require("html");

export function activate(context: vscode.ExtensionContext) {

  let previewUri = vscode.Uri.parse("svgeditor://authority/svgeditor");
  let readResource =
    (filename: string) => fs.readFileSync(path.join(__dirname, "..", "resources", filename), "UTF-8");
  let insertJs = readResource("bundle.js");
  let insertCss = readResource("bundle.css");
  let viewer = readResource("viewer.ejs");

  class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    public editor: vscode.TextEditor | undefined;
    private _onDidChange: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();

    public provideTextDocumentContent(uri: vscode.Uri): string {
      return this.createCssSnippet();
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
      return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
      this._onDidChange.fire(uri);
    }

    private createCssSnippet(): string {
      if (this.editor === undefined) this.editor = vscode.window.activeTextEditor;
      const svg = this.editor.document.getText();
      const js = insertJs;
      const css = insertCss;
      const html = render(viewer, {
        svg: svg,
        js: js,
        css: css
      });
      let logDir = path.join(__dirname, "..", "log");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
      }
      fs.writeFileSync(path.join(__dirname, "..", "log", "log.html"), html);
      return html;
    }
  }

  let disposables: vscode.Disposable[] = [];

  let provider = new TextDocumentContentProvider();
  let registration = vscode.workspace.registerTextDocumentContentProvider("svgeditor", provider);
  disposables.push(registration);

  vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
    if (e.document === vscode.window.activeTextEditor.document) {
      provider.update(previewUri);
    }
  });

  disposables.push(vscode.commands.registerCommand("extension.openSvgEditor", () => {
    return vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two, "SVG Editor").then((success) => undefined, (reason) => {
      vscode.window.showErrorMessage(reason);
    });
  }));

  context.subscriptions.push(...disposables);

  /**
   * Call only by previewer
   */
  vscode.commands.registerCommand("extension.reflectToEditor", (text: string) => {
    provider.editor!.edit(editbuilder => {
      editbuilder.replace(allRange(provider.editor!), htmlPretty.prettyPrint(text, {indent_size: 2}));
    });
  });
}

function allRange(textEditor: vscode.TextEditor): vscode.Range {
  let firstLine = textEditor.document.lineAt(0);
  let lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
  let textRange = new vscode.Range(0,
                                   firstLine.range.start.character,
                                   textEditor.document.lineCount - 1,
                                   lastLine.range.end.character);
  return textRange;
}
