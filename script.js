// Retrieve grid settings from local storage or set default values
let radialDivisions = parseInt(localStorage.getItem('radialDivisions'));
if (
    isNaN(radialDivisions) ||
    radialDivisions < 1 ||
    radialDivisions > 8
) {
    radialDivisions = 3; // Default value
}

let circumferentialDivisions = parseInt(
    localStorage.getItem('circumferentialDivisions')
);
if (
    isNaN(circumferentialDivisions) ||
    circumferentialDivisions < 1 ||
    circumferentialDivisions > 20
) {
    circumferentialDivisions = 8; // Default value
}

// Retrieve showColors state from localStorage or set default
let showColors = localStorage.getItem('showColors') === 'true';

// Get canvas and context
const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');

// Get the Show Colors button
const showColorsButton = document.getElementById('show-colors-button');

// Set initial button text based on showColors state
showColorsButton.textContent = showColors ? 'Hide Colors' : 'Show Colors';

// Define maxRadius
const maxRadius = Math.min(canvas.width, canvas.height) / 2 - 10;

// Get the note display element
const noteDisplay = document.getElementById('note-display');

// Define available octaves
const N_min = 2; // Minimum octave
const N_max = 7; // Maximum octave
const totalOctaves = N_max - N_min + 1; // Total available octaves

// Compute skipped radial levels
let skipRadialLevels = 0;
if (radialDivisions > totalOctaves) {
    skipRadialLevels = radialDivisions - totalOctaves;
}

const adjustedRadialDivisions = radialDivisions - skipRadialLevels;

// Determine octave shift based on radial divisions
let octaveShift = 0;
if (radialDivisions <= 2) {
    octaveShift = 2; // Shift up by 2 octaves
} else if (radialDivisions <= 5) {
    octaveShift = 1; // Shift up by 1 octave
} else {
    octaveShift = 0; // No shift for radial divisions 6,7,8
}

// Function to store the flashing sectors
let flashingSectors = [];

// Function to store the highlighted sectors
let highlightedSectors = [];

// Initialize the piano instrument using Tone.js
let piano;
let pianoLoaded = false;

// Variable to store active notes
let activeNotes = [];

// Variables for learning mode
let learningMode = false;

// Add references to new HTML elements
const learningModeButton = document.getElementById('learning-mode-button');
const learningModeContainer = document.getElementById('learning-mode-container');
const startLearningButton = document.getElementById('start-learning-button');
const optionsContainer = document.getElementById('options-container');
const feedbackPopup = document.getElementById('feedback-popup');

// Variables for learning mode settings
let cueModalities = ['piano', 'color', 'spatial', 'coordinate'];
let recallModalities = ['color', 'spatial', 'coordinate'];
let cueInterval = 5; // default to 5 seconds

let learningTimeout = null;
let awaitingResponse = false;
let currentCue = null;

// Function to initialize the piano instrument
async function initializePiano() {
    if (pianoLoaded) return; // Prevent re-initialization

    // Use Tone.Sampler to load the piano samples
    piano = new Tone.Sampler({
        urls: {
            "A0": "A0.mp3",
            "C1": "C1.mp3",
            "D#1": "Ds1.mp3",
            "F#1": "Fs1.mp3",
            "A1": "A1.mp3",
            "C2": "C2.mp3",
            "D#2": "Ds2.mp3",
            "F#2": "Fs2.mp3",
            "A2": "A2.mp3",
            "C3": "C3.mp3",
            "D#3": "Ds3.mp3",
            "F#3": "Fs3.mp3",
            "A3": "A3.mp3",
            "C4": "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            "A4": "A4.mp3",
            "C5": "C5.mp3",
            "D#5": "Ds5.mp3",
            "F#5": "Fs5.mp3",
            "A5": "A5.mp3",
            "C6": "C6.mp3",
            "D#6": "Ds6.mp3",
            "F#6": "Fs6.mp3",
            "A6": "A6.mp3",
            "C7": "C7.mp3",
            "D#7": "Ds7.mp3",
            "F#7": "Fs7.mp3",
            "A7": "A7.mp3",
            "C8": "C8.mp3"
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/"
    }).toDestination();

    // Wait for the piano samples to load
    await piano.loaded;
    pianoLoaded = true;
    console.log("Piano samples loaded.");
}

// Function to start audio context and initialize piano
async function startAudio() {
    if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log('Audio context started.');
    }
    await initializePiano();
}

