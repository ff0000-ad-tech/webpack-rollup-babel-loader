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
 * @param {fbaType[]} fbaTypes (required) 
 * fbaType: {
 * 	type: 'fbAi' or 'fbAf',
 * 	include: [minimatch patterns],
 * 	exclude: [minimatch patterns]
 * }
 * @param deployManager: FF0000 Ad Deploy Manager // required
 * 
 */
const createBinaryImporter = (fbaTypes, addBinaryAsset) => {
	if (!fbaTypes) return null
	const determineFbaType = createFbaTypeDeterminer(fbaTypes)
	return (absImportPath) => {
		const chunkType = determineFbaType(absImportPath)
		if (!chunkType) return

		const fbaAsset = {
			chunkType,
			path: absImportPath
		}

		// store binary asset for later
		addBinaryAsset(fbaAsset)
	}
}

module.exports = createBinaryImporter