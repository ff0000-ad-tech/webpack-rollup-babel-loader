var path = require('path')
var { createFilter } = require('rollup-pluginutils')

const createTypeIdent = (fbaType) => {
	const { include, exclude, type } = fbaType
	const filter = createFilter(include, exclude)
	return (importPath) => {
		return filter(importPath) ? type : null
	}
}

const createFbaTypeDeterminer = (fbaTypes) => {
	const typeIdents = fbaTypes.map(createTypeIdent)
	return function getFbaType(importPath) {
		for (const ident of typeIdents) {
			const type = ident(importPath)
			if (type) return type 
		}
		return null
	}
}

/**
 * Creates a function for storing binary imports (like images/fonts)
 * found by Rollup that Webpack loses track of
 * 
 * @param {Objects} fbaOptions 
 * 
 * fbaOptions: {
 * 	fbaTypes: fbaType[] // required
 *  deployManager: ff0000 Ad Manager // required
 * }
 * 
 * fbaType: {
 * 	type: 'fbAi' or 'fbAf',
 * 	include: [minimatch patterns],
 * 	exclude: [minimatch patterns]
 * }
 */
const createBinaryImporter = (fbaOptions, deployManager) => {
	if (!fbaOptions) return null

	var { fbaTypes } = fbaOptions

	const determineFbaType = createFbaTypeDeterminer(fbaTypes)
	return (importPath, importerPath) => {
		const importContext = path.dirname(importerPath)
		const absImportPath = path.resolve(importContext, importPath)
		const chunkType = determineFbaType(absImportPath)
		if (!chunkType) return

		const fbaAsset = {
			chunkType,
			path: absImportPath
		}

		// store binary asset for later
		deployManager.payload.addBinaryAsset(fbaAsset)
	}
}

module.exports = createBinaryImporter