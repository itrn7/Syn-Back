// Get input elements
const radialInput = document.getElementById('radial-divisions');
const circumferentialInput = document.getElementById('circumferential-divisions');
const applyButton = document.getElementById('apply-button');

// Load current settings into inputs
let radialDivisions = parseInt(localStorage.getItem('radialDivisions'));
if (isNaN(radialDivisions) || radialDivisions < 1 || radialDivisions > 8) {
    radialDivisions = 3; // Default value
}

let circumferentialDivisions = parseInt(localStorage.getItem('circumferentialDivisions'));
if (isNaN(circumferentialDivisions) || circumferentialDivisions < 1 || circumferentialDivisions > 20) {
    circumferentialDivisions = 8; // Default value
}

radialInput.value = radialDivisions;
circumferentialInput.value = circumferentialDivisions;

// Save settings and return to main page when Apply button is clicked
applyButton.addEventListener('click', () => {
    let radialValue = parseInt(radialInput.value);
    let circumferentialValue = parseInt(circumferentialInput.value);

    // Validate inputs
    if (isNaN(radialValue) || radialValue < 1 || radialValue > 8) {
        alert('Please enter a valid number for Radial Divisions (1-8).');
        return;
    }
    if (isNaN(circumferentialValue) || circumferentialValue < 1 || circumferentialValue > 20) {
        alert('Please enter a valid number for Circumferential Divisions (1-20).');
        return;
    }

    // Save settings to local storage
    localStorage.setItem('radialDivisions', radialValue);
    localStorage.setItem('circumferentialDivisions', circumferentialValue);

    // Redirect to main page
    window.location.href = 'index.html';
});
