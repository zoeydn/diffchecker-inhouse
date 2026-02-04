// Global state
let differences = [];
let selections = {};
let csvMode = false;
let csvData1 = null;
let csvData2 = null;
let csvHeaders = null;
let uploadedFiles = { 1: null, 2: null };
let selectedColumns = new Set();
let compareMode = 'full';

function getCompareMode() {
    const selected = document.querySelector('input[name="compareMode"]:checked');
    return selected ? selected.value : 'full';
}

// Handle file upload
function handleFileUpload(docNum) {
    const fileInput = document.getElementById(`file${docNum}`);
    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    // Check if this file was already uploaded to the other panel
    const otherDocNum = docNum === 1 ? 2 : 1;
    if (uploadedFiles[otherDocNum] === file.name) {
        const proceed = confirm(`"${file.name}" is already uploaded to CSV ${otherDocNum}.\n\nUpload anyway?`);
        if (!proceed) {
            fileInput.value = '';
            return;
        }
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const content = e.target.result;
        document.getElementById(`doc${docNum}`).value = content;

        // Track uploaded filename
        uploadedFiles[docNum] = file.name;

        // Show filename feedback
        const textarea = document.getElementById(`doc${docNum}`);
        textarea.style.borderColor = '#4caf50';
        setTimeout(() => {
            textarea.style.borderColor = '#ddd';
        }, 1000);

        // Reset file input so the same file can be uploaded again
        fileInput.value = '';
    };

    reader.onerror = function() {
        alert('Error reading file. Please try again.');
        fileInput.value = '';
    };

    // Read the file as text
    reader.readAsText(file);
}

// Utility function to remove [[ ]] markup and codes based on regex
function cleanText(text, shouldClean) {
    if (!shouldClean) return text;

    let cleaned = text;

    // Step 0: Preserve interviewer tags by replacing with placeholders
    const interviewerTags = [];
    cleaned = cleaned.replace(/\[(INT|Interviewer|INTERVIEWER|Int)[:\s][^\]]*\]/gi, (match) => {
        interviewerTags.push(match);
        return `__INTERVIEWER_${interviewerTags.length - 1}__`;
    });

    // Process nested codes from innermost to outermost
    // This prevents the regex from matching across nested brackets incorrectly
    let iterations = 0;
    const maxIterations = 10; // Safety limit to prevent infinite loops

    while (iterations < maxIterations) {
        const before = cleaned;

        // Remove [TAG: content] patterns, keeping just the content
        // Examples: [FEL: scared] -> "scared", [NAR: text here] -> "text here"
        cleaned = cleaned.replace(/\[[A-Z]+:\s*([^\[\]]*)\]/g, '$1');

        // If nothing changed in this iteration, we're done
        if (cleaned === before) break;
        iterations++;
    }

    // Step 3: Remove any other bracketed content (timestamps, markers, etc.)
    // Replace with a single space to prevent word merging
    cleaned = cleaned.replace(/\[.*?\]/g, '');

    // Step 4: Remove any orphaned brackets that might remain
    cleaned = cleaned.replace(/[\[\]]/g, '');

    // Step 5: Restore interviewer tags
    interviewerTags.forEach((tag, index) => {
        cleaned = cleaned.replace(`__INTERVIEWER_${index}__`, tag);
    });

    // Normalize whitespace: collapse multiple spaces/newlines into single spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    // Step 6: Only trim leading/trailing whitespace, preserve internal spacing
    cleaned = cleaned.trim();

    return cleaned;
}

