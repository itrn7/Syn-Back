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

// Initialize the piano instrument using Tone.js
let piano;
let pianoLoaded = false;

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

// Function to draw the grid, modified to handle flashing sectors
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const divisionRadius = maxRadius / radialDivisions;

    // Determine whether to show colors or flashing sectors
    if (showColors || flashingSectors.length > 0) {
        for (let i = 0; i < radialDivisions; i++) {
            let innerRadius = divisionRadius * i;
            let outerRadius = divisionRadius * (i + 1);

            // Calculate lightness for radial divisions
            let adjustedIndex = i - skipRadialLevels;
            let adjustedTotal = adjustedRadialDivisions - 1;
            let lightness;
            if (adjustedTotal <= 0) {
                lightness = 50;
            } else {
                lightness =
                    20 + (adjustedIndex / adjustedTotal) * 60; // From 20% to 80%
            }

            for (let j = 0; j < circumferentialDivisions; j++) {
                let startAngle =
                    (2 * Math.PI / circumferentialDivisions) * j;
                let endAngle =
                    (2 * Math.PI / circumferentialDivisions) * (j + 1);

                // Calculate hue for circumferential divisions
                let hue = (j / circumferentialDivisions) * 360;

                // Check if this sector should be colored (flashing)
                let isFlashing = flashingSectors.some(
                    (sector) =>
                        sector.radialIndex === i &&
                        sector.circumferentialIndex === j
                );

                // Determine if this radial level corresponds to a valid octave
                let isValidRadialLevel = i >= skipRadialLevels;

                // Set fill style
                if ((showColors && isValidRadialLevel) || isFlashing) {
                    ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
                } else {
                    ctx.fillStyle = '#FFFFFF'; // Default background color
                }

                // Draw sector
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(
                    centerX,
                    centerY,
                    outerRadius,
                    startAngle,
                    endAngle
                );
                ctx.lineTo(centerX, centerY);
                ctx.arc(
                    centerX,
                    centerY,
                    innerRadius,
                    endAngle,
                    startAngle,
                    true
                );
                ctx.closePath();
                ctx.fill();

                // Draw sector borders
                ctx.strokeStyle = '#000';
                ctx.stroke();
            }
        }
    } else {
        // If not showing colors and no flashing sectors, draw the grid lines
        // Draw concentric circles (radial divisions)
        for (let i = 1; i <= radialDivisions; i++) {
            ctx.beginPath();
            ctx.arc(
                centerX,
                centerY,
                divisionRadius * i,
                0,
                2 * Math.PI
            );
            ctx.stroke();
        }

        // Draw radial lines (circumferential divisions)
        for (let i = 0; i < circumferentialDivisions; i++) {
            const angle = (2 * Math.PI / circumferentialDivisions) * i;
            const x = centerX + maxRadius * Math.cos(angle);
            const y = centerY + maxRadius * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
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

            // Get the actual radial index accounting for skipped levels
            const actualRadialIndex = skipRadialLevels + radialIndex;

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

            // Handle flashing of the sector
            flashingSectors.push({
                radialIndex: actualRadialIndex,
                circumferentialIndex: circumferentialIndex,
            });

            // Keep track of active passive notes
            activePassiveNotes.push({
                radialIndex: actualRadialIndex,
                circumferentialIndex: circumferentialIndex,
            });

            // Redraw the grid to show the flashing sector
            drawGrid();

            // Remove the flashing sector after the note duration
            setTimeout(() => {
                // Remove the sector from flashingSectors
                flashingSectors = flashingSectors.filter(
                    (sector) =>
                        !(
                            sector.radialIndex === actualRadialIndex &&
                            sector.circumferentialIndex === circumferentialIndex
                        )
                );
                // Remove from activePassiveNotes
                activePassiveNotes = activePassiveNotes.filter(
                    (note) =>
                        !(
                            note.radialIndex === actualRadialIndex &&
                            note.circumferentialIndex === circumferentialIndex
                        )
                );
                // Redraw the grid to remove the flashing sector
                drawGrid();
            }, noteDuration);

            // Schedule the next note
            scheduleNextNote();
        }, delay);
    }

    scheduleNextNote();
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

    // Display the frequency
    noteDisplay.textContent = `Playing frequency: ${frequency.toFixed(
        2
    )} Hz`;

    // Log the mapping
    console.log(
        `Clicked on sector: radialIndex=${radialIndex}, circumferentialIndex=${circumferentialIndex}`
    );
    console.log(`Playing frequency: ${frequency.toFixed(2)} Hz`);

    // Handle flashing of the sector when colors are hidden
    if (!showColors) {
        // Add the sector to the flashing sectors list
        flashingSectors.push({
            radialIndex: skipRadialLevels + radialIndex,
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
                        sector.radialIndex ===
                            skipRadialLevels + radialIndex &&
                        sector.circumferentialIndex === circumferentialIndex
                    )
            );
            // Redraw the grid to remove the flashing sector
            drawGrid();
        }, 1000);
    }
});

