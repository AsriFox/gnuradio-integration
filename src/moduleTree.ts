import {
    window, workspace, Uri, FileType, EventEmitter,
    TreeDataProvider, TreeView, TreeItem, TreeItemCollapsibleState,
} from 'vscode';
import * as blocks from './blockFilter';
import { extname } from 'path';

export class GNURadioModuleTreeDataProvider implements TreeDataProvider<TreeItem> {
    public readonly treeView: TreeView<TreeItem>;

    constructor(
        private cwd: string,
        private moduleName: string,
    ) {
        this.treeView = window.createTreeView(
            'gnuradioModule', {
            treeDataProvider: this,
            showCollapseAll: true,
            canSelectMany: false,
        });
    }

    public dispose() {
        this.treeView.dispose();
    }

    private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    public refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem) {
        return element;
    }

    async getChildren(element?: TreeItem) {
        if (element) {
            if (!element.label) {
                element.collapsibleState = TreeItemCollapsibleState.None;
                return [];
            }
            return await getBlockFilesTree(element.label.toString(), Uri.file(this.cwd), this.moduleName);
        } else {
            const addTreeItem = (name: string) => {
                if (!tree.get(name)) {
                    let item = new TreeItem(name, TreeItemCollapsibleState.Collapsed);
                    item.contextValue = 'block';
                    tree.set(name, item);
                }
            };
            let tree = new Map<string, TreeItem>();
            blocks.getCppBlocks(this.cwd, this.moduleName).forEach(name => {
                addTreeItem(name);
                tree.get(name)!.contextValue += '.cpp';
            });
            blocks.getXmlBlocks(this.cwd, this.moduleName).forEach(name => {
                addTreeItem(name);
                tree.get(name)!.contextValue += '.xml';
            });
            blocks.getGrcBlocks(this.cwd, this.moduleName).forEach(addTreeItem);
            blocks.getPyBlocks(this.cwd, this.moduleName).forEach(addTreeItem);
            return Array.from(tree.entries())
                .sort(([a, _a], [b, _b]) => a.localeCompare(b))
                .map(([_name, item]) => item);
        }
    }
}

export async function getBlockFilesTree(block: string, baseUri: Uri, moduleName: string) {
    const readdir = (...pathSegments: string[]) =>
        workspace.fs.readDirectory(Uri.joinPath(baseUri, ...pathSegments));

    function mapBlockToTreeItem(label: string, pathSegments: string[]) {
        return ([name, fileType]: [string, FileType]) => {
            if (fileType !== FileType.File) {
                // Sanity check
                throw Error('Expected a file, got something else');
            }
            let item = new TreeItem(Uri.joinPath(baseUri, ...pathSegments, name));
            item.description = true;
            item.label = label;
            item.command = {
                title: 'open',
                command: 'vscode.open',
                arguments: [item.resourceUri!]
            };
            return item;
        };
    }

    const grcFiles = (await readdir('grc'))
        .filter((value) =>
            RegExp(`^${moduleName}_${block}\.(block\.yml|xml)$`).test(value[0]))
        .map(mapBlockToTreeItem('Block definition', ['grc']));

    const cppFiles = (await readdir('include', 'gnuradio', moduleName))
        .filter((value) =>
            blocks.filterCppBlocks(value[0]) &&
            blocks.removeExt(value[0]) === block)
        .map(mapBlockToTreeItem('Public header', ['include', 'gnuradio', moduleName]));

    const pyDir = await readdir('python', moduleName);
    const pyFiles = pyDir
        .filter((value) =>
            blocks.filterPyBlocks(value[0]) && blocks.removeExt(value[0]) === block)
        .map(mapBlockToTreeItem('Implementation', ['python', moduleName]));
    const pyTestFiles = pyDir
        .filter((value) =>
            RegExp(`^(qa_|test_)${block}\.py$`).test(value[0]))
        .map(mapBlockToTreeItem('Python Tests', ['python', moduleName]));

    const cppImplDir = await readdir('lib');
    const cppImplFiles = cppImplDir
        .filter((value) =>
            (blocks.filterCppImplFiles(value[0]) || extname(value[0]) === '.h') &&
            blocks.removeExt(value[0]) === block)
        .map((value) => {
            let item = mapBlockToTreeItem('Implementation', ['lib'])(value);
            item.label += extname(value[0]) === '.h' ? ' header' : ' source';
            return item;
        });
    const cppTestFiles = cppImplDir
        .filter((value) =>
            RegExp(`^(qa_|test_)${block}\.(cc|cpp|cxx)$`).test(value[0]))
        .map(mapBlockToTreeItem('C++ Tests', ['lib']));

    return [...grcFiles, ...pyFiles, ...cppFiles, ...cppImplFiles, ...pyTestFiles, ...cppTestFiles];
}
