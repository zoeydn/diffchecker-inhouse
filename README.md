# diffchecker-inhouse
Internal diff-checker for CSV comparison

**Repo**: https://github.com/zoeydn/diffchecker-inhouse

## Getting Started

1. **Open the app**: Double-click `index.html` in your web browser
2. **Upload your two CSV files** using the "Upload File" buttons
3. **Choose a compare mode** (see below) and click **"Compare Documents"**
4. **Resolve differences**: For each difference, pick CSV 1, CSV 2, or enter custom text
5. **Export**: Click **"Export Final Transcript"** to download the merged CSV

## Compare Modes

### Compare Full CSV
Compares every column in both files at once. Use this when you want to diff the entire file without any filtering.

### Choose Columns
Lets you pick which columns to compare. Use this when your CSVs have many columns but you only care about specific ones.
- A column picker shows preview content from each column so you can identify the right ones
- Empty columns are automatically hidden
- Use Select All / Deselect All for quick selection
- After viewing results, click "Show Columns" to change your selection

## Features

- **Cell-by-cell comparison** with row and column location for each difference (e.g., "Row 2 — Q11:")
- **Word-level diff highlighting**: red for CSV 1 text, green for CSV 2 text
- **Smart code filtering**: Removes bracketed codes when comparing
  - Preserves interviewer tags like `[INT:]` and `[Interviewer:]`
  - Strips tags but keeps content: `[FEL: scared]` → `scared`, `[NAR: text here]` → `text here`
  - Toggle "Show cleaned text" to switch between original and cleaned views
- **Interactive resolution**: Pick CSV 1, CSV 2, or type custom text for each difference
  - Bulk selection with Select All Left / Select All Right
- **Export to CSV**: Merged output named with the current date (e.g., `merged-csv-2025-01-22.csv`)

## Export Warnings

When you export, the app checks for issues in this order:

1. **Unresolved differences**: Any row differences in compared columns you didn't resolve are marked as `[UNRESOLVED]` in the output
2. **Non-compared columns** (Choose Columns mode only): If columns you didn't compare have differences, warns you which columns and lets you cancel or continue. If you continue, those cells are also marked as `[UNRESOLVED]` in the export

Unchanged content is always included automatically in the final output.

## Tips

- **Show cleaned text**: Check the box to hide `[FEL:]`, `[NAR:]`, and similar codes when viewing differences
- **Load samples**: Use the "Load Sample" buttons to try the tool with example data
- **Duplicate file warning**: The app warns you if you upload the same file to both panels
