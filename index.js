/**
 * @author Erik Desjardins
 * See LICENSE file in root directory for full license.
 */

'use strict';

var babel = require('babel-core')
var path = require('path');
var importFresh = require('import-fresh');
var fs = require('fs')

var createBinaryImporter = require('binary-imports')
var resolveRc = require('./lib/resolve-rc.js')
var exists = require('./lib/exists.js')
var { getRemainingRequest } = require('loader-utils')

// Rollup seems to have global state, so get a fresh instance for every run...
function getRollupInstance() {
	return importFresh('rollup');
}

function splitRequest(request) {
	var inx = request.lastIndexOf('!');
	if (inx === -1) {
		return {
			loaders: '',
			resource: request
		};
	} else {
		return {
			loaders: request.slice(0, inx + 1),
			resource: request.slice(inx + 1)
		};
	}
}

// copy of Lodash pick
function pick(obj, keys) {
	const newObj = {}
	
	keys.forEach((key) => {
		if (obj[key] !== undefined) newObj[key] = obj[key]
	})

	return newObj
}

function standardizeRollupOptions(options) {
	// from https://rollupjs.org/guide/en#javascript-api
	const standardInputOptions = [
		// core options
		'input', // the only required option
		'external',
		'plugins',
	
		// advanced options
		'onwarn',
		'cache',
	
		// danger zone
		'acorn',
		'acornInjectPlugins',
		'treeshake',
		'context',
		'moduleContext',
		'legacy',
	]

	return pick(options, standardInputOptions)
}

function getExternalBabelOptions() {
	const fileSystem = this.fs ? this.fs : fs;
	const webpackRemainingChain = getRemainingRequest(this).split('!')
	const filename = webpackRemainingChain[webpackRemainingChain.length - 1]
  const babelrcPath = resolveRc(fileSystem, path.dirname(filename));

  if (babelrcPath) {
    this.addDependency(babelrcPath);
	}
	
	return babelrcPath
		? require(babelrcPath)
		: undefined;
}

module.exports = function(source, sourceMap) {
	var callback = this.async();

	var options = this.query || {};
	var addBinaryAsset = options.addBinaryAsset
	var fbaTypes = options.fbaTypes
	var binaryIncludes = options.binaryIncludes
	var storeBinaryImports = createBinaryImporter(fbaTypes, addBinaryAsset)

	if (storeBinaryImports instanceof Error) callback(storeBinaryImports)

	var babelOptions;
	
	if (
		options.babelOptions
		&& typeof options.babelOptions === 'object'
		&& !Array.isArray(options.babelOptions)
	) {
		babelOptions = options.babelOptions;
		
	} else {
		babelOptions = getExternalBabelOptions.call(this) || {}
	}
	// remove non-standard options to prevent Rollup from complaining about extra options
	var rollupOptions = standardizeRollupOptions(options)

	// putting CommonJS plugin after all others to allow any CommonJS export code to be handled by Rollup
var isCommonJs = plugin => plugin.name && plugin.name.includes('commonjs')
	var nonCjsPlugins = (rollupOptions.plugins || []).filter(plugin => !isCommonJs(plugin))
	var cjsPlugins = (rollupOptions.plugins || []).filter(isCommonJs)

	var entryId = this.resourcePath;

	getRollupInstance().rollup(Object.assign({}, rollupOptions, {
		input: entryId,
		plugins: nonCjsPlugins.concat({
			resolveId: (id, importerId) => { 
				if (id === entryId) {
					return entryId;
				} else {
					return new Promise((resolve, reject) => {
						// split apart resource paths because Webpack's this.resolve() can't handle `loader!` prefixes
						var parts = splitRequest(id);
						var importerParts = splitRequest(importerId);

						// resolve the full path of the imported file with Webpack's module loader
						// this will figure out node_modules imports, Webpack aliases, etc.
						this.resolve(path.dirname(importerParts.resource), parts.resource, (err, fullPath) => {
							if (err) {
								reject(err);
							} else {
								// store any binary imports for later plugins
								storeBinaryImports && storeBinaryImports(fullPath)

								// add dependency to Webpack's list of files to watch
								this.addDependency(fullPath)

								resolve(parts.loaders + fullPath);
							}
						});
					});
				}
			},
			load: (id) => {
				if (id === entryId) {
					return { code: source, map: sourceMap };
				}
				return new Promise((resolve, reject) => {
					// load the module with Webpack
					// this will apply all relevant loaders, etc.
					this.loadModule(id, function(err, source, map, module) {
						if (err) {
							reject(err);
							return;
						}
						resolve({ code: source, map: map });
					});
				})
			}
		})
		// allows handling any CommonJS output from Webpack loaders
		.concat(cjsPlugins)
	}))
	.then(function(bundle) {
		return bundle.generate({ format: 'es', sourcemap: true });
	})
	.then(function(result) {
		// apply Babel transform to Bundle directly from output
		// instead of on every .js file thru Webpack Loader
		var babelRes = Object.keys(babelOptions)
			? babel.transform(result.code, babelOptions)
			: result

		callback(null, babelRes.code, babelRes.map);
	}, function(err) {
		callback(err);
	});
};
