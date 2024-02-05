#!/usr/bin/env node

'use strict';
// eslint-disable no-console

const { readdirSync } = require('fs');
const { readFile, writeFile } = require('fs/promises');
const { loadAll } = require('js-yaml');

async function convertFile(filename) {
    const input = await readFile(filename, 'utf8');
    let output = [];
    loadAll(input, doc => { output.push(doc); }, {});
    if (output.length === 0) {
        return;
    }
    const data = JSON.stringify(
        output.length > 1 ? output : output[0],
        null, '  ');
    await writeFile(
        filename.replace(/\.yaml$/, '.json'),
        data, { encoding: 'utf8' });
}

const grammarDir = './language/syntaxes/';
const grammarFiles = readdirSync(grammarDir, { encoding: 'utf8' })
    .filter(filename => filename.endsWith('.yaml'))
    .map(filename => convertFile(grammarDir + filename));

Promise.all(grammarFiles).catch(e => {
    console.error(e.toString());
    process.exit(1);
});
