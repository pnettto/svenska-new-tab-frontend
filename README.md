# Swedish Word New Tab - Chrome Extension

A Chrome extension that displays a random Swedish word with its English translation every time you open a new tab. Perfect for learning Swedish vocabulary!

## Features

- 🇸🇪 70+ common Swedish words with English translations
- 🎨 Beautiful gradient design
- 🔄 "New word" button to see another word without opening a new tab
- 📚 Words categorized by type (noun, verb, adjective, interjection)

## Installation Instructions

Since this extension is not published on the Chrome Web Store, you'll need to install it locally:

### Step 1: Download the Extension Files

Make sure you have all these files in the `new-tab-svenska` folder:
- `manifest.json`
- `newtab.html`
- `styles.css`
- `script.js`

### Step 2: Install in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** by toggling the switch in the top-right corner
3. Click the **Load unpacked** button
4. Navigate to and select the `new-tab-svenska` folder
5. The extension should now be installed!

### Step 3: Test It

Open a new tab in Chrome, and you should see a Swedish word with its English translation!

## Usage

- **Open a new tab**: See a random Swedish word
- **Click "Ny ord (New word)"**: Get a different word without opening a new tab

## Optional: Add Icons

The extension references icon files in `manifest.json`. While not required for functionality, you can add your own icon images:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

If you don't add icons, Chrome will use a default icon.

## Troubleshooting

If the extension doesn't work:
1. Make sure all files are in the same folder
2. Check that Developer mode is enabled in `chrome://extensions/`
3. Try clicking the refresh icon on the extension card
4. Check the Chrome console for any error messages

## Customization

You can easily customize the extension:

- **Add more words**: Edit `script.js` and add entries to the `swedishWords` array
- **Change colors**: Modify `styles.css` to adjust the gradient and colors
- **Adjust layout**: Edit `newtab.html` and `styles.css`

## Learn Swedish!

Lycka till med din svenska! (Good luck with your Swedish!)
