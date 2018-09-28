import { diffProcedure, newUntitled, normalizeUrl, intervalToRange } from "../../src/node/extension";
import { diffChars } from "diff";
import { TextEditorEdit, Position, Range, Selection, EndOfLine, ViewColumn, Uri } from "vscode";
import * as assert from 'assert';
import { join, isAbsolute } from "path";

type Operation = {operation: "replace"|"insert"|"delete", location: Position | Range | Selection, value?: string};

class TextEditorEditMock implements TextEditorEdit {
    log: Operation[] = [];
    replace(location: Position | Range | Selection, value: string): void {
        this.log.push({operation: "replace", location, value});
    }
    insert(location: Position, value: string): void {
        this.log.push({operation: "insert", location, value});
    }
    delete(location: Range | Selection): void {
        this.log.push({operation: "delete", location});
    }
    setEndOfLine(endOfLine: EndOfLine): void {
        throw new Error("Method not implemented.");
    }
}

describe("extension", () => {

    describe("diffProcesure", () => {
        async function doDiffProcesure() {
            const diffs = diffChars("abcdefghi", "abqdefghi");
            const mock = new TextEditorEditMock();
            diffProcedure(diffs, mock);
            assert.deepStrictEqual(mock.log, [
                {operation: "delete", location: new Range(0, 2, 0, 3)},
                {operation: "insert", location: new Position(0, 3), value: "q"}
            ]);

            const textEditor = await newUntitled(ViewColumn.One, "abcdefghi");
            await textEditor.edit(editBuilder => diffProcedure(diffs, editBuilder));
            assert.strictEqual(textEditor.document.getText(), "abqdefghi");
        }

        /**
         * Raw `diffChars` results:
```
[ { count: 5, value: '<svg ' },
{ count: 25,
    added: undefined,
    removed: true,
    value: 'width="100" height="100" ' },
{ count: 77,
    value:
    'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' },
{ count: 25,
    added: true,
    removed: undefined,
    value: ' width="100" height="100"' },
{ count: 68,
    value:
    '>\n    <circle stroke-width="3" fill="red" stroke="black" r="40" cx="' },
{ count: 2, added: undefined, removed: true, value: '50' },
{ count: 2, added: true, removed: undefined, value: '84' },
{ count: 6, value: '" cy="' },
{ count: 1, added: true, removed: undefined, value: '2' },
{ count: 1, value: '5' },
{ count: 1, added: undefined, removed: true, value: '0' },
{ count: 10, value: '"/>\n</svg>' } ]
```
        */
        async function doDiffProcesure2() {
            const before = 
`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <circle stroke-width="3" fill="red" stroke="black" r="40" cx="50" cy="50"/>
</svg>`;
        const after =
`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">
    <circle stroke-width="3" fill="red" stroke="black" r="40" cx="84" cy="25"/>
</svg>`;
            const diffs = diffChars(before, after);
            const mock = new TextEditorEditMock();
            diffProcedure(diffs, mock);
            assert.deepStrictEqual(mock.log, <Operation[]>[
                {operation: "delete", location: new Range(0, 5, 0, 30)},
                {operation: "insert", location: new Position(0, 107), value: ` width="100" height="100"`},
                {operation: "delete", location: new Range(1, 66, 1, 68)},
                {operation: "insert", location: new Position(1, 68), value: "84"},
                {operation: "insert", location: new Position(1, 74), value: "2"},
                {operation: "delete", location: new Range(1, 75, 1, 76)}
            ]);

            const textEditor = await newUntitled(ViewColumn.One, before);
            await textEditor.edit(editBuilder => diffProcedure(diffs, editBuilder));
            assert.strictEqual(textEditor.document.getText(), after);
        }

        before(async () => {
            await newUntitled(ViewColumn.One, "");
        });

        it("basic", (done) => {
            doDiffProcesure().then(done).catch(done);
        });

        it("complex", (done) => {
            doDiffProcesure2().then(done).catch(done);
        });
        
            
    });

    describe("normalizeUrl", () => {
        it("relative path", () => {
            if (process.platform === "win32") {
                assert.strictEqual(
                    normalizeUrl("foo/bar", `file:///c%3A/Users/henoc/sample.svg`),
                    "vscode-resource:/c%3A/Users/henoc/foo/bar"
                );
            } else {
                assert.strictEqual(
                    normalizeUrl("foo/bar", `file:///home/henoc/sample.svg`),
                    "vscode-resource:/home/henoc/foo/bar"
                )
            }
        });

        it("absolute path", () => {
            if (process.platform === "win32") {
                assert.strictEqual(
                    normalizeUrl("C:\\foo\\bar", `file:///c%3A/Users/henoc/sample.svg`),
                    "vscode-resource:/c%3A/foo/bar"
                );
            } else {
                assert.strictEqual(
                    normalizeUrl("/foo/bar", `file:///home/henoc/sample.svg`),
                    "vscode-resource:/foo/bar"
                );
            }
        });

        it("absolute url", () => {
            if (process.platform === "win32") {
                assert.strictEqual(
                    normalizeUrl("https://google.co.jp", `file:///c%3A/Users/henoc`),
                    "https://google.co.jp/"
                );
            } else {
                assert.strictEqual(
                    normalizeUrl("https://google.co.jp", `file:///home/henoc/sample.svg`),
                    "https://google.co.jp/"
                );
            }
        })
    });

    it("intervalToRange", () => {
        const text = 
`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <circle stroke-width="3" fill="red" stroke="black" r="40" cx="50" cy="50"/>
</svg>`;
        assert.deepStrictEqual(intervalToRange(text, {start: 17, end: 148}), new Range(0, 17, 1, 39));
    });
});
