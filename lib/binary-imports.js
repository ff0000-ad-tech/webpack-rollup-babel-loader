
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
	function getFbaType(importPath) {
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
 * 	fbaImportStore: Array,
 * 	fbaTypes: fbaType[]
 * }
 * 
 * fbaType: {
 * 	type: 'fbAi' or 'fbAf',
 * 	include: [minimatch patterns],
 * 	exclude: [minimatch patterns]
 * }
 */
const createBinaryImporter = (fbaOptions) => {
	if (!fbaOptions) return null

	var { fbaTypes, fbaImportStore } = fbaOptions

	if (!Array.isArray(fbaImportStore)) {
		return new Error(
			"Must pass array at fbaOptions.fbaImportStore so binary imports are stored for FBA compilation"
		)
	}

	const determineFbaType = createFbaTypeDeterminer(fbaTypes)
	return (importPath) => {
		const chunkType = determineFbaType(importPath)
		const fbaAsset = {
			chunkType,
			path: importPath
		}
		fbaImportStore.push(fbaAsset)
	}
}

module.exports = createBinaryImporter