// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobile-menu-button');
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', function () {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('hidden');
  });
}

// Image upload flow (Upload page)
const foodImageInput = document.getElementById('food-image');
const uploadSection = document.getElementById('upload-section');
const previewSection = document.getElementById('preview-section');
const imagePreview = document.getElementById('image-preview');
const changeImageBtn = document.getElementById('change-image');
const analyzeButton = document.getElementById('analyze-button');
const analyzeSpinner = document.getElementById('analyze-spinner');
const progressSection = document.getElementById('progress-section');

// Protein, carbs, fat display elements
const proteinValue = document.getElementById('protein-value');
const carbsValue = document.getElementById('carbs-value');
const fatValue = document.getElementById('fat-value');
const caloriesValue = document.getElementById('calories-value');
const ingredientsList = document.getElementById('ingredients-list');

if (foodImageInput) {
  foodImageInput.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png'];

      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG or PNG)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();

      reader.onload = function (event) {
        if (imagePreview) imagePreview.src = event.target.result;
        if (uploadSection) uploadSection.classList.add('hidden');
        if (previewSection) previewSection.classList.remove('hidden');
        try {
          sessionStorage.setItem('ns_preview', event.target.result);
          const baseName = (file.name || '').replace(/\.[^.]+$/, '');
          if (baseName) sessionStorage.setItem('ns_filename', baseName);
        } catch {}
      };

      reader.onerror = function () {
        alert('Error reading file. Please try again.');
      };

      reader.readAsDataURL(file);
    }
  });
}

if (changeImageBtn) {
  changeImageBtn.addEventListener('click', function () {
    if (foodImageInput) foodImageInput.value = '';
    if (uploadSection) uploadSection.classList.remove('hidden');
    if (previewSection) previewSection.classList.add('hidden');
    try { sessionStorage.removeItem('ns_preview'); } catch {}
    try { sessionStorage.removeItem('ns_filename'); } catch {}
  });
}

if (analyzeButton) {
  analyzeButton.addEventListener('click', async function () {
    if (analyzeSpinner) analyzeSpinner.classList.remove('hidden');
    analyzeButton.disabled = true;

    if (previewSection) previewSection.classList.add('hidden');
    if (progressSection) progressSection.classList.remove('hidden');

    try {
      const formData = new FormData();
      if (foodImageInput && foodImageInput.files && foodImageInput.files[0]) {
        formData.append('image', foodImageInput.files[0]);
      }

      simulateProgress();

      const response = await fetch(
        'https://venkataramachandruduch.app.n8n.cloud/webhook/meal_ai',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      try { sessionStorage.setItem('ns_result', JSON.stringify(data)); } catch {}
      window.location.href = './analysis.html';
    } catch (error) {
      console.error('Error:', error);
      if (progressSection) progressSection.classList.add('hidden');
      alert('Analysis failed. Please try again.');
      if (analyzeSpinner) analyzeSpinner.classList.add('hidden');
      analyzeButton.disabled = false;
      if (previewSection) previewSection.classList.remove('hidden');
    }
  });
}

function simulateProgress() {
    // This function is a placeholder and doesn't need changes.
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body && document.querySelector('title')?.textContent?.includes('Analysis')) {
    const stored = sessionStorage.getItem('ns_result');
    if (!stored) return;
    let data;
    try { data = JSON.parse(stored); } catch { return; }
    showAnalysisResults(data);

    const img = document.getElementById('summary-image');
    const preview = sessionStorage.getItem('ns_preview');
    if (img && preview) img.src = preview;
  }
});

