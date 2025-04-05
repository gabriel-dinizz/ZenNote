// Setup the welcome note
function setupWelcomeNote() {
    const welcomeNote = document.getElementById('welcome-note');
    if (!welcomeNote) return;
    
    // Set up normal click behavior
    setupNoteItemClick(welcomeNote);
    
    // Store the welcome note content in localStorage if not already there
    if (!localStorage.getItem('zenNote_Welcome to Zen Note')) {
        const welcomeContent = document.getElementById('note-content').value;
        localStorage.setItem('zenNote_Welcome to Zen Note', welcomeContent);
    }
    
    // Make sure we can always get back to the welcome note
    localStorage.setItem('has_welcome_note', 'true');
}

// Function to restore welcome note if deleted
function restoreWelcomeNote() {
    // Check if welcome note exists in the UI
    const notesList = document.getElementById('notes-list');
    const existingWelcomeNote = Array.from(notesList.querySelectorAll('span:nth-child(2)'))
        .find(span => span.textContent === 'Welcome to Zen Note');
    
    if (!existingWelcomeNote) {
        // Create new welcome note element
        const welcomeNote = document.createElement('div');
        welcomeNote.className = 'flex items-center hover:text-white sidebar-item p-2';
        welcomeNote.id = 'welcome-note';
        welcomeNote.innerHTML = `
            <span class="mr-2">📄</span>
            <span>Welcome to Zen Note</span>
        `;
        
        // Add to notes section
        notesList.appendChild(welcomeNote);
        
        // Set up note behavior
        setupNoteItemClick(welcomeNote);
        
        // If welcome content isn't in localStorage, add default content
        if (!localStorage.getItem('zenNote_Welcome to Zen Note')) {
            localStorage.setItem('zenNote_Welcome to Zen Note', `Welcome to Zen Note!

This minimalist note-taking application helps you organize your thoughts with a clean, distraction-free interface.

Getting Started:
- Click the + button next to "FOLDERS" to create a new folder
- Click the + button next to "MY NOTES" to create a new note
- Use folders to organize related notes
- Edit this welcome note or create a new one to begin

Features:
- Simple, focused note-taking
- Folder organization
- Clean, minimal interface
- Keyboard shortcuts:
  • Ctrl/Cmd + S: Save current note
  • Ctrl/Cmd + N: Create new note

Happy writing!`);
        }
        
        return welcomeNote;
    }
    
    return existingWelcomeNote.parentElement;
}// zen-note.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initializeApp();
});

function initializeApp() {
    setupNewFolderButton();
    setupNewNoteButton();
    setupNoteEditor();
    setupSaveButton();
    setupKeyboardShortcuts();
    setupWelcomeNote();
}

// Setup the new folder button at the top level
function setupNewFolderButton() {
    const newFolderBtn = document.getElementById('new-folder-btn');
    
    newFolderBtn.addEventListener('click', function() {
        createNewFolder();
    });
}

// Setup the new note button at the top level
function setupNewNoteButton() {
    const newNoteBtn = document.getElementById('new-note-btn');
    
    newNoteBtn.addEventListener('click', function() {
        createNewNote();
    });
}

// Create a new folder at the top level
function createNewFolder() {
    const folderTree = document.getElementById('folder-tree');
    
    // Create new folder element
    const folderItem = document.createElement('div');
    folderItem.className = 'flex items-center hover:text-white sidebar-item p-1 justify-between group';
    folderItem.innerHTML = `
        <div class="flex items-center">
            <span class="mr-1 folder-toggle">►</span>
            <span class="mr-2">📁</span>
            <span contenteditable="true">New Folder</span>
        </div>
        <span class="text-gray-500 hover:text-white cursor-pointer folder-add hidden group-hover:inline">+</span>
    `;
    
    // Add to folder tree
    folderTree.appendChild(folderItem);
    
    // Setup folder toggle functionality
    setupFolderToggle(folderItem);
    
    // Setup add button for the new folder
    setupFolderAddButton(folderItem.querySelector('.folder-add'));
    
    // Focus on the folder name and select all text
    const folderNameElement = folderItem.querySelector('span[contenteditable="true"]');
    folderNameElement.focus();
    
    const range = document.createRange();
    range.selectNodeContents(folderNameElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Handle saving the folder name
    folderNameElement.addEventListener('blur', function() {
        folderNameElement.removeAttribute('contenteditable');
    });
    
    folderNameElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            folderNameElement.blur();
        }
    });
    
    return folderItem;
}

