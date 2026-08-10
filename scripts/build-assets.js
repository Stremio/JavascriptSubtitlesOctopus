const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist', 'js');

const assetPaths = {
    workerSource: 'subtitles-octopus-worker.js',
    wasmBinary: 'subtitles-octopus-worker.wasm',
    legacyWorkerSource: 'subtitles-octopus-worker-legacy.js',
    defaultFont: 'default.woff2'
};

function readTextAsset(fileName) {
    return fs.readFileSync(path.join(distDir, fileName), 'utf8');
}

function readBase64Asset(fileName) {
    return fs.readFileSync(path.join(distDir, fileName)).toString('base64');
}

function embedWasmBinary(workerSource, wasmBinary) {
    const prelude = [
        'var Module = typeof Module !== "undefined" ? Module : {};',
        'Module.wasmBinary = (function (base64) {',
        '    var binary = atob(base64);',
        '    var bytes = new Uint8Array(binary.length);',
        '    for (var i = 0; i < binary.length; i++) {',
        '        bytes[i] = binary.charCodeAt(i);',
        '    }',
        '    return bytes;',
        '}(' + JSON.stringify(wasmBinary) + '));',
        ''
    ].join('\n');

    return prelude + workerSource;
}

const missingAssets = Object.values(assetPaths).filter(function (fileName) {
    return !fs.existsSync(path.join(distDir, fileName));
});

if (missingAssets.length > 0) {
    throw new Error(
        'Cannot build embedded assets. Missing files in dist/js: ' +
        missingAssets.join(', ') +
        '. Run make before npm run build:assets.'
    );
}

const wasmBinary = readBase64Asset(assetPaths.wasmBinary);
const assets = {
    workerSource: embedWasmBinary(readTextAsset(assetPaths.workerSource), wasmBinary),
    legacyWorkerSource: readTextAsset(assetPaths.legacyWorkerSource),
    defaultFont: readBase64Asset(assetPaths.defaultFont)
};

const cjsOutput = [
    "'use strict';",
    '',
    'module.exports = ' + JSON.stringify(assets, null, 4) + ';',
    ''
].join('\n');

fs.writeFileSync(path.join(distDir, 'subtitles-octopus-assets.js'), cjsOutput);

console.log('Embedded assets written to dist/js/subtitles-octopus-assets.js');
