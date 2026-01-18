// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
  apiKey: "AIzaSyA1EDfp1QfsqF4xCHpAYUvXvt9-0Phauns",
  authDomain: "adsc-c7bf0.firebaseapp.com",
  projectId: "adsc-c7bf0",
  storageBucket: "adsc-c7bf0.firebasestorage.app",
  messagingSenderId: "381001857174",
  appId: "1:381001857174:web:2dcea87e2c31bf9ead6ab7",
  measurementId: "G-LXW6QCYBPJ",
  databaseURL: "https://adsc-c7bf0-default-rtdb.firebaseio.com"
};

// ========== GOOGLE SHEETS INTEGRATION ==========
// Option 1: Google Apps Script Webhook (Recommended - Free)
// Follow instructions in google-apps-script.js to set up
const GOOGLE_SHEETS_WEBHOOK_URL = ""; // Paste your Google Apps Script Web App URL here

// Option 2: Zapier Webhook (Alternative - requires Zapier account)
const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/YOUR_ZAPIER_ID/YOUR_TRIGGER_ID/"; // Replace with your actual Zapier webhook URL


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// ========== GOOGLE SSO HANDLER ========== 

document.addEventListener("DOMContentLoaded", function() {
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.renderButton(
      document.getElementById("customGoogleBtn"),
      {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "signin_with",
        logo_alignment: "left",
        width: 260,
        // You can add more style options here
      }
    );
  }
});

window.handleGoogleSignIn = function(response) {
  // Decode JWT to get user info
  const idToken = response.credential;
  const base64Url = idToken.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  const user = JSON.parse(jsonPayload);

  // Map Google fields to our format
  const firstName = user.given_name || '';
  const lastName = user.family_name || '';
  const fullName = user.name || (firstName + ' ' + lastName);
  const email = user.email || '';

  // Visual feedback
  const output = document.getElementById("output");
  output.textContent = "Checking email...";
  output.className = "";
  const loginForm = document.getElementById("loginForm");
  const submitBtn = loginForm ? loginForm.querySelector("button") : null;
  if (submitBtn) submitBtn.disabled = true;

  // Check for duplicates before saving
  checkDuplicateEmail(email, (isDuplicate) => {
    if (isDuplicate) {
      output.textContent = "❌ This email is already registered. Please use a different email.";
      output.className = "error";
      if (submitBtn) submitBtn.disabled = false;
    } else {
      // Email is unique, proceed with signup
      output.textContent = "Signing in...";
      output.className = "";
      saveData(fullName, firstName, lastName, email, () => {
        const successMsg = "<div style='font-size: 24px; margin-bottom: 15px;'>🎉</div><div style='font-size: 20px; font-weight: 700; margin-bottom: 10px;'>Congratulation for Joining the Game!</div><div style='font-size: 16px; color: var(--text-secondary); margin-bottom: 8px;'>Welcome to the Game, " + fullName + "!</div><div style='font-size: 14px; color: var(--accent-cyan);'>You're all set and ready to go! 🚀</div>";
        const successContainer = document.getElementById('successContainer');
        successContainer.innerHTML = successMsg;
        successContainer.className = 'success-message';
        successContainer.style.display = 'block';
        if (loginForm) loginForm.style.display = "none";
        startFlowerAnimation(() => {
          showResetButton();
        });
      });
    }
  });
};

const loginForm = document.getElementById("loginForm");
const output = document.getElementById("output");
// Hide output div if empty
function updateOutputVisibility() {
  if (!output.textContent || output.textContent.trim() === "") {
    output.style.display = "none";
  } else {
    output.style.display = "block";
  }
}

// Initial state: hide output
updateOutputVisibility();

// Observe output changes
const outputObserver = new MutationObserver(updateOutputVisibility);
outputObserver.observe(output, { childList: true, characterData: true, subtree: true });

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    
    const firstName = document.getElementById("userFirstName").value.trim();
    const lastName = document.getElementById("userLastName").value.trim();
    const fullName = firstName + " " + lastName;
    const email = document.getElementById("userEmail").value.trim();

    // Validation: Check if names are not empty
    if (!firstName || !lastName) {
      output.textContent = "❌ Please enter both first name and last name.";
      output.className = "error";
      return;
    }

    // Visual feedback
    output.textContent = "Checking email...";
    output.className = "";
    const submitBtn = loginForm.querySelector("button");
    submitBtn.disabled = true;

    // Check for duplicates before saving
    checkDuplicateEmail(email, (isDuplicate) => {
      if (isDuplicate) {
        output.textContent = "❌ This email is already registered. Please use a different email.";
        output.className = "error";
        submitBtn.disabled = false;
      } else {
        // Email is unique, proceed with signup
        output.textContent = "Signing in...";
        output.className = "";
        
        // Save to Database first, then animate
        saveData(fullName, firstName, lastName, email, () => {
          const successMsg = "<div style='font-size: 24px; margin-bottom: 15px;'>🎉</div><div style='font-size: 20px; font-weight: 700; margin-bottom: 10px;'>Congratulation for Joining the Game!</div><div style='font-size: 16px; color: var(--text-secondary); margin-bottom: 8px;'>Welcome to the Game, " + fullName + "!</div><div style='font-size: 14px; color: var(--accent-cyan);'>You're all set and ready to go! 🚀</div>";
          const successContainer = document.getElementById('successContainer');
          successContainer.innerHTML = successMsg;
          successContainer.className = 'success-message';
          successContainer.style.display = 'block';
          loginForm.style.display = "none";
          startFlowerAnimation(() => {
            showResetButton();
          });
        });
      }
    });
  });
}

