exports.verifyNoES6 = function(t, code) {
	// doesn't use "const" keyword
	t.false(/const\s+\w+\s*=/.test(code))
	// doesn't use arrow funcs
	t.false(/\(\s*\)\s*=\s*>/.test(code))
}

exports.writeBabelrc = function(mockFs) {
	mockFs.writeFileSync('/.babelrc', `
		{
			presets: ['env']
		}
	`)
}