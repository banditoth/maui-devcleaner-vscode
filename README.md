<img src="icon.png" width="120" height="120"/>

# .NET MAUI - Development machine cleaner tool

![GitHub License](https://img.shields.io/github/license/banditoth/maui-devcleaner-vscode?style=for-the-badge)

![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/banditoth.VSCode-MAUI-DevCleaner?style=for-the-badge&link=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dbanditoth.VSCode-MAUI-DevCleaner)

![GitHub issues](https://img.shields.io/github/issues/banditoth/maui-devcleaner-vscode?style=for-the-badge)

A powerful Visual Studio Code extension designed to help .NET MAUI developers keep their development machine clean and optimized. This extension provides a suite of tools to remove unnecessary files, clear caches, and manage SDK components efficiently.

## Features

### 🧹 Bin/Obj Cleaner
- Removes `bin` and `obj` folders from your opened workspace

### 📦 NuGet Cache Cleaner
- Clears the NuGet package cache which could grow enormous after a couple of projects

### 📱 iOS Device Support Cleaner (macOS only)
- Lists all iOS Device Support folders
- Allows selective removal of versions

### 🤖 Android SDK Cleaner
- Manages Android SDK components
- Shows size for each component and version

### 📱 iOS Simulator Runtime Cleaner (macOS only)
- Lists iOS Simulator Runtime assets
- Shows usage status (in-use/not in-use)

### 📦 .NET Packs Cleaner
- Hierarchical view of .NET packs and versions
- Allows selective removal of packs or versions

### 🚀 All Except Latest Versions
- Automatically keeps only the latest version of each component
- Platform-specific handling (macOS/Windows)

## Installation

1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for ".NET MAUI - Development machine cleaner tool"
4. Click Install
5. Reload VS Code

## Usage

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "MAUI Clean" to see all available commands
3. Select the command you want to use
4. Follow the prompts to clean your development machine

## Commands

| Command | Description | Platform |
|---------|-------------|----------|
| `MAUI Clean: Bin/Obj Folders` | Removes bin and obj folders from workspace | All |
| `MAUI Clean: NuGet Cache` | Clears NuGet package cache | All |
| `MAUI Clean: iOS Device Support` | Manages iOS Device Support folders | macOS |
| `MAUI Clean: Android SDK` | Manages Android SDK components | All |
| `MAUI Clean: iOS Simulator Runtime` | Manages iOS Simulator Runtime assets | macOS |
| `MAUI Clean: .NET Packs` | Manages .NET packs and versions | All |
| `MAUI Clean: All Except Latest Versions` | Keeps only the latest version of each component | All |

## Requirements

- Visual Studio Code 1.96.2 or higher
- .NET SDK installed
- For iOS features: macOS with Xcode installed
- For Android features: Android SDK installed

## Extension Settings

This extension contributes the following settings:

* `mauiCleaner.androidSdkPath`: Path to Android SDK (default: auto-detected)


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ for .NET MAUI developers
