// Global state
let differences = [];
let selections = {};

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

    // Step 1: Remove [[ ]] double bracket markup patterns
    cleaned = cleaned.replace(/\[\[.*?\]\]/g, '');

    // Step 2: Remove specific inner tags completely (tag + content)
    // These tags should be removed entirely including their content
    cleaned = cleaned.replace(/\[FEL:.*?\]/g, ''); // Remove [FEL: ...] tags
    cleaned = cleaned.replace(/\[ACTION:.*?\]/gi, ''); // Remove [ACTION: ...] tags
    cleaned = cleaned.replace(/\[SOUND:.*?\]/gi, ''); // Remove [SOUND: ...] tags

    // Step 3: Remove timestamps like [00:12:34]
    cleaned = cleaned.replace(/\[\d+:\d+:\d+\]/g, '');

    // Step 4: Remove speaker codes like [Speaker 1]
    cleaned = cleaned.replace(/\[Speaker \d+\]/gi, '');

    // Step 5: Remove narrative wrapper tags but keep content
    // Remove opening tags like [NAR: and trailing ]
    cleaned = cleaned.replace(/\[NAR:\s*/gi, ''); // Remove [NAR:
    cleaned = cleaned.replace(/\[NARR:\s*/gi, ''); // Remove [NARR:
    cleaned = cleaned.replace(/\[NARRATIVE:\s*/gi, ''); // Remove [NARRATIVE:

    // Step 6: Remove any remaining bracketed codes entirely (including content)
    // This catches things like [n], [x], [ABC], etc.
    cleaned = cleaned.replace(/\[.*?\]/g, '');

    // Step 7: Remove any orphaned brackets that might remain
    cleaned = cleaned.replace(/\]/g, '');
    cleaned = cleaned.replace(/\[/g, '');

    // Step 8: Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
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

    // Always clean text for comparison
    differences = diffLines(doc1, doc2, true);
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

    significantDiffs.forEach((diff, index) => {
        const diffItem = createDiffItem(diff, index);
        container.appendChild(diffItem);
    });
}

function createDiffItem(diff, index) {
    const div = document.createElement('div');
    div.className = 'diff-item';

    let headerText = '';
    switch(diff.type) {
        case 'modified':
            headerText = `Modified (Line ${diff.leftIndex + 1} / ${diff.rightIndex + 1})`;
            break;
        case 'added':
            headerText = `Added (Line ${diff.rightIndex + 1} in Document 2)`;
            break;
        case 'deleted':
            headerText = `Deleted (Line ${diff.leftIndex + 1} in Document 1)`;
            break;
    }

    // Check if user wants to see cleaned or original text
    const showCleaned = document.getElementById('showCleaned').checked;

    // Use cleaned text for display if checkbox is checked, otherwise use original
    const displayLeft = showCleaned && diff.leftCleaned !== undefined && diff.leftCleaned !== null
        ? diff.leftCleaned
        : diff.left;
    const displayRight = showCleaned && diff.rightCleaned !== undefined && diff.rightCleaned !== null
        ? diff.rightCleaned
        : diff.right;

    div.innerHTML = `
        <div class="diff-header">${headerText}</div>
        <div class="diff-column-headers">
            <div class="column-header">Transcript without codes</div>
            <div class="column-header">Transcript with codes</div>
        </div>
        <div class="diff-content">
            ${diff.left !== null ? `
                <div class="diff-option ${diff.type === 'deleted' ? 'deleted' : ''}" id="diff-${index}-left">
                    <label class="diff-radio">
                        <input type="radio" name="diff-${index}" value="left" onchange="handleSelection(${index}, 'left')">
                        <div class="diff-text">${escapeHtml(displayLeft) || '<em>Empty line</em>'}</div>
                    </label>
                </div>
            ` : '<div class="diff-option deleted"><div class="diff-text"><em>Not in Document 1</em></div></div>'}

            ${diff.right !== null ? `
                <div class="diff-option ${diff.type === 'added' ? 'added' : ''}" id="diff-${index}-right">
                    <label class="diff-radio">
                        <input type="radio" name="diff-${index}" value="right" onchange="handleSelection(${index}, 'right')">
                        <div class="diff-text">${escapeHtml(displayRight) || '<em>Empty line</em>'}</div>
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
    const textLines = [];

    const significantDiffs = differences.filter(d => d.type !== 'unchanged');
    let diffIndex = 0;

    differences.forEach((diff, originalIndex) => {
        let finalText = '';

        if (diff.type === 'unchanged') {
            // Keep unchanged lines as-is
            finalText = diff.left || diff.right;
        } else {
            // Check if user made a selection
            const selection = selections[diffIndex];

            if (selection) {
                if (selection.choice === 'left' && diff.left !== null) {
                    finalText = diff.left;
                } else if (selection.choice === 'right' && diff.right !== null) {
                    finalText = diff.right;
                } else if (selection.choice === 'manual') {
                    finalText = selection.customText || '';
                }
            } else {
                // No selection made - mark as unresolved
                if (diff.type === 'modified') {
                    finalText = `[UNRESOLVED - DOC1]: ${diff.left} | [DOC2]: ${diff.right}`;
                } else if (diff.type === 'added') {
                    finalText = `[UNRESOLVED - ADDED]: ${diff.right}`;
                } else if (diff.type === 'deleted') {
                    finalText = `[UNRESOLVED - DELETED]: ${diff.left}`;
                }
            }
            diffIndex++;
        }

        // Only add line if there's content
        if (finalText) {
            textLines.push(finalText);
        }
    });

    const textContent = textLines.join('\n');

    // Download the TXT file
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged-transcript-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Final transcript exported as TXT successfully!');
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
