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

function addWasmLoader(workerSource) {
    const prelude = [
        'var Module = typeof Module !== "undefined" ? Module : {};',
        'Module.instantiateWasm = function (imports, receiveInstance) {',
        '    self.addEventListener("message", function onInit(event) {',
        '        var data = event.data;',
        '        if (!data || data.target !== "worker-init") return;',
        '        self.removeEventListener("message", onInit);',
        '        WebAssembly.instantiate(data.wasmModule || data.wasmBinary, imports).then(function (result) {',
        '            receiveInstance(result instanceof WebAssembly.Instance ? result : result.instance);',
        '        }, abort);',
        '    });',
        '    return {};',
        '};',
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

const assets = {
    workerSource: addWasmLoader(readTextAsset(assetPaths.workerSource)),
    wasmBinary: readBase64Asset(assetPaths.wasmBinary),
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
