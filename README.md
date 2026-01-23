# diffchecker-inhouse
Internal diff-checker for CSV comparison

## Features

- **CSV cell-by-cell comparison**: Compares each cell individually
  - Shows row and column location for each difference
  - Exports merged result as CSV
- **Word-level diff highlighting**: Highlights exactly which words changed within each cell
  - Red highlight: text in CSV 1
  - Green highlight: text in CSV 2
- **Smart code filtering**: Automatically removes bracketed codes when comparing
  - Preserves `[INT:]`, `[Interviewer:]` and similar interviewer tags
  - Removes other codes like `[FEL: scared]`, `[NAR: ...]`, etc.
  - Toggle to view original or cleaned text in the interface
- **Interactive difference resolution**:
  - Radio button selection to choose from CSV 1 or CSV 2
  - Manual text input field for custom edits
  - Bulk selection (Select All Left/Right)
- **Export functionality**: Generate a final merged CSV

## Getting Started

1. **Open the app**: Double-click `index.html` in your web browser
2. **Upload or paste** your two CSV files:
   - Click "Upload File" to select a .csv file
   - Or paste CSV text directly into the text areas
3. Click **"Compare Documents"** to see the differences
4. For each difference, choose:
   - **Left option** (CSV 1)
   - **Right option** (CSV 2)
   - Or **enter custom text** manually
5. Click **"Export Final Transcript"** to download your merged CSV

## How It Works

1. Parses both CSV files into rows and columns
2. Compares each cell at matching positions
3. Shows differences with row/column location (e.g., "Row 2 — Q11:")
4. Exports merged CSV with your selections

## Usage Tips

- **Toggle display**: Use "Show cleaned text (remove codes) in differences" checkbox to switch between viewing original vs cleaned text
- **Load samples**: Click "Load Sample" buttons to test with example data
- **Unresolved differences**: Warning popup lists all unresolved items (with row/column) before export. Unresolved items are marked as `[UNRESOLVED]` in the output
- **Unchanged content**: Automatically included in the final output
- **Export naming**: Files are named with the current date (e.g., `merged-csv-2025-01-22.csv`)

## Technical Details

- **Pure vanilla JavaScript** (no dependencies)
- **Responsive design** works on desktop and tablet
- **Client-side only** (no server required, all processing in browser)
- **File format support**: .csv files only
- **Privacy**: All data stays on your computer, nothing is uploaded