function showAnalysisResults(data) {
  // --- START OF FIX ---
  // More robustly find the result object from the n8n response.
  let result;
  if (Array.isArray(data) && data[0]?.output) {
    // Handles original expected structure: [{ "output": {...} }]
    result = data[0].output;
  } else if (Array.isArray(data) && data[0]?.status) {
    // Handles a flat array structure: [{ "status": ... }]
    result = data[0];
  } else if (data?.status) {
    // Handles a direct object structure: { "status": ... }
    result = data;
  }
  // --- END OF FIX ---

  if (!result || result.status !== 'success') {
    console.error('Invalid analysis result', data);
    alert('Could not process the analysis results.');
    return;
  }

  // Update totals
  const protein = result.total.protein.toFixed(1);
  const carbs = result.total.carbs.toFixed(1);
  const fat = result.total.fat.toFixed(1);
  const calories = result.total.calories.toFixed(0);

  const proteinValue = document.getElementById('protein-value');
  const carbsValue = document.getElementById('carbs-value');
  const fatValue = document.getElementById('fat-value');
  const caloriesValue = document.getElementById('calories-value');
  const ingredientsList = document.getElementById('ingredients-list');

  if (proteinValue) proteinValue.textContent = protein;
  if (carbsValue) carbsValue.textContent = carbs;
  if (fatValue) fatValue.textContent = fat;
  if (caloriesValue) caloriesValue.textContent = calories;

  // Determine a meal-level name for the summary
  const itemNameEl = document.getElementById('summary-item-name');
  if (itemNameEl) {
    const candidates = [
      result.mealName, result.meal_name, result.name, result.title,
      result.dish, result.foodName, result.food_name,
    ].filter((v) => typeof v === 'string' && v.trim());

    let chosen = candidates[0];
    if (!chosen && Array.isArray(result.food)) {
      const mainItem = result.food.find((f) => f && (f.is_main || f.primary));
      if (mainItem?.name) chosen = mainItem.name;
    }
    if (!chosen) {
      try { chosen = sessionStorage.getItem('ns_filename') || undefined; } catch {}
    }
    if (!chosen && Array.isArray(result.food)) {
      chosen = result.food[0]?.name;
    }
    if (chosen) itemNameEl.textContent = chosen;
  }

  // Update chart rings with animation
  const proteinPercent = Math.min(100, (protein / 50) * 100);
  const carbsPercent = Math.min(100, (carbs / 100) * 100);
  const fatPercent = Math.min(100, (fat / 50) * 100);

  const ringProtein = document.querySelector('.ring-protein');
  const ringCarbs = document.querySelector('.ring-carbs');
  const ringFat = document.querySelector('.ring-fat');
  const proteinPctEl = document.getElementById('protein-pct');
  const carbsPctEl = document.getElementById('carbs-pct');
  const fatPctEl = document.getElementById('fat-pct');

  if (ringProtein) {
    ringProtein.style.strokeDasharray = `${proteinPercent} 100`;
  }
  if (ringCarbs) {
    ringCarbs.style.strokeDasharray = `${carbsPercent} 100`;
  }
  if (ringFat) {
    ringFat.style.strokeDasharray = `${fatPercent} 100`;
  }
  if (proteinPctEl) proteinPctEl.textContent = `${Math.round(proteinPercent)}%`;
  if (carbsPctEl) carbsPctEl.textContent = `${Math.round(carbsPercent)}%`;
  if (fatPctEl) fatPctEl.textContent = `${Math.round(fatPercent)}%`;

  // Populate ingredients list with food items
  if (ingredientsList) {
    ingredientsList.innerHTML = '';
    result.food.forEach((item) => {
      const foodItem = document.createElement('div');
      foodItem.className = 'ingredient-item';
      foodItem.innerHTML = `
        <div class="item-icon-wrapper">
            <span>&#127869;</span>
        </div>
        <div class="item-details">
            <div class="item-name">${item.name}</div>
            <div class="item-quantity">${item.quantity ?? ''}</div>
        </div>
        <div class="item-macros">
            <div class="item-macro">
                <div class="item-macro-value protein">${item.protein}g</div>
                <div class="item-macro-label">Protein</div>
            </div>
            <div class="item-macro">
                <div class="item-macro-value carbs">${item.carbs}g</div>
                <div class="item-macro-label">Carbs</div>
            </div>
            <div class="item-macro">
                <div class="item-macro-value fat">${item.fat}g</div>
                <div class="item-macro-label">Fat</div>
            </div>
        </div>
      `;
      ingredientsList.appendChild(foodItem);
    });
  }
}

// Smooth scrolling for anchor links
const anchors = document.querySelectorAll('a[href^="#"]');
anchors.forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();

    const targetId = this.getAttribute('href');
    if (targetId === '#') return;

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });

      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
      }
    }
  });
});