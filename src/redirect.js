const contextMenu = document.getElementById('context-menu');
const pinBtn = document.getElementById('pin-btn');
const removeBtn = document.getElementById('remove-btn');
const editMenuBtn = document.getElementById('edit-menu-btn');

const modalOverlay = document.getElementById('modal-overlay');
const addBtn = document.getElementById('add-btn');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const modalTitle = document.getElementById('modal-title');
const siteTitleInput = document.getElementById('site-title');
const siteUrlInput = document.getElementById('site-url');

// Background Image Elements
const bgBtn = document.getElementById('bg-btn');
const bgInput = document.getElementById('bg-input');
const clearBgBtn = document.getElementById('clear-bg-btn');

let currentSite = null; 
let isEditing = false;

// Retrieve user preferences from local storage
let pinned = JSON.parse(localStorage.getItem('pinnedSites') || '[]');
let removed = JSON.parse(localStorage.getItem('removedSites') || '[]');

// --- Background Image Logic ---
function loadBackground() {
  const savedBg = localStorage.getItem('customBg');
  if (savedBg) {
    document.body.style.backgroundImage = `url(${savedBg})`;
    clearBgBtn.classList.remove('hidden'); // Show the clear button
  } else {
    document.body.style.backgroundImage = '';
    clearBgBtn.classList.add('hidden'); // Hide the clear button
  }
}
loadBackground(); // Apply on load

bgBtn.addEventListener('click', () => bgInput.click());

// Handle uploading a new background
bgInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      try {
        localStorage.setItem('customBg', dataUrl);
        loadBackground(); // Call the function to update the background and show the clear button
      } catch (error) {
        alert("This image is too large to save. Please choose a smaller or compressed image file.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  }
});

// Handle clearing the background
clearBgBtn.addEventListener('click', () => {
  localStorage.removeItem('customBg');
  loadBackground(); // This will clear the image and hide the button
});

// --- Sites Rendering Logic ---
function renderSites() {
  chrome.topSites.get((sites) => {
    const container = document.getElementById('tiles-container');
    container.innerHTML = ''; 

    let filteredTopSites = sites.filter(site => 
      !removed.includes(site.url) && !pinned.find(p => p.url === site.url)
    );

    let displaySites = [...pinned, ...filteredTopSites].slice(0, 8);

    displaySites.forEach(site => {
      const isPinned = pinned.find(p => p.url === site.url);
      
      const link = document.createElement('a');
      link.className = 'tile';
      link.href = site.url;

      if (isPinned) {
        const pinIcon = document.createElement('div');
        pinIcon.className = 'pin-icon';
        pinIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>`;
        link.appendChild(pinIcon);
      }

      const img = document.createElement('img');
      const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
      faviconUrl.searchParams.set("pageUrl", site.url);
      faviconUrl.searchParams.set("size", "32");
      img.src = faviconUrl.toString();

      const text = document.createElement('span');
      text.textContent = site.title || site.url;

      link.appendChild(img);
      link.appendChild(text);

      link.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        currentSite = site;
        
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.remove('hidden');

        pinBtn.textContent = isPinned ? 'Unpin' : 'Pin';
      });

      container.appendChild(link);
    });
  });
}

// --- Context Menu Actions ---
pinBtn.addEventListener('click', () => {
  if (currentSite) {
    const isPinned = pinned.find(p => p.url === currentSite.url);
    if (isPinned) {
      pinned = pinned.filter(p => p.url !== currentSite.url);
    } else {
      pinned.push({ url: currentSite.url, title: currentSite.title });
    }
    localStorage.setItem('pinnedSites', JSON.stringify(pinned));
    renderSites();
  }
  contextMenu.classList.add('hidden');
});

removeBtn.addEventListener('click', () => {
  if (currentSite) {
    pinned = pinned.filter(p => p.url !== currentSite.url);
    localStorage.setItem('pinnedSites', JSON.stringify(pinned));

    removed.push(currentSite.url);
    localStorage.setItem('removedSites', JSON.stringify(removed));
    renderSites();
  }
  contextMenu.classList.add('hidden');
});

editMenuBtn.addEventListener('click', () => {
  if (currentSite) {
    isEditing = true;
    modalTitle.textContent = 'Edit Shortcut';
    siteTitleInput.value = currentSite.title;
    siteUrlInput.value = currentSite.url;
    
    contextMenu.classList.add('hidden');
    modalOverlay.classList.remove('hidden');
  }
});

document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.add('hidden');
  }
});

// --- Modal Logic ---
addBtn.addEventListener('click', () => {
  isEditing = false;
  currentSite = null;
  modalTitle.textContent = 'Add Shortcut';
  siteTitleInput.value = '';
  siteUrlInput.value = '';
  modalOverlay.classList.remove('hidden');
});

cancelBtn.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});

saveBtn.addEventListener('click', () => {
  const newTitle = siteTitleInput.value.trim();
  let newUrl = siteUrlInput.value.trim();

  if (!newUrl) return; 

  if (!/^https?:\/\//i.test(newUrl)) {
    newUrl = 'https://' + newUrl;
  }

  if (isEditing && currentSite) {
    const pinIndex = pinned.findIndex(p => p.url === currentSite.url);
    
    if (pinIndex > -1) {
      pinned[pinIndex] = { url: newUrl, title: newTitle };
    } else {
      pinned.push({ url: newUrl, title: newTitle });
      removed.push(currentSite.url);
      localStorage.setItem('removedSites', JSON.stringify(removed));
    }
  } else {
    pinned.push({ url: newUrl, title: newTitle || newUrl });
  }

  localStorage.setItem('pinnedSites', JSON.stringify(pinned));
  modalOverlay.classList.add('hidden');
  renderSites();
});

// Initial render
renderSites();