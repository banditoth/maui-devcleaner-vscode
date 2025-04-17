// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const xml2js = require('xml2js');
const parseString = util.promisify(xml2js.parseString);

// Helper function to get folder size
function getFolderSize(folderPath) {
	let size = 0;
	if (fs.existsSync(folderPath)) {
		const files = fs.readdirSync(folderPath);
		for (const file of files) {
			const filePath = path.join(folderPath, file);
			const stat = fs.statSync(filePath);
			if (stat.isFile()) {
				size += stat.size;
			} else if (stat.isDirectory()) {
				size += getFolderSize(filePath);
			}
		}
	}
	return size;
}

// Helper function to format bytes
function formatBytes(bytes) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to recursively delete a folder
async function deleteFolderRecursive(folderPath) {
	if (fs.existsSync(folderPath)) {
		const isWindows = process.platform === 'win32';
		const command = isWindows
			? `rmdir /s /q "${folderPath}"`
			: `rm -rf "${folderPath}"`;
		
		await execAsync(command);
	}
}

// Helper function to keep only the latest version
function keepLatestVersion(versions) {
	if (versions.length <= 1) return [];
	
	// Sort versions in descending order
	const sortedVersions = [...versions].sort((a, b) => {
		const versionA = a.label.split(' ')[0];
		const versionB = b.label.split(' ')[0];
		return versionB.localeCompare(versionA, undefined, { numeric: true });
	});
	
	// Return all versions except the latest
	return sortedVersions.slice(1);
}

// Type definitions
/**
 * @typedef {Object} VersionItem
 * @property {string} label
 * @property {string} description
 * @property {string} path
 * @property {boolean} isVersion
 */

/**
 * @typedef {Object} PackItem
 * @property {string} label
 * @property {string} description
 * @property {string} path
 * @property {boolean} isPack
 * @property {VersionItem[]} versions
 */