// Setup folder toggle functionality for a folder item
function setupFolderToggle(folderItem) {
    const toggle = folderItem.querySelector('.folder-toggle');
    if (!toggle) return;
    
    folderItem.addEventListener('click', function(e) {
        // Ignore if clicking on the add button or the editable name
        if (e.target.classList.contains('folder-add') || 
            e.target.hasAttribute('contenteditable')) {
            return;
        }
        
        const isExpanded = toggle.textContent === '▼';
        toggle.textContent = isExpanded ? '►' : '▼';
        
        // Find the next element (the folder contents)
        const folderContents = this.nextElementSibling;
        if (folderContents && folderContents.classList.contains('folder-contents')) {
            folderContents.style.display = isExpanded ? 'none' : 'block';
        }
    });
    
    // Setup right-click context menu
    folderItem.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showFolderContextMenu(e, folderItem);
    });
}

// Setup add button for a folder
function setupFolderAddButton(addButton) {
    addButton.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Get folder element and name
        const folderElement = this.closest('.sidebar-item');
        const folderName = folderElement.querySelector('span:nth-child(3)').textContent;
        
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'absolute bg-gray-800 text-white rounded p-2 shadow-lg z-10';
        menu.style.left = (e.clientX + 10) + 'px';
        menu.style.top = e.clientY + 'px';
        
        // Add menu options
        menu.innerHTML = `
            <div class="p-2 hover:bg-gray-700 cursor-pointer" data-action="note">New Note</div>
            <div class="p-2 hover:bg-gray-700 cursor-pointer" data-action="folder">New Subfolder</div>
        `;
        
        // Add event listeners to menu options
        menu.querySelectorAll('div').forEach(option => {
            option.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                
                if (action === 'note') {
                    createNewNoteInFolder(folderElement, folderName);
                } else if (action === 'folder') {
                    createNewSubfolder(folderElement, folderName);
                }
                
                // Remove menu
                document.body.removeChild(menu);
            });
        });
        
        // Add menu to body
        document.body.appendChild(menu);
        
        // Remove menu when clicking elsewhere
        document.addEventListener('click', function removeMenu() {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', removeMenu);
        });
    });
}

// Create a new note at the top level
function createNewNote(title = "New Note") {
    // Create new note element
    const noteItem = document.createElement('div');
    noteItem.className = 'flex items-center hover:text-white sidebar-item p-2';
    noteItem.innerHTML = `
        <span class="mr-2">📄</span>
        <span>${title}</span>
    `;
    
    // Add to notes section
    const notesContainer = document.getElementById('notes-list');
    notesContainer.appendChild(noteItem);
    
    // Add click event to load the note
    setupNoteItemClick(noteItem);
    
    // Simulate click on the new note
    noteItem.click();
    
    return noteItem;
}

// Setup click event for note items
function setupNoteItemClick(noteItem) {
    noteItem.addEventListener('click', function() {
        // Remove active class from all items
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        this.classList.add('active');
        
        // Get note name
        const noteName = this.querySelector('span:nth-child(2)').textContent;
        
        // Update editor with empty content
        document.querySelector('.bg-orange-100 h1').textContent = noteName;
        document.getElementById('note-title').value = noteName;
        document.getElementById('note-content').value = '';
        
        // Focus on title for editing
        setTimeout(() => {
            document.getElementById('note-title').focus();
            document.getElementById('note-title').select();
        }, 100);
    });
    
    // Setup right-click context menu for notes
    noteItem.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showNoteContextMenu(e, noteItem);
    });
}

