# diffchecker-inhouse
Internal diff-checker for transcript comparison

## Features

- **Side-by-side document comparison**: Compare two documents with an intuitive split-pane interface
- **Smart REGEX filtering**: Automatically removes `[[ ]]` markup and bracketed codes when comparing
  - Always compares cleaned text to find real differences
  - Toggle to view original or cleaned text in the interface
- **Interactive difference resolution**:
  - Radio button selection to choose from Document 1 or Document 2
  - Manual text input field for custom edits
  - Bulk selection (Select All Left/Right)
- **Export functionality**: Generate a final merged transcript as .txt file

## Getting Started

1. **Open the app**: Double-click `index.html` in your web browser
2. **Upload or paste** your two documents:
   - Click "Upload File" to select a .txt file from your computer
   - Or paste text directly into the text areas
3. Click **"Compare Documents"** to see the differences
4. For each difference, choose:
   - **Left option** (Transcript without codes)
   - **Right option** (Transcript with codes)
   - Or **enter custom text** manually
5. Click **"Export Final Transcript"** to download your merged result as a .txt file

### Quick Test

Click the "Load Sample" buttons to see example documents and try out the comparison.

## How It Works

The diff checker:
1. Splits both documents into lines
2. Removes codes for comparison
3. Compares the cleaned text to identify real differences
4. Displays differences side-by-side:
   - Red background: Lines only in Document 1
   - Blue background: Lines only in Document 2
5. Toggle checkbox to view original or cleaned text in the comparison
6. Select your preferred version for each difference
7. Export a merged transcript with your selections

## Usage Tips

- **Toggle display**: Use "Show cleaned text (remove codes) in differences" checkbox to switch between viewing original vs cleaned text
- **Load samples**: Click "Load Sample" buttons to test with example data
- **Unresolved differences**: If you don't select an option, the export will mark it as `[UNRESOLVED - ...]`
- **Unchanged lines**: Automatically included in the final transcript
- **Export naming**: Files are named with the current date (e.g., `merged-transcript-2025-12-03.txt`)

## Technical Details

- **Pure vanilla JavaScript** (no dependencies)
- **Responsive design** works on desktop and tablet
- **Client-side only** (no server required, all processing in browser)
- **File format support**: .txt files (plain text)
- **Privacy**: All data stays on your computer, nothing is uploaded
