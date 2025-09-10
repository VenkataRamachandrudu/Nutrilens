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
// Analysis page selectors will be resolved lazily when needed

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

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();

      reader.onload = function (event) {
        if (imagePreview) imagePreview.src = event.target.result;
        if (uploadSection) uploadSection.classList.add('hidden');
        if (previewSection) previewSection.classList.remove('hidden');
  // store preview in session to optionally show later
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
    // Show loading state
    if (analyzeSpinner) analyzeSpinner.classList.remove('hidden');
    analyzeButton.disabled = true;

    // Show progress section
    if (previewSection) previewSection.classList.add('hidden');
    if (progressSection) progressSection.classList.remove('hidden');

  try {
      // Create FormData and append the image
      const formData = new FormData();
      if (foodImageInput && foodImageInput.files && foodImageInput.files[0]) {
        formData.append('image', foodImageInput.files[0]);
      }

      // Simulate progress for better UX
      simulateProgress();

      // Send to webhook
      const response = await fetch(
        'https://ajaychanumolu05.app.n8n.cloud/webhook/meal_ai',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

  const data = await response.json();

  // Persist results and navigate to analysis page
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

// Simulate progress for better user experience
function simulateProgress() {
  const bar = document.querySelector(
    '#progress-section .absolute.inset-0.border-4.border-indigo-500'
  );
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 30;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
    }
    // Intentionally not updating UI; placeholder for future real progress
  }, 200);
}

// Analysis page bootstrap
document.addEventListener('DOMContentLoaded', () => {
  // Only run on analysis page
  if (document.body && document.querySelector('title')?.textContent?.includes('Analysis')) {
    const stored = sessionStorage.getItem('ns_result');
    if (!stored) return;
    let data;
    try { data = JSON.parse(stored); } catch { return; }
    showAnalysisResults(data);

    // Update center calories if present
  const caloriesValue = document.getElementById('calories-value');
  // Set summary image if available
  const img = document.getElementById('summary-image');
  const preview = sessionStorage.getItem('ns_preview');
  if (img && preview) img.src = preview;
  }
});

function showAnalysisResults(data) {
  // Extract the first output (assuming structure matches example)
  const result = data[0]?.output;
  if (!result || result.status !== 'success') {
    throw new Error('Invalid analysis result');
  }

  // Update totals
  const protein = result.total.protein.toFixed(1);
  const carbs = result.total.carbs.toFixed(1);
  const fat = result.total.fat.toFixed(1);
  const calories = result.total.calories.toFixed(0);

  if (proteinValue) proteinValue.textContent = protein;
  if (carbsValue) carbsValue.textContent = carbs;
  if (fatValue) fatValue.textContent = fat;
  if (caloriesValue) caloriesValue.textContent = calories;

  // Determine a meal-level name for the summary
  const itemNameEl = document.getElementById('summary-item-name');
  if (itemNameEl) {
    // prefer meal-level fields from the API
    const candidates = [
      result.mealName,
      result.meal_name,
      result.name,
      result.title,
      result.dish,
      result.foodName,
      result.food_name,
    ].filter((v) => typeof v === 'string' && v.trim());

    let chosen = candidates[0];
    if (!chosen && Array.isArray(result.food)) {
      // try a flagged main item
      const mainItem = result.food.find((f) => f && (f.is_main || f.primary));
      if (mainItem?.name) chosen = mainItem.name;
    }
    if (!chosen) {
      // fallback to uploaded filename (without extension)
      try { chosen = sessionStorage.getItem('ns_filename') || undefined; } catch {}
    }
    if (!chosen && Array.isArray(result.food)) {
      // final fallback to first item
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

  if (ringProtein) {
    ringProtein.style.strokeDasharray = `${proteinPercent} 100`;
    ringProtein.classList.add('text-indigo-500');
  const pct = document.getElementById('protein-pct');
  if (pct) pct.textContent = `${Math.round(proteinPercent)}%`;
  }
  if (ringCarbs) {
    ringCarbs.style.strokeDasharray = `${carbsPercent} 100`;
    ringCarbs.classList.add('text-green-500');
  const pct = document.getElementById('carbs-pct');
  if (pct) pct.textContent = `${Math.round(carbsPercent)}%`;
  }
  if (ringFat) {
    ringFat.style.strokeDasharray = `${fatPercent} 100`;
    ringFat.classList.add('text-yellow-500');
  const pct = document.getElementById('fat-pct');
  if (pct) pct.textContent = `${Math.round(fatPercent)}%`;
  }

  // Populate ingredients list with food items
  if (ingredientsList) {
    ingredientsList.innerHTML = '';
    result.food.forEach((item) => {
      const foodItem = document.createElement('div');
      foodItem.className = 'flex items-center p-3 bg-gray-50 rounded-xl';
      foodItem.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
            <i class="fas fa-utensils text-indigo-600 text-sm"></i>
        </div>
        <div class="flex-1">
            <div class="font-medium text-gray-800">${item.name}</div>
            <div class="text-sm text-gray-500">${item.quantity ?? ''}</div>
        </div>
        <div class="flex space-x-6">
            <div class="text-center">
                <div class="text-indigo-600 font-medium">${item.protein}g</div>
                <div class="text-xs text-gray-500">Protein</div>
            </div>
            <div class="text-center">
                <div class="text-green-600 font-medium">${item.carbs}g</div>
                <div class="text-xs text-gray-500">Carbs</div>
            </div>
            <div class="text-center">
                <div class="text-yellow-600 font-medium">${item.fat}g</div>
                <div class="text-xs text-gray-500">Fat</div>
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

      // Close mobile menu if open
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
      }
    }
  });
});