// ========== DUPLICATE PREVENTION ==========
function checkDuplicateEmail(email, callback) {
  // Query all existing signups to check if email exists
  database.ref("signups").orderByChild("email").equalTo(email).once("value", (snapshot) => {
    const isDuplicate = snapshot.exists();
    callback(isDuplicate);
  }).catch((error) => {
    console.error("Error checking duplicate:", error);
    // If there's an error checking, allow signup to proceed
    callback(false);
  });
}

function saveData(fullName, firstName, lastName, email, callback) {
  const uniqueKey = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  const userData = {
    fullName: fullName,
    firstName: firstName,
    lastName: lastName,
    email: email,
    timestamp: new Date().toISOString()
  };

  // Writing specifically to the 'signups' node
  database.ref("signups/" + uniqueKey).set(userData)
    .then(() => {
      console.log("✅ Data saved successfully");
      
      // Send data to Google Sheets via Google Apps Script (Priority)
      if (GOOGLE_SHEETS_WEBHOOK_URL && GOOGLE_SHEETS_WEBHOOK_URL.trim() !== "") {
        sendToGoogleSheets(userData);
      }
      // Fallback to Zapier webhook if Google Sheets URL not set
      else if (ZAPIER_WEBHOOK_URL && ZAPIER_WEBHOOK_URL.includes("hooks.zapier")) {
        sendToZapier(userData);
      }
      else {
        console.warn("⚠️ Google Sheets webhook URL not configured. Data saved to Firebase only. See GOOGLE_SHEETS_SETUP.md for setup instructions.");
      }
      
      callback();
    })
    .catch((error) => {
      console.error("❌ Firebase Error:", error);
      output.textContent = "❌ Error: " + error.message;
      output.className = "error";
      document.querySelector("button").disabled = false;
    });
}

// Function to send data to Google Sheets via Google Apps Script
function sendToGoogleSheets(userData) {
  // Add /exec to the URL if it's not already there (required for Google Apps Script)
  let webhookUrl = GOOGLE_SHEETS_WEBHOOK_URL;
  if (webhookUrl && !webhookUrl.endsWith('/exec')) {
    webhookUrl = webhookUrl.replace(/\/$/, '') + '/exec';
  }
  
  fetch(webhookUrl, {
    method: "POST",
    mode: "no-cors", // Google Apps Script requires no-cors mode
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(userData)
  })
    .then(() => {
      console.log("✅ Data sent to Google Sheets successfully");
    })
    .catch(error => {
      console.log("⚠️ Google Sheets webhook error (non-critical):", error);
      // Don't show error to user - this is optional
    });
}

// Function to send data to Zapier webhook (Alternative method)
function sendToZapier(userData) {
  fetch(ZAPIER_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(userData)
  })
    .then(response => {
      console.log("✅ Data sent to Zapier:", response.status);
    })
    .catch(error => {
      console.log("⚠️ Zapier webhook error (non-critical):", error);
      // Don't show error to user - this is optional
    });
}

// Function to show reset button and allow signing up another person
function showResetButton() {
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "Sign Up Another Person →";
  resetBtn.className = "button-confirm";
  resetBtn.style.marginTop = "20px";
  resetBtn.addEventListener("click", () => {
    window.location.reload();
  });
  const successContainer = document.getElementById('successContainer');
  successContainer.appendChild(resetBtn);
}
function startFlowerAnimation(callback) {
  const flowersContainer = document.createElement("div");
  flowersContainer.id = "flowers";
  document.body.appendChild(flowersContainer);

  for (let i = 0; i < 40; i++) {
    const flower = document.createElement("div");
    flower.className = "falling-flower";
    flower.textContent = "🌸";
    // Random horizontal position
    flower.style.left = Math.random() * 100 + "vw";
    // Random animation delay for staggered effect
    flower.style.animationDelay = (Math.random() * 2).toFixed(2) + "s";
    // Smoother, longer duration for ease effect
    const duration = (5.5 + Math.random() * 3).toFixed(2) + "s";
    flower.style.setProperty('--flower-duration', duration);
    // Randomize horizontal movement and rotation
    flower.style.setProperty('--tx-start', (Math.random() * 20 - 10).toFixed(1) + 'px');
    flower.style.setProperty('--tx-end', (Math.random() * 60 - 30).toFixed(1) + 'px');
    flower.style.setProperty('--rot-start', (Math.random() * 30 - 15).toFixed(1) + 'deg');
    flower.style.setProperty('--rot-end', (180 + Math.random() * 180).toFixed(1) + 'deg');
    flowersContainer.appendChild(flower);
  }
  // Wait for the longest animation to finish
  setTimeout(() => {
    flowersContainer.remove();
    callback();
  }, 8500);
}