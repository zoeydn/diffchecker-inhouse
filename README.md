# diffchecker-inhouse
Internal diff-checker for transcript comparison

## Features

- **Side-by-side document comparison**: Compare two documents with an intuitive split-pane interface
- **REGEX filtering**: Automatically ignores `[[ ]]` markup and bracketed codes when comparing (toggle on/off)
- **Interactive difference resolution**:
  - Radio button selection to choose from original Document 1 or Document 2
  - Manual text input field for custom edits
  - Bulk selection (Select All Left/Right)
- **Export functionality**: Generate a final merged transcript file with all your selections

## Getting Started

1. Open `index.html` in your web browser
2. **Upload or paste** your two documents:
   - Click "Upload File" to select a .txt file from your computer
   - Or paste text directly into the text areas
3. Click "Compare Documents" to see the differences
4. For each difference, choose:
   - Left option (Transctipt)
   - Right option (Coded transcriipt)
   - Or enter custom text manually
5. Click "Export Final Transcript" to download your merged result

### Quick Test

Try uploading the included sample files:
- `sample-doc(coded).txt` and `sample-doc(not coded).txt`

## How It Works

The diff checker:
1. Splits both documents into lines
2. When "Ignore [[ ]] markup and codes" is checked, it removes:
   - `[[...]]` markup patterns
   - `[HH:MM:SS]` timestamps
   - `[Speaker N]` codes
   - Other bracketed codes
3. Compares the cleaned text to identify differences
4. Displays differences with visual highlighting:
   - Red background: Deleted lines
   - Blue background: Added lines
   - Side-by-side: Modified lines
5. Allows you to select which version to keep or enter your own
6. Exports a final transcript with your selections

## Usage Tips

- Use the "Load Sample" buttons to see example documents
- Unresolved differences are marked with `[UNRESOLVED - ...]` in the export
- Unchanged lines are automatically included in the final transcript
- The export file is named with the current date for easy tracking

## Technical Details

- Pure vanilla JavaScript (no dependencies)
- Responsive design works on desktop and tablet
- Client-side only (no server required, all processing in browser)
