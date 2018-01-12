import path from 'path';
import fs from 'fs';
import test from 'ava';
import webpack from 'webpack';
import MemoryFS from 'memory-fs';
import commonjs from 'rollup-plugin-commonjs';
import { verifyNoES6, writeBabelrc } from './utils';

function normalize(string) {
	return string
		.replace(/(\r\n|\r|\n)/g, '\n')
		.trim();
}

function setupEnv(entry, options) {
	const entryPath = path.join(__dirname, 'src', 'fixtures', entry);
	const compiler = webpack({
		entry: entryPath,
		bail: true,
		output: {
			path: '/',
			filename: 'bundle.js'
		},
		devtool: 'source-map',
		module: {
			rules: [{
				test: entryPath,
				use: [{
					loader: path.join(__dirname, '../index.js'),
					options,
				}]
			}],
		},
	});

	const mockFs = new MemoryFS();

	compiler.outputFileSystem = mockFs;

	return {
		mockFs,
		compiler,
	}
}

async function fixture(t, entry, options) {
	const { mockFs, compiler } = setupEnv(entry, options); 	

	await new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			err ? reject(err) : resolve(stats);
		});
	});

	/* 
	// uncomment to update expected files 
	const bundle = mockFs.readFileSync('/bundle.js', 'utf8');
	fs.writeFileSync(path.join(__dirname, 'src', 'expected', entry), bundle.replace(/\r/g, ''));
	const sourcemap = mockFs.readFileSync('/bundle.js.map', 'utf8');
	fs.writeFileSync(path.join(__dirname, 'src', 'expected', `${entry}.map`), sourcemap.replace(/\\r/g, ''));
	 */

	t.is(
		normalize(mockFs.readFileSync('/bundle.js', 'utf8')),
		normalize(fs.readFileSync(path.join(__dirname, 'src', 'expected', entry), 'utf8')),
	);

	t.is(
		normalize(mockFs.readFileSync('/bundle.js.map', 'utf8')),
		normalize(fs.readFileSync(path.join(__dirname, 'src', 'expected', `${entry}.map`), 'utf8')),
	);
}

test('simple', fixture, 'simple.js');

test('plugins option', fixture, 'fileLoader.js', { plugins: [commonjs({ extensions: ['.js', '.jpg'] })] });

test('external option', fixture, 'external.js', { external: [path.join(__dirname, 'src', 'b.js')] });

test('transpiles ES6 to ES5 w/ Babel settings', async t => {
	const { mockFs, compiler } = setupEnv('es6_file.js', {
		babelOptions: {
			presets: ['env']
		}
	})

	await new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			err ? reject(err) : resolve(stats);
		});
	});

	const transpiledSrc = mockFs.readFileSync('/bundle.js', 'utf8')
	verifyNoES6(t, transpiledSrc);
})

test.after("Reads importing package's .babelrc if no babelOptions", async t => {
	const { mockFs, compiler } = setupEnv('es6_file.js');
	const babelPath = path.resolve(__dirname, '.babelrc') 

	fs.writeFileSync(babelPath, `
	{
		"presets": ["env"]
	}	
	`)

	await new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			err ? reject(err) : resolve(stats);
		});
	});

	fs.unlinkSync(babelPath)

	const transpiledSrc = mockFs.readFileSync('/bundle.js', 'utf8')
	verifyNoES6(t, transpiledSrc);
})