// Compute word-level diff and return HTML with highlights
function highlightDiff(text1, text2) {
    if (text1 === null || text2 === null) {
        return {
            left: text1 !== null ? escapeHtml(text1) : null,
            right: text2 !== null ? escapeHtml(text2) : null
        };
    }

    const words1 = text1.split(/(\s+)/);
    const words2 = text2.split(/(\s+)/);

    // Simple LCS-based diff for words
    const lcs = computeLCS(words1, words2);

    let leftHtml = '';
    let rightHtml = '';
    let i = 0, j = 0, k = 0;

    while (i < words1.length || j < words2.length) {
        if (k < lcs.length && i < words1.length && words1[i] === lcs[k]) {
            // Match in LCS - check if right side also matches
            if (j < words2.length && words2[j] === lcs[k]) {
                leftHtml += escapeHtml(words1[i]);
                rightHtml += escapeHtml(words2[j]);
                i++;
                j++;
                k++;
            } else {
                // Right side has extra word
                rightHtml += `<span class="diff-added">${escapeHtml(words2[j])}</span>`;
                j++;
            }
        } else if (k < lcs.length && j < words2.length && words2[j] === lcs[k]) {
            // Left side has extra word
            leftHtml += `<span class="diff-removed">${escapeHtml(words1[i])}</span>`;
            i++;
        } else if (i < words1.length && j < words2.length) {
            // Both sides have different words
            leftHtml += `<span class="diff-removed">${escapeHtml(words1[i])}</span>`;
            rightHtml += `<span class="diff-added">${escapeHtml(words2[j])}</span>`;
            i++;
            j++;
        } else if (i < words1.length) {
            leftHtml += `<span class="diff-removed">${escapeHtml(words1[i])}</span>`;
            i++;
        } else if (j < words2.length) {
            rightHtml += `<span class="diff-added">${escapeHtml(words2[j])}</span>`;
            j++;
        }
    }

    return { left: leftHtml, right: rightHtml };
}

// Compute Longest Common Subsequence
function computeLCS(arr1, arr2) {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (arr1[i - 1] === arr2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find LCS
    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (arr1[i - 1] === arr2[j - 1]) {
            lcs.unshift(arr1[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    return lcs;
}

// Parse CSV text into 2D array
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                // Escaped quote
                currentCell += '"';
                i++;
            } else if (char === '"') {
                // End of quoted field
                inQuotes = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell);
                currentCell = '';
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
                if (char === '\r') i++;
            } else if (char === '\r') {
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
    }

    // Add last cell and row if there's content
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
}

// Detect if content is CSV
function isCSV(text) {
    // Simple detection: if first line has 2+ commas, treat as CSV
    const firstLine = text.split('\n')[0] || '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    return commaCount >= 2;
}

// Compare CSV data cell by cell
function diffCSV(csv1, csv2, columnsToCompare = null) {
    const diffs = [];
    const maxRows = Math.max(csv1.length, csv2.length);

    for (let row = 0; row < maxRows; row++) {
        const row1 = csv1[row] || [];
        const row2 = csv2[row] || [];
        const maxCols = Math.max(row1.length, row2.length);

        for (let col = 0; col < maxCols; col++) {
            // Skip columns not in the selected set (if provided)
            if (columnsToCompare && !columnsToCompare.has(col)) {
                continue;
            }

            const cell1 = row1[col] !== undefined ? row1[col] : null;
            const cell2 = row2[col] !== undefined ? row2[col] : null;

            const cleaned1 = cell1 !== null ? cleanText(cell1, true) : null;
            const cleaned2 = cell2 !== null ? cleanText(cell2, true) : null;

            let type = 'unchanged';
            if (cell1 === null && cell2 !== null) {
                type = 'added';
            } else if (cell1 !== null && cell2 === null) {
                type = 'deleted';
            } else if (cell1 !== cell2) {
                type = 'modified';
            }

            if (type !== 'unchanged') {
                diffs.push({
                    type: type,
                    row: row,
                    col: col,
                    left: cell1,
                    leftCleaned: cleaned1,
                    right: cell2,
                    rightCleaned: cleaned2
                });
            }
        }
    }

    return diffs;
}

// Simple diff algorithm using longest common subsequence (LCS)
function diffLines(text1, text2, ignoreMarkup) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    const cleanedLines1 = lines1.map(line => cleanText(line, true));
    const cleanedLines2 = lines2.map(line => cleanText(line, true));
    const compareLines1 = lines1.map(line => (ignoreMarkup ? cleanText(line, true) : line).trim());
    const compareLines2 = lines2.map(line => (ignoreMarkup ? cleanText(line, true) : line).trim());

    const diffs = [];
    let i = 0, j = 0;

    while (i < lines1.length || j < lines2.length) {
        if (i >= lines1.length) {
            // Remaining lines in doc2 are additions
            diffs.push({
                type: 'added',
                left: null,
                leftCleaned: null,
                right: lines2[j],
                rightCleaned: cleanedLines2[j],
                leftIndex: null,
                rightIndex: j
            });
            j++;
        } else if (j >= lines2.length) {
            // Remaining lines in doc1 are deletions
            diffs.push({
                type: 'deleted',
                left: lines1[i],
                leftCleaned: cleanedLines1[i],
                right: null,
                rightCleaned: null,
                leftIndex: i,
                rightIndex: null
            });
            i++;
        } else {
            const clean1 = compareLines1[i];
            const clean2 = compareLines2[j];

            if (clean1 === clean2) {
                // Lines match (when cleaned)
                diffs.push({
                    type: 'unchanged',
                    left: lines1[i],
                    leftCleaned: cleanedLines1[i],
                    right: lines2[j],
                    rightCleaned: cleanedLines2[j],
                    leftIndex: i,
                    rightIndex: j
                });
                i++;
                j++;
            } else {
                // Lines differ - check if it's a modification or insertion/deletion
                // Look ahead to see if we can find a match
                let foundMatch = false;

                // Check next few lines for potential match
                for (let k = 1; k <= 3; k++) {
                    if (j + k < lines2.length && compareLines1[i] === compareLines2[j + k]) {
                        // Lines j to j+k-1 are additions
                        for (let l = 0; l < k; l++) {
                            diffs.push({
                                type: 'added',
                                left: null,
                                leftCleaned: null,
                                right: lines2[j + l],
                                rightCleaned: cleanedLines2[j + l],
                                leftIndex: null,
                                rightIndex: j + l
                            });
                        }
                        j += k;
                        foundMatch = true;
                        break;
                    }

                    if (i + k < lines1.length && compareLines1[i + k] === compareLines2[j]) {
                        // Lines i to i+k-1 are deletions
                        for (let l = 0; l < k; l++) {
                            diffs.push({
                                type: 'deleted',
                                left: lines1[i + l],
                                leftCleaned: cleanedLines1[i + l],
                                right: null,
                                rightCleaned: null,
                                leftIndex: i + l,
                                rightIndex: null
                            });
                        }
                        i += k;
                        foundMatch = true;
                        break;
                    }
                }

                if (!foundMatch) {
                    // It's a modification
                    diffs.push({
                        type: 'modified',
                        left: lines1[i],
                        leftCleaned: cleanedLines1[i],
                        right: lines2[j],
                        rightCleaned: cleanedLines2[j],
                        leftIndex: i,
                        rightIndex: j
                    });
                    i++;
                    j++;
                }
            }
        }
    }

    return diffs;
}

