// Global state
let differences = [];
let selections = {};
let csvMode = false;
let csvData1 = null;
let csvData2 = null;
let csvHeaders = null;

// Handle file upload
function handleFileUpload(docNum) {
    const fileInput = document.getElementById(`file${docNum}`);
    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const content = e.target.result;
        document.getElementById(`doc${docNum}`).value = content;

        // Show filename feedback
        const textarea = document.getElementById(`doc${docNum}`);
        textarea.style.borderColor = '#4caf50';
        setTimeout(() => {
            textarea.style.borderColor = '#ddd';
        }, 1000);
    };

    reader.onerror = function() {
        alert('Error reading file. Please try again.');
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
function diffCSV(csv1, csv2) {
    const diffs = [];
    const maxRows = Math.max(csv1.length, csv2.length);

    for (let row = 0; row < maxRows; row++) {
        const row1 = csv1[row] || [];
        const row2 = csv2[row] || [];
        const maxCols = Math.max(row1.length, row2.length);

        for (let col = 0; col < maxCols; col++) {
            const cell1 = row1[col] !== undefined ? row1[col] : null;
            const cell2 = row2[col] !== undefined ? row2[col] : null;

            const cleaned1 = cell1 !== null ? cleanText(cell1, true) : null;
            const cleaned2 = cell2 !== null ? cleanText(cell2, true) : null;

            let type = 'unchanged';
            if (cell1 === null && cell2 !== null) {
                type = 'added';
            } else if (cell1 !== null && cell2 === null) {
                type = 'deleted';
            } else if (cleaned1 !== cleaned2) {
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

    const cleanedLines1 = lines1.map(line => cleanText(line, ignoreMarkup));
    const cleanedLines2 = lines2.map(line => cleanText(line, ignoreMarkup));

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
            const clean1 = cleanedLines1[i].trim();
            const clean2 = cleanedLines2[j].trim();

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
                    if (j + k < lines2.length && cleanedLines1[i].trim() === cleanedLines2[j + k].trim()) {
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

                    if (i + k < lines1.length && cleanedLines1[i + k].trim() === cleanedLines2[j].trim()) {
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

    if (csvMode) {
        csvData1 = parseCSV(doc1);
        csvData2 = parseCSV(doc2);
        // Use first row as headers (from the longer CSV)
        csvHeaders = csvData1[0] && csvData1[0].length >= (csvData2[0] ? csvData2[0].length : 0)
            ? csvData1[0]
            : (csvData2[0] || []);
        differences = diffCSV(csvData1, csvData2);

        // Debug logging
        console.log('=== CSV DEBUG ===');
        console.log('CSV1 rows:', csvData1.length, 'cols in first row:', csvData1[0]?.length);
        console.log('CSV2 rows:', csvData2.length, 'cols in first row:', csvData2[0]?.length);
        console.log('Headers:', csvHeaders.slice(0, 5));
        console.log('First few cells of row 1 CSV1:', csvData1[0]?.slice(0, 3));
        console.log('First few cells of row 1 CSV2:', csvData2[0]?.slice(0, 3));
        console.log('Differences found:', differences.length);
        if (differences.length > 0) {
            console.log('First difference:', differences[0]);
        }
    } else {
        csvData1 = null;
        csvData2 = null;
        csvHeaders = null;
        differences = diffLines(doc1, doc2, true);
    }

    selections = {};

    renderDifferences();

    // Show results section
    document.getElementById('resultsSection').style.display = 'block';

    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
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
        modeIndicator.innerHTML = `CSV Mode: Comparing cell by cell (${significantDiffs.length} differences found)`;
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

    div.innerHTML = `
        ${cellLocation}
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
    // Check for unresolved differences and warn user
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
