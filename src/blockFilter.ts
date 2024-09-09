import { readdirSync } from "fs";
import { basename, extname, resolve } from "path";

export const removeExt = (filename: string) => filename.slice(0, -extname(filename).length);

export const filterGrcBlocks = (filename: string) => filename.endsWith('.block.yml');
export function mapGrcBlocks(moduleName: string, extension: string = '.block.yml') {
    return (filename: string) => basename(filename).slice(moduleName.length + 1, -extension.length);
}
export function getGrcBlocks(cwd: string, moduleName: string, extension: string = '.block.yml') {
    return readdirSync(resolve(cwd, 'grc'))
        .filter(filename => filename.endsWith(extension))
        .map(mapGrcBlocks(moduleName, extension));
}

export const filterXmlBlocks = (filename: string) => extname(filename) === '.xml';
export const getXmlBlocks = (cwd: string, moduleName: string) => getGrcBlocks(cwd, moduleName, '.xml');

export const filterCppBlocks = (filename: string) => extname(filename) === '.h' && basename(filename) !== 'api.h';
export const mapCppBlocks = removeExt;
export function getCppBlocks(cwd: string, moduleName: string) {
    return readdirSync(resolve(cwd, 'include', 'gnuradio', moduleName))
        .filter(filterCppBlocks)
        .map(mapCppBlocks);
}

export const filterPyBlocks = (filename: string) =>
    extname(filename) === '.py' && basename(filename) !== '__init__.py' && !filterBlockTests(filename);
export const mapPyBlocks = removeExt;
export function getPyBlocks(cwd: string, moduleName: string) {
    return readdirSync(resolve(cwd, 'python', moduleName))
        .filter(filterPyBlocks)
        .map(mapPyBlocks);
}

export function getAllBlocks(cwd: string, moduleName: string) {
    return new Set([
        ...getGrcBlocks(cwd, moduleName),
        ...getCppBlocks(cwd, moduleName),
        ...getPyBlocks(cwd, moduleName),
    ]);
}

export const filterCppImplFiles = (filename: string) =>
    ['.cc', '.cpp', '.cxx'].includes(extname(filename)) && !filterBlockTests(filename);
export const mapCppImplFiles = (filename: string) => {
    const fname = removeExt(filename);
    return fname.endsWith('_impl') ? fname.slice(0, -5) : fname;
};
export function getCppImplFiles(cwd: string) {
    return readdirSync(resolve(cwd, 'lib'))
        .filter(filterCppImplFiles)
        .map(mapCppImplFiles);
}

export const filterBlockTests = (filename: string) =>
    basename(filename).startsWith('qa_') || basename(filename).startsWith('test_');

export function filteredMapBlockFile(blockName: string, moduleName: string) {
    if (filterGrcBlocks(blockName)) {
        return mapGrcBlocks(moduleName)(blockName);
    }
    const ext = extname(blockName);
    if (ext === '.xml') {
        return mapGrcBlocks(moduleName, '.xml')(blockName);
    }
    const block = blockName.replace(/^qa_|^test_/, '');
    if (['.h', '.cc', '.cpp', '.cxx'].includes(ext)) {
        return mapCppImplFiles(block);
    } else if (ext === '.py') {
        return mapPyBlocks(block);
    }
    return undefined;
}