// Show note context menu for right-click
function showNoteContextMenu(e, noteItem) {
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'absolute bg-gray-800 text-white rounded p-2 shadow-lg z-10';
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    
    // Add menu options
    contextMenu.innerHTML = `
        <div class="p-2 hover:bg-gray-700 cursor-pointer" data-action="rename">Rename</div>
        <div class="p-2 hover:bg-gray-700 cursor-pointer text-red-400" data-action="delete">Delete</div>
    `;
    
    // Add event listeners to menu options
    contextMenu.querySelectorAll('div').forEach(option => {
        option.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const noteName = noteItem.querySelector('span:nth-child(2)').textContent;
            
            if (action === 'rename') {
                renameNote(noteItem);
            } else if (action === 'delete') {
                deleteNote(noteItem);
            }
            
            // Remove menu
            document.body.removeChild(contextMenu);
        });
    });
    
    // Add menu to body
    document.body.appendChild(contextMenu);
    
    // Remove menu when clicking elsewhere
    document.addEventListener('click', function removeMenu() {
        if (document.body.contains(contextMenu)) {
            document.body.removeChild(contextMenu);
        }
        document.removeEventListener('click', removeMenu);
    });
}

// Rename note function
function renameNote(noteItem) {
    const noteNameElement = noteItem.querySelector('span:nth-child(2)');
    noteNameElement.setAttribute('contenteditable', 'true');
    noteNameElement.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(noteNameElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Handle saving the note name
    noteNameElement.addEventListener('blur', function onBlur() {
        noteNameElement.removeAttribute('contenteditable');
        
        // Update title in editor if this is the active note
        if (noteItem.classList.contains('active')) {
            const newName = noteNameElement.textContent;
            document.querySelector('.bg-orange-100 h1').textContent = newName;
            document.getElementById('note-title').value = newName;
        }
        
        noteNameElement.removeEventListener('blur', onBlur);
    });
    
    noteNameElement.addEventListener('keydown', function onKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            noteNameElement.blur();
            noteNameElement.removeEventListener('keydown', onKeydown);
        }
    });
}

// Delete note function
function deleteNote(noteItem) {
    const noteName = noteItem.querySelector('span:nth-child(2)').textContent;
    
    // Special handling for welcome note
    const isWelcomeNote = noteName === 'Welcome to Zen Note';
    
    // Ask for confirmation
    if (confirm(`Are you sure you want to delete the note "${noteName}"?${isWelcomeNote ? ' You can restore it later from the Help menu.' : ''}`)) {
        // If this is the active note, clear the editor
        if (noteItem.classList.contains('active')) {
            document.querySelector('.bg-orange-100 h1').textContent = '';
            document.getElementById('note-title').value = '';
            document.getElementById('note-content').value = '';
            
            // If we're deleting the welcome note while it's active, select another note
            if (isWelcomeNote) {
                const otherNotes = document.querySelectorAll('#notes-list .sidebar-item:not(#welcome-note)');
                if (otherNotes.length > 0) {
                    otherNotes[0].click();
                }
            }
        }
        
        // If it's the welcome note, just store that it's been deleted but keep the content
        if (isWelcomeNote) {
            localStorage.setItem('has_welcome_note', 'false');
        } else {
            // Remove regular notes from localStorage
            localStorage.removeItem(`zenNote_${noteName}`);
        }
        
        // Remove the note item from UI
        noteItem.remove();
        
        // Add "Restore Welcome Note" to the UI if we just deleted the welcome note
        if (isWelcomeNote) {
            addRestoreWelcomeOption();
        }
    }
}

// Add a "Restore Welcome Note" option to the UI
function addRestoreWelcomeOption() {
    // Check if we already have the restore option
    if (document.getElementById('restore-welcome-option')) {
        return;
    }
    
    // Create the restore option in the notes section header
    const notesHeader = document.querySelector('.p-4.border-b.border-gray-700.flex');
    
    const restoreOption = document.createElement('button');
    restoreOption.id = 'restore-welcome-option';
    restoreOption.className = 'text-blue-400 hover:text-blue-300 text-xs ml-auto mr-2';
    restoreOption.textContent = 'Restore Welcome';
    
    // Insert before the "+" button
    notesHeader.insertBefore(restoreOption, document.getElementById('new-note-btn'));
    
    // Add click handler
    restoreOption.addEventListener('click', function() {
        const welcomeNote = restoreWelcomeNote();
        welcomeNote.click();
        
        // Remove the restore option
        this.remove();
        
        localStorage.setItem('has_welcome_note', 'true');
    });
}