/**
 * @typedef {PackItem | VersionItem} QuickPickItem
 */

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('MAUI Cleaner extension is now active!');
	console.log('Extension context:', context.extension.id);

	// Helper function to get Android SDK path
	function getAndroidSdkPath() {
		// First check the extension setting
		const config = vscode.workspace.getConfiguration('mauiCleaner');
		const customPath = config.get('androidSdkPath');
		if (customPath) {
			return customPath;
		}

		// Finally, use MAUI's default paths
		const isWindows = process.platform === 'win32';
		if (isWindows) {
			return path.join(process.env.LOCALAPPDATA, 'Android', 'android-sdk');
		} else {
			return path.join(process.env.HOME, 'Library', 'Developer', 'Xamarin', 'android-sdk-macosx');
		}
	}

	// Clean bin/obj folders command
	const cleanBinObj = vscode.commands.registerCommand('banditoth.VSCode-MAUI-DevCleaner.cleanBinObj', async () => {
		console.log('cleanBinObj command executed');
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder is open');
			return;
		}

		let deletedCount = 0;
		let totalSize = 0;
		for (const folder of workspaceFolders) {
			const binPath = path.join(folder.uri.fsPath, 'bin');
			const objPath = path.join(folder.uri.fsPath, 'obj');

			try {
				if (fs.existsSync(binPath)) {
					const size = getFolderSize(binPath);
					await deleteFolderRecursive(binPath);
					deletedCount++;
					totalSize += size;
				}
				if (fs.existsSync(objPath)) {
					const size = getFolderSize(objPath);
					await deleteFolderRecursive(objPath);
					deletedCount++;
					totalSize += size;
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Error cleaning ${folder.name}: ${error.message}`);
			}
		}

		vscode.window.showInformationMessage(`Cleaned ${deletedCount} bin/obj folders, freeing ${formatBytes(totalSize)}`);
	});

	// Clean NuGet cache command
	const cleanNugetCache = vscode.commands.registerCommand('banditoth.VSCode-MAUI-DevCleaner.cleanNugetCache', async () => {
		console.log('cleanNugetCache command executed');
		try {
			const isWindows = process.platform === 'win32';
			const command = isWindows 
				? 'dotnet nuget locals all --clear'
				: 'dotnet nuget locals all --clear';

			const { stdout, stderr } = await execAsync(command);
			if (stderr) {
				throw new Error(stderr);
			}

			// Get the size of NuGet cache before clearing
			const nugetCachePath = isWindows
				? path.join(process.env.USERPROFILE, '.nuget', 'packages')
				: path.join(process.env.HOME, '.nuget', 'packages');

			let totalSize = 0;
			if (fs.existsSync(nugetCachePath)) {
				totalSize = getFolderSize(nugetCachePath);
			}

			vscode.window.showInformationMessage(`NuGet cache cleared successfully, freeing ${formatBytes(totalSize)}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Error clearing NuGet cache: ${error.message}`);
		}
	});

	// Clean iOS Device Support command (macOS only)
	const cleanIosDeviceSupport = vscode.commands.registerCommand('banditoth.VSCode-MAUI-DevCleaner.cleanIosDeviceSupport', async () => {
		console.log('cleanIosDeviceSupport command executed');
		if (process.platform !== 'darwin') {
			vscode.window.showInformationMessage('This command is only available on macOS');
			return;
		}

		try {
			const deviceSupportPath = path.join(process.env.HOME, 'Library/Developer/Xcode/iOS DeviceSupport');
			if (!fs.existsSync(deviceSupportPath)) {
				vscode.window.showInformationMessage('No iOS Device Support folders found');
				return;
			}

			const deviceSupportFolders = fs.readdirSync(deviceSupportPath)
				.filter(folder => fs.statSync(path.join(deviceSupportPath, folder)).isDirectory());

			if (deviceSupportFolders.length === 0) {
				vscode.window.showInformationMessage('No iOS Device Support folders found');
				return;
			}

			const items = deviceSupportFolders.map(folder => {
				const folderPath = path.join(deviceSupportPath, folder);
				const size = getFolderSize(folderPath);
				return {
					label: folder,
					description: `Size: ${formatBytes(size)}`,
					path: folderPath
				};
			});

			// Sort by size
			items.sort((a, b) => {
				const sizeA = parseInt(a.description.split(': ')[1]);
				const sizeB = parseInt(b.description.split(': ')[1]);
				return sizeB - sizeA;
			});

			const selectedFolders = await vscode.window.showQuickPick(
				items,
				{
					canPickMany: true,
					placeHolder: 'Select iOS Device Support folders to remove'
				}
			);

			if (!selectedFolders || selectedFolders.length === 0) return;

			let removedCount = 0;
			let totalSize = 0;
			for (const folder of selectedFolders) {
				try {
					const size = getFolderSize(folder.path);
					await deleteFolderRecursive(folder.path);
					removedCount++;
					totalSize += size;
				} catch (error) {
					vscode.window.showErrorMessage(`Error removing ${folder.label}: ${error.message}`);
				}
			}

			vscode.window.showInformationMessage(`Removed ${removedCount} iOS Device Support folders, freeing ${formatBytes(totalSize)}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Error cleaning iOS Device Support: ${error.message}`);
		}
	});

	// Clean Android SDK Components command
	const cleanAndroidSdk = vscode.commands.registerCommand('banditoth.VSCode-MAUI-DevCleaner.cleanAndroidSdk', async () => {
		console.log('cleanAndroidSdk command executed');
		try {
			const sdkRoot = getAndroidSdkPath();
			if (!fs.existsSync(sdkRoot)) {
				vscode.window.showErrorMessage(
					`Android SDK path not found at: ${sdkRoot}\n` +
					'Please set the path in extension settings (mauiCleaner.androidSdkPath) or ensure the default path exists.'
				);
				return;
			}

			const components = [
				{ name: 'System Images', path: 'system-images' },
				{ name: 'Platforms', path: 'platforms' },
				{ name: 'Build Tools', path: 'build-tools' },
				{ name: 'Command-line Tools', path: 'cmdline-tools' }
			];

			const selectedComponent = await vscode.window.showQuickPick(
				components.map(c => {
					const componentPath = path.join(sdkRoot, c.path);
					const size = fs.existsSync(componentPath) ? getFolderSize(componentPath) : 0;
					return {
						label: c.name,
						description: `Size: ${formatBytes(size)}`,
						path: c.path
					};
				}),
				{ placeHolder: 'Select Android SDK component to clean' }
			);

			if (!selectedComponent) return;

			const component = components.find(c => c.name === selectedComponent.label);
			const componentPath = path.join(sdkRoot, component.path);

			if (!fs.existsSync(componentPath)) {
				vscode.window.showInformationMessage(`No ${component.name} found`);
				return;
			}

			const versions = fs.readdirSync(componentPath)
				.filter(item => fs.statSync(path.join(componentPath, item)).isDirectory())
				.map(version => {
					const versionPath = path.join(componentPath, version);
					const size = getFolderSize(versionPath);
					return {
						label: version,
						description: `Size: ${formatBytes(size)}`,
						path: versionPath
					};
				});

			if (versions.length === 0) {
				vscode.window.showInformationMessage(`No ${component.name} versions found`);
				return;
			}

			// Sort by size
			versions.sort((a, b) => {
				const sizeA = parseInt(a.description.split(': ')[1]);
				const sizeB = parseInt(b.description.split(': ')[1]);
				return sizeB - sizeA;
			});

			const selectedVersions = await vscode.window.showQuickPick(
				versions,
				{
					canPickMany: true,
					placeHolder: `Select ${component.name} versions to remove`
				}
			);

			if (!selectedVersions || selectedVersions.length === 0) return;

			let removedCount = 0;
			let totalSize = 0;
			for (const version of selectedVersions) {
				try {
					const size = getFolderSize(version.path);
					await deleteFolderRecursive(version.path);
					removedCount++;
					totalSize += size;
				} catch (error) {
					vscode.window.showErrorMessage(`Error removing version ${version.label}: ${error.message}`);
				}
			}

			vscode.window.showInformationMessage(`Removed ${removedCount} ${component.name} versions, freeing ${formatBytes(totalSize)}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Error cleaning Android SDK components: ${error.message}`);
		}
	});

	// Clean iOS Simulator Runtime command (macOS only)
	const cleanIosSimulatorRuntime = vscode.commands.registerCommand('banditoth.VSCode-MAUI-DevCleaner.cleanIosSimulatorRuntime', async () => {
		console.log('cleanIosSimulatorRuntime command executed');
		if (process.platform !== 'darwin') {
			vscode.window.showInformationMessage('This command is only available on macOS');
			return;
		}

		try {
			const runtimePath = '/System/Library/AssetsV2/com_apple_MobileAsset_iOSSimulatorRuntime';
			const xmlPath = path.join(runtimePath, 'com_apple_MobileAsset_iOSSimulatorRuntime.xml');

			if (!fs.existsSync(xmlPath)) {
				vscode.window.showErrorMessage('iOS Simulator Runtime XML file not found');
				return;
			}

			// Read and parse the XML file
			const xmlContent = fs.readFileSync(xmlPath, 'utf8');
			const result = await parseString(xmlContent);
			
			// Get all asset folders
			const assetFolders = fs.readdirSync(runtimePath)
				.filter(item => item.endsWith('.asset'))
				.map(folder => {
					const folderPath = path.join(runtimePath, folder);
					const size = getFolderSize(folderPath);
					return {
						name: folder,
						path: folderPath,
						size
					};
				});

			if (assetFolders.length === 0) {
				vscode.window.showInformationMessage('No iOS Simulator Runtime assets found');
				return;
			}

			// Get currently used runtimes from XML
			const usedRuntimes = new Set();
			if (result.assets && result.assets.asset) {
				result.assets.asset.forEach(asset => {
					if (asset.$.state === 'installed') {
						usedRuntimes.add(asset.$.assetId);
					}
				});
			}

			// Prepare items for selection
			const items = assetFolders.map(folder => {
				const isUsed = usedRuntimes.has(folder.name.replace('.asset', ''));
				return {
					label: folder.name,
					description: isUsed ? 'Currently in use' : 'Not in use',
					detail: `Size: ${formatBytes(folder.size)}`,
					path: folder.path,
					isUsed
				};
			});

			// Sort by usage status and size
			items.sort((a, b) => {
				if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
				const sizeA = parseInt(a.detail.split(': ')[1]);
				const sizeB = parseInt(b.detail.split(': ')[1]);
				return sizeB - sizeA;
			});

			const selectedItems = await vscode.window.showQuickPick(
				items,
				{
					canPickMany: true,
					placeHolder: 'Select iOS Simulator Runtime assets to remove',
					ignoreFocusOut: true
				}
			);

			if (!selectedItems || selectedItems.length === 0) return;

			// Warn about removing in-use runtimes
			const inUseItems = selectedItems.filter(item => item.isUsed);
			if (inUseItems.length > 0) {
				const confirm = await vscode.window.showWarningMessage(
					`You are about to remove ${inUseItems.length} in-use runtime(s). This might affect your ability to run iOS simulators. Continue?`,
					{ modal: true },
					'Yes',
					'No'
				);
				if (confirm !== 'Yes') return;
			}

			let removedCount = 0;
			let totalSize = 0;
			for (const item of selectedItems) {
				try {
					const size = getFolderSize(item.path);
					await deleteFolderRecursive(item.path);
					removedCount++;
					totalSize += size;
				} catch (error) {
					vscode.window.showErrorMessage(`Error removing ${item.label}: ${error.message}`);
				}
			}

			vscode.window.showInformationMessage(
				`Removed ${removedCount} iOS Simulator Runtime assets, freeing ${formatBytes(totalSize)}`
			);
		} catch (error) {
			vscode.window.showErrorMessage(`Error cleaning iOS Simulator Runtime: ${error.message}`);
		}
	});

	// Clean .NET Packs command
	const cleanDotnetPacks = vscode.commands.registerCommand('banditoth.VSCode-MAUI-DevCleaner.cleanDotnetPacks', async () => {
		console.log('cleanDotnetPacks command executed');
		try {
			const isWindows = process.platform === 'win32';
			const packsPath = isWindows 
				? path.join(process.env.ProgramFiles, 'dotnet', 'packs')
				: '/usr/local/share/dotnet/packs';

			if (!fs.existsSync(packsPath)) {
				vscode.window.showErrorMessage(`.NET packs directory not found at: ${packsPath}`);
				return;
			}

			// Get all pack folders
			const packFolders = fs.readdirSync(packsPath)
				.filter(item => fs.statSync(path.join(packsPath, item)).isDirectory());

			if (packFolders.length === 0) {
				vscode.window.showInformationMessage('No .NET packs found');
				return;
			}

			// Create hierarchical items
			/** @type {PackItem[]} */
			const items = [];
			for (const packFolder of packFolders) {
				const packPath = path.join(packsPath, packFolder);
				const versions = fs.readdirSync(packPath)
					.filter(item => fs.statSync(path.join(packPath, item)).isDirectory());

				// Add pack folder as a parent item
				const packSize = getFolderSize(packPath);
				items.push({
					label: packFolder,
					description: `Size: ${formatBytes(packSize)}`,
					path: packPath,
					isPack: true,
					versions: versions.map(version => {
						const versionPath = path.join(packPath, version);
						const versionSize = getFolderSize(versionPath);
						return {
							label: `  ${version}`,
							description: `Size: ${formatBytes(versionSize)}`,
							path: versionPath,
							isVersion: true
						};
					})
				});
			}

			// Sort by size
			items.sort((a, b) => {
				const sizeA = parseInt(a.description.split(': ')[1]);
				const sizeB = parseInt(b.description.split(': ')[1]);
				return sizeB - sizeA;
			});

			// Flatten the items for the quick pick
			/** @type {QuickPickItem[]} */
			const flatItems = [];
			for (const item of items) {
				flatItems.push(item);
				flatItems.push(...item.versions);
			}

			const selectedItems = await vscode.window.showQuickPick(
				flatItems,
				{
					canPickMany: true,
					placeHolder: 'Select .NET packs or versions to remove',
					ignoreFocusOut: true
				}
			);

			if (!selectedItems || selectedItems.length === 0) return;

			// Group selected items by pack
			const packsToRemove = new Set();
			const versionsToRemove = new Set();

			for (const item of selectedItems) {
				if ('isPack' in item && item.isPack) {
					packsToRemove.add(item.path);
				} else if ('isVersion' in item && item.isVersion) {
					versionsToRemove.add(item.path);
				}
			}

			// Remove selected items
			let removedCount = 0;
			let totalSize = 0;

			for (const packPath of packsToRemove) {
				try {
					const size = getFolderSize(packPath);
					await deleteFolderRecursive(packPath);
					removedCount++;
					totalSize += size;
				} catch (error) {
					vscode.window.showErrorMessage(`Error removing pack ${path.basename(packPath)}: ${error.message}`);
				}
			}

			for (const versionPath of versionsToRemove) {
				try {
					const size = getFolderSize(versionPath);
					await deleteFolderRecursive(versionPath);
					removedCount++;
					totalSize += size;
				} catch (error) {
					vscode.window.showErrorMessage(`Error removing version ${path.basename(versionPath)}: ${error.message}`);
				}
			}

			vscode.window.showInformationMessage(`Removed ${removedCount} items, freeing ${formatBytes(totalSize)}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Error cleaning .NET packs: ${error.message}`);
		}
	});

	// Clean all except latest versions command
	const cleanAllExceptLatest = vscode.commands.registerCommand('banditoth.VSCode-MAUI-DevCleaner.cleanAllExceptLatest', async () => {
		console.log('cleanAllExceptLatest command executed');
		try {
			let totalSize = 0;
			let removedCount = 0;

			// Clean iOS Device Support
			if (process.platform === 'darwin') {
				const deviceSupportPath = path.join(process.env.HOME, 'Library/Developer/Xcode/iOS DeviceSupport');
				if (fs.existsSync(deviceSupportPath)) {
					const versions = fs.readdirSync(deviceSupportPath)
						.filter(folder => fs.statSync(path.join(deviceSupportPath, folder)).isDirectory())
						.map(folder => ({
							label: folder,
							path: path.join(deviceSupportPath, folder)
						}));

					const versionsToRemove = keepLatestVersion(versions);
					for (const version of versionsToRemove) {
						const size = getFolderSize(version.path);
						await deleteFolderRecursive(version.path);
						totalSize += size;
						removedCount++;
					}
				}
			}

			// Clean Android SDK
			const sdkRoot = process.platform === 'win32'
				? path.join(process.env.LOCALAPPDATA, 'Android', 'android-sdk')
				: path.join(process.env.HOME, 'Library', 'Developer', 'Xamarin', 'android-sdk-macosx');

			if (fs.existsSync(sdkRoot)) {
				const components = ['platforms', 'system-images', 'build-tools'];
				for (const component of components) {
					const componentPath = path.join(sdkRoot, component);
					if (fs.existsSync(componentPath)) {
						const versions = fs.readdirSync(componentPath)
							.filter(folder => fs.statSync(path.join(componentPath, folder)).isDirectory())
							.map(folder => ({
								label: folder,
								path: path.join(componentPath, folder)
							}));

						const versionsToRemove = keepLatestVersion(versions);
						for (const version of versionsToRemove) {
							const size = getFolderSize(version.path);
							await deleteFolderRecursive(version.path);
							totalSize += size;
							removedCount++;
						}
					}
				}
			}

			// Clean .NET Packs
			const packsPath = process.platform === 'win32'
				? path.join(process.env.ProgramFiles, 'dotnet', 'packs')
				: '/usr/local/share/dotnet/packs';

			if (fs.existsSync(packsPath)) {
				const packs = fs.readdirSync(packsPath)
					.filter(folder => fs.statSync(path.join(packsPath, folder)).isDirectory());

				for (const pack of packs) {
					const packPath = path.join(packsPath, pack);
					const versions = fs.readdirSync(packPath)
						.filter(folder => fs.statSync(path.join(packPath, folder)).isDirectory())
						.map(folder => ({
							label: folder,
							path: path.join(packPath, folder)
						}));

					const versionsToRemove = keepLatestVersion(versions);
					for (const version of versionsToRemove) {
						const size = getFolderSize(version.path);
						await deleteFolderRecursive(version.path);
						totalSize += size;
						removedCount++;
					}
				}
			}

			// Clean iOS Simulator Runtime
			if (process.platform === 'darwin') {
				const runtimePath = '/System/Library/AssetsV2/com_apple_MobileAsset_iOSSimulatorRuntime';
				if (fs.existsSync(runtimePath)) {
					const xmlPath = path.join(runtimePath, 'com_apple_MobileAsset_iOSSimulatorRuntime.xml');
					if (fs.existsSync(xmlPath)) {
						const xmlContent = fs.readFileSync(xmlPath, 'utf8');
						const result = await parseString(xmlContent);
						
						const usedRuntimes = new Set();
						if (result.assets && result.assets.asset) {
							result.assets.asset.forEach(asset => {
								if (asset.$.state === 'installed') {
									usedRuntimes.add(asset.$.assetId);
								}
							});
						}

						const assetFolders = fs.readdirSync(runtimePath)
							.filter(item => item.endsWith('.asset'))
							.map(folder => ({
								label: folder,
								path: path.join(runtimePath, folder),
								isUsed: usedRuntimes.has(folder.replace('.asset', ''))
							}));

						const versionsToRemove = assetFolders.filter(asset => !asset.isUsed);
						for (const version of versionsToRemove) {
							const size = getFolderSize(version.path);
							await deleteFolderRecursive(version.path);
							totalSize += size;
							removedCount++;
						}
					}
				}
			}

			vscode.window.showInformationMessage(
				`Removed ${removedCount} items, freeing ${formatBytes(totalSize)}. Kept only the latest versions.`
			);
		} catch (error) {
			vscode.window.showErrorMessage(`Error cleaning all except latest versions: ${error.message}`);
		}
	});

	context.subscriptions.push(cleanBinObj);
	context.subscriptions.push(cleanNugetCache);
	context.subscriptions.push(cleanIosDeviceSupport);
	context.subscriptions.push(cleanAndroidSdk);
	context.subscriptions.push(cleanIosSimulatorRuntime);
	context.subscriptions.push(cleanDotnetPacks);
	context.subscriptions.push(cleanAllExceptLatest);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}