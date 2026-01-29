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
  - Removes tags but keeps content: `[FEL: scared]` → `scared`, `[NAR: text here]` → `text here`
  - Toggle to view original or cleaned text in the interface
- **Column selection**: Choose which columns to compare before running the diff
  - Preview content from each column to identify the right ones
  - Empty columns are automatically hidden
  - Select All / Deselect All buttons for quick selection
  - "Back to Columns" button to change selection after viewing results
- **Interactive difference resolution**:
  - Radio button selection to choose from CSV 1 or CSV 2
  - Manual text input field for custom edits
  - Bulk selection (Select All Left/Right)
- **Export functionality**: Generate a final merged CSV

## Getting Started

1. **Open the app**: Double-click `index.html` in your web browser
2. **Upload or paste** your two CSV files:
   - Click "Upload File" to select a .csv file
3. Click **"Compare Documents"**
4. **Select columns to compare**: Check the columns you want to diff (preview shows sample content)
5. Click **"Compare Selected Columns"** to see the differences
6. For each difference, choose:
   - **Left option** (CSV 1)
   - **Right option** (CSV 2)
   - Or **enter custom text** manually
7. Click **"Export Final Transcript"** to download your merged CSV

## How It Works

1. Parses both CSV files into rows and columns
2. Shows column picker with preview of each column's content
3. Compares only selected columns cell by cell
4. Shows differences with row/column location (e.g., "Row 2 — Q11:")
5. Exports merged CSV with your selections

## Usage Tips

- **Show cleaned text**: Check the box to hide codes like `[FEL:]` and `[NAR:]` when viewing differences
- **Load samples**: Click "Load Sample" buttons to test with example data
- **Duplicate file warning**: Warns you if you try to upload the same file to both panels
- **Unresolved differences**: Warning popup lists all unresolved items (with row/column) before export. Unresolved items are marked as `[UNRESOLVED]` in the output
- **Non-compared columns warning**: If columns you didn't compare have differences, a warning shows which columns have unresolved differences
- **Unchanged content**: Automatically included in the final output
- **Export naming**: Files are named with the current date (e.g., `merged-csv-2025-01-22.csv`)