// Create a new note inside a folder
function createNewNoteInFolder(folderElement, folderName) {
    // Make sure the folder is expanded
    const toggle = folderElement.querySelector('.folder-toggle');
    if (toggle.textContent === '►') {
        toggle.textContent = '▼';
    }
    
    // Find or create the container for folder contents
    let folderContents = folderElement.nextElementSibling;
    if (!folderContents || !folderContents.classList.contains('folder-contents')) {
        folderContents = document.createElement('div');
        folderContents.className = 'folder-contents pl-5 space-y-1';
        folderElement.parentNode.insertBefore(folderContents, folderElement.nextSibling);
    }
    
    // Make it visible
    folderContents.style.display = 'block';
    
    // Create note title
    const noteTitle = "New Note";
    
    // Create note item
    const noteItem = document.createElement('div');
    noteItem.className = 'flex items-center hover:text-white sidebar-item p-1';
    noteItem.innerHTML = `
        <span class="mr-2">📝</span>
        <span>${noteTitle}</span>
    `;
    
    // Add to folder contents
    folderContents.appendChild(noteItem);
    
    // Setup click event
    setupNoteItemClick(noteItem);
    
    // Simulate click
    noteItem.click();
    
    return noteItem;
}

// Create a new subfolder
function createNewSubfolder(parentElement, parentFolderName) {
    // Make sure the parent folder is expanded
    const toggle = parentElement.querySelector('.folder-toggle');
    if (toggle.textContent === '►') {
        toggle.textContent = '▼';
    }
    
    // Find or create the container for folder contents
    let folderContents = parentElement.nextElementSibling;
    if (!folderContents || !folderContents.classList.contains('folder-contents')) {
        folderContents = document.createElement('div');
        folderContents.className = 'folder-contents pl-5 space-y-1';
        parentElement.parentNode.insertBefore(folderContents, parentElement.nextSibling);
    }
    
    // Make it visible
    folderContents.style.display = 'block';
    
    // Create subfolder
    const folderItem = document.createElement('div');
    folderItem.className = 'flex items-center hover:text-white sidebar-item p-1 justify-between group';
    folderItem.innerHTML = `
        <div class="flex items-center">
            <span class="mr-1 folder-toggle">►</span>
            <span class="mr-2">📁</span>
            <span contenteditable="true">New Folder</span>
        </div>
        <span class="text-gray-500 hover:text-white cursor-pointer folder-add hidden group-hover:inline">+</span>
    `;
    
    // Add to folder contents
    folderContents.appendChild(folderItem);
    
    // Setup folder toggle
    setupFolderToggle(folderItem);
    
    // Setup add button
    setupFolderAddButton(folderItem.querySelector('.folder-add'));
    
    // Focus on folder name for editing
    const folderNameElement = folderItem.querySelector('span[contenteditable="true"]');
    folderNameElement.focus();
    
    const range = document.createRange();
    range.selectNodeContents(folderNameElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Handle saving folder name
    folderNameElement.addEventListener('blur', function() {
        folderNameElement.removeAttribute('contenteditable');
    });
    
    folderNameElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            folderNameElement.blur();
        }
    });
    
    return folderItem;
}

// Setup note editor functionality
function setupNoteEditor() {
    const titleInput = document.getElementById('note-title');
    const noteTextarea = document.getElementById('note-content');
    
    // Update note title when input changes
    titleInput.addEventListener('input', function() {
        document.querySelector('.bg-orange-100 h1').textContent = this.value;
        
        // Find the active note in sidebar and update its name
        const activeNote = document.querySelector('.sidebar-item.active');
        if (activeNote && (activeNote.querySelector('span:first-child').textContent === '📄' || 
            activeNote.querySelector('span:first-child').textContent === '📝')) {
            activeNote.querySelector('span:nth-child(2)').textContent = this.value;
        }
    });
    
    // Auto-resize textarea as content grows
    noteTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Initialize textarea height
    setTimeout(() => {
        noteTextarea.style.height = (noteTextarea.scrollHeight) + 'px';
    }, 100);
}

