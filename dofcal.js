// Function to calculate the hyperfocal distance
function hyperfocalDistance(f, N, c) {
    return (f * f) / (N * c);
}

// Function for calculating the depth of field equation
function dofEquation(u, H, f, desiredDof) {
    let D_n = (H * u) / (H + (u - f));
    let D_f = (H * u) / (H - (u - f));
    let dof = D_f - D_n;
    return dof - desiredDof;
}

// Approximate the derivative of the depth of field equation
function derivativeDoF(u, H, f) {
    let h = 0.0001; // Small value for numerical differentiation
    let dof1 = dofEquation(u + h, H, f, 0);
    let dof2 = dofEquation(u - h, H, f, 0);
    return (dof1 - dof2) / (2 * h);
}

// Newton-Raphson method to calculate the subject distance
function calculateSubjectDistance(f, N, c, desiredDof, initialGuess) {
    let u = initialGuess;
    let tolerance = 0.001; // Stop when the solution changes very little
    let maxIterations = 1000;
    let iteration = 0;

    while (iteration < maxIterations) {
        let H = hyperfocalDistance(f, N, c);
        let funcValue = dofEquation(u, H, f, desiredDof);
        let derivativeValue = derivativeDoF(u, H, f);

        if (Math.abs(derivativeValue) < 1e-6) {
            break; // Prevent division by zero or extremely small values
        }

        let newU = u - funcValue / derivativeValue;

        if (Math.abs(newU - u) < tolerance) {
            return newU;
        }

        u = newU;
        iteration++;
    }

    return null; // Return null if the method doesn't converge
}

// Helper function to convert units to millimeters
function convertToMillimeters(value, unit) {
    switch (unit) {
        case 'mm':
            return value;
        case 'in':
            return value * 25.4; // Convert inches to millimeters
        case 'm':
            return value * 1000; // Convert meters to millimeters
        default:
            return value;
    }
}

// Helper function to convert millimeters to the desired output unit
function convertFromMillimeters(value, unit) {
    switch (unit) {
        case 'mm':
            return value;
        case 'in':
            return value / 25.4; // Convert millimeters to inches
        case 'm':
            return value / 1000; // Convert millimeters to meters
        default:
            return value;
    }
}

// Main function to calculate Depth of Field (DoF) and focus stacking parameters
// Holds the most recent required subject distance (in mm) from the DoF solve
let requiredSubjectDistanceMm = null;

function calculateDoF() {
    let focalLength = parseFloat(document.getElementById('focalLength').value);
    let aperture = parseFloat(document.getElementById('aperture').value);
    let sensorDiagonal = parseFloat(document.getElementById('sensorSize').value);
    let desiredDof = parseFloat(document.getElementById('desiredDof').value);
    let desiredDofUnit = document.getElementById('desiredDofUnit').value;
    let initialGuess = parseFloat(document.getElementById('initialGuess').value);
    let initialGuessUnit = document.getElementById('initialGuessUnit').value;
    let outputUnit = document.getElementById('outputUnit').value;
    
    // Convert input values to millimeters
    let desiredDofMm = convertToMillimeters(desiredDof, desiredDofUnit);
    let initialGuessMm = convertToMillimeters(initialGuess, initialGuessUnit);

    let c = sensorDiagonal / 1500; // Circle of confusion in millimeters

    // Calculate the required subject distance based on the DoF parameters
    let subjectDistanceMm = calculateSubjectDistance(focalLength, aperture, c, desiredDofMm, initialGuessMm);

    if (!subjectDistanceMm) {
        document.getElementById('calculatedDistance').innerHTML = "Calculation did not converge. Please try a different initial guess.";
        return;
    }

    // Cache required subject distance (mm) and show it in desired units
    requiredSubjectDistanceMm = subjectDistanceMm;
    let subjectDistanceConverted = convertFromMillimeters(requiredSubjectDistanceMm, outputUnit);
    document.getElementById('calculatedDistance').innerHTML = `Required Subject Distance: ${subjectDistanceConverted.toFixed(2)} ${outputUnit}`;

    // --- Independent Focus Stacking Section ---
    let focusSubjectDistance = parseFloat(document.getElementById('subjectDistance').value);
    let subjectDistanceUnit = document.getElementById('subjectDistanceUnit').value;
    let overlapPercentage = parseFloat(document.getElementById('overlapPercentage').value) / 100;

    // Convert user-tweaked subject distance to millimeters
    let focusSubjectDistanceMm = convertToMillimeters(focusSubjectDistance, subjectDistanceUnit);

    // Total focus range equals the object's depth (desired DoF)
    let totalFocusRange = desiredDofMm;

    // Calculate hyperfocal distance
    let H = hyperfocalDistance(focalLength, aperture, c);

    // Calculate near and far focus distances based on the tweaked subject distance
    let D_n = (H * focusSubjectDistanceMm) / (H + (focusSubjectDistanceMm - focalLength));
    let D_f = (H * focusSubjectDistanceMm) / (H - (focusSubjectDistanceMm - focalLength));

    // Calculate depth of field at the tweaked subject distance
    let DOF = D_f - D_n; // depth of field at chosen working distance
    let effectiveDOF = DOF * (1 - overlapPercentage);

    if (effectiveDOF <= 0) {
        document.getElementById('result').innerHTML = "Effective DOF per step is zero or negative. Please adjust your settings.";
        return;
    }

    // Calculate the number of focus steps
    let numberOfSteps = Math.ceil(totalFocusRange / effectiveDOF);

    // If the chosen working distance is at least the required distance, one stack suffices
    if (requiredSubjectDistanceMm && focusSubjectDistanceMm >= requiredSubjectDistanceMm) {
        numberOfSteps = 1;
    }

    // Display focus stacking results
    document.getElementById('result').innerHTML = `
        <p><strong>Stacks Needed:</strong> ${numberOfSteps}</p>
        <p><strong>DOF at Working Distance (mm):</strong> ${DOF.toFixed(2)} (effective per step: ${(effectiveDOF).toFixed(2)} with ${Math.round(overlapPercentage*100)}% overlap)</p>
        ${requiredSubjectDistanceMm ? `<p><strong>Required Distance (mm):</strong> ${requiredSubjectDistanceMm.toFixed(2)}</p>` : ''}
    `;
}

// Convenience: copy the last calculated required distance into the working distance field
function useCalculatedDistance() {
    if (!requiredSubjectDistanceMm) {
        alert('Calculate the required distance first.');
        return;
    }
    const unit = document.getElementById('subjectDistanceUnit').value;
    const converted = convertFromMillimeters(requiredSubjectDistanceMm, unit);
    document.getElementById('subjectDistance').value = Number(converted.toFixed(2));
}

