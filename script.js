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

// Create AudioContext
const audioCtx = new (window.AudioContext ||
    window.webkitAudioContext)();

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

// Function to draw the grid, modified to handle flashing sectors
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const divisionRadius = maxRadius / radialDivisions;

    // Fill the inner circle with white (if any radial levels are skipped)
    if (skipRadialLevels > 0) {
        ctx.beginPath();
        ctx.arc(
            centerX,
            centerY,
            divisionRadius * skipRadialLevels,
            0,
            2 * Math.PI
        );
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    }

    // Determine whether to show colors or flashing sectors
    if (showColors || flashingSectors.length > 0) {
        for (let i = skipRadialLevels; i < radialDivisions; i++) {
            let innerRadius = divisionRadius * i;
            let outerRadius = divisionRadius * (i + 1);

            // Calculate lightness for radial divisions
            let adjustedIndex = i - skipRadialLevels;
            let adjustedTotal = adjustedRadialDivisions - 1;
            let lightness;
            if (adjustedTotal === 0) {
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

                // Set fill style
                if (showColors || isFlashing) {
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
        for (let i = skipRadialLevels + 1; i <= radialDivisions; i++) {
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

// Navigate to settings page when Settings button is clicked
document
    .getElementById('settings-button')
    .addEventListener('click', () => {
        window.location.href = 'settings.html';
    });

// Toggle colors when "Show Colors" button is clicked
showColorsButton.addEventListener('click', function () {
    showColors = !showColors;
    localStorage.setItem('showColors', showColors);
    drawGrid();
    this.textContent = showColors ? 'Hide Colors' : 'Show Colors';
});

// Play frequency function with adjustable volume
function playFrequency(frequency, duration, volumeMultiplier = 1) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Adjust volume based on multiplier
    gainNode.gain.value = 0.1 * volumeMultiplier; // Base volume is 0.1

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

// Handle click events on the canvas
canvas.addEventListener('click', function (event) {
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