// Setup save button functionality
function setupSaveButton() {
    const saveButton = document.getElementById('save-btn');
    
    saveButton.addEventListener('click', function() {
        // Get note data
        const title = document.getElementById('note-title').value;
        const content = document.getElementById('note-content').value;
        
        // In a real app, we'd save to database here
        // For demo, save to localStorage
        localStorage.setItem(`zenNote_${title}`, content);
        
        // Show saved indicator
        const savedIndicator = document.createElement('span');
        savedIndicator.textContent = 'Saved!';
        savedIndicator.className = 'text-green-600 ml-2';
        
        this.parentNode.appendChild(savedIndicator);
        
        // Remove indicator after 2 seconds
        setTimeout(() => {
            savedIndicator.remove();
        }, 2000);
        
        console.log(`Note "${title}" saved!`);
    });
    
    // Share button functionality
    const shareButton = document.getElementById('share-btn');
    shareButton.addEventListener('click', function() {
        const title = document.getElementById('note-title').value;
        alert(`Sharing "${title}" functionality would be implemented here.`);
    });
}

// Show folder context menu for right-click
function showFolderContextMenu(e, folderItem) {
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'absolute bg-gray-800 text-white rounded p-2 shadow-lg z-10';
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    
    // Add menu options
    contextMenu.innerHTML = `
        <div class="p-2 hover:bg-gray-700 cursor-pointer" data-action="rename">Rename</div>
        <div class="p-2 hover:bg-gray-700 cursor-pointer text-red-400" data-action="delete">Delete</div>
    `;
    
    // Add event listeners to menu options
    contextMenu.querySelectorAll('div').forEach(option => {
        option.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const folderName = folderItem.querySelector('span:nth-child(3)').textContent;
            
            if (action === 'rename') {
                renameFolder(folderItem);
            } else if (action === 'delete') {
                deleteFolder(folderItem);
            }
            
            // Remove menu
            document.body.removeChild(contextMenu);
        });
    });
    
    // Add menu to body
    document.body.appendChild(contextMenu);
    
    // Remove menu when clicking elsewhere
    document.addEventListener('click', function removeMenu() {
        if (document.body.contains(contextMenu)) {
            document.body.removeChild(contextMenu);
        }
        document.removeEventListener('click', removeMenu);
    });
}

// Rename folder function
function renameFolder(folderItem) {
    const folderNameElement = folderItem.querySelector('span:nth-child(3)');
    folderNameElement.setAttribute('contenteditable', 'true');
    folderNameElement.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(folderNameElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Handle saving the folder name
    folderNameElement.addEventListener('blur', function onBlur() {
        folderNameElement.removeAttribute('contenteditable');
        folderNameElement.removeEventListener('blur', onBlur);
    });
    
    folderNameElement.addEventListener('keydown', function onKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            folderNameElement.blur();
            folderNameElement.removeEventListener('keydown', onKeydown);
        }
    });
}

// Delete folder function
function deleteFolder(folderItem) {
    const folderName = folderItem.querySelector('span:nth-child(3)').textContent;
    
    // Ask for confirmation
    if (confirm(`Are you sure you want to delete the folder "${folderName}" and all its contents?`)) {
        // Check if this folder has contents
        const folderContents = folderItem.nextElementSibling;
        if (folderContents && folderContents.classList.contains('folder-contents')) {
            folderContents.remove();
        }
        
        // Remove the folder itself
        folderItem.remove();
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('save-btn').click();
        }
        
        // Ctrl/Cmd + N for new note
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            createNewNote();
        }
    });
}

// Load any existing notes from localStorage on startup
function loadFromLocalStorage() {
    // Check if welcome note was previously deleted
    if (localStorage.getItem('has_welcome_note') === 'false') {
        // Remove welcome note from UI if it exists
        const welcomeNote = document.getElementById('welcome-note');
        if (welcomeNote) {
            welcomeNote.remove();
        }
        
        // Add restore option
        addRestoreWelcomeOption();
    }
    
    // Load other notes
    const notesList = document.getElementById('notes-list');
    
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('zenNote_') && key !== 'zenNote_username') {
            const noteName = key.replace('zenNote_', '');
            
            // Skip welcome note as it's handled separately
            if (noteName === 'Welcome to Zen Note') {
                return;
            }
            
            // Check if this note already exists in the UI
            const existingNotes = Array.from(notesList.querySelectorAll('span:nth-child(2)'));
            const noteExists = existingNotes.some(span => span.textContent === noteName);
            
            if (!noteExists) {
                createNewNote(noteName);
            }
        }
    });
}