// Function to get the center coordinates of a grid space
function getGridSpaceCenterCoordinates(radialIndex, circumferentialIndex) {
    const divisionRadius = maxRadius / radialDivisions;

    const innerRadius = divisionRadius * (skipRadialLevels + radialIndex);
    const outerRadius = divisionRadius * (skipRadialLevels + radialIndex + 1);
    const centerRadius = (innerRadius + outerRadius) / 2;

    const angleStep = 2 * Math.PI / circumferentialDivisions;
    const startAngle = angleStep * circumferentialIndex;
    const endAngle = angleStep * (circumferentialIndex + 1);
    let centerAngle = (startAngle + endAngle) / 2;

    // Adjust centerAngle to be between 0 and 2π
    if (centerAngle < 0) {
        centerAngle += 2 * Math.PI;
    }

    return { r: centerRadius, theta: centerAngle };
}

// Function to draw the grid, modified to handle flashing and highlighted sectors
// Function to draw the grid, modified to handle flashing and highlighted sectors
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const divisionRadius = maxRadius / radialDivisions;

    // Draw sectors
    for (let i = 0; i < adjustedRadialDivisions; i++) {
        let innerRadius = divisionRadius * (skipRadialLevels + i);
        let outerRadius = divisionRadius * (skipRadialLevels + i + 1);

        // Calculate lightness for radial divisions
        let adjustedIndex = i;
        let adjustedTotal = adjustedRadialDivisions - 1;
        let lightness = 50;
        if (adjustedTotal > 0) {
            lightness = 20 + (adjustedIndex / adjustedTotal) * 60; // From 20% to 80%
        }

        for (let j = 0; j < circumferentialDivisions; j++) {
            let startAngle = (2 * Math.PI / circumferentialDivisions) * j;
            let endAngle = (2 * Math.PI / circumferentialDivisions) * (j + 1);

            // Calculate hue for circumferential divisions
            let hue = (j / circumferentialDivisions) * 360;

            // Determine if the sector is flashing or highlighted
            let isFlashing = flashingSectors.some(
                (sector) =>
                    sector.radialIndex === i &&
                    sector.circumferentialIndex === j
            );

            let isHighlighted = highlightedSectors.some(
                (sector) =>
                    sector.radialIndex === i &&
                    sector.circumferentialIndex === j
            );

            // Set fill style
            if (showColors || (isFlashing && !learningMode)) {
                // If showColors is true, or the sector is flashing and learningMode is off
                ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
            } else {
                ctx.fillStyle = '#FFFFFF'; // Default background color
            }

            // Draw sector
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.lineTo(centerX, centerY);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();

            // Set stroke style and width
            if (isHighlighted) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4; // Bold outline for highlighted sectors
            } else {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1; // Normal outline
            }

            // Draw sector borders
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.lineTo(centerX, centerY);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

drawGrid();

// Variables to manage passive mode
let passiveMode = false;
let passiveModeTimeout = null;
let activePassiveNotes = [];
const maxActivePassiveNotes = 4;

// Get the Passive Mode button
const passiveModeButton = document.getElementById('passive-mode-button');

// Function to start passive mode
function startPassiveMode() {
    passiveMode = true;
    passiveModeButton.textContent = 'Stop';

    function scheduleNextNote() {
        if (!passiveMode) return;

        const delay = Math.random() * 2000 + 1000; // 1 to 3 seconds
        passiveModeTimeout = setTimeout(() => {
            if (!passiveMode) return;

            // Limit the number of active notes
            if (activePassiveNotes.length >= maxActivePassiveNotes) {
                scheduleNextNote();
                return;
            }

            // Randomly select a grid space
            const radialIndex = Math.floor(Math.random() * adjustedRadialDivisions);
            const circumferentialIndex = Math.floor(Math.random() * circumferentialDivisions);

            // Assign octave based on radial index and octave shift
            let octave = N_min + radialIndex + octaveShift;
            // Ensure octave is within N_min and N_max
            octave = Math.min(Math.max(octave, N_min), N_max);

            // Base frequency for octave
            const baseFrequency = 261.63 * Math.pow(2, octave - 4); // Middle C frequency adjusted by octave

            // Calculate frequency within the octave
            const frequency = baseFrequency * Math.pow(2, circumferentialIndex / circumferentialDivisions);

            // Ensure frequency is within 60 Hz and 4100 Hz
            if (frequency < 60 || frequency > 4100) {
                scheduleNextNote();
                return;
            }

            // Adjust volume for low frequencies
            let volumeMultiplier = 1;
            if (frequency < 200) {
                volumeMultiplier = 5;
            } else if (frequency < 400) {
                volumeMultiplier = 3;
            } else if (frequency < 800) {
                volumeMultiplier = 1.5;
            }

            // Determine how long the tone and color should stay on (1.5 to 4 seconds)
            const noteDuration = Math.random() * 2500 + 1500; // 1500ms to 4000ms

            // Play the frequency for the duration of the note
            playFrequency(frequency, noteDuration / 1000, volumeMultiplier);

            // Compute center coordinates
            const centerCoordinates = getGridSpaceCenterCoordinates(radialIndex, circumferentialIndex);
            const rValue = centerCoordinates.r;
            const thetaValue = centerCoordinates.theta;

            // Add the note to the active notes list
            activeNotes.push({
                frequency: frequency,
                r: rValue,
                theta: thetaValue
            });

            // Update the note display
            updateNoteDisplay();

            // Handle flashing of the sector
            flashingSectors.push({
                radialIndex: radialIndex,
                circumferentialIndex: circumferentialIndex,
            });

            // Keep track of active passive notes
            activePassiveNotes.push({
                radialIndex: radialIndex,
                circumferentialIndex: circumferentialIndex,
            });

            // Redraw the grid to show the flashing sector
            drawGrid();

            // Remove the flashing sector and note after the note duration
            setTimeout(() => {
                // Remove the sector from flashingSectors
                flashingSectors = flashingSectors.filter(
                    (sector) =>
                        !(
                            sector.radialIndex === radialIndex &&
                            sector.circumferentialIndex === circumferentialIndex
                        )
                );
                // Remove from activePassiveNotes
                activePassiveNotes = activePassiveNotes.filter(
                    (note) =>
                        !(
                            note.radialIndex === radialIndex &&
                            note.circumferentialIndex === circumferentialIndex
                        )
                );

                // Remove the note from the active notes list
                activeNotes = activeNotes.filter(
                    (note) => note.frequency !== frequency
                );

                // Update the note display
                updateNoteDisplay();

                // Redraw the grid to remove the flashing sector
                drawGrid();
            }, noteDuration);

            // Schedule the next note
            scheduleNextNote();
        }, delay);
    }

    scheduleNextNote();
}

// Function to update the note display with active notes
function updateNoteDisplay() {
    if (activeNotes.length > 0) {
        let displayText = 'Playing notes:\n';
        displayText += activeNotes.map(note =>
            `Frequency: ${note.frequency.toFixed(2)} Hz, r: ${note.r.toFixed(2)}, θ: ${note.theta.toFixed(2)} rad`
        ).join('\n');
        noteDisplay.textContent = displayText;
    } else {
        noteDisplay.textContent = '';
    }
}

// Function to stop passive mode
function stopPassiveMode() {
    passiveMode = false;
    passiveModeButton.textContent = 'Passive Mode';
    // Clear any scheduled timeouts
    if (passiveModeTimeout) {
        clearTimeout(passiveModeTimeout);
        passiveModeTimeout = null;
    }
    // Clear all active passive notes
    activePassiveNotes = [];
    flashingSectors = [];
    activeNotes = [];
    updateNoteDisplay();
    // Redraw the grid to remove any flashing sectors
    drawGrid();
}

// Handle Passive Mode button click
passiveModeButton.addEventListener('click', async function () {
    // Start the audio context and initialize piano if not already done
    await startAudio();

    if (!passiveMode) {
        startPassiveMode();
    } else {
        stopPassiveMode();
    }
});

// Navigate to settings page when Settings button is clicked
document
    .getElementById('settings-button')
    .addEventListener('click', () => {
        window.location.href = 'settings.html';
    });

// Toggle colors when "Show Colors" button is clicked
showColorsButton.addEventListener('click', async function () {
    // Start the audio context and initialize piano if not already done
    await startAudio();

    showColors = !showColors;
    localStorage.setItem('showColors', showColors);
    drawGrid();
    this.textContent = showColors ? 'Hide Colors' : 'Show Colors';
});

// Update playFrequency function to use the piano instrument
function playFrequency(frequency, duration, volumeMultiplier = 1) {
    if (!pianoLoaded) {
        console.warn("Piano samples not loaded yet.");
        return;
    }

    // Set the volume (increase the base gain if needed)
    piano.volume.value = Tone.gainToDb(0.2 * volumeMultiplier); // Adjusted volume

    // Play the note using the frequency directly
    piano.triggerAttackRelease(frequency, duration);
}

// Handle click events on the canvas
canvas.addEventListener('click', async function (event) {
    // Start the audio context and initialize piano if not already done
    await startAudio();

    // Get click coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - canvas.width / 2;
    const y = event.clientY - rect.top - canvas.height / 2;

    // Convert to polar coordinates
    const r = Math.sqrt(x * x + y * y);
    let theta = Math.atan2(y, x); // from -π to π

    if (theta < 0) {
        theta += 2 * Math.PI; // Convert to [0, 2π]
    }

    const divisionRadius = maxRadius / radialDivisions;
    const innerRadiusLimit = divisionRadius * skipRadialLevels;

    // Check if click is within the grid
    if (r < innerRadiusLimit || r > maxRadius) {
        // Click is outside the valid radial divisions
        return;
    }

    // Calculate adjusted radial index
    const radialIndex = Math.floor(
        (r - innerRadiusLimit) / divisionRadius
    );
    if (radialIndex < 0 || radialIndex >= adjustedRadialDivisions) {
        return;
    }

    // Calculate circumferential index
    const circumferentialIndex = Math.floor(
        theta / (2 * Math.PI / circumferentialDivisions)
    );

    // Assign octave based on radial index and octave shift
    let octave = N_min + radialIndex + octaveShift;

    // Ensure octave is within N_min and N_max
    octave = Math.min(Math.max(octave, N_min), N_max);

    // Base frequency for octave
    const baseFrequency =
        261.63 * Math.pow(2, octave - 4); // Middle C frequency adjusted by octave

    // Calculate frequency within the octave
    const frequency =
        baseFrequency *
        Math.pow(
            2,
            circumferentialIndex / circumferentialDivisions
        );

    // Ensure frequency is within 60 Hz and 4100 Hz
    if (frequency < 60 || frequency > 4100) {
        return;
    }

    // Adjust volume for low frequencies
    let volumeMultiplier = 1;
    if (frequency < 200) {
        volumeMultiplier = 5;
    } else if (frequency < 400) {
        volumeMultiplier = 3;
    } else if (frequency < 800) {
        volumeMultiplier = 1.5;
    }

    // Play the frequency
    playFrequency(frequency, 1, volumeMultiplier); // 1-second duration

    // Compute center coordinates
    const centerCoordinates = getGridSpaceCenterCoordinates(radialIndex, circumferentialIndex);
    const rValue = centerCoordinates.r;
    const thetaValue = centerCoordinates.theta;

    // Add the note to the active notes list
    activeNotes.push({
        frequency: frequency,
        r: rValue,
        theta: thetaValue
    });

    // Update the note display
    updateNoteDisplay();

    // Remove the note after 1 second
    setTimeout(() => {
        // Remove the note from the active notes list
        activeNotes = activeNotes.filter(
            (note) => note.frequency !== frequency
        );
        // Update the note display
        updateNoteDisplay();
    }, 1000);

    // Handle flashing of the sector when colors are hidden
    if (!showColors) {
        // Add the sector to the flashing sectors list
        flashingSectors.push({
            radialIndex: radialIndex,
            circumferentialIndex: circumferentialIndex,
        });

        // Redraw the grid to show the flashing sector
        drawGrid();

        // Remove the sector from the flashing list after 1 second
        setTimeout(() => {
            // Remove the sector from flashingSectors
            flashingSectors = flashingSectors.filter(
                (sector) =>
                    !(
                        sector.radialIndex === radialIndex &&
                        sector.circumferentialIndex === circumferentialIndex
                    )
            );
            // Redraw the grid to remove the flashing sector
            drawGrid();
        }, 1000);
    }

    // Handle spatial recall if awaiting response in learning mode
    if (learningMode && awaitingResponse && currentCue && currentCue.recallModality === 'spatial') {
        // Check if the clicked grid space matches the expected one
        if (
            radialIndex === currentCue.radialIndex &&
            circumferentialIndex === currentCue.circumferentialIndex
        ) {
            handleUserResponse(true);
        } else {
            handleUserResponse(false);
        }
    }
});

// Function to toggle learning mode
function toggleLearningMode() {
    learningMode = !learningMode;
    if (learningMode) {
        learningModeButton.textContent = 'Stop';
        learningModeContainer.style.display = 'block';
        // Hide other elements if necessary
    } else {
        learningModeButton.textContent = 'Learning Mode';
        learningModeContainer.style.display = 'none';
        optionsContainer.style.display = 'none';
        feedbackPopup.style.display = 'none';
        // Clear any timeouts
        if (learningTimeout) {
            clearTimeout(learningTimeout);
            learningTimeout = null;
        }
        awaitingResponse = false;
        startLearningButton.disabled = false;
    }
}

// Handle Learning Mode button click
learningModeButton.addEventListener('click', toggleLearningMode);

// Function to start learning
function startLearning() {
    // Get selected settings
    cueModalities = [];
    recallModalities = [];
    ['piano', 'color', 'spatial', 'coordinate'].forEach(modality => {
        if (document.getElementById(`cue-${modality}`).checked) {
            cueModalities.push(modality);
        }
        if (modality !== 'piano' && document.getElementById(`recall-${modality}`).checked) {
            recallModalities.push(modality);
        }
    });
    cueInterval = parseInt(document.getElementById('cue-interval').value) || 5;

    // Validate settings
    if (cueModalities.length === 0 || recallModalities.length === 0) {
        alert('Please select at least one cue and one recall modality.');
        startLearningButton.disabled = false;
        return;
    }

    startLearningButton.disabled = true;
    scheduleNextCue();
}

// Handle Start Learning button click
startLearningButton.addEventListener('click', startLearning);

// Function to schedule the next cue
function scheduleNextCue() {
    if (!learningMode) return;

    // Start next cue immediately after feedback
    learningTimeout = setTimeout(() => {
        presentCue();
    }, 500); // Short delay to allow feedback popup to disappear
}

// Function to present a cue
function presentCue() {
    if (!learningMode) return;

    // Randomly select cue and recall modalities
    const cueModality = cueModalities[Math.floor(Math.random() * cueModalities.length)];
    let recallOptions = recallModalities.filter(modality => modality !== cueModality);

    if (recallOptions.length === 0) {
        // If recall modalities are the same as cue modality, skip this cue
        scheduleNextCue();
        return;
    }

    const recallModality = recallOptions[Math.floor(Math.random() * recallOptions.length)];

    // Randomly select a grid space
    const radialIndex = Math.floor(Math.random() * adjustedRadialDivisions);
    const circumferentialIndex = Math.floor(Math.random() * circumferentialDivisions);

    // Get associated data
    const frequencyData = getFrequencyData(radialIndex, circumferentialIndex);
    const centerCoordinates = getGridSpaceCenterCoordinates(radialIndex, circumferentialIndex);
    const colorData = getColorData(radialIndex, circumferentialIndex);

    currentCue = {
        cueModality,
        recallModality,
        radialIndex,
        circumferentialIndex,
        frequency: frequencyData.frequency,
        coordinates: centerCoordinates,
        color: colorData.color
    };

    // Present the cue based on modality
    switch (cueModality) {
        case 'piano':
            playFrequency(currentCue.frequency, 1);
            break;
        case 'color':
            flashColor(currentCue.color);
            break;
        case 'spatial':
            highlightGridSpace(currentCue.radialIndex, currentCue.circumferentialIndex);
            break;
        case 'coordinate':
            showCoordinatePopup(currentCue.coordinates);
            break;
    }

    // Prepare recall options
    prepareRecallOptions(currentCue, recallModality);
}

// Function to get frequency data
function getFrequencyData(radialIndex, circumferentialIndex) {
    // Calculate frequency as per your existing logic
    let octave = N_min + radialIndex + octaveShift;
    octave = Math.min(Math.max(octave, N_min), N_max);
    const baseFrequency = 261.63 * Math.pow(2, octave - 4);
    const frequency = baseFrequency * Math.pow(2, circumferentialIndex / circumferentialDivisions);

    return { frequency };
}

// Function to get color data
function getColorData(radialIndex, circumferentialIndex) {
    // Calculate color as per your existing logic
    let adjustedIndex = radialIndex;
    let adjustedTotal = adjustedRadialDivisions - 1;
    let lightness = 50;
    if (adjustedTotal > 0) {
        lightness = 20 + (adjustedIndex / adjustedTotal) * 60;
    }
    let hue = (circumferentialIndex / circumferentialDivisions) * 360;
    const color = `hsl(${hue}, 100%, ${lightness}%)`;

    return { color };
}

// Function to flash a color
function flashColor(color) {
    document.body.style.backgroundColor = color;
    setTimeout(() => {
        document.body.style.backgroundColor = '';
    }, 500);
}

// Function to highlight a grid space
function highlightGridSpace(radialIndex, circumferentialIndex) {
    if (learningMode) {
        // In learning mode, highlight the border
        highlightedSectors.push({
            radialIndex: radialIndex,
            circumferentialIndex: circumferentialIndex,
        });
        drawGrid();
        setTimeout(() => {
            highlightedSectors = [];
            drawGrid();
        }, 500);
    } else {
        // When not in learning mode, fill the sector
        flashingSectors.push({
            radialIndex: radialIndex,
            circumferentialIndex: circumferentialIndex,
        });
        drawGrid();
        setTimeout(() => {
            flashingSectors = [];
            drawGrid();
        }, 500);
    }
}

// Function to show coordinate popup
function showCoordinatePopup(coordinates) {
    feedbackPopup.style.display = 'block';
    feedbackPopup.style.backgroundColor = '#000';
    feedbackPopup.textContent = `r: ${coordinates.r.toFixed(2)}, θ: ${coordinates.theta.toFixed(2)} rad`;
    setTimeout(() => {
        feedbackPopup.style.display = 'none';
    }, 1000);
}

// Function to prepare recall options
function prepareRecallOptions(cue, recallModality) {
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'block';
    awaitingResponse = true;

    let options = [];
    switch (recallModality) {
        case 'color':
            options = generateColorOptions(cue.color);
            break;
        case 'coordinate':
            options = generateCoordinateOptions(cue.coordinates);
            break;
        case 'spatial':
            // No options needed; user will click on grid
            optionsContainer.style.display = 'none';
            return; // Exit the function early
    }

    options.forEach(option => {
        const optionButton = document.createElement('button');
        optionButton.classList.add('option-button');
        if (recallModality === 'color') {
            // Display color swatches
            optionButton.style.backgroundColor = option.value;
            optionButton.textContent = '';
            optionButton.style.width = '50px';
            optionButton.style.height = '50px';
            optionButton.style.margin = '5px';
            optionButton.style.border = '1px solid #000';
        } else {
            // For coordinate, display text labels
            optionButton.textContent = option.label;
            optionButton.style.margin = '5px';
            optionButton.style.width = '180px';
        }
        optionButton.addEventListener('click', () => handleUserResponse(option.isCorrect));
        optionsContainer.appendChild(optionButton);
    });
}

// Function to generate color options
function generateColorOptions(correctColor) {
    let options = [{ value: correctColor, isCorrect: true }];
    let colorSet = new Set();
    colorSet.add(correctColor);
    let attempts = 0;
    const maxAttempts = 1000;

    while (options.length < 7 && attempts < maxAttempts) {
        attempts++;
        const radialIndex = Math.floor(Math.random() * adjustedRadialDivisions);
        const circumferentialIndex = Math.floor(Math.random() * circumferentialDivisions);
        const colorData = getColorData(radialIndex, circumferentialIndex);
        if (!colorSet.has(colorData.color)) {
            colorSet.add(colorData.color);
            options.push({ value: colorData.color, isCorrect: false });
        }
    }

    if (options.length < 7) {
        console.warn('Not enough unique colors available. Reducing the number of options.');
    }

    // Shuffle options
    options = options.sort(() => Math.random() - 0.5);
    return options;
}

// Function to generate coordinate options
function generateCoordinateOptions(correctCoordinates) {
    let options = [{ coordinates: correctCoordinates, isCorrect: true }];
    while (options.length < 7) {
        const radialIndex = Math.floor(Math.random() * adjustedRadialDivisions);
        const circumferentialIndex = Math.floor(Math.random() * circumferentialDivisions);
        const coordinates = getGridSpaceCenterCoordinates(radialIndex, circumferentialIndex);
        if (!options.some(opt => opt.coordinates.r === coordinates.r && opt.coordinates.theta === coordinates.theta)) {
            options.push({ coordinates, isCorrect: false });
        }
    }
    // Shuffle options
    options = options.sort(() => Math.random() - 0.5);
    // Convert to labels
    return options.map(opt => ({
        label: `r: ${opt.coordinates.r.toFixed(2)}, θ: ${opt.coordinates.theta.toFixed(2)} rad`,
        isCorrect: opt.isCorrect
    }));
}

// Function to handle user response
function handleUserResponse(isCorrect) {
    if (!awaitingResponse) return;
    awaitingResponse = false;

    showFeedback(isCorrect);

    // Prepare for next cue
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none';
    scheduleNextCue();
}

// Function to show feedback
function showFeedback(isCorrect) {
    feedbackPopup.style.display = 'block';
    feedbackPopup.style.backgroundColor = isCorrect ? 'green' : 'red';
    feedbackPopup.textContent = isCorrect ? 'CORRECT' : 'INCORRECT';
    setTimeout(() => {
        feedbackPopup.style.display = 'none';
    }, 500);
}
