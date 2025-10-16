/**
 * Standalone unit test runner that doesn't require VSCode
 * Runs pure unit tests (not integration tests)
 */

import Mocha from 'mocha';
import * as path from 'path';
import { glob } from 'glob';

async function main() {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 10000
	});

	const testsRoot = path.resolve(__dirname, './suite');

	try {
		// Find all test files
		const files = await glob('**/**.test.js', {
			cwd: testsRoot,
			absolute: true
		});

		console.log(`Found ${files.length} test files`);

		// Filter to only pure unit tests (no vscode dependency)
		const unitTestFiles = files.filter(f => {
			const basename = path.basename(f);
			// Only include tests that don't require vscode
			return basename === 'storageManager.test.js' || basename === 'gitIntegration.test.js';
		});

		console.log(`Running ${unitTestFiles.length} unit tests (excluding integration tests)`);

		// Add files to the test suite
		unitTestFiles.forEach(f => {
			console.log(`Adding test: ${path.basename(f)}`);
			mocha.addFile(f);
		});

		// Run the mocha test
		return new Promise<void>((resolve, reject) => {
			try {
				mocha.run(failures => {
					if (failures > 0) {
						reject(new Error(`${failures} tests failed.`));
					} else {
						resolve();
					}
				});
			} catch (err) {
				console.error(err);
				reject(err);
			}
		});
	} catch (err) {
		console.error('Failed to run tests:', err);
		throw err;
	}
}

main()
	.then(() => {
		console.log('\nAll tests passed!');
		process.exit(0);
	})
	.catch(err => {
		console.error('\nTests failed:', err.message);
		process.exit(1);
	});