function compareDocuments() {
    const doc1 = document.getElementById('doc1').value;
    const doc2 = document.getElementById('doc2').value;

    if (!doc1.trim() || !doc2.trim()) {
        alert('Please enter text in both documents before comparing.');
        return;
    }

    // Detect if both documents are CSV
    csvMode = isCSV(doc1) || isCSV(doc2);
    compareMode = getCompareMode();

    if (csvMode) {
        csvData1 = parseCSV(doc1);
        csvData2 = parseCSV(doc2);
        // Use first row as headers (from the longer CSV)
        csvHeaders = csvData1[0] && csvData1[0].length >= (csvData2[0] ? csvData2[0].length : 0)
            ? csvData1[0]
            : (csvData2[0] || []);

        if (compareMode === 'columns') {
            // Show column picker first
            showColumnPicker();
        } else {
            document.getElementById('columnPickerSection').style.display = 'none';
            selectedColumns.clear();
            differences = diffCSV(csvData1, csvData2, null);
            selections = {};
            renderDifferences();
            document.getElementById('resultsSection').style.display = 'block';
            document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        csvData1 = null;
        csvData2 = null;
        csvHeaders = null;
        document.getElementById('columnPickerSection').style.display = 'none';
        differences = diffLines(doc1, doc2, false);

        selections = {};
        renderDifferences();
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }
}

function showColumnPicker() {
    compareMode = 'columns';
    const columnsRadio = document.querySelector('input[name="compareMode"][value="columns"]');
    if (columnsRadio) {
        columnsRadio.checked = true;
    }
    const container = document.getElementById('columnPickerContainer');
    container.innerHTML = '';

    // Reset selected columns - select all by default
    selectedColumns = new Set();

    // Find max columns across ALL rows (not just row 0)
    const maxCols1 = Math.max(...csvData1.map(row => row ? row.length : 0));
    const maxCols2 = Math.max(...csvData2.map(row => row ? row.length : 0));
    const maxCols = Math.max(maxCols1, maxCols2);

    for (let col = 0; col < maxCols; col++) {
        // Skip empty columns (no data in either CSV)
        if (isColumnEmpty(col)) {
            continue;
        }

        // Get header name - check both CSVs' first rows
        let headerValue = csvHeaders[col];
        if (!headerValue || !headerValue.trim()) {
            // Try to get from the other CSV's first row
            headerValue = csvData1[0] && csvData1[0][col] ? csvData1[0][col] : null;
            if (!headerValue || !headerValue.trim()) {
                headerValue = csvData2[0] && csvData2[0][col] ? csvData2[0][col] : null;
            }
        }
        const colName = (headerValue && headerValue.trim()) ? headerValue.trim() : `Column ${col + 1}`;

        // Get preview content from first few data rows
        const preview1 = getColumnPreview(csvData1, col);
        const preview2 = getColumnPreview(csvData2, col);

        const item = document.createElement('div');
        item.className = 'column-picker-item';
        item.id = `col-picker-${col}`;

        item.innerHTML = `
            <label>
                <input type="checkbox" onchange="toggleColumn(${col})">
                <div class="column-picker-info">
                    <div class="column-picker-name">${escapeHtml(colName)}</div>
                    <div class="column-picker-preview">
                        <strong>CSV1:</strong> ${escapeHtml(preview1)}<br>
                        <strong>CSV2:</strong> ${escapeHtml(preview2)}
                    </div>
                </div>
            </label>
        `;

        container.appendChild(item);
    }

    // Hide results, show column picker
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('columnPickerSection').style.display = 'block';
    document.getElementById('columnPickerSection').scrollIntoView({ behavior: 'smooth' });
}

function getColumnPreview(csvData, col) {
    const previews = [];
    // Get content from rows 0-4 (include all rows to show preview)
    for (let row = 0; row <= 4 && row < csvData.length; row++) {
        if (csvData[row] && csvData[row][col] !== undefined) {
            const cellValue = String(csvData[row][col]);
            if (cellValue.trim()) {
                const text = cellValue.substring(0, 40);
                previews.push(text + (cellValue.length > 40 ? '...' : ''));
            }
        }
    }
    return previews.length > 0 ? previews.join(' | ') : '(no data)';
}

// Check if a column has any data in either CSV
function isColumnEmpty(col) {
    // Check all rows in both CSVs
    for (let row = 0; row < csvData1.length; row++) {
        if (csvData1[row] && csvData1[row][col] && String(csvData1[row][col]).trim()) {
            return false;
        }
    }
    for (let row = 0; row < csvData2.length; row++) {
        if (csvData2[row] && csvData2[row][col] && String(csvData2[row][col]).trim()) {
            return false;
        }
    }
    return true;
}

function toggleColumn(col) {
    const item = document.getElementById(`col-picker-${col}`);
    if (selectedColumns.has(col)) {
        selectedColumns.delete(col);
        item.classList.remove('selected');
    } else {
        selectedColumns.add(col);
        item.classList.add('selected');
    }
}

function selectAllColumns() {
    const maxCols = csvHeaders.length;
    for (let col = 0; col < maxCols; col++) {
        selectedColumns.add(col);
        const item = document.getElementById(`col-picker-${col}`);
        if (item) {
            item.classList.add('selected');
            item.querySelector('input[type="checkbox"]').checked = true;
        }
    }
}

function deselectAllColumns() {
    selectedColumns.clear();
    const items = document.querySelectorAll('.column-picker-item');
    items.forEach(item => {
        item.classList.remove('selected');
        item.querySelector('input[type="checkbox"]').checked = false;
    });
}

function proceedWithComparison() {
    if (selectedColumns.size === 0) {
        alert('Please select at least one column to compare.');
        return;
    }

    // Run diff only for selected columns
    differences = diffCSV(csvData1, csvData2, selectedColumns);

    selections = {};
    renderDifferences();

    // Hide column picker, show results
    document.getElementById('columnPickerSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

function backToColumnSelection() {
    // Hide results, show column picker
    document.getElementById('resultsSection').style.display = 'none';
    showColumnPicker();
}

function toggleDisplayMode() {
    // Re-render differences with updated display mode
    if (differences.length > 0) {
        renderDifferences();
    }
}

function renderDifferences() {
    const container = document.getElementById('differencesContainer');

    // Filter out unchanged lines for display, but keep track of all lines
    const significantDiffs = differences.filter(d => d.type !== 'unchanged');

    if (significantDiffs.length === 0) {
        container.innerHTML = `
            <div class="no-differences">
                <div class="icon">✓</div>
                <p>No differences found between the documents!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    // Add mode indicator for CSV
    if (csvMode) {
        const modeIndicator = document.createElement('div');
        modeIndicator.className = 'mode-indicator';
        const modeLabel = compareMode === 'columns' ? 'Selected columns' : 'All columns';
        modeIndicator.innerHTML = `CSV Mode: ${modeLabel} (${significantDiffs.length} differences found)`;
        container.appendChild(modeIndicator);
    }

    significantDiffs.forEach((diff, index) => {
        const diffItem = createDiffItem(diff, index);
        container.appendChild(diffItem);
    });
}

function createDiffItem(diff, index) {
    const div = document.createElement('div');
    div.className = 'diff-item';

    // Check if user wants to see cleaned or original text
    const showCleaned = document.getElementById('showCleaned').checked;

    // Use cleaned text for display if checkbox is checked, otherwise use original
    const displayLeft = showCleaned && diff.leftCleaned !== undefined && diff.leftCleaned !== null
        ? diff.leftCleaned
        : diff.left;
    const displayRight = showCleaned && diff.rightCleaned !== undefined && diff.rightCleaned !== null
        ? diff.rightCleaned
        : diff.right;

    // Normalize whitespace for display: collapse multiple spaces/newlines into single spaces
    const normalizeDisplay = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : s);
    const normLeft = normalizeDisplay(displayLeft);
    const normRight = normalizeDisplay(displayRight);

    // Generate highlighted HTML for modified cells
    let leftHtml, rightHtml;
    if (diff.type === 'modified' && normLeft !== null && normRight !== null) {
        const highlighted = highlightDiff(normLeft, normRight);
        leftHtml = highlighted.left || '<em>Empty cell</em>';
        rightHtml = highlighted.right || '<em>Empty cell</em>';
    } else {
        leftHtml = normLeft !== null ? escapeHtml(normLeft) || '<em>Empty cell</em>' : null;
        rightHtml = normRight !== null ? escapeHtml(normRight) || '<em>Empty cell</em>' : null;
    }

    // Cell location label for CSV mode
    let cellLocation = '';
    if (csvMode) {
        const colName = csvHeaders && csvHeaders[diff.col] ? csvHeaders[diff.col] : `Column ${diff.col + 1}`;
        cellLocation = `<div class="cell-location">Row ${diff.row + 1} — ${colName}</div>`;
    }

    const leftCleaned = typeof diff.leftCleaned === 'string' ? diff.leftCleaned.trim() : diff.leftCleaned;
    const rightCleaned = typeof diff.rightCleaned === 'string' ? diff.rightCleaned.trim() : diff.rightCleaned;
    const sameAfterClean =
        diff.type === 'modified' &&
        leftCleaned !== null &&
        rightCleaned !== null &&
        leftCleaned === rightCleaned;
    const sameAfterCleanNote = showCleaned && sameAfterClean
        ? `<div class="same-after-clean">Same text after code removal</div>`
        : '';

    div.innerHTML = `
        ${cellLocation}
        ${sameAfterCleanNote}
        <div class="diff-column-headers">
            <div class="column-header">${csvMode ? 'CSV 1' : 'Transcript without codes'}</div>
            <div class="column-header">${csvMode ? 'CSV 2' : 'Transcript with codes'}</div>
        </div>
        <div class="diff-content">
            ${diff.left !== null ? `
                <div class="diff-option ${diff.type === 'deleted' ? 'deleted' : ''}" id="diff-${index}-left">
                    <label class="diff-radio">
                        <input type="radio" name="diff-${index}" value="left" onchange="handleSelection(${index}, 'left')">
                        <div class="diff-text">${leftHtml}</div>
                    </label>
                </div>
            ` : '<div class="diff-option deleted"><div class="diff-text"><em>Not in Document 1</em></div></div>'}

            ${diff.right !== null ? `
                <div class="diff-option ${diff.type === 'added' ? 'added' : ''}" id="diff-${index}-right">
                    <label class="diff-radio">
                        <input type="radio" name="diff-${index}" value="right" onchange="handleSelection(${index}, 'right')">
                        <div class="diff-text">${rightHtml}</div>
                    </label>
                </div>
            ` : '<div class="diff-option added"><div class="diff-text"><em>Not in Document 2</em></div></div>'}
        </div>
        <div class="diff-manual" id="diff-${index}-manual">
            <label>
                <input type="radio" name="diff-${index}" value="manual" onchange="handleSelection(${index}, 'manual')">
                Or enter custom text:
            </label>
            <textarea id="diff-${index}-manual-text" placeholder="Enter your custom text here..."></textarea>
        </div>
    `;

    return div;
}

function handleSelection(index, choice) {
    selections[index] = {
        choice: choice,
        customText: choice === 'manual' ? document.getElementById(`diff-${index}-manual-text`).value : null
    };

    // Visual feedback
    const leftOption = document.getElementById(`diff-${index}-left`);
    const rightOption = document.getElementById(`diff-${index}-right`);
    const manualOption = document.getElementById(`diff-${index}-manual`);

    if (leftOption) leftOption.classList.remove('selected');
    if (rightOption) rightOption.classList.remove('selected');
    if (manualOption) manualOption.classList.remove('active');

    if (choice === 'left' && leftOption) {
        leftOption.classList.add('selected');
    } else if (choice === 'right' && rightOption) {
        rightOption.classList.add('selected');
    } else if (choice === 'manual') {
        manualOption.classList.add('active');
    }

    // Update custom text if manual is selected
    if (choice === 'manual') {
        const textarea = document.getElementById(`diff-${index}-manual-text`);
        textarea.addEventListener('input', function() {
            selections[index].customText = this.value;
        });
    }
}

function selectAllLeft() {
    const significantDiffs = differences.filter(d => d.type !== 'unchanged');
    significantDiffs.forEach((diff, index) => {
        if (diff.left !== null) {
            const radio = document.querySelector(`input[name="diff-${index}"][value="left"]`);
            if (radio) {
                radio.checked = true;
                handleSelection(index, 'left');
            }
        }
    });
}

function selectAllRight() {
    const significantDiffs = differences.filter(d => d.type !== 'unchanged');
    significantDiffs.forEach((diff, index) => {
        if (diff.right !== null) {
            const radio = document.querySelector(`input[name="diff-${index}"][value="right"]`);
            if (radio) {
                radio.checked = true;
                handleSelection(index, 'right');
            }
        }
    });
}

function exportTranscript() {
    if (!csvMode) {
        alert('Export is only available for CSV files.');
        return;
    }
    exportCSV();
}

function exportCSV() {
    // Check for unresolved differences in compared columns (show this first)
    const unresolved = [];
    differences.forEach((diff, index) => {
        if (!selections[index]) {
            const colName = csvHeaders && csvHeaders[diff.col] ? csvHeaders[diff.col] : `Column ${diff.col + 1}`;
            unresolved.push(`Row ${diff.row + 1}, ${colName}`);
        }
    });

    if (unresolved.length > 0) {
        const proceed = confirm(
            `Warning: ${unresolved.length} unresolved difference(s):\n\n` +
            unresolved.slice(0, 10).join('\n') +
            (unresolved.length > 10 ? `\n...and ${unresolved.length - 10} more` : '') +
            '\n\nThese will be marked as [UNRESOLVED] in the output.\n\nContinue anyway?'
        );
        if (!proceed) return;
    }

    // Check for non-compared columns that have differences
    if (selectedColumns.size > 0) {
        const maxCols1 = Math.max(...csvData1.map(row => row ? row.length : 0));
        const maxCols2 = Math.max(...csvData2.map(row => row ? row.length : 0));
        const maxCols = Math.max(maxCols1, maxCols2);
        const maxRows = Math.max(csvData1.length, csvData2.length);

        const colsWithDiffs = [];

        for (let col = 0; col < maxCols; col++) {
            if (!isColumnEmpty(col) && !selectedColumns.has(col)) {
                // Check if this column has any differences
                let hasDiff = false;
                for (let row = 0; row < maxRows; row++) {
                    const cell1 = csvData1[row] && csvData1[row][col] !== undefined ? csvData1[row][col] : null;
                    const cell2 = csvData2[row] && csvData2[row][col] !== undefined ? csvData2[row][col] : null;
                    const cleaned1 = cell1 !== null ? cleanText(cell1, true) : null;
                    const cleaned2 = cell2 !== null ? cleanText(cell2, true) : null;
                    if (cleaned1 !== cleaned2) {
                        hasDiff = true;
                        break;
                    }
                }
                if (hasDiff) {
                    const colName = csvHeaders && csvHeaders[col] ? csvHeaders[col] : `Column ${col + 1}`;
                    colsWithDiffs.push(colName);
                }
            }
        }

        if (colsWithDiffs.length > 0) {
            const proceed = confirm(
                `Warning: ${colsWithDiffs.length} column(s) have differences that were not compared:\n\n` +
                colsWithDiffs.slice(0, 10).join(', ') +
                (colsWithDiffs.length > 10 ? `, ...and ${colsWithDiffs.length - 10} more` : '') +
                '\n\nThese columns will use CSV 2 values in the export.\n\nContinue?'
            );
            if (!proceed) return;
        }
    }

    // Start with the larger CSV as base (prefer CSV2 for coded version)
    const maxRows = Math.max(csvData1.length, csvData2.length);
    const maxCols = Math.max(
        ...csvData1.map(r => r.length),
        ...csvData2.map(r => r.length)
    );

    // Create result grid starting from CSV2 (coded version)
    const result = [];
    for (let row = 0; row < maxRows; row++) {
        result[row] = [];
        for (let col = 0; col < maxCols; col++) {
            // Default to CSV2 value, fall back to CSV1
            const val2 = csvData2[row] && csvData2[row][col] !== undefined ? csvData2[row][col] : null;
            const val1 = csvData1[row] && csvData1[row][col] !== undefined ? csvData1[row][col] : null;
            result[row][col] = val2 !== null ? val2 : (val1 !== null ? val1 : '');
        }
    }

    // Apply user selections for differences
    differences.forEach((diff, index) => {
        const selection = selections[index];
        if (selection) {
            if (selection.choice === 'left' && diff.left !== null) {
                result[diff.row][diff.col] = diff.left;
            } else if (selection.choice === 'right' && diff.right !== null) {
                result[diff.row][diff.col] = diff.right;
            } else if (selection.choice === 'manual') {
                result[diff.row][diff.col] = selection.customText || '';
            }
        } else {
            // Mark unresolved
            const leftText = diff.left || 'N/A';
            const rightText = diff.right || 'N/A';
            result[diff.row][diff.col] = `[UNRESOLVED] CSV1: ${leftText} | CSV2: ${rightText}`;
        }
    });

    // Convert to CSV string
    const csvContent = result.map(row =>
        row.map(cell => {
            // Escape quotes and wrap in quotes if needed
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(',')
    ).join('\n');

    // Download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged-csv-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Merged CSV exported successfully!');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadSample(docNum) {
    const sample1 = 'Call my mom but calls grandma it will that record somethingits a spy Extra sentence.';

    const sample2 = `[NAR: Call my mom but calls grandma [FEL: scared] it will that record somethingits a spy].`;

    if (docNum === 1) {
        document.getElementById('doc1').value = sample1;
    } else {
        document.getElementById('doc2').value = sample2;
    }
}
